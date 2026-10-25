# 焼き込みの模型（bake_uv.blend）を、three.js の検証ページ（STG/）用に glTF で書き出す
# 使い方：blender -b bake_uv.blend -P tools/blender/export_gltf.py -- <出力の .glb>（run.py gltf）
#  書き出す物：アトラスの物体（A_*。外の面 A_exterior は除く）・扉（L_<ドア>_open／closed）・頂点で焼く物（V_<アトラス>。頂点の番号 _VID 付き）・窓のガラス（*_glass）
#  UV：1つ目＝元の柄の UV（UVMap。無い物は 0 の UV を足す）、2つ目＝ライトマップの UV（LM）→ glTF の TEXCOORD_0／TEXCOORD_1（three.js の uv／uv2）
#  材質は元のまま。光る材質（three.js の MeshBasicMaterial から来た物）のうち照明器具の発光面は、近い照明の組のキー（bake_common.LAMPS）を extras の lamp に書く
import bpy, sys, os, json
import numpy as np
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bake_common as bc

out = sys.argv[sys.argv.index('--') + 1]
keep = lambda o: o.type == 'MESH' and ((o.name.startswith('A_') and o.name != 'A_exterior') or o.name.startswith(('L_', 'V_')) or o.name.endswith('_glass'))
for o in list(bpy.data.objects):
    if not keep(o):
        bpy.data.objects.remove(o)
# UV の並びをそろえる：[UVMap, LM]
for o in bpy.data.objects:
    me = o.data
    def get(name):
        if name not in me.uv_layers:
            return None
        a = np.zeros(len(me.loops) * 2, np.float32); me.uv_layers[name].data.foreach_get('uv', a); return a
    base, lm = get('UVMap'), get('LM')
    while me.uv_layers:
        me.uv_layers.remove(me.uv_layers[0])
    me.uv_layers.new(name='UVMap').data.foreach_set('uv', base if base is not None else np.zeros(len(me.loops) * 2, np.float32))
    if lm is not None:
        me.uv_layers.new(name='LM').data.foreach_set('uv', lm)
    me.uv_layers.active = me.uv_layers[0]
    if 'BAKE' in me.color_attributes:   # 焼き込み用の色（書き出さない。頂点の番号 _VID は glTF の _VID になる）
        me.color_attributes.remove(me.color_attributes['BAKE'])
# 照明器具の発光面：材質ごとに、面の中心に一番近い照明（30cm 以内）
lamps = [(g, bc.B(*t[1])) for g, ls in bc.LAMPS.items() for t in ls]
bulbs = [(g, bc.B(*t[1]), t[3]) for g, ls in bc.LAMPS.items() for t in ls if t[0] == 'bulb']   # 電球のガラス（光る材質ではない）も、点灯で光らせる
def is_emit(m):
    return m and m.node_tree and any(n.type == 'EMISSION' for n in m.node_tree.nodes)
found = {}
for o in bpy.data.objects:
    me = o.data; mw = o.matrix_world
    for p in me.polygons:
        m = me.materials[p.material_index] if p.material_index < len(me.materials) else None
        c = mw @ p.center
        if not is_emit(m):
            bg = next((g for g, q, rr in bulbs if (c - q).length < rr + 0.01), None)
            if m and bg and any(n.type == 'BSDF_PRINCIPLED' and n.inputs['Alpha'].default_value < 0.99 for n in m.node_tree.nodes):   # 透けるガラスだけ（真鍮の器具は除く）
                found.setdefault(m.name, {}).setdefault(bg, 0); found[m.name][bg] += 1
            continue
        g, d = min(((g, (c - q).length) for g, q in lamps), key=lambda t: t[1])
        found.setdefault(m.name, {}).setdefault(g if d < 0.3 else '-', 0)
        found[m.name][g if d < 0.3 else '-'] += 1
for mn, cnt in found.items():
    g = max(cnt, key=cnt.get)
    if g != '-':
        bpy.data.materials[mn]['lamp'] = g
    print('emit', mn, cnt, flush=True)
# 使われている材質の確認（くり抜きの面の V_* が残っていないか）
used = {}
for o in bpy.data.objects:
    for p in o.data.polygons:
        if p.material_index < len(o.data.materials) and o.data.materials[p.material_index]:
            n = o.data.materials[p.material_index].name
            used[n] = used.get(n, 0) + 1
print('V_ faces', {k: v for k, v in used.items() if k.startswith('V_')}, flush=True)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_extras=True, export_normals=False, export_texcoords=True,
                          export_materials='EXPORT', export_attributes=True, export_cameras=False, export_lights=False, export_apply=False, export_yup=True)
print('gltf', out, os.path.getsize(out), flush=True)
