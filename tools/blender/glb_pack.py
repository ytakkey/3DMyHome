# 検証ページ用の模型を、中身を変えずに小さくする：glb_pack.py <書き出した .glb> <出力の .glb.gz>（run.py gltf が書き出しの後に動かす）
#  1. 柄の画像（PNG）を可逆の WebP に替える（EXT_texture_webp。読み戻して全画素が同じことを確かめた物だけ。小さくならない物・色の変換の指定（gAMA・ICC）が付いた物は PNG のまま）
#  2. 全体を gzip で包む（形の数値は浮動小数のままで、約4割になる。ページ real/trial.js の loadGLB が DecompressionStream で戻す）
# 最後に出力を読み戻し、形のデータ（画像以外の bufferView）が元と1バイトも違わないことを確かめる
import gzip, io, json, struct, sys
from PIL import Image

def read_glb(b):
    assert b[:4] == b'glTF'
    ln = struct.unpack_from('<I', b, 8)[0]; o = 12; ch = []
    while o < ln:
        cl, ct = struct.unpack_from('<II', b, o); ch.append(b[o + 8:o + 8 + cl]); o += 8 + cl
    return json.loads(ch[0]), ch[1]

def to_webp(png):
    im = Image.open(io.BytesIO(png)); im.load()
    if im.mode not in ('RGB', 'RGBA', 'L', 'LA', 'P'):
        return None, 'mode ' + im.mode
    if 'icc_profile' in im.info or ('gamma' in im.info and abs(im.info['gamma'] - 0.45455) > 1e-3):
        return None, 'color profile'
    mode = 'RGBA' if im.mode in ('RGBA', 'LA') or 'transparency' in im.info else 'RGB'
    x = im.convert(mode); buf = io.BytesIO(); x.save(buf, 'WEBP', lossless=True, quality=100, method=6, exact=True); d = buf.getvalue()
    back = Image.open(io.BytesIO(d)); back.load()
    if back.size != x.size or back.convert(mode).tobytes() != x.tobytes():
        return None, 'not exact'
    if len(d) >= len(png):
        return None, 'not smaller'
    return d, None

src, out = sys.argv[1:3]
raw = open(src, 'rb').read(); js, bn = read_glb(raw)
bv = js['bufferViews']; view = lambda v: bn[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']]
orig = [view(v) for v in bv]; data = list(orig)
imgv = set(); n = 0; b0 = b1 = 0
for i, im in enumerate(js.get('images', [])):
    if 'bufferView' not in im:
        continue
    imgv.add(im['bufferView'])
    if im.get('mimeType') != 'image/png':
        continue
    d, err = to_webp(orig[im['bufferView']]); b0 += len(orig[im['bufferView']])
    if err:
        print('glbpack keep png', i, im.get('name'), err, flush=True); b1 += len(orig[im['bufferView']]); continue
    data[im['bufferView']] = d; im['mimeType'] = 'image/webp'; n += 1; b1 += len(d)
    for t in js.get('textures', []):
        if t.get('source') == i:
            t.setdefault('extensions', {})['EXT_texture_webp'] = {'source': i}; del t['source']
if n:
    for k in ('extensionsUsed', 'extensionsRequired'):
        js[k] = sorted(set(js.get(k, [])) | {'EXT_texture_webp'})
buf = bytearray()
for i in sorted(range(len(bv)), key=lambda i: bv[i].get('byteOffset', 0)):   # 元の並びのまま詰め直す（4バイトの境目に合わせる）
    buf += b'\0' * (-len(buf) % 4); bv[i]['byteOffset'] = len(buf); bv[i]['byteLength'] = len(data[i]); buf += data[i]
buf += b'\0' * (-len(buf) % 4); js['buffers'][0]['byteLength'] = len(buf)
jb = json.dumps(js, separators=(',', ':')).encode('utf-8'); jb += b' ' * (-len(jb) % 4)
glb = b'glTF' + struct.pack('<II', 2, 12 + 8 + len(jb) + 8 + len(buf)) + struct.pack('<I', len(jb)) + b'JSON' + jb + struct.pack('<I', len(buf)) + b'BIN\0' + bytes(buf)
z = io.BytesIO()
with gzip.GzipFile(filename='', fileobj=z, mode='wb', compresslevel=9, mtime=0) as f:   # mtime 0：同じ中身なら同じファイルになる
    f.write(glb)
open(out, 'wb').write(z.getvalue())
# 読み戻して確かめる
js2, bn2 = read_glb(gzip.decompress(open(out, 'rb').read())); bad = 0
for i, v in enumerate(js2['bufferViews']):
    d = bn2[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']]
    if d != (data[i] if i in imgv else orig[i]):
        bad += 1
M = lambda x: round(x / 2 ** 20, 2)
print('glbpack images', n, '/', len(js.get('images', [])), 'webp', M(b0), '->', M(b1), 'MB; glb', M(len(raw)), '->', M(len(glb)), 'MB; gz', M(len(z.getvalue())), 'MB; changed views', bad, flush=True)
if bad:
    sys.exit('glbpack: 読み戻しが元と違う')
