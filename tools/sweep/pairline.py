# 本番と STG の並べ撮りで、STG だけにある細い暗い線を数える：python -I pairline.py <pair フォルダ> <出力フォルダ> <本番,STG>...
# 細い暗い線＝周り（7×7 の中央値）より 45% 以上暗い画素で、本番の同じ所は周りより 20% 以上暗くない。線の形（細く長い）のまとまりだけ数える
import sys, os
sys.path.insert(0, __import__('os').environ.get('SWEEP_LIB', '.'))   # numpy と PIL の入ったフォルダ（pip install --target で入れた所。環境変数 SWEEP_LIB）
import numpy as np
from PIL import Image, ImageFilter
d, od = sys.argv[1], sys.argv[2]
os.makedirs(od, exist_ok=True)
rows = []
def lum(path):
    return np.asarray(Image.open(path).convert('L'), np.float32)
def med(a):
    return np.asarray(Image.fromarray(a.astype(np.uint8)).filter(ImageFilter.MedianFilter(7)), np.float32)
for pair in sys.argv[3:]:
    p, s = pair.split(',')
    for f in sorted(os.listdir(d)):
        if not f.endswith('__' + s + '.png'):
            continue
        v = f[:-len('__' + s + '.png')]
        pf = os.path.join(d, v + '__' + p + '.png')
        if not os.path.exists(pf):
            continue
        a = lum(pf); b = lum(os.path.join(d, f))
        if a.shape != b.shape:
            continue
        ma, mb = med(a), med(b)
        lineb = (b < mb * 0.55) & (mb > 25)
        okp = a < ma * 0.8
        # 本番の線の近く（1画素ずれ）も除く
        okp = okp | np.roll(okp, 1, 0) | np.roll(okp, -1, 0) | np.roll(okp, 1, 1) | np.roll(okp, -1, 1)
        m = lineb & ~okp
        n = int(m.sum())
        rows.append((n, v, s))
        if n > 150:
            im = Image.open(os.path.join(d, f)).convert('RGB'); px = np.asarray(im).copy()
            px[m] = [255, 0, 255]
            Image.fromarray(px).save(os.path.join(od, v + '__' + s + '.png'))
rows.sort(reverse=True)
for r in rows[:80]:
    print('%6d %-26s %s' % r)
print('views', len(rows), 'over150', sum(1 for r in rows if r[0] > 150))
