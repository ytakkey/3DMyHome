// 検証版（stg）：ライトマップ方式（0章の要件・8章）。点灯・昼夜・ドア・シェードが変わったときだけ、光（影を含む）と照り返しを面の画像（ライトマップ）に描き込み、普段の描画はその画像を貼るだけ
// 画像の1画素＝面の上の1点（stg/pre.js が付けた属性 lm で対応）。まず各画素の位置・向き・色（G-buffer）を作り、光ごとに「その点から光が見えるか」を影の画像で調べて明るさを足す
r.toneMapping=THREE.AgXToneMapping;   // 明るい所をなだらかに圧縮する（日なたが白く飛ばず、暗めの所も見える）
const LMW=LM.W,LMH=LM.H;
// ===== G-buffer：画素ごとの位置（家の座標）・向き・色（反射率） =====
const GB=new THREE.WebGLRenderTarget(LMW,LMH,{count:3,type:THREE.FloatType,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthBuffer:false,generateMipmaps:false});
const GB2=GB.clone();   // すき間を埋めるときの入れ替え用
const gbMat=(m)=>new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,side:THREE.DoubleSide,depthTest:false,depthWrite:false,
 uniforms:{color:{value:(m.color||new THREE.Color(1,1,1)).clone()},map:{value:m.map||null},hasMap:{value:!!m.map},uvT:{value:new THREE.Matrix3()},WH:{value:new THREE.Vector2(LMW,LMH)}},
 vertexShader:`in vec4 lm;out vec3 vP;out vec3 vN;out vec2 vUv;flat out float vId;uniform mat3 uvT;uniform vec2 WH;
void main(){vec4 wp=modelMatrix*vec4(position,1.0);vP=wp.xyz;vN=normalize(mat3(modelMatrix)*normal);
#ifdef HAS_UV
vUv=(uvT*vec3(uv,1.0)).xy;
#else
vUv=vec2(0.0);
#endif
vId=lm.z>0.5?-1.0:lm.w+1.0;vec2 t=lm.z>0.5?(lm.xy+0.5)/WH:lm.xy;gl_Position=vec4(t*2.0-1.0,0.0,1.0);gl_PointSize=1.0;}`,
 fragmentShader:`in vec3 vP;in vec3 vN;in vec2 vUv;flat in float vId;uniform vec3 color;uniform sampler2D map;uniform bool hasMap;
layout(location=0) out vec4 oP;layout(location=1) out vec4 oN;layout(location=2) out vec4 oA;
void main(){vec3 a=color;if(hasMap)a*=texture(map,vUv).rgb;oP=vec4(vP,vId);oN=vec4(normalize(vN),1.0);oA=vec4(a,1.0);}`});   // 位置の w：チャートの番号＋1（頂点ごとの画素は −1、まだ書かれていない画素は 0）
const LMOBJ=[];   // lm を持つ部品（描画の材質に画像を貼る対象）
{const gs=new THREE.Scene();scene.updateMatrixWorld(true);
 scene.traverse(o=>{if(!o.isMesh||!o.geometry.attributes.lm)return;LMOBJ.push(o);const m=o.material,gm=gbMat(m);if(o.geometry.attributes.uv)gm.defines={HAS_UV:1};if(m.map){m.map.updateMatrix();gm.uniforms.uvT.value.copy(m.map.matrix);}
  const vert=o.geometry.attributes.lm.getZ(0)>0.5,px=vert?new THREE.Points(o.geometry,gm):new THREE.Mesh(o.geometry,gm);px.matrixAutoUpdate=false;px.matrixWorld.copy(o.matrixWorld);px.matrix.copy(o.matrixWorld);px.frustumCulled=false;gs.add(px);});
 const cam0=new THREE.Camera();r.setRenderTarget(GB);r.setClearColor(0x000000,0);r.clear();gs.traverse(o=>{if(o.isMesh||o.isPoints)o.updateMatrixWorld=()=>{};});r.render(gs,cam0);
 // すき間を埋める：まだ書かれていない画素（チャートの余白・細い三角形の取りこぼし）に、となりの書かれた画素の値を入れる（2回）
 const dil=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,depthTest:false,depthWrite:false,uniforms:{tP:{value:null},tN:{value:null},tA:{value:null}},vertexShader:`void main(){gl_Position=vec4(position.xy,0.0,1.0);}`,
  fragmentShader:`uniform sampler2D tP,tN,tA;layout(location=0) out vec4 oP;layout(location=1) out vec4 oN;layout(location=2) out vec4 oA;
void main(){ivec2 c=ivec2(gl_FragCoord.xy);vec4 p=texelFetch(tP,c,0);if(p.w!=0.0){oP=p;oN=texelFetch(tN,c,0);oA=texelFetch(tA,c,0);return;}
 vec4 sp=vec4(0.0),sn=vec4(0.0),sa=vec4(0.0);float id=0.0,k=0.0;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){ivec2 q=c+ivec2(x,y);vec4 pp=texelFetch(tP,q,0);if(pp.w>0.0&&(id==0.0||pp.w==id)){id=pp.w;sp+=vec4(pp.xyz,1.0);sn+=texelFetch(tN,q,0);sa+=texelFetch(tA,q,0);}}
 if(sp.w>0.0){oP=vec4(sp.xyz/sp.w,id);oN=vec4(normalize(sn.xyz),1.0);oA=vec4(sa.xyz/sp.w,1.0);}else{oP=vec4(0.0);oN=vec4(0.0);oA=vec4(0.0);}}`});
 const fq=new THREE.Mesh(new THREE.PlaneGeometry(2,2),dil);fq.frustumCulled=false;const fs=new THREE.Scene();fs.add(fq);let a=GB,b=GB2;
 for(let i=0;i<4;i++){dil.uniforms.tP.value=a.textures[0];dil.uniforms.tN.value=a.textures[1];dil.uniforms.tA.value=a.textures[2];r.setRenderTarget(b);r.render(fs,cam0);[a,b]=[b,a];}
 if(a!==GB){dil.uniforms.tP.value=a.textures[0];dil.uniforms.tN.value=a.textures[1];dil.uniforms.tA.value=a.textures[2];r.setRenderTarget(GB);r.render(fs,cam0);}
 r.setRenderTarget(null);gs.traverse(o=>{if(o.material&&o.material.dispose)o.material.dispose();});}
// ===== 照明の仕様（LS のキーごと。lm：1灯の光束、K：色温度、kind：lamb＝拡散（中心が明るく周りへなだらか）、cone＝絞った光（α：中心から縁までの角度）、bracket＝箱の上下の開口、bulb＝電球（全方向）） =====
const SPEC={a6:{lm:320,K:3500,kind:'cone',a:37.5},a4:{lm:440,K:3500,kind:'lamb'},a2:{lm:620,K:3500,kind:'cone',a:30},h1:{lm:440,K:3500,kind:'lamb'},a5:{lm:350,K:2400,kind:'bulb'},a3:{lm:326,K:2700,kind:'cone',a:20},a1:{lm:440,K:3500,kind:'lamb'},
 bdl:{lm:440,K:2700,kind:'lamb'},bbr:{lm:318,K:2700,kind:'bracket'},j1:{lm:440,K:2700,kind:'lamb'},d1:{lm:440,K:5000,kind:'lamb'},e1:{lm:1520,K:3500,kind:'lamb'},eh:{lm:440,K:2700,kind:'lamb',bulb:{lm:350,K:2400}},ec:{lm:440,K:2700,kind:'lamb'},ek:{lm:440,K:2700,kind:'lamb'},
 g1:{lm:312,K:2700,kind:'bulb'},bath:{lm:440,K:5000,kind:'lamb'},l1:{lm:440,K:5000,kind:'lamb'},k1:{lm:440,K:3500,kind:'lamb'}};
const KCOL={2400:0xffb066,2700:0xffc68e,3500:0xffd9b4,5000:0xfff3e8};   // 色温度ごとの光の色（全部屋共通の決まり）。明るさは光束で決めるので、色は明るさ1にそろえて使う
const lumColor=hex=>{const c=new THREE.Color(hex),y=0.2126*c.r+0.7152*c.g+0.0722*c.b;return c.multiplyScalar(1/y);};
const SKY_LUX=550,SUN_LUX=70000,SUN_AZ=150,SUN_EL=38,MOON=0.04;   // 空（水平面の照度）・太陽（法線照度）・太陽の向き（方位：北から時計回り、高度）・夜の月明かり（空の何倍か）。
// 露出は全ての状態で同じ固定値（EXPO）なので、照明だけで照らされた部屋は昼でも夜でも同じに見える。そのため昼の光は実際より弱めにして、照明の部屋と同じ露出で白く飛ばないようにする（ゲームの昼の明るさ。SKY_LUX・SUN_K は画像で見て調整した値）

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

// 型ガラス（玄関ドアの窓 entGl）：直射は通さず、外の鉛直面の照度（空＋日射）×透過で光る面の光にする。wash.js の中の名前なので、玄関まわりの両面・光らない板の立った面として探す
const FROST=[];scene.traverse(o=>{const m=o.material;if(!o.isMesh||!m.isMeshBasicMaterial||m.side!==THREE.DoubleSide)return;o.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(o),c=b.getCenter(new THREE.Vector3()),sz=b.getSize(new THREE.Vector3());
 if(Math.min(sz.x,sz.z)>0.005||sz.y<0.3||c.z<6.5)return;const n=new THREE.Vector3(0,0,1),A=sz.x*sz.y;FROST.push(o);   // 玄関ドアは南（+z）の外壁
 WINC.push({group:'sky',type:'spot',pos:c.clone().addScaledVector(n,-0.03),dir:n.clone().negate(),angle:THREE.MathUtils.degToRad(80),penumbra:1,area:A,r2:A/Math.PI,frost:0.8,out:n,mesh:o,win:{c:c.toArray()}});});
const SUN_K=0.012;   // 直射日光の強さの倍率（日の当たる所が真っ白に飛ばない程度に弱める。自然に見える値に調整）
const SUNDIR=(()=>{const az=THREE.MathUtils.degToRad(SUN_AZ),el=THREE.MathUtils.degToRad(SUN_EL);return new THREE.Vector3(Math.sin(az)*Math.cos(el),Math.sin(el),-Math.cos(az)*Math.cos(el));})();   // 太陽への向き（X東・Y上・Z南）

// ===== 影の画像（光から見た、いちばん近い物までの距離）を作るための、光を遮る物の形 =====
// 動かない部品は1つの形にまとめ、ドアは開いた形・閉じた形を別々に持って開閉で切り替える。ガラス・光る部品・シェードは遮らない（シェードの開度は窓の光の量で表す）。型ガラスは直射を遮る
const OCC=new THREE.Scene(),distMat=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,side:THREE.DoubleSide,uniforms:{lp:{value:new THREE.Vector3()},sd:{value:new THREE.Vector3()},sun:{value:0}},
 vertexShader:`out vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.0);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
 fragmentShader:`in vec3 vW;uniform vec3 lp,sd;uniform float sun;out vec4 o;void main(){o=vec4(sun>0.5?dot(vW,sd)+100.0:distance(vW,lp),0.0,0.0,1.0);}`});   // 太陽は光の向きに沿った深さ（＋100。0は「何も無い」の印）
const occOf=o=>{const m=o.material;if(FROST.includes(o))return true;if(m.isMeshBasicMaterial||m.transparent||m.colorWrite===false)return false;if(o.userData.dyn&&o.userData.dk===undefined)return false;return true;};
// 壁は厚みの無い1枚の面で、床・天井は隙間ができないよう壁の向こうへ8cm広げてある。そのままだと、壁の向こうへ出た床に向こう側（外・隣の部屋）の光が当たり、ライトマップのにじみで壁の根元に明るい線が出る。
// 影の計算でだけ、壁を部屋の反対側へ WALLT の厚みの板にする。ライトマップは表示で前後2画素（8cm）まで読むので、床を広げた8cm＋αを覆う厚み（隣の部屋の壁の面を越えないよう、壁の厚さ115mmより薄く）
const WALLT=0.1,WALLX=()=>WALLSH.map(o=>{const g=new THREE.ExtrudeGeometry(o.geometry.parameters.shapes,{depth:WALLT,bevelEnabled:false,curveSegments:1});g.translate(0,0,-WALLT);const w=g.toNonIndexed();g.dispose();const b=new THREE.BufferGeometry();b.setAttribute("position",w.attributes.position);b.applyMatrix4(o.matrixWorld);return b;});
// 玄関ドア：本物のドアはすき間が気密材でふさがっているので、影の計算では開口（枠ごと）を外側の箱でふさぐ（扉の下・横のすき間から外の光が土間へ漏れないように）。型ガラスの光は型ガラスの面の光（WINC）で入れる
const DOORSEAL=()=>{const E=HOUSE.entry,x0=E.drA-0.06,x1=E.drB+0.06,y0=E.DY-0.03,y1=E.DY+E.drH+0.06,z0=E.Z1+0.095,z1=E.Z1+0.3,g=new THREE.BoxGeometry(x1-x0,y1-y0,z1-z0).toNonIndexed();g.translate((x0+x1)/2,(y0+y1)/2,(z0+z1)/2);const b=new THREE.BufferGeometry();b.setAttribute('position',g.attributes.position);return b;};   // 内側の面は扉の室内側の面（Z1+0.10）の5mm手前＝型ガラスの面の光（扉の面の1cm室内側）より外
const OCCDOOR=[];{scene.updateMatrixWorld(true);const st=WALLX();st.push(DOORSEAL());const dm=new Map();
 scene.traverse(o=>{if(!o.isMesh||!occOf(o))return;let dk=null,gOpen=null;for(let p=o;p;p=p.parent){for(const k in DOORS){if(DOORS[k].gO===p){dk=k;gOpen=true;}if(DOORS[k].gC===p){dk=k;gOpen=false;}}if(dk)break;}
  const g=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone());const pos=new THREE.BufferAttribute(g.attributes.position.array.slice(),3);const w=new THREE.BufferGeometry();w.setAttribute('position',pos);w.applyMatrix4(o.matrixWorld);g.dispose();
  if(dk){const key=dk+(gOpen?':o':':c');if(!dm.has(key))dm.set(key,{k:dk,open:gOpen,gs:[]});dm.get(key).gs.push(w);}else st.push(w);});
 const mergeP=gs=>{let n=0;gs.forEach(g=>n+=g.attributes.position.array.length);const a=new Float32Array(n);let off=0;gs.forEach(g=>{a.set(g.attributes.position.array,off);off+=g.attributes.position.array.length;g.dispose();});const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(a,3));return g;};
 const sm=new THREE.Mesh(mergeP(st),distMat);sm.frustumCulled=false;OCC.add(sm);dm.forEach(d=>{const m=new THREE.Mesh(mergeP(d.gs),distMat);m.frustumCulled=false;m.userData.door=d.k;m.userData.open=d.open;OCC.add(m);OCCDOOR.push(m);});}
// 照り返し用の遮る形：大きな面（チャートの部品＝壁・床・天井・建具・家具の平らな面）とドアだけ（曲面の多い細かい部品は除いて軽くする。照り返しはやわらかい光なので影の細かさは要らない）
const OCCB=new THREE.Scene();{scene.updateMatrixWorld(true);const st=WALLX();st.push(DOORSEAL());scene.traverse(o=>{if(!o.isMesh||!occOf(o)||o.userData.dyn)return;const a=o.geometry.attributes.lm;if(a&&a.getZ(0)>0.5)return;const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry;const w=new THREE.BufferGeometry();w.setAttribute('position',new THREE.BufferAttribute(g.attributes.position.array.slice(),3));w.applyMatrix4(o.matrixWorld);st.push(w);});
 let n=0;st.forEach(g=>n+=g.attributes.position.array.length);const arr=new Float32Array(n);let off=0;st.forEach(g=>{arr.set(g.attributes.position.array,off);off+=g.attributes.position.array.length;g.dispose();});const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(arr,3));
 const m=new THREE.Mesh(g,distMat);m.frustumCulled=false;OCCB.add(m);OCCDOOR.forEach(d=>{const c=new THREE.Mesh(d.geometry,distMat);c.frustumCulled=false;c.userData=d.userData;OCCB.add(c);d.userData.twin=c;});LM.occbTris=arr.length/9;}
const syncDoors=()=>OCCDOOR.forEach(m=>{m.visible=!!DS[m.userData.door]===m.userData.open;m.userData.twin.visible=m.visible;});
const CUBE=new THREE.WebGLCubeRenderTarget(256,{type:THREE.FloatType,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,generateMipmaps:false});const CCAM=new THREE.CubeCamera(0.04,14,CUBE);OCC.add(CCAM);
const SUNRT=new THREE.WebGLRenderTarget(4096,4096,{type:THREE.FloatType,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,generateMipmaps:false,depthBuffer:true});
const SCAM=new THREE.OrthographicCamera(-7,7,7,-7,0.1,60);{const c=new THREE.Vector3(1.3,3,3.6);SCAM.position.copy(c).addScaledVector(SUNDIR,25);SCAM.lookAt(c);SCAM.updateMatrixWorld(true);SCAM.updateProjectionMatrix();}

// ===== 光を描き込む：画像の全画素について、その点の位置・向きから光の明るさと、影の画像で見えるかどうかを計算して足す =====
const ED=new THREE.WebGLRenderTarget(LMW,LMH,{type:THREE.HalfFloatType,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:false,generateMipmaps:false});   // 照度（lux × SC）。SC：昼1/1000・夜1（半精度に収める）
const bakeMat=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,depthTest:false,depthWrite:false,transparent:true,blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneFactor,blendEquation:THREE.AddEquation,
 uniforms:{tP:{value:GB.textures[0]},tN:{value:GB.textures[1]},tM:{value:null},useM:{value:0},sh:{value:CUBE.texture},shS:{value:SUNRT.texture},kind:{value:0},lp:{value:new THREE.Vector3()},ld:{value:new THREE.Vector3()},col:{value:new THREE.Vector3()},cosO:{value:0},cosI:{value:1},r2:{value:0},isPt:{value:0},soft:{value:1},lamb:{value:0},cres:{value:256},
  sunVP:{value:new THREE.Matrix4()},sd:{value:SUNDIR.clone()},cau:{value:0},zCau:{value:ZU.zCau.value},zCauK:{value:ZU.zCauK.value}},
 vertexShader:`void main(){gl_Position=vec4(position.xy,0.0,1.0);}`,
 fragmentShader:`uniform sampler2D tP,tN,tM,shS,zCau;uniform float useM;uniform samplerCube sh;uniform int kind;uniform vec3 lp,ld,col,sd;uniform float cosO,cosI,r2,isPt,soft,cau,lamb,cres;uniform mat4 sunVP;uniform vec4 zCauK;out vec4 o;
float cauF(vec3 d){float p=texture(zCau,vec2(atan(d.z,d.x)*0.1591549+0.5,asin(clamp(d.y,-1.0,1.0))*0.3183099+0.5)).r;float cd=-d.y,op=smoothstep(zCauK.x-0.015,zCauK.x+0.015,cd),gl=zCauK.z*(0.3+1.6*p)*(1.0-smoothstep(zCauK.y-0.02,zCauK.y+0.01,d.y)),rim=zCauK.w*exp(-pow((cd-zCauK.x+0.02)/0.03,2.0))*(0.5+p);return mix(gl,1.0,op)+rim;}
void main(){ivec2 c=ivec2(gl_FragCoord.xy);if(useM>0.5&&texelFetch(tM,c,0).r<0.5)discard;vec4 P=texelFetch(tP,c,0);vec3 n0=texelFetch(tN,c,0).xyz;if(P.w==0.0||!(dot(n0,n0)>1e-8)||any(isnan(P.xyz)))discard;vec3 n=normalize(n0),p=P.xyz+n*0.012;
 #ifdef SUN
 float nl=dot(n,sd);if(nl<=0.0)discard;vec4 q=sunVP*vec4(p,1.0);vec2 uv=q.xy/q.w*0.5+0.5;float dz=dot(p,sd)+100.0,v=0.0;
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){float s=texture(shS,uv+vec2(x,y)*soft/4096.0).r;v+=(s==0.0||s<dz+0.02)?1.0:0.0;}o=vec4(col*nl*v/9.0,1.0);
 #else
   // 太陽：光の向きの深さが自分より手前（太陽に近い）物があれば影
 vec3 L=lp-p;float d2=dot(L,L),d=sqrt(d2);L/=d;float nl=dot(n,L);if(nl<=0.0)discard;float cn=lamb>0.5?max(dot(-L,ld),0.0):isPt>0.5?1.0:smoothstep(cosO,cosI,dot(-L,ld));if(cn<=0.0)discard;
 vec3 dir=-L,t1=normalize(cross(dir,abs(dir.y)<0.9?vec3(0.0,1.0,0.0):vec3(1.0,0.0,0.0))),t2=cross(dir,t1);float k=soft*2.0/cres,b=0.02+0.012*d,v=0.0;
 for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){float s=texture(sh,dir+(t1*float(x)+t2*float(y))*k).r;v+=(s==0.0||s>d-b)?1.0:0.0;}v/=9.0;if(v<=0.0)discard;   // 影：9点で平均（縁をやわらかく）
 #ifdef CAU
 float cf=cauF(-L);
 #else
 float cf=1.0;
 #endif
 o=vec4(col*(nl*cn*v*cf/(d2+r2)),1.0);
 #endif
}`});   // 太陽・G1 の模様は別のシェーダーにする（使わない計算が入っていると、使わなくても遅くなる）
const bakeCau=bakeMat.clone(),bakeSunM=bakeMat.clone();bakeCau.uniforms=bakeMat.uniforms;bakeSunM.uniforms=bakeMat.uniforms;bakeCau.defines={CAU:1};bakeSunM.defines={SUN:1};
const BQ=new THREE.Scene(),bq=new THREE.Mesh(new THREE.PlaneGeometry(2,2),bakeMat);bq.frustumCulled=false;BQ.add(bq);const CAM0=new THREE.Camera();
let SC=1;
function bakeEmitter(e,target){const u=bakeMat.uniforms,cc=e.cube===2?CCAM2:CCAM,ct=e.cube===2?CUBE2:CUBE;distMat.uniforms.sun.value=0;distMat.uniforms.lp.value.copy(e.pos);cc.position.copy(e.pos);cc.updateMatrixWorld(true);r.setClearColor(0x000000,0);cc.update(r,e.cube===2?OCCB:OCC);   // その光から見た影の画像（6面）
 u.kind.value=0;u.sh.value=ct.texture;u.cres.value=ct.width;u.lp.value.copy(e.pos);u.ld.value.copy(e.dir||new THREE.Vector3(0,-1,0));const k=e.colv?e.colv:e.col.clone().multiplyScalar(e.intensity*SC);u.col.value.set(k.x!==undefined?k.x:k.r,k.y!==undefined?k.y:k.g,k.z!==undefined?k.z:k.b);   // colv：照り返しの光（すでに SC をかけた値）
 u.isPt.value=e.type==='point'?1:0;u.lamb.value=e.lamb?1:0;u.cosO.value=Math.cos(e.angle||1);u.cosI.value=Math.cos((e.angle||1)*(1-(e.penumbra||0)));u.r2.value=e.r2||0;u.soft.value=e.soft||1;u.cau.value=e.cau?1:0;u.useM.value=e.cube===2?1:0;
 bq.material=e.cau?bakeCau:bakeMat;r.setRenderTarget(target||ED);r.autoClear=false;r.render(e.cube===2?BPS:BQ,CAM0);r.autoClear=true;}   // 足し合わせるので、描く前に消さない
function bakeSun(I,col){const u=bakeMat.uniforms;distMat.uniforms.sun.value=1;distMat.uniforms.sd.value.copy(SUNDIR);r.setRenderTarget(SUNRT);r.setClearColor(0x000000,0);r.clear();r.render(OCC,SCAM);
 u.kind.value=1;u.sunVP.value.multiplyMatrices(SCAM.projectionMatrix,SCAM.matrixWorldInverse);const k=col.clone().multiplyScalar(I*SC);u.col.value.set(k.r,k.g,k.b);u.soft.value=1.5;bq.material=bakeSunM;r.setRenderTarget(ED);r.autoClear=false;r.render(BQ,CAM0);r.autoClear=true;bq.material=bakeMat;}

// ===== 確認用の表示（?lm=chk）：ライトマップの画素の格子と G-buffer の色・向きを面に貼って、展開がおかしくないかを見る =====
const LMQ=new URLSearchParams(location.search).get('lm');
if(LMQ==='chk'){const dm=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,uniforms:{tA:{value:GB.textures[2]},tN:{value:GB.textures[1]},WH:{value:new THREE.Vector2(LMW,LMH)}},
  vertexShader:`in vec3 lm;out vec2 vT;flat out ivec2 vI;out float vMode;uniform vec2 WH;void main(){vT=lm.xy;vI=ivec2(lm.xy);vMode=lm.z;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`in vec2 vT;flat in ivec2 vI;in float vMode;uniform sampler2D tA,tN;uniform vec2 WH;out vec4 o;
void main(){ivec2 c=vMode>0.5?vI:ivec2(vT*WH);vec3 a=texelFetch(tA,c,0).rgb,n=texelFetch(tN,c,0).rgb;float k=0.75+0.25*dot(n,normalize(vec3(0.3,1.0,0.5)));float ch=vMode>0.5?1.0:((c.x+c.y)%2==0?1.0:0.82);o=vec4(pow(a*k*ch,vec3(1.0/2.2)),1.0);}`});
 LMOBJ.forEach(o=>{o.material=dm;});draw=function(){if(!ready)return;cam.rotation.set(pitch,yaw,0);r.toneMapping=THREE.NoToneMapping;r.render(scene,cam);};draw();}

// ===== 照り返し：光の当たった面を、64cm角ほどのまとまり（セル）ごとの「やわらかく光る面」として、もう一度描き込む（2回。部屋の箱は使わない。壁・床・ドアで遮られ、開いたドアからは自然に回る） =====
const CELL=16,CELLS=[],CGRP=[];LM.charts.forEach((c,ci)=>{for(let y=0;y<c.h;y+=CELL)for(let x=0;x<c.w;x+=CELL){CELLS.push([c.x+x,c.y+y,Math.min(CELL,c.w-x),Math.min(CELL,c.h-y)]);CGRP.push(ci+':'+Math.floor(x/(CELL*3))+','+Math.floor(y/(CELL*3)));}});   // CGRP：照り返しで1つの光る面にするまとまり（同じチャート＝同じ面の、約2m角ごと。面をまたがないので、壁の向こうへ光を移さない）   // セル：チャートの区画を16×16画素（64cm角）ごとに分ける（チャートをまたがない）
const CW=256,CH=Math.ceil(CELLS.length/CW);
const cellTex=(()=>{const a=new Float32Array(CW*CH*4);CELLS.forEach((c,i)=>a.set(c,i*4));const t=new THREE.DataTexture(a,CW,CH,THREE.RGBAFormat,THREE.FloatType);t.needsUpdate=true;return t;})();
const CRT=new THREE.WebGLRenderTarget(CW,CH,{count:3,type:THREE.FloatType,depthBuffer:false,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter});
const aggMat=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,depthTest:false,depthWrite:false,uniforms:{tE:{value:null},tE2:{value:null},tP:{value:GB.textures[0]},tN:{value:GB.textures[1]},tA:{value:GB.textures[2]},tC:{value:cellTex},n:{value:CELLS.length}},
 vertexShader:`void main(){gl_Position=vec4(position.xy,0.0,1.0);}`,
 fragmentShader:`uniform sampler2D tE,tE2,tP,tN,tA,tC;uniform int n;layout(location=0) out vec4 oF;layout(location=1) out vec4 oP;layout(location=2) out vec4 oN;
void main(){ivec2 c=ivec2(gl_FragCoord.xy);int i=c.y*${CW}+c.x;oF=vec4(0.0);oP=vec4(0.0);oN=vec4(0.0);if(i>=n)return;vec4 r=texelFetch(tC,c,0);ivec2 o=ivec2(r.xy);int w=int(r.z),h=int(r.w);vec3 F=vec3(0.0),P=vec3(0.0),N=vec3(0.0);float k=0.0;
 for(int y=0;y<${CELL};y++){if(y>=h)break;for(int x=0;x<${CELL};x++){if(x>=w)break;ivec2 q=o+ivec2(x,y);vec4 p=texelFetch(tP,q,0);if(p.w==0.0)continue;F+=(texelFetch(tE,q,0).rgb+texelFetch(tE2,q,0).rgb)*texelFetch(tA,q,0).rgb;P+=p.xyz;N+=texelFetch(tN,q,0).xyz;k+=1.0;}}
 if(k>0.0){oF=vec4(F,k);oP=vec4(P/k,k);oN=vec4(normalize(N),0.0);}}`});   // セルごとに：反射する光の量（照度×反射率の合計）・中心・向き
const aggQ=new THREE.Mesh(new THREE.PlaneGeometry(2,2),aggMat);aggQ.frustumCulled=false;const AGGS=new THREE.Scene();AGGS.add(aggQ);
const CUBE2=new THREE.WebGLCubeRenderTarget(128,{type:THREE.FloatType,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,generateMipmaps:false});const CCAM2=new THREE.CubeCamera(0.03,14,CUBE2);OCCB.add(CCAM2);
// 照り返しは変化がなだらかなので、チャートの中は3×3画素に1画素だけ計算し（MK）、残りは同じチャートのまわりの計算した画素から補う（チャートをまたがない）。頂点ごとの画素と小さなチャートは全部計算する
const MKD=new Uint8Array(LMW*LMH*4),PTS=[];{const P=new Float32Array(LMW*LMH*4);r.readRenderTargetPixels(GB,0,0,LMW,LMH,P,undefined,0);
 const set=(x,y)=>{const k=(y*LMW+x)*4;if(MKD[k])return;MKD[k]=MKD[k+1]=MKD[k+2]=MKD[k+3]=255;PTS.push(x,y,0);};
 for(let y=0;y<LMH;y++)for(let x=0;x<LMW;x++){const w=P[(y*LMW+x)*4+3];if(w<0||(w>0&&x%3===1&&y%3===1))set(x,y);}   // 頂点ごとの画素と、チャートの3×3ごとの1画素
 LM.charts.forEach(c=>{let has=false;for(let y=c.y;y<c.y+c.h&&!has;y++)for(let x=c.x;x<c.x+c.w;x++){const k=(y*LMW+x)*4;if(MKD[k]&&P[k+3]===c.gid+1){has=true;break;}}if(has)return;
  let bx=-1,by=-1,bd=1e9;const cx=c.x+c.w/2,cy=c.y+c.h/2;for(let y=c.y;y<c.y+c.h;y++)for(let x=c.x;x<c.x+c.w;x++){if(P[(y*LMW+x)*4+3]!==c.gid+1)continue;const d=(x+0.5-cx)**2+(y+0.5-cy)**2;if(d<bd){bd=d;bx=x;by=y;}}if(bx>=0)set(bx,by);});}   // 計算する画素の無い小さなチャートは、中心に近い1画素
const MK={texture:(()=>{const t=new THREE.DataTexture(MKD,LMW,LMH,THREE.RGBAFormat,THREE.UnsignedByteType);t.minFilter=t.magFilter=THREE.NearestFilter;t.needsUpdate=true;return t;})()};bakeMat.uniforms.tM.value=MK.texture;
const ptsGeo=new THREE.BufferGeometry();ptsGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(PTS),3));LM.nPts=PTS.length/3;
const bakePts=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,depthTest:false,depthWrite:false,transparent:true,blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneFactor,blendEquation:THREE.AddEquation,uniforms:bakeMat.uniforms,
 vertexShader:`uniform vec2 WH;void main(){gl_Position=vec4((position.xy+0.5)/WH*2.0-1.0,0.0,1.0);gl_PointSize=1.0;}`,fragmentShader:bakeMat.fragmentShader});   // 照り返しは計算する画素だけを点として描く（画像全体を描くより速い）
bakeMat.uniforms.WH={value:new THREE.Vector2(LMW,LMH)};const BPS=new THREE.Scene(),bpo=new THREE.Points(ptsGeo,bakePts);bpo.frustumCulled=false;BPS.add(bpo);
const fillMat=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,depthTest:false,depthWrite:false,uniforms:{tE:{value:null},tP:{value:GB.textures[0]},tM:{value:MK.texture}},vertexShader:`void main(){gl_Position=vec4(position.xy,0.0,1.0);}`,
 fragmentShader:`uniform sampler2D tE,tP,tM;out vec4 o;void main(){ivec2 c=ivec2(gl_FragCoord.xy);float w=texelFetch(tP,c,0).w;if(w==0.0||texelFetch(tM,c,0).r>0.5){o=texelFetch(tE,c,0);return;}
 vec3 s=vec3(0.0);float ws=0.0;for(int y=-2;y<=2;y++)for(int x=-2;x<=2;x++){ivec2 q=c+ivec2(x,y);if(texelFetch(tM,q,0).r<0.5||texelFetch(tP,q,0).w!=w)continue;float k=(1.0-abs(float(x))/3.0)*(1.0-abs(float(y))/3.0);s+=texelFetch(tE,q,0).rgb*k;ws+=k;}o=vec4(ws>0.0?s/ws:vec3(0.0),1.0);}`});
const fillQ=new THREE.Mesh(new THREE.PlaneGeometry(2,2),fillMat);fillQ.frustumCulled=false;const FILLS=new THREE.Scene();FILLS.add(fillQ);
const fillTo=(src,dst)=>{fillMat.uniforms.tE.value=src.texture;r.setRenderTarget(dst);r.render(FILLS,CAM0);};
const EB1=ED.clone(),EB2=ED.clone(),EBT=ED.clone(),ET=ED.clone(),EG=ED.clone(),EZ=ED.clone();r.setRenderTarget(EZ);r.setClearColor(0x000000,0);r.clear();r.setRenderTarget(null);   // EG：G1 の直接の光（照り返しの元にだけ使う。表示は実時間）、EZ：黒
const NSHOOT=[320,128];   // 照り返しの1回目・2回目で光る面として使うまとまりの数（明るい順。残りの分の光は、選んだまとまりに比例して足す）
function bounce(src,dst,src2,ns){aggMat.uniforms.tE.value=src.texture;aggMat.uniforms.tE2.value=(src2||EZ).texture;r.setRenderTarget(CRT);r.render(AGGS,CAM0);const F=new Float32Array(CW*CH*4),P=new Float32Array(CW*CH*4),N=new Float32Array(CW*CH*4);
 r.readRenderTargetPixels(CRT,0,0,CW,CH,F,undefined,0);r.readRenderTargetPixels(CRT,0,0,CW,CH,P,undefined,1);r.readRenderTargetPixels(CRT,0,0,CW,CH,N,undefined,2);
 const A=LM.ts*LM.ts,G=new Map();let tot=0;for(let i=0;i<CELLS.length;i++){const k=F[i*4+3];if(k<=0)continue;const y=0.2126*F[i*4]+0.7152*F[i*4+1]+0.0722*F[i*4+2];if(!(y>0))continue;tot+=y;
  let g=G.get(CGRP[i]);if(!g){g={y:0,F:new THREE.Vector3(),P:new THREE.Vector3(),N:new THREE.Vector3(N[i*4],N[i*4+1],N[i*4+2]),k:0,i};G.set(CGRP[i],g);}g.y+=y;g.F.x+=F[i*4];g.F.y+=F[i*4+1];g.F.z+=F[i*4+2];g.P.addScaledVector(new THREE.Vector3(P[i*4],P[i*4+1],P[i*4+2]),y);g.k+=k;}   // まとまりごとに：光の量の合計・光の量で重みを付けた中心
 const gs=[...G.values()].sort((a,b)=>b.y-a.y||a.i-b.i),sel=gs.slice(0,ns);let s=0;sel.forEach(g=>s+=g.y);const comp=s>0?tot/s:1;
 r.setRenderTarget(dst);r.setClearColor(0x000000,0);r.clear();
 sel.forEach(g=>{const n=g.N;if(!(n.lengthSq()>0.5))return;const pos=g.P.multiplyScalar(1/g.y),area=g.k*A,phi=g.F.clone().multiplyScalar(A*comp/Math.PI);   // 反射した光束÷π（拡散面の正面の光度）
  bakeEmitter({pos:pos.addScaledVector(n,0.02),dir:n,lamb:1,intensity:1,colv:phi,r2:area/Math.PI,soft:6,cube:2},dst);});
 LM.nShoot=sel.length;LM.comp=comp;}
const sumMat=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,depthTest:false,depthWrite:false,uniforms:{a:{value:ED.texture},b:{value:EB1.texture},c:{value:EB2.texture}},vertexShader:`void main(){gl_Position=vec4(position.xy,0.0,1.0);}`,
 fragmentShader:`uniform sampler2D a,b,c;out vec4 o;void main(){ivec2 q=ivec2(gl_FragCoord.xy);o=vec4(texelFetch(a,q,0).rgb+texelFetch(b,q,0).rgb+texelFetch(c,q,0).rgb,1.0);}`});
const sumQ=new THREE.Mesh(new THREE.PlaneGeometry(2,2),sumMat);sumQ.frustumCulled=false;const SUMS=new THREE.Scene();SUMS.add(sumQ);
// ===== 普段の描画：光は使わず、ライトマップの照度を「周りからの光」として材質に入れる（拡散の明るさ＝照度×反射率÷π） =====
const LMU={lmTex:{value:ET.texture},lmScale:{value:new THREE.Vector3(1,1,1)}};
// lmB：ライトマップを4×4画素でなめらかに読む（3次のB-スプライン。画素の段々が見えないように）
function lmPatch(sh){Object.assign(sh.uniforms,LMU);
 sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 lm;uniform sampler2D lmTex;varying vec2 vLmUv;varying vec3 vLmV;varying vec3 vWP;')
  .replace('#include <begin_vertex>','#include <begin_vertex>\nvWP=(modelMatrix*vec4(transformed,1.0)).xyz;if(lm.z>0.5){vLmV=texelFetch(lmTex,ivec2(lm.xy),0).rgb;vLmUv=vec2(-1.0);}else{vLmUv=lm.xy;vLmV=vec3(0.0);}');   // 頂点ごとの部品は頂点で読んで面の中はなめらかに
 sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D lmTex;uniform vec3 lmScale;varying vec2 vLmUv;varying vec3 vLmV;varying vec3 vWP;uniform sampler2D zCau;\nvec3 lmB(vec2 uv){vec2 ts=vec2(textureSize(lmTex,0)),st=uv*ts-0.5,i=floor(st),f=st-i,f2=f*f,f3=f2*f,w0=(1.0-3.0*f+3.0*f2-f3)/6.0,w1=(4.0-6.0*f2+3.0*f3)/6.0,w2=(1.0+3.0*f+3.0*f2-3.0*f3)/6.0,w3=f3/6.0,g0=w0+w1,g1=w2+w3,h0=(i-0.5+w1/g0)/ts,h1=(i+1.5+w3/g1)/ts;\n return g0.y*(g0.x*texture2D(lmTex,h0).rgb+g1.x*texture2D(lmTex,vec2(h1.x,h0.y)).rgb)+g1.y*(g0.x*texture2D(lmTex,vec2(h0.x,h1.y)).rgb+g1.x*texture2D(lmTex,h1).rgb);}uniform vec4 zCauK;uniform vec3 g1P;\nfloat cauF(vec3 d){float p=texture2D(zCau,vec2(atan(d.z,d.x)*0.1591549+0.5,asin(clamp(d.y,-1.0,1.0))*0.3183099+0.5)).r;float cd=-d.y,op=smoothstep(zCauK.x-0.015,zCauK.x+0.015,cd),gl=zCauK.z*(0.3+1.6*p)*(1.0-smoothstep(zCauK.y-0.02,zCauK.y+0.01,d.y)),rim=zCauK.w*exp(-pow((cd-zCauK.x+0.02)/0.03,2.0))*(0.5+p);return mix(gl,1.0,op)+rim;}')
  .replace('#include <lights_fragment_begin>',THREE.ShaderChunk.lights_fragment_begin.replace(/(pointLight = pointLights\[ i \];[\s\S]*?)(RE_Direct\()/,'$1directLight.color *= cauF( normalize( vWP - g1P ) );\n\t\t$2'))
  .replace('#include <lights_fragment_maps>',THREE.ShaderChunk.lights_fragment_maps.replace('iblIrradiance += getIBLIrradiance( geometryNormal );','')+'\n\tirradiance += (vLmUv.x>=0.0?lmB(vLmUv):vLmV)*lmScale;');}
LMOBJ.forEach(o=>{const m=o.material;if(!m.isMeshStandardMaterial||m.userData.lmp)return;m.userData.lmp=1;m.onBeforeCompile=lmPatch;m.customProgramCacheKey=()=>'lm';m.needsUpdate=true;});
scene.traverse(o=>{if(o.isLight)o.visible=false;});   // 実時間の光は使わない（明るさはライトマップ）。G1 だけは揺らいだ光の模様が細かいので実時間（影付き）
const G1C=CAND.find(c=>c.src.userData.caustic),G1L=new THREE.PointLight(0xffffff,0,0,2);G1L.position.copy(G1C?G1C.pos:new THREE.Vector3(0,-50,0));G1L.castShadow=true;G1L.shadow.mapSize.set(512,512);G1L.shadow.camera.near=0.03;G1L.shadow.camera.far=6;G1L.shadow.bias=-0.001;G1L.shadow.normalBias=0.02;G1L.shadow.autoUpdate=false;scene.add(G1L);
r.shadowMap.enabled=true;r.shadowMap.type=THREE.PCFShadowMap;scene.traverse(o=>{if(!o.isMesh)return;o.receiveShadow=!!o.geometry.attributes.lm;o.castShadow=occOf(o);});
LMU.zCau={value:ZU.zCau.value};LMU.zCauK={value:ZU.zCauK.value};LMU.g1P={value:G1L.position};

// ===== 光る部品・ガラス：色の仕上げで露出がかかるので、露出の分を先に打ち消す。布・天井などの「明るさの補いの光る色」は使わない =====
const GLOW=[];scene.traverse(o=>{if(o.isMesh&&o.material.isMeshBasicMaterial&&!FROST.includes(o)&&!GLOW.some(g=>g.m===o.material))GLOW.push({m:o.material,c:o.material.color.clone()});});
const EMIT=[],FAKE=[];scene.traverse(o=>{const m=o.material;if(!o.isMesh||!m.emissive||EMIT.includes(m)||FAKE.includes(m))return;(m.transparent||m.emissiveMap?EMIT:FAKE).push(m);});
let lastExp=1;function updateGlow(){lastExp=r.toneMappingExposure;GLOW.forEach(g=>{g.m.color.copy(g.c).multiplyScalar(1/lastExp);});EMIT.forEach(m=>m.emissiveIntensity=1/lastExp);}
{const _e=envAll;envAll=function(){GLOW.forEach(g=>g.m.color.copy(g.c));_e();FAKE.forEach(m=>m.emissive.setRGB(0,0,0));GLOW.forEach(g=>{g.c.copy(g.m.color);g.m.color.multiplyScalar(1/Math.max(lastExp,1e-6));});};}

// ===== 状態が変わったとき：点いている光・窓・太陽をライトマップに描き込み、露出を決める =====
const lum=c=>0.2126*c.r+0.7152*c.g+0.0722*c.b;
let lastShade=-1;const WBC=new THREE.Color(1,1,1).lerp(lumColor(KCOL[2700]),0.35);WBC.multiplyScalar(1/lum(WBC));   // 白の合わせ：電球色を35%だけ白に寄せる（全状態で同じ）
LM.EXPO=0.05;   // 露出（全状態で同じ。画像で見て調整した値）
function relight(chg){envAll();syncDoors();const sh=bedS.shadeP||0,tr=(1-sh)+sh*0.5;SC=1;
 r.setRenderTarget(ED);r.setClearColor(0x000000,0);r.clear();
 const t0=performance.now();let n=0;
 r.setRenderTarget(EG);r.clear();G1L.intensity=0;G1L.shadow.needsUpdate=true;
 CAND.forEach(c=>{if(c.src.intensity<=0)return;const p=c.type==='spot'?c.pos.clone().addScaledVector(c.dir,0.03):c.pos,g1=!!c.src.userData.caustic;bakeEmitter({pos:p,dir:c.dir,type:c.type,angle:c.angle,penumbra:c.penumbra,intensity:c.intensity,col:c.color,cau:g1,soft:2},g1?EG:ED);if(g1){G1L.intensity=c.intensity;G1L.userData.col=c.color;}n++;});   // G1 の直接の光は EG へ（模様が細かいので表示は実時間の光で）   // 照明（器具の面から3cm光の向きへ出した所から。器具の体で影を作らない）
 WINC.forEach(c=>{let I,col;if(c.frost){const Ev=(SKY_LUX*0.5+(night?0:SUN_LUX*SUN_K*Math.max(SUNDIR.dot(c.out),0)))*(night?MOON:1)*c.frost;I=Ev/Math.PI*c.area;col=night?lumColor(0xdfe4f2):lumColor(0xfaf7f0);c.mesh.material.color.copy(col).multiplyScalar(Ev/Math.PI);}   // ガラスの面自体も、通した光の明るさで光って見える
  else{const t=c.win.shadeable?tr:1;I=SKY_LUX/Math.PI*(night?MOON:1)*t*c.area;col=night?lumColor(0xdfe4f2):lumColor(0xf4f8ff);}
  bakeEmitter({pos:c.pos,dir:c.dir,type:'spot',angle:c.angle,penumbra:1,intensity:I,col,r2:c.r2||c.area/Math.PI,soft:4});n++;});   // 窓：空の光（影の縁は大きくぼかす）
 if(!night){bakeSun(SUN_LUX*SUN_K*tr,lumColor(0xfff1dc));n++;}
 {const w=WBC;LMU.lmScale.value.set(1/SC/w.r,1/SC/w.g,1/SC/w.b);if(G1L.userData.col)G1L.color.setRGB(G1L.userData.col.r/w.r,G1L.userData.col.g/w.g,G1L.userData.col.b/w.b);}   // 白の合わせは固定（点いている照明や昼夜で変えない。変えると同じ部屋の色が状態で変わるため）
 const t1=performance.now();bounce(ED,EBT,EG,NSHOOT[0]);fillTo(EBT,EB1);bounce(EB1,EBT,null,NSHOOT[1]);fillTo(EBT,EB2);r.setRenderTarget(ET);r.render(SUMS,CAM0);LM.bounceMs=performance.now()-t1;   // 照り返し2回を足して、表示に使う照度にする
 r.toneMappingExposure=LM.EXPO;updateGlow();r.setRenderTarget(null);LM.bakeMs=performance.now()-t0;LM.nEmit=n;}
draw=function(){if(!ready)return;cam.rotation.set(pitch,yaw,0);r.setRenderTarget(null);r.render(scene,cam);};
applyEnvAll=function(){relight();draw();};
{const _td=toggleDoor;toggleDoor=function(k){const was=DS[k];_td(k);if(DS[k]!==was){relight('door:'+k);draw();}};}
if(LMQ!=='chk'){applyEnvAll();let n=0;const t=setInterval(()=>{draw();if(++n>=3)clearInterval(t);},400);}   // 読み込み中の表示が消えた後にも描き直す
