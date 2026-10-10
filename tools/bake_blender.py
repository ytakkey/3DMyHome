# Blender（5.2）で寝室の周りの光を焼き込む。
# 使い方：blender -b --factory-startup -P tools/bake_blender.py -- [samples] [layers...]
#  入力：bake/work/scene.json・scene.bin（trial/bedroom.html の exportBake() が書き出す。座標は three.js の家全体の座標：X=東、Y=上、Z=南）
#  出力：bake/work/layers/<層>.npy（線形の照度 lux、float32、[解像度,解像度,3]）・bake/work/uv.json（形ごとのライトマップのUV。頂点の順は書き出したとおり）
# 層：照明の組（bdl など）・空（sky）・太陽（sun）を、ドアがすべて閉じた状態（base）と、1つだけ開けた状態（open_<ドア>）で焼く
import bpy,bmesh,json,math,sys,time,pathlib
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
for d in pref.devices:d.use=d.type in('HIP','CPU')   # GPU と CPU を両方使う
sc.cycles.device='GPU' if any(d.use for d in pref.devices) else 'CPU'
sc.cycles.samples=SAMPLES;sc.cycles.use_denoising=False;sc.cycles.max_bounces=8;sc.cycles.diffuse_bounces=6;sc.cycles.glossy_bounces=2;sc.cycles.transmission_bounces=0;sc.cycles.caustics_reflective=False;sc.cycles.caustics_refractive=False
sc.cycles.sample_clamp_indirect=10.0;sc.render.use_persistent_data=True   # 焼くたびに形を読み直さない

def material(name,alb,img=None):
    m=bpy.data.materials.new(name);m.use_nodes=True;nt=m.node_tree;p=nt.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*alb,1);p.inputs['Roughness'].default_value=0.7
    if img is not None:
        n=nt.nodes.new('ShaderNodeTexImage');n.image=img;nt.nodes.active=n
    return m

objs={};targets=[];door_parts={}
for mi,m in enumerate(head['meshes']):
    n=m['count'];o3=m['off'];P=raw[o3:o3+n*3].reshape(-1,3);N=raw[o3+n*3:o3+n*6].reshape(-1,3)
    # 同じ位置の頂点をつなぐ（UVの島を作るため）。三角形の並び・角の並びは書き出したとおり（UVを戻すときに使う）
    key=np.round(P*1e5).astype(np.int64);uk,inv=np.unique(key,axis=0,return_inverse=True);inv=inv.reshape(-1)
    verts=[None]*len(uk);
    for i,u in enumerate(inv):
        if verts[u] is None:verts[u]=P[i]
    verts=[b3(v) for v in verts];faces=[]
    for t in range(n//3):
        f=[int(inv[3*t]),int(inv[3*t+1]),int(inv[3*t+2])]
        if len(set(f))<3:   # つぶれた三角形はつながない頂点で作る
            f=[];[ (verts.append(b3(P[3*t+j])),f.append(len(verts)-1)) for j in range(3)]
        faces.append(f)
    me=bpy.data.meshes.new(m['key']);me.from_pydata(verts,[],faces);me.update()
    assert len(me.polygons)==n//3
    me.normals_split_custom_set([b3(N[3*(p.index)+j]) for p in me.polygons for j in range(3)])
    ob=bpy.data.objects.new(m['key'],me);sc.collection.objects.link(ob);objs[m['key']]=(ob,m)
    if m['target']:targets.append(ob)
    if m['state']:door_parts.setdefault(m['state']['door'],[]).append((ob,m['state']['open']))
    elif m['key'].startswith('door:'):pass

# ===== ライトマップのUV（焼き込む形をまとめて1枚の画像に並べる） =====
area=0.0
for ob in targets:
    me=ob.data;me.uv_layers.new(name='LM');me.uv_layers.active=me.uv_layers['LM']
    area+=sum(p.area for p in me.polygons)
res=int(math.ceil(math.sqrt(area/TEXEL**2/0.55)/64)*64);res=max(512,min(2048,res))   # 画像の一辺（64の倍数）
print('target area',round(area,2),'m2 -> res',res,flush=True)
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
for ob in targets:
    me=ob.data;uv=np.zeros(len(me.loops)*2,dtype=np.float32);me.uv_layers['LM'].data.foreach_get('uv',uv)
    uvout[ob.name]=uv.round(6).tolist()
(WORK/'uv.json').write_text(json.dumps({'res':res,'uv':uvout}),encoding='utf-8')

# ===== 材質（焼き込む形には焼き込み先の画像を付ける） =====
img=bpy.data.images.new('LM',res,res,alpha=False,float_buffer=True)
for k,(ob,m) in objs.items():ob.data.materials.append(material('m_'+k,m['albedo'],img if m['target'] else None))

# ===== 照明（器具の大きさの面光源。光束は1灯あたり） =====
lamps={}
spec=head['lampSpec']
for L in head['lamps']:
    s=spec[L['group']];pos=b3(L['pos'])
    if s['kind']=='down':size,shape,lm,rot=0.07,'DISK',s['lm'],(0,0,0)   # 拡散タイプのダウンライト：φ70の光る面（真下向き）
    else:
        up=L['dir'][1]>0;size,shape,lm=0.055,'SQUARE',s['lm']/2;rot=(math.pi,0,0) if up else (0,0,0)   # ブラケット：箱の上下の開口（巾□75の内側）から半分ずつ
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
DENOISE=True
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
    if DENOISE:px=denoise(px)
    a=px.reshape(res,res,4)[:,:,:3]*math.pi/LM2W   # 拡散の光だけ（色なし）＝照度/π → 照度（lux）
    np.save(WORK/'layers'/(name+'.npy'),a.astype(np.float32))
    print('baked',name,'%.1fs'%(time.time()-t),'max %.1f lux'%a.max(),flush=True)
groups=list(lamps.keys())+['sky','sun']
ONLY_DOOR={'j1':['sg311'],'l1':['sg500w'],'k1':['sg33s']}
for open_door in [None]+head['doors']:
    for g in groups:
        name=g+'@'+('base' if open_door is None else 'open_'+open_door)
        if ONLY and name not in ONLY and g not in ONLY:continue
        if open_door and g in ONLY_DOOR and open_door not in ONLY_DOOR[g]:continue   # 別の部屋の照明は、その部屋とのドアを開けたときだけ
        bake(name,g,open_door)
print('done',flush=True)
