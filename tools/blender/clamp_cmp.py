# 間接光の上限（BAKE_CLAMP）を変えて焼いた層を、いまの層（bake/work/lm）と比べる：明るさ（平均）とざらつき
# 使い方：python -I tools/blender/clamp_cmp.py <比べるフォルダ（bake/work の下）,...>
#  明るさ：アトラスの画素の平均（lux）。ざらつき：島の中の画素と周りの 3×3 の平均の差の絶対値の平均 ÷ 平均（相対値。光の形のゆるやかな変化はほぼ 0）
import sys, os, json
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
W = os.path.join(ROOT, 'bake', 'work')
dirs = ['lm'] + sys.argv[1].split(',')

def stats(p):
    a = np.load(p).astype(np.float32)
    y = a[..., :3].mean(-1) if a.ndim == 3 else a.reshape(len(a), -1)[:, :3].mean(-1)
    if y.ndim == 1:   # 頂点：平均だけ
        return float(y.mean()), None
    m = (y > 0) & np.isfinite(y); y = np.where(m, y, 0)
    k = np.zeros_like(y); c = np.zeros_like(y); inside = m.copy()
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            s = np.roll(np.roll(y, dy, 0), dx, 1); sm = np.roll(np.roll(m, dy, 0), dx, 1)
            k += s; inside &= sm
    k /= 9
    mean = float(y[m].mean()) if m.any() else 0.0
    nz = float(np.abs(y - k)[inside].mean() / max(mean, 1e-9)) if inside.any() else 0.0
    return mean, nz

lays = sorted(x for x in os.listdir(os.path.join(W, dirs[1])) if os.path.isdir(os.path.join(W, dirs[1], x)) and not x.startswith('_'))
out = {}
for L in lays:
    for f in sorted(os.listdir(os.path.join(W, dirs[1], L))):
        if not f.endswith('.npy'):
            continue
        row = []
        for d in dirs:
            p = os.path.join(W, d, L, f)
            row.append(stats(p) if os.path.exists(p) else (0.0, None))
        out['%s/%s' % (L, f[:-4])] = row
        base = row[0][0]
        print('%-58s' % ('%s/%s' % (L, f[:-4]))[:58], '  '.join('%s %8.2f x%5.2f nz %s' % (d, m, m / base if base else 0, '%.3f' % n if n is not None else '  - ') for d, (m, n) in zip(dirs, row)))
json.dump(out, open(os.path.join(W, 'clamp_cmp.json'), 'w'), indent=1)
