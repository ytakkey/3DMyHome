# 照明の光源（bake_common.LAMPS）が器具などの形の中に埋まっていないかを調べる：run.py pyh tools/blender/check_lamps.py
# 光源の点から6方向へ光線を出し、最初に当たる面の裏から当たった（＝形の中にいる）方向を数える。光の出る向き（下・上・狙う向き）の側の近い面も出す
import bpy, sys, os
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bake_common as bc
dg = bpy.context.evaluated_depsgraph_get()
objs = [o for o in bpy.data.objects if o.type == 'MESH' and not o.hide_render and o.name != 'Building'] + [o for o in bpy.data.objects if o.name == 'Building']
trees = []
for o in objs:
    try:
        trees.append((o, BVHTree.FromObject(o, dg), o.matrix_world, o.matrix_world.inverted()))
    except ValueError:   # 表示から外した物（開いた形の扉など）は形を取れない
        pass
def cast(p, d):
    best = None
    for o, t, mw, inv in trees:
        loc, n, fi, dd = t.ray_cast(inv @ p, (inv.to_3x3() @ d).normalized(), 0.5)
        if loc is not None:
            w = mw @ loc; dist = (w - p).length; nw = (inv.transposed().to_3x3() @ n).normalized()
            if best is None or dist < best[0]:
                best = (dist, o.name, nw.dot(d) > 0)
    return best
bad = 0
for g, ls in bc.LAMPS.items():
    for t in ls:
        kind, p = t[0], bc.B(*t[1])
        offs = {'down': [(0, 0, -0.0075)], 'disk': [(0, 0, -0.0075)], 'brk': [(0, 0, 0.0375), (0, 0, -0.0375)]}.get(kind, [(0, 0, 0)])
        for o in offs:
            q = p + Vector(o)
            inside = []
            near = []
            for d in (Vector((1, 0, 0)), Vector((-1, 0, 0)), Vector((0, 1, 0)), Vector((0, -1, 0)), Vector((0, 0, 1)), Vector((0, 0, -1))):
                h = cast(q, d)
                if h and h[2]:
                    inside.append(h[1])
                if h and h[0] < 0.01:
                    near.append('%s %.1fmm' % (h[1], h[0] * 1000))
            em = Vector((0, 0, -1)) if kind in ('down', 'disk', 'aim') and kind != 'aim' else (bc.B(*t[3]).normalized() if kind == 'aim' else None)
            hdir = cast(q, em) if em is not None else None
            flag = len(inside) >= 4 or (hdir and hdir[0] < 0.02)
            bad += bool(flag)
            print('%s %-4s %-5s (%.3f,%.3f,%.3f) inside %d %s | emit-dir hit %s' % ('NG' if flag else 'ok', g, kind, q.x, q.z, -q.y, len(inside), sorted(set(inside))[:3],
                  ('%s %.1fmm%s' % (hdir[1], hdir[0] * 1000, ' (back)' if hdir[2] else '')) if hdir else '-'), flush=True)
        # 向きのある円の面光源（aim。径は t[5]）は、傾けた円の縁と半分の径の点も形の中に入らず、面から 1.5mm 以上離れていること
        # （A6 は中心が天井の 9mm 下で、傾けた縁が天井に 3mm 埋まり、器具の横の天井に明るい輪が出た。14.5mm 下にしても縁が器具の発光面の円板に 6mm 入っていた。
        #  この点検は以前 t[6] を径として読んでいて縁を調べていなかった。2026-11-08）
        if kind == 'aim':
            import math
            n = bc.B(*t[3]).normalized(); u = n.orthogonal().normalized(); v = n.cross(u); r = t[5] / 2
            for f in (1.0, 0.5):
                for k in range(16):
                    a = k / 16 * 2 * math.pi; q = p + (u * math.cos(a) + v * math.sin(a)) * r * f
                    hs = [cast(q, d) for d in (Vector((1, 0, 0)), Vector((-1, 0, 0)), Vector((0, 1, 0)), Vector((0, -1, 0)), Vector((0, 0, 1)), Vector((0, 0, -1)))]
                    ins = [h[1] for h in hs if h and h[2]]
                    cl = [(h[1], h[0]) for h in hs if h and h[0] < 0.0015]
                    if len(ins) >= 4 or cl:
                        bad += 1; print('NG %-4s rim%s (%.4f,%.4f,%.4f) inside %s near %s' % (g, '' if f == 1 else '/2', q.x, q.z, -q.y, sorted(set(ins))[:3], cl[:2]), flush=True)
                        break
print('lamps NG', bad)
