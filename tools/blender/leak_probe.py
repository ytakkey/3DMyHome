# 光漏れの場所を探す：窓をすべてふさいだ状態で空と太陽だけを点け、建物の面を粗く焼いて、部屋ごとに明るい面の位置を出す
# blender -b house.blend -P leak_probe.py -- [部屋,...]（run.py leak）
import bpy, math, sys, os
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bake_common as bc
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ROOMS = argv[0].split(',') if argv else ['bed', 'ent', 'hall', 'ldk']
RES = 1024
sc = bc.setup(32)
lamps = bc.add_lamps(sc)
sky = bc.add_sky_sun(sc)
so, nt, mix, bg, portals, blockers = sky
bc.set_source('a1', lamps, sky)           # 照明はすべて消す・窓はすべてふさぐ
for g, ls in lamps.items():
    for lo in ls:
        lo.hide_render = True
so.hide_render = False                      # 太陽と空だけ
st = bg.inputs['Strength']
for l in list(st.links):
    nt.links.remove(l)
nt.links.new(mix.outputs['Result'], st)
for o in bpy.data.collections['doors_open'].objects:
    o.hide_render = True                   # ドアはすべて閉じる
for o in bpy.data.collections['doors_closed'].objects:
    o.hide_render = False
bld = bpy.data.objects['Building']; me = bld.data
img = bpy.data.images.new('LM', RES, RES, alpha=False, float_buffer=True)
me.uv_layers.new(name='LM'); me.uv_layers.active = me.uv_layers['LM']
bpy.ops.object.select_all(action='DESELECT'); bld.select_set(True); bpy.context.view_layer.objects.active = bld
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.0, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
bpy.ops.uv.select_all(action='SELECT'); bpy.ops.uv.average_islands_scale()
bpy.ops.uv.pack_islands(rotate=True, margin_method='FRACTION', margin=4 / RES)
bpy.ops.object.mode_set(mode='OBJECT')
for m in me.materials:
    n = m.node_tree.nodes.new('ShaderNodeTexImage'); n.image = img; m.node_tree.nodes.active = n
bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT'}, margin=2, use_clear=True, target='IMAGE_TEXTURES')
px = np.empty(RES * RES * 4, np.float32); img.pixels.foreach_get(px); lux = px.reshape(RES, RES, 4)[:, :, :3].mean(2) * math.pi / bc.LM2W
uvl = me.uv_layers['LM'].data
rows = []
for p in me.polygons:
    if me.materials[p.material_index].name == 'exterior':
        continue
    c = p.center; k = bc.room_of(c.x, c.z + 0.05 * p.normal.z, -c.y)
    if k not in ROOMS or p.area < 1e-3:
        continue
    us = np.array([uvl[l].uv[:] for l in p.loop_indices]) * RES; cu = us.mean(0)
    v = float(lux[min(RES - 1, int(cu[1])), min(RES - 1, int(cu[0]))])
    rows.append((v, k, [round(c.x, 2), round(c.z, 2), round(-c.y, 2)], [round(p.normal.x, 2), round(p.normal.z, 2), round(-p.normal.y, 2)], round(p.area, 2)))
rows.sort(reverse=True)
for k in ROOMS:
    print('==', k)
    for r in [r for r in rows if r[1] == k][:12]:
        print('  lux %.1f pos %s n %s area %.2f' % (r[0], r[2], r[3], r[4]))
