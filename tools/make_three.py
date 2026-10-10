# three の npm パッケージ（build/three.core.js と build/three.module.js）を、file:// でも読める普通のスクリプト（window.THREE）に変換する
# 使い方：python tools/make_three.py <展開した package フォルダ> <出力ファイル>
import re,sys,pathlib
pkg,out=pathlib.Path(sys.argv[1]),pathlib.Path(sys.argv[2])
core=(pkg/'build/three.core.js').read_text(encoding='utf-8')
mod=(pkg/'build/three.module.js').read_text(encoding='utf-8')
ver=__import__('json').loads((pkg/'package.json').read_text(encoding='utf-8'))['version']
def names(stmt):
    body=re.search(r'(?:export|import)\s*\{([^}]*)\}',stmt,re.S).group(1)
    r=[]
    for x in body.split(','):
        x=x.strip()
        if not x: continue
        a=re.split(r'\s+as\s+',x);r.append((a[0],a[-1]))
    return r
ce=re.findall(r'^export\s*\{[^}]*\}\s*;',core,re.M);assert len(ce)==1
core_body=core.replace(ce[0],'')
mi=re.findall(r'^import\s*\{[^}]*\}\s*from\s*\'\./three\.core\.js\'\s*;',mod,re.M)
mr=re.findall(r'^export\s*\{[^}]*\}\s*from\s*\'\./three\.core\.js\'\s*;',mod,re.M)
me=re.findall(r'^export\s*\{[^}]*\}\s*;',mod,re.M)
assert len(mi)==1 and len(mr)==1 and len(me)==1
mod_body=mod
for x in mi+mr+me: mod_body=mod_body.replace(x,'')
assert not re.search(r'^\s*(import|export)\b',core_body+mod_body,re.M)
cexp={pub:loc for loc,pub in names(ce[0])}   # core が公開する名前 → core の中の名前
imp=names(mi[0])   # module が core から受け取る名前（公開名, module の中の名前）
mexp={pub:loc for loc,pub in names(me[0])}
core_ret='{'+','.join(f'{p}:{l}' for p,l in sorted(cexp.items()))+'}'
imp_dec='const {'+','.join(f'{a}:{b}' for a,b in imp)+'}=C;'
mod_ret='{'+','.join(f'{p}:{l}' for p,l in sorted(mexp.items()))+'}'
reexp=','.join(f'{p}:C.{l}' for l,p in names(mr[0]))
# core と module は別々の関数の中に置く（元は別のモジュールなので、内部の名前が重なっていることがある）
out.write_text('\n'.join([
 f'// three.js {ver}（npm の build/three.core.js と build/three.module.js を tools/make_three.py で普通のスクリプトにした物。MIT License）',
 '(function(){','const C=(function(){',core_body,'return '+core_ret+';','})();',
 'const M=(function(){',imp_dec,mod_body,'return '+mod_ret+';','})();',
 'window.THREE=Object.assign({},C,{'+reexp+'},M);   // THREE は凍結しない（試作で Phong の材質などを置き換えるため）','})();',''
]),encoding='utf-8')
print(ver,len(cexp),len(mexp),'exports',out.stat().st_size,'bytes')
