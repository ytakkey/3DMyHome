# 視点の名前の頭が同じ並べ撮りを、本番｜STG の2列で n 組ずつ並べる：python pairtile.py <出力の頭> <視点の頭> <本番の名前> <STG の名前> <幅> <1枚の組数>
import sys, os
sys.path.insert(0, __import__('os').environ.get('SWEEP_LIB', '.'))   # numpy と PIL の入ったフォルダ（pip install --target で入れた所。環境変数 SWEEP_LIB）
from PIL import Image, ImageDraw
D = r'C:\Users\Yuhei\MyApp\Claude\3DMyHome\bake\work\pair'
head, pre, pt, st, W, per = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], int(sys.argv[5]), int(sys.argv[6])
vs = sorted({f.split('__')[0] for f in os.listdir(D) if f.startswith(pre) and f.endswith('__' + st + '.png')})
for k in range(0, len(vs), per):
    part = vs[k:k + per]; ims = []
    for v in part:
        a = Image.open(os.path.join(D, v + '__' + pt + '.png')).convert('RGB'); b = Image.open(os.path.join(D, v + '__' + st + '.png')).convert('RGB')
        H = int(W * a.height / a.width); a = a.resize((W, H)); b = b.resize((W, H))
        for im, t in ((a, v + ' ' + pt), (b, st)):
            dr = ImageDraw.Draw(im); dr.rectangle([0, 0, 190, 12], fill='black'); dr.text((2, 0), t, fill='yellow')
        ims.append((a, b))
    H = ims[0][0].height
    S = Image.new('RGB', (2 * W + 4, len(ims) * (H + 2)), 'white')
    for i, (a, b) in enumerate(ims):
        S.paste(a, (0, i * (H + 2))); S.paste(b, (W + 4, i * (H + 2)))
    S.save('%s%02d.png' % (head, k // per))
print(len(vs))
