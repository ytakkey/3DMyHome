# 焼き込みの模型（bake_uv.blend）を、three.js の検証ページ（real/）用に glTF で書き出す
# 使い方：blender -b bake_uv.blend -P tools/blender/export_gltf.py -- <出力の .glb>（run.py gltf）
#  書き出す物：アトラスの物体（A_*。外の面 A_exterior は除く）・扉（L_<ドア>_open／closed）・頂点で焼く物（V_<アトラス>。頂点の番号 _VID 付き）・シェード（S_<アトラス>。動かすための _SHD 付き）・窓のガラス（*_glass）
#  UV：1つ目＝元の柄の UV（UVMap。無い物は 0 の UV を足す）、2つ目＝ライトマップの UV（LM）→ glTF の TEXCOORD_0／TEXCOORD_1（three.js の uv／uv2）
#  材質は元のまま。光る材質（three.js の MeshBasicMaterial から来た物）のうち照明器具の発光面は、近い照明の組のキー（bake_common.LAMPS）を extras の lamp に書く
import bpy, sys, os, json
import numpy as np
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bake_common as bc

out = sys.argv[sys.argv.index('--') + 1]
keep = lambda o: o.type == 'MESH' and ((o.name.startswith('A_') and o.name != 'A_exterior') or o.name.startswith(('L_', 'V_', 'S_')) or o.name.endswith('_glass'))
for o in list(bpy.data.objects):
    if not keep(o):
        bpy.data.objects.remove(o)
# 1.5画素より細い小さな UV の島（丸めた角の三角の扇など。1cm² 未満で、画素の中心が乗らず、余白の値を拾う。3画素まで広げると面取りの帯が内側の見えない面の島に寄って黒くなった）は、形でつながった隣の島の UV に寄せる
# （洗濯機・ソファの丸い角で、細い三角の島が近くの別の面の明るさを拾い、黒い点になっていた。2026-11-03。焼いた画像はそのまま使える）
def snap_tiny(o, lm):
    res = o.get('lm_res'); me = o.data
    if not res:
        return 0
    me.uv_layers.active = me.uv_layers['LM']
    uv = lm.reshape(-1, 2).copy(); sc = abs(o.matrix_world.to_3x3().determinant()) ** (2 / 3)
    lv = np.zeros(len(me.loops), np.int32); me.loops.foreach_get('vertex_index', lv)
    co = np.zeros(len(me.vertices) * 3, np.float32); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    _, pk = np.unique(np.round(co / 1e-4).astype(np.int64), axis=0, return_inverse=True)   # つながりは頂点の位置で（three.js から来た形は三角ごとに頂点が別々）
    lv = pk.ravel()[lv]; co = co[np.unique(pk.ravel(), return_index=True)[1]]
    # 島：同じ位置で同じ UV の角を共有する面のまとまり（頂点の番号で数えると、ばらばらの三角が1枚ずつ島に見える）
    lpo = np.zeros(len(me.loops), np.int64)
    for p in me.polygons:
        lpo[p.loop_start:p.loop_start + p.loop_total] = p.index
    par = np.arange(len(me.polygons))
    def root(i):
        while par[i] != i:
            par[i] = par[par[i]]; i = par[i]
        return i
    first = {}
    for l, k in enumerate(zip(lv.tolist(), np.round(uv[:, 0] * 1e6).astype(np.int64).tolist(), np.round(uv[:, 1] * 1e6).astype(np.int64).tolist())):
        if k in first:
            a, b = root(first[k]), root(lpo[l])
            if a != b:
                par[b] = a
        else:
            first[k] = lpo[l]
    pis = np.array([root(i) for i in range(len(me.polygons))]); tiny = set()
    groups = {}
    for i, k in enumerate(pis.tolist()):
        groups.setdefault(k, []).append(i)
    for k, isl in groups.items():
        li = [l for p in isl for l in me.polygons[p].loop_indices]
        q = uv[li].astype(np.float64) * res; d = q - q.mean(0); w_, v_ = np.linalg.eigh(d.T @ d); t_ = d @ v_[:, 0]
        if t_.max() - t_.min() < 1.5 and sum(me.polygons[p].area for p in isl) * sc < 1e-4:
            tiny.add(k)
    if not tiny:
        return 0
    vgood = {}   # 頂点 → 寄せ先になる島の [(島, ループ)]
    vpoly = {}
    for p in me.polygons:
        for l in p.loop_indices:
            vpoly.setdefault(lv[l], []).append(p.index)
            if pis[p.index] not in tiny:
                vgood.setdefault(lv[l], []).append((pis[p.index], l))
    lpoly = np.zeros(len(me.loops), np.int32)
    for p in me.polygons:
        lpoly[p.loop_start:p.loop_start + p.loop_total] = p.index
    n = 0
    for p in me.polygons:
        if pis[p.index] not in tiny:
            continue
        cand, seen, front = [], {p.index}, [p.index]
        for _ in range(6):   # つながった面をたどって、一番近い（手数の少ない）大きな島のループ
            for q in front:
                for v in lv[me.polygons[q].loop_start:me.polygons[q].loop_start + me.polygons[q].loop_total]:
                    cand += vgood.get(v, [])
            if cand:
                break
            front = list({r for q in front for v in lv[me.polygons[q].loop_start:me.polygons[q].loop_start + me.polygons[q].loop_total] for r in vpoly[v] if r not in seen})
            seen.update(front)
        if not cand:
            continue
        best = max(cand, key=lambda kl: p.normal.dot(me.polygons[lpoly[kl[1]]].normal))[0]   # 向きが一番近い面の島
        tl = np.array([l for k, l in cand if k == best]); tco = co[lv[tl]]
        for l in p.loop_indices:
            uv[l] = uv[tl[np.argmin(((tco - co[lv[l]]) ** 2).sum(1))]]
        n += 1
    lm[:] = uv.ravel()
    return n
ntiny = 0
for o in bpy.data.objects:
    if o.name.startswith('A_') and 'LM' in o.data.uv_layers:
        a = np.zeros(len(o.data.loops) * 2, np.float32); o.data.uv_layers['LM'].data.foreach_get('uv', a)
        k = snap_tiny(o, a)
        if k:
            o.data.uv_layers['LM'].data.foreach_set('uv', a); ntiny += k
print('gltf snapped tiny-island faces', ntiny, flush=True)
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
    if 'plate' in me.attributes:   # 焼くときの板の印（書き出さない）
        me.attributes.remove(me.attributes['plate'])
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
# 玄関ドアの窓（本番 wash.js の entGl）に印：ページでは本番と同じく焼いた明るさを使わず、昼夜で色だけ変える。
# 焼くと、すぐ内側の光を出す面（bake_layers の ent_emit。裏は黒）の陰になり、ガラスがまだらに暗く焼けていた（2026-10-31）
for m in bpy.data.materials:
    if m.node_tree and any(n.type == 'EMISSION' and max(abs(a - b) for a, b in zip(n.inputs['Color'].default_value[:3], (0.738, 0.768, 0.784))) < 0.01 for n in m.node_tree.nodes):
        m['entglass'] = 1; found.pop(m.name, None); print('emit entglass', m.name, flush=True)
for mn, cnt in found.items():
    g = max(cnt, key=cnt.get)
    if g != '-':
        bpy.data.materials[mn]['lamp'] = g
    print('emit', mn, cnt, flush=True)
# ラメの壁紙（本番 common.js の ic5025Mat：テレビの面とトイレのアクセント面）に印：ページでラメの粒の照りを足す（glTF には本番の照りと粒の向きの画像が入らない）。
# テレビの面（x＝0.455 の東向きの面）の材質を探す。トイレのアクセント面は本番で同じ材質なので同じ印になる
lame = {}
for o in bpy.data.objects:
    if o.type != 'MESH':
        continue
    mw = o.matrix_world; nm3 = mw.to_3x3()
    for p in o.data.polygons:
        c = mw @ p.center; n = (nm3 @ p.normal).normalized()
        m = o.data.materials[p.material_index] if p.material_index < len(o.data.materials) else None
        if m and abs(c.x - 0.455) < 0.01 and n.x > 0.9 and 0.5 < c.z < 2.0 and 5.0 < -c.y < 6.5:
            lame[m.name] = lame.get(m.name, 0) + 1
for mn in lame:
    bpy.data.materials[mn]['lame'] = 1
print('emit lame', lame, flush=True)
# つや・照り（1章：ユーザーの指定した所だけ。キッチンとカップボードの天板は付けない＝2026-11-07 ユーザー）に印：本番の Phong の specular・shininess を
# extras の gloss に [r, g, b, shininess] で書く（glTF には照りが入らない）。ページで照明の向きから照りを足す（real/trial.js の glossSpec）
#  テレビの画面（ldk.js：0x07070a・0x555555・90。同じ色の IH のガラストップと分けるため、テレビの面の前の東向きの面だけ）・階段と2階の手すりのアクリル（common.js の acrylMat：0xe8f2f8・0xffffff・90）・
#  真鍮の照明器具（ダイニングのペンダント ldk.js の brass：0x8a7650・0x6b5a3a・40、玄関ホールのブラケット wash.js の BR：0x5b4d41・0x5a4a3a・34）
def lin(v):
    v /= 255.0
    return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
def colof(m):
    if m and m.node_tree:
        for n in m.node_tree.nodes:
            if n.type == 'BSDF_PRINCIPLED':
                return tuple(n.inputs['Base Color'].default_value[:3]), n.inputs['Alpha'].default_value
    return None, 1.0
def same(c, hx):
    t = [(hx >> s) & 255 for s in (16, 8, 0)]
    return c is not None and (max(abs(a - lin(b)) for a, b in zip(c, t)) < 0.0015 or max(abs(a - b / 255) for a, b in zip(c, t)) < 0.0015)   # テレビの枠（0x121212）は画面（0x07070a）と線形で 0.004 しか違わない
def hexv(hx):
    return [((hx >> s) & 255) / 255 for s in (16, 8, 0)]
gloss = {}
for o in bpy.data.objects:
    if o.type != 'MESH':
        continue
    mw = o.matrix_world; nm3 = mw.to_3x3()
    for p in o.data.polygons:
        m = o.data.materials[p.material_index] if p.material_index < len(o.data.materials) else None
        c, al = colof(m)
        if c is None:
            continue
        if same(c, 0x07070a):
            w = mw @ p.center; n = (nm3 @ p.normal).normalized()
            if abs(w.x - 0.5325) < 0.01 and n.x > 0.9:
                gloss[m.name] = hexv(0x555555) + [90, 0]   # 5つ目：昼の窓の光の照りの倍率（テレビの画面・手すりは 0。trial.js の glossSpec）
        elif same(c, 0xe8f2f8) and al < 0.5:
            gloss[m.name] = hexv(0xffffff) + [90, 0]
        elif same(c, 0x8a7650):
            gloss[m.name] = hexv(0x6b5a3a) + [40, 1]
        elif same(c, 0x5b4d41):
            gloss[m.name] = hexv(0x5a4a3a) + [34, 1]
for mn, v in gloss.items():
    bpy.data.materials[mn]['gloss'] = v
print('emit gloss', {k: v[3] for k, v in gloss.items()}, flush=True)
# 頂点の色を使う材質（本番で vertexColors の物＝電気ケトル）に印。ページは印のある材質だけ元の頂点の色を掛ける（glTF の読み込みは色の属性があれば全部の材質で頂点の色を使ってしまう）
for m in bpy.data.materials:
    if m.node_tree and any(n.type in ('VERTEX_COLOR', 'ATTRIBUTE') for n in m.node_tree.nodes):
        m['vcol'] = 1
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
