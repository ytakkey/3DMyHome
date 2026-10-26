# 試作の範囲（寝室・WIC・書斎・2階廊下・吹抜け・LDK・階段）の建物を Blender で作り、書き出した家具（tools/export）を読み込む
# 使い方：blender -b --factory-startup -P tools/blender/build_house.py -- <furniture.glb> <出力の .blend>
# 寸法は js/common.js の HOUSE と各 js のコメントから（three.js の座標：X＝東・Y＝上・Z＝南、単位 m）。Blender では (x, -z, y)
# 作り方：家全体を囲む固まり（外壁・床・天井の厚みを含む）から、部屋の空間・ドアと窓の穴・引き戸の戸袋をくり抜く（Boolean の Exact）。
# 壁・床・天井は必ず厚みのある1つの固まりになり、角でつながり、面の重なりや空洞が出ない（CLAUDE.md 1章「作り方の決まり」）。
# 試作の範囲の外（1階の脱衣室・洗面所・廊下・玄関・トイレ・浴室、2階の洋室・トイレ・収納）は中身の詰まった固まりのまま。そこへのドアは閉じた扉だけ作る
import bpy, bmesh, math, sys
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
GLB = argv[0] if len(argv) > 0 else ''
OUT = argv[1] if len(argv) > 1 else ''

# ===== 寸法（HOUSE） =====
W, D, H1, FL2, H2 = 4.885, 7.16, 2.4, 2.9, 5.3          # LDK の幅・奥行・1階天井・2階床・吹抜け（2階）の天井
VX, VZ = 2.275, 3.58                                     # 吹抜けの西端・北端
SX0, ZB14 = 3.99, 3.519                                  # 階段の踏板の西端、14段目の段鼻の板の奥の端
TVX, PZ0, PZ1, PX1 = 0.455, 3.5225, 3.6375, 1.37          # リビング西の壁（テレビ面）、仕切り壁（Y4 の壁芯±57.5）
SGZ0, SGZ1 = 2.2675, 3.0675                              # SG300l の開口（Z）
LW, SZ1, CX1 = -0.115, 4.4325, 0.34                      # 脱衣室側の壁の裏・洗面所の南（SG11H の南端）・1階廊下の東
HALLX, HALLZ = -0.47, 2.7275                             # 2階廊下：西の突き当り（仮）・北の壁の面
OX, OZ, BW_, BD_ = -2.2725, 3.6375, 2.6125, 3.5225       # 寝室：北西の室内角・内寸
DOORA, DOORB = 1.8355, 2.6125                            # 寝室の入口 SG311（北の壁、西端からの位置）
WX0, WX1, WZ0, WZ1 = 0.455, 2.16, 3.6375, 5.3425         # ウォークイン
SX0_, SX1_, SZ0_, SZ1_, WINC = 0.455, 2.16, 5.4575, 7.16, 1.715   # 書斎、窓の中心
EXT = 0.20      # 外壁の室内面から外の面まで（仮。図面の外壁の黒い線の太さと、窓の額縁・サッシ・ガラスが収まる厚さから）
SLAB0 = 0.20    # 1階の床の下の厚さ（仮）
ROOF = 0.30     # 2階の天井の上の厚さ（仮）
E = 0.001       # くり抜く形を部屋の側へ少し延ばす量（面が同じ位置に重ならないように）
PK_DOOR, PK_THIN = 0.036, 0.055                          # 引き戸：扉の厚さ・戸袋の部分の薄い壁の厚さ（common.js の PK）

# ===== 色（材質）。仕上げの柄は焼き込みの段階で付ける。ここでは確認の画像のための色 =====
COL = {
 'exterior': 0x8c8c8c, 'frame': 0xfbfbf9, 'casing': 0xfbfbf9, 'door': 0xf6f5f2, 'handle': 0x2a2a2a, 'handle_g': 0x8f8b85, 'handle_k': 0x1a1a1a,
 'frost': 0xdde1e4, 'back': 0xdedcd7, 'sash': 0xfbfbf9, 'reveal_win': 0xf0ede7, 'glass': 0xcfdfec, 'baseboard': 0xfbfbf9,
 'steel': 0x1c1c1c, 'tread': 0xc48c56, 'oak_wall': 0xb4885a, 'woven': 0xc9c2b6, 'wood_ceil': 0xb4885a,
 'floor_oak': 0xb08a5e, 'walnut_top': 0x3f2b1f, 'floor_stone': 0x8c867f, 'floor_walnut': 0x6b4a35,
 'wall_ldk': 0xe8e4dc, 'wall_tv': 0x77736d, 'ceil': 0xf2f1ee, 'wall_bed': 0xeae7e1, 'wall_wic': 0xd4cfc9, 'ceil_wic': 0xa1abb7, 'wall_study': 0x919494,
}
def srgb2lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
MATS = {}
def mat(name):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    h = COL.get(name, 0xff00ff)
    rgb = [srgb2lin(((h >> s) & 255) / 255) for s in (16, 8, 0)]
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (*rgb, 1)
    m.diffuse_color = (*rgb, 1)
    MATS[name] = m
    return m

# ===== 形を作る道具（three.js の座標で指定し、Blender の座標へ） =====
def B(x, y, z):
    return Vector((x, -z, y))
COLS = {}
def col(name, parent=None):
    if name in COLS:
        return COLS[name]
    c = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(c)
    COLS[name] = c
    return c
def obj_from_bm(bm, name, m, c):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    o.data.materials.append(mat(m) if isinstance(m, str) else m)
    col(c).objects.link(o)
    return o
def box(name, x0, x1, y0, y1, z0, z1, m, c):
    """three.js の座標の箱（x0〜x1・y0〜y1・z0〜z1）"""
    x0, x1, y0, y1, z0, z1 = min(x0, x1), max(x0, x1), min(y0, y1), max(y0, y1), min(z0, z1), max(z0, z1)
    bm = bmesh.new()
    v = [bm.verts.new(B(x, y, z)) for x in (x0, x1) for y in (y0, y1) for z in (z0, z1)]
    idx = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    for f in idx:
        bm.faces.new([v[i] for i in f])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj_from_bm(bm, name, m, c)
def prism(name, pts, y0, y1, m, c):
    """平面の多角形（[(x,z)]）を y0〜y1 に押し出した柱"""
    bm = bmesh.new()
    vb = [bm.verts.new(B(x, y0, z)) for x, z in pts]
    vt = [bm.verts.new(B(x, y1, z)) for x, z in pts]
    bm.faces.new(vb)
    bm.faces.new(vt[::-1])
    n = len(pts)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new([vb[i], vb[j], vt[j], vt[i]])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj_from_bm(bm, name, m, c)
def side_prism(name, pts_dy, x0, x1, z_of_d, m, c):
    """縦の断面（[(d,y)]、d は北へ測った距離。z＝z_of_d(d)）を x0〜x1 に押し出した形（ササラ桁など）"""
    bm = bmesh.new()
    va = [bm.verts.new(B(x0, y, z_of_d(d))) for d, y in pts_dy]
    vb = [bm.verts.new(B(x1, y, z_of_d(d))) for d, y in pts_dy]
    bm.faces.new(va)
    bm.faces.new(vb[::-1])
    n = len(pts_dy)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new([va[i], va[j], vb[j], vb[i]])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj_from_bm(bm, name, m, c)
def cyl(name, r, h, center, axis, m, c, seg=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=seg, radius=r, depth=h, location=B(*center))
    o = bpy.context.active_object
    o.name = name
    if axis == 'z':      # three.js の z（南北）向き
        o.rotation_euler = (math.pi / 2, 0, 0)
    elif axis == 'x':
        o.rotation_euler = (0, math.pi / 2, 0)
    for cc in o.users_collection:
        cc.objects.unlink(o)
    col(c).objects.link(o)
    o.data.materials.append(mat(m))
    return o

class Wall:
    """壁の面の座標（common.js の wallGroup と同じ）：u＝壁に沿って、y＝上、w＝部屋の側が＋（壁の中は−）"""
    def __init__(s, ox, oy, oz, ry):
        s.O = (ox, oy, oz)
        s.U = (round(math.cos(ry), 9), -round(math.sin(ry), 9))   # (x, z)
        s.N = (round(math.sin(ry), 9), round(math.cos(ry), 9))
    def p(s, u, y, w):
        return (s.O[0] + u * s.U[0] + w * s.N[0], s.O[1] + y, s.O[2] + u * s.U[1] + w * s.N[1])
    def box(s, name, u0, u1, y0, y1, w0, w1, m, c):
        a, b = s.p(u0, y0, w0), s.p(u1, y1, w1)
        return box(name, a[0], b[0], a[1], b[1], a[2], b[2], m, c)

# ===== 1. くり抜く前の固まり =====
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o)
col('building'); col('cut_void'); col('cut_open'); col('keep'); col('fixtures'); col('stairs'); col('doors_open'); col('doors_closed'); col('furniture')
solid = box('Building', OX - EXT, W + EXT, -SLAB0, H2 + ROOF, -EXT, D + EXT, 'exterior', 'building')

# ===== 2. 部屋の空間（くり抜く）。材質の名前 V_<部屋> は、あとで床・壁・天井に分ける =====
# LDK（1階）：北の押入、西の仕切り壁、テレビ面の壁を除いた形。天井 2400
prism('V_ldk', [(0, 0.5), (1.36, 0.5), (1.36, 0), (W, 0), (W, D), (TVX, D), (TVX, PZ1), (PX1, PZ1), (PX1, PZ0), (0, PZ0)], 0, H1, mat('V_ldk'), 'cut_void')
box('V_void', VX, W, 0, H2, VZ, D, 'V_ldk', 'cut_void')     # 吹抜け（1階の床から2階の天井まで）
prism('V_hall', [(HALLX, HALLZ), (W, HALLZ), (W, VZ + 0.05), (VX, VZ + 0.05), (VX, PZ0), (HALLX, PZ0)], FL2, H2, mat('V_hall'), 'cut_void')   # 2階廊下（南は吹抜けへ少し重ねる）
box('V_bed', OX, OX + BW_, FL2, FL2 + 2.4, OZ, OZ + BD_, 'V_bed', 'cut_void')
box('V_wic', WX0, WX1, FL2, FL2 + 2.4, WZ0, WZ1, 'V_wic', 'cut_void')
box('V_study', SX0_, SX1_, FL2, FL2 + 2.4, SZ0_, SZ1_, 'V_study', 'cut_void')
box('V_nose', SX0, W, FL2 - 0.035, FL2 + 0.05, ZB14, VZ + 0.05, 'V_hall', 'cut_void')   # 14段目の段鼻の板が入る2階の床の切り欠き（深さ35）

# ===== 3. 部屋の中に残す固まり（くり抜いた後に足す） =====
box('K_soffit', 2.15, W + 0.01, 2.3, H1 + 0.01, 1.565, 2.67, 'wood_ceil', 'keep')        # キッチン上の下がり天井（2300、IC-5015 の木目）
box('K_thinwall', 4.04, 4.10, -0.01, H1 + 0.01, -0.01, 0.62, 'wall_ldk', 'keep')          # カップボード横のうす壁（ldk.js 281）
box('K_dropwall', SX0, W + 0.01, H1 - 0.1, H1 + 0.01, VZ - 0.1, VZ, 'wall_ldk', 'keep')    # 階段の上のタレ壁（高さ100、厚さ100）
box('K_wainscot', OX - 0.01, OX + 0.1, FL2 - 0.01, FL2 + 1.0, OZ - 0.01, OZ + BD_ + 0.01, 'oak_wall', 'keep')   # 寝室の西の腰壁（高さ1000、厚さ100）

# ===== 4. ドア・窓 =====
DOOR_GAPS = []    # 幅木を止める所（平面の範囲）
def gap(wl, u0, u1):
    a, b = wl.p(u0, 0, -0.2), wl.p(u1, 0, 0.013)   # 部屋の側は巾木の厚さ（12）まで（5cm にしていたので、隣の直角の壁の巾木の端まで止めて途切れていた。2026-10-26）
    DOOR_GAPS.append((min(a[0], b[0]), max(a[0], b[0]), min(a[2], b[2]), max(a[2], b[2]), a[1]))   # 最後は床の高さ（ほかの階の巾木を止めない）
def cut(wl, name, u0, u1, y0, y1, w0, w1, m='frame'):
    return wl.box('C_' + name, u0, u1, y0, y1, w0, w1, m, 'cut_open')
def casing(wl, name, a, b, h, c='fixtures'):
    """額縁（幅50・厚さ20、部屋の側の面）。a,b は縦枠の中心（穴を25mmずつ狭めた位置）。上枠は左右の外の端まで"""
    wl.box(name + '_casA', a - 0.025, a + 0.025, 0, h - 0.025, 0, 0.02, 'casing', c)
    wl.box(name + '_casB', b - 0.025, b + 0.025, 0, h - 0.025, 0, 0.02, 'casing', c)
    wl.box(name + '_casT', a - 0.025, b + 0.025, h - 0.025, h + 0.025, 0, 0.02, 'casing', c)

def door_slide(name, wl, a, b, h, T, R, through=True, state='both'):
    """インセットの引き戸（common.js の addToggleDoor 'slide'）。a,b：壁の穴、R：引く向き（＋1＝b 側、−1＝a 側）
    扉（厚さ36）は部屋の側の面から2mm奥を走る。戸袋は部屋の側の面から深さ T−55 のへこみ"""
    a1, b1 = a + 0.025, b - 0.025
    w = b1 - a1
    DP = T - PK_THIN
    mo = b1 if R > 0 else a1
    pe = mo + R * w
    c0, c1 = min(a1, pe) - 0.025, max(b1, pe) + 0.025      # 額縁の外の端
    zf, zb = -0.002, -0.002 - PK_DOOR                       # 扉の表・裏
    cut(wl, name + '_open', a1, b1, -E, h, (-T - E) if through else zb, E)        # 開口（閉じた扉の奥まで。向こうの部屋が試作の範囲の外のときは扉の裏まで）
    pu0, pu1 = (b1, pe + 0.025) if R > 0 else (pe - 0.025, a1)
    cut(wl, name + '_pocket', pu0, pu1, -E, h, -DP, E, m=wl.room)                 # 戸袋（へこんだ壁。クロス貼り）
    wl.box(name + '_pbb', pu0 + (0 if R > 0 else 0.005), pu1 - (0.005 if R > 0 else 0), 0, 0.06, -DP, -DP + 0.012, 'baseboard', 'fixtures')   # 戸袋の幅木（奥の端の見込みの手前まで）
    wl.box(name + '_pend', (pu1 - 0.005) if R > 0 else pu0, pu1 if R > 0 else (pu0 + 0.005), 0, h, -DP, 0, 'frame', 'fixtures')   # 戸袋の奥の端の見込み（厚さ5。開けた扉の先の端と額縁の外の端の間。js は8mmで開けた扉と重なっていた）
    if through:   # 開口の戸袋側の見込み（厚さ8）：反対側の面から扉の裏まで。閉じたとき扉の裏から戸袋へ光が回らない（common.js と同じ）
        wl.box(name + '_jamb', mo - R * 0.008, mo, 0, h, -T, zb, 'frame', 'fixtures')
    casing(wl, name, c0 + 0.025, c1 - 0.025, h)
    gap(wl, c0, c1)
    def leaf(cname, u0):   # u0：戸先の位置
        u1 = u0 + R * (w + 0.02)
        wl.box(name + '_leaf', u0, u1, 0, h, zb, zf, 'door', cname)
        hx = u0 + R * 0.07
        wl.box(name + '_hdlF', hx - 0.0125, hx + 0.0125, 0.92, 1.08, zf, zf + 0.01, 'handle', cname)
        if through:
            wl.box(name + '_hdlB', hx - 0.0125, hx + 0.0125, 0.92, 1.08, zb - 0.01, zb, 'handle', cname)
    u0 = a1 if R > 0 else b1
    if state in ('both', 'closed'):
        leaf('doors_closed' if state == 'both' else 'fixtures', u0)
    if state == 'both':
        leaf('doors_open', u0 + R * w)

def door_outset(name, wl, a, b, h, T, R):
    """アウトセットの引き戸（SG500w）：扉は部屋の側の壁の面の外を、上のレールに吊られて走る"""
    a1, b1 = a + 0.025, b - 0.025
    w = b1 - a1
    ov = 0.02
    cut(wl, name + '_open', a1, b1, -E, h, -T - E, E)
    c0, c1 = min(a1 - ov, a1 - ov + R * w), max(b1 + ov, b1 + ov + R * w)
    wl.box(name + '_rail', c0 - 0.015, c1 + 0.015, h + 0.012, h + 0.062, 0, 0.05, 'casing', 'fixtures')
    gap(wl, c0, c1)   # 幅木は扉の動く範囲では付けない（開けた扉が幅木に当たるため）
    def leaf(cname, u0):
        wl.box(name + '_leaf', u0, u0 + R * (w + 2 * ov), 0, h + 0.012, 0, PK_DOOR, 'door', cname)
        hx = u0 + R * 0.07
        wl.box(name + '_hdlF', hx - 0.0125, hx + 0.0125, 0.92, 1.08, PK_DOOR, PK_DOOR + 0.01, 'handle', cname)
    u0 = a1 - ov if R > 0 else b1 + ov
    leaf('doors_closed', u0)
    leaf('doors_open', u0 + R * w)

def door_swing(name, wl, a, b, h, T, hingeA):
    """開き戸（SG33s）：額縁は部屋の側、閉じた扉は面から12.5〜47.5mm奥。開くと部屋の側へ90°"""
    a1, b1 = a + 0.025, b - 0.025
    cut(wl, name + '_open', a1, b1, -E, h, -T - E, E)
    casing(wl, name, a1, b1, h)
    gap(wl, a, b)
    wl.box(name + '_leaf', a1, b1, 0, h, -0.0475, -0.0125, 'door', 'doors_closed')
    hk = b1 - 0.105 if hingeA else a1 + 0.105       # レバー（戸先寄り）
    for k in (-1, 1):
        wl.box(name + '_lev%d' % k, hk - 0.06, hk + 0.06, 0.99, 1.01, -0.03 + k * 0.0325 - 0.015, -0.03 + k * 0.0325 + 0.015, 'handle_g', 'doors_closed')
    lw = b1 - a1 - 0.01
    n0 = a1 + 0.0225 if hingeA else b1 - 0.0225    # 開いた扉の中心（吊元の枠から22.5mm）
    wl.box(name + '_leafO', n0 - 0.0175, n0 + 0.0175, 0, h - 0.01, 0.025, 0.025 + lw, 'door', 'doors_open')

def door_hinged_closed(name, wl, a, b, h, n, fold=False):
    """試作の範囲の外の部屋への開き戸・折れ戸（閉じたまま）：開口は扉の裏までのへこみ"""
    a1, b1 = a + 0.025, b - 0.025
    t0, t1 = (-0.045, -0.015) if fold else (-0.0475, -0.0125)
    cut(wl, name + '_open', a1, b1, -E, h, t0, E)
    casing(wl, name, a1, b1, h)
    gap(wl, a, b)
    if fold:
        pw = (b1 - a1)
        for i, (p0, p1) in enumerate(((a1, a1 + pw / 2), (a1 + pw / 2, b1))):
            wl.box(name + '_leaf%d' % i, p0, p1, 0, h, t0, t1, 'door', 'fixtures')
        kx = (a1 + b1) / 2 - 0.06
        k = wl.p(kx, 1.0, t1 + 0.01)
        cyl(name + '_knob', 0.017, 0.02, k, 'x' if abs(wl.N[0]) > 0.5 else 'z', 'handle_g', 'fixtures', 20)
        return
    pw = (b1 - a1) / n
    for i in range(n):
        wl.box(name + '_leaf%d' % i, a1 + pw * i, a1 + pw * (i + 1), 0, h, t0, t1, 'door', 'fixtures')
    if n == 1:
        wl.box(name + '_hdl', b1 - 0.18, b1 - 0.06, 0.99, 1.01, t1, t1 + 0.015, 'handle_g', 'fixtures')
    else:
        for k in (-1, 1):
            m = (a1 + b1) / 2 + k * 0.045
            wl.box(name + '_hdl%d' % k, m - 0.0075, m + 0.0075, 0.875, 1.125, t1, t1 + 0.0125, 'handle_g', 'fixtures')

def door_high_closed(name, wl, a, b, h):
    """ハイドア SG11H（閉じたまま。リビング側から見た形）：天井までの枠、中央に縦長の型板ガラス、黒い角型の引手"""
    t0 = -0.0475
    cut(wl, name + '_open', a, b, -E, h + 0.03, t0, E)
    gap(wl, a, b)
    wl.box(name + '_frA', a, a + 0.035, 0, h + 0.03, t0, 0.02, 'frame', 'fixtures')
    wl.box(name + '_frB', b - 0.035, b, 0, h + 0.03, t0, 0.02, 'frame', 'fixtures')
    wl.box(name + '_frT', a + 0.035, b - 0.035, h - 0.015, h + 0.03, t0, 0.02, 'frame', 'fixtures')
    a1, b1 = a + 0.035, b - 0.035
    w = b1 - a1
    gw = w * 0.22
    pw = (w - gw) / 2
    hh = h - 0.015
    wl.box(name + '_lfA', a1, a1 + pw, 0, hh, t0, -0.0125, 'door', 'fixtures')
    wl.box(name + '_lfB', b1 - pw, b1, 0, hh, t0, -0.0125, 'door', 'fixtures')
    wl.box(name + '_lfG', a1 + pw, b1 - pw, 0.04, hh - 0.04, t0, -0.0125, 'frost', 'fixtures')
    wl.box(name + '_lfGb', a1 + pw, b1 - pw, 0, 0.04, t0, -0.0125, 'door', 'fixtures')
    wl.box(name + '_lfGt', a1 + pw, b1 - pw, hh - 0.04, hh, t0, -0.0125, 'door', 'fixtures')
    wl.box(name + '_hdl', a1 + 0.0425, a1 + 0.0775, 0.9825, 1.0175, -0.0125, -0.0005, 'handle_k', 'fixtures')

def window(name, wl, a, b, y1, y2, panes=1):
    """窓：額縁（幅20、穴の内側）の内側を外まで抜く。サッシの枠は額縁の内側、ガラスは室内の面から150"""
    w = b - a
    cut(wl, name + '_open', a + 0.02, b - 0.02, y1 + 0.02, y2 - 0.02, -EXT - 0.05, E, m='reveal_win')
    gap_low = y1 < 0.3
    if gap_low:
        gap(wl, a, b)
    um = (a + b) / 2
    wl.box(name + '_sB', a + 0.02, b - 0.02, y1 + 0.02, y1 + 0.05, -0.145, -0.115, 'sash', 'fixtures')
    wl.box(name + '_sT', a + 0.02, b - 0.02, y2 - 0.05, y2 - 0.02, -0.145, -0.115, 'sash', 'fixtures')
    wl.box(name + '_sL', a + 0.02, a + 0.05, y1 + 0.05, y2 - 0.05, -0.145, -0.115, 'sash', 'fixtures')
    wl.box(name + '_sR', b - 0.05, b - 0.02, y1 + 0.05, y2 - 0.05, -0.145, -0.115, 'sash', 'fixtures')
    for k in range(1, panes):
        c = a + w * k / panes
        z = -0.12 - 0.01 * (k % 2)
        wl.box(name + '_m%d' % k, c - 0.03, c + 0.03, y1 + 0.05, y2 - 0.05, z - 0.02, z + 0.02, 'sash', 'fixtures')
    wl.box(name + '_glass', a + 0.05, b - 0.05, y1 + 0.05, y2 - 0.05, -0.152, -0.148, 'glass', 'fixtures')

# --- 1階 LDK ---
wN = Wall(0, 0, 0, 0); wN.room = 'V_ldk'
window('FF2020a', wN, 2.50, 3.10, 1.541, 2.141); window('FF2020b', wN, 3.15, 3.75, 1.541, 2.141)
wE = Wall(W, 0, 0, -math.pi / 2); wE.room = 'V_ldk'
window('FK2042', wE, 0.615, 1.215, 0.969, 2.144)
for i, c in enumerate((4.13, 4.97, 5.81)):
    window('FF2442E%d' % i, wE, c - 0.3715, c + 0.3715, FL2 + 0.969, FL2 + 2.144)
wS = Wall(W, 0, D, math.pi); wS.room = 'V_ldk'
window('F8671', wS, 0.9615, 3.4485, 0.02, 2.194, panes=3)
for i, c in enumerate((2.195, 1.355)):
    window('FF2442S%d' % i, wS, c - 0.3715, c + 0.3715, FL2 + 0.969, FL2 + 2.144)
wW = Wall(0, 0, PZ0, math.pi / 2); wW.room = 'V_ldk'
door_slide('SG300l', wW, PZ0 - SGZ1, PZ0 - SGZ0, 2.0, -LW, 1, through=False, state='closed')   # 脱衣室との引き戸（脱衣室は範囲の外。閉じたまま）
wTV = Wall(TVX, 0, SZ1, math.pi / 2); wTV.room = 'V_ldk'
door_high_closed('SG11H', wTV, 0, SZ1 - PZ1, H1 - 0.03)                                           # 1階廊下とのハイドア（廊下は範囲の外。閉じたまま）
wOS = Wall(0, 0, 0.5, 0); wOS.room = 'V_ldk'
door_hinged_closed('oshiire', wOS, 0.04, 1.2, 2.0, 2)                                            # 押入（2枚扉の観音開き）
# --- 2階廊下 ---
wHN = Wall(HALLX, FL2, HALLZ, 0); wHN.room = 'V_hall'
door_hinged_closed('room2A', wHN, 0.033, 0.81, 2.0, 1)                                           # 洋室2-A
door_hinged_closed('room2B', wHN, W - HALLX - 0.78, W - HALLX, 2.0, 1)                           # 洋室(2)
casing(wHN, 'toilet2F', 1.83 + 0.025, 2.63 - 0.025, 2.0)                                         # 2階トイレの SG300（扉はトイレ側。閉じたまま）
cut(wHN, 'toilet2F_open', 1.83 + 0.025, 2.63 - 0.025, -E, 2.0, -0.113, E)
wHN.box('toilet2F_leaf', 1.83 + 0.025, 2.63 - 0.025, 0, 2.0, -0.113, -0.077, 'door', 'fixtures')
gap(wHN, 1.83, 2.63)
wHW = Wall(HALLX, FL2, PZ0, math.pi / 2); wHW.room = 'V_hall'
door_hinged_closed('closet2F', wHW, 0, PZ0 - HALLZ, 2.0, 1, fold=True)   # 収納の2枚折れ戸。開口は廊下の幅いっぱい（仮。js の 0.03〜0.82（吹抜けの北端から）は廊下の幅795より広い790を南へ寄せていて、南の壁に27.5mm埋まっていた）
wHS = Wall(VX, FL2, PZ0, math.pi); wHS.room = 'V_hall'
casing(wHS, 'SG311h', VX - (OX + DOORB) + 0.025, VX - (OX + DOORA) - 0.025, 2.0)                 # SG311 の廊下側の額縁
gap(wHS, VX - (OX + DOORB), VX - (OX + DOORA))
# --- 寝室 ---
wBN = Wall(OX, FL2, OZ, 0); wBN.room = 'V_bed'
door_slide('SG311', wBN, DOORA, DOORB, 2.0, OZ - PZ0, -1)                                        # 廊下との引き戸（西へ引いて開ける）
wBE = Wall(OX + BW_, FL2, OZ, -math.pi / 2); wBE.room = 'V_bed'
WC = (WZ0 + WZ1) / 2 - OZ
door_outset('SG500w', wBE, WC - 0.38, WC + 0.38, 2.0, WX0 - OX - BW_, 1)                        # ウォークインとの引き戸（南へ引く）
casing(wBE, 'SG33s_b', BD_ - 0.795 + 0.025, BD_ - 0.025, 2.0)                                     # 書斎の SG33 の寝室側の額縁
gap(wBE, BD_ - 0.795, BD_)
wBS = Wall(OX + BW_, FL2, OZ + BD_, math.pi); wBS.room = 'V_bed'
window('FK2442a', wBS, 0.9215, 1.6645, 0.969, 2.144); window('FK2442b', wBS, 0.1215, 0.8645, 0.969, 2.144)
# --- ウォークイン・書斎 ---
wWW = Wall(WX0, FL2, WZ1, math.pi / 2); wWW.room = 'V_wic'
casing(wWW, 'SG500w_w', (WZ1 - WZ0) / 2 - 0.38 + 0.025, (WZ1 - WZ0) / 2 + 0.38 - 0.025, 2.0)
gap(wWW, (WZ1 - WZ0) / 2 - 0.38, (WZ1 - WZ0) / 2 + 0.38)
wSW = Wall(SX0_, FL2, SZ1_, math.pi / 2); wSW.room = 'V_study'
door_swing('SG33s', wSW, 0, 0.795, 2.0, WX0 - OX - BW_, True)                                    # 南側吊元で書斎側へ開く
wSS = Wall(SX1_, FL2, SZ1_, math.pi); wSS.room = 'V_study'
window('FK2442s', wSS, SX1_ - WINC - 0.3715, SX1_ - WINC + 0.3715, 0.969, 2.144)

# ===== 5. Boolean：くり抜く → 残す固まりを足す → 開口をくり抜く =====
def boolean(target, coll, op):
    md = target.modifiers.new('b', 'BOOLEAN')
    md.operation = op
    md.solver = 'EXACT'
    md.operand_type = 'COLLECTION'
    md.collection = COLS[coll]
    md.use_self = True
    md.use_hole_tolerant = True
    try:
        md.material_mode = 'TRANSFER'
    except Exception:
        pass
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.modifier_apply(modifier=md.name)
boolean(solid, 'cut_void', 'DIFFERENCE')
boolean(solid, 'keep', 'UNION')
boolean(solid, 'cut_open', 'DIFFERENCE')
for cn in ('cut_void', 'keep', 'cut_open'):
    COLS[cn].hide_render = True
    bpy.context.view_layer.layer_collection.children[cn].exclude = True

# ===== 6. 面の材質：部屋ごとに、上向き＝床・下向き＝天井・それ以外＝壁 =====
ROOMS = {'V_ldk': ('floor_oak', 'wall_ldk', 'ceil'), 'V_hall': ('floor_walnut', 'wall_ldk', 'ceil'), 'V_bed': ('floor_walnut', 'wall_bed', 'ceil'),
         'V_wic': ('floor_walnut', 'wall_wic', 'ceil_wic'), 'V_study': ('floor_walnut', 'wall_study', 'wall_study')}
me = solid.data
bm = bmesh.new(); bm.from_mesh(me)
# キッチンの石目の床（東の壁から3マス×北の壁から2マス）の境で床を切る
for co, no in (((2.155, 0, 0), (1, 0, 0)), ((0, 0, 1.76), (0, 0, 1))):
    fl = [f for f in bm.faces if f.normal.z > 0.9 and abs(f.calc_center_median().z) < 0.01]
    geom = list({v for f in fl for v in f.verts}) + list({e for f in fl for e in f.edges}) + fl
    bmesh.ops.bisect_plane(bm, geom=geom, plane_co=B(*co), plane_no=Vector((no[0], -no[2], no[1])))
slot = {m.name: i for i, m in enumerate(me.materials)}
def sl(name):
    if name not in slot:
        me.materials.append(mat(name)); slot[name] = len(me.materials) - 1
    return slot[name]
for f in bm.faces:
    mn = me.materials[f.material_index].name
    if mn not in ROOMS:
        continue
    c = f.calc_center_median()
    x, y, z = c.x, c.z, -c.y          # three.js の座標
    fl_, wa, ce = ROOMS[mn]
    if f.normal.z > 0.9:
        k = 'floor_stone' if (mn == 'V_ldk' and y < 0.01 and x > 2.155 and z < 1.76) else fl_
    elif f.normal.z < -0.9:
        k = ce
    else:
        k = wa
        if mn == 'V_ldk' and abs(x - TVX) < 0.002 and z > SZ1 and y < H1:
            k = 'wall_tv'                                        # リビング西のアクセント面（IC-5025）
        if mn == 'V_bed' and abs(x - OX) < 0.002 and y > FL2 + 1.0:
            k = 'woven'                                          # 寝室西のアクセント面（IC-2003）
    f.material_index = sl(k)
bm.to_mesh(me); bm.free()
print('BUILDING faces', len(me.polygons), 'materials', [m.name for m in me.materials])

# ===== 7. 幅木（高さ60・厚さ12。部屋の外まわりに沿って、ドアと床からの窓の所で止める。入隅は突き付け、出隅は回り込む） =====
def baseboards(room, pts, skip_edges, y0):
    n = len(pts)
    def turn(i):   # 頂点 i の曲がり：正＝入隅（平面を上から見て右回り）
        p0, p1, p2 = pts[i - 1], pts[i], pts[(i + 1) % n]
        d1 = (p1[0] - p0[0], p1[1] - p0[1]); d2 = (p2[0] - p1[0], p2[1] - p1[1])
        return d1[0] * d2[1] - d1[1] * d2[0]
    for i in range(n):
        if i in skip_edges:
            continue
        s, e = pts[i], pts[(i + 1) % n]
        L = math.hypot(e[0] - s[0], e[1] - s[1])
        d = ((e[0] - s[0]) / L, (e[1] - s[1]) / L)
        nrm = (-d[1], d[0])                       # 部屋の側
        t0 = 0.012 if turn(i) > 0 else 0.0       # 始まり：入隅は前の幅木に突き付け
        t1 = L + (0.012 if turn((i + 1) % n) < 0 else 0.0)   # 終わり：出隅は回り込む
        ivs = []
        for gx0, gx1, gz0, gz1, gy in DOOR_GAPS:      # ドアの所を除く（同じ階のだけ。2階のドアが同じ線の上にある1階のテレビの壁の巾木を止めていた）
            if abs(gy - y0) > 0.5:
                continue
            corners = [(gx0, gz0), (gx1, gz0), (gx0, gz1), (gx1, gz1)]
            ws = [(cx - s[0]) * nrm[0] + (cz - s[1]) * nrm[1] for cx, cz in corners]
            if max(ws) < -0.001 or min(ws) > 0.013:
                continue
            us = [(cx - s[0]) * d[0] + (cz - s[1]) * d[1] for cx, cz in corners]
            ivs.append((min(us), max(us)))
        segs = [(t0, t1)]
        for g0, g1 in ivs:
            segs = [q for a, b in segs for q in ((a, min(b, g0)), (max(a, g1), b)) if q[1] - q[0] > 0.005]
        for k, (a, b) in enumerate(segs):
            p = [(s[0] + d[0] * u + nrm[0] * w, s[1] + d[1] * u + nrm[1] * w) for u in (a, b) for w in (0, 0.012)]
            xs = [q[0] for q in p]; zs = [q[1] for q in p]
            box('bb_%s_%d_%d' % (room, i, k), min(xs), max(xs), y0, y0 + 0.06, min(zs), max(zs), 'baseboard', 'fixtures')
baseboards('ldk', [(0, 0.5), (1.36, 0.5), (1.36, 0), (W, 0), (W, D), (TVX, D), (TVX, PZ1), (PX1, PZ1), (PX1, PZ0), (0, PZ0)], [], 0)
baseboards('bed', [(OX + 0.1, OZ), (OX + BW_, OZ), (OX + BW_, OZ + BD_), (OX + 0.1, OZ + BD_)], [], FL2)
baseboards('wic', [(WX0, WZ0), (WX1, WZ0), (WX1, WZ1), (WX0, WZ1)], [], FL2)
baseboards('study', [(SX0_, SZ0_), (SX1_, SZ0_), (SX1_, SZ1_), (SX0_, SZ1_)], [], FL2)
baseboards('hall', [(HALLX, HALLZ), (W, HALLZ), (W, VZ), (VX, VZ), (VX, PZ0), (HALLX, PZ0)], [2, 3], FL2)
box('bed_wainscot_cap', OX, OX + 0.11, FL2 + 1.0, FL2 + 1.025, OZ, OZ + BD_, 'walnut_top', 'fixtures')   # 腰壁の天板（ブラックウォルナット、bedroom.js 13）

# ===== 8. 階段（ldk.js と同じ式。14段目は2階の床の張り出しの段鼻） =====
STW = 0.875; SX1 = SX0 + STW; SXC = (SX0 + SX1) / 2; Z1 = VZ + 2.72; G = 2.661 / 13; NST = 14; KV = FL2 / 2.77; ZN = Z1 - 13 * G; STT = 0.035; TD = 0.235
yTop = lambda i: FL2 if i >= NST else (0.2 + 0.198 * (i - 1)) * KV
ny = lambda z: (0.2 + 0.198 * (Z1 - z) / G) * KV
SL = 0.198 * KV / G; ang = math.atan(SL); cA = math.cos(ang)
for i in range(1, NST):
    zf = Z1 - (i - 1) * G
    box('tread%02d' % i, SX0, SX1, yTop(i) - STT, yTop(i), zf - TD, zf, 'tread', 'stairs')
    box('treadplate%02d' % i, SXC - (STW - 0.08) / 2, SXC + (STW - 0.08) / 2, yTop(i) - STT - 0.006, yTop(i) - STT, zf - TD + 0.03, zf - 0.03, 'steel', 'stairs')
box('tread14', SX0, W, FL2 - STT, FL2, ZN - 0.12, ZN, 'tread', 'stairs')
BWs = 0.075; BV = 0.125 / cA
ys = lambda d: (0.2 + 0.198 * d / G - 0.3227) * KV
dAt = lambda y: (y / KV + 0.3227 - 0.2) * G / 0.198
dE = Z1 - VZ
beam = [(dAt(0), 0), (dE, ys(dE)), (dE, ys(dE) - BV), (dAt(BV), 0)]
def drop(d, y):
    u = (y - ys(d)) / (1 + SL * SL); return (d + SL * u, y - u)
for k, x in enumerate((SX0 + 0.2275, SX1 - 0.2275)):
    side_prism('stringer%d' % k, beam, x - BWs / 2, x + BWs / 2, lambda d: Z1 - d, 'steel', 'stairs')
    for i in range(1, NST):
        df = (i - 1) * G; y = yTop(i) - STT - 0.006
        a, b = (df + 0.034, y), (df + TD - 0.029, y)
        pts = [a, b, drop(*b), drop(*a)]
        side_prism('bracket%d_%02d' % (k, i), [(d, max(0, yy)) for d, yy in pts], x - BWs / 2, x + BWs / 2, lambda d: Z1 - d, 'steel', 'stairs')

# ===== 9. 家具（three.js から書き出した GLTF） =====
def srgb_factors(mats):
    """本番（three.js r128、出力は線形のまま）の色の数値は画面の色（sRGB）そのもの。GLTF は線形として読むので、色の数値（柄の画像は除く）を線形へ直す"""
    for m in mats:
        if not m.node_tree:
            continue
        for n in m.node_tree.nodes:
            for sk in n.inputs:
                if sk.type == 'RGBA' and not sk.is_linked:
                    v = sk.default_value; sk.default_value = (srgb2lin(v[0]), srgb2lin(v[1]), srgb2lin(v[2]), v[3])
        m.diffuse_color = tuple(srgb2lin(c) for c in m.diffuse_color[:3]) + (m.diffuse_color[3],)
if GLB:
    before = set(bpy.data.objects); mb = set(bpy.data.materials)
    bpy.ops.import_scene.gltf(filepath=GLB)
    srgb_factors(set(bpy.data.materials) - mb)
    for o in set(bpy.data.objects) - before:
        for c in o.users_collection:
            c.objects.unlink(o)
        COLS['furniture'].objects.link(o)
    for m in bpy.data.materials:     # 確認の画像（Workbench）で色が出るように
        if m.use_nodes and m.node_tree:
            b = m.node_tree.nodes.get('Principled BSDF')
            if b and not b.inputs['Base Color'].is_linked:
                m.diffuse_color = b.inputs['Base Color'].default_value
# ===== 9b. 家具の部品どうしで同じ平面に重なった面を離す（2026-10-26） =====
# 本番は同じ材質・同じ光なので重なっても見えないが、焼き込みでは面ごとに明るさが違うので、深さの奪い合いでチラチラし、星形の模様が出る
# （エアコンの丸い所の円柱のふたと箱の側面、スツールの重ねた円柱など）。貼り物（本番で描画を手前に出す材質＝decal）は 1.5mm 手前へ、
# それ以外は小さい方の面（隠れる側）を 1.5mm 奥へ動かす
def separate_coplanar():
    objs = [o for o in COLS['furniture'].objects if o.type == 'MESH']
    tris, owner = [], []
    for oi, o in enumerate(objs):
        me = o.data; mw = o.matrix_world; me.calc_loop_triangles()
        for t in me.loop_triangles:
            tris.append([mw @ me.vertices[v].co for v in t.vertices]); owner.append((oi, t.polygon_index))
    if not tris:
        return
    bvh = BVHTree.FromPolygons([v for t in tris for v in t], [(3 * i, 3 * i + 1, 3 * i + 2) for i in range(len(tris))], epsilon=0.0)
    farea = {}
    for oi, o in enumerate(objs):
        mw = o.matrix_world; sc = abs(mw.to_3x3().determinant()) ** (2 / 3)
        for p in o.data.polygons:
            farea[(oi, p.index)] = p.area * sc
    moved = 0
    for oi, o in enumerate(objs):
        me = o.data; mw = o.matrix_world; nm = mw.to_3x3(); inv = nm.inverted()
        disp = {}
        for p in me.polygons:
            m = me.materials[p.material_index] if p.material_index < len(me.materials) else None
            decal = bool(m and m.get('decal'))
            n = (nm @ p.normal).normalized(); c = mw @ p.center
            for loc, pn, i, d in bvh.find_nearest_range(c, 0.0008):
                oj, fj = owner[i]
                if oj == oi or pn.normalized().dot(n) < 0.999:
                    continue
                if decal:
                    step = 0.0015
                elif farea[(oi, p.index)] < farea[(oj, fj)] - 1e-9 or (abs(farea[(oi, p.index)] - farea[(oj, fj)]) <= 1e-9 and oi > oj):
                    step = -0.0015
                else:
                    continue
                for v in p.vertices:
                    disp.setdefault(v, []).append(n * step)
                moved += 1
                break
        for v, ds in disp.items():
            me.vertices[v].co += inv @ (sum(ds, Vector()) / len(ds))
    print('coplanar faces moved', moved, flush=True)
if GLB:
    separate_coplanar()

# ===== 10. 本番の材質（色・柄・柄の向きと大きさ）を移す =====
# 本番の建物の部品（tools/export の exportBuilding → building.glb。柄の繰り返し・回転は UV に焼き込み済み）から、面ごとに一番近い同じ向きの本番の三角形を探し、
# その材質と、三角形の UV を面の上へ延ばした UV（平面の上で一次の式）を付ける。見つからない面（2cm 以内に無い）は上の仮の色のまま
PROD = GLB.replace('furniture.glb', 'building.glb') if GLB else ''
def apply_prod():
    import os
    if not PROD or not os.path.exists(PROD):
        print('no building.glb'); return
    before = set(bpy.data.objects); mb = set(bpy.data.materials)
    bpy.ops.import_scene.gltf(filepath=PROD)
    srgb_factors(set(bpy.data.materials) - mb)
    pobjs = [o for o in set(bpy.data.objects) - before if o.type == 'MESH']
    tris = []   # (3頂点, 3UV, 材質)
    segs = []   # 本番の部品の平らな面の外形の辺（両端、面の向き）：建物の面をこの線で切り分け、本番の部品ごとに材質と柄の位置を合わせる
    for o in pobjs:
        bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5); bm.to_mesh(o.data)
        mw = o.matrix_world; nm3 = mw.to_3x3()
        for e in bm.edges:
            fs = e.link_faces
            for f in fs:
                if len(fs) == 1 or any(g is not f and g.normal.dot(f.normal) < 0.999 for g in fs):
                    segs.append((mw @ e.verts[0].co, mw @ e.verts[1].co, (nm3 @ f.normal).normalized()))
        bm.free()
    for o in pobjs:
        me = o.data; mw = o.matrix_world; me.calc_loop_triangles()
        uvl = me.uv_layers[0].data if me.uv_layers else None
        for t in me.loop_triangles:
            ps = [mw @ me.vertices[v].co for v in t.vertices]
            uvs = [Vector(uvl[l].uv) if uvl else Vector((0, 0)) for l in t.loops]
            tris.append((ps, uvs, me.materials[t.material_index] if me.materials else None))
    bvh = BVHTree.FromPolygons([v for t in tris for v in t[0]], [(3 * i, 3 * i + 1, 3 * i + 2) for i in range(len(tris))], epsilon=0.0)
    def uv_at(t, q):   # 三角形の平面の上で、q（平面へ投影）の UV（三角形の外は延ばす）
        a, b, c = t[0]; n = (b - a).cross(c - a); nn = n.length_squared
        if nn < 1e-14:
            return t[1][0]
        q = q - n * ((q - a).dot(n) / nn)
        w0 = (b - q).cross(c - q).dot(n) / nn; w1 = (c - q).cross(a - q).dot(n) / nn; w2 = 1 - w0 - w1
        return t[1][0] * w0 + t[1][1] * w1 + t[1][2] * w2
    # 建物の固まりの面を、同じ平面にある本番の部品の外形の線で切る（窓・ドアの穴のある大きな面の中心が穴に落ちて材質を拾えない・1つの面に本番の材質が2つ以上ある、を防ぐ）
    bm = bmesh.new(); bm.from_mesh(solid.data)
    for f0 in list(bm.faces):
        if not f0.is_valid or f0.calc_area() < 0.01:
            continue
        n = f0.normal.copy(); co = f0.verts[0].co.copy()
        lo = Vector([min(v.co[i] for v in f0.verts) - 0.01 for i in range(3)]); hi = Vector([max(v.co[i] for v in f0.verts) + 0.01 for i in range(3)])
        inb = lambda q: all(lo[i] <= q[i] <= hi[i] for i in range(3))
        lines = {}
        for a, b, sn in segs:
            if sn.dot(n) < 0.999 or abs((a - co).dot(n)) > 0.02 or abs((b - co).dot(n)) > 0.02 or (a - b).length < 0.005:
                continue
            if not (inb(a) or inb(b) or inb((a + b) / 2)):
                continue
            d = (b - a).normalized(); pn = d.cross(n).normalized(); off = pn.dot(a)
            if pn[max(range(3), key=lambda i: abs(pn[i]))] < 0:
                pn, off = -pn, -off
            lines[(round(pn.x, 3), round(pn.y, 3), round(pn.z, 3), round(off, 3))] = (pn, a)
        for pn, a in lines.values():
            fs = [f for f in bm.faces if f.is_valid and f.normal.dot(n) > 0.999 and abs((f.verts[0].co - co).dot(n)) < 1e-4 and inb(f.calc_center_median())]
            if fs:
                bmesh.ops.bisect_plane(bm, geom=list({v for f in fs for v in f.verts}) + list({e for f in fs for e in f.edges}) + fs, plane_co=a, plane_no=pn, dist=1e-5)
    bm.to_mesh(solid.data); bm.free()
    targets = [solid] + [o for cn in ('fixtures', 'stairs', 'doors_open', 'doors_closed') for o in COLS[cn].objects if o.type == 'MESH' and not o.name.endswith('_glass')]
    hit = miss = 0; misses = {}
    for o in targets:
        me = o.data; mw = o.matrix_world; nm = mw.to_3x3()
        if 'UVMap' not in me.uv_layers:
            me.uv_layers.new(name='UVMap')
        uvl = me.uv_layers['UVMap'].data
        slot = {m.name: i for i, m in enumerate(me.materials) if m}
        me.calc_loop_triangles(); inner = {}   # 面の中の点：一番大きな三角形の重心（へこんだ形でも面の上）
        for t in me.loop_triangles:
            if t.polygon_index not in inner or t.area > inner[t.polygon_index][0]:
                inner[t.polygon_index] = (t.area, sum((me.vertices[v].co for v in t.vertices), Vector()) / 3)
        lim = 0.02 if o is solid else 0.004   # 建具・巾木などは本番の同じ部品がぴったり重なるときだけ（無ければ巾木が壁の材質を拾ってしまう）
        for p in me.polygons:
            n = (nm @ p.normal).normalized(); c = mw @ (inner[p.index][1] if p.index in inner else p.center)
            best = None   # 同じ向きの面だけ（裏向きの面＝扉や見込みの下の面などを拾わない）。近くの面を順に見る
            floor = o is solid and n.z > 0.9   # 床：柄のある本番の材質（床材）だけ。ドアの開口の床が近くの白い部品の材質を拾って白い帯になっていた
            for d, lm in ((0.0005, lim), (0.003, lim), (0.003, 0.2 if floor else lim)):   # 面の中の点から少し部屋の側に出た点で探す（床は見つからなければ 20cm まで）
                for loc, pn, i, dist in sorted(bvh.find_nearest_range(c + n * d, lm), key=lambda t: t[3]):
                    a0, a1, a2 = tris[i][0]
                    if pn.normalized().dot(n) > 0.9 and (a1 - a0).cross(a2 - a0).length > 4e-4 and                        (not floor or (tris[i][2] and tris[i][2].node_tree and any(nd.type == 'TEX_IMAGE' for nd in tris[i][2].node_tree.nodes))):   # 2cm² 未満の小さな三角形は柄の向きと大きさがくずれる
                        best = tris[i]; break
                if best:
                    break
            if best is None or best[2] is None:
                miss += 1; misses[o.name.split('.')[0][:14]] = misses.get(o.name.split('.')[0][:14], 0) + 1; continue
            hit += 1
            m = best[2]
            if m.name not in slot:
                me.materials.append(m); slot[m.name] = len(me.materials) - 1
            p.material_index = slot[m.name]
            for li, vi in zip(p.loop_indices, p.vertices):
                uvl[li].uv = uv_at(best, mw @ me.vertices[vi].co)
    for o in pobjs:
        bpy.data.objects.remove(o)
    print('prod materials: faces', hit, 'not found', miss, misses, flush=True)
apply_prod()
for c in ('doors_open',):
    COLS[c].hide_render = True; COLS[c].hide_viewport = True
if OUT:
    bpy.ops.wm.save_as_mainfile(filepath=OUT)
print('DONE', len(bpy.data.objects))
