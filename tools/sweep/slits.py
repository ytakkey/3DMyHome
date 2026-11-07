# slits.py のすき間のうち、本当に抜けて見える所だけを出す：run.py pyh slits2.py
# すき間の面の上で点を取り、点が形の中なら（別の部品で埋まっている）除く。すき間の面に沿って4方向へ光線を出し、
# 向かい合う2方向とも 6cm 以上抜ける（向こうが見通せる）か、1方向が 6cm 以上抜けて建物（床・壁）に当たる所を出す
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
dg = bpy.context.evaluated_depsgraph_get()
VS, PS, PN = [], [], []
bx = {}
for o in bpy.data.objects:
    if o.type != 'MESH' or o.hide_render:
        continue
    oe = o.evaluated_get(dg); me = oe.to_mesh(); mw = o.matrix_world; b0 = len(VS)
    VS.extend(mw @ v.co for v in me.vertices)
    for pg in me.polygons:
        PS.append([b0 + i for i in pg.vertices]); PN.append(o.name)
    oe.to_mesh_clear()
    if o.name == 'Building':
        continue
    cs = [o.matrix_world @ Vector(c) for c in o.bound_box]
    lo = [min(c.x for c in cs), min(c.z for c in cs), min(-c.y for c in cs)]
    hi = [max(c.x for c in cs), max(c.z for c in cs), max(-c.y for c in cs)]
    if max(h - l for h, l in zip(hi, lo)) >= 0.05:
        bx[o.name] = (lo, hi)
B = lambda v: Vector((v[0], -v[2], v[1]))   # three → blender
T = BVHTree.FromPolygons(VS, PS)
print('tris', len(PS), flush=True)
def cast(p, d, far=1.0):
    loc, n, fi, dd = T.ray_cast(p, d.normalized(), far)
    if loc is None:
        return None
    return (dd, PN[fi], n.dot(d) > 0)
AX = [B((1, 0, 0)), B((0, 1, 0)), B((0, 0, 1))]
def inside(p):
    k = 0
    for a in AX:
        for s in (1, -1):
            h = cast(p, a * s, 0.5)
            k += bool(h and h[2])
    return k >= 4
ns = sorted(bx)
pre = lambda n: n.split('_')[0]
seen = set()
for i, a in enumerate(ns):
    la, ha = bx[a]
    for b in ns[i + 1:]:
        if pre(a) != pre(b):
            continue
        lb, hb = bx[b]
        ov = [min(ha[k], hb[k]) - max(la[k], lb[k]) for k in range(3)]
        for k in range(3):
            g = -ov[k]
            if not (0.005 <= g <= 0.04):
                continue
            js = [j for j in range(3) if j != k]
            if min(ov[j] for j in js) < 0.05:
                continue
            lo = [max(la[j], lb[j]) for j in range(3)]; hi = [min(ha[j], hb[j]) for j in range(3)]
            # すき間の面の上で 3×3 の点
            res = []
            for f0 in (0.2, 0.5, 0.8):
                for f1 in (0.2, 0.5, 0.8):
                    c = [0, 0, 0]
                    c[k] = (lo[k] + hi[k]) / 2
                    c[js[0]] = lo[js[0]] + (hi[js[0]] - lo[js[0]]) * f0
                    c[js[1]] = lo[js[1]] + (hi[js[1]] - lo[js[1]]) * f1
                    p = B(c)
                    if inside(p):
                        continue
                    hs = {}
                    for j in js:
                        for s in (1, -1):
                            d = [0, 0, 0]; d[j] = s
                            hs[(j, s)] = cast(p, B(d), 3.0)
                    # 見る人の側（0.4m 以上ひらけた向き）があり、その反対へ 6cm 以上深い（奥に何かが見える）
                    vw = [(j, s) for (j, s), h in hs.items() if h is None or h[0] > 0.4]
                    deep = [(j, s, hs[(j, -s)]) for j, s in vw if hs[(j, -s)] is None or hs[(j, -s)][0] > 0.06]
                    if deep:
                        res.append((c, deep))
            if res:
                c, deep = res[len(res) // 2]
                print('OPEN %-20s %-20s %s gap %4.1fmm pts %d/9 at (%.2f,%.2f,%.2f) %s' % (a, b, 'xyz'[k], g * 1000, len(res), c[0], c[1], c[2],
                      ' '.join('view %s%s bottom %s %s' % ('xyz'[j], '+' if s > 0 else '-', h[1] if h else 'none', ('%.2f' % h[0]) if h else '') for j, s, h in deep[:2])), flush=True)
print('done')
