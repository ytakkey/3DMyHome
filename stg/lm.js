// 検証版（stg）：ライトマップ方式（0章の要件・8章）。点灯・昼夜・ドア・シェードが変わったときだけ、光（影を含む）と照り返しを面の画像（ライトマップ）に描き込み、普段の描画はその画像を貼るだけ
// 画像の1画素＝面の上の1点（stg/pre.js が付けた属性 lm で対応）。まず各画素の位置・向き・色（G-buffer）を作り、光ごとに「その点から光が見えるか」を影の画像で調べて明るさを足す
r.toneMapping=THREE.AgXToneMapping;   // 明るい所をなだらかに圧縮する（日なたが白く飛ばず、暗めの所も見える）
const LMW=LM.W,LMH=LM.H;
// ===== G-buffer：画素ごとの位置（家の座標）・向き・色（反射率） =====
const GB=new THREE.WebGLRenderTarget(LMW,LMH,{count:3,type:THREE.FloatType,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthBuffer:false,generateMipmaps:false});
const GB2=GB.clone();   // すき間を埋めるときの入れ替え用
const GBP=new THREE.WebGLRenderTarget(LMW,LMH,{type:THREE.FloatType,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthBuffer:false,generateMipmaps:false});   // 影を調べる位置（面の端は内側へ寄せたもの）
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
 {const am=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,depthTest:false,depthWrite:false,uniforms:{tP:{value:GB.textures[0]}},vertexShader:`void main(){gl_Position=vec4(position.xy,0.0,1.0);}`,
  fragmentShader:`uniform sampler2D tP;out vec4 o;void main(){ivec2 c=ivec2(gl_FragCoord.xy);vec4 p=texelFetch(tP,c,0);if(p.w<=0.0){o=p;return;}vec3 s=vec3(0.0);float k=0.0;
   for(int y=-2;y<=2;y++)for(int x=-2;x<=2;x++){vec4 q=texelFetch(tP,c+ivec2(x,y),0);if(q.w==p.w){s+=q.xyz;k+=1.0;}}vec3 v=s/k-p.xyz;float l=length(v);o=vec4(l>0.01?p.xyz+v/l*0.015:p.xyz,p.w);}`});
  const q=new THREE.Mesh(new THREE.PlaneGeometry(2,2),am);q.frustumCulled=false;const sc=new THREE.Scene();sc.add(q);r.setRenderTarget(GBP);r.render(sc,cam0);am.dispose();}   // 面の端の画素：影を調べる位置を面の内側へ1.5cm寄せる（角で隣の面の上に乗り、向こう側の光を拾わないように）
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
// 壁・床・天井は厚みの無い1枚の面で、床・天井は隙間ができないよう壁の向こうへ8cm広げてある。そのままだと、面のすぐ裏や壁の向こうへ出た床に向こう側（外・隣の部屋）の光が当たり、ライトマップのにじみで根元や隅に明るい線が出る（光漏れ）。
// 影の計算でだけ、大きな平らな面（チャートの広さ0.3m²以上：壁・床・天井・大きな家具の面。作り方によらない）を、裏側へ厚みのある板にする。厚みは最大 SLABT、裏に向かい合う面があればその5mm手前まで（隣の部屋へはみ出さない）
// 向かい合う面かどうかは、面の向きの方向にも s だけ広げた箱が重なるかで見る
const SLABT=0.1,SLABX=(()=>{scene.updateMatrixWorld(true);const big=new Map(),v=new THREE.Vector3();
 LM.big.forEach(({c,tri,nrm})=>{const n=new THREE.Vector3(c.nx,c.ny,c.nz).normalize();if(nrm&&n.dot(new THREE.Vector3(...nrm))<0)n.negate();const b={c,n,box:new THREE.Box3(),tri};   // 表の向きは光の計算に使う面の向き（法線）で決める（反転して作った部品でも、表側に板を作らない）
for(let k=0;k<tri.length;k+=3)b.box.expandByPoint(v.set(tri[k],tri[k+1],tri[k+2]));big.set(c,b);});   // stg/pre.js が記録した、動かない部品の大きな平らな面
 const B=[...big.values()];B.forEach(b=>{b.d=b.n.dot(b.box.getCenter(v));});
 B.forEach(b=>{let T=SLABT+0.005;B.forEach(o=>{if(o===b||b.n.dot(o.n)>-0.99)return;const s=b.d+o.d;   // o の面は b の面の裏 s の所（o.d=−(b.n·点)）
  if(!(s>0.0005&&s<T))return;const e=b.box.clone().expandByScalar(s+0.01);if(!e.intersectsBox(o.box))return;T=s;});b.T=Math.max(0.004,Math.min(SLABT,T-0.005));});
 return ()=>{const out=[];B.forEach(b=>{const q=b.tri,dx=-b.n.x*b.T,dy=-b.n.y*b.T,dz=-b.n.z*b.T,pos=[];for(let t=0;t<q.length;t+=9){const A=[q[t],q[t+1],q[t+2]],Bv=[q[t+3],q[t+4],q[t+5]],C=[q[t+6],q[t+7],q[t+8]],D=p=>[p[0]+dx,p[1]+dy,p[2]+dz],A2=D(A),B2=D(Bv),C2=D(C);
   pos.push(...A,...Bv,...C,...A2,...C2,...B2);[[A,Bv,B2,A2],[Bv,C,C2,B2],[C,A,A2,C2]].forEach(([p0,p1,p2,p3])=>pos.push(...p0,...p1,...p2,...p0,...p2,...p3));}   // 三角形を裏へ押し出した柱（表・裏・側面）
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));out.push(g);});LM.slabs=B.length;return out;};})();
// 玄関ドア：本物のドアはすき間が気密材でふさがっているので、影の計算では開口（枠ごと）を外側の箱でふさぐ（扉の下・横のすき間から外の光が土間へ漏れないように）。型ガラスの光は型ガラスの面の光（WINC）で入れる
const DOORSEAL=()=>{const E=HOUSE.entry,x0=E.drA-0.06,x1=E.drB+0.06,y0=E.DY-0.03,y1=E.DY+E.drH+0.06,z0=E.Z1+0.095,z1=E.Z1+0.3,g=new THREE.BoxGeometry(x1-x0,y1-y0,z1-z0).toNonIndexed();g.translate((x0+x1)/2,(y0+y1)/2,(z0+z1)/2);const b=new THREE.BufferGeometry();b.setAttribute('position',g.attributes.position);return b;};   // 内側の面は扉の室内側の面（Z1+0.10）の5mm手前＝型ガラスの面の光（扉の面の1cm室内側）より外
const OCCDOOR=[];{scene.updateMatrixWorld(true);const st=SLABX();st.push(DOORSEAL());const dm=new Map();
 scene.traverse(o=>{if(!o.isMesh||!occOf(o))return;let dk=null,gOpen=null;for(let p=o;p;p=p.parent){for(const k in DOORS){if(DOORS[k].gO===p){dk=k;gOpen=true;}if(DOORS[k].gC===p){dk=k;gOpen=false;}}if(dk)break;}
  const g=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone());const pos=new THREE.BufferAttribute(g.attributes.position.array.slice(),3);const w=new THREE.BufferGeometry();w.setAttribute('position',pos);w.applyMatrix4(o.matrixWorld);g.dispose();
  if(dk){const key=dk+(gOpen?':o':':c');if(!dm.has(key))dm.set(key,{k:dk,open:gOpen,gs:[]});dm.get(key).gs.push(w);}else st.push(w);});
 const mergeP=gs=>{let n=0;gs.forEach(g=>n+=g.attributes.position.array.length);const a=new Float32Array(n);let off=0;gs.forEach(g=>{a.set(g.attributes.position.array,off);off+=g.attributes.position.array.length;g.dispose();});const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(a,3));return g;};
 const sm=new THREE.Mesh(mergeP(st),distMat);sm.frustumCulled=false;OCC.add(sm);dm.forEach(d=>{const m=new THREE.Mesh(mergeP(d.gs),distMat);m.frustumCulled=false;m.userData.door=d.k;m.userData.open=d.open;OCC.add(m);OCCDOOR.push(m);});}
const SEALS=[];   // 閉じたドアの面（照り返しの光る面を選ぶときにも使う）
// 閉じたドア：実物のドアは閉じれば光を通さない（すき間は気密材・ドア枠の戸当たりでふさがる）。形のままだと扉と枠・床のすき間から隣の部屋の光が漏れるので、影の計算でだけ、閉じた扉の厚みの中心に開口と扉の大きさを合わせた面と、その縁から壁の中までの囲いを足す（開けると消える）
{const v=new THREE.Vector3();Object.keys(DOORWAYS).forEach(k=>{const d=DOORWAYS[k],ms=OCCDOOR.filter(m=>m.userData.door===k&&!m.userData.open);if(!ms.length)return;
 const c=new THREE.Vector3(...d.c),n=new THREE.Vector3(...d.n).normalize(),t=new THREE.Vector3(0,1,0).cross(n).normalize(),y0=c.y-d.h/2;
 const ds=[];let t0=-d.w/2,t1=d.w/2,b0=y0,b1=y0+d.h;ms.forEach(m=>{const a=m.geometry.attributes.position;for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i).sub(c);ds.push(v.dot(n));const u=v.dot(t);if(u<t0)t0=u;if(u>t1)t1=u;if(c.y+v.y<b0)b0=c.y+v.y;if(c.y+v.y>b1)b1=c.y+v.y;}});
 ds.sort((x,y)=>x-y);const off=ds[ds.length>>1],lh=Math.max(0.01,(ds[Math.floor(ds.length*0.9)]-ds[Math.floor(ds.length*0.1)])/2);t0-=0.01;t1+=0.01;b0=Math.min(b0,y0)-0.01;b1+=0.01;   // 扉の厚みの中心（頂点の中央値）。広さは開口と扉の形の外側＋1cm
 const P=(u,y,o)=>c.clone().addScaledVector(n,o).addScaledVector(t,u).setY(y),mid=-0.0575,quad=(A,B,C,D)=>[A,B,C,A,C,D];   // mid：壁の厚み（115mm）の中央
 const fr=off>0.005?off+0.025:off<-0.12?off-0.025:off,q=[...quad(P(t0,b0,off),P(t1,b0,off),P(t1,b1,off),P(t0,b1,off)),...quad(P(t0,b0,fr),P(t0,b0,mid),P(t0,b1,mid),P(t0,b1,fr)),...quad(P(t1,b0,fr),P(t1,b0,mid),P(t1,b1,mid),P(t1,b1,fr)),...quad(P(t0,b1,fr),P(t1,b1,fr),P(t1,b1,mid),P(t0,b1,mid))],g=new THREE.BufferGeometry();   // 扉の面と、そのまわり（左右・上）から壁の中までの囲い（扉が壁の外に出ているときは扉の表側まで）（壁の外をすべる引き戸は、扉と壁のすき間・扉の縁を光が回り込むため）
g.setAttribute('position',new THREE.Float32BufferAttribute(q.flatMap(p=>p.toArray()),3));
 const m=new THREE.Mesh(g,distMat);m.frustumCulled=false;m.userData.door=k;m.userData.open=false;OCC.add(m);OCCDOOR.push(m);SEALS.push({k,c,n,t,off,lh,t0,t1,b0,b1});});}
// 照り返し用の遮る形：大きな面（チャートの部品＝壁・床・天井・建具・家具の平らな面）とドアだけ（曲面の多い細かい部品は除いて軽くする。照り返しはやわらかい光なので影の細かさは要らない）
const OCCB=new THREE.Scene();{scene.updateMatrixWorld(true);const st=SLABX();st.push(DOORSEAL());scene.traverse(o=>{if(!o.isMesh||!occOf(o)||o.userData.dyn)return;const a=o.geometry.attributes.lm;if(a&&a.getZ(0)>0.5)return;const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry;const w=new THREE.BufferGeometry();w.setAttribute('position',new THREE.BufferAttribute(g.attributes.position.array.slice(),3));w.applyMatrix4(o.matrixWorld);st.push(w);});
 let n=0;st.forEach(g=>n+=g.attributes.position.array.length);const arr=new Float32Array(n);let off=0;st.forEach(g=>{arr.set(g.attributes.position.array,off);off+=g.attributes.position.array.length;g.dispose();});const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(arr,3));
 const m=new THREE.Mesh(g,distMat);m.frustumCulled=false;OCCB.add(m);OCCDOOR.forEach(d=>{const c=new THREE.Mesh(d.geometry,distMat);c.frustumCulled=false;c.userData=d.userData;OCCB.add(c);d.userData.twin=c;});LM.occbTris=arr.length/9;}
const syncDoors=()=>OCCDOOR.forEach(m=>{m.visible=!!DS[m.userData.door]===m.userData.open;m.userData.twin.visible=m.visible;});
const CUBE=new THREE.WebGLCubeRenderTarget(256,{type:THREE.FloatType,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,generateMipmaps:false});const CCAM=new THREE.CubeCamera(0.04,14,CUBE);OCC.add(CCAM);
const SUNRT=new THREE.WebGLRenderTarget(4096,4096,{type:THREE.FloatType,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,generateMipmaps:false,depthBuffer:true});
const SCAM=new THREE.OrthographicCamera(-7,7,7,-7,0.1,60);{const c=new THREE.Vector3(1.3,3,3.6);SCAM.position.copy(c).addScaledVector(SUNDIR,25);SCAM.lookAt(c);SCAM.updateMatrixWorld(true);SCAM.updateProjectionMatrix();}
// シェードのある窓：太陽から見たその窓の深さの画像。日差しがこの窓を通るときだけ、シェードの開度で弱める（ほかの窓の日差しは変えない。要件 C3）
const SUNWIN=new THREE.WebGLRenderTarget(2048,2048,{type:THREE.FloatType,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,generateMipmaps:false,depthBuffer:true}),WINQ=new THREE.Scene();
(typeof BAKE_WINDOWS!=='undefined'?BAKE_WINDOWS:[]).filter(w=>w.shadeable).forEach(w=>{const c=new THREE.Vector3(...w.c),u=new THREE.Vector3(...w.u),up=new THREE.Vector3(0,1,0),P=(a,b)=>c.clone().addScaledVector(u,a*w.w/2).addScaledVector(up,b*w.h/2),q=[P(-1,-1),P(1,-1),P(1,1),P(-1,-1),P(1,1),P(-1,1)],g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(q.flatMap(v=>v.toArray()),3));const m=new THREE.Mesh(g,distMat);m.frustumCulled=false;WINQ.add(m);});
const SUNVP=new THREE.Matrix4().multiplyMatrices(SCAM.projectionMatrix,SCAM.matrixWorldInverse);

// ===== 光を描き込む：画像の全画素について、その点の位置・向きから光の明るさと、影の画像で見えるかどうかを計算して足す =====
const ED=new THREE.WebGLRenderTarget(LMW,LMH,{type:THREE.HalfFloatType,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:false,generateMipmaps:false});   // 照度（lux × SC）。SC：昼1/1000・夜1（半精度に収める）
const bakeMat=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,depthTest:false,depthWrite:false,transparent:true,blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneFactor,blendEquation:THREE.AddEquation,
 uniforms:{tP:{value:GBP.texture},tN:{value:GB.textures[1]},tM:{value:null},useM:{value:0},sh:{value:CUBE.texture},shS:{value:SUNRT.texture},shW:{value:SUNWIN.texture},shadeT:{value:1},kind:{value:0},lp:{value:new THREE.Vector3()},ld:{value:new THREE.Vector3()},col:{value:new THREE.Vector3()},cosO:{value:0},cosI:{value:1},r2:{value:0},isPt:{value:0},soft:{value:1},lamb:{value:0},cres:{value:256},
  sunVP:{value:new THREE.Matrix4()},sd:{value:SUNDIR.clone()},cau:{value:0},zCau:{value:ZU.zCau.value},zCauK:{value:ZU.zCauK.value}},
 vertexShader:`void main(){gl_Position=vec4(position.xy,0.0,1.0);}`,
 fragmentShader:`uniform sampler2D tP,tN,tM,shS,shW,zCau;uniform float useM,shadeT;uniform samplerCube sh;uniform int kind;uniform vec3 lp,ld,col,sd;uniform float cosO,cosI,r2,isPt,soft,cau,lamb,cres;uniform mat4 sunVP;uniform vec4 zCauK;out vec4 o;
float cauF(vec3 d){float p=texture(zCau,vec2(atan(d.z,d.x)*0.1591549+0.5,asin(clamp(d.y,-1.0,1.0))*0.3183099+0.5)).r;float cd=-d.y,op=smoothstep(zCauK.x-0.015,zCauK.x+0.015,cd),gl=zCauK.z*(0.3+1.6*p)*(1.0-smoothstep(zCauK.y-0.02,zCauK.y+0.01,d.y)),rim=zCauK.w*exp(-pow((cd-zCauK.x+0.02)/0.03,2.0))*(0.5+p);return mix(gl,1.0,op)+rim;}
void main(){ivec2 c=ivec2(gl_FragCoord.xy);if(useM>0.5&&texelFetch(tM,c,0).r<0.5)discard;vec4 P=texelFetch(tP,c,0);vec3 n0=texelFetch(tN,c,0).xyz;if(P.w==0.0||!(dot(n0,n0)>1e-8)||any(isnan(P.xyz)))discard;vec3 n=normalize(n0),p=P.xyz+n*0.012;
 #ifdef SUN
 float nl=dot(n,sd);if(nl<=0.0)discard;vec4 q=sunVP*vec4(p,1.0);vec2 uv=q.xy/q.w*0.5+0.5;float dz=dot(p,sd)+100.0,v=0.0;
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){float s=texture(shS,uv+vec2(x,y)*soft/4096.0).r;v+=(s==0.0||s<dz+0.006)?1.0:0.0;}float wv=texture(shW,uv).r;o=vec4(col*nl*v/9.0*((wv>0.0&&wv>dz+0.01)?shadeT:1.0),1.0);
 #else
   // 太陽：光の向きの深さが自分より手前（太陽に近い）物があれば影
 float tex=2.0/cres;vec3 L0=lp-p;p+=n*(length(L0)*tex);   // 影の画像の1画素の大きさの分だけ面から浮かせて判定する（深さの余裕を小さくできる＝薄い面のすぐ裏へ光が回らない）
 vec3 L=lp-p;float d2=dot(L,L),d=sqrt(d2);L/=d;float nl=dot(n,L);if(nl<=0.0)discard;float cn=lamb>0.5?max(dot(-L,ld),0.0):isPt>0.5?1.0:smoothstep(cosO,cosI,dot(-L,ld));if(cn<=0.0)discard;
 vec3 dir=-L,t1=normalize(cross(dir,abs(dir.y)<0.9?vec3(0.0,1.0,0.0):vec3(1.0,0.0,0.0))),t2=cross(dir,t1);float k=soft*2.0/cres,b=0.003+0.25*d*tex,v=0.0;
 #ifdef BOUNCE
 for(int y=0;y<2;y++)for(int x=0;x<2;x++){float s=texture(sh,dir+(t1*(float(x)-0.5)+t2*(float(y)-0.5))*k*1.5).r;v+=(s==0.0||s>d-b)?1.0:0.0;}v/=4.0;
 #else
 for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){float s=texture(sh,dir+(t1*float(x)+t2*float(y))*k).r;v+=(s==0.0||s>d-b)?1.0:0.0;}v/=9.0;
 #endif
if(v<=0.0)discard;   // 影：9点で平均（縁をやわらかく）
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
function bakeSun(I,col){const u=bakeMat.uniforms;distMat.uniforms.sun.value=1;distMat.uniforms.sd.value.copy(SUNDIR);r.setRenderTarget(SUNRT);r.setClearColor(0x000000,0);r.clear();r.render(OCC,SCAM);r.setRenderTarget(SUNWIN);r.clear();r.render(WINQ,SCAM);
 u.kind.value=1;u.sunVP.value.multiplyMatrices(SCAM.projectionMatrix,SCAM.matrixWorldInverse);const k=col.clone().multiplyScalar(I*SC);u.col.value.set(k.r,k.g,k.b);u.soft.value=1.5;bq.material=bakeSunM;r.setRenderTarget(EG);r.autoClear=false;r.render(BQ,CAM0);r.autoClear=true;bq.material=bakeMat;}   // 太陽の直接の光は照り返しの元（EG）にだけ入れる。表示では影の画像から画素ごとに計算する（細い窓枠の影も段々にならない）

// ===== 確認用の表示（?lm=chk）：ライトマップの画素の格子と G-buffer の色・向きを面に貼って、展開がおかしくないかを見る =====
const LMQ=new URLSearchParams(location.search).get('lm');
if(LMQ==='chk'){const dm=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,uniforms:{tA:{value:GB.textures[2]},tN:{value:GB.textures[1]},WH:{value:new THREE.Vector2(LMW,LMH)}},
  vertexShader:`in vec3 lm;out vec2 vT;flat out ivec2 vI;out float vMode;uniform vec2 WH;void main(){vT=lm.xy;vI=ivec2(lm.xy);vMode=lm.z;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`in vec2 vT;flat in ivec2 vI;in float vMode;uniform sampler2D tA,tN;uniform vec2 WH;out vec4 o;
void main(){ivec2 c=vMode>0.5?vI:ivec2(vT*WH);vec3 a=texelFetch(tA,c,0).rgb,n=texelFetch(tN,c,0).rgb;float k=0.75+0.25*dot(n,normalize(vec3(0.3,1.0,0.5)));float ch=vMode>0.5?1.0:((c.x+c.y)%2==0?1.0:0.82);o=vec4(pow(a*k*ch,vec3(1.0/2.2)),1.0);}`});
 LMOBJ.forEach(o=>{o.material=dm;});draw=function(){if(!ready)return;cam.rotation.set(pitch,yaw,0);r.toneMapping=THREE.NoToneMapping;r.render(scene,cam);};draw();}

// ===== 照り返し：光の当たった面を、64cm角ほどのまとまり（セル）ごとの「やわらかく光る面」として、もう一度描き込む（2回。部屋の箱は使わない。壁・床・ドアで遮られ、開いたドアからは自然に回る） =====
const CELL=16,CELLS=[],CGRP=[];LM.charts.forEach((c,ci)=>{for(let y=0;y<c.h;y+=CELL)for(let x=0;x<c.w;x+=CELL){CELLS.push([c.x+x,c.y+y,Math.min(CELL,c.w-x),Math.min(CELL,c.h-y)]);CGRP.push(ci+':'+Math.floor(x/(CELL*4))+','+Math.floor(y/(CELL*4)));}});   // CGRP：照り返しで1つの光る面にするまとまり（同じチャート＝同じ面の、約2.6m角ごと。面をまたがないので、壁の向こうへ光を移さない）   // セル：チャートの区画を16×16画素（64cm角）ごとに分ける（チャートをまたがない）
const CW=256,CH=Math.ceil(CELLS.length/CW);
const cellTex=(()=>{const a=new Float32Array(CW*CH*4);CELLS.forEach((c,i)=>a.set(c,i*4));const t=new THREE.DataTexture(a,CW,CH,THREE.RGBAFormat,THREE.FloatType);t.needsUpdate=true;return t;})();
const CRT=new THREE.WebGLRenderTarget(CW,CH,{count:3,type:THREE.FloatType,depthBuffer:false,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter});
const aggMat=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,depthTest:false,depthWrite:false,uniforms:{tE:{value:null},tE2:{value:null},tP:{value:GB.textures[0]},tN:{value:GB.textures[1]},tA:{value:GB.textures[2]},tC:{value:cellTex},n:{value:CELLS.length}},
 vertexShader:`void main(){gl_Position=vec4(position.xy,0.0,1.0);}`,
 fragmentShader:`uniform sampler2D tE,tE2,tP,tN,tA,tC;uniform int n;layout(location=0) out vec4 oF;layout(location=1) out vec4 oP;layout(location=2) out vec4 oN;
void main(){ivec2 c=ivec2(gl_FragCoord.xy);int i=c.y*${CW}+c.x;oF=vec4(0.0);oP=vec4(0.0);oN=vec4(0.0);if(i>=n)return;vec4 r=texelFetch(tC,c,0);ivec2 o=ivec2(r.xy);int w=int(r.z),h=int(r.w);vec3 F=vec3(0.0),P=vec3(0.0),P2=vec3(0.0),N=vec3(0.0);float k=0.0,wf=0.0;
 for(int y=0;y<${CELL};y++){if(y>=h)break;for(int x=0;x<${CELL};x++){if(x>=w)break;ivec2 q=o+ivec2(x,y);vec4 p=texelFetch(tP,q,0);if(p.w==0.0)continue;vec3 f=(texelFetch(tE,q,0).rgb+texelFetch(tE2,q,0).rgb)*texelFetch(tA,q,0).rgb;float fl=dot(f,vec3(0.2126,0.7152,0.0722));F+=f;P+=p.xyz;P2+=p.xyz*fl;wf+=fl;N+=texelFetch(tN,q,0).xyz;k+=1.0;}}
 if(k>0.0){oF=vec4(F,k);oP=vec4(wf>0.0?P2/wf:P/k,k);oN=vec4(normalize(N),0.0);}}`});   // セルごとに：反射する光の量（照度×反射率の合計）・光の量で重みを付けた中心（光が当たっている所から光らせる。ドアの下をまたぐ床などで、暗い側から光を出さないように）・向き
const aggQ=new THREE.Mesh(new THREE.PlaneGeometry(2,2),aggMat);aggQ.frustumCulled=false;const AGGS=new THREE.Scene();AGGS.add(aggQ);
const CUBE2=new THREE.WebGLCubeRenderTarget(256,{type:THREE.FloatType,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,generateMipmaps:false});const CCAM2=new THREE.CubeCamera(0.03,14,CUBE2);OCCB.add(CCAM2);
// 照り返しは変化がなだらかなので、チャートの中は8×8画素（32cm）に1画素だけ計算し（MK）、残りは同じチャートのまわりの計算した画素から補う（チャートをまたがない）。頂点ごとの画素は全部、格子で補えない画素はその画素を計算する
LM.bstep=8;const MKD=new Uint8Array(LMW*LMH*4),PTS=[];{const P=new Float32Array(LMW*LMH*4);r.readRenderTargetPixels(GB,0,0,LMW,LMH,P,undefined,0);
 // ドアの側の印：閉じたドアの面（SEALS）の近く（面から35cm以内で、開口と扉の幅＋15cm・高さの範囲。扉の面とほぼ同じ位置（3mm以内）の画素は除く＝ドアの横の壁で側がばらつかないように）にある画素に、ドアごとに「どちら側か」を記録する。補うときは、閉じたドアの反対側の画素を使わない（床がドアの下でつながっていても、向こうの明るさがにじまない）
 const NN=new Float32Array(LMW*LMH*4);r.readRenderTargetPixels(GB,0,0,LMW,LMH,NN,undefined,1);const SC=new Float32Array(LMW*LMH),SS=new Float32Array(LMW*LMH),NEAR=new Uint8Array(LMW*LMH),LF=new Float32Array(LMW*LMH);for(let i=0;i<LMW*LMH;i++){if(P[i*4+3]===0)continue;const x=P[i*4],y=P[i*4+1],z=P[i*4+2];let c=0,sd=0,lf=0;const ch=P[i*4+3]>0?LM.charts[P[i*4+3]-1]:null,dynC=!ch||!!(ch.o&&ch.o.userData&&ch.o.userData.dyn);   // 扉そのもの（動く部品）は除く
  SEALS.forEach((q,j)=>{const dx=x-q.c.x,dy=y-q.c.y,dz=z-q.c.z,sv=dx*q.n.x+dy*q.n.y+dz*q.n.z-q.off,u=dx*q.t.x+dy*q.t.y+dz*q.t.z;if(Math.abs(sv)<0.35&&Math.abs(sv)>0.003&&u>q.t0-0.15&&u<q.t1+0.15&&y>q.b0-0.05&&y<q.b1+0.05){c|=1<<j;if(sv>0)sd|=1<<j;if(Math.abs(sv)<0.12)NEAR[i]=1;if(!dynC&&u>q.t0&&u<q.t1&&((Math.abs(sv)<0.05&&NN[i*4+1]>0.9&&y<q.b0+0.1)||(Math.abs(sv)<q.lh&&y<q.b1)))lf=j+1;}});SC[i]=c;SS[i]=sd;LF[i]=lf;}
 const sideOK=(i,k)=>{const cc=SC[i]&SC[k];return ((SS[i]^SS[k])&cc)===0;};
 {const D=new Float32Array(LMW*LMH*4);for(let i=0;i<LMW*LMH;i++){D[i*4]=SC[i];D[i*4+1]=SS[i];D[i*4+2]=LF[i];}const t=new THREE.DataTexture(D,LMW,LMH,THREE.RGBAFormat,THREE.FloatType);t.minFilter=t.magFilter=THREE.NearestFilter;t.needsUpdate=true;LM.sideTex=t;}
 {const isG=i=>{const w=P[i*4+3];if(!(w>0))return false;const ch=LM.charts[w-1];return !!(ch&&ch.o&&ch.o.material===bathGlM);},H=new Map(),key=(x,y,z)=>Math.round(x*100)+','+Math.round(y*100)+','+Math.round(z*100);
  const G=[];for(let i=0;i<LMW*LMH;i++)if(isG(i)){G.push(i);H.set(key(P[i*4],P[i*4+1],P[i*4+2])+'|'+Math.round(NN[i*4]*2)+','+Math.round(NN[i*4+1]*2)+','+Math.round(NN[i*4+2]*2),i);}
  const D=new Float32Array(LMW*LMH*4);G.forEach(i=>{const nx=NN[i*4],ny=NN[i*4+1],nz=NN[i*4+2],ox=P[i*4]-nx*0.006,oy=P[i*4+1]-ny*0.006,oz=P[i*4+2]-nz*0.006,nk='|'+Math.round(-nx*2)+','+Math.round(-ny*2)+','+Math.round(-nz*2);
   let j,bd=1e9;for(let dx=-3;dx<=3;dx++)for(let dy=-3;dy<=3;dy++)for(let dz=-3;dz<=3;dz++){const k=H.get(key(ox+dx/100,oy+dy/100,oz+dz/100)+nk);if(k===undefined)continue;const dd=(P[k*4]-ox)**2+(P[k*4+1]-oy)**2+(P[k*4+2]-oz)**2;if(dd<bd){bd=dd;j=k;}}   // 裏の面で、いちばん近い画素（3cm以内）
   if(j!==undefined){D[i*4]=j%LMW;D[i*4+1]=Math.floor(j/LMW);D[i*4+2]=1;}});
  const t=new THREE.DataTexture(D,LMW,LMH,THREE.RGBAFormat,THREE.FloatType);t.minFilter=t.magFilter=THREE.NearestFilter;t.needsUpdate=true;LM.oppTex=t;LM.nGlass=G.length;}   // すりガラスの裏表の対応（裏の面は、表で受けた光の一部で光って見える）
 const R=LM.bstep-1,COV=new Uint8Array(LMW*LMH);
 const set=(x,y)=>{const k=(y*LMW+x)*4;if(MKD[k])return;MKD[k]=MKD[k+1]=MKD[k+2]=MKD[k+3]=255;PTS.push(x,y,0);const w=P[k+3];if(w<=0)return;
  for(let j=Math.max(0,y-R);j<=Math.min(LMH-1,y+R);j++)for(let i=Math.max(0,x-R);i<=Math.min(LMW-1,x+R);i++)if(P[(j*LMW+i)*4+3]===w&&sideOK(j*LMW+i,y*LMW+x))COV[j*LMW+i]=1;};   // COV：同じチャートで、計算する画素から R 以内（補える）
 for(let y=0;y<LMH;y++)for(let x=0;x<LMW;x++){const k=y*LMW+x;if(P[k*4+3]<0||(P[k*4+3]>0&&NEAR[k]))set(x,y);}   // 頂点ごとの画素と、閉じたドアの面から12cm以内の画素は全部計算する（補うと、扉のすぐ手前の値が広がるため）
 const S=LM.bstep;LM.charts.forEach(c=>{const nx=Math.ceil(c.w/S),ny=Math.ceil(c.h/S),x0=c.x+Math.floor((c.w-1-(nx-1)*S)/2),y0=c.y+Math.floor((c.h-1-(ny-1)*S)/2);
  for(let b=0;b<ny;b++)for(let a=0;a<nx;a++){const x=x0+a*S,y=y0+b*S;if(P[(y*LMW+x)*4+3]===c.gid+1)set(x,y);}});   // チャートごとに、チャートの中央にそろえた S 画素おきの格子
 for(let y=0;y<LMH;y++)for(let x=0;x<LMW;x++){const k=y*LMW+x;if(P[k*4+3]>0&&!COV[k])set(x,y);}}   // 格子で補えない画素（細長い・不規則な形のチャート）は、その画素も計算する
const MK={texture:(()=>{const t=new THREE.DataTexture(MKD,LMW,LMH,THREE.RGBAFormat,THREE.UnsignedByteType);t.minFilter=t.magFilter=THREE.NearestFilter;t.needsUpdate=true;return t;})()};bakeMat.uniforms.tM.value=MK.texture;
const ptsGeo=new THREE.BufferGeometry();ptsGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(PTS),3));LM.nPts=PTS.length/3;
const bakePts=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,defines:{BOUNCE:1},depthTest:false,depthWrite:false,transparent:true,blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneFactor,blendEquation:THREE.AddEquation,uniforms:bakeMat.uniforms,
 vertexShader:`uniform vec2 WH;void main(){gl_Position=vec4((position.xy+0.5)/WH*2.0-1.0,0.0,1.0);gl_PointSize=1.0;}`,fragmentShader:bakeMat.fragmentShader});   // 照り返しは計算する画素だけを点として描く（画像全体を描くより速い）
bakeMat.uniforms.WH={value:new THREE.Vector2(LMW,LMH)};const BPS=new THREE.Scene(),bpo=new THREE.Points(ptsGeo,bakePts);bpo.frustumCulled=false;BPS.add(bpo);
const fillMat=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,defines:{R:LM.bstep-1},depthTest:false,depthWrite:false,uniforms:{tE:{value:null},tP:{value:GB.textures[0]},tM:{value:MK.texture},tS:{value:LM.sideTex},closed:{value:0}},vertexShader:`void main(){gl_Position=vec4(position.xy,0.0,1.0);}`,
 fragmentShader:`uniform sampler2D tE,tP,tM,tS;uniform int closed;out vec4 o;void main(){ivec2 c=ivec2(gl_FragCoord.xy);float w=texelFetch(tP,c,0).w;vec3 sc=texelFetch(tS,c,0).xyz;if(w!=0.0&&sc.z>0.5&&((closed>>(int(sc.z)-1))&1)==1){o=vec4(0.0,0.0,0.0,1.0);return;}if(w==0.0||texelFetch(tM,c,0).r>0.5){o=texelFetch(tE,c,0);return;}int c0=int(sc.x)&closed,s0=int(sc.y);
 vec3 s=vec3(0.0);float ws=0.0;for(int y=-R;y<=R;y++)for(int x=-R;x<=R;x++){ivec2 q=c+ivec2(x,y);if(texelFetch(tM,q,0).r<0.5||texelFetch(tP,q,0).w!=w)continue;vec3 sq=texelFetch(tS,q,0).xyz;if(((s0^int(sq.y))&c0&int(sq.x))!=0||(sq.z>0.5&&((closed>>(int(sq.z)-1))&1)==1))continue;float k=(1.0-abs(float(x))/float(R+1))*(1.0-abs(float(y))/float(R+1));s+=texelFetch(tE,q,0).rgb*k;ws+=k;}o=vec4(ws>0.0?s/ws:vec3(0.0),1.0);}`});
const fillQ=new THREE.Mesh(new THREE.PlaneGeometry(2,2),fillMat);fillQ.frustumCulled=false;const FILLS=new THREE.Scene();FILLS.add(fillQ);
const fillTo=(src,dst)=>{fillMat.uniforms.closed.value=SEALS.reduce((m,q,j)=>DS[q.k]?m:m|(1<<j),0);fillMat.uniforms.tE.value=src.texture;r.setRenderTarget(dst);r.render(FILLS,CAM0);};
const EB1=ED.clone(),EB2=ED.clone(),EBT=ED.clone(),ET=ED.clone(),EG=ED.clone(),EZ=ED.clone();r.setRenderTarget(EZ);r.setClearColor(0x000000,0);r.clear();r.setRenderTarget(null);   // EG：G1 の直接の光（照り返しの元にだけ使う。表示は実時間）、EZ：黒
const CGRPC=CGRP.map(k=>+k.split(':')[0]);   // まとまりのチャートの番号
const GLASS_T=0.5;   // 浴室のドアのすりガラスの透過率（仮）
const NSHOOT=[2000,6000];   // 照り返しの1回目・2回目で光る面として使うまとまりの、光の量の下限（この値より暗いまとまりは、照らしても見えないほどなので省く）。
// 「明るい順に何個」にすると、昼は日なたが上位を占めて窓の無い部屋のまとまりが外れ、同じ部屋が昼夜で違って見える（トイレの指摘）。下限は全状態で同じなので、ある部屋の照り返しは他の部屋の明るさによらない
function bounce(src,dst,src2,ns){aggMat.uniforms.tE.value=src.texture;aggMat.uniforms.tE2.value=(src2||EZ).texture;r.setRenderTarget(CRT);r.render(AGGS,CAM0);const F=new Float32Array(CW*CH*4),P=new Float32Array(CW*CH*4),N=new Float32Array(CW*CH*4);
 r.readRenderTargetPixels(CRT,0,0,CW,CH,F,undefined,0);r.readRenderTargetPixels(CRT,0,0,CW,CH,P,undefined,1);r.readRenderTargetPixels(CRT,0,0,CW,CH,N,undefined,2);
 const A=LM.ts*LM.ts,G=new Map();for(let i=0;i<CELLS.length;i++){const k=F[i*4+3];if(k<=0)continue;const y=0.2126*F[i*4]+0.7152*F[i*4+1]+0.0722*F[i*4+2];if(!(y>0))continue;
  let g=G.get(CGRP[i]);if(!g){g={y:0,F:new THREE.Vector3(),P:new THREE.Vector3(),N:new THREE.Vector3(N[i*4],N[i*4+1],N[i*4+2]),k:0,i};G.set(CGRP[i],g);}g.y+=y;g.F.x+=F[i*4];g.F.y+=F[i*4+1];g.F.z+=F[i*4+2];g.P.addScaledVector(new THREE.Vector3(P[i*4],P[i*4+1],P[i*4+2]),y);g.k+=k;}   // まとまりごとに：光の量の合計・光の量で重みを付けた中心
 const shown=o=>{for(let q=o;q;q=q.parent)if(!q.visible)return false;return true;};
 G.forEach((g,key)=>{const ch=LM.charts[CGRPC[g.i]];if(ch&&ch.o&&(!shown(ch.o)||(ch.o.userData.dk&&!DS[ch.o.userData.dk]&&ch.o.material!==bathGlM))){G.delete(key);return;}   // 閉じた扉の面も光らせない（扉と壁のすき間から反対側へ回るため。すりガラスは別に扱う）
const p=g.P.clone().multiplyScalar(1/g.y);
  if(SEALS.some(s=>!DS[s.k]&&Math.abs(g.N.dot(s.n))<0.5&&Math.abs(p.clone().sub(s.c).dot(s.n)-s.off)<0.04&&(()=>{const u=p.clone().sub(s.c).dot(s.t);return u>s.t0-0.02&&u<s.t1+0.02&&p.y>s.b0-0.02&&p.y<s.b1+0.02;})()))G.delete(key);});   // 表示していない形（閉じたドアの開いた形など）と、閉じたドアの厚みの中で扉の面と直角な面（扉の小口・ガラスのすき間の面）のまとまりは光らせない（ドアの両側の光を混ぜて反対側へ出してしまうため）
 const gs=[...G.values()].sort((a,b)=>b.y-a.y||a.i-b.i),sel=gs.filter(g=>g.y>=ns);   // 下限〜2倍の間は光を0から1倍へなめらかに増やす（下限の前後でわずかな光の差が、急な見た目の差にならないように）
LM.nSel=(LM.nSel||[]).concat(sel.length).slice(-2);
 r.setRenderTarget(dst);r.setClearColor(0x000000,0);r.clear();
 const tr=[];sel.forEach(g=>{const ch=LM.charts[CGRPC[g.i]];if(ch&&ch.o&&ch.o.material===bathGlM)tr.push(g);});   // 浴室のドアのすりガラス：受けた光の一部を反対側へ、ぼんやりした光として出す（透過率 GLASS_T は仮）
 tr.forEach(g=>{const n=g.N;if(!(n.lengthSq()>0.5))return;const pos=g.P.clone().multiplyScalar(1/g.y).addScaledVector(n,-0.026),area=g.k*LM.ts*LM.ts,phi=g.F.clone().multiplyScalar(LM.ts*LM.ts/Math.PI*GLASS_T/lum(bathGlM.color)*Math.min(1,(g.y-ns)/ns));
  bakeEmitter({pos,dir:n.clone().negate(),lamb:1,intensity:1,colv:phi,r2:area/Math.PI,soft:1.5,cube:2},dst);});
 sel.forEach(g=>{const n=g.N;if(!(n.lengthSq()>0.5))return;const pos=g.P.multiplyScalar(1/g.y),area=g.k*A,phi=g.F.clone().multiplyScalar(A/Math.PI*Math.min(1,(g.y-ns)/ns));   // 反射した光束÷π（拡散面の正面の光度）
  bakeEmitter({pos:pos.addScaledVector(n,0.02),dir:n,lamb:1,intensity:1,colv:phi,r2:area/Math.PI,soft:1.5,cube:2},dst);});
 LM.nShoot=sel.length;}
const sumMat=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,depthTest:false,depthWrite:false,uniforms:{a:{value:ED.texture},b:{value:EB1.texture},c:{value:EB2.texture},tS:{value:LM.sideTex},closed:{value:0},tO:{value:LM.oppTex},gT:{value:GLASS_T/(0.2126*bathGlM.color.r+0.7152*bathGlM.color.g+0.0722*bathGlM.color.b)}},vertexShader:`void main(){gl_Position=vec4(position.xy,0.0,1.0);}`,
 fragmentShader:`uniform sampler2D a,b,c,tS,tO;uniform float gT;uniform int closed;out vec4 o;void main(){ivec2 q=ivec2(gl_FragCoord.xy);float lf=texelFetch(tS,q,0).z;if(lf>0.5&&((closed>>(int(lf)-1))&1)==1){o=vec4(0.0,0.0,0.0,1.0);return;}o=vec4(texelFetch(a,q,0).rgb+texelFetch(b,q,0).rgb+texelFetch(c,q,0).rgb,1.0);vec3 op=texelFetch(tO,q,0).xyz;if(op.z>0.5){ivec2 r=ivec2(op.xy);o.rgb+=(texelFetch(a,r,0).rgb+texelFetch(b,r,0).rgb+texelFetch(c,r,0).rgb)*gT;}}`});   // 閉じた扉の真下の床（5cm以内）と、扉の厚みの中（扉に隠れる壁・枠の部分）は光を0に
const sumQ=new THREE.Mesh(new THREE.PlaneGeometry(2,2),sumMat);sumQ.frustumCulled=false;const SUMS=new THREE.Scene();SUMS.add(sumQ);
// ===== 普段の描画：光は使わず、ライトマップの照度を「周りからの光」として材質に入れる（拡散の明るさ＝照度×反射率÷π） =====
const LMU={lmTex:{value:ET.texture},lmScale:{value:new THREE.Vector3(1,1,1)},sunS:{value:SUNRT.texture},sunW:{value:SUNWIN.texture},sunVP:{value:SUNVP},sunD:{value:SUNDIR.clone()},sunC:{value:new THREE.Vector3()},sunOn:{value:0},shadeT:{value:1},sunR:{value:0.015/14}};   // sun…：太陽の直接の光（表示で計算）。sunR：影の縁のぼかしの半径（約1.5cm。太陽の大きさによる半影）
// lmB：ライトマップを4×4画素でなめらかに読む（3次のB-スプライン。画素の段々が見えないように）
function lmPatch(sh){Object.assign(sh.uniforms,LMU);
 sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 lm;uniform sampler2D lmTex;varying vec2 vLmUv;varying vec3 vLmV;varying vec3 vWP;')
  .replace('#include <begin_vertex>','#include <begin_vertex>\nvWP=(modelMatrix*vec4(transformed,1.0)).xyz;if(lm.z>0.5){vLmV=texelFetch(lmTex,ivec2(lm.xy),0).rgb;vLmUv=vec2(-1.0);}else{vLmUv=lm.xy;vLmV=vec3(0.0);}');   // 頂点ごとの部品は頂点で読んで面の中はなめらかに
 sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D lmTex;uniform vec3 lmScale;varying vec2 vLmUv;varying vec3 vLmV;varying vec3 vWP;uniform sampler2D zCau;\nuniform sampler2D sunS,sunW;uniform mat4 sunVP;uniform vec3 sunD,sunC;uniform float sunOn,shadeT,sunR;\nconst vec2 PD[12]=vec2[12](vec2(-0.326,-0.406),vec2(-0.840,-0.074),vec2(-0.696,0.457),vec2(-0.203,0.621),vec2(0.962,-0.195),vec2(0.473,-0.480),vec2(0.519,0.767),vec2(0.185,-0.893),vec2(0.507,0.064),vec2(0.896,0.412),vec2(-0.322,-0.933),vec2(-0.792,-0.598));\nvec3 sunE(vec3 nW){float nl=dot(nW,sunD);if(sunOn<0.5||nl<=0.0)return vec3(0.0);vec3 p=vWP+nW*0.01;vec4 q=sunVP*vec4(p,1.0);vec2 uv=q.xy/q.w*0.5+0.5;float dz=dot(p,sunD)+100.0,v=0.0;for(int i=0;i<12;i++){float s=texture2D(sunS,uv+PD[i]*sunR).r;v+=(s==0.0||s<dz+0.004)?1.0:0.0;}v/=12.0;float wv=texture2D(sunW,uv).r;if(wv>0.0&&wv>dz+0.01)v*=shadeT;return sunC*(nl*v);}\nvec3 lmB(vec2 uv){vec2 ts=vec2(textureSize(lmTex,0)),st=uv*ts-0.5,i=floor(st),f=st-i,f2=f*f,f3=f2*f,w0=(1.0-3.0*f+3.0*f2-f3)/6.0,w1=(4.0-6.0*f2+3.0*f3)/6.0,w2=(1.0+3.0*f+3.0*f2-3.0*f3)/6.0,w3=f3/6.0,g0=w0+w1,g1=w2+w3,h0=(i-0.5+w1/g0)/ts,h1=(i+1.5+w3/g1)/ts;\n return g0.y*(g0.x*texture2D(lmTex,h0).rgb+g1.x*texture2D(lmTex,vec2(h1.x,h0.y)).rgb)+g1.y*(g0.x*texture2D(lmTex,vec2(h0.x,h1.y)).rgb+g1.x*texture2D(lmTex,h1).rgb);}uniform vec4 zCauK;uniform vec3 g1P;\nfloat cauF(vec3 d){float p=texture2D(zCau,vec2(atan(d.z,d.x)*0.1591549+0.5,asin(clamp(d.y,-1.0,1.0))*0.3183099+0.5)).r;float cd=-d.y,op=smoothstep(zCauK.x-0.015,zCauK.x+0.015,cd),gl=zCauK.z*(0.3+1.6*p)*(1.0-smoothstep(zCauK.y-0.02,zCauK.y+0.01,d.y)),rim=zCauK.w*exp(-pow((cd-zCauK.x+0.02)/0.03,2.0))*(0.5+p);return mix(gl,1.0,op)+rim;}')
  .replace('#include <lights_fragment_begin>',THREE.ShaderChunk.lights_fragment_begin.replace(/(pointLight = pointLights\[ i \];[\s\S]*?)(RE_Direct\()/,'$1directLight.color *= cauF( normalize( vWP - g1P ) );\n\t\t$2'))
  .replace('#include <lights_fragment_maps>',THREE.ShaderChunk.lights_fragment_maps.replace('iblIrradiance += getIBLIrradiance( geometryNormal );','')+'\n\tirradiance += ((vLmUv.x>=0.0?lmB(vLmUv):vLmV)+sunE(inverseTransformDirection(geometryNormal,viewMatrix)))*lmScale;');}
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
 LMU.sunOn.value=night?0:1;if(!night){bakeMat.uniforms.shadeT.value=tr;LMU.shadeT.value=tr;const sc=lumColor(0xfff1dc).multiplyScalar(SUN_LUX*SUN_K*SC);LMU.sunC.value.set(sc.r,sc.g,sc.b);bakeSun(SUN_LUX*SUN_K,lumColor(0xfff1dc));n++;}
 {const w=WBC;LMU.lmScale.value.set(1/SC/w.r,1/SC/w.g,1/SC/w.b);if(G1L.userData.col)G1L.color.setRGB(G1L.userData.col.r/w.r,G1L.userData.col.g/w.g,G1L.userData.col.b/w.b);}   // 白の合わせは固定（点いている照明や昼夜で変えない。変えると同じ部屋の色が状態で変わるため）
 const t1=performance.now();bounce(ED,EBT,EG,NSHOOT[0]);fillTo(EBT,EB1);bounce(EB1,EBT,null,NSHOOT[1]);fillTo(EBT,EB2);sumMat.uniforms.closed.value=SEALS.reduce((m,q,j)=>DS[q.k]?m:m|(1<<j),0);r.setRenderTarget(ET);r.render(SUMS,CAM0);LM.bounceMs=performance.now()-t1;   // 照り返し2回を足して、表示に使う照度にする
 r.toneMappingExposure=LM.EXPO;updateGlow();r.setRenderTarget(null);LM.bakeMs=performance.now()-t0;LM.nEmit=n;}
draw=function(){if(!ready)return;cam.rotation.set(pitch,yaw,0);r.setRenderTarget(null);r.render(scene,cam);};
applyEnvAll=function(){relight();draw();};
{const _td=toggleDoor;toggleDoor=function(k){const was=DS[k];_td(k);if(DS[k]!==was){relight('door:'+k);draw();}};}
if(LMQ!=='chk'){applyEnvAll();let n=0;const t=setInterval(()=>{draw();if(++n>=3)clearInterval(t);},400);}   // 読み込み中の表示が消えた後にも描き直す

LM.loaded=true;   // 最後まで読み込めた印（確認の道具が待つ）
