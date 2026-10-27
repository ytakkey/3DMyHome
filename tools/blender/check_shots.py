# 確認の画像と食い込みの点検：build_house.py で作った .blend を開き、決まった視点・ドアの前後・枠の内側を Workbench で撮る
# 使い方：blender -b <house.blend> -P tools/blender/check_shots.py -- <出力のフォルダ> [視点の名前,...]
# 視点は three.js の look()（目の位置・見る点・縦の画角）と同じ指定。ドアの視点は閉じた形と開いた形を両方撮る
import bpy, bmesh, math, sys, os, json
from mathutils import Vector
from mathutils.bvhtree import BVHTree

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUTDIR = argv[0]
ONLY = set(argv[1].split(',')) if len(argv) > 1 else None
os.makedirs(OUTDIR, exist_ok=True)
FL2, EYE = 2.9, 1.2
B = lambda x, y, z: Vector((x, -z, y))

# 視点：名前・目・見る点・縦の画角・ドアの開閉を撮り分けるか
VIEWS = [
 ('01_living', (3.84, EYE, 6.95), (0.56, 1.05, 3.18), 85, False),            # 決まった視点（ui.js の VIEWS）
 ('02_kitchen', (4.67, EYE, 0.8), (1.29, 0.95, 2.93), 85, False),
 ('03_bedroom', (0.1475, FL2 + EYE, 6.9475), (-2.0725, FL2 + 0.85, 3.6375), 85, True),
 ('04_hall2F', (4.57, FL2 + EYE, 3.18), (-0.6, FL2 + 1.05, 3.18), 80, True),
 ('05_SG311_hall', (-0.05, FL2 + EYE, 2.85), (-0.05, FL2 + 0.9, 3.6), 75, True),     # ドアの前後
 ('06_SG311_bed', (-0.05, FL2 + EYE, 4.9), (-0.05, FL2 + 0.9, 3.55), 75, True),
 ('07_SG500w_bed', (-0.9, FL2 + EYE, 4.49), (0.34, FL2 + 0.9, 4.49), 75, True),
 ('08_SG500w_wic', (1.75, FL2 + EYE, 4.49), (0.455, FL2 + 0.9, 4.49), 75, True),
 ('09_SG33s_bed', (-0.9, FL2 + EYE, 6.76), (0.34, FL2 + 0.9, 6.76), 75, True),
 ('10_SG33s_study', (1.9, FL2 + EYE, 6.0), (0.455, FL2 + 0.9, 6.85), 75, True),
 ('11_bed_window', (-0.95, FL2 + 1.3, 6.45), (-0.95, FL2 + 1.45, 7.3), 70, False),   # 枠の内側
 ('12_study_window', (1.715, FL2 + 1.3, 6.5), (1.715, FL2 + 1.45, 7.3), 75, False),
 ('13_stairs_1F', (2.5, 1.3, 5.9), (4.4, 1.5, 4.5), 80, False),
 ('14_void_from_2F', (3.0, FL2 + 1.35, 3.25), (3.6, 1.0, 6.2), 85, False),
 ('15_tv_wall_SG11H', (2.6, EYE, 4.3), (0.455, 1.1, 4.3), 80, False),
 ('16_hall_west', (1.6, FL2 + EYE, 3.15), (-0.47, FL2 + 0.95, 3.0), 80, False),
 ('17_study', (2.0, FL2 + 1.4, 5.6), (0.7, FL2 + 0.7, 6.9), 85, False),
 ('18_wic', (0.65, FL2 + 1.4, 5.15), (2.1, FL2 + 1.0, 3.8), 85, False),
 ('19_cupboard', (2.9, 1.5, 1.4), (3.9, 0.9, 0.0), 80, False),
 ('20_stairs_top', (4.4, FL2 + 1.5, 3.05), (4.4, FL2 - 1.0, 4.6), 85, False),
 ('21_living_window', (2.6, 1.3, 6.2), (2.6, 1.2, 7.3), 85, False),
 ('23_SG300l', (1.7, EYE, 2.3), (0.0, 1.0, 2.3), 85, False),
 ('22_oshiire_SG300l', (2.4, EYE, 2.4), (0.0, 1.0, 1.4), 85, False),
 ('30_dress', (-0.4, EYE, 2.0), (-2.0, 1.0, 2.8), 85, True),                 # 1階の西側（2026-10-27）
 ('31_bathdoor', (-1.0, EYE, 2.9), (-1.0, 0.9, 1.8), 75, True),
 ('32_bath', (-0.5, EYE, 1.5), (-2.1, 0.6, 0.3), 85, True),
 ('33_wash', (-0.8, EYE, 4.3), (-2.2, 1.0, 3.3), 85, True),
 ('34_SG300w', (-1.0, EYE, 4.0), (-1.0, 0.9, 2.9), 75, True),
 ('35_corridor', (0.0, EYE, 4.4), (0.0, 1.0, 3.6), 80, True),
 ('36_SG33', (0.2, EYE, 4.0), (-0.6, 0.9, 4.0), 75, True),
 ('37_hall', (-0.1, EYE, 4.7), (-0.9, 0.3, 6.9), 85, True),
 ('38_from_doma', (-0.7, 1.05, 6.9), (-0.7, 0.9, 4.6), 85, True),
 ('39_toilet', (-1.6, EYE, 4.75), (-2.1, 0.5, 6.1), 85, True),
 ('40_SG500', (-0.8, EYE, 4.95), (-1.4, 0.9, 4.95), 75, True),
 ('41_SG11H_corr', (-0.3, EYE, 4.0), (0.4, 1.0, 4.0), 75, True),
 ('42_doma_store', (-0.6, 1.1, 6.8), (-2.2, 0.8, 6.8), 80, False),
]

sc = bpy.context.scene
sc.render.engine = 'BLENDER_WORKBENCH'
sh = sc.display.shading
sh.light = 'STUDIO'
sh.color_type = 'TEXTURE'
sh.show_cavity = True
sh.cavity_type = 'BOTH'
sh.show_object_outline = False
sh.show_shadows = False
sc.render.resolution_x, sc.render.resolution_y = 960, 540
sc.render.image_settings.file_format = 'PNG'
cam = bpy.data.objects.get('CheckCam') or bpy.data.objects.new('CheckCam', bpy.data.cameras.new('CheckCam'))
if cam.name not in sc.collection.objects:
    sc.collection.objects.link(cam)
sc.camera = cam
cam.data.sensor_fit = 'VERTICAL'
cam.data.clip_start = 0.02
cols = bpy.data.collections
def doors(open_):
    cols['doors_open'].hide_render = not open_
    cols['doors_closed'].hide_render = open_
shots = []
for name, eye, tgt, fov, both in VIEWS:
    if ONLY and name not in ONLY:
        continue
    e, t = B(*eye), B(*tgt)
    cam.location = e
    cam.rotation_euler = (t - e).to_track_quat('-Z', 'Y').to_euler()
    cam.data.angle_y = math.radians(fov)
    for st in ((False, True) if both else (False,)):
        doors(st)
        fn = os.path.join(OUTDIR, name + ('_open' if st else '') + '.png')
        sc.render.filepath = fn
        bpy.ops.render.render(write_still=True)
        shots.append(fn)
doors(False)

# 食い込みの点検：家具・建具・階段の頂点が、建物（壁・床・天井の固まり）の面より内側へ何 mm 入っているか（最も近い面の法線で判定。2mm 以上を記録）
def world_mesh(o):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = o.evaluated_get(dg)
    me = ev.to_mesh()
    vs = [o.matrix_world @ v.co for v in me.vertices]
    ps = [list(p.vertices) for p in me.polygons]
    ev.to_mesh_clear()
    return vs, ps
vs, ps = world_mesh(bpy.data.objects['Building'])
bld = BVHTree.FromPolygons(vs, ps)
res = {}
for cn in ('furniture', 'fixtures', 'stairs', 'doors_closed', 'doors_open'):
    for o in cols[cn].objects:
        if o.type != 'MESH':
            continue
        worst, wp = 0, None
        for p in world_mesh(o)[0]:
            q, n, i, dist = bld.find_nearest(p)
            if q is None:
                continue
            d = (p - q).dot(n)
            if d < worst:
                worst, wp = d, p
        if worst < -0.002:
            res[cn + '/' + o.name] = [round(-worst * 1000, 1), [round(wp.x, 3), round(wp.z, 3), round(-wp.y, 3)]]   # 深さ（mm）と、その頂点（three.js の座標）
json.dump({'shots': shots, 'inside_building_mm': res}, open(os.path.join(OUTDIR, 'check.json'), 'w'), ensure_ascii=False, indent=1)
print('INSIDE', len(res))
