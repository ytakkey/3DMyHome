# dark.json の候補から、面を正面 0.9m から見る視点を作る（pair_cap の PAIRV と同じ形）：python darkviews.py <dark.json> <出力.json> <件数>
import sys, json
d = json.load(open(sys.argv[1], encoding='utf-8')); n = int(sys.argv[3])
d = [e for e in d if e['vis'] >= 5 and e['ratio'] < 0.2 and e['area_cm2'] >= 20]
d.sort(key=lambda e: -(min(e['area_cm2'], 2000) * e['vis']))
out = {}
for i, e in enumerate(d[:n]):
    p, nr = e['pos'], e['nrm']
    eye = [p[k] + nr[k] * 0.9 for k in range(3)]
    if abs(nr[1]) > 0.7:   # 上向き・下向きの面は斜めから
        eye = [p[0] + 0.6, p[1] + nr[1] * 0.9, p[2] + 0.6]
    eye[1] = max(eye[1], (0.3 if p[1] < 2.8 else 3.2))
    out['k%02d_%s_%d' % (i, e['atlas'], e['poly'])] = [[round(v, 3) for v in eye], p, 60]
json.dump(out, open(sys.argv[2], 'w'), indent=0)
print(len(out))
