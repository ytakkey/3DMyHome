# 焼き込みの結果（bake/work/layers/*.npy・uv.json）を、ブラウザで読む bake/<name>.js にまとめる（Blender の Python で動かす：numpy と WebP の書き出しを使うため）
# 使い方：blender -b --factory-startup -P tools/encode_bake.py -- bedroom
# 各層は「照度（lux）」を対数で 0〜1 に詰めた 8bit の RGB（WebP）。ドアを開けたときの層は、閉じたとき（base）との差（増減）を符号付きで詰める
import bpy,json,math,sys,base64,pathlib
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parent.parent;WORK=ROOT/'bake'/'work'
name=(sys.argv[sys.argv.index('--')+1:] or ['bedroom'])[0]
uvj=json.loads((WORK/'uv.json').read_text(encoding='utf-8'));res=uvj['res']
L={p.stem:np.load(p) for p in (WORK/'layers').glob('*.npy')}
STOPS=14
CDOWN=4   # 色の画像の縮小率   # 対数で詰める幅（最大値から 2^-14 まで）
def webp(a01,fmt='WEBP'):   # a01：[res,res,3] 0〜1（行は Blender の並び＝下から）→ WebP（劣化あり・高画質）の base64。画像の上が v=1 になるので、シェーダーでは v を反転して読む
    n=a01.shape[0];im=bpy.data.images.new('E',n,n,alpha=False,float_buffer=False);im.colorspace_settings.name='Non-Color'
    px=np.ones((n,n,4),dtype=np.float32);px[:,:,:3]=a01;im.pixels.foreach_set(px.ravel())
    f=str(WORK/('_e.'+fmt.lower()));im.filepath_raw=f;im.file_format=fmt
    sc=bpy.context.scene;sc.render.image_settings.file_format='WEBP';sc.render.image_settings.quality=95;sc.render.image_settings.color_mode='RGB'
    im.save(filepath=f,quality=95);bpy.data.images.remove(im)
    b=pathlib.Path(f).read_bytes();return 'data:image/'+fmt.lower()+';base64,'+base64.b64encode(b).decode(),len(b)
layers=[];total=0
groups=sorted({k.split('@')[0] for k in L})
for g in groups:
    base=L.get(g+'@base')
    for k in sorted(x for x in L if x.startswith(g+'@')):
        st=k.split('@')[1];v=L[k] if st=='base' or base is None else L[k]-base;signed=st!='base' and base is not None
        if signed:   # ドアを開けたときの増減のうち、閉じたときの明るさに比べて小さい所（2回の焼き込みのムラの差）はなだらかに0にする
            rel=np.abs(v)/(base+1.0);v=v*np.clip((rel-0.04)/0.06,0,1)
        vmax=float(np.abs(v).max())
        if vmax<=0:continue
        if st!='base' and base is not None and vmax<0.01*float(base.max()):print('skip',k,vmax);continue   # 増減がほぼ無い層は省く
        # 明るさ（Y）と色（明るさに対する赤・青の比）に分ける。明るさは対数で詰めた白黒の WebP（色の情報が無いので圧縮で色ずれが出ない）、色は1/4の大きさの劣化なしの PNG（増減の層は色なし＝白）
        Y=0.2126*v[:,:,0]+0.7152*v[:,:,1]+0.0722*v[:,:,2];vmax=float(np.abs(Y).max())
        if vmax<=0:continue
        s=vmax*2**-STOPS;kk=math.log2(1+vmax/s)
        e=np.log2(1+np.abs(Y)/s)/kk
        if signed:e=0.5+0.5*np.sign(Y)*e
        data,n=webp(np.repeat(np.clip(e,0,1)[...,None],3,axis=2));total+=n;cdata=None
        if not signed:
            q=CDOWN;h=res//q;Ys=np.maximum(Y,0)[:h*q,:h*q].reshape(h,q,h,q).sum((1,3))
            cr=(np.maximum(v[:,:,0],0)[:h*q,:h*q].reshape(h,q,h,q).sum((1,3)))/np.maximum(Ys,1e-9);cb=(np.maximum(v[:,:,2],0)[:h*q,:h*q].reshape(h,q,h,q).sum((1,3)))/np.maximum(Ys,1e-9)
            cr=np.where(Ys>1e-9,cr,1.0);cb=np.where(Ys>1e-9,cb,1.0)
            cdata,cn=webp(np.stack([np.clip(cr/2,0,1),np.clip(cb/2,0,1),np.zeros_like(cr)],axis=2),'PNG');total+=cn
        msk=np.abs(L[k]).max(axis=2)>0;mean=float(v[msk].mean()) if msk.any() else 0.0   # 焼いた所の平均の照度（露出の目安）
        layers.append({'name':k,'group':g,'door':None if st=='base' else st[5:],'signed':signed,'s':s,'k':kk,'mean':mean,'img':data,'cimg':cdata})
        print(k,'max %.1f'%vmax,'%dKB'%(n//1024),flush=True)
uv={}
for key,a in uvj['uv'].items():
    q=np.clip(np.round(np.array(a,dtype=np.float64)*65535),0,65535).astype('<u2');uv[key]=base64.b64encode(q.tobytes()).decode()
out={'res':res,'cres':res//CDOWN,'layers':layers,'uv':uv}
js='// 焼き込みの結果（tools/bake_blender.py → tools/encode_bake.py で作る）。layers：照明の組ごとの照度（lux、対数で詰めた WebP）、uv：形ごとのライトマップのUV（uint16）\nconst BAKE='+json.dumps(out,separators=(',',':'))+';\n'
(ROOT/'bake'/(name+'.js')).write_text(js,encoding='utf-8')
print('layers',len(layers),'images %dKB'%(total//1024),'file %dKB'%(len(js)//1024))
