# 焼き込みの共通部分：house.blend（build_house.py）に、Cycles の設定・材質（拡散の反射率）・照明・空と太陽・窓のポータル・窓のふさぎを付ける
# 単位：照明は光束（lm）、空・太陽は照度（lux）。Blender ではどちらも ÷683 で W にする（CLAUDE.md 1章「焼き込みの決めごと」）
import bpy, math, os
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
}
# 窓の組：窓の名前の頭（build_house.py の window() の名前）
WINS = {'bed': ['FK2442a', 'FK2442b'], 'study': ['FK2442s'], 'void': ['FF2442E', 'FF2442S'], 'ldk1F': ['FF2020', 'FK2042', 'F8671']}

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
    c.samples = samples; c.use_denoising = False; c.max_bounces = 8; c.diffuse_bounces = 6; c.glossy_bounces = 2
    c.transmission_bounces = 4; c.transparent_max_bounces = 8; c.caustics_reflective = False; c.caustics_refractive = False
    c.sample_clamp_indirect = 1.0
    sc.render.use_persistent_data = True
    # 材質：すべて拡散だけ（反射率＝色）。光る面（MeshBasicMaterial から来た発光）は光らせない。半透明（アクリル板など）は透過のまま
    for m in bpy.data.materials:
        col, alpha = (0.8, 0.8, 0.8, 1), 1.0
        if m.node_tree:
            for n in m.node_tree.nodes:
                if n.type == 'BSDF_PRINCIPLED':
                    col = tuple(n.inputs['Base Color'].default_value); alpha = n.inputs['Alpha'].default_value
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
        for kind, p, lm in ls:
            parts = [((0, 0, 0), 'DISK', 0.07, lm, (p[0], p[1] - 0.0075, p[2]))] if kind == 'down' else \
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
