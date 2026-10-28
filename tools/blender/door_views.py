# ドア枠のまわりを見比べる視点を、模型の開口（C_<ドア>_open・玄関ドア）から作る → tools/door_views.json（pair_cap.js が PAIRV に足す）
# 開口の両側から：枠の左右の縦枠（目の高さから少し下）と、上枠の角を見る。部屋の外（詰まった固まり）の側は作らない
# 使い方：run.py pyh tools/blender/door_views.py
import bpy, json, os
from mathutils import Vector
from mathutils.bvhtree import BVHTree
vs, fs = [], []
for o in bpy.data.objects:
    if o.type != 'MESH' or o.hide_render or any(c.name in ('cut_void', 'cut_open', 'keep', 'doors_open', 'doors_closed') for c in o.users_collection):
        continue
    me = o.data; mw = o.matrix_world; me.calc_loop_triangles(); b0 = len(vs)
    vs += [mw @ v.co for v in me.vertices]; fs += [tuple(b0 + i for i in t.vertices) for t in me.loop_triangles]
bvh = BVHTree.FromPolygons(vs, fs, epsilon=0.0)
def T(v):   # Blender → three.js
    return [round(v.x, 3), round(v.z, 3), round(-v.y, 3)]
def free(p, q):   # p から q まで、ほかの物に当たらない
    d = q - p; r = bvh.ray_cast(p, d.normalized(), d.length - 0.12)   # 見る点のまわり（枠・額縁は開口の端の手前にある）は数えない
    return r[0] is None
out = {}
for o in bpy.data.objects:
    if not (o.name.startswith('C_') and o.name.endswith('_open')) and o.name != 'C_entdoor':
        continue
    name = o.name[2:].replace('_open', '')
    bb = [o.matrix_world @ Vector(c) for c in o.bound_box]
    lo = Vector([min(v[i] for v in bb) for i in range(3)]); hi = Vector([max(v[i] for v in bb) for i in range(3)])
    sz = hi - lo
    ax = 0 if sz.x < sz.y else 1          # 壁の厚さの向き（Blender の x か y）
    al = 1 - ax                           # 壁に沿った向き
    c = (lo + hi) / 2; fl = lo.z + 0.003; top = hi.z
    if top - fl < 1.2:
        continue
    for sgn in (1, -1):
        face = c.copy(); face[ax] = (hi[ax] if sgn > 0 else lo[ax])
        nrm = Vector((0, 0, 0)); nrm[ax] = sgn
        # その側が部屋か（開口の前の床の上 1m に何も無い）
        e0 = face + nrm * 0.9; e0.z = fl + 1.2
        up = bvh.ray_cast(e0, Vector((0, 0, 1)), 3.0); dn = bvh.ray_cast(e0, Vector((0, 0, -1)), 3.0)
        if up[0] is None or dn[0] is None or up[1].z > -0.5 or dn[1].z < 0.5 or e0.z - dn[0].z > 1.5:   # 床と天井のある部屋の中
            continue
        for k, (edge, tz, nm) in enumerate(((lo[al], fl + 0.9, 'a'), (hi[al], fl + 0.9, 'b'), (lo[al], top, 'ta'), (hi[al], top, 'tb'))):
            tgt = face.copy(); tgt[al] = edge; tgt.z = tz
            eye = face + nrm * 0.75; eye[al] = c[al] + (0.35 if edge < c[al] else -0.35) * (1 if k < 2 else 0.6); eye.z = fl + (1.1 if k < 2 else 1.5)
            if not free(eye, tgt):
                continue
            out['d_%s_%s%s' % (name, 'p' if sgn > 0 else 'n', nm)] = [T(eye), T(tgt), 60]
json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'door_views.json'), 'w'), indent=0)
print('door views', len(out), sorted({k.split('_')[1] for k in out}))
