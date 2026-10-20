# 焼いた光（bake_layers.py の層）を足し合わせて、決まった視点から撮る（確認用）
# 使い方：blender -b bake_uv.blend -P tools/blender/view_baked.py -- <層のフォルダ> <出力のフォルダ> <状態の名前> <層,層,...> [露出]
#  表示＝反射率（材質の色・柄）×照度。照度は lux を露出で割って AgX で見る。光源は使わず、面が自分で光る形で撮る（ノイズなし）
import bpy, sys, os, math
import numpy as np
from mathutils import Vector
argv = sys.argv[sys.argv.index('--') + 1:]
LD, OUT, STATE, LAYERS = argv[0], argv[1], argv[2], argv[3].split(',')
EXPO = float(argv[4]) if len(argv) > 4 else 100.0     # この lux で白（反射率1）が 1.0 の明るさ
os.makedirs(OUT, exist_ok=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'; sc.cycles.samples = 8; sc.cycles.use_denoising = False; sc.cycles.max_bounces = 0
sc.view_settings.view_transform = 'AgX'
sc.render.resolution_x, sc.render.resolution_y = 960, 540
w = bpy.data.worlds.new('B'); sc.world = w; w.color = (0, 0, 0)
objs = [o for o in bpy.data.objects if 'atlas' in o and o['atlas'] != 'exterior']
# ドアの開閉：状態の名前に SG311o などがあれば開
op = [d for d in ('SG311', 'SG500w', 'SG33s') if d + 'o' in STATE]
for o in objs:
    if 'door' in o:
        o.hide_render = (o['state'] == 'open') != (o['door'] in op)
for o in bpy.data.objects:
    if o.name.endswith('_glass'):
        o.hide_render = True
# アトラスごとに層を足した照度の画像
imgs = {}
for g in sorted({o['atlas'] for o in objs}):
    r = next(o['lm_res'] for o in objs if o['atlas'] == g)
    a = np.zeros((r, r, 3), np.float32)
    for L in LAYERS:
        f = os.path.join(LD, L, g + '.npy')
        if os.path.exists(f):
            a += np.load(f).astype(np.float32)
    im = bpy.data.images.new('E_' + g, r, r, alpha=True, float_buffer=True)
    px = np.concatenate([a / EXPO, np.ones((r, r, 1), np.float32)], 2).ravel()
    im.pixels.foreach_set(px); imgs[g] = im
# 材質：放射＝元の色（柄）×照度の画像（LM の UV）
done = {}
for o in objs:
    g = o['atlas']
    for i, m in enumerate(o.data.materials):
        if m is None:
            continue
        key = (m.name, g)
        if key not in done:
            mc = m.copy(); mc.name = m.name + '#' + g
            nt = mc.node_tree
            base = None; alpha = 1.0
            for n in nt.nodes:
                if n.type == 'BSDF_PRINCIPLED':
                    base = n.inputs['Base Color']; alpha = n.inputs['Alpha'].default_value
            col = nt.nodes.new('ShaderNodeRGB'); col.outputs[0].default_value = base.default_value if base else (0.8, 0.8, 0.8, 1)
            src = base.links[0].from_socket if base is not None and base.is_linked else col.outputs[0]
            uv = nt.nodes.new('ShaderNodeUVMap'); uv.uv_map = 'LM'
            tx = nt.nodes.new('ShaderNodeTexImage'); tx.image = imgs[g]; tx.interpolation = 'Linear'; nt.links.new(uv.outputs[0], tx.inputs[0])
            mul = nt.nodes.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs['Factor'].default_value = 1
            nt.links.new(src, mul.inputs['A']); nt.links.new(tx.outputs['Color'], mul.inputs['B'])
            em = nt.nodes.new('ShaderNodeEmission'); nt.links.new(mul.outputs['Result'], em.inputs['Color'])
            out = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
            if alpha < 0.99:
                tr = nt.nodes.new('ShaderNodeBsdfTransparent'); mx = nt.nodes.new('ShaderNodeMixShader'); mx.inputs[0].default_value = alpha
                nt.links.new(tr.outputs[0], mx.inputs[1]); nt.links.new(em.outputs[0], mx.inputs[2]); nt.links.new(mx.outputs[0], out.inputs['Surface'])
            else:
                nt.links.new(em.outputs[0], out.inputs['Surface'])
            done[key] = mc
        o.data.materials[i] = done[key]
B = lambda x, y, z: Vector((x, -z, y))
FL2, EYE = 2.9, 1.2
VIEWS = [('bedroom', (0.1475, FL2 + EYE, 6.9475), (-2.0725, FL2 + 0.85, 3.6375), 85),
         ('bed_to_hall', (-0.5, FL2 + EYE, 5.6), (-0.05, FL2 + 0.9, 3.4), 80),
         ('bed_to_wic_study', (-1.6, FL2 + EYE, 5.4), (0.4, FL2 + 0.9, 5.6), 85),
         ('hall', (4.57, FL2 + EYE, 3.18), (-0.6, FL2 + 1.05, 3.18), 80),
         ('hall_to_bed', (-0.05, FL2 + EYE, 2.85), (-0.05, FL2 + 0.9, 4.5), 80),
         ('wic', (0.65, FL2 + 1.4, 5.15), (2.1, FL2 + 1.0, 3.8), 85),
         ('study', (2.0, FL2 + 1.4, 5.6), (0.7, FL2 + 0.7, 6.9), 85),
         ('living', (3.84, EYE, 6.95), (0.56, 1.05, 3.18), 85)]
cam = bpy.data.objects.new('C', bpy.data.cameras.new('C')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.sensor_fit = 'VERTICAL'; cam.data.clip_start = 0.02
only = set(argv[5].split(',')) if len(argv) > 5 else None
for name, e, t, fov in VIEWS:
    if only and name not in only:
        continue
    e, t = B(*e), B(*t)
    cam.location = e; cam.rotation_euler = (t - e).to_track_quat('-Z', 'Y').to_euler(); cam.data.angle_y = math.radians(fov)
    sc.render.filepath = os.path.join(OUT, STATE + '__' + name + '.png')
    bpy.ops.render.render(write_still=True)
