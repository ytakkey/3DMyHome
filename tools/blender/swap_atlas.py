# アトラスの差し替え：前の bake_uv.blend をもとに、指定したアトラスの物（A_・S_・V_ のうち指定した名前）だけを新しい bake_uv.blend の物に差し替えて保存する
# 使い方：run.py swapatlas <前の .blend> <新しい .blend> <出力の .blend> <物の名前,...>（例 A_ldk,S_ldk）
# なぜ：build（build_house.py）は部品を切る順番が実行ごとに変わり、作り直すとすべてのアトラスの頂点の並びと UV が変わる＝全部の焼き直し（約17時間）になる。
#  家具を1つ直しただけなら、そのアトラスの物だけ新しくすれば、焼き直しはそのアトラスを含む仕事だけで済む（2026-11-09 ソファ：A_ldk・S_ldk、28件・約5.5時間）。
#  差し替えた後は uvcmp.py で、ほかのアトラスが前と同じことを確かめる。材質は前の物の同じ名前に付け替える（.001 の写しを作らない）
import bpy, sys
argv = sys.argv[sys.argv.index('--') + 1:]
OLD, NEW, OUT, SW = argv[0], argv[1], argv[2], argv[3].split(',')
bpy.ops.wm.open_mainfile(filepath=OLD)
cols = {}
for n in SW:
    o = bpy.data.objects[n]
    cols[n] = [c.name for c in o.users_collection]
    print('SWAP old', n, len(o.data.vertices), cols[n], flush=True)
    me = o.data; bpy.data.objects.remove(o); bpy.data.meshes.remove(me)
with bpy.data.libraries.load(NEW, link=False) as (src, dst):
    dst.objects = SW
for o in dst.objects:
    for c in cols[o.name]:
        bpy.data.collections[c].objects.link(o)
    fixed = 0
    for s in o.material_slots:
        m = s.material
        if m and '.' in m.name and m.name.rsplit('.', 1)[1].isdigit() and m.name.rsplit('.', 1)[0] in bpy.data.materials:
            s.material = bpy.data.materials[m.name.rsplit('.', 1)[0]]; fixed += 1
    print('SWAP new', o.name, len(o.data.vertices), [c.name for c in o.users_collection], 'materials remapped', fixed, 'of', len(o.material_slots), flush=True)
for m in list(bpy.data.materials):
    if m.users == 0:
        bpy.data.materials.remove(m)
bad = sorted(o.name for o in bpy.data.objects if '.' in o.name and o.name.rsplit('.', 1)[1].isdigit())
print('SWAP renamed objects', bad, flush=True)
bpy.ops.wm.save_as_mainfile(filepath=OUT)
print('SWAP saved', OUT, flush=True)
