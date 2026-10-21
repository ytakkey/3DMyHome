# 焼いた層（bake/work/lm/<層>/<アトラス>.npy。lux の RGB、float16）を、ブラウザの検証ページ（STG/）で読む画像に変換する
# 使い方：blender -b --factory-startup -P tools/blender/lm_images.py -- <層のフォルダ> <出力のフォルダ> <方式> <縮小>（run.py lmimg）
#  方式：h16＝半精度そのまま（16bit の PNG の RGB に float16 のビットを入れる。値は焼いたまま＝圧縮なし）
#        rgbm＝RGBM（8bit の PNG の RGBA。lux＝RGB×A²×S、S は画像ごとの最大値）
#        logj＝対数の JPEG（8bit の RGB。lux＝2^(lo＋(値−1)/254×(hi−lo))、値0は0。画質90）
#  縮小：1＝焼いたまま、2・4＝縦横 1/2・1/4（2×2・4×4 の平均）
#  画像の行は上が v＝1（glTF の UV の向き。three.js で flipY なしで読む）。一覧は <出力>/index.json（層→アトラス→ファイルと値の範囲）
import sys, os, json, zlib, struct, math
import numpy as np
argv = sys.argv[sys.argv.index('--') + 1:]
LD, OUT, ENC, K = argv[0], argv[1], argv[2], int(argv[3])
os.makedirs(OUT, exist_ok=True)

def png(path, a, depth):
    """PNG を書く（a：高さ×幅×チャンネルの uint8／uint16）。各行に Paeth のフィルタ"""
    h, w, c = a.shape
    if depth == 16:
        raw = a.astype('>u2').view(np.uint8).reshape(h, w * c * 2); bpp = c * 2
    else:
        raw = a.astype(np.uint8).reshape(h, w * c); bpp = c
    x = raw.astype(np.int16)
    left = np.zeros_like(x); left[:, bpp:] = x[:, :-bpp]
    up = np.zeros_like(x); up[1:] = x[:-1]
    ul = np.zeros_like(x); ul[1:, bpp:] = x[:-1, :-bpp]
    p = left + up - ul; pa, pb, pc = np.abs(p - left), np.abs(p - up), np.abs(p - ul)
    pred = np.where((pa <= pb) & (pa <= pc), left, np.where(pb <= pc, up, ul))
    f = ((x - pred) & 0xff).astype(np.uint8)
    data = np.concatenate([np.full((h, 1), 4, np.uint8), f], 1).tobytes()
    def chunk(t, d):
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    ct = {3: 2, 4: 6}[c]
    open(path, 'wb').write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, depth, ct, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(data, 9)) + chunk(b'IEND', b''))

def jpeg(path, a):
    import bpy
    h, w, _ = a.shape
    im = bpy.data.images.new('J', w, h, alpha=False, float_buffer=False)
    im.colorspace_settings.name = 'Non-Color'
    px = np.concatenate([a[::-1].astype(np.float32) / 255.0, np.ones((h, w, 1), np.float32)], 2)   # Blender の画像は下の行から
    im.pixels.foreach_set(px.ravel())
    im.file_format = 'JPEG'; im.filepath_raw = path
    im.save(filepath=path, quality=90)
    bpy.data.images.remove(im)

index = {'enc': ENC, 'scale': K, 'layers': {}, 'res': {}}
total = 0
for L in sorted(os.listdir(LD)):
    d = os.path.join(LD, L)
    if not os.path.isfile(os.path.join(d, 'done')):
        continue
    ent = {}
    for f in sorted(os.listdir(d)):
        if not f.endswith('.npy'):
            continue
        g = f[:-4]
        a = np.load(os.path.join(d, f)).astype(np.float32)
        if not np.isfinite(a).all():
            print('lmimg nonfinite', L, g, int((~np.isfinite(a)).sum()), flush=True)
            a = np.nan_to_num(a, nan=0.0, posinf=65504.0)
        a = np.maximum(a, 0)
        if K > 1:
            r = a.shape[0] // K
            a = a[:r * K, :r * K].reshape(r, K, r, K, 3).mean((1, 3))
        a = a[::-1]   # 上の行＝v＝1
        r = a.shape[0]; index['res'][g] = r
        mx = float(a.max())
        name = '%s__%s' % (L.replace('@', '_'), g)
        e = {'max': mx}
        if mx <= 0:
            ent[g] = None; continue
        if ENC == 'h16':
            fn = name + '.png'; png(os.path.join(OUT, fn), a.astype(np.float16).view(np.uint16), 16)
        elif ENC == 'rgbm':
            c = a.max(2)
            m8 = np.ceil(np.sqrt(np.clip(c / mx, 0, 1)) * 255)
            M = (m8 / 255) ** 2 * mx
            rgb = np.where(M[..., None] > 0, np.round(a / np.maximum(M, 1e-30)[..., None] * 255), 0)
            fn = name + '.png'; png(os.path.join(OUT, fn), np.concatenate([np.clip(rgb, 0, 255), m8[..., None]], 2).astype(np.uint8), 8)
        elif ENC == 'logj':
            hi = math.log2(mx); lo = hi - 14
            v = np.where(a > 2 ** lo, np.round((np.log2(np.maximum(a, 1e-30)) - lo) / (hi - lo) * 254) + 1, 0)
            fn = name + '.jpg'; jpeg(os.path.join(OUT, fn), np.clip(v, 0, 255).astype(np.uint8)); e['lo'] = lo; e['hi'] = hi
        e['file'] = fn; e['bytes'] = os.path.getsize(os.path.join(OUT, fn)); total += e['bytes']
        ent[g] = e
    index['layers'][L] = ent
    print('lmimg', L, {g: (round(v['max'], 1) if v else 0) for g, v in ent.items()}, flush=True)
index['bytes'] = total
json.dump(index, open(os.path.join(OUT, 'index.json'), 'w'), indent=0)
print('lmimg total', ENC, K, total, flush=True)
