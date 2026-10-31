# 焼き込みの時間の見積もり：前回の記録（bake/work/lm/bake_log.json）から、光源ごと・全体の時間を出す
# 使い方：python -I tools/blender/bake_eta.py [サンプル数（記録との比で伸ばす。省くと記録のまま）]
import sys, os, json
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
log = json.load(open(os.path.join(ROOT, 'bake', 'work', 'lm', 'bake_log.json')))
k = float(sys.argv[1]) / 8192 if sys.argv[1:] else 1.0
src = {}
for name, v in log.items():
    s = name.split('@')[0]
    t = v['sec'] * (1 if s in ('sky_ent', 'sun_ent') else k)
    src.setdefault(s, [0, 0.0]); src[s][0] += 1; src[s][1] += t
for s, (n, t) in sorted(src.items(), key=lambda x: -x[1][1]):
    print('%-10s %3d jobs %6.0f min' % (s, n, t / 60))
tot = sum(t for n, t in src.values())
print('total %d jobs %.1f h' % (sum(n for n, t in src.values()), tot / 3600))
