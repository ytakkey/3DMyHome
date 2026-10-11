// 検証版（stg）：実時間の影付きの照明（照明仕様書の光束・色温度から物理的な明るさ）＋部屋ごとの照り返しの明るさ。光の範囲指定（lightZones）は使わない
// 見た目はカメラの位置で変えない：部屋の組（stg/pre.js の REGIONS）ごとに描き分け、組の面には、その組で点いている光・窓・開いたドアからの光を全部当てる。明るい順に6灯（電球は3灯）は影付き、残りはやわらかい光（拡散だけ・影なし。組の外には当たらないので壁は越えない）
// 影・映り込み・明るさ（露出）は、点灯・昼夜・ドア・シェードが変わったときだけ作り直す（立つ場所・向きでは変えない）
r.toneMapping=THREE.NeutralToneMapping;
r.shadowMap.enabled=true;r.shadowMap.type=THREE.PCFShadowMap;   // 影の縁のぼかしは光ごとの radius で（PCFSoft はぼかしの大きさを変えられず、縁が点々になる）
const SUN_K=0.015,NS=6,NP=3,SOFT_MAX=24,SPOT_MAP=1024,POINT_MAP=256;   // SUN_K：直射日光の強さの倍率（日の当たる所が真っ白に飛ばないよう、自然に見える程度に弱める）。 組ごとの影付きの光の枠（絞った光・電球）、やわらかい光の上限、影の画像の大きさ（影の画像1枚がテクスチャの枠を1つ使い、枠は16まで）
// ===== 照明の仕様（LS のキーごと。lm：1灯の光束、K：色温度、kind：lamb＝拡散（中心が明るく周りへなだらか）、cone＝絞った光（α：中心から縁までの角度）、bracket＝箱の上下の開口、bulb＝電球（全方向）） =====
const SPEC={a6:{lm:320,K:3500,kind:'cone',a:37.5},a4:{lm:440,K:3500,kind:'lamb'},a2:{lm:620,K:3500,kind:'cone',a:30},h1:{lm:440,K:3500,kind:'lamb'},a5:{lm:350,K:2400,kind:'bulb'},a3:{lm:326,K:2700,kind:'cone',a:20},a1:{lm:440,K:3500,kind:'lamb'},
 bdl:{lm:440,K:2700,kind:'lamb'},bbr:{lm:318,K:2700,kind:'bracket'},j1:{lm:440,K:2700,kind:'lamb'},d1:{lm:440,K:5000,kind:'lamb'},e1:{lm:1520,K:3500,kind:'lamb'},eh:{lm:440,K:2700,kind:'lamb',bulb:{lm:350,K:2400}},ec:{lm:440,K:2700,kind:'lamb'},ek:{lm:440,K:2700,kind:'lamb'},
 g1:{lm:312,K:2700,kind:'bulb'},bath:{lm:440,K:5000,kind:'lamb'},l1:{lm:440,K:5000,kind:'lamb'},k1:{lm:440,K:3500,kind:'lamb'}};
const KCOL={2400:0xffb066,2700:0xffc68e,3500:0xffd9b4,5000:0xfff3e8};   // 色温度ごとの光の色（全部屋共通の決まり）。明るさは光束で決めるので、色は明るさ1にそろえて使う
const lumColor=hex=>{const c=new THREE.Color(hex),y=0.2126*c.r+0.7152*c.g+0.0722*c.b;return c.multiplyScalar(1/y);};
const SKY_LUX=15000,SUN_LUX=70000,SUN_AZ=150,SUN_EL=38,MOON=3e-4;   // 空（水平面の照度）・太陽（法線照度）・太陽の向き（方位：北から時計回り、高度）・夜の月明かり（空の何倍か）

// ===== 元の照明を「仕様つきの光の候補」に置き換える（元の光は表示しない。点灯の判定は元の applyEnv の強さで行う） =====
const ORIG=[];scene.traverse(o=>{if(o.isLight)ORIG.push(o);});
const GROUP=new Map();{const keys=Object.keys(LS),save=Object.assign({},LS),sn=night;night=true;
 keys.forEach(k=>{keys.forEach(j=>LS[j]=j===k);envAll();ORIG.forEach(l=>{if((l.isSpotLight||l.isPointLight)&&l.intensity>0&&!GROUP.has(l))GROUP.set(l,k);});});Object.assign(LS,save);night=sn;envAll();}
const CAND=[];   // 光の候補：{src（元の光）, group, type:'spot'|'point', pos, dir, intensity, angle, penumbra, color}
{const v=new THREE.Vector3(),w=new THREE.Vector3();GROUP.forEach((g,l)=>{const s=SPEC[g];if(!s)return;l.getWorldPosition(v);const pos=v.clone();
 if(l.isPointLight){const b=s.bulb||s;CAND.push({src:l,group:g,type:'point',pos,intensity:b.lm/(4*Math.PI),color:lumColor(KCOL[b.K]),lm:b.lm});return;}
 let dir=l.target.getWorldPosition(w).clone().sub(pos).normalize();let intensity,angle,pen=1;
 if(s.kind==='lamb'){intensity=s.lm/Math.PI;angle=THREE.MathUtils.degToRad(85);}
 else if(s.kind==='cone'){const a=THREE.MathUtils.degToRad(s.a);intensity=s.lm/(2*Math.PI*(1-Math.cos(a)));angle=a*1.35;pen=0.45;}
 else{const up=dir.y>0,hz=new THREE.Vector3(dir.x,0,dir.z).normalize();pos.addScaledVector(hz,0.045);pos.y+=(up?-0.02:0.02)+(up?0.0405:-0.0405);dir=new THREE.Vector3(0,up?1:-1,0);intensity=(s.lm/2)/Math.PI;angle=THREE.MathUtils.degToRad(85);}   // ブラケット：箱の上下の開口の中心（奥行の中央・箱の上端／下端の3mm外）から真上・真下へ
 CAND.push({src:l,group:g,type:'spot',pos,dir,intensity,angle,penumbra:pen,color:lumColor(KCOL[s.K]),lm:s.lm*(s.kind==='bracket'?0.5:1)});});}
// 窓（空の光）：明るさは空の輝度×窓の面積。窓の情報は stg/pre.js が記録。窓・型ガラス・ドアの開口は面の光なので、近くでも明るくなりすぎないよう、距離の2乗に「面積÷π」を足して弱める（r2。シェーダーでは decay＞10 を面の光の印に使う）
const WINC=(typeof BAKE_WINDOWS!=='undefined'?BAKE_WINDOWS:[]).map(wd=>{const c=new THREE.Vector3(...wd.c),o=new THREE.Vector3(...wd.out),A=wd.w*wd.h;return {group:'sky',type:'spot',pos:c.clone().addScaledVector(o,-0.15),dir:o.clone().negate(),angle:THREE.MathUtils.degToRad(80),penumbra:1,area:A,r2:A/Math.PI,win:wd};});   // 窓の室内側15cmから室内へ向けた拡散の光（窓の外に置くと窓枠で切られて、日なたのような角のある明るい形が出るため。室内側に置いてなだらかにする）
ORIG.forEach(l=>l.visible=false);
let NID=0;CAND.forEach(c=>{c.id=NID++;c.rg=c.type==='spot'?regionAt(c.pos.x+c.dir.x*0.15,c.pos.y+c.dir.y*0.15,c.pos.z+c.dir.z*0.15):regionAt(c.pos.x,c.pos.y,c.pos.z);});   // 光の属する部屋の組（器具から光の向きへ15cm出た所）
// 玄関ドアの窓（型ガラス entGl。wash.js の中の名前なので、玄関の組の両面・光らない板の立った面として探す）：直射は通さず（影を落とす）、空と日射を拡散して通す窓の光にする（透過約8割）
scene.traverse(o=>{const m=o.material;if(!o.isMesh||!m.isMeshBasicMaterial||m.side!==THREE.DoubleSide||(REGIONS[o.userData.rg]||{}).n!=='ent')return;o.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(o),c=b.getCenter(new THREE.Vector3()),sz=b.getSize(new THREE.Vector3()),ax=sz.x<sz.z?0:2;if(Math.min(sz.x,sz.z)>0.005||sz.y<0.3)return;const n=new THREE.Vector3(ax===0?1:0,0,ax===2?1:0);if(roomAt(c.x+n.x*0.5,c.y,c.z+n.z*0.5))n.negate();
 o.userData.frost=1;WINC.push({group:'sky',type:'spot',pos:c.clone().addScaledVector(n,0.02),dir:n.clone().negate(),angle:THREE.MathUtils.degToRad(85),penumbra:1,area:(ax===0?sz.z:sz.x)*sz.y,r2:(ax===0?sz.z:sz.x)*sz.y/Math.PI,win:{c:c.toArray()},frost:0.8,out:n});});
WINC.forEach(c=>{c.id=NID++;const q=c.pos.clone().addScaledVector(c.dir,0.6);c.rg=regionAt(q.x,q.y,q.z);});
// 開いたドアの開口から隣の部屋へ漏れる光：開口を、向こうの部屋の明るさ（照り返しの輝度＝反射率×照度÷π）で光る面として、こちら向きの拡散の光にする
const SPILL=[];Object.entries(typeof DOORWAYS!=='undefined'?DOORWAYS:{}).forEach(([k,d])=>{const c=new THREE.Vector3(...d.c),n=new THREE.Vector3(...d.n);[1,-1].forEach(sg=>{const dir=n.clone().multiplyScalar(sg),q=c.clone().addScaledVector(dir,0.4);SPILL.push({id:NID++,group:'spill',door:k,type:'spot',pos:c.clone().addScaledVector(dir,-0.05),dir,angle:THREE.MathUtils.degToRad(85),penumbra:1,area:d.w*d.h,r2:d.w*d.h/Math.PI,src:null,from:c.clone().addScaledVector(dir,-0.4),rg:regionAt(q.x,q.y,q.z)});});});

// ===== 組ごとの光の枠（数はどの組も同じ＝シェーダーを作り直さない）と、太陽 =====
const LAY=G=>1+G.i,LAYT=G=>17+G.i;   // 描き分けの層：不透明は1〜、半透明は17〜（全部の組の不透明を描いてから半透明を描く）。層0は影を落とすため（影のカメラは層0を見る）
REGIONS.forEach(G=>{G.spots=[];G.points=[];G.softP=[];G.softD=[];G.softC=[];G.softN=0;G.cau=[];G.sig='';
 for(let i=0;i<NS;i++){const l=new THREE.SpotLight(0xffffff,0,0,1,1,2);l.castShadow=true;l.shadow.mapSize.set(4,4);l.shadow.camera.near=0.05;l.shadow.camera.far=8;l.shadow.bias=-0.0008;l.shadow.normalBias=0.035;l.shadow.radius=3;l.shadow.autoUpdate=false;l.layers.set(LAY(G));l.layers.enable(LAYT(G));scene.add(l);scene.add(l.target);G.spots.push({l,c:null});}
 for(let i=0;i<NP;i++){const l=new THREE.PointLight(0xffffff,0,0,2);l.castShadow=true;l.shadow.mapSize.set(4,4);l.shadow.camera.near=0.03;l.shadow.camera.far=8;l.shadow.bias=-0.001;l.shadow.normalBias=0.035;l.shadow.autoUpdate=false;l.layers.set(LAY(G));l.layers.enable(LAYT(G));scene.add(l);G.points.push({l,c:null});G.cau.push(new THREE.Vector4());}
 for(let i=0;i<SOFT_MAX;i++){G.softP.push(new THREE.Vector4());G.softD.push(new THREE.Vector4());G.softC.push(new THREE.Vector4());}});
const SUN=new THREE.DirectionalLight(0xffffff,0);{const az=THREE.MathUtils.degToRad(SUN_AZ),el=THREE.MathUtils.degToRad(SUN_EL),d=new THREE.Vector3(Math.sin(az)*Math.cos(el),Math.sin(el),-Math.cos(az)*Math.cos(el));   // 太陽への向き（X東・Y上・Z南。北から時計回りの方位）
 SUN.position.set(1.3,3,3.6).addScaledVector(d,20);SUN.target.position.set(1.3,3,3.6);SUN.castShadow=true;SUN.shadow.mapSize.set(4096,4096);const sc=SUN.shadow.camera;sc.left=-6;sc.right=6;sc.top=6;sc.bottom=-6;sc.near=12;sc.far=30;SUN.shadow.radius=3;SUN.shadow.bias=-0.0015;SUN.shadow.normalBias=0.05;SUN.shadow.autoUpdate=false;SUN.layers.enableAll();scene.add(SUN);scene.add(SUN.target);}

// 天井と壁の境目から光が漏れないための「影だけを落とす板」（画面には描かない。層0だけ）
{const occ=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false});(typeof CEILS!=='undefined'?CEILS:[]).forEach(([x0,x1,z0,z1,y])=>{if(y<HOUSE.ldk.FL2)return;const b=new THREE.Mesh(new THREE.BoxGeometry(x1-x0+1.0,0.02,z1-z0+1.0),occ);b.position.set((x0+x1)/2,y+0.3,(z0+z1)/2);b.castShadow=true;b.userData.occ=1;scene.add(b);});}   // 2階の天井だけ（1階は上に2階の床がある）。天井に接した所で影の判定がすり抜けないよう、遮る板は30cm上に、各辺50cm大きく
// 影を落とす・受ける（ガラス・半透明・光る部品は影を落とさない）。影は光から見て裏の面で作る（この家の壁は隣の部屋の面と2枚1組なので光は通り抜けず、表の面の縞＝シャドウアクネも出ない）。描き分けの層は部品の組から
{const bb=new THREE.Box3(),cc=new THREE.Vector3();scene.updateMatrixWorld(true);
 scene.traverse(o=>{if(!o.isMesh||o.userData.occ)return;const m=o.material;if(m.userData&&m.userData.noEnv)m.envMapIntensity=0;o.receiveShadow=!m.isMeshBasicMaterial;o.castShadow=!!o.userData.frost||!(m.isMeshBasicMaterial||m.transparent);
  let rg=o.userData.rg;if(rg===undefined){bb.setFromObject(o).getCenter(cc);rg=regionAt(cc.x,cc.y,cc.z);o.userData.rg=rg;}const G=REGIONS[rg];o.layers.set(0);o.layers.enable(m.transparent?LAYT(G):LAY(G));});}

// ===== 部屋ごとの照り返しの明るさ（間接光の代わり）：部屋に入る光の量 ÷ 部屋の内側の面積（反射率約0.5の部屋の照り返しの目安）。いつも開いている開口から隣の部屋へも分ける =====
ROOMS.forEach(R=>{const dx=R.mx[0]-R.mn[0],dy=Math.min(R.mx[1]-R.mn[1],3),dz=R.mx[2]-R.mn[2];R.S=2*(dx*dz+dx*dy+dz*dy);R.E=new THREE.Color(0,0,0);});
const roomOf=p=>roomAt(p.x,p.y,p.z);
const LINKS=[['bed','hall','sg311',1.6],['bed','wic','sg500w',1.5],['bed','study','sg33s',1.5],['datsu','f1N','sg300l',1.6],['datsu','sen','sg300w',1.6],['sen','entC','sg33',1.6],['entC','f1S','sg11h',1.8],['ent','toi','sg500',1.5],['datsu','bath','bath',1.6],
 ['hall','void',null,6],['void','f1S',null,8],['void','f1N',null,4],['f1N','f1S',null,6],['entC','ent',null,2],['ent','entK',null,2]];   // 部屋のつながり（ドアのキー、null＝いつも開いている）と開口の面積（m²、目安）
const AMB_MAX=16,AMBU={zCauP:{value:REGIONS[0].cau},zCau:{value:ZU.zCau.value},zCauK:{value:ZU.zCauK.value},zAmbMin:{value:Array.from({length:AMB_MAX},()=>new THREE.Vector4(1,1,1,0))},zAmbMax:{value:Array.from({length:AMB_MAX},()=>new THREE.Vector4(0,0,0,0))},zAmbE:{value:Array.from({length:AMB_MAX},()=>new THREE.Vector3())},zAmbN:{value:0},zGain:{value:new Array(16).fill(1)},
 zSoftP:{value:REGIONS[0].softP},zSoftD:{value:REGIONS[0].softD},zSoftC:{value:REGIONS[0].softC},zSoftN:{value:0}};
ROOMS.forEach((R,i)=>{AMBU.zAmbMin.value[i].set(R.mn[0],R.mn[1],R.mn[2],0.05);AMBU.zAmbMax.value[i].set(R.mx[0],R.mx[1],R.mx[2],0);});AMBU.zAmbN.value=ROOMS.length;
function ambPatch(sh){Object.assign(sh.uniforms,AMBU);
 sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vAmbP;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvAmbP=(modelMatrix*vec4(transformed,1.0)).xyz;');
 sh.fragmentShader=sh.fragmentShader.replace('#include <common>',`#include <common>
varying vec3 vAmbP;uniform vec4 zAmbMin[${AMB_MAX}];uniform vec4 zAmbMax[${AMB_MAX}];uniform vec3 zAmbE[${AMB_MAX}];uniform int zAmbN;uniform float zGain[${AMB_MAX}];
uniform vec4 zSoftP[${SOFT_MAX}];uniform vec4 zSoftD[${SOFT_MAX}];uniform vec4 zSoftC[${SOFT_MAX}];uniform int zSoftN;
uniform vec4 zCauP[${NP}];uniform sampler2D zCau;uniform vec4 zCauK;
float cauF(int li){vec4 c=zCauP[li];if(c.w<0.5)return 1.0;vec3 d=normalize(vAmbP-c.xyz);float p=texture2D(zCau,vec2(atan(d.z,d.x)*0.1591549+0.5,asin(clamp(d.y,-1.0,1.0))*0.3183099+0.5)).r;
 float cd=-d.y,op=smoothstep(zCauK.x-0.015,zCauK.x+0.015,cd),gl=zCauK.z*(0.3+1.6*p)*(1.0-smoothstep(zCauK.y-0.02,zCauK.y+0.01,d.y)),rim=zCauK.w*exp(-pow((cd-zCauK.x+0.02)/0.03,2.0))*(0.5+p);return mix(gl,1.0,op)+rim;}
vec3 zAmb(){vec3 a=vec3(0.0);float ws=0.0;for(int i=0;i<${AMB_MAX};i++){if(i>=zAmbN)break;vec4 mn=zAmbMin[i],mx=zAmbMax[i];vec3 d=max(mn.xyz-vAmbP,vAmbP-mx.xyz);float w=1.0-smoothstep(0.0,mn.w,max(max(d.x,d.y),d.z));if(w>0.0){a+=zAmbE[i]*w;ws+=w;}}return ws>0.0?a/max(ws,1.0):vec3(0.0);}
float zGainF(){float g=0.0,ws=0.0;for(int i=0;i<${AMB_MAX};i++){if(i>=zAmbN)break;vec4 mn=zAmbMin[i],mx=zAmbMax[i];vec3 d=max(mn.xyz-vAmbP,vAmbP-mx.xyz);float w=1.0-smoothstep(0.0,mn.w,max(max(d.x,d.y),d.z));if(w>0.0){g+=zGain[i]*w;ws+=w;}}return ws>0.0?g/ws:1.0;}
vec3 zSoft(vec3 wN){vec3 e=vec3(0.0);for(int i=0;i<${SOFT_MAX};i++){if(i>=zSoftN)break;vec4 sp=zSoftP[i],sd=zSoftD[i];vec3 L=sp.xyz-vAmbP;float d2=max(dot(L,L),1e-4);L*=inversesqrt(d2);float cn=sp.w<-1.5?1.0:smoothstep(sp.w,sd.w,dot(-L,sd.xyz));e+=zSoftC[i].rgb*(max(dot(wN,L),0.0)*cn/(d2+zSoftC[i].w));}return e;}`)
  .replace('#include <lights_pars_begin>',THREE.ShaderChunk.lights_pars_begin.replace('float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );','float zR2 = max( decayExponent - 10.0, 0.0 ); float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent > 10.0 ? 2.0 : decayExponent ) + zR2, 0.01 );'))
  .replace('#include <opaque_fragment>','outgoingLight *= zGainF();\n#include <opaque_fragment>')
  .replace('#include <lights_fragment_maps>',THREE.ShaderChunk.lights_fragment_maps.replace('iblIrradiance += getIBLIrradiance( geometryNormal );','')+'\n\tirradiance += zAmb();')
  .replace('#include <lights_fragment_begin>',THREE.ShaderChunk.lights_fragment_begin.replace(/(pointLight = pointLights\[ i \];[\s\S]*?)(RE_Direct\()/,'$1directLight.color *= cauF( UNROLLED_LOOP_INDEX );\n\t\t$2')+'\n\treflectedLight.directDiffuse += zSoft( inverseTransformDirection( normal, viewMatrix ) ) * BRDF_Lambert( material.diffuseColor );');}   // 照り返しは部屋の箱の中で一定、境目（5cm）でなだらかに混ぜる。やわらかい光は three の光と同じ明るさの式（距離の2乗・円錐のぼかし）で拡散だけ
scene.traverse(o=>{if(o.isMesh&&o.material.isMeshStandardMaterial&&!o.material.userData.amb){o.material.userData.amb=1;o.material.onBeforeCompile=ambPatch;o.material.customProgramCacheKey=()=>'amb';o.material.needsUpdate=true;}});
function updateAmbient(lit){ROOMS.forEach(R=>R.E.setRGB(0,0,0));
 lit.forEach(c=>{const R=roomOf(c.pos)||(c.win&&roomOf(c.pos.clone().addScaledVector(c.dir,0.6)));if(!R)return;R.E.add(c.color.clone().multiplyScalar(c.flux/R.S));});
 for(let it=0;it<2;it++){const add=ROOMS.map(()=>new THREE.Color(0,0,0));LINKS.forEach(([a,b,k,A])=>{if(k)return;   // ドアの所は開口の光（SPILL）で分けるので、ここではいつも開いている所だけ
  const ia=ROOMS.findIndex(R=>R.n===a),ib=ROOMS.findIndex(R=>R.n===b);if(ia<0||ib<0)return;const Ra=ROOMS[ia],Rb=ROOMS[ib];
  add[ib].add(Ra.E.clone().multiplyScalar(0.5*A/Rb.S));add[ia].add(Rb.E.clone().multiplyScalar(0.5*A/Ra.S));});ROOMS.forEach((R,i)=>R.E.add(add[i].multiplyScalar(0.5)));}}
const lum=c=>0.2126*c.r+0.7152*c.g+0.0722*c.b;

// ===== 点灯している光（状態だけで決まる） =====
function litLights(){const L=[];const p=bedS.shadeP||0,tr=(1-p)+p*0.5;
 CAND.forEach(c=>{if(c.src.intensity>0)L.push(Object.assign(c,{flux:c.lm}));});
 WINC.forEach(c=>{if(c.frost){const sd=SUN.position.clone().sub(SUN.target.position).normalize(),Ev=(SKY_LUX*0.5+(night?0:SUN_LUX*SUN_K*Math.max(sd.dot(c.out),0)))*(night?MOON:1)*c.frost;c.intensity=Ev/Math.PI*c.area;c.color=night?lumColor(0xdfe4f2):lumColor(0xfaf7f0);c.flux=Ev*c.area;L.push(c);return;}   // 型ガラス：外の鉛直面の照度（空＋日射）×透過で光る面
  const Lsky=SKY_LUX/Math.PI*(night?MOON:1)*tr;c.intensity=Lsky*c.area;c.color=night?lumColor(0xdfe4f2):lumColor(0xf4f8ff);c.flux=SKY_LUX*0.5*c.area*tr*(night?MOON:1)+(!night?SUN_LUX*SUN_K*0.25*c.area*tr:0);L.push(c);});   // 窓の光束：空の鉛直面の照度（水平の約半分）×面積＋昼は窓に当たる日射の一部
 return L;}
// 映り込みの景色：組ごとに、組でいちばん大きい部屋の中心（床から1.2m）から撮る（組の光が変わったときだけ撮り直す）。拡散の明るさは zAmb で足すので、景色は照りと映り込みにだけ使う
const cubeRT=new THREE.WebGLCubeRenderTarget(128,{type:THREE.HalfFloatType}),cubeCam=new THREE.CubeCamera(0.05,40,cubeRT),pmrem=new THREE.PMREMGenerator(r);scene.add(cubeCam);
let CAPT=false;const ENV0=pmrem.fromScene(new THREE.Scene()).texture;REGIONS.forEach(G=>{G.env=ENV0;});   // 撮るまでは黒い景色（景色の有無でシェーダーが変わらないように）。撮るときは映り込みなしで撮る（古い景色、たとえば昼の明るい景色が映り込まないように。撮る順番や前の状態で結果が変わらないように）
function captureEnv(G){const R=G.rooms.reduce((a,b)=>a.vol>b.vol?a:b);cubeCam.position.set((R.mn[0]+R.mx[0])/2,Math.min(R.mn[1]+1.2,R.mx[1]-0.1),(R.mn[2]+R.mx[2])/2);cubeCam.updateMatrixWorld(true);
 if(cubeCam.coordinateSystem!==r.coordinateSystem){cubeCam.coordinateSystem=r.coordinateSystem;cubeCam.updateCoordinateSystem();}
 const prev=r.getRenderTarget();CAPT=true;cubeCam.children.forEach((c,i)=>{r.setRenderTarget(cubeRT,i);renderAll(c);});CAPT=false;r.setRenderTarget(prev);
 if(G.envRT)G.envRT.dispose();G.envRT=pmrem.fromCubemap(cubeRT.texture);G.env=G.envRT.texture;}
// ===== 状態が変わったとき：光を組の枠へ割り当て、影・照り返し・露出・映り込みを作り直す（chg：'door:キー'・'shade'・なし＝点灯や昼夜） =====
let Eref=1,lastShade=-1,WBc=new THREE.Color(1,1,1);
function relight(chg){envAll();const lit=litLights();updateAmbient(lit);const sh=bedS.shadeP||0;if(lastShade!==sh){if(lastShade>=0&&!chg)chg='shade';lastShade=sh;}
 SPILL.forEach(c=>{const R=roomOf(c.from);if(!DS[c.door]||!R)return;const E=R.E,Y=lum(E);if(Y<=0)return;c.color=E.clone().multiplyScalar(1/Y);c.intensity=0.5*Y/Math.PI*c.area;c.flux=0.5*Y*c.area;lit.push(c);const Q=roomOf(c.pos.clone().addScaledVector(c.dir,0.4));if(Q)Q.E.add(c.color.clone().multiplyScalar(c.flux/Q.S));});   // 向こうの部屋の照り返しの輝度（反射率0.5）×開口の面積。入った光は、こちらの部屋の照り返しにも足す
 {let w=new THREE.Color(0,0,0),f=0;lit.forEach(c=>{w.add(c.color.clone().multiplyScalar(c.flux));f+=c.flux;});if(f>0){w.multiplyScalar(1/lum(w));WBc=new THREE.Color(1,1,1).lerp(w,0.75);WBc.multiplyScalar(1/lum(WBc));}else WBc.setRGB(1,1,1);}   // 白の合わせ（目の慣れ）：点いている光の色の平均の75%を打ち消す（夜の電球色で部屋じゅうがオレンジにならないように）。家全体で1つ
 const wb=c=>new THREE.Color(c.r/WBc.r,c.g/WBc.g,c.b/WBc.b);
 ROOMS.forEach((R,i)=>{const e=wb(R.E);AMBU.zAmbE.value[i].set(e.r,e.g,e.b);});
 const dk=chg&&chg.startsWith('door:')?chg.slice(5):null,dRg=new Set();if(dk&&DOORWAYS[dk]){const d=DOORWAYS[dk],c=new THREE.Vector3(...d.c),n=new THREE.Vector3(...d.n);[0.4,-0.4].forEach(s=>{const q=c.clone().addScaledVector(n,s);dRg.add(regionAt(q.x,q.y,q.z));});}   // ドアの両側の組は影を作り直す
 REGIONS.forEach(G=>{const mine=lit.filter(c=>c.rg===G.i),ord=(a,b)=>b.flux-a.flux||a.id-b.id,sp=mine.filter(c=>c.type==='spot').sort(ord),pt=mine.filter(c=>c.type==='point').sort(ord),geo=dRg.has(G.i)||chg==='shade';
  const put=(s,c,isSpot)=>{const l=s.l,want=c?(isSpot?SPOT_MAP:POINT_MAP):4;if(l.shadow.mapSize.x!==want){l.shadow.mapSize.set(want,want);if(l.shadow.map){l.shadow.map.dispose();l.shadow.map=null;}}
   const changed=s.c!==c;s.c=c;if(!l.shadow.map)l.shadow.needsUpdate=true;if(!c){l.intensity=0;return;}l.position.copy(c.pos);l.color.copy(wb(c.color));l.intensity=c.intensity;l.decay=c.r2?10+c.r2:2;if(isSpot){l.target.position.copy(c.pos).add(c.dir);l.target.updateMatrixWorld();l.angle=c.angle;l.penumbra=c.penumbra;}l.updateMatrixWorld();if(changed||geo)l.shadow.needsUpdate=true;};
  G.spots.forEach((s,i)=>put(s,sp[i]||null,true));G.points.forEach((s,i)=>{const c=pt[i]||null;put(s,c,false);G.cau[i].set(c?c.pos.x:0,c?c.pos.y:0,c?c.pos.z:0,c&&c.src&&c.src.userData.caustic?1:0);});
  const soft=sp.slice(NS).concat(pt.slice(NP)).sort(ord).slice(0,SOFT_MAX);G.softN=soft.length;   // 影付きの枠に入らない光（多いときは弱い物から省く。省いた光も照り返しには入っている）
  soft.forEach((c,i)=>{const k=wb(c.color).multiplyScalar(c.intensity);G.softC[i].set(k.r,k.g,k.b,c.r2||0);if(c.type==='spot'){G.softP[i].set(c.pos.x,c.pos.y,c.pos.z,Math.cos(c.angle));G.softD[i].set(c.dir.x,c.dir.y,c.dir.z,Math.cos(c.angle*(1-c.penumbra)));}else{G.softP[i].set(c.pos.x,c.pos.y,c.pos.z,-2);G.softD[i].set(0,-1,0,1);}});
  G.nextSig=night+'|'+mine.map(c=>c.id+':'+c.intensity.toFixed(2)).join(',')+'|'+REGIONS.map(H=>H.rooms.map(R=>lum(R.E).toFixed(1)).join(',')).join(';')+'|'+(geo?Math.random():'');});
 SUN.intensity=night?0:SUN_LUX*SUN_K*((1-sh)+sh*0.5);SUN.color.copy(wb(lumColor(0xfff1dc)));if(dk||chg==='shade'||SUN.userData.night!==night){SUN.shadow.needsUpdate=true;SUN.userData.night=night;}
 {let mx=0;ROOMS.forEach(R=>mx=Math.max(mx,lum(R.E)));let sw=0,sl=0;ROOMS.forEach(R=>{const y=lum(R.E);if(y>0&&y>=0.05*mx){sw+=R.S;sl+=R.S*Math.log(y);}});Eref=sw?Math.exp(sl/sw):0.01;r.toneMappingExposure=Math.min(0.8,0.55/Math.pow(Math.max(Eref*3,0.5),0.8));}   // 露出（画面の明るさ）：家全体の部屋の明るさから1つ（立つ場所では変えない）。明るい部屋の面積の重み付きの対数平均（いちばん明るい部屋の5%未満の部屋は除く）
 ROOMS.forEach((R,i)=>{const y=lum(R.E);AMBU.zGain.value[i]=Math.min(4,Math.max(1,Math.pow(Math.max(y,1e-3)/Eref,-0.5)));});   // 目の慣れ（部屋ごと・状態だけで決まる）：家全体より暗い部屋は最大4倍まで明るく見せる（窓のない部屋がドアの向こうの明るい部屋の横で真っ暗にならないように）
 updShadows();updateGlow();REGIONS.forEach(G=>{if(G.nextSig!==G.sig){G.sig=G.nextSig;G.dirtyEnv=true;G.env=ENV0;}});REGIONS.forEach(G=>{if(G.dirtyEnv){G.dirtyEnv=false;captureEnv(G);}});}
// 影の画像を作る：three は影に入れる部品を「描くカメラの層」で選ぶので、組ごとの描画のついでに作ると、その組の部品しか影を落とさない。そこで、全部品（層0）＋組の光の層を見る、何も映らない向きのカメラで先に作る
const SHCAM=new THREE.PerspectiveCamera(1,1,0.1,0.2),SHRT=new THREE.WebGLRenderTarget(1,1);SHCAM.position.set(0,-1000,0);SHCAM.lookAt(0,-2000,0);SHCAM.updateMatrixWorld(true);
function updShadows(){const prev=r.getRenderTarget();r.setRenderTarget(SHRT);REGIONS.forEach(G=>{if(!SUN.shadow.needsUpdate&&!G.spots.concat(G.points).some(s=>s.l.shadow.needsUpdate))return;SHCAM.layers.set(0);SHCAM.layers.enable(LAY(G));r.render(scene,SHCAM);});r.setRenderTarget(prev);}
// ===== 描画：組ごとに、組の光・映り込みで描く（不透明を全部描いてから半透明） =====
function usePass(G){AMBU.zSoftP.value=G.softP;AMBU.zSoftD.value=G.softD;AMBU.zSoftC.value=G.softC;AMBU.zSoftN.value=G.softN;AMBU.zCauP.value=G.cau;scene.environment=CAPT?ENV0:G.env;}
const DEPTHM=new THREE.MeshBasicMaterial({colorWrite:false});   // 奥行きだけを描く材質（表の面だけ。裏だけを見せる材質は無い）
function renderAll(camera){const bg=scene.background,mask=camera.layers.mask;scene.background=null;r.autoClear=false;r.setClearColor(bg||0x000000,1);r.clear();scene.updateMatrixWorld();scene.matrixWorldAutoUpdate=false;
 camera.layers.disableAll();REGIONS.forEach(G=>camera.layers.enable(LAY(G)));scene.overrideMaterial=DEPTHM;r.render(scene,camera);scene.overrideMaterial=null;   // 先に不透明の奥行きだけを描く（後の組に隠れる所を光の計算で塗らない）
 [LAY,LAYT].forEach(f=>REGIONS.forEach(G=>{usePass(G);camera.layers.set(f(G));r.render(scene,camera);}));
 camera.layers.mask=mask;scene.background=bg;scene.matrixWorldAutoUpdate=true;r.autoClear=true;}
// 光る部品・ガラス：色の仕上げで露出がかかるので、露出の分を先に打ち消す（見た目の色のまま）。電球のガラス・G1 のガラス（半透明か emissiveMap あり）の光る色も同じ。それ以外の光る色（天井・布などの明るさの補い）は物理的な光で照らすので使わない
const GLOW=[];scene.traverse(o=>{if(o.isMesh&&o.material.isMeshBasicMaterial&&!o.userData.occ&&!GLOW.some(g=>g.m===o.material))GLOW.push({m:o.material,c:o.material.color.clone()});});
const EMIT=[],FAKE=[];scene.traverse(o=>{const m=o.material;if(!o.isMesh||!m.emissive||EMIT.includes(m)||FAKE.includes(m))return;(m.transparent||m.emissiveMap?EMIT:FAKE).push(m);});
let lastExp=1;function updateGlow(){lastExp=r.toneMappingExposure;GLOW.forEach(g=>{g.m.color.copy(g.c).multiplyScalar(1/lastExp);});EMIT.forEach(m=>m.emissiveIntensity=1/lastExp);}
{const _e=envAll;envAll=function(){GLOW.forEach(g=>g.m.color.copy(g.c));_e();FAKE.forEach(m=>m.emissive.setRGB(0,0,0));GLOW.forEach(g=>{g.c.copy(g.m.color);g.m.color.multiplyScalar(1/Math.max(lastExp,1e-6));});};}   // 点灯・昼夜で光る部品の色が変わるので、元の色を取り直す
draw=function(){if(!ready)return;cam.rotation.set(pitch,yaw,0);r.setRenderTarget(null);renderAll(cam);};
applyEnvAll=function(){relight();draw();};
{const _td=toggleDoor;toggleDoor=function(k){const was=DS[k];_td(k);if(DS[k]!==was){relight('door:'+k);draw();}};}
applyEnvAll();
{let n=0;const t=setInterval(()=>{draw();if(++n>=3)clearInterval(t);},400);}   // 読み込み中の表示が消えた後にも描き直す（開いた直後に画面が暗いままにならないように）
