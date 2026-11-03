# 照明1種（既定はブラケット bbr）だけを点けて Cycles で撮る（広がり・傾きを比べる用）
# run.py py tools/blender/brk_render.py <出力.png> [BAKE_BRK_SPREAD=..] [BAKE_BRK_TILT=..]
# 別の照明：LAMP=a2 EYE=x,y,z TGT=x,y,z FOV=60（three.js の座標）、BAKE_A2_SPREAD=..
import bpy, sys, os, math
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bake_common as bc
out = sys.argv[sys.argv.index('--') + 1]
LAMP = os.environ.get('LAMP', 'bbr')
V3 = lambda k, d: tuple(float(v) for v in os.environ.get(k, d).split(','))
sc = bc.setup(256)
lamps = bc.add_lamps(sc)
for g, ls in lamps.items():
    if g != LAMP:
        for o in ls:
            bpy.data.objects.remove(o)
for o in bpy.data.objects:
    if o.type == 'LIGHT' and not o.name.startswith('lamp_' + LAMP):
        o.hide_render = True
sc.world = bpy.data.worlds.new('blk'); sc.world.color = (0, 0, 0)
B = lambda x, y, z: Vector((x, -z, y))
eye, tgt = B(*V3('EYE', '-0.2,4.2,4.9')), B(*V3('TGT', '-2.27,4.5,5.5'))
cd = bpy.data.cameras.new('c'); cd.sensor_fit = 'VERTICAL'; cd.angle = math.radians(float(os.environ.get('FOV', '80')))
co = bpy.data.objects.new('c', cd); sc.collection.objects.link(co); co.location = eye
co.rotation_euler = (tgt - eye).to_track_quat('-Z', 'Y').to_euler(); sc.camera = co
sc.render.engine = 'CYCLES'; sc.cycles.samples = 256; sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = 640, 360
sc.view_settings.view_transform = 'AgX'; sc.view_settings.exposure = float(os.environ.get('EXP', '2'))
sc.render.filepath = out; bpy.ops.render.render(write_still=True)
print('gltf rendered', out, flush=True)
