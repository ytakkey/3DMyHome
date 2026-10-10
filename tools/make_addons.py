# three の npm パッケージの examples/jsm（ESモジュール）のうち、使う物を file:// でも読める普通のスクリプトにまとめる（THREE に足す）
# 使い方：python tools/make_addons.py <展開した package フォルダ> <出力ファイル>
# ファイルごとに別の関数の中に入れ（中の名前がぶつからないように）、ファイルの間の受け渡しは表 A を通す
import re,sys,json,pathlib
pkg,out=pathlib.Path(sys.argv[1]),pathlib.Path(sys.argv[2])
ver=json.loads((pkg/'package.json').read_text(encoding='utf-8'))['version']
FILES=['shaders/CopyShader.js','shaders/OutputShader.js','math/SimplexNoise.js','postprocessing/Pass.js','postprocessing/ShaderPass.js','postprocessing/MaskPass.js','postprocessing/EffectComposer.js',
 'postprocessing/RenderPass.js','postprocessing/OutputPass.js','shaders/GTAOShader.js','shaders/PoissonDenoiseShader.js','postprocessing/GTAOPass.js']
def names(body):
    r=[]
    for x in body.split(','):
        x=x.strip()
        if x:a=re.split(r'\s+as\s+',x);r.append((a[0],a[-1]))
    return r
parts=[f'// three.js {ver} の examples/jsm のうち、後処理（EffectComposer・GTAOPass など）を tools/make_addons.py で普通のスクリプトにした物。MIT License',
 '(function(){const A={};']
for f in FILES:
    src=(pkg/'examples/jsm'/f).read_text(encoding='utf-8')
    head=[]
    def imp(m):
        lst=names(m.group(1));frm=m.group(2)
        obj='THREE' if frm=='three' else 'A'
        head.append('const {'+','.join(f'{a}:{b}' for a,b in lst)+'}='+obj+';')
        return ''
    src=re.sub(r"^import\s*\{([^}]*)\}\s*from\s*'([^']+)'\s*;",imp,src,flags=re.M|re.S)
    ex=[]
    def exp(m):ex.extend(names(m.group(1)));return ''
    src=re.sub(r"^export\s*\{([^}]*)\}\s*;",exp,src,flags=re.M|re.S)
    assert not re.search(r'^\s*(import|export)\b',src,re.M),f
    parts.append('// '+f+'\n(function(){'+''.join(head)+'\n'+src+'\nObject.assign(A,{'+','.join(f'{b}:{a}' for a,b in ex)+'});})();')
parts.append('for(const k in A)if(!(k in THREE))THREE[k]=A[k];})();')
out.write_text('\n'.join(parts)+'\n',encoding='utf-8')
print(ver,len(FILES),'files',out.stat().st_size,'bytes')
