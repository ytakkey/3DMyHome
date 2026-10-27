# 焼いた層（bake/work/lm/<層>/<アトラス>.npy。lux の RGB、float16）を、ブラウザの検証ページ（stg/）で読む画像に変換する
# 使い方：blender -b --factory-startup -P tools/blender/lm_images.py -- <層のフォルダ> <出力のフォルダ> <方式> <縮小>（run.py lmimg）
#  方式：h16＝半精度そのまま（16bit の PNG の RGB に float16 のビットを入れる。値は焼いたまま＝圧縮なし）
#        rgbm＝RGBM（8bit の PNG の RGBA。lux＝RGB×A²×S、S は画像ごとの最大値）
#        logj＝対数の JPEG（8bit の RGB。lux＝2^(lo＋(値−1)/254×(hi−lo))、値0は0。画質90）
#  縮小：1＝焼いたまま、2・4＝縦横 1/2・1/4（2×2・4×4 の平均）
#  頂点で焼く物（V_<アトラス>.npy）は、方式によらず RGBM の PNG（幅1024。index の vn に頂点の数）
#  画像の行は上が v＝1（glTF の UV の向き。three.js で flipY なしで読む）。一覧は <出力>/index.json（層→アトラス→ファイルと値の範囲）
import sys, os, json, zlib, struct, math
import numpy as np
argv = sys.argv[sys.argv.index('--') + 1:]
LD, OUT, ENC, K = argv[0], argv[1], argv[2], int(argv[3])
SIT, SRNG = int(os.environ.get('LM_SMOOTH_IT', '50')), float(os.environ.get('LM_SMOOTH_RANGE', '0.45'))   # ならす回数・明るさの差の幅（対数 2 の底）

def vgsmooth(a, e, it=SIT, rng=SRNG):
    """頂点で焼く物：辺でつながった頂点どうし、明るさが近いものをならす（頂点の焼き込みのノイズ＝ベッドなどの広い面のまだらを消す。影の縁は残す）"""
    n = len(a); e0, e1 = e[:, 0], e[:, 1]
    for _ in range(it):
        y = np.log2(np.maximum(a @ np.array([0.2126, 0.7152, 0.0722]), 1e-9))
        w = np.exp(-((y[e0] - y[e1]) ** 2) / (2 * rng * rng))
        ws = 1 + np.bincount(e0, w, n) + np.bincount(e1, w, n)
        a = np.stack([(a[:, c] + np.bincount(e0, a[e1, c] * w, n) + np.bincount(e1, a[e0, c] * w, n)) / ws for c in range(3)], 1)
    return a

def ismooth(a, L, it=SIT, rng=SRNG):
    """ライトマップの島の中だけ、隣の画素と明るさが近いものどうしで少しずつならす（3×3 を it 回。光が回り込むだけの暗い所に残る、ノイズ除去のまだら＝黒いモヤを消す）。
    明るさの比が大きい所（影の縁・照明のすぐ近く）は、明るさの差の重み（対数で rng）でほとんど混ぜない。島の外（埋めた画素）はそのまま"""
    h, w = L.shape; inside = L >= 0
    for _ in range(it):
        y = np.log2(np.maximum(a @ np.array([0.2126, 0.7152, 0.0722]), 1e-9))
        acc = a.copy(); wsum = np.ones((h, w))
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)):
            ws = 0.5 if dx and dy else 1.0
            ys0, ys1 = max(0, dy), h + min(0, dy); xs0, xs1 = max(0, dx), w + min(0, dx)
            src = (slice(ys0, ys1), slice(xs0, xs1)); dst = (slice(ys0 - dy, ys1 - dy), slice(xs0 - dx, xs1 - dx))
            wt = ws * np.exp(-((y[src] - y[dst]) ** 2) / (2 * rng * rng)) * ((L[src] == L[dst]) & inside[dst])
            acc[dst] += a[src] * wt[..., None]; wsum[dst] += wt
        a = np.where(inside[..., None], acc / wsum[..., None], a)
    for _ in range(2):   # 最後に明るさの差を問わず軽くぼかす（画素の段々＝日なたの縁のギザギザを和らげる。E4）
        acc = a.copy(); wsum = np.ones((h, w))
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            ys0, ys1 = max(0, dy), h + min(0, dy); xs0, xs1 = max(0, dx), w + min(0, dx)
            src = (slice(ys0, ys1), slice(xs0, xs1)); dst = (slice(ys0 - dy, ys1 - dy), slice(xs0 - dx, xs1 - dx))
            wt = 0.5 * ((L[src] == L[dst]) & inside[dst])
            acc[dst] += a[src] * wt[..., None]; wsum[dst] += wt
        a = np.where(inside[..., None], acc / wsum[..., None], a)
    return a
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
        if g.startswith('V_'):   # 頂点で焼く物（点ごとの RGB）：方式によらず RGBM の PNG（幅1024の行に並べる）
            a = np.nan_to_num(np.maximum(a, 0), posinf=65504.0); n = len(a); index.setdefault('vn', {})[g[2:]] = n
            ef = os.path.join(LD, '_labels', g + '_edges.npy')
            if SIT > 0 and os.path.exists(ef):
                a = vgsmooth(a.astype(np.float64), np.load(ef)).astype(np.float32)
            mx = float(a.max()); name = '%s__%s' % (L.replace('@', '_'), g)
            if mx <= 0:
                ent[g] = None; continue
            rows = (n + 1023) // 1024; b = np.zeros((rows * 1024, 3), np.float32); b[:n] = a; b = b.reshape(rows, 1024, 3)
            c = b.max(2); m8 = np.ceil(np.sqrt(np.clip(c / mx, 0, 1)) * 255); M = (m8 / 255) ** 2 * mx
            rgb = np.where(M[..., None] > 0, np.round(b / np.maximum(M, 1e-30)[..., None] * 255), 0)
            fn = name + '.png'; png(os.path.join(OUT, fn), np.concatenate([np.clip(rgb, 0, 255), m8[..., None]], 2).astype(np.uint8), 8)
            ent[g] = {'max': mx, 'n': n, 'file': fn, 'bytes': os.path.getsize(os.path.join(OUT, fn))}; total += ent[g]['bytes']
            continue
        if not np.isfinite(a).all():
            print('lmimg nonfinite', L, g, int((~np.isfinite(a)).sum()), flush=True)
            a = np.nan_to_num(a, nan=0.0, posinf=65504.0)
        a = np.maximum(a, 0)
        lf = os.path.join(LD, '_labels', g + '.npy')
        if SIT > 0 and os.path.exists(lf):
            a = ismooth(a.astype(np.float64), np.load(lf)).astype(np.float32)
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
