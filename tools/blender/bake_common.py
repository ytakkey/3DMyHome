# 焼き込みの共通部分：house.blend（build_house.py）に、Cycles の設定・材質（拡散の反射率）・照明・空と太陽・窓のポータル・窓のふさぎを付ける
# 単位：照明は光束（lm）、空・太陽は照度（lux）。Blender ではどちらも ÷683 で W にする（CLAUDE.md 1章「焼き込みの決めごと」）
import bpy, math, os
import numpy as np
from mathutils import Vector, Matrix

LM2W = 1 / 683
SKY_LUX, SUN_LUX, SUN_AZ, SUN_EL, GROUND = 15000, 70000, 150, 38, 0.2   # 10月の朝10時ごろ・晴れ
B = lambda x, y, z: Vector((x, -z, y))
FL2, H2 = 2.9, 5.3
OX, OZ, BW_, BD_ = -2.2725, 3.6375, 2.6125, 3.5225
W, D = 4.885, 7.16
DL = 440   # RML・RMW・RMN(P1)（LEDフラットランプφ70）の光束。色味違いの型番は色味以外を同じに（F2）

# 照明の組（LS のキー）：器具ごとの [種類, 位置（three.js）, 光束]。ダウンライトは器具の径の円形の面光源（真下向き。書き出した器具の発光板の下面＝天井から6.5mmのすぐ下）、ブラケットは箱の上下の開口の正方形（半分ずつ）
LAMPS = {
 'bdl': [('down', (OX + 1.8, FL2 + 2.4, OZ + dz), DL) for dz in (0.99, 1.8, 2.6)],                     # O1×3 寝室 RML(P1)
 'bbr': [('brk', (OX + 0.045, FL2 + 1.6 + 0.0375, z), 318) for z in (OZ + BD_ - 0.62 - 0.0375, OZ + 0.62 + 0.0375)],   # O2×2 寝室 OB255280LR 318lm
 'j1': [('down', (x, H2, 3.12), DL) for x in (0.99, 3.32)],                                             # J1×2 2階廊下 RML(P1)
 'h1': [('down', (4.43, H2, z), DL) for z in (4.35, 5.51)],                                             # H1×2 階段の上 RMW(P1)
 'l1': [('down', ((0.455 + 2.16) / 2 + 0.12, FL2 + 2.4, (3.6375 + 5.3425) / 2), DL)],                  # L1 ウォークイン RMN(P1)
 'k1': [('down', ((0.455 + 2.16) / 2, FL2 + 2.4, (5.4575 + 7.16) / 2), DL)],                            # K1 書斎 RMW(P1)
 # LDK（js/ldk.js の位置。2026-10-25 追加：夜の LDK が真っ暗だったため）。'aim'：向き（x,y,z）・広がり（度）・発光面の径の円形の面光源、'bulb'：球の点光源（半径）
 'a1': [('down', (x, 2.4, 1.0), DL) for x in (2.63, 3.53, 4.30)],                                       # A1×3 キッチン通路 RMW(P1) 440lm
 'a4': [('down', (1.79, 2.4, z), DL) for z in (5.825 - 0.75, 5.825 + 0.75)],                             # A4×2 リビング RMW(P1)
 'a3': [('aim', (x, 2.3 - 0.006, 2.22), 326, (0, -1, 0), 40, 0.07) for x in (2.75, 3.53)],               # A3×2 下がり天井 SLD1035LLB1 326lm 集光40度
 'a6': [('aim', (0.455 - 0.06 + 0.5, 2.4 - 0.009, z), 320, (0.455 - 0.2 - 0.895, 0.5 - 2.39, 0), 55, 0.074) for z in (5.825 - 0.75, 5.825 + 0.75)],   # A6×2 テレビ前のウォールウォッシャ SLD1310VLB1 320lm（壁へ向けて傾ける）
 'a2': [('aim', (2.275 + 0.0815, 2.45 + d * 0.0345, z - x), 620, (0, d, 0), 62, 0.066) for z in (5.825 - 0.75, 5.825 + 0.75) for x, d in ((-0.07, 1), (0.07, -1))] +
       [('aim', (4.05 - x, 2.45 + d * 0.0345, 7.16 - 0.0815), 620, (0, d, 0), 62, 0.066) for x, d in ((-0.07, 1), (0.07, -1))],   # A2×3 吹抜けの壁付けスポット RSP2W(K1) 1灯620lm（上下に1灯ずつ）
 'a5': [('bulb', (x, 0.70 + 0.75 + 0.0475, 2.12), 350, 0.0475) for x in (1.065, 1.415, 1.765)],           # A5×3 ペンダント OP252618LC＋ボール球Φ95 350lm
 # 1階の西側（js/wash.js・bath.js の位置。2026-10-27 追加）。'disk'：下向きの円形の面光源（直径）
 'd1': [('down', (-1.32, 2.4, (3.1825 + 4.4325) / 2), DL)],                                              # D1 洗面所 RMN(P1)
 'e1': [('disk', (-1.385, 2.4 - 0.15, (1.8175 + 3.0675) / 2), 1520, 0.25)],                              # E1 脱衣室 サーキュライト Mega R（φ250×H150、1520lm。光るのは周りのリング＝下の面の円で代用、仮）
 'eh': [('down', (-0.675, 2.4, z), DL) for z in (5.558, 6.12)],                                           # B2×2 玄関ホール RML(P1)
 'b3': [('bulb', (-0.91, 1.94, 4.727), 350, 0.025)],                                                     # B3 玄関ホールのブラケット OB255205LC＋フィラメント電球 350lm（ページでは eh と一緒に点く）
 'ec': [('down', ((-0.455 + 0.34) / 2, 2.4, 4.03), DL)],                                                # B1 1階廊下 RML(P1)
 'ek': [('down', (-1.637, 2.4, 6.74), DL)],                                                             # F1 土間収納 RML(P1)
 'g1': [('bulb', (-2.1225, 1.632, 6.2525 - 0.3), 312, 0.015)],                                           # G1 トイレのペンダント（クリアミニクリプトン 312lm。ガラスは半透明のまま）
 'bath': [('down', (x, 2.12, 0.05125 + 0.45), DL) for x in (-2.19375 + 0.5, -2.19375 + 1.5)],           # 浴室のダウンライト×2 RMN(P1)
}
# 窓の組：窓の名前の頭（build_house.py の window() の名前）
WINS = {'bed': ['FK2442a', 'FK2442b'], 'study': ['FK2442s'], 'void': ['FF2442E', 'FF2442S'], 'ldk1F': ['FF2020', 'FK2042', 'F8671'], 'dress': ['F4415N']}

def room_of(x, y, z):
    """three.js の座標の点がどの部屋のアトラスか（壁の面は、面から部屋の側へ5cm出た点で判定）。1階の西側は 2026-10-27 追加"""
    if y >= 2.4:
        if z < 3.58 or (x > 2.2175 and z >= 3.58):
            return 'hall'
        if x < 0.3975:
            return 'bed'
        return 'wic' if z < 5.4 else 'study'
    if (z < 3.58 and x > -0.0575) or (z >= 3.58 and x > 0.3975):
        return 'ldk'
    if z < 1.74:
        return 'bath'
    if z < 3.125:
        return 'dress'
    if z < 3.58 or (z < 4.49 and x < -0.5125):
        return 'wash'
    if x < -1.4225 and z < 6.31:
        return 'toilet'
    return 'ent'   # 1階廊下・玄関ホール・土間・土間収納

def setup(samples=128, devices=('HIP', 'CPU')):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    pref = bpy.context.preferences.addons['cycles'].preferences
    pref.compute_device_type = 'HIP'
    pref.get_devices()
    for d in pref.devices:
        d.use = d.type in devices
    sc.cycles.device = 'GPU' if any(d.use and d.type != 'CPU' for d in pref.devices) else 'CPU'
    print('devices', [(d.name, d.type) for d in pref.devices if d.use], sc.cycles.device, flush=True)
    c = sc.cycles
    db = int(os.environ.get('BAKE_BOUNCES', '4'))   # 拡散の反射回数：4回（2026-10-21 ユーザー。比べるときは環境変数で変える）
    c.samples = samples; c.use_denoising = False; c.max_bounces = max(8, db + 2); c.diffuse_bounces = db; c.glossy_bounces = 2
    c.transmission_bounces = 4; c.transparent_max_bounces = 8; c.caustics_reflective = False; c.caustics_refractive = False
    c.sample_clamp_indirect = 1.0
    sc.render.use_persistent_data = True
    # 材質：すべて拡散だけ（反射率＝色）。光る面（MeshBasicMaterial から来た発光）は光らせない。半透明（アクリル板など）は透過のまま
    def mean_rgb(sock, depth=0):
        """色の入力の平均の色（線形）。柄は画像の平均、色×柄（glTF の読み込みの Mix）は掛け算"""
        if not sock.is_linked or depth > 6:
            v = sock.default_value
            return np.array(v[:3] if hasattr(v, '__len__') else (v, v, v), np.float64)
        n = sock.links[0].from_node
        if n.type == 'TEX_IMAGE' and n.image and n.image.size[0]:
            px = np.empty(len(n.image.pixels), dtype=np.float32); n.image.pixels.foreach_get(px)
            mc = px.reshape(-1, 4)[:, :3].astype(np.float64)
            if not n.image.is_float and n.image.colorspace_settings.name == 'sRGB':   # 8bit の画像の画素は sRGB の値なので線形へ
                mc = np.where(mc <= 0.04045, mc / 12.92, ((mc + 0.055) / 1.055) ** 2.4)
            return mc.mean(0)
        if n.type == 'MIX' and n.data_type == 'RGBA':
            a, b = mean_rgb(n.inputs[6], depth + 1), mean_rgb(n.inputs[7], depth + 1)
            f = n.inputs['Factor'].default_value
            return a * (1 - f) + (a * b if n.blend_type == 'MULTIPLY' else b) * f
        if n.type == 'MIX_RGB':
            a, b = mean_rgb(n.inputs[1], depth + 1), mean_rgb(n.inputs[2], depth + 1)
            f = n.inputs[0].default_value
            return a * (1 - f) + (a * b if n.blend_type == 'MULTIPLY' else b) * f
        if n.type == 'RGB':
            return np.array(n.outputs[0].default_value[:3], np.float64)
        return np.array((0.8, 0.8, 0.8))
    def mean_a(sock, depth=0):
        """透明度の入力の平均（柄の画像の透明度×係数。G1 のガラスは柄付きで、つながった値を 1 と読んで光を通さなかった。2026-10-27）"""
        if not sock.is_linked or depth > 6:
            return float(sock.default_value)
        n, fs = sock.links[0].from_node, sock.links[0].from_socket
        if n.type == 'TEX_IMAGE' and fs.name == 'Alpha' and n.image and n.image.size[0]:
            px = np.empty(len(n.image.pixels), dtype=np.float32); n.image.pixels.foreach_get(px)
            return float(px.reshape(-1, 4)[:, 3].mean())
        if n.type == 'MATH' and n.operation == 'MULTIPLY':
            return mean_a(n.inputs[0], depth + 1) * mean_a(n.inputs[1], depth + 1)
        return 1.0
    for m in bpy.data.materials:
        col, alpha = (0.8, 0.8, 0.8, 1), 1.0
        if m.node_tree:
            for n in m.node_tree.nodes:
                if n.type == 'BSDF_PRINCIPLED':
                    bc_ = n.inputs['Base Color']
                    col = tuple(float(c) for c in mean_rgb(bc_)) + (1,); alpha = mean_a(n.inputs['Alpha'])
                    break
                if n.type in ('EMISSION', 'RGB'):
                    col = tuple(n.inputs['Color'].default_value) if n.type == 'EMISSION' else tuple(n.outputs[0].default_value)
        else:
            col = tuple(m.diffuse_color)
        m.use_nodes = True
        nt = m.node_tree; nt.nodes.clear()
        p = nt.nodes.new('ShaderNodeBsdfPrincipled'); o = nt.nodes.new('ShaderNodeOutputMaterial')
        p.inputs['Base Color'].default_value = col; p.inputs['Roughness'].default_value = 0.8; p.inputs['Alpha'].default_value = alpha
        nt.links.new(p.outputs[0], o.inputs[0])
    # 窓のガラスは焼き込みでは外す（光はそのまま通す）
    for o in bpy.data.objects:
        if o.name.endswith('_glass'):
            o.hide_render = True
    return sc

def add_lamps(sc):
    lamps = {}
    for g, ls in LAMPS.items():
        for t in ls:
            kind, p, lm = t[:3]
            if kind == 'bulb':   # 電球：球の点光源
                ld = bpy.data.lights.new('L_' + g, type='POINT'); ld.shadow_soft_size = t[3]; ld.energy = lm * LM2W
                lo = bpy.data.objects.new('lamp_' + g, ld); lo.location = B(*p); sc.collection.objects.link(lo); lamps.setdefault(g, []).append(lo)
                continue
            if kind == 'aim':    # 向きと広がりのある円形の面光源（Blender の面光源は -Z 向き）
                d = B(*t[3]).normalized()
                ld = bpy.data.lights.new('L_' + g, type='AREA'); ld.shape = 'DISK'; ld.size = t[5]; ld.energy = lm * LM2W; ld.spread = math.radians(t[4])
                lo = bpy.data.objects.new('lamp_' + g, ld); lo.location = B(*p); lo.rotation_euler = (-d).to_track_quat('Z', 'Y').to_euler()
                sc.collection.objects.link(lo); lamps.setdefault(g, []).append(lo)
                continue
            parts =[((0, 0, 0), 'DISK', t[3], lm, (p[0], p[1] - 0.0075, p[2]))] if kind == 'disk' else \
                   [((0, 0, 0), 'DISK', 0.07, lm, (p[0], p[1] - 0.0075, p[2]))] if kind == 'down' else \
                    [((math.pi, 0, 0), 'SQUARE', 0.055, lm / 2, (p[0], p[1] + 0.0375, p[2])), ((0, 0, 0), 'SQUARE', 0.055, lm / 2, (p[0], p[1] - 0.0375, p[2]))]
            for rot, shape, size, l, pos in parts:
                ld = bpy.data.lights.new('L_' + g, type='AREA'); ld.shape = shape; ld.size = size; ld.energy = l * LM2W
                lo = bpy.data.objects.new('lamp_' + g, ld); lo.location = B(*pos); lo.rotation_euler = rot
                sc.collection.objects.link(lo); lamps.setdefault(g, []).append(lo)
    return lamps

def window_frames():
    """窓ごとの開口（サッシの枠の名前から）：{名前: (中心, 外向き, u, 幅, 高さ)}（Blender の座標）"""
    out = {}
    for o in bpy.data.objects:
        if not o.name.endswith('_glass'):
            continue
        n = o.name[:-6]
        bb = [o.matrix_world @ Vector(c) for c in o.bound_box]
        lo = Vector((min(v.x for v in bb), min(v.y for v in bb), min(v.z for v in bb))); hi = Vector((max(v.x for v in bb), max(v.y for v in bb), max(v.z for v in bb)))
        c = (lo + hi) / 2; s = hi - lo
        thin = min(range(3), key=lambda i: s[i])
        out[n] = (c, thin, s)
    return out

def add_sky_sun(sc):
    sun = bpy.data.lights.new('sun', type='SUN'); sun.energy = SUN_LUX * LM2W; sun.angle = math.radians(0.53)
    so = bpy.data.objects.new('sun', sun); sc.collection.objects.link(so)
    az, el = math.radians(SUN_AZ), math.radians(SUN_EL)
    so.rotation_euler = Vector((math.sin(az) * math.cos(el), math.cos(az) * math.cos(el), math.sin(el))).to_track_quat('Z', 'Y').to_euler()
    world = bpy.data.worlds.new('W'); sc.world = world; world.use_nodes = True; nt = world.node_tree; nt.nodes.clear()
    L0 = SKY_LUX * LM2W / (math.pi * 7 / 9); Lg = GROUND * (SKY_LUX + SUN_LUX * math.sin(el)) * LM2W / math.pi
    tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Generated'], sep.inputs[0])
    up = nt.nodes.new('ShaderNodeMath'); up.operation = 'MULTIPLY_ADD'; up.inputs[1].default_value = 2 * L0 / 3; up.inputs[2].default_value = L0 / 3; nt.links.new(sep.outputs['Z'], up.inputs[0])
    gt = nt.nodes.new('ShaderNodeMath'); gt.operation = 'GREATER_THAN'; gt.inputs[1].default_value = 0.0; nt.links.new(sep.outputs['Z'], gt.inputs[0])
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'FLOAT'; mix.inputs['A'].default_value = Lg
    nt.links.new(gt.outputs[0], mix.inputs['Factor']); nt.links.new(up.outputs[0], mix.inputs['B'])
    bg = nt.nodes.new('ShaderNodeBackground'); bg.inputs['Color'].default_value = (1, 1, 1, 1); nt.links.new(mix.outputs['Result'], bg.inputs['Strength'])
    wo = nt.nodes.new('ShaderNodeOutputWorld'); nt.links.new(bg.outputs[0], wo.inputs[0])
    # 窓ごとのポータルと、ふさぎ（その窓の光を焼かないときに開口をふさぐ黒い板。サッシの外側）
    black = bpy.data.materials.new('blocker'); black.use_nodes = True; bn = black.node_tree.nodes; bn.clear()
    bo = bn.new('ShaderNodeOutputMaterial'); bh = bn.new('ShaderNodeBsdfDiffuse'); bh.inputs['Color'].default_value = (0, 0, 0, 1); black.node_tree.links.new(bh.outputs[0], bo.inputs[0])
    portals, blockers = {}, {}
    for n, (c, thin, s) in window_frames().items():
        # 外向き：ガラスの中心から、建物の外（部屋の中心から離れる向き）。窓は東西南北の壁だけなので、薄い軸の向きで決める
        ax = Vector((0, 0, 0)); ax[thin] = 1
        out = ax if (c[thin] > (W / 2 if thin == 0 else -D / 2)) else -ax
        u = Vector((0, 0, 1)).cross(out).normalized(); v = Vector((0, 0, 1))
        wdt = s[0] if thin == 1 else s[1]
        ld = bpy.data.lights.new('portal', type='AREA'); ld.shape = 'RECTANGLE'; ld.size = wdt + 0.1; ld.size_y = s[2] + 0.1; ld.cycles.is_portal = True
        po = bpy.data.objects.new('portal_' + n, ld); sc.collection.objects.link(po)
        M = Matrix.Identity(4); M.col[0][:3] = u; M.col[1][:3] = v; M.col[2][:3] = out; M.col[3][:3] = c + out * 0.06; po.matrix_world = M
        bpy.ops.mesh.primitive_plane_add(size=1, location=c + out * 0.03)
        bl = bpy.context.active_object; bl.name = 'block_' + n
        bl.matrix_world = M @ Matrix.Diagonal((wdt + 0.1, s[2] + 0.1, 1, 1)); bl.location = c + out * 0.03
        bl.data.materials.append(black)
        portals[n], blockers[n] = po, bl
    return so, nt, mix, bg, portals, blockers

def set_source(src, lamps, sky):
    """焼く光源を1つだけにする：照明の組のキー、または 'sky_<窓の組>'・'sun_<窓の組>'"""
    so, nt, mix, bg, portals, blockers = sky
    for g, ls in lamps.items():
        for lo in ls:
            lo.hide_render = (g != src)
    kind, _, grp = src.partition('_')
    natural = kind in ('sky', 'sun') and grp in WINS
    so.hide_render = not (natural and kind == 'sun')
    st = bg.inputs['Strength']
    for l in list(st.links):
        nt.links.remove(l)
    if natural and kind == 'sky':
        nt.links.new(mix.outputs['Result'], st)
    else:
        st.default_value = 0.0
    for n in portals:
        mine = natural and any(n.startswith(p) for p in WINS[grp])
        portals[n].hide_render = not mine
        blockers[n].hide_render = mine
