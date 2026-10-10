# Blender（5.2）で寝室の周りの光を焼き込む。
# 使い方：blender -b --factory-startup -P tools/bake_blender.py -- [samples] [layers...]
#  入力：bake/work/scene.json・scene.bin（trial/bedroom.html の exportBake() が書き出す。座標は three.js の家全体の座標：X=東、Y=上、Z=南）
#  出力：bake/work/layers/<層>.npy（線形の照度 lux、float32、[解像度,解像度,3]）・bake/work/uv.json（形ごとのライトマップのUV。頂点の順は書き出したとおり）
# 層：照明の組（bdl など）・空（sky）・太陽（sun）を、ドアがすべて閉じた状態（base）と、1つだけ開けた状態（open_<ドア>）で焼く
import bpy,bmesh,json,math,sys,time,pathlib,os
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parent.parent;WORK=ROOT/'bake'/'work';(WORK/'layers').mkdir(parents=True,exist_ok=True)
argv=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
SAMPLES=int(argv[0]) if argv else 256
ONLY=set(argv[1:])
LM2W=1/683   # 光束（lm）・照度（lux）→ Blender の W・W/m²（全部の光で同じ換算にする）
TEXEL=0.018  # ライトマップの1画素の大きさ（m）の目安
# 空と太陽（10月の朝10時ごろ・晴れ）：空からの水平面照度・太陽の法線照度・太陽の向き（方位：北から時計回り、高度）・地面の反射率
SKY_LUX,SUN_LUX,SUN_AZ,SUN_EL,GROUND=15000,70000,150,38,0.2

head=json.loads((WORK/'scene.json').read_text(encoding='utf-8'))
raw=np.fromfile(WORK/'scene.bin',dtype=np.float32)
def b3(v):return (v[0],-v[2],v[1])   # three（X東・Y上・Z南）→ Blender（X東・Y北・Z上）

# ===== シーンを空にして、形を作る =====
bpy.ops.wm.read_factory_settings(use_empty=True)
sc=bpy.context.scene;sc.render.engine='CYCLES'
pref=bpy.context.preferences.addons['cycles'].preferences;pref.compute_device_type='HIP';pref.get_devices()
DEV=os.environ.get('BAKE_DEVICES','HIP,CPU').split(',')   # 使う計算装置（既定は GPU と CPU の両方）
for d in pref.devices:d.use=d.type in DEV
sc.cycles.device='GPU' if any(d.use for d in pref.devices) else 'CPU'
print('devices',[(d.name,d.type) for d in pref.devices if d.use],sc.cycles.device,flush=True)
sc.cycles.samples=SAMPLES;sc.cycles.use_denoising=False;sc.cycles.max_bounces=8;sc.cycles.diffuse_bounces=6;sc.cycles.glossy_bounces=2;sc.cycles.transmission_bounces=0;sc.cycles.caustics_reflective=False;sc.cycles.caustics_refractive=False
sc.cycles.sample_clamp_indirect=float(os.environ.get("BAKE_CLAMP","1.0"));sc.render.use_persistent_data=True   # 焼くたびに形を読み直さない

def material(name,alb,img=None):
    m=bpy.data.materials.new(name);m.use_nodes=True;nt=m.node_tree;p=nt.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*alb,1);p.inputs['Roughness'].default_value=0.7
    if img is not None:
        n=nt.nodes.new('ShaderNodeTexImage');n.image=img;nt.nodes.active=n
    return m

# 形はまとめて数個の物体にする（Blender は焼く物体を1つずつ処理するので、物体が多いと遅い）：焼く形（T）・ドアの状態ごとの扉（D:ドア:O/C）・遮るだけの形（OCC）
groups={}
for m in head['meshes']:
    g='D:%s:%s'%(m['state']['door'],'O' if m['state']['open'] else 'C') if m['state'] else ('T' if m['target'] else 'OCC')
    groups.setdefault(g,[]).append(m)
img=None
def build(name,entries,target):
    P=np.concatenate([raw[m['off']:m['off']+m['count']*3].reshape(-1,3) for m in entries]);N=np.concatenate([raw[m['off']+m['count']*3:m['off']+m['count']*6].reshape(-1,3) for m in entries])
    n=len(P);key=np.round(P*1e5).astype(np.int64);uk,first,inv=np.unique(key,axis=0,return_index=True,return_inverse=True);inv=inv.reshape(-1)   # 同じ位置の頂点をつなぐ（UVの島を作るため）
    verts=[b3(v) for v in P[first]];faces=[]
    for t in range(n//3):
        f=[int(inv[3*t]),int(inv[3*t+1]),int(inv[3*t+2])]
        if len(set(f))<3:   # つぶれた三角形はつながない頂点で作る
            f=[]
            for j in range(3):verts.append(b3(P[3*t+j]));f.append(len(verts)-1)
        faces.append(f)
    me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();assert len(me.polygons)==n//3
    me.normals_split_custom_set([b3(N[i]) for i in range(n)])   # 角の並び＝書き出した頂点の並び
    mi=np.zeros(n//3,dtype=np.int32);ranges={};f0=0
    for k,m in enumerate(entries):
        me.materials.append(material('m_%s_%d'%(name,k),m['albedo'],img if target else None));c=m['count']//3;mi[f0:f0+c]=k;ranges[m['key']]=(f0,f0+c);f0+=c
    me.polygons.foreach_set('material_index',mi)
    ob=bpy.data.objects.new(name,me);sc.collection.objects.link(ob);return ob,ranges
# ===== ライトマップのUV（焼き込む形をまとめて1枚の画像に並べる） =====
tg=[k for k in groups if k!='OCC'];area=0.0
for k in tg:
    for m in groups[k]:
        Q=raw[m['off']:m['off']+m['count']*3].reshape(-1,3,3);area+=float(0.5*np.linalg.norm(np.cross(Q[:,1]-Q[:,0],Q[:,2]-Q[:,0]),axis=1).sum())
res=int(math.ceil(math.sqrt(area/TEXEL**2/0.55)/64)*64);res=max(512,min(2048,res))   # 画像の一辺（64の倍数）
print('target area',round(area,2),'m2 -> res',res,flush=True)
img=bpy.data.images.new('LM',res,res,alpha=False,float_buffer=True)
objs={};targets=[];door_parts={};ranges={}
for k,ents in groups.items():
    ob,rg=build(k.replace(':','_'),ents,k!='OCC');objs[k]=ob;ranges[k]=rg
    if k!='OCC':targets.append(ob);ob.data.uv_layers.new(name='LM');ob.data.uv_layers.active=ob.data.uv_layers['LM']
    if k.startswith('D:'):_,d,st=k.split(':');door_parts.setdefault(d,[]).append((ob,st=='O'))
bpy.ops.object.select_all(action='DESELECT')
for ob in targets:ob.select_set(True)
bpy.context.view_layer.objects.active=targets[0]
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(60),island_margin=0.0,area_weight=0.0,correct_aspect=True,scale_to_bounds=False)
bpy.ops.uv.select_all(action='SELECT')
bpy.ops.uv.average_islands_scale()
bpy.ops.uv.pack_islands(rotate=True,margin_method='FRACTION',margin=4/res,shape_method='CONCAVE')
bpy.ops.object.mode_set(mode='OBJECT')
uvout={}
for k in tg:
    me=objs[k].data;uv=np.zeros(len(me.loops)*2,dtype=np.float32);me.uv_layers['LM'].data.foreach_get('uv',uv)
    for key,(f0,f1) in ranges[k].items():uvout[key]=uv[f0*6:f1*6].round(6).tolist()
(WORK/'uv.json').write_text(json.dumps({'res':res,'uv':uvout}),encoding='utf-8')
# 焼く画素の範囲（UVの三角形を塗り、焼き込みの縁の延長分だけ広げる）。範囲の外は周りの値で埋める（ノイズ除去の縁のにじみ・縮小版の黒の混入を防ぐ）
COVER=np.zeros((res,res),bool)
for key,a in uvout.items():
    for tri in np.array(a,dtype=np.float64).reshape(-1,3,2)*res:
        x0,y0=np.floor(tri.min(0)).astype(int);x1,y1=np.ceil(tri.max(0)).astype(int);x0,y0=max(x0,0),max(y0,0);x1,y1=min(x1,res),min(y1,res)
        if x1<=x0 or y1<=y0:continue
        xs,ys=np.meshgrid(np.arange(x0,x1)+0.5,np.arange(y0,y1)+0.5);A,B,C=tri
        d=lambda P,Q:(Q[0]-P[0])*(ys-P[1])-(Q[1]-P[1])*(xs-P[0]);w0,w1,w2=d(B,C),d(C,A),d(A,B)
        COVER[y0:y1,x0:x1]|=((w0>=0)&(w1>=0)&(w2>=0))|((w0<=0)&(w1<=0)&(w2<=0))
for _ in range(2):COVER=COVER|np.roll(COVER,1,0)|np.roll(COVER,-1,0)|np.roll(COVER,1,1)|np.roll(COVER,-1,1)
def fill(a,m):   # 押し引き法：範囲の外を、範囲の中の値をなだらかに広げて埋める
    if min(a.shape[:2])<=1 or m.all():return np.where(m[...,None],a,a[m].mean(0) if m.any() else 0)
    h,w=a.shape[:2];H,Wd=(h+1)//2,(w+1)//2;pa=np.zeros((H*2,Wd*2,a.shape[2]));pm=np.zeros((H*2,Wd*2));pa[:h,:w]=a*m[...,None];pm[:h,:w]=m
    sa=pa.reshape(H,2,Wd,2,-1).sum((1,3));sm=pm.reshape(H,2,Wd,2).sum((1,3));c=fill(sa/np.maximum(sm,1e-9)[...,None],sm>0)
    up=np.repeat(np.repeat(c,2,0),2,1)[:h,:w];return np.where(m[...,None],a,up)

# ===== 照明（器具の大きさの面光源。光束は1灯あたり） =====
lamps={}
spec=head['lampSpec']
for L in head['lamps']:
    s=spec[L['group']];pos=b3(L['pos'])
    if s['kind']=='down':size,shape,lm,rot=0.07,'DISK',s['lm'],(0,0,0)   # 拡散タイプのダウンライト：φ70の光る面（真下向き）
    else:
        up=L['dir'][1]>0;size,shape,lm=0.055,'SQUARE',s['lm']/2;rot=(math.pi,0,0) if up else (0,0,0)   # ブラケット：箱の上下の開口（巾□75の内側）から半分ずつ
        hx,hz=L['dir'][0],L['dir'][2];hl=math.hypot(hx,hz) or 1;cy=L['pos'][1]-(0.02 if up else -0.02)   # 実時間の光の位置（箱の手前の面・中心から上下2cm）→ 開口の中心（奥行きの中央・箱の上端と下端の少し外）
        pos=b3([L['pos'][0]+hx/hl*0.045,cy+(0.0395 if up else -0.0395),L['pos'][2]+hz/hl*0.045])
    ld=bpy.data.lights.new('L',type='AREA');ld.shape=shape;ld.size=size;ld.energy=lm*LM2W;ld.color=(1,1,1)
    lo=bpy.data.objects.new('lamp_'+L['group'],ld);lo.location=pos;lo.rotation_euler=rot;sc.collection.objects.link(lo)
    lamps.setdefault(L['group'],[]).append(lo)
# 太陽
sun=bpy.data.lights.new('sun',type='SUN');sun.energy=SUN_LUX*LM2W;sun.angle=math.radians(0.53)
so=bpy.data.objects.new('sun',sun);sc.collection.objects.link(so)
az,el=math.radians(SUN_AZ),math.radians(SUN_EL);sd=(math.sin(az)*math.cos(el),math.cos(az)*math.cos(el),math.sin(el))   # 太陽への向き（Blender：X東・Y北・Z上）
import mathutils;so.rotation_euler=mathutils.Vector(sd).to_track_quat('Z','Y').to_euler()
# 空：天頂が明るく地平が暗い空（L=L0(1+2cosθ)/3）＋地面の照り返し（下半分は一様）
world=bpy.data.worlds.new('W');sc.world=world;world.use_nodes=True;nt=world.node_tree;nt.nodes.clear()
L0=SKY_LUX*LM2W/(math.pi*7/9);Lg=GROUND*(SKY_LUX+SUN_LUX*math.sin(el))*LM2W/math.pi
tc=nt.nodes.new('ShaderNodeTexCoord');sep=nt.nodes.new('ShaderNodeSeparateXYZ');nt.links.new(tc.outputs['Generated'],sep.inputs[0])
up_=nt.nodes.new('ShaderNodeMath');up_.operation='MULTIPLY_ADD';up_.inputs[1].default_value=2*L0/3;up_.inputs[2].default_value=L0/3;nt.links.new(sep.outputs['Z'],up_.inputs[0])
gt=nt.nodes.new('ShaderNodeMath');gt.operation='GREATER_THAN';gt.inputs[1].default_value=0.0;nt.links.new(sep.outputs['Z'],gt.inputs[0])
mix=nt.nodes.new('ShaderNodeMix');mix.data_type='FLOAT';mix.inputs['A'].default_value=Lg;nt.links.new(gt.outputs[0],mix.inputs['Factor']);nt.links.new(up_.outputs[0],mix.inputs['B'])
bg=nt.nodes.new('ShaderNodeBackground');bg.inputs['Color'].default_value=(1,1,1,1);nt.links.new(mix.outputs['Result'],bg.inputs['Strength'])
wo=nt.nodes.new('ShaderNodeOutputWorld');nt.links.new(bg.outputs[0],wo.inputs[0])
sky_strength=bg.inputs['Strength']
# 窓のポータル（空の光を窓から探させる。光は足さない）：窓の開口の大きさの面を、室内へ向けて窓の位置に置く
for w in head.get('windows',[]):
    ld=bpy.data.lights.new('portal',type='AREA');ld.shape='RECTANGLE';ld.size=w['w']+0.04;ld.size_y=w['h']+0.04;ld.cycles.is_portal=True
    po=bpy.data.objects.new('portal',ld);c=w['c'];o=w['out'];po.location=b3([c[0]+o[0]*0.3,c[1]+o[1]*0.3,c[2]+o[2]*0.3])   # 窓枠（壁の面から約14cm外まで）より外に置く（ポータルより外の面は空の光を探せず黒くなる）;sc.collection.objects.link(po)
    z=mathutils.Vector(b3(o));x=mathutils.Vector(b3(w['u']));y=z.cross(x)
    M=mathutils.Matrix.Identity(4);M.col[0][:3]=x;M.col[1][:3]=y;M.col[2][:3]=z;M.col[3][:3]=po.location;po.matrix_world=M   # 面光源は -Z へ光る＝室内向き（Z を外向きにする）
print('portals',len(head.get('windows',[])),flush=True)

# ===== 焼き込み =====
def set_light(group):
    for g,ls in lamps.items():
        for lo in ls:lo.hide_render=(g!=group)
    so.hide_render=(group!='sun')
    if group=='sky':nt.links.new(mix.outputs['Result'],sky_strength)
    else:
        for l in list(sky_strength.links):nt.links.remove(l)
        sky_strength.default_value=0.0
def set_doors(open_door):
    for d,parts in door_parts.items():
        for ob,isopen in parts:ob.hide_render=(isopen!=(d==open_door))
# ノイズ除去（Blender のコンポジターの Denoise＝OIDN を、焼いた画像にかける）
DENOISE=os.environ.get("NODENOISE")!="1"   # 環境変数 NODENOISE=1 でノイズ除去なし（確かめる用）
def denoise(px):
    src=bpy.data.images.get('DN_IN') or bpy.data.images.new('DN_IN',res,res,alpha=True,float_buffer=True)
    src.pixels.foreach_set(px)
    if not getattr(sc,'compositing_node_group',None):
        ng=bpy.data.node_groups.new('DN','CompositorNodeTree');sc.compositing_node_group=ng
        ng.interface.new_socket('Image',in_out='OUTPUT',socket_type='NodeSocketColor')
        i=ng.nodes.new('CompositorNodeImage');i.image=src;d=ng.nodes.new('CompositorNodeDenoise');o=ng.nodes.new('NodeGroupOutput')
        ng.links.new(i.outputs['Image'],d.inputs['Image']);ng.links.new(d.outputs['Image'],o.inputs[0])
        ims=sc.render.image_settings;ims.file_format='OPEN_EXR';ims.color_depth='32';ims.exr_codec='ZIP'   # 結果は32bitの浮動小数点で受け取る（既定の PNG だと 0〜1 に切られる）
        try:d.prefilter='ACCURATE';d.quality='HIGH'
        except Exception:pass
        if not sc.camera:
            cam=bpy.data.objects.new('cam',bpy.data.cameras.new('cam'));sc.collection.objects.link(cam);sc.camera=cam
        sc.render.resolution_x=sc.render.resolution_y=res;sc.render.resolution_percentage=100
    for ob in sc.objects:ob['_hr']=ob.hide_render;ob.hide_render=True
    sc.render.use_compositing=True;sc.render.use_sequencer=False
    for vl in sc.view_layers:vl.use=False
    try:
        bpy.ops.render.render(write_still=False)
    finally:
        for ob in sc.objects:ob.hide_render=ob['_hr']
        for vl in sc.view_layers:vl.use=True
    rr=bpy.data.images['Render Result'];tmp=str(WORK/'_dn.exr');rr.save_render(tmp,scene=sc)
    im=bpy.data.images.load(tmp,check_existing=False);out=np.empty(res*res*4,dtype=np.float32);im.pixels.foreach_get(out);bpy.data.images.remove(im)
    return out
# 部品の中に入っている画素（周りに部品の裏側＝内側が見える画素）を調べる：裏側だけが光る材質に入れ替えて焼く。値が大きい画素は焼いた値を使わず、周りの正しい画素の値で埋める
def bake_validity():
    vm=bpy.data.materials.new('VALID');vm.use_nodes=True;nt2=vm.node_tree;nt2.nodes.clear()
    geo=nt2.nodes.new('ShaderNodeNewGeometry');em=nt2.nodes.new('ShaderNodeEmission');dif=nt2.nodes.new('ShaderNodeBsdfDiffuse');dif.inputs['Color'].default_value=(1,1,1,1)   # 表は白（「光だけ」の焼き込みは色で割るので黒だと0になる）。照り返しは止める
    mx=nt2.nodes.new('ShaderNodeMixShader');out=nt2.nodes.new('ShaderNodeOutputMaterial');ti=nt2.nodes.new('ShaderNodeTexImage');ti.image=img;nt2.nodes.active=ti
    nt2.links.new(geo.outputs['Backfacing'],em.inputs['Strength']);nt2.links.new(geo.outputs['Backfacing'],mx.inputs[0]);nt2.links.new(dif.outputs[0],mx.inputs[1]);nt2.links.new(em.outputs[0],mx.inputs[2]);nt2.links.new(mx.outputs[0],out.inputs[0])
    saved={ob:list(ob.data.materials) for ob in objs.values()}
    for ob in objs.values():
        for i in range(len(ob.data.materials)):ob.data.materials[i]=vm
    set_light('none');set_doors(None);sm=sc.cycles.samples;sc.cycles.samples=64;db=sc.cycles.diffuse_bounces;sc.cycles.diffuse_bounces=0
    bpy.ops.object.select_all(action='DESELECT');sel=[ob for ob in targets if not ob.hide_render]
    for ob in sel:ob.select_set(True)
    bpy.context.view_layer.objects.active=sel[0];img.pixels.foreach_set(np.zeros(res*res*4,dtype=np.float32))
    bpy.ops.object.bake(type='DIFFUSE',pass_filter={'DIRECT','INDIRECT'},margin=0,use_clear=True,target='IMAGE_TEXTURES')
    px=np.empty(res*res*4,dtype=np.float32);img.pixels.foreach_get(px);sc.cycles.samples=sm;sc.cycles.diffuse_bounces=db
    for ob,ms in saved.items():
        for i,m in enumerate(ms):ob.data.materials[i]=m
    return px.reshape(res,res,4)[:,:,:3].mean(axis=2)
INVALID=None
def bake(name,group,open_door):
    set_light(group);set_doors(open_door)
    bpy.ops.object.select_all(action='DESELECT')
    sel=[ob for ob in targets if not ob.hide_render]
    for ob in sel:ob.select_set(True)
    bpy.context.view_layer.objects.active=sel[0]
    img.pixels.foreach_set(np.zeros(res*res*4,dtype=np.float32))
    t=time.time()
    bpy.ops.object.bake(type='DIFFUSE',pass_filter={'DIRECT','INDIRECT'},margin=6,margin_type='EXTEND',use_clear=True,target='IMAGE_TEXTURES')
    px=np.empty(res*res*4,dtype=np.float32);img.pixels.foreach_get(px)
    q=px.reshape(res,res,4);q[:,:,:3]=fill(q[:,:,:3].astype(np.float64),COVER&~INVALID).astype(np.float32);q[:,:,3]=1;px=q.ravel()   # 範囲の外と、部品の中に入っている画素を埋める
    if DENOISE:px=denoise(px)
    a=px.reshape(res,res,4)[:,:,:3]*math.pi/LM2W   # 拡散の光だけ（色なし）＝照度/π → 照度（lux）
    np.save(WORK/'layers'/(name+'.npy'),a.astype(np.float32))
    print('baked',name,'%.1fs'%(time.time()-t),'max %.1f lux'%a.max(),flush=True)
v=bake_validity();INVALID=v>0.25;print('invalid texels %.3f of covered'%(INVALID[COVER].mean()),flush=True)
groups=list(lamps.keys())+['sky','sun']
ONLY_DOOR={'j1':['sg311'],'l1':['sg500w'],'k1':['sg33s']}
for open_door in [None]+head['doors']:
    for g in groups:
        name=g+'@'+('base' if open_door is None else 'open_'+open_door)
        if ONLY and name not in ONLY and g not in ONLY:continue
        if open_door and g in ONLY_DOOR and open_door not in ONLY_DOOR[g]:continue   # 別の部屋の照明は、その部屋とのドアを開けたときだけ
        bake(name,g,open_door)
print('done',flush=True)
