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
SDIM = float(os.environ.get('LM_SMOOTH_DIM', '3'))   # 暗い所ほど幅を広げる倍率（その層・アトラスの明るい所の 1/4 より暗い所から広げ始め、1/1024 で 1＋SDIM 倍）
# 回数（SIT・FIT）は 2cm の画素で決めた。1cm の画素では同じ回数だと実寸のならす幅が半分になり、WIC の壁などにモヤが出た（2026-11-05 ユーザー）。
# 回数を4倍にすると変換が約12時間になるので、4回のうち3回は2画素先と混ぜ（1回で4回分の広がり）、回数は 1.25倍にして、実寸の幅を 2cm のときと同じにする
PXS = float(os.environ.get('LM_PX_SCALE', '2'))   # 2cm の画素の何倍細かいか
def steps(it):
    if PXS <= 1:
        return [1] * it
    return [1 if i % 4 == 3 else 2 for i in range(int(round(it * PXS * PXS / 3.25)))]

def vgsmooth(a, e, it=SIT, rng=SRNG):
    """頂点で焼く物：辺でつながった頂点どうし、明るさが近いものをならす（頂点の焼き込みのノイズ＝ベッドなどの広い面のまだらを消す。影の縁は残す）"""
    n = len(a); e0, e1 = e[:, 0], e[:, 1]
    y0 = np.log2(np.maximum(a @ np.array([0.2126, 0.7152, 0.0722]), 1e-9))   # 暗い所ほど幅を広げる（ismooth と同じ。窓の無いトイレの昼の便器のまだら。2026-10-28）
    ref = np.percentile(y0, 99) if n else 0.0
    R = rng * (1 + SDIM * np.clip((ref - y0 - 2) / 8, 0, 1)); rr = np.maximum(R[e0], R[e1])
    for _ in range(it):
        y = np.log2(np.maximum(a @ np.array([0.2126, 0.7152, 0.0722]), 1e-9))
        w = np.exp(-((y[e0] - y[e1]) ** 2) / (2 * rr * rr))
        ws = 1 + np.bincount(e0, w, n) + np.bincount(e1, w, n)
        a = np.stack([(a[:, c] + np.bincount(e0, a[e1, c] * w, n) + np.bincount(e1, a[e0, c] * w, n)) / ws for c in range(3)], 1)
    return a

LUM = np.array([0.2126, 0.7152, 0.0722])
def ismooth(As, Ls, LK=(), it=SIT, rng=SRNG):
    """ライトマップの島の中だけ、隣の画素と明るさが近いものどうしで少しずつならす（3×3 を it 回。光が回り込むだけの暗い所に残る、ノイズ除去のまだら＝黒いモヤを消す）。
    明るさの比が大きい所（影の縁・照明のすぐ近く）は、明るさの差の重み（対数で rng）でほとんど混ぜない。島の外（埋めた画素）はそのまま。
    As・Ls：アトラス→画像・島の番号。LK：同じ平面で隣り合う別の島の縁の画素の組（cover_mask.py の links。(アトラス1, アトラス2)→(行1, 列1, 行2, 列2)）。
    組の画素どうしも混ぜて、島の境目をまたいでならす（島ごとに閉じてならすと、細い島が平らになって隣の島との境目に段差が出た：階段の上の端のタレ壁。2026-11-05）"""
    R, inside = {}, {}
    for g, a in As.items():
        L = Ls[g]; inside[g] = L >= 0
        # 光が回り込むだけの暗い所（窓の無い部屋の昼など）はノイズが大きく、明るさの近い所だけならすと、ノイズ除去のまだら（モヤ）が残る
        # → 暗い所ほど幅を広げる（そのアトラスの明るい所＝島の中の上位1%の明るさを基準に。明るい所の影の縁は今のまま。2026-10-28）
        y0 = np.log2(np.maximum(a @ LUM, 1e-9))
        ref = np.percentile(y0[inside[g]], 99) if inside[g].any() else 0.0
        R[g] = rng * (1 + SDIM * np.clip((ref - y0 - 2) / 8, 0, 1))
    def link(acc, wsum, ya, wf):   # 組の画素どうしを混ぜる（両方向）
        for (g1, g2), (y1, x1, y2, x2) in LK.items() if LK else ():
            if g1 not in As or g2 not in As:
                continue
            a1, a2 = As[g1][y1, x1], As[g2][y2, x2]
            w = wf(g1, y1, x1, g2, y2, x2, ya)
            np.add.at(acc[g1], (y1, x1), a2 * w[:, None]); np.add.at(wsum[g1], (y1, x1), w)
            np.add.at(acc[g2], (y2, x2), a1 * w[:, None]); np.add.at(wsum[g2], (y2, x2), w)
    def wl(g1, y1, x1, g2, y2, x2, ya):
        rr = np.maximum(R[g1][y1, x1], R[g2][y2, x2])
        return np.exp(-((ya[g1][y1, x1] - ya[g2][y2, x2]) ** 2) / (2 * rr * rr))
    for k in steps(it):
        ya = {g: np.log2(np.maximum(a @ LUM, 1e-9)) for g, a in As.items()}; acc, wsum = {}, {}
        for g, a in As.items():
            L, y, h, w = Ls[g], ya[g], *Ls[g].shape
            acc[g] = a.copy(); wsum[g] = np.ones((h, w))
            for dy, dx in ((-k, 0), (k, 0), (0, -k), (0, k), (-k, -k), (-k, k), (k, -k), (k, k)):
                ws = 0.5 if dx and dy else 1.0
                ys0, ys1 = max(0, dy), h + min(0, dy); xs0, xs1 = max(0, dx), w + min(0, dx)
                src = (slice(ys0, ys1), slice(xs0, xs1)); dst = (slice(ys0 - dy, ys1 - dy), slice(xs0 - dx, xs1 - dx))
                rr = np.maximum(R[g][src], R[g][dst])
                wt = ws * np.exp(-((y[src] - y[dst]) ** 2) / (2 * rr * rr)) * ((L[src] == L[dst]) & inside[g][dst])
                acc[g][dst] += a[src] * wt[..., None]; wsum[g][dst] += wt
        link(acc, wsum, ya, wl)
        As = {g: np.where(inside[g][..., None], acc[g] / wsum[g][..., None], As[g]) for g in As}
    for _ in range(2):   # 最後に明るさの差を問わず軽くぼかす（画素の段々＝日なたの縁のギザギザを和らげる。E4）
        acc, wsum = {}, {}
        for g, a in As.items():
            L, h, w = Ls[g], *Ls[g].shape
            acc[g] = a.copy(); wsum[g] = np.ones((h, w))
            for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                ys0, ys1 = max(0, dy), h + min(0, dy); xs0, xs1 = max(0, dx), w + min(0, dx)
                src = (slice(ys0, ys1), slice(xs0, xs1)); dst = (slice(ys0 - dy, ys1 - dy), slice(xs0 - dx, xs1 - dx))
                wt = 0.5 * ((L[src] == L[dst]) & inside[g][dst])
                acc[g][dst] += a[src] * wt[..., None]; wsum[g][dst] += wt
        link(acc, wsum, None, lambda g1, y1, x1, g2, y2, x2, ya: np.full(len(y1), 0.5))
        As = {g: np.where(inside[g][..., None], acc[g] / wsum[g][..., None], As[g]) for g in As}
    return As
def cfill(a, L, C):
    """ほかの部品にぴったり覆われて見えない画素（cover_mask.py。棚板の端が当たった壁など）を、同じ島の見える画素の明るさで外側から順に埋める。
    覆われた所は真っ黒に焼け、ならし・表示の Bスプラインで見える所へにじんで、WIC の壁の角に黒いしみが出ていた（2026-11-05 ユーザー）"""
    h, w = L.shape
    # 覆われた画素に接する、周りの見える画素の 1/10 より暗い画素も覆われた側に入れる（覆う物の縁のすぐ外は、画素の中心が覆う物の陰で黒く焼けるが、
    # 覆う物の面からはずれて印が付かない。それを見える画素として埋めると黒が広がり、WIC の南の角の棚の上にしみが出た。2026-11-06）
    y = a.max(2); C = C.copy()
    for _ in range(3):
        k = np.where((L >= 0) & ~C, y, 0); ref = k.copy()
        for dy in range(-2, 3):
            for dx in range(-2, 3):
                ref = np.maximum(ref, np.roll(np.roll(k, dy, 0), dx, 1))
        near = C.copy()
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            near |= np.roll(np.roll(C, dy, 0), dx, 1)
        add = near & ~C & (L >= 0) & (y < ref * 0.1)
        if not add.any():
            break
        C |= add
    todo = C & (L >= 0); known = (L >= 0) & ~C
    for _ in range(64):   # 64画素より奥（大きな家具の下の床の真ん中）は見えず、にじむ所でもないのでそのまま
        if not todo.any():
            break
        acc = np.zeros_like(a); cnt = np.zeros((h, w))
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)):
            ys0, ys1 = max(0, dy), h + min(0, dy); xs0, xs1 = max(0, dx), w + min(0, dx)
            src = (slice(ys0, ys1), slice(xs0, xs1)); dst = (slice(ys0 - dy, ys1 - dy), slice(xs0 - dx, xs1 - dx))
            wt = known[src] & (L[src] == L[dst]) & todo[dst]
            acc[dst] += a[src] * wt[..., None]; cnt[dst] += wt
        got = cnt > 0
        a[got] = acc[got] / cnt[got][:, None]; known |= got; todo &= ~got
    return a
def efill(a, L, n=2):
    """島の外の画素のうち、島から n 画素以内を、ならした後の島の明るさで外側へ順に埋める（表示の Bスプラインは縁から2画素先まで読む）。
    画素の中心が面に乗らない縁の画素（島の外）は焼いたままの暗い値で残り、タレ壁と上の壁の境目に暗い線が出ていた（2026-11-06。上の壁の下の端の
    高さ 1cm の帯の画素）"""
    h, w = L.shape; known = L >= 0
    for _ in range(n):
        acc = np.zeros_like(a); cnt = np.zeros((h, w))
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)):
            ys0, ys1 = max(0, dy), h + min(0, dy); xs0, xs1 = max(0, dx), w + min(0, dx)
            src = (slice(ys0, ys1), slice(xs0, xs1)); dst = (slice(ys0 - dy, ys1 - dy), slice(xs0 - dx, xs1 - dx))
            wt = known[src] & ~known[dst]
            acc[dst] += a[src] * wt[..., None]; cnt[dst] += wt
        got = cnt > 0
        a[got] = acc[got] / cnt[got][:, None]; known |= got
    return a
FIT = int(os.environ.get('LM_FAR_IT', '300'))   # 光源の部屋からドア2枚以上先の層の、島の中のぼかしの回数（3×3。2cm の画素で幅 約30cm）

def iblur(a, L, it=FIT, sparse_only=False):
    """島の中だけ、明るさの差を問わず 3×3 で it 回ぼかす（島全体をなめらかな形に）。
    sparse_only：点の集まりになった島（島の上位10%の 1/100 未満の画素が3割以上）だけ。ドアの周りのアトラスには近い側の部屋の面（照明の光の縁が見える枠など）も入るので"""
    h, w = L.shape; inside = L >= 0
    if sparse_only:
        y = a @ np.array([0.2126, 0.7152, 0.0722]); keep = np.zeros(int(L.max()) + 1, bool)
        for i in np.unique(L[inside]):
            v = y[L == i]; p = np.percentile(v, 90)
            keep[i] = p > 0 and (v < p / 100).mean() >= 0.3
        inside = inside & keep[np.maximum(L, 0)]
        if not inside.any():
            return a
    for k in steps(it):
        acc = a.copy(); wsum = np.ones((h, w))
        for dy, dx in ((-k, 0), (k, 0), (0, -k), (0, k)):
            ys0, ys1 = max(0, dy), h + min(0, dy); xs0, xs1 = max(0, dx), w + min(0, dx)
            src = (slice(ys0, ys1), slice(xs0, xs1)); dst = (slice(ys0 - dy, ys1 - dy), slice(xs0 - dx, xs1 - dx))
            wt = (L[src] == L[dst]) & inside[dst]
            acc[dst] += a[src] * wt[..., None]; wsum[dst] += wt
        a = np.where(inside[..., None], acc / wsum[..., None], a)
    return a

def vblur(a, e, it=FIT // 2):
    """頂点で焼く物：辺でつながった頂点どうし、明るさの差を問わず it 回ならす"""
    n = len(a); e0, e1 = e[:, 0], e[:, 1]; ws = 1 + np.bincount(e0, None, n) + np.bincount(e1, None, n)
    for _ in range(it):
        a = np.stack([(a[:, c] + np.bincount(e0, a[e1, c], n) + np.bincount(e1, a[e0, c], n)) / ws for c in range(3)], 1)
    return a

# 光源の部屋からドア2枚以上先の部屋（窓の無いトイレへ LDK の窓の光など）：光は何度も跳ね返ってから届くだけで、焼くと数画素の点の集まりになり
# （サンプルを4倍にしても変わらない）、暗い所ほど強くならしてもしみになった。光はなめらかに変わるはずなので、その部屋のアトラス
# （ドアの周りのアトラスは、つなぐ部屋のどちらかが2枚以上先なら）だけ、島の中で大きくぼかす（2026-10-29）
ROOMS = json.load(open(os.path.join(LD, 'rooms.json'))) if os.path.exists(os.path.join(LD, 'rooms.json')) else None
def far(layer, g):
    if not ROOMS:
        return False
    home = ROOMS['home'].get(layer.split('@')[0])
    if not home:
        return False
    one = {r: grp[0] for grp in ROOMS['joined'] for r in grp}
    nb = {}
    for a_, b_ in ROOMS['adj'].values():
        a_, b_ = one.get(a_, a_), one.get(b_, b_)
        nb.setdefault(a_, set()).add(b_); nb.setdefault(b_, set()).add(a_)
    dist = {one.get(home, home): 0}; q = [one.get(home, home)]
    while q:
        r = q.pop(0)
        for s in nb.get(r, ()):
            if s not in dist:
                dist[s] = dist[r] + 1; q.append(s)
    g = g[2:] if g.startswith('V_') else g
    rooms = ROOMS['adj'].get(g[5:], ()) if g.startswith('door_') else (g,)
    # 窓の光（sky_・sun_）は、窓の無い部屋（その部屋の sky_ の層が無い）へはドア1枚先でも跳ね返った光だけが届く。焼くとまだらになり、
    # 明るさの近い所だけのならしでは WIC の南の角の棚の上に黒いしみが残った（2026-11-07）→ ドア2枚先と同じに大きくぼかす
    lit = {one.get(h, h) for k, h in ROOMS['home'].items() if k.startswith('sky_')}
    need = 1 if layer.split('@')[0].startswith(('sky_', 'sun_')) else 2
    return any(dist.get(one.get(r, r), 0) >= (need if one.get(r, r) not in lit else 2) for r in rooms)
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

# 島の境目をまたぐ画素の組（cover_mask.py）：(アトラス1, アトラス2) → (行1, 列1, 行2, 列2)
LKALL = {}
if os.path.exists(os.path.join(LD, '_labels', 'links.npz')):
    z = np.load(os.path.join(LD, '_labels', 'links.npz')); nm = [str(x) for x in z['names']]
    for a1, y1, x1, a2, y2, x2 in z['links']:
        LKALL.setdefault((nm[a1], nm[a2]), []).append((y1, x1, y2, x2))
    LKALL = {k: tuple(np.array(v, np.int64).T) for k, v in LKALL.items()}
    # 覆われた画素（cover_mask.py）を含む組は外す：覆われた所は見える画素から埋めた作り物の値で、壁の厚みを貫いて部屋の向こう側の明るさを運ぶ
    # （SG11H の枠の裏の面は壁の中で覆われ、LDK 側の端の明るさで埋まり、同じ平面の玄関ホール側の額縁の横の面へ組で混ざって、扉を閉めても LDK の照明で光った。2026-11-07）
    CV = {}
    def cov(g):
        if g not in CV:
            f = os.path.join(LD, '_labels', g + '_cover.npy')
            CV[g] = np.load(f) if os.path.exists(f) else None
        return CV[g]
    for (g1, g2), (y1, x1, y2, x2) in list(LKALL.items()):
        c1, c2 = cov(g1), cov(g2)
        ok = np.ones(len(y1), bool)
        if c1 is not None:
            ok &= ~c1[y1, x1]
        if c2 is not None:
            ok &= ~c2[y2, x2]
        LKALL[(g1, g2)] = (y1[ok], x1[ok], y2[ok], x2[ok])
    print('lmimg links', sum(len(v[0]) for v in LKALL.values()), flush=True)
index = {'enc': ENC, 'scale': K, 'layers': {}, 'res': {}}
total = 0
# 照明の層は、ならした後の値（画像にする前の lux）を <層のフォルダ>_proc/<層>/<アトラス>.npy に残す（allon.py が全点灯の足し合わせを作る。2026-11-09）
PROC = LD.rstrip('/\\') + '_proc' if K == 1 and ENC == 'rgbm' else None
def keep(L, g, a):
    if PROC is None or L.startswith(('sky_', 'sun_', 'g1d@')):
        return
    try:
        os.makedirs(os.path.join(PROC, L), exist_ok=True); np.save(os.path.join(PROC, L, g + '.npy'), np.minimum(a, 65504).astype(np.float16))
    except Exception as x:
        print('lmimg keep failed', L, g, x, flush=True)
for L in sorted(os.listdir(LD)):
    d = os.path.join(LD, L)
    if not os.path.isfile(os.path.join(d, 'done')):
        continue
    ent, A = {}, {}
    for f in sorted(os.listdir(d)):
        if not f.endswith('.npy'):
            continue
        g = f[:-4]
        a = np.load(os.path.join(d, f)).astype(np.float32)
        if g.startswith('V_'):   # 頂点で焼く物（点ごとの RGB）：方式によらず RGBM の PNG（幅1024の行に並べる）
            a = np.nan_to_num(np.maximum(a, 0), posinf=65504.0); n = len(a); index.setdefault('vn', {})[g[2:]] = n
            ef = os.path.join(LD, '_labels', g + '_edges.npy')
            if SIT > 0 and os.path.exists(ef):
                a = vgsmooth(a.astype(np.float64), np.load(ef))
                a = (vblur(a, np.load(ef)) if FIT > 0 and far(L, g) else a).astype(np.float32)
            mx = float(a.max()); name = '%s__%s' % (L.replace('@', '_'), g)
            if mx <= 0:
                ent[g] = None; continue
            keep(L, g, a)
            rows = (n + 1023) // 1024; b = np.zeros((rows * 1024, 3), np.float32); b[:n] = a; b = b.reshape(rows, 1024, 3)
            c = b.max(2); m8 = np.ceil(np.sqrt(np.clip(c / mx, 0, 1)) * 255); M = (m8 / 255) ** 2 * mx
            rgb = np.where(M[..., None] > 0, np.round(b / np.maximum(M, 1e-30)[..., None] * 255), 0)
            fn = name + '.png'; png(os.path.join(OUT, fn), np.concatenate([np.clip(rgb, 0, 255), m8[..., None]], 2).astype(np.uint8), 8)
            ent[g] = {'max': mx, 'n': n, 'file': fn, 'bytes': os.path.getsize(os.path.join(OUT, fn))}; total += ent[g]['bytes']
            continue
        if not np.isfinite(a).all():
            print('lmimg nonfinite', L, g, int((~np.isfinite(a)).sum()), flush=True)
            a = np.nan_to_num(a, nan=0.0, posinf=65504.0)
        A[g] = np.maximum(a, 0)
    # ライトマップ：層のアトラスをまとめてならす（島の境目の組は、アトラスをまたぐものもある）
    As, Ls = {}, {}
    for g, a in A.items():
        lf = os.path.join(LD, '_labels', g + '.npy')
        if SIT > 0 and os.path.exists(lf):
            Ls[g] = np.load(lf); As[g] = a.astype(np.float64); cf = os.path.join(LD, '_labels', g + '_cover.npy')
            if os.path.exists(cf):
                As[g] = cfill(As[g], Ls[g], np.load(cf))
    if As:
        As = ismooth(As, Ls, LKALL)
    for g in sorted(A):
        a = A[g]
        if g in As:
            a = efill(iblur(As[g], Ls[g], sparse_only=g.startswith('door_')) if FIT > 0 and far(L, g) else As[g], Ls[g]).astype(np.float32)
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
        keep(L, g, a)
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
if os.path.exists(os.path.join(LD, 'alias.json')):   # すべての組み合わせの名前 → アトラス → 焼いたフォルダ（効かないドアの違いは同じ画像を使う。bake_layers.py の jobs）
    lay = dict(index['layers'])
    for name, m in json.load(open(os.path.join(LD, 'alias.json'))).items():
        ent = {}
        for g, fn in m.items():
            e = lay.get(fn, {})
            for k in (g, 'V_' + g):
                if k in e:
                    ent[k] = e[k]
        index['layers'][name] = ent
if os.path.exists(os.path.join(LD, 'combos.json')):   # 光源→関係するドア（bake_layers.py の COMBOS）
    index['combos'] = json.load(open(os.path.join(LD, 'combos.json')))
index['bytes'] = total
json.dump(index, open(os.path.join(OUT, 'index.json'), 'w'), indent=0)
print('lmimg total', ENC, K, total, flush=True)
