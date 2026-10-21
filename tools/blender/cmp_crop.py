# 比較の画像（bake/work/trial_cmp/<視点>__<状態>__<方式>.png）の同じ範囲を切り出して拡大し、横に並べる
# 使い方：python -I tools/blender/cmp_crop.py <フォルダ> <視点__状態> <x0,y0,x1,y1> <倍率> <出力.jpg> [方式,...]
import sys, os
from PIL import Image, ImageDraw, ImageFont
d, key, box, k, out = sys.argv[1], sys.argv[2], [int(v) for v in sys.argv[3].split(',')], float(sys.argv[4]), sys.argv[5]
vs = sys.argv[6].split(',') if len(sys.argv) > 6 else sorted(f[len(key) + 2:-4] for f in os.listdir(d) if f.startswith(key + '__'))
w, h = round((box[2] - box[0]) * k), round((box[3] - box[1]) * k)
S = Image.new('RGB', (w * len(vs), h), 'white'); dr = ImageDraw.Draw(S)
font = ImageFont.truetype('C:/Windows/Fonts/meiryo.ttc', 16)
for i, v in enumerate(vs):
    im = Image.open(os.path.join(d, '%s__%s.png' % (key, v))).convert('RGB').crop(box).resize((w, h), Image.NEAREST)
    S.paste(im, (i * w, 0)); dr.rectangle((i * w, 0, i * w + w - 1, h - 1), outline='black')
    dr.text((i * w + 4, 2), v, fill='red', font=font, stroke_width=2, stroke_fill='white')
S.save(out, quality=90)
print(out, S.size)
