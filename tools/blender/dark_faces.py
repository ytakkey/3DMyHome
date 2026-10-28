# 焼いた明るさが、すぐ横の同じ向きの面より極端に暗い面を家全体から拾う（黒い巾木の上面・枠の内側などの見落としを防ぐ）
# blender -b bake_uv.blend -P dark_faces.py -- <層のフォルダ（bake/work/lm）> <出力の json> [比の上限 0.35]
import bpy, sys, os, json, math
import numpy as np
from mathutils import Vector, kdtree

argv = sys.argv[sys.argv.index('--') + 1:]
LD, OUT = argv[0], argv[1]
RATIO = float(argv[2]) if len(argv) > 2 else 0.35
STEP = 0.02     # 面の上に置く点の間隔（m）
RAD = 0.07      # 比べる相手を探す距離（m）

objs = [o for o in bpy.data.objects if o.type == 'MESH' and 'atlas' in o and not o.get('vlit') and 'LM' in o.data.uv_layers]
groups = sorted({o['atlas'] for o in objs})
res = {}
tot = {}
for g in groups:   # アトラスごとに、焼いたすべての層の明るさ（輝度）を足す
    acc = None
    for d in os.listdir(LD):
        if d.startswith('_'):   # _labels（島の番号）は除く
            continue
        p = os.path.join(LD, d, g + '.npy')
        if os.path.exists(p):
            a = np.load(p).astype(np.float32)
            y = a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722
            acc = y if acc is None else acc + y
    if acc is not None:
        tot[g] = acc
print('atlases', {g: tot[g].shape[0] for g in tot}, flush=True)

P, N, V, F, G = [], [], [], [], []   # 点の位置・法線・明るさ・面の番号・アトラス
faces = []   # (物体, 面, アトラス, 面積)
for o in objs:
    g = o['atlas']
    if g not in tot:
        continue
    im = tot[g]; r = im.shape[0]
    me = o.data; me.calc_loop_triangles(); mw = o.matrix_world; m3 = mw.to_3x3()
    uvl = me.uv_layers['LM'].data
    fid = {}
    for t in me.loop_triangles:
        pi = t.polygon_index
        k = (o.name, pi)
        if k not in fid:
            fid[k] = len(faces); faces.append((o.name, pi, g, me.polygons[pi].area))
        fi = fid[k]
        vs = [mw @ me.vertices[v].co for v in t.vertices]
        us = [uvl[l].uv for l in t.loops]
        n = (m3 @ t.normal).normalized()
        L = max((vs[0] - vs[1]).length, (vs[1] - vs[2]).length, (vs[2] - vs[0]).length)
        m = max(1, min(60, int(math.ceil(L / STEP))))
        for i in range(m):
            for j in range(m - i):
                a, b = (i + 1 / 3) / m, (j + 1 / 3) / m
                c = 1 - a - b
                if c <= 0:
                    continue
                p = vs[0] * a + vs[1] * b + vs[2] * c
                u = us[0] * a + us[1] * b + us[2] * c
                x = min(r - 1, max(0, int(u.x * r))); yy = min(r - 1, max(0, int(u.y * r)))
                P.append(p); N.append(n); V.append(float(im[yy, x])); F.append(fi); G.append(g)
print('points', len(P), 'faces', len(faces), flush=True)

# 覆われた面（家具の底・壁に付けた面など）は見えないので除く：点から法線の向きに 1cm 以内で何かに当たる点が半分以上
from mathutils.bvhtree import BVHTree
import bmesh
bm = bmesh.new()
for o in bpy.data.objects:
    if o.type == 'MESH' and not o.name.endswith('_glass') and o.name != 'A_exterior' and not o.get('shadeobj'):
        t = o.data.copy(); t.transform(o.matrix_world); bm.from_mesh(t); bpy.data.meshes.remove(t)
bvh = BVHTree.FromBMesh(bm)
covered = set()
cnt = {}
for i in range(len(P)):
    f = F[i]
    if f in cnt and cnt[f][0] >= 6:
        continue
    h = bvh.ray_cast(P[i] + N[i] * 0.0005, N[i], 0.01)
    c = cnt.setdefault(f, [0, 0]); c[0] += 1; c[1] += h[0] is not None
for f, (a, b) in cnt.items():
    if b * 2 >= a:
        covered.add(f)
print('covered faces', len(covered), flush=True)
kd = kdtree.KDTree(len(P))
for i, p in enumerate(P):
    kd.insert(p, i)
kd.balance()
V = np.array(V); F = np.array(F)
fv = {}
for i in range(len(P)):
    fv.setdefault(F[i], []).append(i)
out = []
for fi, idx in fv.items():
    if faces[fi][3] * 1e4 < 1.0 or fi in covered:   # 1cm² 未満・覆われた面は見えない
        continue
    own = float(np.median(V[idx]))
    nb = []
    for i in idx[:: max(1, len(idx) // 40)]:
        for (co, j, d) in kd.find_range(P[i], RAD):
            if F[j] != fi and G[j] == G[i] and N[j].dot(N[i]) > 0.8:
                nb.append(V[j])
    if len(nb) < 4:
        continue
    ref = float(np.median(nb))
    if ref <= 0 or own >= RATIO * ref:
        continue
    on, pi, g, ar = faces[fi]
    c = sum((P[i] for i in idx), Vector()) / len(idx); n = N[idx[0]]
    out.append({'atlas': g, 'obj': on, 'poly': pi, 'area_cm2': round(ar * 1e4, 1), 'ratio': round(own / ref, 3), 'own': round(own, 2), 'ref': round(ref, 2),
                'pos': [round(c.x, 3), round(c.z, 3), round(-c.y, 3)], 'nrm': [round(n.x, 2), round(n.z, 2), round(-n.y, 2)], '_idx': idx})
# 部屋の中から見えない面（壁の中の空洞・外壁の外側・閉じた収納の中）は除く：部屋の中の目の高さの点から、遮られずに表が見える面だけ残す
mn = Vector((min(p.x for p in P), min(p.y for p in P), 0)); mx = Vector((max(p.x for p in P), max(p.y for p in P), 0))
eyes = []
for fz in (0.0, 2.97):   # 1階・2階の床
    for hz in (1.2, 1.6):
        x = mn.x + 0.25
        while x < mx.x:
            y = mn.y + 0.25
            while y < mx.y:
                q = Vector((x, y, fz + hz))
                dn = bvh.ray_cast(q, Vector((0, 0, -1)), 3); up = bvh.ray_cast(q, Vector((0, 0, 1)), 3)
                if dn[0] is not None and up[0] is not None and dn[1].z > 0.5 and up[1].z < -0.5 and q.z - dn[0].z > 0.9:   # 床の上で天井の下（表が見える）
                    eyes.append(q)
                y += 0.3
            x += 0.3
print('eyes', len(eyes), flush=True)
def vis(i):   # 点 i が部屋の中のどれかの目から見えるか
    p = P[i] + N[i] * 0.002
    for q in eyes:
        d = q - p; L = d.length
        if L < 0.05 or d.dot(N[i]) <= 0.05 * L:
            continue
        if bvh.ray_cast(p, d / L, L - 0.01)[0] is None:
            return True
    return False
kept = []
for e in out:   # 見える点だけの明るさで比べ直す（家具の陰になった部分で中央値が下がった大きな面を拾わない）
    idx = e.pop('_idx')
    vv = [i for i in idx[:: max(1, len(idx) // 30)] if vis(i)]
    if not vv:
        continue
    own = float(np.median(V[vv]))
    if own >= RATIO * e['ref']:
        continue
    e['own'] = round(own, 2); e['ratio'] = round(own / e['ref'], 3); e['vis'] = len(vv)
    kept.append(e)
out = kept
out.sort(key=lambda e: (e['ratio'], -e['area_cm2']))
json.dump(out, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print('DARK', len(out), flush=True)
for e in out[:60]:
    print(e, flush=True)
