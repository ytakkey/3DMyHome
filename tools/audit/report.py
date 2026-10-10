# 点検の結果（bake/work/audit.json）を、コードの行の組ごとにまとめ、該当する行の中身と並べて出す
import json,sys,collections,pathlib
L=[x for x in json.load(open('bake/work/audit.json',encoding='utf-8')) if x.get('vis',1)>1e-6]   # 見える重なりだけ
N=int(sys.argv[1]) if len(sys.argv)>1 else 30;SKIP=int(sys.argv[2]) if len(sys.argv)>2 else 0;W=int(sys.argv[3]) if len(sys.argv)>3 else 260
def site(s):
    fr=s.split(' < ');f=next((x for x in fr if not x.startswith('common.js')),fr[0]);return f
src={}
def line(fl):
    f,ln,col=fl.split(':');f='js/'+f
    if f not in src:src[f]=pathlib.Path(f).read_text(encoding='utf-8').split('\n')
    t=src[f][int(ln)-1];c=int(col)-1;return t[max(0,c-60):c+W].replace('\n',' ')
agg=collections.OrderedDict()
for x in L:
    a,b=sorted([site(x['A']),site(x['B'])]);k=(a,b)
    r=agg.setdefault(k,{'n':0,'area':0,'cop':0,'ex':x});r['n']+=1;r['area']+=x.get('vis',x['area']);r['cop']+=x['kind']=='coplanar'
rows=sorted(agg.items(),key=lambda kv:-kv[1]['area'])
print(len(rows),'sites')
for (a,b),r in rows[SKIP:SKIP+N]:
    ex=r['ex'];print(f"### {a} & {b}  n{r['n']} cop{r['cop']} {r['area']*1e4:.0f}cm2 #{ex['ca']}/#{ex['cb']} gap{ex['gap']*1000:.1f}mm @{ex.get('at')} n{ex.get('nrm')}")
    print('  A:',line(a));
    if b!=a:print('  B:',line(b))
