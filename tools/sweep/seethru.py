# 互いに食い込んだ家具の部品の継ぎ目に、奥が透ける穴が無いかを調べる（2026-11-10。ソファの背もたれの外側と背クッションの間から床が透けた）
# 使い方：blender -b <house.blend> -P tools/sweep/seethru.py -- <build のログ>（ログの「buried mutual」の組を調べる）
# 組の重なった所の箱に、まわり 40cm の外の点から光線を撃ち、最初に当たった面が組の部品の裏（中の面）なら、穴から中が見えている
import bpy, sys, re, random
from mathutils import Vector
from mathutils.bvhtree import BVHTree

argv = sys.argv[sys.argv.index('--') + 1:]
line = next(l for l in open(argv[0], encoding='utf-8', errors='replace') if l.startswith('buried mutual'))
pairs = [p.split('/') for p in line.split(' ', 3)[3].strip().split('; ') if '/' in p]
objs = [o for o in bpy.data.objects if o.type == 'MESH' and o.visible_get() and not o.hide_render]

def bvh(o):
    mw = o.matrix_world
    return BVHTree.FromPolygons([mw @ v.co for v in o.data.vertices], [tuple(p.vertices) for p in o.data.polygons], epsilon=0.0)
def bb(o):
    b = [o.matrix_world @ Vector(c) for c in o.bound_box]
    return Vector([min(v[i] for v in b) for i in range(3)]), Vector([max(v[i] for v in b) for i in range(3)])
T = {}
def tree(o):
    if o.name not in T:
        T[o.name] = bvh(o)
    return T[o.name]
DIRS = [Vector((0, 0, 1)), Vector((0.6, 0.5, -0.62)).normalized(), Vector((-0.7, 0.3, 0.65)).normalized(), Vector((0.2, -0.9, 0.1)).normalized(), Vector((-0.3, -0.4, -0.87)).normalized()]
def inside(o, p):   # 5方向のうち3方向以上で最初に裏の面に当たれば中
    lo, hi = bb(o)
    if any(p[i] < lo[i] or p[i] > hi[i] for i in range(3)):
        return False
    k = 0
    for d in DIRS:
        loc, nrm, fi, dist = tree(o).ray_cast(p, d, 10.0)
        k += loc is not None and nrm.dot(d) > 0
    return k >= 3
random.seed(1)
bad = 0
for an, bn in pairs:
    a, b = bpy.data.objects.get(an), bpy.data.objects.get(bn)
    if a is None or b is None:
        print('missing', an, bn); continue
    (a0, a1), (b0, b1) = bb(a), bb(b)
    lo = Vector([max(a0[i], b0[i]) for i in range(3)]); hi = Vector([min(a1[i], b1[i]) for i in range(3)])
    c0, c1 = lo - Vector((0.4, 0.4, 0.4)), hi + Vector((0.4, 0.4, 0.4))
    near = [o for o in objs if all(bb(o)[0][i] <= c1[i] and bb(o)[1][i] >= c0[i] for i in range(3))]
    holes = 0; n = 0
    for _ in range(4000):
        t = Vector([random.uniform(lo[i] - 0.01, hi[i] + 0.01) for i in range(3)])
        d = Vector([random.gauss(0, 1) for _ in range(3)]).normalized()
        p = t - d * 0.4
        if p.z < 0.01 or any(inside(o, p) for o in near):   # 床の下・ほかの部品の中からは見ない（Blender は z が上）
            continue
        best = None
        for o in near:
            loc, nrm, fi, dist = tree(o).ray_cast(p, (t - p).normalized() if (t - p).length > 1e-6 else d, 1.0)
            if loc is not None and (best is None or dist < best[0]):
                best = (dist, o, nrm)
        if best is None or best[0] < 1e-4:
            continue
        n += 1
        if best[1] in (a, b) and best[2].dot(t - p) > 0:   # 組の部品の裏の面に先に当たった＝穴から中が見える
            holes += 1
            if holes <= 3:   # three.js の座標（x, 上, 南）で、見る位置と穴の奥の点
                q = p + (t - p).normalized() * best[0]
                print('   eye %.3f,%.3f,%.3f -> %.3f,%.3f,%.3f' % (p.x, p.z, -p.y, q.x, q.z, -q.y))
    flag = 'HOLE' if holes > 2 else 'ok'
    bad += flag == 'HOLE'
    print('pair %-14s %-14s rays %4d inside-hits %4d %s' % (an, bn, n, holes, flag), flush=True)
print('seethru pairs %d holes %d' % (len(pairs), bad), flush=True)
