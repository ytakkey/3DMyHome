# 本番と STG の並べ撮りで、STG だけにある暗いしみ（線より太い塊）を数える：python -I pairblob.py <pair フォルダ> <出力フォルダ> <本番,STG>...
# しみ＝周り（半径約15画素のぼかし）より 40% 以上暗く、7×7 で削っても残る太さの所。本番の同じ所が周りより 25% 以上暗い所は除く
import sys, os
sys.path.insert(0, __import__('os').environ.get('SWEEP_LIB', '.'))   # numpy と PIL の入ったフォルダ（pip install --target で入れた所。環境変数 SWEEP_LIB）
import numpy as np
from PIL import Image, ImageFilter
d, od = sys.argv[1], sys.argv[2]
os.makedirs(od, exist_ok=True)
rows = []
def lum(path):
    return np.asarray(Image.open(path).convert('L'), np.float32)
def bg(a):
    return np.asarray(Image.fromarray(a.astype(np.uint8)).filter(ImageFilter.GaussianBlur(15)), np.float32)
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
        ba, bb = bg(a), bg(b)
        m = (b < bb * 0.6) & (bb > 25) & ~(a < ba * 0.75)
        mi = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(7))
        core = np.asarray(mi) > 0
        n = int(core.sum())
        rows.append((n, v, s))
        if n > 30:
            grow = np.asarray(mi.filter(ImageFilter.MaxFilter(9))) > 0
            px = np.asarray(Image.open(os.path.join(d, f)).convert('RGB')).copy()
            px[grow & m] = [0, 255, 0]
            Image.fromarray(px).save(os.path.join(od, v + '__' + s + '.png'))
rows.sort(reverse=True)
for r in rows[:60]:
    print('%6d %-26s %s' % r)
print('views', len(rows), 'over30', sum(1 for r in rows if r[0] > 30))
