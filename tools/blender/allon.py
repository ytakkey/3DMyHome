# 全点灯（照明すべて）の足し合わせを、アトラスごと・ドアの開閉ごとに前もって作る（2026-11-09 ユーザー了承「その案いいね」）
# 使い方：run.py allon（lmimg rgbm 1 stg の後。lm_images.py が残した、ならした後の値 bake/work/lm_proc/<層>/<アトラス>.npy を足す）
# 全点灯は層が約300枚（約110MB）あり、ページで取得・展開して足すのに PC でも 5〜7 秒かかっていた（ほとんどが取得と展開。GPU で足すのは 0.15 秒）。
# 前もって足しておけば、全点灯はアトラスごとに1枚（約30枚・約13MB）を読むだけになる。
# 足し方はページ（stg/trial.js の wanted）と同じ：照明ごとに、いまのドアの開閉の層を、色温度の色（TINT）を掛けて足す。G1 のまっすぐ届く光（g1d）は模様を掛けるので入れない（ページで別に足す）。
# 同じアトラスで、ドアの開閉が違っても照明ごとの焼いたフォルダ（alias）がすべて同じなら同じ足し合わせ＝1枚にまとめる（効かないドアの違いは焼き分けていない）。
# 出力：stg/lm/allon__<アトラス>__<番号>.png（RGBM。頂点の物は幅1024の行）と、stg/lm/index.json の allon：
#   {doors:[ドア…], atl:{アトラス:{e:[画像の情報…], m:[ドアの開閉 2^n 通り → e の番号（-1＝光が届かない）]}}}。開閉の番号は doors[i] が開なら i ビット目が1
import sys, os, json, itertools, zlib, struct
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LD = os.path.join(ROOT, 'bake', 'work', 'lm'); PROC = LD + '_proc'; OUT = os.path.join(ROOT, 'stg', 'lm')
idx = json.load(open(os.path.join(OUT, 'index.json'), encoding='utf-8'))
alias = json.load(open(os.path.join(LD, 'alias.json')))
C = idx['combos']
# 照明のボタン（trial.js の LS）と、一緒に点く層（WITH。g1d は除く）
LS = ['a6', 'a4', 'a2', 'h1', 'a5', 'a3', 'a1', 'bdl', 'bbr', 'j1', 'l1', 'k1', 'd1', 'e1', 'eh', 'ec', 'ek', 'g1', 'bath']
WITH = {'eh': ['b3']}
# 色温度の色（trial.js の KC・TINT と同じ：4章の色を線形にして明るさ1にそろえる。変えるときは両方）
def KC(h):
    c = [((v / 255 + 0.055) / 1.055) ** 2.4 if v / 255 > 0.04045 else v / 255 / 12.92 for v in ((h >> 16) & 255, (h >> 8) & 255, h & 255)]
    y = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
    return np.array([v / y for v in c], np.float32)
K2700, K3500, K5000, K2400 = KC(0xffc68e), KC(0xffd9b4), KC(0xfff3e8), KC(0xffb066)
TINT = {'bdl': K2700, 'bbr': K2700, 'j1': K2700, 'h1': K3500, 'k1': K3500, 'l1': K5000, 'a1': K3500, 'a2': K3500, 'a4': K3500, 'a6': K3500, 'a3': K2700, 'a5': K2400,
        'd1': K5000, 'e1': K3500, 'eh': K2700, 'b3': K2400, 'ec': K2700, 'ek': K2700, 'g1': K2700, 'bath': K5000}
SRC = [q for k in LS for q in [k] + WITH.get(k, [])]
DOORS = sorted({d for s in SRC for d in C.get(s, [])})
def lname(s, st):
    return s + '@' + ('_'.join(d + ('o' if st[d] else 'c') for d in C.get(s, [])) or 'all')

def png(path, a):   # lm_images.py の png と同じ（8bit の RGBA、各行に Paeth）
    h, w, c = a.shape; raw = a.astype(np.uint8).reshape(h, w * c); bpp = c
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
    open(path, 'wb').write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(data, 9)) + chunk(b'IEND', b''))
def rgbm(a, mx):   # lm_images.py と同じ RGBM（lux＝RGB×A²×max）
    c = a.max(-1); m8 = np.ceil(np.sqrt(np.clip(c / mx, 0, 1)) * 255); M = (m8 / 255) ** 2 * mx
    rgb = np.where(M[..., None] > 0, np.round(a / np.maximum(M, 1e-30)[..., None] * 255), 0)
    return np.concatenate([np.clip(rgb, 0, 255), m8[..., None]], -1).astype(np.uint8)

for f in os.listdir(OUT):   # 前の分を消す
    if f.startswith('allon__'):
        os.remove(os.path.join(OUT, f))
atl = sorted(set(idx['res']) | {'V_' + g for g in idx.get('vn', {})})
res = {'doors': DOORS, 'atl': {}}; total = 0; nfile = 0
for g in atl:
    base = g[2:] if g.startswith('V_') else g
    keys, m = {}, []
    for bits in range(2 ** len(DOORS)):
        st = {d: bool(bits >> i & 1) for i, d in enumerate(DOORS)}
        key = []
        for s in SRC:
            n = lname(s, st); e = idx['layers'].get(n, {}).get(g)
            if e:
                key.append((s, alias.get(n, {}).get(base, n)))
        key = tuple(key)
        if not key:
            m.append(-1); continue
        if key not in keys:
            keys[key] = len(keys)
        m.append(keys[key])
    ents = []
    for key, j in sorted(keys.items(), key=lambda kv: kv[1]):
        acc = None
        for s, fold in key:
            a = np.load(os.path.join(PROC, fold, g + '.npy')).astype(np.float32) * TINT[s]
            acc = a if acc is None else acc + a
        mx = float(acc.max()); fn = 'allon__%s__%d.png' % (g, j)
        if g.startswith('V_'):
            n = len(acc); rows = (n + 1023) // 1024; b = np.zeros((rows * 1024, 3), np.float32); b[:n] = acc
            png(os.path.join(OUT, fn), rgbm(b.reshape(rows, 1024, 3), mx)); e = {'max': mx, 'n': n, 'file': fn}
        else:
            png(os.path.join(OUT, fn), rgbm(acc, mx)); e = {'max': mx, 'file': fn}
        e['bytes'] = os.path.getsize(os.path.join(OUT, fn)); total += e['bytes']; nfile += 1
        ents.append(e)
    res['atl'][g] = {'e': ents, 'm': m}
    print('allon', g, len(ents), 'files', round(sum(e['bytes'] for e in ents) / 2 ** 20, 1), 'MB', flush=True)
idx['allon'] = res
json.dump(idx, open(os.path.join(OUT, 'index.json'), 'w'), indent=0)
print('allon total', nfile, 'files', round(total / 2 ** 20, 1), 'MB', flush=True)
