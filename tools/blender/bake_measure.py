# 粗い焼き込みで、光源ごとに「どの部屋まで光が届くか」と「閉じたドアからの漏れ」を測る
# 使い方：blender -b house.blend -P tools/blender/bake_measure.py -- <出力の json> [サンプル数] [解像度]
# 建物の固まり（壁・床・天井）だけを焼き、家具・建具・階段は光を遮る物として入れる。光源ごとに、試作のドア3枚（SG311・SG500w・SG33s）をすべて閉じた状態とすべて開けた状態で焼き、部屋ごとの床の照度（平均・上位5%）を出す
import bpy, bmesh, math, sys, os, json, time
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bake_common as bc

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0]
SAMPLES = int(argv[1]) if len(argv) > 1 else 128
RES = int(argv[2]) if len(argv) > 2 else 1024
SOURCES = argv[3].split(',') if len(argv) > 3 else ['bdl', 'bbr', 'j1', 'h1', 'l1', 'k1', 'sky_bed', 'sun_bed', 'sky_study', 'sun_study', 'sky_void', 'sun_void', 'sky_ldk1F', 'sun_ldk1F']

sc = bc.setup(SAMPLES)
lamps = bc.add_lamps(sc)
sky = bc.add_sky_sun(sc)
bld = bpy.data.objects['Building']
# ライトマップの UV（測るだけなので自動の展開）
img = bpy.data.images.new('LM', RES, RES, alpha=False, float_buffer=True)
me = bld.data
me.uv_layers.new(name='LM'); me.uv_layers.active = me.uv_layers['LM']
bpy.ops.object.select_all(action='DESELECT'); bld.select_set(True); bpy.context.view_layer.objects.active = bld
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.0, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
bpy.ops.uv.select_all(action='SELECT'); bpy.ops.uv.average_islands_scale()
bpy.ops.uv.pack_islands(rotate=True, margin_method='FRACTION', margin=4 / RES)
bpy.ops.object.mode_set(mode='OBJECT')
for m in me.materials:
    n = m.node_tree.nodes.new('ShaderNodeTexImage'); n.image = img; m.node_tree.nodes.active = n
# 部屋ごとの床の面（上向きの面の中心が部屋の範囲にある所）の画素
ROOMS = {'bed': (bc.OX, bc.OX + bc.BW_, bc.OZ, bc.OZ + bc.BD_, bc.FL2), 'wic': (0.455, 2.16, 3.6375, 5.3425, bc.FL2), 'study': (0.455, 2.16, 5.4575, 7.16, bc.FL2),
         'hall': (-0.47, bc.W, 2.7275, 3.58, bc.FL2), 'ldk': (0, bc.W, 0, bc.D, 0.0)}
uvl = me.uv_layers['LM'].data
me.calc_loop_triangles()
masks = {k: np.zeros((RES, RES), bool) for k in ROOMS}
for t in me.loop_triangles:
    p = me.polygons[t.polygon_index]
    if p.normal.z < 0.9:
        continue
    c = p.center; x, y, z = c.x, c.z, -c.y
    for k, (x0, x1, z0, z1, fy) in ROOMS.items():
        if x0 - 0.01 < x < x1 + 0.01 and z0 - 0.01 < z < z1 + 0.01 and abs(y - fy) < 0.01:
            tri = np.array([uvl[l].uv[:] for l in t.loops]) * RES
            lo = np.floor(tri.min(0)).astype(int); hi = np.ceil(tri.max(0)).astype(int)
            xs, ys = np.meshgrid(np.arange(lo[0], hi[0]) + 0.5, np.arange(lo[1], hi[1]) + 0.5)
            A, Bp, C = tri
            d = lambda P, Q: (Q[0] - P[0]) * (ys - P[1]) - (Q[1] - P[1]) * (xs - P[0])
            w0, w1, w2 = d(Bp, C), d(C, A), d(A, Bp)
            inside = ((w0 >= 0) & (w1 >= 0) & (w2 >= 0)) | ((w0 <= 0) & (w1 <= 0) & (w2 <= 0))
            sub = masks[k][lo[1]:hi[1], lo[0]:hi[0]]
            sub |= inside[:sub.shape[0], :sub.shape[1]]
# 縁の画素は焼きのにじみを含むので1画素内側だけ使う
for k in masks:
    m = masks[k]; masks[k] = m & np.roll(m, 1, 0) & np.roll(m, -1, 0) & np.roll(m, 1, 1) & np.roll(m, -1, 1)
print('floor pixels', {k: int(v.sum()) for k, v in masks.items()}, flush=True)

cols = bpy.data.collections
def doors(open_):
    for o in cols['doors_open'].objects:
        o.hide_render = not open_
    for o in cols['doors_closed'].objects:
        o.hide_render = open_
res = {}
for src in SOURCES:
    bc.set_source(src, lamps, sky)
    for st in ('closed', 'open'):
        doors(st == 'open')
        img.pixels.foreach_set(np.zeros(RES * RES * 4, dtype=np.float32))
        t = time.time()
        bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT'}, margin=4, margin_type='EXTEND', use_clear=True, target='IMAGE_TEXTURES')
        px = np.empty(RES * RES * 4, dtype=np.float32); img.pixels.foreach_get(px)
        lux = px.reshape(RES, RES, 4)[:, :, :3].mean(2) * math.pi / bc.LM2W
        r = {k: [round(float(lux[m].mean()), 3), round(float(np.percentile(lux[m], 95)), 3)] for k, m in masks.items()}
        res[src + '@' + st] = r
        print(src, st, '%.1fs' % (time.time() - t), r, flush=True)
        if st == 'open':
            np.save(OUT.replace('.json', '_%s.npy' % src), lux.astype(np.float32))
json.dump(res, open(OUT, 'w'), indent=1)
print('DONE', flush=True)
