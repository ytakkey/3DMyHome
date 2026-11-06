# ライトマップの画素のうち、ほかの部品にぴったり覆われて見えない所（棚板の端が当たった壁・家具が置かれた床の下など）を調べる
# 使い方：blender -b bake_uv.blend -P tools/blender/cover_mask.py -- <出力のフォルダ>（run.py cover。出力は <フォルダ>/<アトラス>_cover.npy）
# 覆われた所は焼くと真っ黒になり、その黒が画像のならし・表示の Bスプラインで見える所へにじみ、WIC の壁の角に棚の端から黒いしみが出ていた
# （2026-11-05 ユーザー）。lm_images.py が、覆われた画素を同じ島の見える画素の明るさで埋めてから画像にする。
# 覆う物：建物と動かない家具（扉は開閉で変わるので入れない。焼くときに影を落とさない板＝plate の面も入れない）
# あわせて、同じ平面で隣り合う別の島（別のアトラスも）の縁の画素どうしの組を links.npz に（lm_images.py のならす処理が境目をまたいで混ぜる。
# 島ごとに閉じてならすと、細い島が島の中で平らになり、隣の島との境目に明るさの段差が出た：階段の上の端のタレ壁（高さ10cm、ldk）と
# 上の壁（hall。吹抜けの壁は1階の天井の高さでアトラスが分かれる）。2026-11-05 ユーザー）
import bpy, sys, os
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
out = sys.argv[sys.argv.index('--') + 1]
os.makedirs(out, exist_ok=True)
GAP = 0.003   # 画素の点の真正面 0〜3mm に、こちらを向いた（向きが逆の）ほかの面があれば覆われている（すき間0で突き当たった棚板の端・家具の裏）
objs = [o for o in bpy.data.objects if o.type == 'MESH' and 'atlas' in o and o['atlas'] != 'exterior' and not o.get('shadeobj') and 'door' not in o]
vs, ps = [], []
for o in objs:
    me = o.data; mw = o.matrix_world; b = len(vs)
    pl = np.zeros(len(me.polygons), np.int32)
    if 'plate' in me.attributes:
        me.attributes['plate'].data.foreach_get('value', pl)
    vs += [mw @ v.co for v in me.vertices]
    ps += [[b + i for i in p.vertices] for p in me.polygons if not pl[p.index]]
bvh = BVHTree.FromPolygons(vs, ps, epsilon=0.0)
POS, NRM = {}, {}
for g in sorted({o['atlas'] for o in objs if 'vlit' not in o}):
    tg = [o for o in objs if o['atlas'] == g and 'vlit' not in o and 'LM' in o.data.uv_layers]
    r = tg[0]['lm_res']; cov = np.zeros((r, r), bool); n = 0
    pos = np.full((r, r, 3), np.nan, np.float32); nrmA = np.zeros((r, r, 3), np.float32)
    for o in tg:
        me = o.data; mw = o.matrix_world; m3 = mw.to_3x3(); me.calc_loop_triangles()
        uv = np.zeros(len(me.loops) * 2, np.float32); me.uv_layers['LM'].data.foreach_get('uv', uv); uv = uv.reshape(-1, 2) * r
        co = np.array([tuple(mw @ v.co) for v in me.vertices])
        lv = np.zeros(len(me.loops), np.int32); me.loops.foreach_get('vertex_index', lv)
        for t in me.loop_triangles:
            tri = uv[list(t.loops)]; P3 = co[lv[list(t.loops)]]
            lo = np.maximum(np.floor(tri.min(0)).astype(int), 0); hi = np.minimum(np.ceil(tri.max(0)).astype(int), r)
            if hi[0] <= lo[0] or hi[1] <= lo[1]:
                continue
            xs, ys = np.meshgrid(np.arange(lo[0], hi[0]) + 0.5, np.arange(lo[1], hi[1]) + 0.5)
            A, B, C = tri; den = (B[1] - C[1]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[1] - C[1])
            if abs(den) < 1e-12:
                continue
            w0 = ((B[1] - C[1]) * (xs - C[0]) + (C[0] - B[0]) * (ys - C[1])) / den
            w1 = ((C[1] - A[1]) * (xs - C[0]) + (A[0] - C[0]) * (ys - C[1])) / den
            w2 = 1 - w0 - w1
            ins = (w0 >= 0) & (w1 >= 0) & (w2 >= 0)
            if not ins.any():
                continue
            nrm = (m3 @ t.normal).normalized()
            pts = w0[ins, None] * P3[0] + w1[ins, None] * P3[1] + w2[ins, None] * P3[2]
            iy, ix = np.nonzero(ins)
            pos[lo[1] + iy, lo[0] + ix] = pts; nrmA[lo[1] + iy, lo[0] + ix] = tuple(nrm)
            for k in range(len(pts)):
                q = Vector(pts[k])
                for loc, fn, i, d in bvh.find_nearest_range(q, GAP):
                    off = loc - q; a = off.dot(nrm)
                    if fn.dot(nrm) < -0.5 and -1e-4 <= a <= GAP and (off - nrm * a).length < 1e-5:
                        cov[lo[1] + iy[k], lo[0] + ix[k]] = True; n += 1
                        break
    np.save(os.path.join(out, g + '_cover.npy'), cov)
    POS[g], NRM[g] = pos, nrmA
    print('COVER', g, r, n, flush=True)

# ===== 島の境目をまたぐ組：島の縁の画素から、3次元で一番近い、別の島の同じ平面の画素（向きの差 18度未満・平面からのずれ 3mm 未満） =====
from mathutils.kdtree import KDTree
names = sorted(POS); E = []   # (アトラスの番号, 行, 列)
for ai, g in enumerate(names):
    L = np.load(os.path.join(out, g + '.npy')); ins = L >= 0
    edge = np.zeros_like(ins)
    for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)):
        sh = np.full_like(L, -2); h, w = L.shape
        sh[max(0, -dy):h - max(0, dy), max(0, -dx):w - max(0, dx)] = L[max(0, dy):h - max(0, -dy), max(0, dx):w - max(0, -dx)]
        edge |= ins & (sh != L)
    edge &= ~np.isnan(POS[g][..., 0])
    for y, x in zip(*np.nonzero(edge)):
        E.append((ai, y, x))
kd = KDTree(len(E))
for k, (ai, y, x) in enumerate(E):
    kd.insert(Vector(POS[names[ai]][y, x]), k)
kd.balance()
labs = {g: np.load(os.path.join(out, g + '.npy')) for g in names}
links, seen = [], set()
for k, (ai, y, x) in enumerate(E):
    g = names[ai]; P = POS[g][y, x]; n = NRM[g][y, x]; L = labs[g]; s = 0.0
    for yy, xx in ((y, x + 1), (y, x - 1), (y + 1, x), (y - 1, x)):
        if 0 <= yy < L.shape[0] and 0 <= xx < L.shape[1] and L[yy, xx] == L[y, x] and not np.isnan(POS[g][yy, xx, 0]):
            s = max(s, float(np.linalg.norm(POS[g][yy, xx] - P)))
    rad = min(max(s, 0.005) * 1.5, 0.08); best = None
    for co, j, d in kd.find_range(Vector(P), rad):
        bj, yj, xj = E[j]
        if (bj == ai and labs[names[bj]][yj, xj] == L[y, x]) or j == k:
            continue
        n2 = NRM[names[bj]][yj, xj]
        if float(np.dot(n, n2)) < 0.95 or abs(float(np.dot(np.array(co) - P, n))) > 0.003:
            continue
        if best is None or d < best[1]:
            best = (j, d)
    if best and (min(k, best[0]), max(k, best[0])) not in seen:   # 組は1回だけ（ならすときに両方向に使う）
        seen.add((min(k, best[0]), max(k, best[0]))); bj, yj, xj = E[best[0]]; links.append((ai, y, x, bj, yj, xj))
links = np.array(links, np.int32).reshape(-1, 6)
np.savez(os.path.join(out, 'links.npz'), names=np.array(names), links=links)
print('COVER links', len(E), 'edge texels', len(links), 'pairs', flush=True)
