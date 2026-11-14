# 2組の撮った画像（tools/state_cap.js・pair_cap.js。bake/work/pair/<視点>__<名前>.png）を画素ごとに比べる：imgcmp.py <フォルダ> <名前A> <名前B>
# 名前は前方一致（q0_ なら q0_0・q0_1…）。違う画素の数と、いちばん大きい差（0〜255）を出す。作りを変える前後で「画素が1つも変わらない」ことを確かめる用
import os, sys
from PIL import Image, ImageChops
d, A, B = sys.argv[1:4]
fs = sorted(f for f in os.listdir(d) if '__' + A in f and f.endswith('.png'))
bad = 0; n = 0
for f in fs:
    g = f.replace('__' + A, '__' + B); p = os.path.join(d, g)
    if not os.path.exists(p):
        print('MISSING', g); bad += 1; continue
    a = Image.open(os.path.join(d, f)).convert('RGB'); b = Image.open(p).convert('RGB'); n += 1
    if a.size != b.size:
        print('SIZE', f, a.size, b.size); bad += 1; continue
    df = ImageChops.difference(a, b); bb = df.getbbox()
    if bb:
        ex = df.getextrema(); mx = max(e[1] for e in ex); rr, gg, bb2 = df.split()
        cnt = a.size[0] * a.size[1] - ImageChops.lighter(ImageChops.lighter(rr, gg), bb2).histogram()[0]   # どれかの色が違う画素の数
        print('DIFF %-40s max %3d  pixels %7d  bbox %s' % (f, mx, cnt, bb)); bad += 1
print('compared', n, 'different', bad)
