// 試作C：実時間の影付きの照明（照明仕様書の光束・色温度から物理的な明るさ）＋部屋ごとの照り返しの明るさ。光の範囲指定（lightZones）は使わない
// 影：部品は動かないので、点灯・昼夜・ドア・割り当てが変わったときだけ描き直す。影を付ける光の数には上限（カメラの近くで効いている光から順に割り当て）
r.toneMapping=THREE.NeutralToneMapping;
r.shadowMap.enabled=true;r.shadowMap.type=THREE.PCFShadowMap;   // 影の縁のぼかしは光ごとの radius で（PCFSoft はぼかしの大きさを変えられず、縁が点々になる）
const Q=new URLSearchParams(location.search),N_SPOT=+(Q.get('spots')||7),N_POINT=+(Q.get('points')||3);   // 影付きの光の数（影の画像1枚につきテクスチャの枠を1つ使う。枠は16まで（材質の柄の分を残す））

// ===== 照明の仕様（LS のキーごと。lm：1灯の光束、K：色温度、kind：lamb＝拡散（中心が明るく周りへなだらか）、cone＝絞った光（α：中心から縁までの角度）、bracket＝箱の上下の開口、bulb＝電球（全方向）） =====
const SPEC={a6:{lm:320,K:3500,kind:'cone',a:37.5},a4:{lm:440,K:3500,kind:'lamb'},a2:{lm:620,K:3500,kind:'cone',a:30},h1:{lm:440,K:3500,kind:'lamb'},a5:{lm:350,K:2400,kind:'bulb'},a3:{lm:326,K:2700,kind:'cone',a:20},a1:{lm:440,K:3500,kind:'lamb'},
 bdl:{lm:440,K:2700,kind:'lamb'},bbr:{lm:318,K:2700,kind:'bracket'},j1:{lm:440,K:2700,kind:'lamb'},d1:{lm:440,K:5000,kind:'lamb'},e1:{lm:1520,K:3500,kind:'lamb'},eh:{lm:440,K:2700,kind:'lamb',bulb:{lm:350,K:2400}},ec:{lm:440,K:2700,kind:'lamb'},ek:{lm:440,K:2700,kind:'lamb'},
 g1:{lm:312,K:2700,kind:'bulb'},bath:{lm:440,K:5000,kind:'lamb'},l1:{lm:440,K:5000,kind:'lamb'},k1:{lm:440,K:3500,kind:'lamb'}};
const KCOL={2400:0xffb066,2700:0xffc68e,3500:0xffd9b4,5000:0xfff3e8};   // 色温度ごとの光の色（全部屋共通の決まり）。明るさは光束で決めるので、色は明るさ1にそろえて使う
const lumColor=hex=>{const c=new THREE.Color(hex),y=0.2126*c.r+0.7152*c.g+0.0722*c.b;return c.multiplyScalar(1/y);};
const SKY_LUX=15000,SUN_LUX=70000,SUN_AZ=150,SUN_EL=38,MOON=4e-5;   // 空（水平面の照度）・太陽（法線照度）・太陽の向き（方位：北から時計回り、高度）・夜の月明かり（空の何倍か）

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
// 窓（空の光）：窓の外30cmから室内へ向けた拡散の光（明るさは空の輝度×窓の面積）。窓の情報は trial/pre.js が記録
const WINC=(typeof BAKE_WINDOWS!=='undefined'?BAKE_WINDOWS:[]).map(wd=>{const c=new THREE.Vector3(...wd.c),o=new THREE.Vector3(...wd.out),A=wd.w*wd.h;return {group:'sky',type:'spot',pos:c.clone().addScaledVector(o,0.3),dir:o.clone().negate(),angle:THREE.MathUtils.degToRad(65),penumbra:1,area:A,win:wd};});   // 広がりは130°まで（広すぎると影の画像1枚が受け持つ範囲が広く、縁が粗くなる）
ORIG.forEach(l=>l.visible=false);

// ===== 影付きの光の枠（数は固定＝シェーダーを作り直さない）と、太陽 =====
const SLOTS={spot:[],point:[]};
for(let i=0;i<N_SPOT;i++){const l=new THREE.SpotLight(0xffffff,0,0,1,1,2);l.castShadow=true;l.shadow.mapSize.set(1536,1536);l.shadow.camera.near=0.05;l.shadow.camera.far=8;l.shadow.bias=-0.0008;l.shadow.normalBias=0.035;l.shadow.radius=3;l.shadow.autoUpdate=false;scene.add(l);scene.add(l.target);SLOTS.spot.push({l,c:null});}
for(let i=0;i<N_POINT;i++){const l=new THREE.PointLight(0xffffff,0,0,2);l.castShadow=true;l.shadow.mapSize.set(512,512);l.shadow.camera.near=0.03;l.shadow.camera.far=8;l.shadow.bias=-0.001;l.shadow.normalBias=0.035;l.shadow.autoUpdate=false;scene.add(l);SLOTS.point.push({l,c:null});}
const SUN=new THREE.DirectionalLight(0xffffff,0);{const az=THREE.MathUtils.degToRad(SUN_AZ),el=THREE.MathUtils.degToRad(SUN_EL),d=new THREE.Vector3(Math.sin(az)*Math.cos(el),Math.sin(el),-Math.cos(az)*Math.cos(el));   // 太陽への向き（X東・Y上・Z南。北から時計回りの方位）
 SUN.position.set(1.3,3,3.6).addScaledVector(d,20);SUN.target.position.set(1.3,3,3.6);SUN.castShadow=true;SUN.shadow.mapSize.set(4096,4096);const sc=SUN.shadow.camera;sc.left=-6;sc.right=6;sc.top=6;sc.bottom=-6;sc.near=12;sc.far=30;SUN.shadow.radius=3;SUN.shadow.bias=-0.0015;SUN.shadow.normalBias=0.05;SUN.shadow.autoUpdate=false;scene.add(SUN);scene.add(SUN.target);}

// 天井と壁の境目から光が漏れないための「影だけを落とす板」（画面には描かない）
{const occ=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false});(typeof CEILS!=='undefined'?CEILS:[]).forEach(([x0,x1,z0,z1,y])=>{if(y<HOUSE.ldk.FL2)return;const b=new THREE.Mesh(new THREE.BoxGeometry(x1-x0+1.0,0.02,z1-z0+1.0),occ);b.position.set((x0+x1)/2,y+0.3,(z0+z1)/2);b.castShadow=true;b.userData.occ=1;scene.add(b);});}   // 2階の天井だけ（1階は上に2階の床がある）。天井に接した所で影の判定がすり抜けないよう、遮る板は30cm上に、各辺50cm大きく
// 影を落とす・受ける（ガラス・半透明・光る部品は影を落とさない）。影は光から見て裏の面で作る（three.js の標準。この家の壁は隣の部屋の面と2枚1組なので光は通り抜けず、表の面の縞＝シャドウアクネも出ない）
scene.traverse(o=>{if(!o.isMesh||o.userData.occ)return;const m=o.material;if(m.userData&&m.userData.noEnv)m.envMapIntensity=0;o.receiveShadow=!m.isMeshBasicMaterial;o.castShadow=!(m.isMeshBasicMaterial||m.transparent);if(m.isMeshBasicMaterial)m.toneMapped=false;});

// ===== 部屋ごとの照り返しの明るさ（間接光の代わり）：部屋に入る光の量 ÷ 部屋の内側の面積（反射率約0.5の部屋の照り返しの目安）。開いたドア・開口から隣の部屋へも分ける =====
const ZB=ZBASE;const RN=['f1N','f1S','datsu','sen','ent','entC','entK','toi','bath','void','hall','bed','wic','study'];
const ROOMS=RN.filter(n=>ZB[n]).map(n=>{const z=n==='hall'?[ZB.hall[0],[ZB.hall[1][0],ZB.hall[1][1],HOUSE.bed.Z0-0.115]]:ZB[n],mn=z[0],mx=z[1],dx=mx[0]-mn[0],dy=Math.min(mx[1]-mn[1],3),dz=mx[2]-mn[2];return {n,mn,mx,S:2*(dx*dz+dx*dy+dz*dy),E:new THREE.Color()};});
const inBox=(p,R)=>p.x>=R.mn[0]&&p.x<=R.mx[0]&&p.y>=R.mn[1]&&p.y<=R.mx[1]&&p.z>=R.mn[2]&&p.z<=R.mx[2];
const roomOf=p=>{let best=null,vol=1e9;ROOMS.forEach(R=>{if(inBox(p,R)){const v=(R.mx[0]-R.mn[0])*(R.mx[1]-R.mn[1])*(R.mx[2]-R.mn[2]);if(v<vol){vol=v;best=R;}}});return best;};
const LINKS=[['bed','hall','sg311',1.6],['bed','wic','sg500w',1.5],['bed','study','sg33s',1.5],['datsu','f1N','sg300l',1.6],['datsu','sen','sg300w',1.6],['sen','entC','sg33',1.6],['entC','f1S','sg11h',1.8],['ent','toi','sg500',1.5],['datsu','bath','bath',1.6],
 ['hall','void',null,6],['void','f1S',null,8],['void','f1N',null,4],['f1N','f1S',null,6],['entC','ent',null,2],['ent','entK',null,2]];   // 部屋のつながり（ドアのキー、null＝いつも開いている）と開口の面積（m²、目安）
const AMB_MAX=16,AMBU={zCauP:{value:Array.from({length:Math.max(1,N_POINT)},()=>new THREE.Vector4())},zCau:{value:ZU.zCau.value},zCauK:{value:ZU.zCauK.value},zAmbMin:{value:Array.from({length:AMB_MAX},()=>new THREE.Vector4(1,1,1,0))},zAmbMax:{value:Array.from({length:AMB_MAX},()=>new THREE.Vector4(0,0,0,0))},zAmbE:{value:Array.from({length:AMB_MAX},()=>new THREE.Vector3())},zAmbN:{value:0}};
ROOMS.forEach((R,i)=>{AMBU.zAmbMin.value[i].set(R.mn[0],R.mn[1],R.mn[2],0.05);AMBU.zAmbMax.value[i].set(R.mx[0],R.mx[1],R.mx[2],0);});AMBU.zAmbN.value=ROOMS.length;
function ambPatch(sh){Object.assign(sh.uniforms,AMBU);
 sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vAmbP;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvAmbP=(modelMatrix*vec4(transformed,1.0)).xyz;');
 sh.fragmentShader=sh.fragmentShader.replace('#include <common>',`#include <common>
varying vec3 vAmbP;uniform vec4 zAmbMin[${AMB_MAX}];uniform vec4 zAmbMax[${AMB_MAX}];uniform vec3 zAmbE[${AMB_MAX}];uniform int zAmbN;
uniform vec4 zCauP[${Math.max(1,N_POINT)}];uniform sampler2D zCau;uniform vec4 zCauK;
float cauF(int li){vec4 c=zCauP[li];if(c.w<0.5)return 1.0;vec3 d=normalize(vAmbP-c.xyz);float p=texture2D(zCau,vec2(atan(d.z,d.x)*0.1591549+0.5,asin(clamp(d.y,-1.0,1.0))*0.3183099+0.5)).r;
 float cd=-d.y,op=smoothstep(zCauK.x-0.015,zCauK.x+0.015,cd),gl=zCauK.z*(0.3+1.6*p)*(1.0-smoothstep(zCauK.y-0.02,zCauK.y+0.01,d.y)),rim=zCauK.w*exp(-pow((cd-zCauK.x+0.02)/0.03,2.0))*(0.5+p);return mix(gl,1.0,op)+rim;}
vec3 zAmb(){vec3 a=vec3(0.0);float ws=0.0;for(int i=0;i<${AMB_MAX};i++){if(i>=zAmbN)break;vec4 mn=zAmbMin[i],mx=zAmbMax[i];vec3 d=max(mn.xyz-vAmbP,vAmbP-mx.xyz);float w=1.0-smoothstep(0.0,mn.w,max(max(d.x,d.y),d.z));if(w>0.0){a+=zAmbE[i]*w;ws+=w;}}return ws>0.0?a/max(ws,1.0):vec3(0.0);}`)
  .replace('#include <lights_fragment_maps>',THREE.ShaderChunk.lights_fragment_maps.replace('iblIrradiance += getIBLIrradiance( geometryNormal );','')+'\n\tirradiance += zAmb();').replace('#include <lights_fragment_begin>',THREE.ShaderChunk.lights_fragment_begin.replace(/(pointLight = pointLights\[ i \];[\s\S]*?)(RE_Direct\()/,'$1directLight.color *= cauF( UNROLLED_LOOP_INDEX );\n\t\t$2'));}   // 部屋の箱の中では部屋の明るさ、境目（5cm。壁の厚さを越えて隣の部屋へ混ざらないように）ではなだらかに混ぜる
scene.traverse(o=>{if(o.isMesh&&o.material.isMeshStandardMaterial&&!o.material.userData.amb){o.material.userData.amb=1;o.material.onBeforeCompile=ambPatch;o.material.customProgramCacheKey=()=>'amb';o.material.needsUpdate=true;}});
function updateAmbient(lit){ROOMS.forEach(R=>R.E.setRGB(0,0,0));
 lit.forEach(c=>{const R=roomOf(c.pos)||(c.win&&roomOf(c.pos.clone().addScaledVector(c.dir,0.6)));if(!R)return;R.E.add(c.color.clone().multiplyScalar(c.flux/R.S));});
 for(let it=0;it<2;it++){const add=ROOMS.map(()=>new THREE.Color());LINKS.forEach(([a,b,k,A])=>{if(k)return;   // ドアの所は開口の光（SPILL）で分けるので、ここではいつも開いている所だけ
 const ia=ROOMS.findIndex(R=>R.n===a),ib=ROOMS.findIndex(R=>R.n===b);if(ia<0||ib<0)return;const Ra=ROOMS[ia],Rb=ROOMS[ib];
  add[ib].add(Ra.E.clone().multiplyScalar(0.5*A/Rb.S));add[ia].add(Rb.E.clone().multiplyScalar(0.5*A/Ra.S));});ROOMS.forEach((R,i)=>R.E.add(add[i].multiplyScalar(0.5)));}
 ROOMS.forEach((R,i)=>AMBU.zAmbE.value[i].set(R.E.r,R.E.g,R.E.b));}

// 開いたドアの開口から隣の部屋へ漏れる光：開口を、向こうの部屋の明るさ（照り返しの輝度＝反射率×照度÷π）で光る面として、こちら向きの拡散の光にする（影付き）
const SPILL=[];Object.entries(typeof DOORWAYS!=='undefined'?DOORWAYS:{}).forEach(([k,d])=>{const c=new THREE.Vector3(...d.c),n=new THREE.Vector3(...d.n);[1,-1].forEach(sg=>{const dir=n.clone().multiplyScalar(sg);SPILL.push({group:'spill',door:k,type:'spot',pos:c.clone().addScaledVector(dir,-0.05),dir,angle:THREE.MathUtils.degToRad(85),penumbra:1,area:d.w*d.h,src:null,from:c.clone().addScaledVector(dir,-0.4)});});});
// G1（userData.caustic の電球）は、光源からの向きで明るさを変える（揺らいだ光の模様。もとの cauF と同じ計算。zCauP：電球の枠ごとの位置と、G1かどうか）
// ===== 点灯している光・昼夜から、影付きの枠へ割り当てる =====
let litList=[],lastAssignPos=new THREE.Vector3(1e9,0,0),stateKey='';
function litLights(){const L=[];const p=bedS.shadeP||0,tr=(1-p)+p*0.5;
 CAND.forEach(c=>{if(c.src.intensity>0)L.push(Object.assign(c,{power:1,flux:c.lm}));});
 WINC.forEach(c=>{const Lsky=SKY_LUX/Math.PI*(night?MOON:1)*tr,col=night?lumColor(0xa8bcff):lumColor(0xf4f8ff);c.intensity=Lsky*c.area;c.color=col;c.flux=SKY_LUX*0.5*c.area*tr*(night?MOON:1)+(!night?SUN_LUX*0.25*c.area*tr:0);L.push(c);});   // 窓の光束：空の鉛直面の照度（水平の約半分）×面積＋昼は窓に当たる日射の一部
 return L;}
function assign(force){const cp=cam.position;if(!force&&cp.distanceTo(lastAssignPos)<0.5)return;lastAssignPos.copy(cp);
 const score=c=>{const d=Math.max(0.5,c.pos.distanceTo(cp));return (c.intensity*(c.type==='point'?4*Math.PI:Math.PI))/(d*d);};   // カメラの近くで効いている光から
 ['spot','point'].forEach(t=>{const want=litList.filter(c=>c.type===t).sort((a,b)=>score(b)-score(a)).slice(0,SLOTS[t].length);
  const keep=new Set(want);SLOTS[t].forEach(s=>{if(s.c&&!keep.has(s.c))s.c=null;});
  want.forEach(c=>{if(SLOTS[t].some(s=>s.c===c))return;const s=SLOTS[t].find(s=>!s.c);s.c=c;s.dirty=true;});
  SLOTS[t].forEach((s,i)=>{const l=s.l,c=s.c;if(t==='point')AMBU.zCauP.value[i].set(c?c.pos.x:0,c?c.pos.y:0,c?c.pos.z:0,c&&c.src&&c.src.userData.caustic?1:0);if(!c){l.intensity=0;return;}l.position.copy(c.pos);l.color.copy(c.color);l.intensity=c.intensity;if(t==='spot'){l.target.position.copy(c.pos).add(c.dir);l.target.updateMatrixWorld();l.angle=c.angle;l.penumbra=c.penumbra;}if(s.dirty){l.shadow.needsUpdate=true;s.dirty=false;}});});}
// 照り・映り込み：いる部屋の中心（床から1.2m）から周りを撮った景色（部屋を移ったとき・状態が変わったときだけ撮り直す）。拡散の明るさは zAmb で足すので、景色は照りと映り込みにだけ使う
let envRT=null,envRoom=null;const cubeRT=new THREE.WebGLCubeRenderTarget(128,{type:THREE.HalfFloatType}),cubeCam=new THREE.CubeCamera(0.05,40,cubeRT),pmrem=new THREE.PMREMGenerator(r);scene.add(cubeCam);
function captureEnv(R){if(!R)return;envRoom=R;cubeCam.position.set((R.mn[0]+R.mx[0])/2,Math.min(R.mn[1]+1.2,R.mx[1]-0.1),(R.mn[2]+R.mx[2])/2);scene.environment=null;cubeCam.update(r,scene);if(envRT)envRT.dispose();envRT=pmrem.fromCubemap(cubeRT.texture);scene.environment=envRT.texture;}
function relight(){envAll();litList=litLights();updateAmbient(litList);
 SPILL.forEach(c=>{const R=roomOf(c.from);if(!DS[c.door]||!R){return;}const E=R.E,Y=0.2126*E.r+0.7152*E.g+0.0722*E.b;if(Y<=0)return;c.color=E.clone().multiplyScalar(1/Y);c.intensity=0.5*Y/Math.PI*c.area;c.flux=0.5*Y*c.area;litList.push(c);});   // 向こうの部屋の照り返しの輝度（反射率0.5）×開口の面積
 SUN.intensity=night?0:SUN_LUX*((1-(bedS.shadeP||0))+(bedS.shadeP||0)*0.5);SUN.color.copy(lumColor(0xfff1dc));SUN.shadow.needsUpdate=true;
 SLOTS.spot.concat(SLOTS.point).forEach(s=>{s.c=null;s.l.shadow.needsUpdate=true;});assign(true);
 const R=roomOf(cam.position);captureEnv(R);const E=R?(0.2126*R.E.r+0.7152*R.E.g+0.0722*R.E.b):10;r.toneMappingExposure=Math.min(0.25,0.9/Math.pow(Math.max(E*3,0.5),0.8));}   // 露出：いる部屋の明るさから（目の慣れ。暗い所では慣れきらない）
applyEnvAll=function(){relight();draw();};
{const _td=toggleDoor;toggleDoor=function(k){_td(k);relight();draw();};}
// ===== 描画：場面 → 陰（GTAO：画面上で計算する、角・接地面のやわらかい陰）→ 色の仕上げ（トーンマッピング） =====
const AO=Q.get('ao')!=='0';   // ?ao=0 で陰なし（比べる用）
const composer=new THREE.EffectComposer(r,new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:4}));composer.addPass(new THREE.RenderPass(scene,cam));
const aoPass=new THREE.GTAOPass(scene,cam,innerWidth,innerHeight);aoPass.blendIntensity=0.8;aoPass.updateGtaoMaterial({radius:0.25,distanceExponent:1,thickness:1,scale:1,samples:16,distanceFallOff:1});aoPass.updatePdMaterial({lumaPhi:10,depthPhi:2,normalPhi:3,radius:6,rings:2,samples:16});{const os=aoPass.setSize.bind(aoPass);aoPass.setSize=(w,h)=>os(Math.ceil(w/2),Math.ceil(h/2));}if(AO)composer.addPass(aoPass);   // 陰は半分の解像度で計算する（ぼんやりした物なので見た目はほぼ同じで、計算は約1/4）
composer.addPass(new THREE.OutputPass());
// 光る部品・ガラス：色の仕上げで露出がかかるので、露出の分を先に打ち消す（見た目の色のまま）
const GLOW=[];scene.traverse(o=>{if(o.isMesh&&o.material.isMeshBasicMaterial&&!o.userData.occ&&!GLOW.some(g=>g.m===o.material))GLOW.push({m:o.material,c:o.material.color.clone()});});
const EMIT=[];scene.traverse(o=>{if(o.isMesh&&o.material.emissive&&!EMIT.includes(o.material))EMIT.push(o.material);});   // 光る色（emissive）を持つ材質も同じく露出を打ち消す（点灯した電球のガラスなど）
let lastSize='',lastExp=-1;
draw=function(){if(!ready)return;assign(false);const R=roomOf(cam.position);if(R&&R!==envRoom)captureEnv(R);if(R){const E=0.2126*R.E.r+0.7152*R.E.g+0.0722*R.E.b;r.toneMappingExposure=Math.min(0.25,0.9/Math.pow(Math.max(E*3,0.5),0.8));}
 const sz=r.getSize(new THREE.Vector2()),key=sz.x+'x'+sz.y+'@'+r.getPixelRatio();if(key!==lastSize){lastSize=key;composer.setPixelRatio(r.getPixelRatio());composer.setSize(sz.x,sz.y);}
 if(r.toneMappingExposure!==lastExp){lastExp=r.toneMappingExposure;GLOW.forEach(g=>{g.m.color.copy(g.c).multiplyScalar(1/lastExp);});EMIT.forEach(m=>m.emissiveIntensity=1/lastExp);}
 cam.rotation.set(pitch,yaw,0);composer.render();};
{const _e=envAll;envAll=function(){GLOW.forEach(g=>g.m.color.copy(g.c));_e();GLOW.forEach(g=>{g.c.copy(g.m.color);g.m.color.multiplyScalar(1/Math.max(lastExp,1e-6));});};}   // 点灯・昼夜で光る部品の色が変わるので、元の色を取り直す
applyEnvAll();
