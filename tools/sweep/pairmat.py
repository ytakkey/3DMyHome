# 本番と STG の昼の並べ撮りで、色味（明るさを除いた色）が大きく違う塊を数える（材質・柄の取り違えを探す）：python -I pairmat.py <pair フォルダ> <出力フォルダ> <本番,STG>...
import sys, os
sys.path.insert(0, __import__('os').environ.get('SWEEP_LIB', '.'))   # numpy と PIL の入ったフォルダ（pip install --target で入れた所。環境変数 SWEEP_LIB）
import numpy as np
from PIL import Image, ImageFilter
d, od = sys.argv[1], sys.argv[2]
os.makedirs(od, exist_ok=True)
def chroma(path):
    a = np.asarray(Image.open(path).convert('RGB').filter(ImageFilter.BoxBlur(4)), np.float32) + 1
    s = a.sum(2, keepdims=True)
    return a / s, s[..., 0]
rows = []
for pair in sys.argv[3:]:
    p, s = pair.split(',')
    for f in sorted(os.listdir(d)):
        if not f.endswith('__' + s + '.png'):
            continue
        v = f[:-len('__' + s + '.png')]
        pf = os.path.join(d, v + '__' + p + '.png')
        if not os.path.exists(pf):
            continue
        ca, la = chroma(pf); cb, lb = chroma(os.path.join(d, f))
        if ca.shape != cb.shape:
            continue
        # 本番の色味と STG の色味の差（r・g・b の割合の差の最大）。暗い所・白飛びは見ない
        df = np.abs(ca - cb).max(2)
        m = (df > 0.06) & (la > 90) & (lb > 90) & (la < 700) & (lb < 700)
        mi = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(9))
        core = np.asarray(mi) > 0
        n = int(core.sum())
        rows.append((n, v, s))
        if n > 200:
            grow = np.asarray(mi.filter(ImageFilter.MaxFilter(11))) > 0
            px = np.asarray(Image.open(os.path.join(d, f)).convert('RGB')).copy()
            px[grow & m] = (px[grow & m] * 0.4 + np.array([255, 0, 255]) * 0.6).astype(np.uint8)
            Image.fromarray(px).save(os.path.join(od, v + '__' + s + '.png'))
rows.sort(reverse=True)
for r in rows[:50]:
    print('%6d %-26s %s' % r)
print('views', len(rows), 'over200', sum(1 for r in rows if r[0] > 200))
