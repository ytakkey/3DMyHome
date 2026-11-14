# 検証ページ（real/lm/）のライトマップの画像を、画素を1つも変えずに小さくする：RGBM の PNG → 可逆の WebP（約25%小さい。lmimg・allon の後に動かす）
#   python -I lm_webp.py <real/lm> [並べて動かす数]
# WebP は透明度を持たせない（ブラウザの画像の読み込みは、透明度で色の値を丸める端末がある＝RGBM が崩れる）：幅 W・高さ 2H の RGB の画像にして、
#   上の半分（行 0〜H-1）＝元の RGB、下の半分（行 H〜2H-1）＝元の A（M）を R・G・B に入れる。ページ（real/trial.js の getTex）が GPU で元の RGBA に戻す
# 頂点で焼く物（V_<アトラス>）の PNG はそのまま（ページが CPU で画素を読む。全部で約40MB）
# 変換のたびに、WebP を読み戻して元の PNG と全画素が同じことを確かめてから PNG を消す。index.json の file・bytes を書き換え、一覧に無い画像（前の版の残り）は消す
import io, json, os, sys
from multiprocessing import Pool
from PIL import Image

def conv(a):
    d, f = a; p = os.path.join(d, f); q = p[:-4] + '.webp'
    if not os.path.exists(p) and os.path.exists(q):   # 途中で止まった続き（PNG を消した後で一覧を書く前に止まった）
        return f, os.path.getsize(q), None
    im = Image.open(p); im.load()
    if im.mode != 'RGBA':
        return f, None, 'mode ' + im.mode
    w, h = im.size; r, g, b, m = im.split()
    sp = Image.new('RGB', (w, h * 2)); sp.paste(Image.merge('RGB', (r, g, b)), (0, 0)); sp.paste(Image.merge('RGB', (m, m, m)), (0, h))
    buf = io.BytesIO(); sp.save(buf, 'WEBP', lossless=True, quality=100, method=6); data = buf.getvalue()
    back = Image.open(io.BytesIO(data)); back.load()
    if back.mode != 'RGB' or back.size != sp.size or back.tobytes() != sp.tobytes():
        return f, None, 'not exact'
    open(q, 'wb').write(data); os.remove(p)
    return f, len(data), None

if __name__ == '__main__':
    d = sys.argv[1]; n = int(sys.argv[2]) if sys.argv[2:] else max(1, (os.cpu_count() or 4) - 2)
    ip = os.path.join(d, 'index.json'); idx = json.load(open(ip, encoding='utf-8'))
    if idx.get('enc') != 'rgbm':
        sys.exit('lmwebp: RGBM の画像だけ（enc=%s）' % idx.get('enc'))
    ents = []   # ライトマップの画像の一覧の項目（層・全点灯）。頂点の物は入れない
    for e in idx['layers'].values():
        ents += [v for g, v in e.items() if v and not g.startswith('V_')]
    for g, a in (idx.get('allon') or {}).get('atl', {}).items():
        if not g.startswith('V_'):
            ents += a['e']
    todo = sorted({e['file'] for e in ents if e['file'].endswith('.png')})
    before = sum(os.path.getsize(os.path.join(d, f)) for f in todo)
    print('lmwebp', len(todo), 'files', round(before / 2 ** 20, 1), 'MB', 'x', n, flush=True)
    size, bad, k = {}, 0, 0
    with Pool(n) as pool:
        for f, s, err in pool.imap_unordered(conv, [(d, f) for f in todo]):
            k += 1
            if err:
                bad += 1; print('lmwebp FAILED', f, err, flush=True)
            else:
                size[f] = s
            if k % 100 == 0:
                print('  ', k, '/', len(todo), flush=True)
    for e in ents:
        if e['file'] in size:
            e['bytes'] = size[e['file']]; e['file'] = e['file'][:-4] + '.webp'
    used = {}
    for e in idx['layers'].values():
        for v in e.values():
            if v:
                used[v['file']] = v['bytes']
    idx['bytes'] = sum(used.values())   # 層の画像の合計（同じ画像は1回。全点灯の分は入れない＝lm_images.py と同じ）
    for a in (idx.get('allon') or {}).get('atl', {}).values():
        for v in a['e']:
            used[v['file']] = v['bytes']
    json.dump(idx, open(ip, 'w'), indent=0)
    gone = [f for f in os.listdir(d) if f.endswith(('.png', '.webp')) and f not in used]
    for f in gone:
        os.remove(os.path.join(d, f))
    after = sum(size.values())
    print('lmwebp done', len(size), 'files', round(before / 2 ** 20, 1), '->', round(after / 2 ** 20, 1), 'MB', 'failed', bad, 'removed', len(gone), 'total', round(sum(used.values()) / 2 ** 20, 1), 'MB', flush=True)
