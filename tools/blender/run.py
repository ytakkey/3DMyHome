# Blender の作業をまとめて動かす（引数だけで呼べるように）：python -I tools/blender/run.py <作業> [引数...]
#  view <状態> <層,...> [露出] [視点,...]：焼いた層を足して撮り、bake/work/view/<状態>.jpg に並べる
#  sheet <フォルダ> <出力> <列> <幅> [名前の頭,...]：画像を並べる
#  py <スクリプト> [引数...]：bake_uv.blend を開いてスクリプトを動かす（調べる用）
#  prep：焼き込みの準備（bake_uv.blend）　bake [サンプル数] [層,...]：焼く（bake/work/lm）
#  status：焼き込みの進み具合（bake/work/layers）
import sys, os, subprocess, json
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BL = r'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe'
W = os.path.join(ROOT, 'bake', 'work')
LAY = os.path.join(W, 'lm')   # 焼いた層の置き場（bake_layers.py の出力）
T = os.path.join(ROOT, 'tools', 'blender')
a = sys.argv[1:]
def blender(blend, script, *args):
    r = subprocess.run([BL, '-b', blend, '-P', os.path.join(T, script), '--', *args], capture_output=True, text=True, encoding='utf-8', errors='replace')
    for line in (r.stdout + r.stderr).splitlines():
        if 'Error' in line or 'Traceback' in line or line.startswith(('uvdbg', 'repack', 'nan uv', 'baked', 'atlases')):
            print(line)
if a[0] == 'view':
    state, layers = a[1], a[2]
    out = os.path.join(W, 'view', state)
    blender(os.path.join(W, 'blender', 'bake_uv.blend'), 'view_baked.py', LAY, out, state, layers, *(a[3:5]))
    subprocess.run([sys.executable, '-I', os.path.join(T, 'sheet.py'), out, os.path.join(W, 'view', state + '.jpg'), '3', '640'])
elif a[0] == 'review':   # 焼いた層の確認：夜（照明すべて・廊下だけ）と昼を、ドア全開・全閉で撮り、bake/work/view/review_*.jpg に並べる
    O, C = 'SG311o_SG500wo_SG33so', 'SG311c_SG500wc_SG33sc'
    def night(s, d3, d2a, d2b, d1, d311):
        return ','.join(['bdl@' + d3, 'bbr@' + d3, 'j1@' + d2a, 'l1@' + d2b, 'k1@' + d1, 'h1@all'])
    day = lambda d3, d1, d311: ','.join(['sky_bed@' + d3, 'sun_bed@' + d3, 'sky_study@' + d1, 'sun_study@' + d1, 'sky_void@' + d311, 'sun_void@all', 'sky_ldk1F@all', 'sun_ldk1F@all'])
    states = [('night_on_open', night(0, O, 'SG311o_SG500wo', 'SG500wo_SG311o', 'SG33so', 'SG311o'), '80'),
              ('night_on_closed', night(0, C, 'SG311c_SG500wc', 'SG500wc_SG311c', 'SG33sc', 'SG311c'), '80'),
              ('night_hall_open', 'j1@SG311o_SG500wo', '80'),
              ('day_open', day(O, 'SG33so', 'SG311o'), '1500'),
              ('day_closed', day(C, 'SG33sc', 'SG311c'), '1500')]
    for st, ly, ex in states:
        tag = st + ('_SG311o_SG500wo_SG33so' if st.endswith('open') else '')
        out = os.path.join(W, 'view', st)
        blender(os.path.join(W, 'blender', 'bake_uv.blend'), 'view_baked.py', LAY, out, tag, ly, ex)
        subprocess.run([sys.executable, '-I', os.path.join(T, 'sheet.py'), out, os.path.join(W, 'view', 'review_' + st + '.jpg'), '4', '480'])
elif a[0] == 'prep':   # 焼き込みの準備（アトラスと UV）：house.blend → bake_uv.blend
    blender(os.path.join(W, 'blender', 'house.blend'), 'bake_layers.py', 'prep', os.path.join(W, 'blender', 'bake_uv.blend'))
elif a[0] == 'bake':   # 焼く：bake [サンプル数] [層,...]（済んだ層は飛ばす）。bake fresh <サンプル数>：前の結果を lm_old_<時刻> へ移してから全部焼く
    if a[1:2] == ['fresh']:
        import time
        if os.path.isdir(LAY):
            os.rename(LAY, LAY + '_old_' + time.strftime('%m%d%H%M'))
        a = a[:1] + a[2:]
    blender(os.path.join(W, 'blender', 'bake_uv.blend'), 'bake_layers.py', 'bake', LAY, *(a[1:3] or ['2048']))
elif a[0] == 'py':   # 調べる用：py <スクリプト> [引数...]（bake_uv.blend を開いて動かし、出力をすべて出す）
    r = subprocess.run([BL, '-b', os.path.join(W, 'blender', 'bake_uv.blend'), '-P', os.path.abspath(a[1]), '--', *a[2:]], capture_output=True, text=True, encoding='utf-8', errors='replace')
    print('\n'.join(l for l in (r.stdout + r.stderr).splitlines() if not l.startswith(('Fra:', '00:', 'Blender', 'Info'))))
elif a[0] == 'sheet':
    subprocess.run([sys.executable, '-I', os.path.join(T, 'sheet.py'), *a[1:]])
elif a[0] == 'status':
    d = LAY
    done = [x for x in os.listdir(d) if os.path.exists(os.path.join(d, x, 'done'))] if os.path.isdir(d) else []
    log = json.load(open(os.path.join(d, 'bake_log.json'))) if os.path.exists(os.path.join(d, 'bake_log.json')) else {}
    print(len(done), '/ 52 done', 'avg %.0fs' % (sum(v['sec'] for v in log.values()) / max(1, len(log))))
