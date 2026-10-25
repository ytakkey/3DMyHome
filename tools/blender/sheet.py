# 確認の画像を並べて1枚にする：python -I tools/blender/sheet.py <画像のフォルダ> <出力.jpg> <列の数> <幅> [名前の頭,...]
import sys, os
from PIL import Image, ImageDraw, ImageFont
d, out, ncol, cw = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
keys = sys.argv[5].split(',') if len(sys.argv) > 5 else None
fs = sorted(f for f in os.listdir(d) if f.endswith(('.png', '.jpg')) and (not keys or any(f.startswith(k) for k in keys)))
ims = [Image.open(os.path.join(d, f)) for f in fs]
ch = round(cw * ims[0].height / ims[0].width)
nrow = (len(ims) + ncol - 1) // ncol
S = Image.new('RGB', (ncol * cw, nrow * ch), 'white')
try:
    font = ImageFont.truetype('C:/Windows/Fonts/meiryo.ttc', max(12, cw // 30))
except OSError:
    font = ImageFont.load_default()
dr = ImageDraw.Draw(S)
for i, (f, im) in enumerate(zip(fs, ims)):
    x, y = (i % ncol) * cw, (i // ncol) * ch
    S.paste(im.convert('RGB').resize((cw, ch)), (x, y))
    dr.rectangle((x, y, x + cw - 1, y + ch - 1), outline='black')
    dr.text((x + 4, y + 2), f[:-4], fill='red', font=font, stroke_width=2, stroke_fill='white')
S.save(out, quality=88)
print(out, S.size)
