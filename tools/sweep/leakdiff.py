# 消灯（lk0）と一部点灯（lkA など）の同じ視点で、明るくなった画素を数える：python -I leakdiff.py <名前>...
import sys, os
sys.path.insert(0, __import__('os').environ.get('SWEEP_LIB', '.'))   # numpy と PIL の入ったフォルダ（pip install --target で入れた所。環境変数 SWEEP_LIB）
import numpy as np
from PIL import Image
D = r'C:\Users\Yuhei\MyApp\Claude\3DMyHome\bake\work\pair'
for t in sys.argv[1:]:
    for f in sorted(os.listdir(D)):
        if not f.endswith('__' + t + '.png'):
            continue
        v = f.split('__')[0]; z = os.path.join(D, v + '__lk0.png')
        b = np.asarray(Image.open(os.path.join(D, f)).convert('L'), np.float32)
        a = np.asarray(Image.open(z).convert('L'), np.float32) if os.path.exists(z) else np.zeros_like(b)
        d = b - a
        print('%-12s %-5s max %5.0f  p99.9 %5.1f  >8: %6d  >20: %6d %s' % (v, t, d.max(), np.percentile(d, 99.9), (d > 8).sum(), (d > 20).sum(), '' if os.path.exists(z) else '(lk0 なし)'))
