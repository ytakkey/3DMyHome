# house.blend の巾木（bb_<部屋>_<辺>_<区切り>）の、辺ごとの途切れ（区切りの間）を three.js の座標で出す：blender -b house.blend -P bbgaps.py
import bpy, re
segs = {}
for o in bpy.data.objects:
    m = re.match(r'bb_(\w+?)_(\d+)_(\d+)$', o.name)
    if not m or o.type != 'MESH':
        continue
    vs = [o.matrix_world @ v.co for v in o.data.vertices]
    xs = [v.x for v in vs]; zs = [-v.y for v in vs]; ys = [v.z for v in vs]
    segs.setdefault((m.group(1), int(m.group(2))), []).append((min(xs), max(xs), min(zs), max(zs), min(ys)))
for (room, i), ss in sorted(segs.items()):
    horiz = (ss[0][1] - ss[0][0]) > (ss[0][3] - ss[0][2])   # x の向きに長い辺
    ss.sort(key=lambda s: s[0] if horiz else s[2])
    for a, b in zip(ss, ss[1:]):
        g0, g1 = (a[1], b[0]) if horiz else (a[3], b[2])
        if g1 - g0 > 0.005:
            at = ('z=%.3f x %.3f..%.3f' % ((a[2] + a[3]) / 2, g0, g1)) if horiz else ('x=%.3f z %.3f..%.3f' % ((a[0] + a[1]) / 2, g0, g1))
            print('GAP %-7s edge%-2d len %.3f  %s  y %.3f' % (room, i, g1 - g0, at, a[4]))
print('GAP done', len(segs))
