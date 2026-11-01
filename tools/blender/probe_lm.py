# 焼いた値を点で調べる：run.py py tools/blender/probe_lm.py <x,y,z;x,y,z;...（three.js の座標）> [層の頭,...]
# 点の真上（+y）から下へ光線を当てた面のライトマップの UV で、bake/work/lm の層ごとの .npy を読み、点ごとに並べて出す（床の境目の段差などを、どの層が作っているか調べる）
import bpy, sys, os
import numpy as np
from mathutils import Vector, geometry
from mathutils.bvhtree import BVHTree
argv = sys.argv[sys.argv.index('--') + 1:]
pts = [tuple(float(v) for v in p.split(',')) for p in argv[0].split(';')]
heads = argv[1].split(',') if argv[1:] else None
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LM = os.path.join(ROOT, 'bake', 'work', os.environ.get('LM_PROBE', 'lm'))   # 試しに焼いたフォルダを見るときは引数 LM_PROBE=<bake/work の下のフォルダ>
objs = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith(('A_', 'L_')) and not o.name.endswith('_closed') and 'LM' in o.data.uv_layers and o.get('atlas')]
hits = []; TRI = {}
for (x, y, z) in pts:
    org = Vector((x, -z, y + 0.3)); best = None
    for o in objs:
        mw = o.matrix_world; inv = mw.inverted(); me = o.data; me.calc_loop_triangles()
        if o.name not in TRI:   # 三角形ごとの BVH（三角形の番号から重心座標で UV を求める）
            TRI[o.name] = BVHTree.FromPolygons([v.co for v in me.vertices], [tuple(t.vertices) for t in me.loop_triangles], epsilon=0.0)
        lo = inv @ org; ld = (inv.to_3x3() @ Vector((0, 0, -1))).normalized()
        loc, n, ti, d = TRI[o.name].ray_cast(lo, ld, 1.0)
        if loc is not None:
            dw = ((mw @ loc) - org).length
            if best is None or dw < best[0]:
                best = (dw, o, ti, loc)
    if best is None:
        hits.append(None); continue
    dw, o, ti, loc = best
    me = o.data; t = me.loop_triangles[ti]; uvl = me.uv_layers['LM'].data
    a, b, c = (me.vertices[v].co for v in t.vertices)
    ua, ub, uc = (uvl[li].uv.to_3d() for li in t.loops)
    uv = geometry.barycentric_transform(loc, a, b, c, ua, ub, uc)
    hits.append((o.name, o['atlas'], uv.x, uv.y))
    print('pt', (x, y, z), o.name, o['atlas'], 'uv %.4f %.4f' % (uv.x, uv.y), flush=True)
import json
alias = json.load(open(os.path.join(LM, 'alias.json')))   # 層の名前 → アトラス → 焼いたフォルダ（無いアトラスは焼いていない＝0）
for L in sorted(alias):
    if heads and not any(L.startswith(hd) for hd in heads):
        continue
    row = []
    for h in hits:
        if h is None:
            row.append('   -   '); continue
        fd = alias[L].get(h[1])
        f = os.path.join(LM, fd, h[1] + '.npy') if fd else ''
        if not fd or not os.path.exists(f):
            row.append('  none '); continue
        a = np.load(f, mmap_mode='r'); n = a.shape[0]
        px = min(max(int(h[2] * n), 0), n - 1)
        v = [float(np.asarray(a[min(max(py, 0), n - 1), px, :3], np.float32).mean()) for py in (int(h[3] * n), int((1 - h[3]) * n))]   # 画像の上下の向き（v→行）の両方
        row.append('%7.1f/%-7.1f' % tuple(v))
    print('%-60s' % L, ' '.join(row), flush=True)
