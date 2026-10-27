# 家全体の焼き込み：光源ごとに、関係するドアの開閉の組み合わせを丸ごと焼く（CLAUDE.md 1章）
# 1) 準備：blender -b house.blend -P tools/blender/bake_layers.py -- prep <bake_uv.blend>
#    部品を「画像の組（アトラス）」にまとめ、ライトマップの UV（LM）を作って保存する。アトラス：部屋（bed・wic・study・hall＝2階廊下と吹抜けの1階天井より上・ldk＝LDK・
#    dress＝脱衣室・wash＝洗面所・ent＝1階廊下と玄関・toilet・bath。分け方は bake_common.room_of）と、開閉できるドアの周り（door_SG311 など。開口の面・枠・扉）。
#    扉は開いた形・閉じた形を別の物体（L_<ドア>_open／closed）にして同じアトラスに入れる
# 2) 焼く：blender -b bake_uv.blend -P tools/blender/bake_layers.py -- bake <出力のフォルダ> [サンプル数] [層の名前,...]
#    出力：<フォルダ>/<層>/<アトラス>.npy（照度 lux、RGB、float16）。光が届かないアトラスは焼かない（ファイルなし＝0）
import bpy, bmesh, math, sys, os, json, time
import numpy as np
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bake_common as bc

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
MODE = argv[0]
TEXEL = 0.02        # よく見る所のライトマップの1画素（m）
COARSE = 0.4        # 天井・下向きの面・高い所は、画素を 1/0.4 倍の大きさに（粗く）
DOORS = ['SG311', 'SG500w', 'SG33s', 'SG300l', 'SG300w', 'BATHD', 'SG33', 'SG11H', 'SG500']   # 開閉できるドア（物の名前の頭で見分ける。同じ頭の長い名前を先に）
DOOR2F = {'SG311', 'SG500w', 'SG33s'}
ADJ = {'SG311': ('bed', 'hall'), 'SG500w': ('bed', 'wic'), 'SG33s': ('bed', 'study'), 'SG300l': ('ldk', 'dress'), 'SG300w': ('dress', 'wash'),
       'BATHD': ('dress', 'bath'), 'SG33': ('wash', 'ent'), 'SG11H': ('ldk', 'ent'), 'SG500': ('ent', 'toilet')}   # ドアがつなぐ部屋（アトラス）

def uv_area(objs):
    t = 0.0
    for o in objs:
        me = o.data; me.calc_loop_triangles()
        uv = np.zeros(len(me.loops) * 2, np.float32); me.uv_layers['LM'].data.foreach_get('uv', uv); uv = uv.reshape(-1, 2)
        tl = np.zeros(len(me.loop_triangles) * 3, np.int32); me.loop_triangles.foreach_get('loops', tl)
        q = uv[tl].reshape(-1, 3, 2)
        t += float(np.nansum(0.5 * np.abs((q[:, 1, 0] - q[:, 0, 0]) * (q[:, 2, 1] - q[:, 0, 1]) - (q[:, 2, 0] - q[:, 0, 0]) * (q[:, 1, 1] - q[:, 0, 1]))))
    return t
room_of = bc.room_of
DOORBOX = {'SG311': (-1.25, 0.40, 2.85, 5.0, 3.48, 3.68), 'SG500w': (0.30, 0.50, 2.85, 5.0, 4.05, 5.65), 'SG33s': (0.30, 1.30, 2.85, 5.0, 6.33, 7.17),   # x0,x1,y0,y1,z0,z1（戸袋も含む）
           'SG300l': (-0.145, 0.03, -0.01, 2.1, 1.4175, 3.0975), 'SG300w': (-2.219, -0.557, -0.01, 2.1, 3.0375, 3.2125), 'BATHD': (-1.435, -0.55, -0.01, 2.1, 1.62, 1.85),
           'SG33': (-0.6, -0.425, -0.01, 2.1, 3.6075, 4.4625), 'SG11H': (0.31, 0.485, -0.01, 2.45, 3.6075, 4.4625), 'SG500': (-1.51, -1.335, -0.01, 2.1, 4.5375, 5.3575)}
DOORZ = {'SG311', 'SG300w', 'BATHD'}   # 東西に走る壁のドア（壁の向きの成分は Blender の y）
VMAX, VSMALL, VFACE = 2.3, 0.3, 0.004   # 頂点で焼く物：一番長い辺が 30cm 以下、または 2.3m 以下で面が40枚以上・面の平均が 40cm² 未満（丸みのある物。ソファは頂点＝縫い目の黒い線が出ない、ベッド 2.4m はライトマップ＝頂点だと日なたの縁がギザギザ）
VEDGE = 0.04                            # 頂点で焼く物は、辺を 4cm 以下に分ける（大きな面の中の明るさの変化を拾う）
def vlit(o, bb):
    dim = max(max(v[i] for v in bb) - min(v[i] for v in bb) for i in range(3))
    if dim <= VSMALL:
        return True
    if dim > VMAX:
        return False
    me = o.data; me.calc_loop_triangles(); mw = o.matrix_world   # 大きさによらず、丸みのある物（面が細かい物）は頂点で（ソファの縫い目のような UV の島の境に黒い線が出ていた。2026-10-25）
    if len(me.polygons) < 40:
        return False
    area = sum(((mw @ me.vertices[t.vertices[1]].co) - (mw @ me.vertices[t.vertices[0]].co)).cross((mw @ me.vertices[t.vertices[2]].co) - (mw @ me.vertices[t.vertices[0]].co)).length / 2 for t in me.loop_triangles)
    return area / len(me.polygons) < VFACE
def subdivide(o, maxlen):
    bm = bmesh.new(); bm.from_mesh(o.data); mw = o.matrix_world
    for _ in range(7):
        long = [e for e in bm.edges if ((mw @ e.verts[0].co) - (mw @ e.verts[1].co)).length > maxlen]
        if not long:
            break
        bmesh.ops.subdivide_edges(bm, edges=long, cuts=1, use_grid_fill=True)
        bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4])
    bm.to_mesh(o.data); bm.free()
def widen_thin(objs, need=3):
    """細い面（ドアの見込み・巾木の上面・丸い角の帯など）の UV の島を、細い向きにだけ広げて画素が need 個以上かかるようにする。
    1画素より細い面は画素の中心が面に乗らず焼けないまま黒くなっていた（2026-10-26）。島の主な向きは UV の点の分布（主成分）で"""
    from bpy_extras.mesh_utils import mesh_linked_uv_islands
    wa = sum(sum(p.area for p in o.data.polygons) * abs(o.matrix_world.to_3x3().determinant()) ** (2 / 3) for o in objs)
    ua = uv_area(objs)
    if ua <= 0:
        return
    k = math.sqrt(wa / ua)   # UV の1 → 実寸（m）
    n = 0
    for o in objs:
        me = o.data; uvl = me.uv_layers['LM'].data
        uv = np.zeros(len(me.loops) * 2, np.float32); uvl.foreach_get('uv', uv); uv = uv.reshape(-1, 2)
        for isl in mesh_linked_uv_islands(me):
            li = np.array([l for pi in isl for l in me.polygons[pi].loop_indices])
            q = uv[li].astype(np.float64); c = q.mean(0); d = q - c
            if len(q) < 3:
                continue
            w, v = np.linalg.eigh(d.T @ d)
            ax = v[:, 0]   # 細い向き
            t = d @ ax; e = (t.max() - t.min()) * k
            if e >= need * TEXEL or e <= 0:
                continue
            sc = min(need * TEXEL / e, 40.0)
            uv[li] = c + d + np.outer(t * (sc - 1), ax)
            n += 1
        uvl.foreach_set('uv', uv.ravel())
    print('uvdbg widened islands', n, flush=True)
def door_of(x, y, z):
    for k, (x0, x1, y0, y1, z0, z1) in DOORBOX.items():
        if x0 <= x <= x1 and y0 <= y <= y1 and z0 <= z <= z1:
            return k
    return None

# ===================== 準備 =====================
def prep(out):
    for cn in ('cut_void', 'keep', 'cut_open'):
        for o in list(bpy.data.collections[cn].objects):
            bpy.data.objects.remove(o)
    for o in list(bpy.data.objects):
        if o.type == 'CAMERA':
            bpy.data.objects.remove(o)
    bld = bpy.data.objects['Building']
    # 吹抜けの壁を1階の天井の高さで切る（下は ldk、上は hall のアトラス）
    bm = bmesh.new(); bm.from_mesh(bld.data)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=Vector((0, 0, 2.4)), plane_no=Vector((0, 0, 1)))
    mats = [m.name for m in bld.data.materials]
    group = {}
    for f in bm.faces:
        mn = mats[f.material_index]
        c = f.calc_center_median() + f.normal * 0.05
        x, y, z = c.x, c.z, -c.y
        if mn == 'exterior':
            g = 'exterior'
        else:
            d = door_of(x, y, z)
            n = f.normal
            if d and mn != 'frame':   # 開口の見込み（壁に直角な面と上の面）も扉のアトラスへ。本番の材質を写すと 'frame' でなくなり、向こうの部屋のアトラスに入って閉じたとき真っ黒だった（2026-10-27）
                wn = abs(n.y) if d in DOORZ else abs(n.x)   # 壁の向きの成分
                fc = f.calc_center_median()
                if wn > 0.1 or n.z > 0.1 or (d == 'SG33s' and fc.x > 0.47):   # 書斎の箱は開いた扉のため奥まであるので、壁の厚さの中だけ
                    d = None
            g = 'door_' + d if d else room_of(x, y, z)
        group.setdefault(g, []).append(f.index)
    bm.to_mesh(bld.data); bm.free()
    # 面の組ごとに別の物体へ分ける
    parts = {}
    for g, idx in group.items():
        me = bld.data.copy(); o = bpy.data.objects.new('B_' + g, me)
        bld.users_collection[0].objects.link(o)
        bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
        keep = set(idx)
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.index not in keep], context='FACES')
        bm.to_mesh(me); bm.free()
        parts[g] = [o]
    bpy.data.objects.remove(bld)
    # ほかの部品（建具・幅木・窓・階段・家具）を物体の中心で振り分ける。扉は開いた形・閉じた形ごと
    # 小さい物・曲面の物は、ライトマップ（1画素2cm）では画素が足りず隣の部品の値がにじむので、頂点ごとの明るさで焼く（2026-10-21 ユーザー了承）：V_<アトラス>
    leaves, vparts = {}, {}
    g1p = bc.B(*bc.LAMPS['g1'][0][1])   # G1（トイレのペンダント）のガラスと電球の材質に印：揺らいだ光の模様は表示で付けるので、まっすぐ届く光はガラスを外して焼く（g1d）
    for o in bpy.data.collections['furniture'].objects:
        if o.type == 'MESH' and (sum((o.matrix_world @ Vector(c) for c in o.bound_box), Vector()) / 8 - g1p).length < 0.1:
            for m in o.data.materials:
                b = m and m.node_tree and next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
                if b and (b.inputs['Alpha'].is_linked or b.inputs['Alpha'].default_value < 0.999):
                    m['g1glass'] = 1
    for cn in ('fixtures', 'stairs', 'furniture', 'doors_open', 'doors_closed'):
        for o in list(bpy.data.collections[cn].objects):
            if o.type != 'MESH' or o.name.endswith('_glass'):   # 窓のガラスはまとめない（焼き込みでは外し、窓の位置からポータルを作る）
                continue
            bb = [o.matrix_world @ Vector(c) for c in o.bound_box]
            c = sum(bb, Vector()) / 8
            x, y, z = c.x, c.z, -c.y
            dk = next((d for d in DOORS if o.name.startswith(d)), None)
            if cn in ('doors_open', 'doors_closed'):
                leaves.setdefault((dk, cn[6:]), []).append(o)
                continue
            g = 'door_' + dk if dk else room_of(x, y, z)
            if vlit(o, bb):
                vparts.setdefault(g, []).append(o)
                continue
            parts.setdefault(g, []).append(o)
    def join(objs, name):
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs:
            o.hide_set(False); o.hide_viewport = False; o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        if len(objs) > 1:
            bpy.ops.object.join()
        o = bpy.context.view_layer.objects.active; o.name = name; o.data.name = name
        return o
    for c in bpy.data.collections:
        c.hide_viewport = False; c.hide_render = False
    for lc in bpy.context.view_layer.layer_collection.children:
        lc.exclude = False; lc.hide_viewport = False
    atlas = {}
    for g, objs in parts.items():
        o = join(objs, 'A_' + g); o['atlas'] = g; atlas.setdefault(g, []).append(o)
    for (dk, st), objs in leaves.items():
        o = join(objs, 'L_%s_%s' % (dk, st)); o['atlas'] = 'door_' + dk; o['door'] = dk; o['state'] = st; atlas['door_' + dk].append(o)
    for g, objs in vparts.items():   # 頂点で焼く物：アトラスごとに1つの物体。焼いた値は点（頂点）ごと、ページでは _VID（頂点の番号）で引く
        o = join(objs, 'V_' + g); o['atlas'] = g; o['vlit'] = 1
        subdivide(o, VEDGE)
        me = o.data
        if 'BAKE' not in me.color_attributes:
            me.color_attributes.new('BAKE', 'FLOAT_COLOR', 'POINT')
        a = me.attributes.new('_VID', 'FLOAT', 'POINT'); a.data.foreach_set('value', np.arange(len(me.vertices), dtype=np.float32))
        print('vlit', g, len(objs), 'objects', len(me.vertices), 'verts', flush=True)
    # ライトマップの UV：アトラスごとに自動で展開し、粗くする面を縮め、1枚に詰める
    info = {}
    for g, objs in atlas.items():
        if g == 'exterior':
            continue
        for o in objs:   # 面積0の面（書斎の家具にあった）は自動展開の値を壊すので消す
            bm = bmesh.new(); bm.from_mesh(o.data)
            bmesh.ops.dissolve_degenerate(bm, dist=1e-6, edges=bm.edges[:])
            bm.to_mesh(o.data); bm.free()
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs:
            if 'LM' not in o.data.uv_layers:
                o.data.uv_layers.new(name='LM')
            o.data.uv_layers.active = o.data.uv_layers['LM']
            o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.0, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
        bpy.ops.object.mode_set(mode='OBJECT')
        for o in objs:   # 壊れた値（NaN）が残っていれば 0 に
            uv = np.zeros(len(o.data.loops) * 2, np.float32); o.data.uv_layers['LM'].data.foreach_get('uv', uv)
            if not np.isfinite(uv).all():
                print('nan uv', o.name, int((~np.isfinite(uv)).sum()), flush=True)
                o.data.uv_layers['LM'].data.foreach_set('uv', np.nan_to_num(uv, nan=0.0, posinf=0.0, neginf=0.0))
        print('uvdbg', g, 'after project', uv_area(objs), flush=True)
        # 自動展開の島は実寸に比例した大きさ（面の大きさをそろえる処理は、面積が0に近い島を極端に大きくして詰め込みが壊れたので使わない）
        area = 0.0
        for o in objs:
            me = o.data; uvl = me.uv_layers['LM'].data; mw = o.matrix_world
            for p in me.polygons:
                n = (mw.to_3x3() @ p.normal).normalized(); c = mw @ p.center
                fl = 2.9 if (g in ('bed', 'wic', 'study', 'hall') or g[5:] in DOOR2F) else 0.0
                coarse = n.z < -0.5 or ((c.z - fl) > 2.0 and n.z > 0.5)   # 天井・下向きの面と、高い所の上向きの面だけ粗く（壁は高い所も細かく：ブラケットの光が四角く出ていた。2026-10-25）
                a = p.area * (COARSE ** 2 if coarse else 1.0)
                area += a
                if coarse:
                    for li in p.loop_indices:
                        uvl[li].uv = uvl[li].uv * COARSE
        res = int(math.ceil(math.sqrt(area / TEXEL ** 2 / 0.6) / 64) * 64); res = max(256, min(2048, res))
        widen_thin(objs)   # 粗くした後で（先に広げると、下向きの面を粗くしたときにまた1画素より細くなり、ほかの島の明るい値で埋まっていた）
        print('uvdbg', g, 'before pack', uv_area(objs), flush=True)
        def uvmax():
            return max(max(max(d.uv.x, d.uv.y) for d in o.data.uv_layers['LM'].data) for o in objs)
        saved = {}
        for o in objs:
            u = np.zeros(len(o.data.loops) * 2, np.float32); o.data.uv_layers['LM'].data.foreach_get('uv', u); saved[o.name] = u
        need = area / TEXEL ** 2   # 狙った細かさで要る画素の数
        for k in range(8):   # 詰めるたびに元の UV に戻す。0〜1 に収まらない・狙った細かさの 6 割に届かないときは画像を大きくする（小さな島が多いと余白が場所を取る）。凹んだ形での詰め込みに失敗したら外形の箱で
            for o in objs:
                o.data.uv_layers['LM'].data.foreach_set('uv', saved[o.name])
            bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.select_all(action='SELECT')
            bpy.ops.uv.pack_islands(rotate=True, margin_method='FRACTION', margin=2 / res, shape_method='CONCAVE' if k < 4 else 'AABB')
            bpy.ops.object.mode_set(mode='OBJECT')
            used = uv_area(objs); um = uvmax()
            print('uvdbg', g, 'pack', res, round(used, 3), round(um, 3), 'texel ratio %.2f' % (used * res * res / need), flush=True)
            if um <= 1.0 and used > 0 and (used * res * res / need > 0.6 or res >= 2048):
                break
            res = min(2048, int(res * 1.3 / 64 + 1) * 64)
        assert 0 < uvmax() <= 1.0, g
        for o in objs:
            o['lm_res'] = res
            o.data.uv_layers.active = o.data.uv_layers[0]   # 表示の柄の UV は元のまま（LM は2つ目以降）
        info[g] = {'res': res, 'area_eff': round(area, 2), 'objects': [o.name for o in objs]}
        print('atlas', g, info[g], flush=True)
    bpy.ops.wm.save_as_mainfile(filepath=out)
    json.dump(info, open(out.replace('.blend', '_atlas.json'), 'w'), indent=1)

# ===================== 焼く =====================
D3 = ['SG311', 'SG500w', 'SG33s']
COMBOS = {'bdl': D3, 'bbr': D3, 'sky_bed': D3, 'sun_bed': D3,
          'j1': ['SG311', 'SG500w'], 'l1': ['SG500w', 'SG311'],
          'k1': ['SG33s'], 'sky_study': ['SG33s'], 'sun_study': ['SG33s'], 'sky_void': ['SG311'],
          'h1': [], 'sun_void': [], 'sky_ldk1F': [], 'sun_ldk1F': [],
          'a1': [], 'a2': [], 'a3': [], 'a4': [], 'a5': [], 'a6': []}   # LDK の照明（2026-10-25 追加。光は 2階廊下・吹抜けと SG311 の周りまで）
HOME = {'g1d': 'toilet', 'bdl': 'bed', 'bbr': 'bed', 'sky_bed': 'bed', 'sun_bed': 'bed', 'j1': 'hall', 'h1': 'hall', 'sky_void': 'hall', 'sun_void': 'hall', 'l1': 'wic',
        'k1': 'study', 'sky_study': 'study', 'sun_study': 'study', 'sky_ldk1F': 'ldk', 'sun_ldk1F': 'ldk', 'a1': 'ldk', 'a2': 'ldk', 'a3': 'ldk', 'a4': 'ldk', 'a5': 'ldk', 'a6': 'ldk',
        'd1': 'wash', 'e1': 'dress', 'sky_dress': 'dress', 'sun_dress': 'dress', 'eh': 'ent', 'b3': 'ent', 'ec': 'ent', 'ek': 'ent', 'g1': 'toilet', 'bath': 'bath'}   # 光源のある部屋
def atlases(src, op):
    """光源と開いたドアの組から、焼くアトラス（光の届く部屋とドアの周り）：光源の部屋から、開いたドア（組み合わせに入れたドアだけ）でつながる部屋。
    LDK と2階廊下（吹抜け）は、光源がどちらかにあるときだけつなぐ（寝室・1階の西側の光は吹抜けの向こうまで焼かない。試作のときと同じ）"""
    h = HOME[src]; A = {h}; todo = [h]
    while todo:
        r = todo.pop()
        nb = [b if a == r else a for d, (a, b) in ADJ.items() if d in op and r in (a, b)]
        if h in ('ldk', 'hall') and r in ('ldk', 'hall'):
            nb.append('hall' if r == 'ldk' else 'ldk')
        for n in nb:
            if n not in A:
                A.add(n); todo.append(n)
    return A | {'door_' + d for d, (r1, r2) in ADJ.items() if r1 in A or r2 in A}
def lname(src, op):
    return src + '@' + ('_'.join(d + ('o' if d in op else 'c') for d in COMBOS[src]) or 'all')
def layers():
    out = []
    for src, ds in COMBOS.items():
        for k in range(2 ** len(ds)):
            op = [d for i, d in enumerate(ds) if k >> i & 1]
            out.append((lname(src, op), src, op))
    return out
# 光源 → 部屋のアトラス → その部屋の明るさに効くドア（粗い焼き込みで測って決めた。bake_rel.json）。書いていない部屋は COMBOS のドア全部
_rp = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'bake_rel.json')
REL = json.load(open(_rp, encoding='utf-8')) if os.path.exists(_rp) else {}
def rel(src, g):
    ds = COMBOS[src]
    if g.startswith('door_'):   # ドアの周り：両側の部屋に効くドアと、そのドア自身
        r1, r2 = ADJ[g[5:]]
        return [d for d in ds if d in rel(src, r1) or d in rel(src, r2) or d == g[5:]]
    r = REL.get(src, {}).get(g)
    return list(ds) if r is None else [d for d in ds if d in r]
def jobs():
    """焼く仕事：{(フォルダ, 光源, 開いたドア): アトラスの組}。アトラスごとに、その明るさに効かないドアは閉じた形にそろえ、同じ形は1回だけ焼く。
    あわせて、すべての組み合わせの名前 → アトラス → フォルダの対応（alias。lm_images.py が index.json に展開する）"""
    J, alias = {}, {}
    for name, src, op in layers():
        al = alias.setdefault(name, {})
        for g in atlases(src, op):
            cfg = [d for d in op if d in rel(src, g)]
            if g not in atlases(src, cfg):
                continue
            fn = lname(src, cfg)
            J.setdefault((fn, src, tuple(cfg)), set()).add(g)
            al[g] = fn
    return J, alias

def vsmooth(o, v, it=2):
    """頂点の値のノイズを、辺でつながった隣の頂点と軽くならす（ライトマップのノイズ除去の代わり）"""
    me = o.data; e = np.empty(len(me.edges) * 2, np.int64); me.edges.foreach_get('vertices', e); e = e.reshape(-1, 2)
    deg = np.bincount(e.ravel(), minlength=len(v)).astype(np.float64)
    for _ in range(it):
        s = np.zeros_like(v); np.add.at(s, e[:, 0], v[e[:, 1]]); np.add.at(s, e[:, 1], v[e[:, 0]])
        v = np.where(deg[:, None] > 0, 0.5 * v + 0.5 * s / np.maximum(deg, 1)[:, None], v)
    return v
def bake_main(outdir, samples, only):
    os.makedirs(outdir, exist_ok=True)
    json.dump(COMBOS, open(os.path.join(outdir, 'combos.json'), 'w'))   # 検証ページが層の名前を作るのに使う（lm_images.py が index.json へ）
    JOBS, alias = jobs()
    json.dump(alias, open(os.path.join(outdir, 'alias.json'), 'w'))
    sc = bc.setup(samples)
    lamps = bc.add_lamps(sc)
    sky = bc.add_sky_sun(sc)
    objs = [o for o in bpy.data.objects if 'atlas' in o and o['atlas'] != 'exterior' and 'vlit' not in o]
    vobjs = [o for o in bpy.data.objects if 'vlit' in o]
    # 頂点で焼く物：焼くときだけ、頂点を面の内側へ 2mm 寄せる（面の端の頂点は床やとなりの部品に接していて、光の線が当たって真っ黒になっていた。
    # 焼いた blend は保存しないので形は変わらない。2026-10-26）
    for o in vobjs:
        me = o.data; co = np.empty(len(me.vertices) * 3); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
        acc = np.zeros_like(co); cnt = np.zeros(len(co))
        for p in me.polygons:
            c = np.array(p.center)
            for v in p.vertices:
                acc[v] += c; cnt[v] += 1
        tgt = acc / np.maximum(cnt, 1)[:, None]; d = tgt - co; L = np.linalg.norm(d, axis=1)
        ks = np.minimum(0.002 / np.maximum(L, 1e-9), 0.3) * (cnt > 0)
        me.vertices.foreach_set('co', (co + d * ks[:, None]).ravel())
    names = sorted({o['atlas'] for o in objs})
    imgs, res = {}, {}
    for g in names:
        r = next(o['lm_res'] for o in objs if o['atlas'] == g)
        res[g] = r; imgs[g] = bpy.data.images.new('LM_' + g, r, r, alpha=False, float_buffer=True)
    # アトラスごとの材質の複製に、焼き込み先の画像を付ける
    for o in objs:
        g = o['atlas']
        o.data.uv_layers.active = o.data.uv_layers['LM']
        for i, m in enumerate(o.data.materials):
            if m is None:
                continue
            nm = m.name + '@' + g
            mc = bpy.data.materials.get(nm) or m.copy()
            mc.name = nm
            if not any(n.type == 'TEX_IMAGE' for n in mc.node_tree.nodes):
                n = mc.node_tree.nodes.new('ShaderNodeTexImage'); n.image = imgs[g]; mc.node_tree.nodes.active = n
            o.data.materials[i] = mc
    # 物体ごとの、UV が覆う画素（範囲の外を周りの値で埋めるとき・ノイズ除去の前に使う）
    cover = {}
    lab = {g: np.full((res[g], res[g]), -1, np.int32) for g in names}   # 画素ごとの UV の島の番号（ならす処理を島の中だけにする）
    from bpy_extras.mesh_utils import mesh_linked_uv_islands
    nisl = 0
    for o in objs:
        r = res[o['atlas']]; me = o.data; me.calc_loop_triangles()
        uv = np.zeros(len(me.loops) * 2, dtype=np.float32); me.uv_layers['LM'].data.foreach_get('uv', uv); uv = uv.reshape(-1, 2) * r
        m = np.zeros((r, r), bool)
        tl = np.zeros(len(me.loop_triangles) * 3, dtype=np.int32); me.loop_triangles.foreach_get('loops', tl)
        pid = np.zeros(len(me.polygons), np.int32)
        for k, isl in enumerate(mesh_linked_uv_islands(me)):
            pid[isl] = nisl + k
        nisl = max(nisl, int(pid.max()) + 1) if len(pid) else nisl
        tp = np.zeros(len(me.loop_triangles), dtype=np.int32); me.loop_triangles.foreach_get('polygon_index', tp)
        L = lab[o['atlas']]
        for ti, tri in enumerate(uv[tl].reshape(-1, 3, 2)):
            lo = np.maximum(np.floor(tri.min(0)).astype(int), 0); hi = np.minimum(np.ceil(tri.max(0)).astype(int), r)
            if hi[0] <= lo[0] or hi[1] <= lo[1]:
                continue
            xs, ys = np.meshgrid(np.arange(lo[0], hi[0]) + 0.5, np.arange(lo[1], hi[1]) + 0.5)
            A, B_, C = tri
            d = lambda P, Q: (Q[0] - P[0]) * (ys - P[1]) - (Q[1] - P[1]) * (xs - P[0])
            w0, w1, w2 = d(B_, C), d(C, A), d(A, B_)
            inside = ((w0 >= 0) & (w1 >= 0) & (w2 >= 0)) | ((w0 <= 0) & (w1 <= 0) & (w2 <= 0))
            m[lo[1]:hi[1], lo[0]:hi[0]] |= inside
            L[lo[1]:hi[1], lo[0]:hi[0]][inside] = pid[tp[ti]]
        for _ in range(2):
            m = m | np.roll(m, 1, 0) | np.roll(m, -1, 0) | np.roll(m, 1, 1) | np.roll(m, -1, 1)
        cover[o.name] = m
    os.makedirs(os.path.join(outdir, '_labels'), exist_ok=True)
    for g in names:
        np.save(os.path.join(outdir, '_labels', g + '.npy'), lab[g])
    for o in vobjs:   # 頂点で焼く物の辺（画像に変えるときに、つながった頂点どうしでならす）
        e = np.empty(len(o.data.edges) * 2, np.int64); o.data.edges.foreach_get('vertices', e)
        np.save(os.path.join(outdir, '_labels', 'V_' + o['atlas'] + '_edges.npy'), e.reshape(-1, 2).astype(np.int32))
    print('atlases', res, flush=True)

    def fill(a, m):   # 押し引き法：範囲の外を、範囲の中の値をなだらかに広げて埋める
        if min(a.shape[:2]) <= 1 or m.all():
            return np.where(m[..., None], a, a[m].mean(0) if m.any() else 0)
        h, w = a.shape[:2]; H, Wd = (h + 1) // 2, (w + 1) // 2
        pa = np.zeros((H * 2, Wd * 2, a.shape[2])); pm = np.zeros((H * 2, Wd * 2)); pa[:h, :w] = a * m[..., None]; pm[:h, :w] = m
        sa = pa.reshape(H, 2, Wd, 2, -1).sum((1, 3)); sm = pm.reshape(H, 2, Wd, 2).sum((1, 3)); c = fill(sa / np.maximum(sm, 1e-9)[..., None], sm > 0)
        up = np.repeat(np.repeat(c, 2, 0), 2, 1)[:h, :w]; return np.where(m[..., None], a, up)
    tmp = os.path.join(outdir, '_dn.exr')
    def denoise(px, r):   # Blender のコンポジターの Denoise（OIDN）。結果は32bitの EXR で受け取る
        src = bpy.data.images.get('DN_IN_%d' % r) or bpy.data.images.new('DN_IN_%d' % r, r, r, alpha=True, float_buffer=True)
        src.pixels.foreach_set(px)
        ng = bpy.data.node_groups.get('DN')
        if not ng:
            ng = bpy.data.node_groups.new('DN', 'CompositorNodeTree')
            ng.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor')
            i = ng.nodes.new('CompositorNodeImage'); i.name = 'IN'; d = ng.nodes.new('CompositorNodeDenoise'); o = ng.nodes.new('NodeGroupOutput')
            ng.links.new(i.outputs['Image'], d.inputs['Image']); ng.links.new(d.outputs['Image'], o.inputs[0])
            try:
                d.prefilter = 'ACCURATE'; d.quality = 'HIGH'
            except Exception:
                pass
            ims = sc.render.image_settings; ims.file_format = 'OPEN_EXR'; ims.color_depth = '32'; ims.exr_codec = 'ZIP'
            if not sc.camera:
                cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
        sc.compositing_node_group = ng
        ng.nodes['IN'].image = src
        sc.render.resolution_x = sc.render.resolution_y = r; sc.render.resolution_percentage = 100
        for ob in sc.objects:
            ob['_hr'] = ob.hide_render; ob.hide_render = True
        sc.render.use_compositing = True; sc.render.use_sequencer = False
        for vl in sc.view_layers:
            vl.use = False
        try:
            bpy.ops.render.render(write_still=False)
        finally:
            for ob in sc.objects:
                ob.hide_render = ob['_hr']
            for vl in sc.view_layers:
                vl.use = True
        bpy.data.images['Render Result'].save_render(tmp, scene=sc)
        im = bpy.data.images.load(tmp, check_existing=False); out = np.empty(r * r * 4, dtype=np.float32); im.pixels.foreach_get(out); bpy.data.images.remove(im)
        return out

    leaves = [o for o in objs if 'door' in o]
    glass = [(n, n.inputs['Alpha'].default_value) for m in bpy.data.materials if m.get('g1glass') for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED']   # G1 のガラスと元の透明度
    def set_doors(op):
        for o in leaves:
            o.hide_render = (o['state'] == 'open') != (o['door'] in op)
    PASS = {'g1': {'INDIRECT'}, 'g1d': {'DIRECT'}}   # G1：反射した光（ガラスあり）と、まっすぐ届く光（ガラスなし。表示で模様を掛ける）に分けて焼く
    def bake(targets, clear, pf):
        bpy.ops.object.select_all(action='DESELECT')
        for o in targets:
            o.select_set(True)
        bpy.context.view_layer.objects.active = targets[0]
        bpy.ops.object.bake(type='DIFFUSE', pass_filter=pf, margin=4, margin_type='EXTEND', use_clear=clear, target='IMAGE_TEXTURES')
    log_path = os.path.join(outdir, 'bake_log.json')
    log = json.load(open(log_path)) if os.path.exists(log_path) else {}
    print('jobs', len(JOBS), 'names', len(alias), flush=True)
    for (name, src, op), A in sorted(JOBS.items()):
        op = list(op)
        if only and name not in only and src not in only:
            continue
        ld = os.path.join(outdir, name)
        if os.path.exists(os.path.join(ld, 'done')) and set(A) <= set(log.get(name, {}).get('atlases', [])):
            continue
        os.makedirs(ld, exist_ok=True)
        t0 = time.time()
        bc.set_source('g1' if src == 'g1d' else src, lamps, sky)
        pf = PASS.get(src, {'DIRECT', 'INDIRECT'})
        for b, a0 in glass:
            b.inputs['Alpha'].default_value = 0.0 if src == 'g1d' else a0
        set_doors(op)
        for g in A:
            imgs[g].pixels.foreach_set(np.zeros(res[g] ** 2 * 4, dtype=np.float32))
        tg = [o for o in objs if o['atlas'] in A and not o.hide_render]
        bake(tg, False, pf)
        vis = {o.name for o in tg}
        # 組み合わせに入れていないドアの周りを焼くとき：扉の開いた形も、そのドアを開けて焼いておく（扉だけ）
        extra = [d for d in DOORS if d not in COMBOS[src] and 'door_' + d in A]
        if extra:
            set_doors(op + extra)
            t2 = [o for o in leaves if o['door'] in extra and o['state'] == 'open']
            bake(t2, False, pf)
            vis |= {o.name for o in t2}
            set_doors(op)
        for g in sorted(A):
            r = res[g]
            px = np.empty(r * r * 4, dtype=np.float32); imgs[g].pixels.foreach_get(px)
            m = np.zeros((r, r), bool)
            for o in objs:
                if o['atlas'] == g and o.name in vis:
                    m |= cover[o.name]
            q = px.reshape(r, r, 4).astype(np.float64)
            q[:, :, :3] = fill(q[:, :, :3], m); q[:, :, 3] = 1
            q = denoise(q.astype(np.float32).ravel(), r).reshape(r, r, 4)
            lux = np.maximum(q[:, :, :3], 0) * math.pi / bc.LM2W   # ならす処理は画像に変えるとき（lm_images.py。島の番号は <出力>/_labels）
            np.save(os.path.join(ld, g + '.npy'), lux.astype(np.float16))
        vt = [o for o in vobjs if o['atlas'] in A]   # 頂点で焼く物
        if vt:
            bpy.ops.object.select_all(action='DESELECT')
            for o in vt:
                o.select_set(True); o.data.color_attributes.active_color = o.data.color_attributes['BAKE']
            bpy.context.view_layer.objects.active = vt[0]
            bpy.ops.object.bake(type='DIFFUSE', pass_filter=pf, target='VERTEX_COLORS', use_clear=True)
            for o in vt:
                me = o.data; n = len(me.vertices); a = np.empty(n * 4, np.float32); me.color_attributes['BAKE'].data.foreach_get('color', a)
                v = np.maximum(a.reshape(-1, 4)[:, :3].astype(np.float64), 0) * math.pi / bc.LM2W
                np.save(os.path.join(ld, 'V_' + o['atlas'] + '.npy'), vsmooth(o, v).astype(np.float32))
        open(os.path.join(ld, 'done'), 'w').write('ok')
        log[name] = {'atlases': sorted(A), 'sec': round(time.time() - t0, 1)}
        json.dump(log, open(log_path, 'w'), indent=1)
        print('baked', name, sorted(A), '%.0fs' % (time.time() - t0), flush=True)
    print('DONE', flush=True)

if MODE == 'prep':
    prep(argv[1])
else:
    bake_main(argv[1], int(argv[2]) if len(argv) > 2 else 2048, set(argv[3].split(',')) if len(argv) > 3 else None)
