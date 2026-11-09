# いま開いている bake_uv.blend と前の .blend で、アトラスごとに LM の UV と形（頂点の位置）が同じかを比べる：run.py uvcmp <前の .blend>
# SAME のアトラスは焼き直さなくてよい（焼いた画像の UV が変わらない）。DIFF のアトラスを含む仕事は焼き直す（bake/work/lm/alias.json で探して、その仕事のフォルダの done を消す）
# 前の .blend から読んだ物は位置（matrix_world）が更新されないので、位置は比べない
import bpy, sys
import numpy as np
from collections import defaultdict
OLD = sys.argv[sys.argv.index('--') + 1:][0]
def grab(objs):
    d = defaultdict(list)
    for o in sorted(objs, key=lambda o: o.name):
        if o.type != 'MESH' or 'LM' not in o.data.uv_layers:
            continue
        me = o.data
        uv = np.zeros(len(me.loops) * 2, np.float32); me.uv_layers['LM'].data.foreach_get('uv', uv)
        co = np.zeros(len(me.vertices) * 3, np.float32); me.vertices.foreach_get('co', co)
        d[o.get('atlas') or o.name].append((o.name, uv, co))
    return d
new = grab(bpy.data.objects)
with bpy.data.libraries.load(OLD, link=False) as (src, dst):
    dst.objects = list(src.objects)
old = grab([o for o in dst.objects if o is not None])
for g in sorted(set(new) | set(old)):
    a, b = new.get(g, []), old.get(g, [])
    if len(a) != len(b):
        print('UVCMP', g, 'DIFF count', len(a), len(b)); continue
    bad = []
    for (na, ua, ca), (nb, ub, cb) in zip(a, b):
        if ua.shape != ub.shape or ca.shape != cb.shape:
            bad.append((na, 'shape')); continue
        du = float(np.abs(ua - ub).max()) if ua.size else 0.0
        dc = float(np.abs(ca - cb).max()) if ca.size else 0.0
        if du > 1e-6 or dc > 1e-5:
            bad.append((na, 'uv %.2g co %.2g' % (du, dc)))
    print('UVCMP', g, 'SAME' if not bad else 'DIFF', len(a), bad[:4])
