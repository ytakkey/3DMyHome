# 確認用のサーバー（127.0.0.1 のみ）：リポジトリのファイルを配信し、POST /save?path=bake/work/... で受け取ったデータを保存する（焼き込み用の形の書き出しに使う）
import http.server,pathlib,sys,urllib.parse
ROOT=pathlib.Path(__file__).resolve().parent.parent
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=str(ROOT),**k)
    def end_headers(s): s.send_header('Cache-Control','no-store'); super().end_headers()
    def do_POST(s):
        q=urllib.parse.parse_qs(urllib.parse.urlparse(s.path).query);p=(ROOT/q.get('path',[''])[0]).resolve()
        if not str(p).startswith(str((ROOT/'bake'/'work').resolve())): s.send_error(403);return
        p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(s.rfile.read(int(s.headers['Content-Length'])))
        s.send_response(200);s.end_headers();s.wfile.write(b'ok')
http.server.ThreadingHTTPServer(('127.0.0.1',int(sys.argv[1]) if len(sys.argv)>1 else 8765),H).serve_forever()
