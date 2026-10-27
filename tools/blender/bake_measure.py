# 粗い焼き込みで、光源ごとに「どのドアがどの部屋の明るさに効くか」を測る（焼く層の組み合わせを決めるため。CLAUDE.md 1章「照明とドア」）
# 使い方：blender -b house.blend -P tools/blender/bake_measure.py -- <出力の json> [サンプル数] [解像度] [光源,...]
# 建物の固まり（壁・床・天井）だけを焼き、家具・建具・階段は光を遮る物として入れる。2階のドア（SG311・SG500w・SG33s）は閉じたまま。
# 光源ごとに、1階のドアを「全部開ける」「全部開けて1枚だけ閉じる（ドアの数だけ）」「全部閉じる」で焼き、部屋ごとの床の照度（平均・上位5%）を出す
import bpy, bmesh, math, sys, os, json, time
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bake_common as bc

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0]
SAMPLES = int(argv[1]) if len(argv) > 1 else 128
RES = int(argv[2]) if len(argv) > 2 else 2048
SOURCES = argv[3].split(',') if len(argv) > 3 else ['sky_void', 'sun_void', 'h1', 'j1', 'sky_ldk1F', 'sun_ldk1F', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6',
                                                     'd1', 'e1', 'eh', 'b3', 'ec', 'ek', 'g1', 'bath', 'sky_dress', 'sun_dress']
D1F = ['SG300l', 'SG300w', 'BATHD', 'SG33', 'SG11H', 'SG500']
DALL = ['SG311', 'SG500w', 'SG33s'] + D1F   # 名前の頭で見分ける（長い名前を先に）

sc = bc.setup(SAMPLES)
lamps = bc.add_lamps(sc)
sky = bc.add_sky_sun(sc)
for n in filter(None, os.environ.get('MEASURE_HIDE', '').split(',')):   # 調べる用：物を外して測る
    bpy.data.objects[n].hide_render = True
bld = bpy.data.objects['Building']
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
# 部屋ごとの床（上向きの面）の画素。部屋は bake_common.room_of（アトラスの分け方と同じ）
uvl = me.uv_layers['LM'].data
me.calc_loop_triangles()
masks = {}
for t in me.loop_triangles:
    p = me.polygons[t.polygon_index]
    if p.normal.z < 0.9 or me.materials[p.material_index].name == 'exterior':
        continue
    c = p.center; k = bc.room_of(c.x, c.z + 0.05, -c.y)
    if k == 'hall' and c.z < 2.5:   # 吹抜けの1階の床は ldk
        k = 'ldk'
    m = masks.setdefault(k, np.zeros((RES, RES), bool))
    tri = np.array([uvl[l].uv[:] for l in t.loops]) * RES
    lo = np.floor(tri.min(0)).astype(int); hi = np.ceil(tri.max(0)).astype(int)
    xs, ys = np.meshgrid(np.arange(lo[0], hi[0]) + 0.5, np.arange(lo[1], hi[1]) + 0.5)
    A, Bp, C = tri
    d = lambda P, Q: (Q[0] - P[0]) * (ys - P[1]) - (Q[1] - P[1]) * (xs - P[0])
    w0, w1, w2 = d(Bp, C), d(C, A), d(A, Bp)
    inside = ((w0 >= 0) & (w1 >= 0) & (w2 >= 0)) | ((w0 <= 0) & (w1 <= 0) & (w2 <= 0))
    sub = m[lo[1]:hi[1], lo[0]:hi[0]]
    sub |= inside[:sub.shape[0], :sub.shape[1]]
for k in masks:   # 縁の画素は焼きのにじみを含むので1画素内側だけ使う
    m = masks[k]; masks[k] = m & np.roll(m, 1, 0) & np.roll(m, -1, 0) & np.roll(m, 1, 1) & np.roll(m, -1, 1)
print('floor pixels', {k: int(v.sum()) for k, v in masks.items()}, flush=True)

cols = bpy.data.collections
def dk(o):
    return next((d for d in DALL if o.name.startswith(d)), None)
def doors(op):
    for o in cols['doors_open'].objects:
        o.hide_render = dk(o) not in op
    for o in cols['doors_closed'].objects:
        o.hide_render = dk(o) in op
res = json.load(open(OUT)) if os.path.exists(OUT) else {}
for src in SOURCES:
    bc.set_source(src, lamps, sky)
    for st in ['open'] + ['-' + d for d in D1F] + ['closed']:
        key = src + '@' + st
        if key in res:
            continue
        op = set(D1F) if st == 'open' else (set() if st == 'closed' else set(D1F) - {st[1:]})
        doors(op)
        img.pixels.foreach_set(np.zeros(RES * RES * 4, dtype=np.float32))
        t = time.time()
        bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT'}, margin=4, margin_type='EXTEND', use_clear=True, target='IMAGE_TEXTURES')
        px = np.empty(RES * RES * 4, dtype=np.float32); img.pixels.foreach_get(px)
        lux = px.reshape(RES, RES, 4)[:, :, :3].mean(2) * math.pi / bc.LM2W
        res[key] = {k: [round(float(lux[m].mean()), 3), round(float(np.percentile(lux[m], 95)), 3)] for k, m in masks.items() if m.any()}
        print(key, '%.1fs' % (time.time() - t), res[key], flush=True)
        json.dump(res, open(OUT, 'w'), indent=1)
print('DONE', flush=True)
