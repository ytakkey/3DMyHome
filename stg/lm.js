// 検証版（stg）：ライトマップ方式（0章の要件・8章）。点灯・昼夜・ドア・シェードが変わったときだけ、光（影を含む）と照り返しを面の画像（ライトマップ）に描き込み、普段の描画はその画像を貼るだけ
// 画像の1画素＝面の上の1点（stg/pre.js が付けた属性 lm で対応）。まず各画素の位置・向き・色（G-buffer）を作り、光ごとに「その点から光が見えるか」を影の画像で調べて明るさを足す
r.toneMapping=THREE.AgXToneMapping;   // 明るい所をなだらかに圧縮する（日なたが白く飛ばず、暗めの所も見える）
const LMW=LM.W,LMH=LM.H;LM.tm={t0:performance.now()};   // tm：読み込みの各段階の時間（確認用）
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
  const vert=o.geometry.attributes.lm.getZ(0)>0.5,px=vert?new THREE.Points(o.geometry,gm):new THREE.Mesh(o.geometry,gm);px.matrixAutoUpdate=false;px.matrixWorld.copy(o.matrixWorld);px.matrix.copy(o.matrixWorld);px.frustumCulled=false;gs.add(px);
  if(!vert){const wm=gbMat(m);if(o.geometry.attributes.uv)wm.defines={HAS_UV:1};if(m.map)wm.uniforms.uvT.value.copy(m.map.matrix);wm.wireframe=true;const wx=new THREE.Mesh(o.geometry,wm);wx.renderOrder=-1;wx.matrixAutoUpdate=false;wx.matrixWorld.copy(o.matrixWorld);wx.matrix.copy(o.matrixWorld);wx.frustumCulled=false;gs.add(wx);}});   // 三角形の辺も線で先に描く：画素より細い面（ドアの開口と隅の間の細い壁など）は、三角形だけだと画素の中心にかからず何も書かれない（表示でその空の画素を読んで黒い線になる）
 const cam0=new THREE.Camera();r.setRenderTarget(GB);r.setClearColor(0x000000,0);r.clear();gs.traverse(o=>{if(o.isMesh||o.isPoints)o.updateMatrixWorld=()=>{};});r.render(gs,cam0);
 // すき間を埋める：まだ書かれていない画素（チャートの余白・細い三角形の取りこぼし）に、となりの書かれた画素の値を入れる（2回）
 const dil=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,depthTest:false,depthWrite:false,uniforms:{tP:{value:null},tN:{value:null},tA:{value:null}},vertexShader:`void main(){gl_Position=vec4(position.xy,0.0,1.0);}`,
  fragmentShader:`uniform sampler2D tP,tN,tA;layout(location=0) out vec4 oP;layout(location=1) out vec4 oN;layout(location=2) out vec4 oA;
void main(){ivec2 c=ivec2(gl_FragCoord.xy);vec4 p=texelFetch(tP,c,0);if(p.w!=0.0){oP=p;oN=texelFetch(tN,c,0);oA=texelFetch(tA,c,0);return;}
 const ivec2 D[8]=ivec2[8](ivec2(-1,0),ivec2(1,0),ivec2(0,-1),ivec2(0,1),ivec2(-1,-1),ivec2(1,-1),ivec2(-1,1),ivec2(1,1));oP=vec4(0.0);oN=vec4(0.0);oA=vec4(0.0);
 for(int k=0;k<8;k++){ivec2 q=c+D[k];vec4 pp=texelFetch(tP,q,0);if(pp.w>0.0){oP=pp;oN=vec4(texelFetch(tN,q,0).xyz,0.0);oA=texelFetch(tA,q,0);return;}}}`});   // となりの1画素をそのまま写す（上下左右を先に。向きの w を0にして、写した画素の印にする）。平均すると、L字の細い面の内側の角で位置が面の外（隣の部屋）に出て、その位置の光を拾った
 const fq=new THREE.Mesh(new THREE.PlaneGeometry(2,2),dil);fq.frustumCulled=false;const fs=new THREE.Scene();fs.add(fq);let a=GB,b=GB2;
 for(let i=0;i<4;i++){dil.uniforms.tP.value=a.textures[0];dil.uniforms.tN.value=a.textures[1];dil.uniforms.tA.value=a.textures[2];r.setRenderTarget(b);r.render(fs,cam0);[a,b]=[b,a];}
 if(a!==GB){dil.uniforms.tP.value=a.textures[0];dil.uniforms.tN.value=a.textures[1];dil.uniforms.tA.value=a.textures[2];r.setRenderTarget(GB);r.render(fs,cam0);}
 GB2.dispose();   // すき間を埋め終わったら入れ替え用は捨てる（メモリ）
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
// 影の画像（CUBE・CUBE2・SUNRT・SUNWIN）は距離1つだけなので、赤1色の浮動小数の画像にする（4色の画像の1/4のメモリ。iPhone ではメモリが足りずページが落ちたため）
const OCC=new THREE.Scene(),distMat=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,side:THREE.DoubleSide,uniforms:{lp:{value:new THREE.Vector3()},sd:{value:new THREE.Vector3()},sun:{value:0}},
 vertexShader:`out vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.0);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
 fragmentShader:`in vec3 vW;uniform vec3 lp,sd;uniform float sun;out vec4 o;void main(){o=vec4(sun>0.5?dot(vW,sd)+100.0:distance(vW,lp),0.0,0.0,1.0);}`});   // 太陽は光の向きに沿った深さ（＋100。0は「何も無い」の印）
const occOf=o=>{const m=o.material;if(FROST.includes(o))return true;if(m.isMeshBasicMaterial||m.transparent||m.colorWrite===false)return false;if(o.userData.dyn&&o.userData.dk===undefined)return false;return true;};
// 壁・床・天井は厚みの無い1枚の面で、床・天井は隙間ができないよう壁の向こうへ8cm広げてある。そのままだと、面のすぐ裏や壁の向こうへ出た床に向こう側（外・隣の部屋）の光が当たり、ライトマップのにじみで根元や隅に明るい線が出る（光漏れ）。
// 影の計算でだけ、大きな平らな面（チャートの広さ0.3m²以上：壁・床・天井・大きな家具の面。作り方によらない）を、裏側へ厚みのある板にする。厚みは最大 SLABT、裏に向かい合う面があればその5mm手前まで（隣の部屋へはみ出さない）
// 向かい合う面かどうかは、面の向きの方向にも s だけ広げた箱が重なるかで見る
// 内側の角（部屋から見てへこんだ角）では、2枚の板の外側の角に穴が残り、そこを通った光（日差しなど）が角のすぐ近くの画素に届く（土間収納の天井の角の光る点）。
// 面の外周の辺が、ほぼ直角に出会う別の大きな面 o の上にあり、o が部屋側でこの辺に接している所だけ、辺から o の板の厚み分だけ板を延ばしてふさぐ（CF。開口の縁などは延ばさない）
const SLABT=0.1,SLABX=(()=>{scene.updateMatrixWorld(true);const big=new Map(),v=new THREE.Vector3();
 LM.big.forEach(({c,tri,nrm})=>{const n=new THREE.Vector3(c.nx,c.ny,c.nz).normalize();if(nrm&&n.dot(new THREE.Vector3(...nrm))<0)n.negate();const b={c,n,box:new THREE.Box3(),tri};   // 表の向きは光の計算に使う面の向き（法線）で決める（反転して作った部品でも、表側に板を作らない）
for(let k=0;k<tri.length;k+=3)b.box.expandByPoint(v.set(tri[k],tri[k+1],tri[k+2]));big.set(c,b);});   // stg/pre.js が記録した、動かない部品の大きな平らな面
 const B=[...big.values()];B.forEach(b=>{b.d=b.n.dot(b.box.getCenter(v));});
 B.forEach(b=>{let T=SLABT+0.005;B.forEach(o=>{if(o===b||b.n.dot(o.n)>-0.99)return;const s=b.d+o.d;   // o の面は b の面の裏 s の所（o.d=−(b.n·点)）
  if(!(s>0.0005&&s<T))return;const e=b.box.clone().expandByScalar(s+0.01);if(!e.intersectsBox(o.box))return;T=s;});b.T=T<0.009?T*0.5:Math.min(SLABT,T-0.005);});LM.slabB=B;   // 裏の面が9mmより近い薄い板（キッチンの東の壁のパネル・天板など）は、板をすき間の半分までにする（下限4mmにすると板が反対側の面を越えて、その面が影の中で真っ黒になった）
 const CF=[],CFB=LM.cfBox=[];{const V=(x,y,z)=>new THREE.Vector3(x,y,z),inO=(o,p)=>{const t=o.tri,a=new THREE.Vector3(),b1=new THREE.Vector3(),c=new THREE.Vector3(),v0=new THREE.Vector3(),v1=new THREE.Vector3(),v2=new THREE.Vector3();for(let k=0;k<t.length;k+=9){a.set(t[k],t[k+1],t[k+2]);b1.set(t[k+3],t[k+4],t[k+5]);c.set(t[k+6],t[k+7],t[k+8]);v0.subVectors(b1,a);v1.subVectors(c,a);v2.subVectors(p,a);
   const d00=v0.dot(v0),d01=v0.dot(v1),d11=v1.dot(v1),d20=v2.dot(v0),d21=v2.dot(v1),den=d00*d11-d01*d01;if(!(den>1e-12))continue;const y=(d11*d20-d01*d21)/den,z=(d00*d21-d01*d20)/den;if(y>=-1e-4&&z>=-1e-4&&y+z<=1+1e-4)return true;}return false;};
  B.forEach(b=>{const q=b.tri,E=new Map(),K=(i)=>Math.round(q[i]*1e4)+','+Math.round(q[i+1]*1e4)+','+Math.round(q[i+2]*1e4);
   for(let t=0;t<q.length;t+=9)for(let e=0;e<3;e++){const i=t+e*3,j=t+((e+1)%3)*3,m=t+((e+2)%3)*3,ki=K(i),kj=K(j),k=ki<kj?ki+'|'+kj:kj+'|'+ki;const r=E.get(k);if(r)r.n++;else E.set(k,{n:1,i,j,m});}   // 外周の辺（三角形1つだけが使う辺）
   E.forEach(({n,i,j,m})=>{if(n!==1)return;const P=V(q[i],q[i+1],q[i+2]),Q=V(q[j],q[j+1],q[j+2]),e=Q.clone().sub(P),len=e.length();if(len<0.005)return;e.multiplyScalar(1/len);
    const w=new THREE.Vector3().crossVectors(e,b.n).normalize();if(w.dot(V(q[m],q[m+1],q[m+2]).sub(P))>0)w.negate();   // w：面の外へ向かう向き（面の中）
    B.forEach(o=>{if(o===b||Math.abs(o.n.dot(b.n))>0.2||o.n.dot(w)>-0.7)return;if(Math.abs(o.n.dot(P)-o.d)>0.003||Math.abs(o.n.dot(Q)-o.d)>0.003)return;   // 縁が o の面の上にあり、延ばす先が o の裏
     const N=Math.max(1,Math.ceil(len/0.1)),ok=[];for(let k=0;k<N;k++){const M=P.clone().addScaledVector(e,len*(k+0.5)/N).addScaledVector(b.n,0.01);M.addScaledVector(o.n,o.d-o.n.dot(M));ok.push(inO(o,M));}   // o が部屋側でこの縁に接している所（縁から1cm部屋側の点が o の上）
     const L=o.T+0.002,bk=b.n.clone().multiplyScalar(-b.T);let k=0;while(k<N){if(!ok[k]){k++;continue;}let k1=k;while(k1+1<N&&ok[k1+1])k1++;
      const p0=P.clone().addScaledVector(e,len*k/N),p1=P.clone().addScaledVector(e,len*(k1+1)/N),p2=p1.clone().addScaledVector(w,L),p3=p0.clone().addScaledVector(w,L),f=[p0,p1,p2,p3],g=f.map(x=>x.clone().add(bk));CFB.push(new THREE.Box3().setFromPoints([...f,...g]));
      [[f[0],f[1],f[2],f[3]],[g[0],g[3],g[2],g[1]],[f[0],g[0],g[1],f[1]],[f[1],g[1],g[2],f[2]],[f[2],g[2],g[3],f[3]],[f[3],g[3],g[0],f[0]]].forEach(([A,Bq,C,D])=>CF.push(...A.toArray(),...Bq.toArray(),...C.toArray(),...A.toArray(),...C.toArray(),...D.toArray()));k=k1+1;}});});});
  LM.cornerFill=CF.length/108;}   // 内側の角をふさぐ板の数
 return ()=>{const out=[];if(CF.length){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(CF,3));out.push(g);}B.forEach(b=>{const q=b.tri,dx=-b.n.x*b.T,dy=-b.n.y*b.T,dz=-b.n.z*b.T,pos=[],K=(i)=>Math.round(q[i]*1e4)+','+Math.round(q[i+1]*1e4)+','+Math.round(q[i+2]*1e4),EC=new Map();
   for(let t=0;t<q.length;t+=9)for(let e=0;e<3;e++){const i=t+e*3,j=t+((e+1)%3)*3,ki=K(i),kj=K(j),k=ki<kj?ki+'|'+kj:kj+'|'+ki,r=EC.get(k);if(r)r.n++;else EC.set(k,{n:1,i,j});}   // 外周の辺
   const D=i=>[q[i]+dx,q[i+1]+dy,q[i+2]+dz],F=i=>[q[i],q[i+1],q[i+2]];for(let t=0;t<q.length;t+=9)pos.push(...D(t),...D(t+6),...D(t+3));EC.forEach(({n,i,j})=>{if(n!==1)return;const p0=F(i),p1=F(j),p2=D(j),p3=D(i);pos.push(...p0,...p1,...p2,...p0,...p2,...p3);});   // 板＝裏の面（表を裏へ押し出した面）と外周の側面（表の面は部品そのものが影の形に入っている。三角形ごとの柱にすると、細かく分けた面で三角形が何倍にも増えた）
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
 ds.sort((x,y)=>x-y);let f0=1e9,f1=-1e9;{const A=new THREE.Vector3(),B=new THREE.Vector3(),C=new THREE.Vector3(),e1=new THREE.Vector3(),e2=new THREE.Vector3();ms.forEach(m=>{const a=m.geometry.attributes.position;for(let i=0;i+2<a.count;i+=3){A.fromBufferAttribute(a,i);B.fromBufferAttribute(a,i+1);C.fromBufferAttribute(a,i+2);e1.subVectors(B,A);e2.subVectors(C,A);const cr=e1.clone().cross(e2),ar=cr.length()/2;if(ar<0.02||Math.abs(cr.normalize().dot(n))<0.95)continue;const dd=A.clone().sub(c).dot(n);if(dd<f0)f0=dd;if(dd>f1)f1=dd;}});}
 const ofL=f1>f0?(f0+f1)/2:ds[ds.length>>1],off=ofL>0.005?0:ofL,lh=f1>f0?Math.max(0.008,(f1-f0)/2):0.018;t0-=0.01;t1+=0.01;b0=Math.min(b0,y0)-0.01;b1+=0.01;   // lh：扉の板の厚みの半分（扉の大きな面から測る。取っ手などは除く）。面の位置は扉の厚みの中心（扉の大きな面の間の真ん中。頂点の中央値だと、引手の頂点で扉の片面に寄り、扉のすぐ前の床がドアの向こう側と判定されて明るい線になった）。アウトセットの引き戸（扉が壁の外）は壁の面で閉じる（扉と壁の間の8mmのすき間を開口の側にすると、トイレの入口の隅に玄関の光の線が出た）。広さは開口と扉の形の外側＋1cm（下は床の下まで）
 const P=(u,y,o)=>c.clone().addScaledVector(n,o).addScaledVector(t,u).setY(y),mid=-0.0575,quad=(A,B,C,D)=>[A,B,C,A,C,D];   // mid：壁の厚み（115mm）の中央
 const fr=off>0.005?off+0.025:off<-0.12?off-0.025:off,q=[...quad(P(t0,b0,off),P(t1,b0,off),P(t1,b1,off),P(t0,b1,off)),...quad(P(t0,b0,fr),P(t0,b0,mid),P(t0,b1,mid),P(t0,b1,fr)),...quad(P(t1,b0,fr),P(t1,b0,mid),P(t1,b1,mid),P(t1,b1,fr)),...quad(P(t0,b1,fr),P(t1,b1,fr),P(t1,b1,mid),P(t0,b1,mid))],g=new THREE.BufferGeometry();   // 扉の面と、そのまわり（左右・上）から壁の中までの囲い（扉が壁の外に出ているときは扉の表側まで）（壁の外をすべる引き戸は、扉と壁のすき間・扉の縁を光が回り込むため）
g.setAttribute('position',new THREE.Float32BufferAttribute(q.flatMap(p=>p.toArray()),3));
 const m=new THREE.Mesh(g,distMat);m.frustumCulled=false;m.userData.door=k;m.userData.open=false;OCC.add(m);OCCDOOR.push(m);SEALS.push({k,c,n,t,off,lh,t0,t1,b0,b1});});}
// 照り返し用の遮る形：大きな面（チャートの部品＝壁・床・天井・建具・家具の平らな面）とドアだけ（曲面の多い細かい部品は除いて軽くする。照り返しはやわらかい光なので影の細かさは要らない）
const OCCB=new THREE.Scene();{scene.updateMatrixWorld(true);const st=SLABX();st.push(DOORSEAL());scene.traverse(o=>{if(!o.isMesh||!occOf(o)||o.userData.dyn)return;const a=o.geometry.attributes.lm;if(a&&a.getZ(0)>0.5)return;const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry;const w=new THREE.BufferGeometry();w.setAttribute('position',new THREE.BufferAttribute(g.attributes.position.array.slice(),3));w.applyMatrix4(o.matrixWorld);st.push(w);});
 let n=0;st.forEach(g=>n+=g.attributes.position.array.length);const arr=new Float32Array(n);let off=0;st.forEach(g=>{arr.set(g.attributes.position.array,off);off+=g.attributes.position.array.length;g.dispose();});const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(arr,3));
 const m=new THREE.Mesh(g,distMat);m.frustumCulled=false;OCCB.add(m);OCCDOOR.forEach(d=>{const c=new THREE.Mesh(d.geometry,distMat);c.frustumCulled=false;c.userData=d.userData;OCCB.add(c);d.userData.twin=c;});LM.occbTris=arr.length/9;}
const syncDoors=()=>OCCDOOR.forEach(m=>{m.visible=!!DS[m.userData.door]===m.userData.open;m.userData.twin.visible=m.visible;});
const CUBE=new THREE.WebGLCubeRenderTarget(256,{type:THREE.FloatType,format:THREE.RedFormat,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,generateMipmaps:false});const CCAM=new THREE.CubeCamera(0.04,14,CUBE);OCC.add(CCAM);
const SUNRT=new THREE.WebGLRenderTarget(4096,4096,{type:THREE.FloatType,format:THREE.RedFormat,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,generateMipmaps:false,depthBuffer:true,depthTexture:new THREE.DepthTexture(4096,4096,THREE.UnsignedShortType)});
const SCAM=new THREE.OrthographicCamera(-7,7,7,-7,0.1,60);{const c=new THREE.Vector3(1.3,3,3.6);SCAM.position.copy(c).addScaledVector(SUNDIR,25);SCAM.lookAt(c);SCAM.updateMatrixWorld(true);SCAM.updateProjectionMatrix();}
// シェードのある窓：太陽から見たその窓の深さの画像。日差しがこの窓を通るときだけ、シェードの開度で弱める（ほかの窓の日差しは変えない。要件 C3）
const SUNWIN=new THREE.WebGLRenderTarget(2048,2048,{type:THREE.FloatType,format:THREE.RedFormat,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,generateMipmaps:false,depthBuffer:true,depthTexture:new THREE.DepthTexture(2048,2048,THREE.UnsignedShortType)}),WINQ=new THREE.Scene();
(typeof BAKE_WINDOWS!=='undefined'?BAKE_WINDOWS:[]).filter(w=>w.shadeable).forEach(w=>{const c=new THREE.Vector3(...w.c),u=new THREE.Vector3(...w.u),up=new THREE.Vector3(0,1,0),P=(a,b)=>c.clone().addScaledVector(u,a*w.w/2).addScaledVector(up,b*w.h/2),q=[P(-1,-1),P(1,-1),P(1,1),P(-1,-1),P(1,1),P(-1,1)],g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(q.flatMap(v=>v.toArray()),3));const m=new THREE.Mesh(g,distMat);m.frustumCulled=false;WINQ.add(m);});
const SUNVP=new THREE.Matrix4().multiplyMatrices(SCAM.projectionMatrix,SCAM.matrixWorldInverse);

// ===== 光を描き込む：画像の全画素について、その点の位置・向きから光の明るさと、影の画像で見えるかどうかを計算して足す =====
const ED=new THREE.WebGLRenderTarget(LMW,LMH,{type:THREE.HalfFloatType,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:false,generateMipmaps:false});   // 照度（lux × SC）。SC：昼1/1000・夜1（半精度に収める）
// 閉じたドアの開口を通る光は、影の画像によらず計算で止める（SEALU。光の向きの線が閉じたドアの面（SEALS の開口と扉の範囲）を通れば、その光は届かない）。
// 枠・扉の縁・扉のすぐ上の天井・扉の前の床など、ドアの面が影の判定の余裕の中に入るほど近い所では、影の画像だけだと向こうの光が漏れて、明るい線や明るい所になるため。範囲は扉・開口より3cm広く（枠・開口のすぐ外の壁も）
const NSEAL=Math.max(1,SEALS.length),SEALU={sA:{value:[]},sB:{value:[]},sC:{value:[]},sD:{value:[]}};for(let i=0;i<NSEAL;i++){const q=SEALS[i],V=(a,b,c,d)=>new THREE.Vector4(a,b,c,d);SEALU.sA.value.push(q?V(q.c.x,q.c.y,q.c.z,q.off):V(0,0,0,0));SEALU.sB.value.push(q?V(q.n.x,q.n.y,q.n.z,q.t0-0.03):V(0,0,1,0));SEALU.sC.value.push(q?V(q.t.x,q.t.y,q.t.z,q.t1+0.03):V(1,0,0,0));SEALU.sD.value.push(q?V(q.b0-0.03,q.b1+0.03,0,0):V(0,0,0,0));}
const sealUpd=()=>SEALS.forEach((q,i)=>{SEALU.sD.value[i].z=DS[q.k]?0:1;});
const bakeMat=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,depthTest:false,depthWrite:false,transparent:true,blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneFactor,blendEquation:THREE.AddEquation,
 uniforms:{sA:SEALU.sA,sB:SEALU.sB,sC:SEALU.sC,sD:SEALU.sD,tP:{value:GBP.texture},tN:{value:GB.textures[1]},tM:{value:null},useM:{value:0},sh:{value:CUBE.texture},shS:{value:SUNRT.texture},shW:{value:SUNWIN.texture},shadeT:{value:1},kind:{value:0},lp:{value:new THREE.Vector3()},ld:{value:new THREE.Vector3()},col:{value:new THREE.Vector3()},cosO:{value:0},cosI:{value:1},r2:{value:0},isPt:{value:0},soft:{value:1},lamb:{value:0},skyV:{value:0},cres:{value:256},
  sunVP:{value:new THREE.Matrix4()},sd:{value:SUNDIR.clone()},cau:{value:0},zCau:{value:ZU.zCau.value},zCauK:{value:ZU.zCauK.value}},
 vertexShader:`void main(){gl_Position=vec4(position.xy,0.0,1.0);}`,
 fragmentShader:`uniform sampler2D tP,tN,tM,shS,shW,zCau;uniform float useM,shadeT,skyV;uniform samplerCube sh;uniform int kind;uniform vec3 lp,ld,col,sd;uniform float cosO,cosI,r2,isPt,soft,cau,lamb,cres;uniform mat4 sunVP;uniform vec4 zCauK;out vec4 o;
#if defined(PTS)&&!defined(CMP)
flat in vec4 vP;flat in vec3 vN;
#endif
#ifdef CMP
uniform sampler2D cP,cN;
#endif
bool cHit1(vec3 X,float ci,vec3 q){float ax=floor(ci/151.0),cw=(ci-ax*151.0)/1000.0;vec3 n=ax<0.5?vec3(1.0,0.0,0.0):ax<1.5?vec3(-1.0,0.0,0.0):ax<2.5?vec3(0.0,1.0,0.0):ax<3.5?vec3(0.0,-1.0,0.0):ax<4.5?vec3(0.0,0.0,1.0):vec3(0.0,0.0,-1.0);vec3 D=q-X;float dn=dot(D,n);if(dn>=-cw)return false;return cw*length(D-n*dn)<=-dn*0.05;}
bool contactHit(vec3 X,float cc,vec3 q){if(cc<7999999.0)return false;float c=cc-8000000.0,c1=floor(c/1000.0),c2=c-c1*1000.0;return cHit1(X,c1,q)||(c2<905.5&&cHit1(X,c2,q));}
uniform vec4 sA[${NSEAL}],sB[${NSEAL}],sC[${NSEAL}],sD[${NSEAL}];
bool sealHit(vec3 p,vec3 q){for(int i=0;i<${NSEAL};i++){if(sD[i].z<0.5)continue;vec3 sn=sB[i].xyz;float s1=dot(p-sA[i].xyz,sn)-sA[i].w,s2=dot(q-sA[i].xyz,sn)-sA[i].w;if(s1*s2>=0.0)continue;vec3 X=p+(q-p)*(s1/(s1-s2));float u=dot(X-sA[i].xyz,sC[i].xyz);if(u>sB[i].w&&u<sC[i].w&&X.y>sD[i].x&&X.y<sD[i].y)return true;}return false;}
float cauF(vec3 d){float p=texture(zCau,vec2(atan(d.z,d.x)*0.1591549+0.5,asin(clamp(d.y,-1.0,1.0))*0.3183099+0.5)).r;float cd=-d.y,op=smoothstep(zCauK.x-0.015,zCauK.x+0.015,cd),gl=zCauK.z*(0.3+1.6*p)*(1.0-smoothstep(zCauK.y-0.02,zCauK.y+0.01,d.y)),rim=zCauK.w*exp(-pow((cd-zCauK.x+0.02)/0.03,2.0))*(0.5+p);return mix(gl,1.0,op)+rim;}
void main(){
 #ifdef CMP
 vec4 Pc=texelFetch(cP,ivec2(gl_FragCoord.xy),0);vec3 n0=texelFetch(cN,ivec2(gl_FragCoord.xy),0).xyz;if(!(dot(n0,n0)>1e-8)||any(isnan(Pc.xyz)))discard;vec3 n=normalize(n0),X0=Pc.xyz,p=X0+n*0.012;float cc=Pc.w;
 #elif defined(PTS)
 vec3 n0=vN;if(!(dot(n0,n0)>1e-8)||any(isnan(vP.xyz)))discard;vec3 n=normalize(n0),X0=vP.xyz,p=X0+n*0.012;float cc=vP.w;
 #else
 ivec2 c=ivec2(gl_FragCoord.xy);if(useM>0.5&&texelFetch(tM,c,0).r<0.5)discard;vec4 P=texelFetch(tP,c,0);vec3 n0=texelFetch(tN,c,0).xyz;if(P.w==0.0||!(dot(n0,n0)>1e-8)||any(isnan(P.xyz)))discard;vec3 n=normalize(n0),X0=P.xyz,p=X0+n*0.012;float cc=P.w;
 #endif

 #ifdef SUN
 float nl=dot(n,sd);if(nl<=0.0||sealHit(p,p+sd*50.0)||contactHit(X0,cc,X0+sd*50.0))discard;vec4 q=sunVP*vec4(p,1.0);vec2 uv=q.xy/q.w*0.5+0.5;float dz=dot(p,sd)+100.0,v=0.0;
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){float s=texture(shS,uv+vec2(x,y)*soft/4096.0).r;v+=(s==0.0||s<dz+0.006)?1.0:0.0;}float wv=texture(shW,uv).r;o=vec4(col*nl*v/9.0*((wv>0.0&&wv>dz+0.01)?shadeT:1.0),1.0);
 #else
   // 太陽：光の向きの深さが自分より手前（太陽に近い）物があれば影
 float tex=2.0/cres;vec3 L0=lp-p;p+=n*(length(L0)*tex);   // 影の画像の1画素の大きさの分だけ面から浮かせて判定する（深さの余裕を小さくできる＝薄い面のすぐ裏へ光が回らない）
 vec3 L=lp-p;float d2=dot(L,L),d=sqrt(d2);L/=d;float nl=dot(n,L);if(nl<=0.0||sealHit(p,lp)||contactHit(X0,cc,lp))discard;float cn=lamb>0.5?max(dot(-L,ld),0.0):isPt>0.5?1.0:smoothstep(cosO,cosI,dot(-L,ld));if(skyV>0.5)cn*=mix(1.6,0.4,smoothstep(-0.15,0.15,-L.y));
 #ifdef BOUNCE
 if(cn<=0.0&&dot(p-lp,ld)<=-0.018)discard;cn=max(cn,0.0);
 #else
 if(cn<=0.0)discard;
 #endif

 vec3 dir=-L,t1=normalize(cross(dir,abs(dir.y)<0.9?vec3(0.0,1.0,0.0):vec3(1.0,0.0,0.0))),t2=cross(dir,t1);float k=soft*2.0/cres,nlc=clamp(nl,0.2,1.0),b=0.003+d*tex*(0.25+0.5*sqrt(1.0-nlc*nlc)/nlc),v=0.0;
 #ifdef BOUNCE
 {float s=texture(sh,dir).r;v=(s==0.0||s>d-b)?1.0:0.0;}
 #else
 for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){float s=texture(sh,dir+(t1*float(x)+t2*float(y))*k).r;v+=(s==0.0||s>d-b)?1.0:0.0;}v/=9.0;
 #endif
if(v<=0.0)discard;   // 影：9点で平均（縁をやわらかく）
 #ifdef CAU
 float cf=cauF(-L);
 #else
 float cf=1.0;
 #endif
 #ifdef BOUNCE
 float hh=dot(p-lp,ld)+0.02,wn=0.0;if(hh>0.002&&r2>0.0){float R=sqrt(r2),rho=length(p-ld*(hh-0.02)-lp);wn=clamp(1.0-hh/0.12,0.0,1.0);wn=wn*wn*(1.0-smoothstep(0.6*R,R,rho))*(1.0-dot(n,ld))*0.5;}   // 光る面のすぐ手前（面から12cm以内で、面の広がりの中。照り返しの光る点は面から2cm浮かせてある）は、面を広い光る面として扱う（向きで半分〜全部）。中心の1点だけで計算すると、壁のすぐ横の直角な面（隅の枠・家具の側面）は光る面を真横に見て、ほとんど光らなかった（玄関の洗面入口の枠が暗い）
 o=vec4(col*(v*cf*max(nl*cn/(d2+r2),wn/r2)),1.0);
 #else
 o=vec4(col*(nl*cn*v*cf/(d2+r2)),1.0);
 #endif
 #endif
}`});   // 太陽・G1 の模様は別のシェーダーにする（使わない計算が入っていると、使わなくても遅くなる）
// 影の深さの余裕 b は、光が斜めに当たるほど大きくする（影のにじみ＝面のまだらを防ぐ。最大で影の画像の約1.2画素分）
const bakeCau=bakeMat.clone(),bakeSunM=bakeMat.clone();bakeCau.uniforms=bakeMat.uniforms;bakeSunM.uniforms=bakeMat.uniforms;bakeCau.defines={CAU:1};bakeSunM.defines={SUN:1};
const BQ=new THREE.Scene(),bq=new THREE.Mesh(new THREE.PlaneGeometry(2,2),bakeMat);bq.frustumCulled=false;BQ.add(bq);const CAM0=new THREE.Camera();
let SC=1;
const FACED=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]],faceMax=(f,l)=>{const a=FACED[f],ax=a.findIndex(v=>v!==0);let m=-2;for(let i=0;i<=8;i++)for(let j=0;j<=8;j++){const d=[0,0,0];d[ax]=a[ax];d[(ax+1)%3]=i/4-1;d[(ax+2)%3]=j/4-1;const t=(d[0]*l.x+d[1]*l.y+d[2]*l.z)/Math.hypot(d[0],d[1],d[2]);if(t>m)m=t;}return m;};
// 影の画像の6面のうち、光が使わない面（その面の向きが全部、照らす範囲の外：光る面の後ろ・スポットの広がりの外）は描かない（その面は読まれない。描き込みの式は、範囲の外の画素を影を調べる前に捨てる）
function cubeUp(cc,ct,sc,e){if(cc.coordinateSystem!==r.coordinateSystem){cc.coordinateSystem=r.coordinateSystem;cc.updateCoordinateSystem();}const thr=e.lamb?0:(e.type==='spot'?Math.cos(e.angle||1):-9),l=e.dir;for(let f=0;f<6;f++){if(l&&thr>-2&&faceMax(f,l)<thr-0.06)continue;r.setRenderTarget(ct,f);r.render(sc,cc.children[f]);}r.setRenderTarget(null);}
function bakeEmitter(e,target){const u=bakeMat.uniforms,cc=e.cube===2?CCAM2:CCAM,ct=e.cube===2?CUBE2:CUBE;distMat.uniforms.sun.value=0;distMat.uniforms.lp.value.copy(e.pos);cc.position.copy(e.pos);cc.updateMatrixWorld(true);r.setClearColor(0x000000,0);cubeUp(cc,ct,e.cube===2?OCCB:OCC,e);   // その光から見た影の画像（6面）
 u.kind.value=0;u.sh.value=ct.texture;u.cres.value=ct.width;u.lp.value.copy(e.pos);u.ld.value.copy(e.dir||new THREE.Vector3(0,-1,0));const k=e.colv?e.colv:e.col.clone().multiplyScalar(e.intensity*SC);u.col.value.set(k.x!==undefined?k.x:k.r,k.y!==undefined?k.y:k.g,k.z!==undefined?k.z:k.b);   // colv：照り返しの光（すでに SC をかけた値）
 u.isPt.value=e.type==='point'?1:0;u.lamb.value=e.lamb?1:0;u.skyV.value=e.sky?1:0;u.cosO.value=Math.cos(e.angle||1);u.cosI.value=Math.cos((e.angle||1)*(1-(e.penumbra||0)));u.r2.value=e.r2||0;u.soft.value=e.soft||1;u.cau.value=e.cau?1:0;u.useM.value=e.cube===2?1:0;
 bq.material=e.cau?bakeCau:bakeMat;r.setRenderTarget(e.cube===2?EC:(target||ED));r.autoClear=false;r.render(e.cube===2?CMS:BQ,CAM0);r.autoClear=true;}   // 照り返し（cube 2）は詰めた画像 EC に足す（bounce の最後に元の位置へ写す）   // 足し合わせるので、描く前に消さない
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
const aggMat=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,depthTest:false,depthWrite:false,uniforms:{tE:{value:null},tE2:{value:null},e2:{value:0},tP:{value:GB.textures[0]},tN:{value:GB.textures[1]},tA:{value:GB.textures[2]},tC:{value:cellTex},n:{value:CELLS.length}},
 vertexShader:`void main(){gl_Position=vec4(position.xy,0.0,1.0);}`,
 fragmentShader:`uniform sampler2D tE,tE2,tP,tN,tA,tC,tS;uniform int n,e2,closed;layout(location=0) out vec4 oF;layout(location=1) out vec4 oP;layout(location=2) out vec4 oN;
void main(){ivec2 c=ivec2(gl_FragCoord.xy);int i=c.y*${CW}+c.x;oF=vec4(0.0);oP=vec4(0.0);oN=vec4(0.0);if(i>=n)return;vec4 r=texelFetch(tC,c,0);ivec2 o=ivec2(r.xy);int w=int(r.z),h=int(r.w);vec3 F=vec3(0.0),P=vec3(0.0),P2=vec3(0.0),N=vec3(0.0);float k=0.0,wf=0.0;
 for(int y=0;y<${CELL};y++){if(y>=h)break;for(int x=0;x<${CELL};x++){if(x>=w)break;ivec2 q=o+ivec2(x,y);vec4 p=texelFetch(tP,q,0);vec4 ts=texelFetch(tS,q,0);if(p.w==0.0||ts.y<0.0||(int(ts.z)&closed)!=0)continue;vec3 f=(texelFetch(tE,q,0).rgb+(e2==1?texelFetch(tE2,q,0).rgb:vec3(0.0)))*texelFetch(tA,q,0).rgb;float fl=dot(f,vec3(0.2126,0.7152,0.0722));F+=f;P+=p.xyz;P2+=p.xyz*fl;wf+=fl;N+=texelFetch(tN,q,0).xyz;k+=1.0;}}
 if(k>0.0){oF=vec4(F,k);oP=vec4(wf>0.0?P2/wf:P/k,k);oN=vec4(normalize(N),0.0);}}`});   // セルごとに：反射する光の量（照度×反射率の合計）・光の量で重みを付けた中心（光が当たっている所から光らせる。ドアの下をまたぐ床などで、暗い側から光を出さないように）・向き
const aggQ=new THREE.Mesh(new THREE.PlaneGeometry(2,2),aggMat);aggQ.frustumCulled=false;const AGGS=new THREE.Scene();AGGS.add(aggQ);
const CUBE2=new THREE.WebGLCubeRenderTarget(LM.cube2||128,{type:THREE.FloatType,format:THREE.RedFormat,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,generateMipmaps:false});const CCAM2=new THREE.CubeCamera(0.03,14,CUBE2);OCCB.add(CCAM2);
// 照り返しは変化がなだらかなので、チャートの中は8×8画素（32cm）に1画素だけ計算し（MK）、残りは同じチャートのまわりの計算した画素から補う（チャートをまたがない）。頂点ごとの画素は全部、格子で補えない画素はその画素を計算する
LM.tm.pre=performance.now()-LM.tm.t0;LM.bstep=8;let PGP,PGN;const MKD=new Uint8Array(LMW*LMH*4),PTS=[];{const P=new Float32Array(LMW*LMH*4);r.readRenderTargetPixels(GB,0,0,LMW,LMH,P,undefined,0);
 const NN=new Float32Array(LMW*LMH*4);r.readRenderTargetPixels(GB,0,0,LMW,LMH,NN,undefined,1);
 LM.tm.side=performance.now()-LM.tm.t0;
 // 大きな面の形を面の座標の格子（2cm、三角形を半格子ぶん広げて塗る＝細い面も落とさない）にした表。「面の中か」を1回の表引きで調べる（下の BUR・CT で使う）
 const PMR=0.02,pmOf=S=>{if(S.pm)return S.pm;const n=S.n,u=new THREE.Vector3().crossVectors(n,Math.abs(n.y)<0.9?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0)).normalize(),v=new THREE.Vector3().crossVectors(n,u),t=S.tri,T2=[];let u0=1e9,v0=1e9,u1=-1e9,v1=-1e9;
  for(let k=0;k<t.length;k+=3){const a=t[k]*u.x+t[k+1]*u.y+t[k+2]*u.z,b=t[k]*v.x+t[k+1]*v.y+t[k+2]*v.z;T2.push(a,b);if(a<u0)u0=a;if(a>u1)u1=a;if(b<v0)v0=b;if(b>v1)v1=b;}
  u0-=PMR;v0-=PMR;const w=Math.ceil((u1-u0)/PMR)+2,h=Math.ceil((v1-v0)/PMR)+2,m=new Uint8Array(w*h),tol=PMR*0.71;
  for(let k=0;k<T2.length;k+=6){const ax=T2[k],ay=T2[k+1],bx=T2[k+2],by=T2[k+3],cx=T2[k+4],cy=T2[k+5],ar=(bx-ax)*(cy-ay)-(by-ay)*(cx-ax);if(Math.abs(ar)<0.005*Math.max(Math.hypot(bx-ax,by-ay),Math.hypot(cx-bx,cy-by),Math.hypot(ax-cx,ay-cy)))continue;   // 幅5mm未満の細い三角形は塗らない（ドアの開口の下に残る高さ2mmの壁の帯が、格子の幅でふくらんで扉の下の床を「壁の中」にし、隣の部屋の明るさが写った）
  const sg=ar>0?1:-1,E=[[ax,ay,bx,by],[bx,by,cx,cy],[cx,cy,ax,ay]].map(([px,py,qx,qy])=>{const ex=qx-px,ey=qy-py,l=Math.hypot(ex,ey)||1;return [px,py,ex/l,ey/l];});
   const i0=Math.max(0,Math.floor((Math.min(ax,bx,cx)-tol-u0)/PMR)),i1=Math.min(w-1,Math.ceil((Math.max(ax,bx,cx)+tol-u0)/PMR)),j0=Math.max(0,Math.floor((Math.min(ay,by,cy)-tol-v0)/PMR)),j1=Math.min(h-1,Math.ceil((Math.max(ay,by,cy)+tol-v0)/PMR));
   for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){if(m[j*w+i])continue;const px=u0+(i+0.5)*PMR,py=v0+(j+0.5)*PMR;let ins=true;for(const [qx,qy,ex,ey] of E){if(sg*(ex*(py-qy)-ey*(px-qx))<-tol){ins=false;break;}}if(ins)m[j*w+i]=1;}}
  return S.pm={u,v,u0,v0,w,h,m};},
  inPM=(S,x,y,z)=>{const q=pmOf(S),a=x*q.u.x+y*q.u.y+z*q.u.z,b=x*q.v.x+y*q.v.y+z*q.v.z,i=Math.floor((a-q.u0)/PMR),j=Math.floor((b-q.v0)/PMR);return i>=0&&j>=0&&i<q.w&&j<q.h&&q.m[j*q.w+i]===1;};
 // 中くらいの面（LM.mid：0.01〜0.3m²で家の座標の軸にそろった面。ドアの開口のすぐ横の幅2cmの壁など）も、下の「隠れた画素」の判定にだけ板にする（影の計算には使わない）。大きな面だけだと、開口のすぐ横の細い壁の中に入った隣の面の画素が「壁の中」にならず、隣の部屋の光を受けたまま見えている所へにじんだ（トイレの入口の縦の線）
 const MIDB=[];{const v=new THREE.Vector3();LM.mid.forEach(({c,tri,nrm})=>{const n=new THREE.Vector3(c.nx,c.ny,c.nz).normalize();if(nrm&&n.dot(new THREE.Vector3(...nrm))<0)n.negate();const b={c,n,box:new THREE.Box3(),tri};for(let k=0;k<tri.length;k+=3)b.box.expandByPoint(v.set(tri[k],tri[k+1],tri[k+2]));b.d=n.dot(b.box.getCenter(v));MIDB.push(b);});
  const ALL=LM.slabB.concat(MIDB);MIDB.forEach(b=>{let T=SLABT+0.005;ALL.forEach(o=>{if(o===b||b.n.dot(o.n)>-0.99)return;const s=b.d+o.d;if(!(s>0.0005&&s<T))return;const e=b.box.clone().expandByScalar(s+0.01);if(!e.intersectsBox(o.box))return;T=s;});b.T=T<0.009?T*0.5:Math.min(SLABT,T-0.005);b.bx=b.box.clone().expandByScalar(b.T+0.02);});LM.nMid=MIDB.length;}
 const PADB=LM.pad||2;
 // 隠れた画素（BUR）：大きな面（家の座標の軸にそろった壁・床・天井など）のうち、1.2cm以内の手前（裏ではなく手前。薄い板の裏の面は除く）に、ほかの部品の面（向かい合う面か同じ向きの面）がかぶさっている所（カウンター・パネル・家具の裏の壁、ほかの床が2mm上に重なった床など。光は届かず、画面にも出ない）。
 // この画素を補う元に使うと、すぐ横の見えている所（浴室のカウンターの下の壁など）がその暗い値で塗られて真っ黒になったので、壁の中の画素（REG の負）と同じに扱う。かぶさる側の画素の大きさの範囲にある画素に印を付ける。動く部品（ドア）はかぶさる側にしない
 const BUR=new Uint8Array(LMW*LMH),BURC=new Set();{const SA=LM.slabB.filter(S=>Math.max(Math.abs(S.n.x),Math.abs(S.n.y),Math.abs(S.n.z))>0.999),CS=0.5,BB=new THREE.Box3();SA.forEach(S=>BB.union(S.box));BB.expandByScalar(0.1);
  const GX=Math.ceil((BB.max.x-BB.min.x)/CS),GY=Math.ceil((BB.max.y-BB.min.y)/CS),GZ=Math.ceil((BB.max.z-BB.min.z)/CS),G=new Array(GX*GY*GZ),ci=(v,m)=>Math.floor((v-m)/CS);
  SA.forEach(S=>{const b=S.box.clone().expandByScalar(0.02);for(let a=Math.max(0,ci(b.min.x,BB.min.x));a<=Math.min(GX-1,ci(b.max.x,BB.min.x));a++)for(let c=Math.max(0,ci(b.min.y,BB.min.y));c<=Math.min(GY-1,ci(b.max.y,BB.min.y));c++)for(let e=Math.max(0,ci(b.min.z,BB.min.z));e<=Math.min(GZ-1,ci(b.max.z,BB.min.z));e++){const k=(a*GY+c)*GZ+e;(G[k]||(G[k]=[])).push(S);}});
  for(let i=0;i<LMW*LMH;i++){const gi=P[i*4+3];if(!(gi>0))continue;const x=P[i*4],y=P[i*4+1],z=P[i*4+2],a=ci(x,BB.min.x),b=ci(y,BB.min.y),e=ci(z,BB.min.z);if(a<0||b<0||e<0||a>=GX||b>=GY||e>=GZ)continue;const l=G[(a*GY+b)*GZ+e];if(!l)continue;
   const ch=LM.charts[gi-1];if(!ch||(ch.o&&ch.o.userData&&ch.o.userData.dyn))continue;const nx=NN[i*4],ny=NN[i*4+1],nz=NN[i*4+2];
   for(const S of l){const c=S.c,dn=nx*S.n.x+ny*S.n.y+nz*S.n.z;if(c===ch||(dn>-0.9&&dn<0.9))continue;const sd=S.n.x*x+S.n.y*y+S.n.z*z-S.d;if(sd<0.0003||sd>0.012)continue;const px=x-S.n.x*sd,py=y-S.n.y*sd,pz=z-S.n.z*sd;if(!inPM(S,px,py,pz))continue;
    const hu=ch.su*0.5,hv=ch.sv*0.5,uX=ch.u[0]*x+ch.u[1]*y+ch.u[2]*z,vX=ch.v[0]*x+ch.v[1]*y+ch.v[2]*z,mg=Math.min(c.su,c.sv)*0.25,a0=Math.max(-hu,ch.u0-uX+mg),a1=Math.min(hu,ch.u1-uX-mg),b0=Math.max(-hv,ch.v0-vX+mg),b1=Math.min(hv,ch.v1-vX-mg);if(a1<=a0||b1<=b0)continue;   // かぶさる側の画素の範囲（その部品の面の外へは出さず、面の縁から隠される側の画素の1/4は内側。幅2mmの継ぎ目の部品が4cm幅の画素を隠したことになり、浴槽の横の壁が暗くなった）
    let u0=1e9,u1=-1e9,v0=1e9,v1=-1e9;for(const A of [a0,a1])for(const B of [b0,b1]){const qx=px+ch.u[0]*A+ch.v[0]*B,qy=py+ch.u[1]*A+ch.v[1]*B,qz=pz+ch.u[2]*A+ch.v[2]*B,uu=c.u[0]*qx+c.u[1]*qy+c.u[2]*qz,vv=c.v[0]*qx+c.v[1]*qy+c.v[2]*qz;if(uu<u0)u0=uu;if(uu>u1)u1=uu;if(vv<v0)v0=vv;if(vv>v1)v1=vv;}const nu=c.w-2*PADB,nv=c.h-2*PADB;
    for(let kv=Math.max(0,Math.floor((v0-c.v0)/c.sv)+1);kv<=Math.min(nv-1,Math.ceil((v1-c.v0)/c.sv)-1);kv++)for(let ku=Math.max(0,Math.floor((u0-c.u0)/c.su)+1);ku<=Math.min(nu-1,Math.ceil((u1-c.u0)/c.su)-1);ku++){const m=(c.y+PADB+kv)*LMW+c.x+PADB+ku;if(P[m*4+3]===c.gid+1){BUR[m]=1;BURC.add(c.gid+1);}}}}
  LM.nBur=BUR.reduce((a,v)=>a+v,0);}
 // 隠れた画素の印（REG）：見えている画素はチャートの番号、隠れた画素はその負。隠れた画素＝ほかの部品の面がかぶさっている所（BUR）と、面から1cm手前の点がほかの大きな面の板（SLABX・MIDB＝壁・床・天井の中）に入る所（壁の下に入った床・壁の上の天井・壁の裏など）。
 // 隠れた画素は、補う元にも照り返しの光る面の集計にも使わず（壁の中で影の判定の余裕から光を拾い、照り返しを出すと壁の向こうへにじむ）、表示用の値は同じチャートの隣の見えている画素から写す（sumMat）。部屋を区切る処理ではない（チャートは stg/pre.js の archSplit が建物の面の接する線で分けてある）
 const REG=new Float32Array(LMW*LMH);for(let i=0;i<LMW*LMH;i++){const w=P[i*4+3];REG[i]=BUR[i]?-Math.abs(w):Math.abs(w);}
 {const SB=LM.slabB,inSlab=(S,x,y,z)=>{const s=S.d-(S.n.x*x+S.n.y*y+S.n.z*z);return s>0&&s<S.T&&inPM(S,x,y,z);};   // 面の裏の板の中か
  const SBC=new Map(SB.map(S=>[S.c,S])),v3=new THREE.Vector3();LM.charts.forEach(c=>{const C=SBC.get(c);if(!C&&!(c.o&&c.o.userData.arch))return;const gid=c.gid+1,n=C?C.n:new THREE.Vector3(c.nx,c.ny,c.nz),bx=new THREE.Box3();   // 大きな面と、建物の面（壁・床・天井。小さく分かれた所も）のチャート
   for(let yy=0;yy<c.h;yy++)for(let xx=0;xx<c.w;xx++){const i=(c.y+yy)*LMW+c.x+xx;if(P[i*4+3]===gid)bx.expandByPoint(v3.set(P[i*4],P[i*4+1],P[i*4+2]));}if(bx.isEmpty())return;bx.expandByScalar(0.05);
   const cand=SB.filter(S=>S!==C&&Math.abs(S.n.dot(n))<0.3&&S.box.clone().expandByScalar(S.T+0.02).intersectsBox(bx)).concat(MIDB.filter(S=>Math.abs(S.n.dot(n))<0.3&&S.bx.intersectsBox(bx)));if(!cand.length)return;
   const ctr=bx.getCenter(new THREE.Vector3());for(let yy=0;yy<c.h;yy++)for(let xx=0;xx<c.w;xx++){const i=(c.y+yy)*LMW+c.x+xx;if(P[i*4+3]!==gid||REG[i]<0)continue;v3.set(ctr.x-P[i*4],ctr.y-P[i*4+1],ctr.z-P[i*4+2]);v3.addScaledVector(n,-v3.dot(n));const dl=v3.length(),sh=dl>0.015?0.015/dl:0;   // 面の端の画素は面の端の線（壁の面と同じ位置が多い）の上にあるので、調べる点を面の中ほどへ1.5cm寄せる
    const X=P[i*4]+NN[i*4]*0.01+v3.x*sh,Y=P[i*4+1]+NN[i*4+1]*0.01+v3.y*sh,Z=P[i*4+2]+NN[i*4+2]*0.01+v3.z*sh;if(cand.some(S=>inSlab(S,X,Y,Z)))REG[i]=-gid;}});
  LM.nHid=REG.reduce((a,v)=>a+(v<0?1:0),0);}
 // 閉じた扉に覆われた画素（DM）：ドアごとに、閉じた形の部品（扉・引手など）の箱（2mm広げる）の中にある画素（扉の下の床・扉に接する枠など。扉自身の画素は除く）に、そのドアの番号のビットを付ける。
 // そのドアが閉じている間は、隠れた画素と同じに扱う（補う元・照り返しの光る面の集計に使わず、表示用の値は同じチャートの隣から写す）。扉の下・裏は扉の向こうの光を影の判定の余裕の中で拾うため。扉の実際の形から求め、ドアごとの設定は使わない
 const DM=new Float32Array(LMW*LMH);{const BX=[];SEALS.forEach((q,j)=>{const D=DOORS[q.k];if(!D||!D.gC)return;D.gC.updateMatrixWorld(true);D.gC.traverse(o=>{if(o.isMesh)BX.push([new THREE.Box3().setFromObject(o).expandByScalar(0.002),j]);});});
  for(let i=0;i<LMW*LMH;i++){const w=P[i*4+3];if(!(w>0))continue;const ch=LM.charts[w-1];if(ch&&ch.o&&ch.o.userData&&ch.o.userData.dyn)continue;const x=P[i*4],y=P[i*4+1],z=P[i*4+2];let m=0;for(const [b,j] of BX)if(x>=b.min.x&&x<=b.max.x&&y>=b.min.y&&y<=b.max.y&&z>=b.min.z&&z<=b.max.z)m|=1<<j;DM[i]=m;}
  LM.nDM=DM.reduce((a,v)=>a+(v>0?1:0),0);}
 // 面の縁の画素（EF。大きな面だけ）：形の中の画素（G-buffer に描いた画素）のうち、上下のどちらかが同じ面の外なら横の縁（1）、左右のどちらかが外なら縦の縁（2）。余白の画素（写した画素）は、いちばん近い形の中の画素へのずれ（±4画素）を持つ。
 // 縁の画素の照り返しは、同じ縁の上で計算した画素だけから補う（面の中の値を混ぜない＝開いたドアの境目などで、隣の面の縁と同じ値になる）。値は 1＋縁の印＋4×(dx+4)＋36×(dy+4)、0は印なし
 const EF=new Float32Array(LMW*LMH);{const BG=new Set(LM.slabB.map(B=>B.c.gid)),PD=LM.pad||2;LM.charts.forEach(c=>{if(!BG.has(c.gid))return;const gid=c.gid+1,inR=(x,y)=>x>=c.x&&y>=c.y&&x<c.x+c.w&&y<c.y+c.h,ras=(x,y)=>{if(!inR(x,y))return false;const k=y*LMW+x;return P[k*4+3]===gid&&NN[k*4+3]>0.5;};
   for(let y=c.y;y<c.y+c.h;y++)for(let x=c.x;x<c.x+c.w;x++){const k=y*LMW+x;if(P[k*4+3]!==gid)continue;let dx=0,dy=0,ok=ras(x,y);for(let d=1;d<=4&&!ok;d++){for(const [a,b] of [[-d,0],[d,0],[0,-d],[0,d],[-d,-d],[d,-d],[-d,d],[d,d]])if(ras(x+a,y+b)){dx=a;dy=b;ok=true;break;}}if(!ok)continue;
    const X=x+dx,Y=y+dy,fl=(!ras(X,Y-1)||!ras(X,Y+1)?1:0)|(!ras(X-1,Y)||!ras(X+1,Y)?2:0);EF[k]=1+fl+4*(dx+4)+36*(dy+4);}});}
 LM.tm.reg=performance.now()-LM.tm.t0;
 const sideOK=(i,k)=>REG[k]>0&&Math.abs(REG[i])===REG[k];   // 補う元：同じチャートの見えている画素
 if(new URLSearchParams(location.search).get('lm')==='dbg')LM.dbg={REG,BUR,MKD,MIDB,DM,EF};   // 確認用（?lm=dbg のときだけ、補う範囲の印を残す）
 {const D=new Float32Array(LMW*LMH*4);for(let i=0;i<LMW*LMH;i++){D[i*4]=EF[i];D[i*4+1]=REG[i];D[i*4+2]=DM[i];}const t=new THREE.DataTexture(D,LMW,LMH,THREE.RGBAFormat,THREE.FloatType);t.minFilter=t.magFilter=THREE.NearestFilter;t.needsUpdate=true;t.onUpdate=()=>{t.image.data=null;};LM.sideTex=t;aggMat.uniforms.tS={value:t};aggMat.uniforms.closed={value:0};}
 {const isG=i=>{const w=P[i*4+3];if(!(w>0))return false;const ch=LM.charts[w-1];return !!(ch&&ch.o&&ch.o.material===bathGlM);},H=new Map(),key=(x,y,z)=>Math.round(x*100)+','+Math.round(y*100)+','+Math.round(z*100);
  const G=[];for(let i=0;i<LMW*LMH;i++)if(isG(i)){G.push(i);H.set(key(P[i*4],P[i*4+1],P[i*4+2])+'|'+Math.round(NN[i*4]*2)+','+Math.round(NN[i*4+1]*2)+','+Math.round(NN[i*4+2]*2),i);}
  const D=LM.sideTex.image.data;G.forEach(i=>{const nx=NN[i*4],ny=NN[i*4+1],nz=NN[i*4+2],ox=P[i*4]-nx*0.006,oy=P[i*4+1]-ny*0.006,oz=P[i*4+2]-nz*0.006,nk='|'+Math.round(-nx*2)+','+Math.round(-ny*2)+','+Math.round(-nz*2);
   let j,bd=1e9;for(let dx=-3;dx<=3;dx++)for(let dy=-3;dy<=3;dy++)for(let dz=-3;dz<=3;dz++){const k=H.get(key(ox+dx/100,oy+dy/100,oz+dz/100)+nk);if(k===undefined)continue;const dd=(P[k*4]-ox)**2+(P[k*4+1]-oy)**2+(P[k*4+2]-oz)**2;if(dd<bd){bd=dd;j=k;}}   // 裏の面で、いちばん近い画素（3cm以内）
   if(j!==undefined)D[i*4+3]=j+1;});
  LM.nGlass=G.length;}   // すりガラスの裏表の対応（裏の面は、表で受けた光の一部で光って見える）。裏の画素の番号＋1を LM.sideTex の4番目の値に入れる（別の画像を作らない。メモリ）
 const R=LM.bstep-1,COV=new Uint8Array(LMW*LMH);
 const set=(x,y)=>{const k=(y*LMW+x)*4;if(MKD[k]||REG[k/4]<0)return;MKD[k]=MKD[k+1]=MKD[k+2]=MKD[k+3]=255;PTS.push(x,y,0);const w=P[k+3];if(w<=0)return;
  for(let j=Math.max(0,y-R);j<=Math.min(LMH-1,y+R);j++)for(let i=Math.max(0,x-R);i<=Math.min(LMW-1,x+R);i++)if(!COV[j*LMW+i]&&P[(j*LMW+i)*4+3]===w&&sideOK(j*LMW+i,y*LMW+x))COV[j*LMW+i]=1;};   // COV：同じチャートで、計算する画素から R 以内（補える）
 for(let y=0;y<LMH;y++)for(let x=0;x<LMW;x++){const k=y*LMW+x;if(P[k*4+3]<0)set(x,y);}   // 頂点ごとの画素は全部計算する
 const S=LM.bstep,BIGG=new Set(LM.slabB.map(B=>B.c.gid)),PDB=LM.pad||2;LM.charts.forEach(c=>{if(BIGG.has(c.gid)){const nu=c.w-2*PDB,nv=c.h-2*PDB,na=Math.ceil((nu-1)/S)+1,nb=Math.ceil((nv-1)/S)+1;
   for(let b=0;b<nb;b++)for(let a=0;a<na;a++){const x=c.x+PDB+Math.round(a*(nu-1)/(na-1)),y=c.y+PDB+Math.round(b*(nv-1)/(nb-1));if(P[(y*LMW+x)*4+3]===c.gid+1)set(x,y);}for(let y=c.y;y<c.y+c.h;y++)for(let x=c.x;x<c.x+c.w;x++){const e=EF[y*LMW+x];if(!(e>0)||P[(y*LMW+x)*4+3]!==c.gid+1)continue;const v=e-1,fl=v&3;if(v>>2!==40)continue;if(fl===3||((fl&1)&&(x-c.x-PDB)%S===0)||((fl&2)&&(y-c.y-PDB)%S===0))set(x,y);}return;}   // 大きな面（壁・床・天井など）は、両端を含めて S 画素以内おきの格子と、面の縁（EF）の上の S 画素おき・角（縁の画素は同じ縁の点から補うので、縁の上に必ず計算する点を置く。隣り合う面の端で照り返しがそろう）
  const nx=Math.ceil(c.w/S),ny=Math.ceil(c.h/S),x0=c.x+Math.floor((c.w-1-(nx-1)*S)/2),y0=c.y+Math.floor((c.h-1-(ny-1)*S)/2);
  for(let b=0;b<ny;b++)for(let a=0;a<nx;a++){const x=x0+a*S,y=y0+b*S;if(P[(y*LMW+x)*4+3]===c.gid+1)set(x,y);}});   // ほかのチャートは、チャートの中央にそろえた S 画素おきの格子
 for(let y=0;y<LMH;y++)for(let x=0;x<LMW;x++){const k=y*LMW+x;if(P[k*4+3]>0&&!COV[k])set(x,y);}   // 格子で補えない画素（細長い・不規則な形のチャート）は、その画素も計算する
 // 壁に接する所（CT）：大きな面（壁・床・天井）の手前15cm以内にあり（その面とほぼ直角な面か、その面に向き合う面）、その面に投影した点（と上下左右5cm）が面の中にある（開口から離れている）画素は、その面の向こうからの光を計算で止める。
 // 影の判定の余裕や影をやわらかくする幅が壁の厚さを越え、壁の向こうの光が壁ぎわの細い面（幅木の上・棚の壁ぎわ）に明るい線として入るため。面の向きが家の座標の軸にそろった面だけ。
 // 値は 8000000＋近い順に2つの面の（向きの番号（+x,−x,+y,−y,+z,−z）×151＋面までの距離mm）を1000倍・1倍して足したもの（2つ目が無いときは906）。部屋の隅は2枚の壁に接するため。影を調べる位置の画像（GBP）の4番目に入れ、描き込みのシェーダーが読む
 LM.tm.cov=performance.now()-LM.tm.t0;const CT=new Float32Array(LMW*LMH),NOSH=new Uint8Array(LMW*LMH);{const SB=LM.slabB.filter(S=>Math.max(Math.abs(S.n.x),Math.abs(S.n.y),Math.abs(S.n.z))>0.999),CS=0.5,BB=new THREE.Box3();SB.forEach(S=>BB.union(S.box));BB.expandByScalar(0.3);const GX=Math.ceil((BB.max.x-BB.min.x)/CS),GY=Math.ceil((BB.max.y-BB.min.y)/CS),GZ=Math.ceil((BB.max.z-BB.min.z)/CS),GA=new Array(GX*GY*GZ),ci=(v,m)=>Math.floor((v-m)/CS),gi=(x,y,z)=>{const a=ci(x,BB.min.x),b=ci(y,BB.min.y),c=ci(z,BB.min.z);return a<0||b<0||c<0||a>=GX||b>=GY||c>=GZ?-1:(a*GY+b)*GZ+c;};
  SB.forEach(S=>{S.ax=Math.abs(S.n.x)>0.999?(S.n.x>0?0:1):Math.abs(S.n.y)>0.999?(S.n.y>0?2:3):(S.n.z>0?4:5);const b=S.box.clone().expandByScalar(0.16);for(let a=Math.max(0,ci(b.min.x,BB.min.x));a<=Math.min(GX-1,ci(b.max.x,BB.min.x));a++)for(let c=Math.max(0,ci(b.min.y,BB.min.y));c<=Math.min(GY-1,ci(b.max.y,BB.min.y));c++)for(let e=Math.max(0,ci(b.min.z,BB.min.z));e<=Math.min(GZ-1,ci(b.max.z,BB.min.z));e++){const k=(a*GY+c)*GZ+e;(GA[k]||(GA[k]=[])).push(S);}});
  const inS=(S,px,py,pz)=>inPM(S,px,py,pz);
  const UV=[[[0,1,0],[0,0,1]],[[1,0,0],[0,0,1]],[[1,0,0],[0,1,0]]],GCF=new Array(GX*GY*GZ);LM.cfBox.forEach(b=>{for(let a=Math.max(0,ci(b.min.x,BB.min.x));a<=Math.min(GX-1,ci(b.max.x,BB.min.x));a++)for(let c=Math.max(0,ci(b.min.y,BB.min.y));c<=Math.min(GY-1,ci(b.max.y,BB.min.y));c++)for(let e=Math.max(0,ci(b.min.z,BB.min.z));e<=Math.min(GZ-1,ci(b.max.z,BB.min.z));e++){const k=(a*GY+c)*GZ+e;(GCF[k]||(GCF[k]=[])).push(b);}});
  const solid=(x,y,z)=>{const k=gi(x,y,z),l=(k<0?null:GA[k])||[];for(const S of l){const d=S.d-(S.n.x*x+S.n.y*y+S.n.z*z);if(d>0&&d<S.T&&inS(S,x+S.n.x*d,y+S.n.y*d,z+S.n.z*d))return true;}const q=new THREE.Vector3(x,y,z);const l2=k<0?null:GCF[k];return !!l2&&l2.some(b=>b.containsPoint(q));};   // 板（壁などの中）の中か
  for(let i=0;i<LMW*LMH;i++){if(P[i*4+3]===0)continue;const x=P[i*4],y=P[i*4+1],z=P[i*4+2],gk=gi(x,y,z),l=gk<0?null:GA[gk];if(!l)continue;const nx=NN[i*4],ny=NN[i*4+1],nz=NN[i*4+2];let b1=1,a1=-1,b2=1,a2=-1;
   for(const S of l){const dn=nx*S.n.x+ny*S.n.y+nz*S.n.z;if(dn>0.5||(dn<-0.5&&dn>-0.9))continue;const sd=S.n.x*x+S.n.y*y+S.n.z*z-S.d;if(sd<-0.002||sd>0.15||sd>=b2||(dn<-0.9&&sd<0.0003))continue;   // 向き合う面は手前にある物だけ（薄い板の裏の面＝自分のすぐ後ろの面で、部屋からの光を全部止めていた。キッチンの東の壁のパネル）
   const px=x-S.n.x*sd,py=y-S.n.y*sd,pz=z-S.n.z*sd,[u,v]=UV[S.ax>>1];
    let ok=inS(S,px,py,pz);for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]]){if(!ok)break;const qx=px+(u[0]*a+v[0]*b)*0.05,qy=py+(u[1]*a+v[1]*b)*0.05,qz=pz+(u[2]*a+v[2]*b)*0.05;ok=inS(S,qx,qy,qz)||solid(qx-S.n.x*0.01,qy-S.n.y*0.01,qz-S.n.z*0.01);}   // 5cm先が面の外でも、ほかの面の板の中（隅の向こう＝壁の中）ならよい
    if(ok){const v=Math.max(0,sd);if(v<b1){if(S.ax!==a1){b2=b1;a2=a1;}b1=v;a1=S.ax;}else if(S.ax!==a1&&v<b2){b2=v;a2=S.ax;}}}
   if(a1>=0)CT[i]=8000000+(a1*151+Math.min(150,Math.round(b1*1000)))*1000+(a2>=0?a2*151+Math.min(150,Math.round(b2*1000)):906);}
  // 平らに続く縁（NOSH）：大きな面の縁の画素で、縁の外（1.5cm先・面から1cm浮かせた点）がどの縁でも壁などの中でない所（開いたドアの境目・吹抜けの縁など）は、影を調べる位置を内側へ寄せない（GBP）。
  // 寄せるのは、縁が壁などに接する所だけ（角で向こうの光を拾わないため）。平らに続く境目で両側が反対へ寄ると、3cm離れた点を比べることになり、明暗の強い所で境目に段差が出た
  {const BG=new Set(LM.slabB.map(B=>B.c.gid));LM.charts.forEach(c=>{if(!BG.has(c.gid))return;const gid=c.gid+1,ras=(x,y)=>{if(x<c.x||y<c.y||x>=c.x+c.w||y>=c.y+c.h)return false;const k=y*LMW+x;return P[k*4+3]===gid&&NN[k*4+3]>0.5;};
   for(let y=c.y;y<c.y+c.h;y++)for(let x=c.x;x<c.x+c.w;x++){const i=y*LMW+x,e=EF[i];if(!(e>0)||P[i*4+3]!==gid)continue;const v=e-1,X=x+((v>>2)%9-4),Y=y+(Math.floor((v>>2)/9)-4),j=Y*LMW+X;let wall=false,any=false;
    for(const [a,b,d] of [[-1,0,c.u.map(t=>-t)],[1,0,c.u],[0,-1,c.v.map(t=>-t)],[0,1,c.v]]){if(ras(X+a,Y+b))continue;any=true;if(solid(P[j*4]+d[0]*0.015+NN[j*4]*0.01,P[j*4+1]+d[1]*0.015+NN[j*4+1]*0.01,P[j*4+2]+d[2]*0.015+NN[j*4+2]*0.01)){wall=true;break;}}if(any&&!wall)NOSH[i]=1;}});LM.nNosh=NOSH.reduce((a,v)=>a+v,0);}
  LM.nCT=CT.reduce((a,v)=>a+(v>0?1:0),0);}
 // 影を調べる位置（GBP）の仕上げ：壁に接する所の印（CT）を4番目に入れる
 LM.tm.ct=performance.now()-LM.tm.t0;LM.slabB.forEach(S=>{delete S.pm;});MIDB.forEach(S=>{delete S.pm;});LM.mid.clear();{const n=PTS.length/3,RB=64,buf=new Float32Array(LMW*RB*4),gl=r.getContext(),gtx=r.properties.get(GBP.texture).__webglTexture;PGP=new Float32Array(n*4);PGN=new Float32Array(n*3);for(let k=0;k<n;k++){const i=(PTS[k*3+1]*LMW+PTS[k*3])*4;PGN[k*3]=NN[i];PGN[k*3+1]=NN[i+1];PGN[k*3+2]=NN[i+2];}
  for(let y0=0;y0<LMH;y0+=RB){const h=Math.min(RB,LMH-y0);r.readRenderTargetPixels(GBP,0,y0,LMW,h,buf);for(let q=0;q<LMW*h;q++){const i=y0*LMW+q,c=CT[i];if(c>0)buf[q*4+3]=c;if(NOSH[i]){buf[q*4]=P[i*4];buf[q*4+1]=P[i*4+1];buf[q*4+2]=P[i*4+2];}}
   r.state.bindTexture(gl.TEXTURE_2D,gtx);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.pixelStorei(gl.UNPACK_ALIGNMENT,4);gl.texSubImage2D(gl.TEXTURE_2D,0,0,y0,LMW,h,gl.RGBA,gl.FLOAT,buf.subarray(0,LMW*h*4));
   for(let k=0;k<n;k++){const y=PTS[k*3+1];if(y<y0||y>=y0+h)continue;const i=((y-y0)*LMW+PTS[k*3])*4;PGP[k*4]=buf[i];PGP[k*4+1]=buf[i+1];PGP[k*4+2]=buf[i+2];PGP[k*4+3]=buf[i+3];}}}}   // 点ごとの位置（GBP）と向き：点の頂点に持たせる（点を描くときに画像から読まずにすむ）
LM.tm.pts=performance.now()-LM.tm.t0;const MK={texture:(()=>{const t=new THREE.DataTexture(MKD,LMW,LMH,THREE.RGBAFormat,THREE.UnsignedByteType);t.minFilter=t.magFilter=THREE.NearestFilter;t.needsUpdate=true;return t;})()};bakeMat.uniforms.tM.value=MK.texture;
const ptsGeo=new THREE.BufferGeometry();ptsGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(PTS),3));ptsGeo.setAttribute('gp',new THREE.BufferAttribute(PGP,4));ptsGeo.setAttribute('gn',new THREE.BufferAttribute(PGN,3));LM.nPts=PTS.length/3;
const bakePts=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,defines:{BOUNCE:1,PTS:1},depthTest:false,depthWrite:false,transparent:true,blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneFactor,blendEquation:THREE.AddEquation,uniforms:bakeMat.uniforms,
 vertexShader:`in vec4 gp;in vec3 gn;uniform vec2 WH;uniform vec3 lp,ld;uniform float cosO,cosI,isPt,lamb,cres;flat out vec4 vP;flat out vec3 vN;
void main(){vP=gp;vN=gn;bool off=!(dot(gn,gn)>1e-8)||any(isnan(gp.xyz));if(!off){vec3 n=normalize(gn),p=gp.xyz+n*0.012;float tex=2.0/cres;p+=n*(length(lp-p)*tex);vec3 L=normalize(lp-p);float cn=lamb>0.5?max(dot(-L,ld),0.0):isPt>0.5?1.0:smoothstep(cosO,cosI,dot(-L,ld));off=dot(n,L)<=0.0||cn<=0.0;}
 gl_Position=off?vec4(2.0,2.0,2.0,1.0):vec4((position.xy+0.5)/WH*2.0-1.0,0.0,1.0);gl_PointSize=1.0;}`,fragmentShader:bakeMat.fragmentShader});   // 照り返しは計算する画素だけを点として描く（画像全体を描くより速い）。光の届かない点（裏向き・光る面の後ろ）は頂点の段階で捨てる（判定は描き込みと同じ式）
bakeMat.uniforms.WH={value:new THREE.Vector2(LMW,LMH)};const BPS=new THREE.Scene(),bpo=new THREE.Points(ptsGeo,bakePts);bpo.frustumCulled=false;BPS.add(bpo);
// 照り返しの描き込みは、計算する画素（点）を詰めて並べた小さな画像（512×約280）の上で、画像全体を描く形で行い（EC に足し込む）、最後に1回だけ点として元の位置へ写す（scatter）。
// 1画素の点を光る面ごとに描くと、GPU が2×2画素単位で計算するため4倍近い無駄が出る。1画素ごとの計算の中身は同じ
const NPT=LM.nPts,CW2=512,CH2=Math.ceil(NPT/CW2),EC=new THREE.WebGLRenderTarget(CW2,CH2,{type:THREE.HalfFloatType,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthBuffer:false,generateMipmaps:false});
{const cPd=new Float32Array(CW2*CH2*4),cNd=new Float32Array(CW2*CH2*4),CI=new Float32Array(NPT*2);for(let k=0;k<NPT;k++){cPd[k*4]=PGP[k*4];cPd[k*4+1]=PGP[k*4+1];cPd[k*4+2]=PGP[k*4+2];cPd[k*4+3]=PGP[k*4+3];cNd[k*4]=PGN[k*3];cNd[k*4+1]=PGN[k*3+1];cNd[k*4+2]=PGN[k*3+2];CI[k*2]=k%CW2;CI[k*2+1]=Math.floor(k/CW2);}
 const mk=d=>{const t=new THREE.DataTexture(d,CW2,CH2,THREE.RGBAFormat,THREE.FloatType);t.minFilter=t.magFilter=THREE.NearestFilter;t.needsUpdate=true;t.onUpdate=()=>{t.image.data=null;};return t;};bakeMat.uniforms.cP={value:mk(cPd)};bakeMat.uniforms.cN={value:mk(cNd)};ptsGeo.setAttribute('ci',new THREE.BufferAttribute(CI,2));}
const bakeCmp=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,defines:{BOUNCE:1,PTS:1,CMP:1},depthTest:false,depthWrite:false,transparent:true,blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneFactor,blendEquation:THREE.AddEquation,uniforms:bakeMat.uniforms,vertexShader:`void main(){gl_Position=vec4(position.xy,0.0,1.0);}`,fragmentShader:bakeMat.fragmentShader}),CMS=new THREE.Scene();{const q=new THREE.Mesh(new THREE.PlaneGeometry(2,2),bakeCmp);q.frustumCulled=false;CMS.add(q);}
const scatMat=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,depthTest:false,depthWrite:false,uniforms:{ec:{value:EC.texture},WH:{value:new THREE.Vector2(LMW,LMH)}},vertexShader:`in vec2 ci;uniform sampler2D ec;uniform vec2 WH;flat out vec4 vc;void main(){vc=texelFetch(ec,ivec2(ci),0);gl_Position=vec4((position.xy+0.5)/WH*2.0-1.0,0.0,1.0);gl_PointSize=1.0;}`,fragmentShader:`flat in vec4 vc;out vec4 o;void main(){o=vc;}`}),SCS=new THREE.Scene();{const q=new THREE.Points(ptsGeo,scatMat);q.frustumCulled=false;SCS.add(q);}
const ecClear=()=>{r.setRenderTarget(EC);r.setClearColor(0x000000,0);r.clear();},ecScatter=dst=>{r.setRenderTarget(dst);r.autoClear=false;r.render(SCS,CAM0);r.autoClear=true;};   // 照り返しの点の値を元の位置へ（dst は先に消してある）
const fillMat=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,defines:{R:LM.bstep-1},depthTest:false,depthWrite:false,uniforms:{tE:{value:null},tP:{value:GB.textures[0]},tM:{value:MK.texture},tS:{value:LM.sideTex},closed:{value:0}},vertexShader:`void main(){gl_Position=vec4(position.xy,0.0,1.0);}`,
 fragmentShader:`uniform sampler2D tE,tP,tM,tS;uniform int closed;out vec4 o;void main(){ivec2 c=ivec2(gl_FragCoord.xy);float w=texelFetch(tP,c,0).w;if(w==0.0||texelFetch(tM,c,0).r>0.5){o=texelFetch(tE,c,0);return;}vec4 sc=texelFetch(tS,c,0);float rt=abs(sc.y);int ef=int(sc.x+0.5),fl=0;
 if(ef>0){ef-=1;fl=ef&3;c+=ivec2((ef>>2)%9-4,(ef>>2)/9-4);if(texelFetch(tM,c,0).r>0.5){o=texelFetch(tE,c,0);return;}}   // 余白の画素は、いちばん近い形の中の画素と同じ値にする
 vec3 s=vec3(0.0),s1=vec3(0.0);float ws=0.0,w1=0.0;for(int y=-R;y<=R;y++)for(int x=-R;x<=R;x++){ivec2 q=c+ivec2(x,y);vec4 sq=texelFetch(tS,q,0);if(texelFetch(tM,q,0).r<0.5||texelFetch(tP,q,0).w!=w||sq.y!=rt||(int(sq.z)&closed)!=0)continue;float k=(1.0-abs(float(x))/float(R+1))*(1.0-abs(float(y))/float(R+1));vec3 e=texelFetch(tE,q,0).rgb;s+=e*k;ws+=k;
  if(fl!=0){int fq=int(sq.x+0.5);fq=fq>0?(fq-1)&3:0;if(((fl&1)!=0&&y==0&&(fq&1)!=0)||((fl&2)!=0&&x==0&&(fq&2)!=0)){s1+=e*k;w1+=k;}}}   // 縁の画素：同じ縁の上（同じ行・列で縁の印のある）計算した画素
 o=vec4(w1>0.0?s1/w1:ws>0.0?s/ws:vec3(0.0),1.0);}`});   // 計算していない画素は、同じチャートの見えている計算した画素から補う（R 画素以内、近いほど重く。閉じた扉に覆われた画素は使わない）
const fillQ=new THREE.Mesh(new THREE.PlaneGeometry(2,2),fillMat);fillQ.frustumCulled=false;const FILLS=new THREE.Scene();FILLS.add(fillQ);
const closedMask=()=>SEALS.reduce((m,q,j)=>DS[q.k]?m:m|(1<<j),0);   // 閉じているドアのビット
const fillTo=(src,dst)=>{fillMat.uniforms.closed.value=closedMask();fillMat.uniforms.tE.value=src.texture;r.setRenderTarget(dst);r.render(FILLS,CAM0);};
const EB1=ED.clone(),EBT=ED.clone();let ET=ED.clone(),EG=ED.clone();   // ET：表示に使う照度。EG：作業用（G1・太陽の直接の光＝照り返しの元にだけ使う。表示は実時間／2回目の照り返し／足し合わせ）。描き込み終わると ET と EG を入れ替え、EG が前の照度になる（なめらかに切り替えるのに使う）。画像の数を減らしてメモリを節約（iPhone で落ちたため）
const CGRPC=CGRP.map(k=>+k.split(':')[0]);   // まとまりのチャートの番号
LM.bsoft=1.5;LM.wsoft=2;   // 照り返しの影のやわらかさ（影の画像の画素の何倍の幅で平均するか）
const GLASS_T=0.5;   // 浴室のドアのすりガラスの透過率（仮）
const NSHOOT=[1000,500];   // 照り返しの1回目・2回目で光る面として使うまとまりの、光の量の下限（この値より暗いまとまりは省く）。2000・6000 だと、窓の無い部屋が昼に開いたドアからの光だけで照らされるとき（洗面所の北の壁・北東の小さなくぼみ）、部屋の中の照り返しが全部省かれて真っ黒になった
// 「明るい順に何個」にすると、昼は日なたが上位を占めて窓の無い部屋のまとまりが外れ、同じ部屋が昼夜で違って見える（トイレの指摘）。下限は全状態で同じなので、ある部屋の照り返しは他の部屋の明るさによらない
function bounce(src,dst,src2,ns){aggMat.uniforms.closed.value=closedMask();aggMat.uniforms.tE.value=src.texture;aggMat.uniforms.tE2.value=(src2||src).texture;aggMat.uniforms.e2.value=src2?1:0;r.setRenderTarget(CRT);r.render(AGGS,CAM0);const F=new Float32Array(CW*CH*4),P=new Float32Array(CW*CH*4),N=new Float32Array(CW*CH*4);
 r.readRenderTargetPixels(CRT,0,0,CW,CH,F,undefined,0);r.readRenderTargetPixels(CRT,0,0,CW,CH,P,undefined,1);r.readRenderTargetPixels(CRT,0,0,CW,CH,N,undefined,2);
 const G=new Map();for(let i=0;i<CELLS.length;i++){const k=F[i*4+3];if(k<=0)continue;const y=0.2126*F[i*4]+0.7152*F[i*4+1]+0.0722*F[i*4+2];if(!(y>0))continue;
  let g=G.get(CGRP[i]);if(!g){g={y:0,F:new THREE.Vector3(),P:new THREE.Vector3(),N:new THREE.Vector3(N[i*4],N[i*4+1],N[i*4+2]),k:0,i,ta:(c=>c?c.su*c.sv:LM.ts*LM.ts)(LM.charts[CGRPC[i]])};G.set(CGRP[i],g);}g.y+=y;g.F.x+=F[i*4];g.F.y+=F[i*4+1];g.F.z+=F[i*4+2];g.P.addScaledVector(new THREE.Vector3(P[i*4],P[i*4+1],P[i*4+2]),y);g.k+=k;}   // まとまりごとに：光の量の合計・光の量で重みを付けた中心
 const shown=o=>{for(let q=o;q;q=q.parent)if(!q.visible)return false;return true;};
 G.forEach((g,key)=>{const ch=LM.charts[CGRPC[g.i]];if(ch&&ch.o&&!shown(ch.o))G.delete(key);});   // 表示していない形（閉じたドアの開いた形など）は光らせない（閉じた扉の面も、自分の側へ光を返す）
 const gs=[...G.values()].sort((a,b)=>b.y-a.y||a.i-b.i),sel=gs.filter(g=>g.y>=ns);   // 下限〜2倍の間は光を0から1倍へなめらかに増やす（下限の前後でわずかな光の差が、急な見た目の差にならないように）
LM.nSel=(LM.nSel||[]).concat(sel.length).slice(-2);
 r.setRenderTarget(dst);r.setClearColor(0x000000,0);r.clear();ecClear();
 const tr=[];sel.forEach(g=>{const ch=LM.charts[CGRPC[g.i]];if(ch&&ch.o&&ch.o.material===bathGlM)tr.push(g);});   // 浴室のドアのすりガラス：受けた光の一部を反対側へ、ぼんやりした光として出す（透過率 GLASS_T は仮）
 tr.forEach(g=>{const n=g.N;if(!(n.lengthSq()>0.5))return;const pos=g.P.clone().multiplyScalar(1/g.y).addScaledVector(n,-0.026),area=g.k*g.ta,phi=g.F.clone().multiplyScalar(g.ta/Math.PI*GLASS_T/lum(bathGlM.color)*Math.min(1,(g.y-ns)/ns));
  bakeEmitter({pos,dir:n.clone().negate(),lamb:1,intensity:1,colv:phi,r2:area/Math.PI,soft:LM.bsoft,cube:2},dst);});
 sel.forEach(g=>{const n=g.N;if(!(n.lengthSq()>0.5))return;const pos=g.P.multiplyScalar(1/g.y),area=g.k*g.ta,phi=g.F.clone().multiplyScalar(g.ta/Math.PI*Math.min(1,(g.y-ns)/ns));   // 反射した光束÷π（拡散面の正面の光度）
  bakeEmitter({pos:pos.addScaledVector(n,0.02),dir:n,lamb:1,intensity:1,colv:phi,r2:area/Math.PI,soft:LM.bsoft,cube:2},dst);});
 ecScatter(dst);LM.nShoot=sel.length;}
const sumMat=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,depthTest:false,depthWrite:false,uniforms:{a:{value:ED.texture},b:{value:EB1.texture},c:{value:EBT.texture},tS:{value:LM.sideTex},closed:{value:0},gT:{value:GLASS_T/(0.2126*bathGlM.color.r+0.7152*bathGlM.color.g+0.0722*bathGlM.color.b)}},vertexShader:`void main(){gl_Position=vec4(position.xy,0.0,1.0);}`,
 fragmentShader:`uniform sampler2D a,b,c,tS;uniform float gT;uniform int closed;out vec4 o;void main(){ivec2 q=ivec2(gl_FragCoord.xy);vec4 sq=texelFetch(tS,q,0);o=vec4(texelFetch(a,q,0).rgb+texelFetch(b,q,0).rgb+texelFetch(c,q,0).rgb,1.0);if(sq.y<0.0||(int(sq.z)&closed)!=0){vec3 sm=vec3(0.0);float kw=0.0;for(int y=-3;y<=3;y++)for(int x=-3;x<=3;x++){ivec2 m=q+ivec2(x,y);vec4 sn=texelFetch(tS,m,0);if(sn.y!=abs(sq.y)||(int(sn.z)&closed)!=0)continue;float wg=1.0/(1.0+float(x*x+y*y));sm+=(texelFetch(a,m,0).rgb+texelFetch(b,m,0).rgb+texelFetch(c,m,0).rgb)*wg;kw+=wg;}if(kw>0.0)o.rgb=sm/kw;}if(sq.w>0.5){int j=int(sq.w+0.5)-1;ivec2 r=ivec2(j%${LMW},j/${LMW});o.rgb+=(texelFetch(a,r,0).rgb+texelFetch(b,r,0).rgb+texelFetch(c,r,0).rgb)*gT;}}`});   // 照度の足し合わせ。隠れた画素・閉じた扉に覆われた画素は同じチャートの隣の見えている画素から写す（表示でなめらかに読むとき、見えている所が隠れた所の暗い値を拾わないように）。すりガラスの裏の面は表で受けた光の一部も足す
const sumQ=new THREE.Mesh(new THREE.PlaneGeometry(2,2),sumMat);sumQ.frustumCulled=false;const SUMS=new THREE.Scene();SUMS.add(sumQ);
// ===== 普段の描画：光は使わず、ライトマップの照度を「周りからの光」として材質に入れる（拡散の明るさ＝照度×反射率÷π） =====
const LMU={lmPrev:{value:EG.texture},fade:{value:1},lmTex:{value:ET.texture},lmScale:{value:new THREE.Vector3(1,1,1)},sunS:{value:SUNRT.texture},sunW:{value:SUNWIN.texture},sunVP:{value:SUNVP},sunD:{value:SUNDIR.clone()},sunC:{value:new THREE.Vector3()},sunOn:{value:0},shadeT:{value:1},sunR:{value:0.015/14}};   // sun…：太陽の直接の光（表示で計算）。sunR：影の縁のぼかしの半径（約1.5cm。太陽の大きさによる半影）
// lmB：ライトマップを4×4画素でなめらかに読む（3次のB-スプライン。画素の段々が見えないように）
function lmPatch(sh){Object.assign(sh.uniforms,LMU);
 sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 lm;uniform sampler2D lmTex,lmPrev;uniform float fade;varying vec2 vLmUv;varying vec3 vLmV;varying vec3 vWP;')
  .replace('#include <begin_vertex>','#include <begin_vertex>\nvWP=(modelMatrix*vec4(transformed,1.0)).xyz;if(lm.z>0.5){vLmV=texelFetch(lmTex,ivec2(lm.xy),0).rgb;if(fade<1.0)vLmV=mix(texelFetch(lmPrev,ivec2(lm.xy),0).rgb,vLmV,fade);vLmUv=vec2(-1.0);}else{vLmUv=lm.xy;vLmV=vec3(0.0);}');   // 頂点ごとの部品は頂点で読んで面の中はなめらかに
 // 太陽の影（sunE）：影の画像の12点を、それぞれまわり4画素を見比べた結果をなめらかに混ぜて読む（sunV1）。1画素ずつだと影の縁が影の画像の画素の形で段々になった（ソファの肘など、日差しが浅い角度で当たる所）
 sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D lmTex,lmPrev;uniform float fade;uniform vec3 lmScale;varying vec2 vLmUv;varying vec3 vLmV;varying vec3 vWP;uniform sampler2D zCau;\nuniform sampler2D sunS,sunW;uniform mat4 sunVP;uniform vec3 sunD,sunC;uniform float sunOn,shadeT,sunR;\nconst vec2 PD[12]=vec2[12](vec2(-0.326,-0.406),vec2(-0.840,-0.074),vec2(-0.696,0.457),vec2(-0.203,0.621),vec2(0.962,-0.195),vec2(0.473,-0.480),vec2(0.519,0.767),vec2(0.185,-0.893),vec2(0.507,0.064),vec2(0.896,0.412),vec2(-0.322,-0.933),vec2(-0.792,-0.598));\nfloat sunV1(vec2 uv,float dz){vec2 st=uv*4096.0-0.5,i=floor(st),f=st-i;ivec2 c=clamp(ivec2(i),ivec2(0),ivec2(4094));float a=texelFetch(sunS,c,0).r,b=texelFetch(sunS,c+ivec2(1,0),0).r,d=texelFetch(sunS,c+ivec2(0,1),0).r,e=texelFetch(sunS,c+ivec2(1,1),0).r;float va=(a==0.0||a<dz)?1.0:0.0,vb=(b==0.0||b<dz)?1.0:0.0,vd=(d==0.0||d<dz)?1.0:0.0,ve=(e==0.0||e<dz)?1.0:0.0;return mix(mix(va,vb,f.x),mix(vd,ve,f.x),f.y);}\nvec3 sunE(vec3 nW){float nl=dot(nW,sunD);if(sunOn<0.5||nl<=0.0)return vec3(0.0);vec3 p=vWP+nW*0.01;vec4 q=sunVP*vec4(p,1.0);vec2 uv=q.xy/q.w*0.5+0.5;float dz=dot(p,sunD)+100.0,v=0.0;for(int i=0;i<12;i++)v+=sunV1(uv+PD[i]*sunR,dz+0.004);v/=12.0;float wv=texture2D(sunW,uv).r;if(wv>0.0&&wv>dz+0.01)v*=shadeT;return sunC*(nl*v);}\nvec3 lmB(sampler2D lmTex,vec2 uv){vec2 ts=vec2(textureSize(lmTex,0)),st=uv*ts-0.5,i=floor(st),f=st-i,f2=f*f,f3=f2*f,w0=(1.0-3.0*f+3.0*f2-f3)/6.0,w1=(4.0-6.0*f2+3.0*f3)/6.0,w2=(1.0+3.0*f+3.0*f2-3.0*f3)/6.0,w3=f3/6.0,g0=w0+w1,g1=w2+w3,h0=(i-0.5+w1/g0)/ts,h1=(i+1.5+w3/g1)/ts;\n return g0.y*(g0.x*texture2D(lmTex,h0).rgb+g1.x*texture2D(lmTex,vec2(h1.x,h0.y)).rgb)+g1.y*(g0.x*texture2D(lmTex,vec2(h0.x,h1.y)).rgb+g1.x*texture2D(lmTex,h1).rgb);}\nuniform vec4 zCauK;uniform vec3 g1P;\nfloat cauF(vec3 d){float p=texture2D(zCau,vec2(atan(d.z,d.x)*0.1591549+0.5,asin(clamp(d.y,-1.0,1.0))*0.3183099+0.5)).r;float cd=-d.y,op=smoothstep(zCauK.x-0.015,zCauK.x+0.015,cd),gl=zCauK.z*(0.3+1.6*p)*(1.0-smoothstep(zCauK.y-0.02,zCauK.y+0.01,d.y)),rim=zCauK.w*exp(-pow((cd-zCauK.x+0.02)/0.03,2.0))*(0.5+p);return mix(gl,1.0,op)+rim;}')
  .replace('#include <lights_fragment_begin>',THREE.ShaderChunk.lights_fragment_begin.replace(/(pointLight = pointLights\[ i \];[\s\S]*?)(RE_Direct\()/,'$1directLight.color *= cauF( normalize( vWP - g1P ) );\n\t\t$2'))
  .replace('#include <lights_fragment_maps>',THREE.ShaderChunk.lights_fragment_maps.replace('iblIrradiance += getIBLIrradiance( geometryNormal );','')+'\n\tirradiance += ((vLmUv.x>=0.0?(fade<1.0?mix(lmB(lmPrev,vLmUv),lmB(lmTex,vLmUv),fade):lmB(lmTex,vLmUv)):vLmV)+sunE(inverseTransformDirection(geometryNormal,viewMatrix)))*lmScale;');}
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
function relight(chg){envAll();syncDoors();sealUpd();const sh=bedS.shadeP||0,tr=(1-sh)+sh*0.5;SC=1;
 r.setRenderTarget(ED);r.setClearColor(0x000000,0);r.clear();
 const t0=performance.now();let n=0;
 r.setRenderTarget(EG);r.clear();G1L.intensity=0;G1L.shadow.needsUpdate=true;
 CAND.forEach(c=>{if(c.src.intensity<=0)return;const p=c.type==='spot'?c.pos.clone().addScaledVector(c.dir,0.03):c.pos,g1=!!c.src.userData.caustic;bakeEmitter({pos:p,dir:c.dir,type:c.type,angle:c.angle,penumbra:c.penumbra,intensity:c.intensity,col:c.color,cau:g1,soft:2},g1?EG:ED);if(g1){G1L.intensity=c.intensity;G1L.userData.col=c.color;}n++;});   // G1 の直接の光は EG へ（模様が細かいので表示は実時間の光で）   // 照明（器具の面から3cm光の向きへ出した所から。器具の体で影を作らない）
 WINC.forEach(c=>{let I,col;if(c.frost){const Ev=(SKY_LUX*0.5+(night?0:SUN_LUX*SUN_K*Math.max(SUNDIR.dot(c.out),0)))*(night?MOON:1)*c.frost;I=Ev/Math.PI*c.area;col=night?lumColor(0xdfe4f2):lumColor(0xfaf7f0);c.mesh.material.color.copy(col).multiplyScalar(Ev/Math.PI);}   // ガラスの面自体も、通した光の明るさで光って見える
  else{const t=c.win.shadeable?tr:1;I=SKY_LUX/Math.PI*(night?MOON:1)*t*c.area;col=night?lumColor(0xdfe4f2):lumColor(0xf4f8ff);}
  const wd=c.win||{},ww=wd.w||Math.sqrt(c.area),wh=wd.h||Math.sqrt(c.area),ua=wd.u?new THREE.Vector3(...wd.u):new THREE.Vector3(1,0,0),nx=Math.min(4,Math.max(1,Math.round(ww/0.4))),ny=Math.min(3,Math.max(1,Math.round(wh/0.4))),N=nx*ny,a1=c.area/N;
  for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){const pos=c.pos.clone().addScaledVector(ua,((i+0.5)/nx-0.5)*ww).add(new THREE.Vector3(0,((j+0.5)/ny-0.5)*wh,0));bakeEmitter({pos,dir:c.dir,type:'spot',angle:c.angle,penumbra:1,intensity:I/N,col,r2:a1/Math.PI,soft:LM.wsoft,sky:!c.frost});n++;}});   // sky：窓の空の光は上（空）から入って下へ向かう光が強く、下（地面の照り返し）から入って上へ向かう光は弱い（下向き1.6・上向き0.4、窓を通る光の量は同じ）。同じにすると、高い窓のすぐ上の天井が床より明るく光った（脱衣室）   // 窓：空の光。窓の面に並べた点（最大4×3）から出す（大きな面の光なので、椅子の脚のような細い物の影は自然に薄くなる）
 LMU.sunOn.value=night?0:1;if(!night){bakeMat.uniforms.shadeT.value=tr;LMU.shadeT.value=tr;const sc=lumColor(0xfff1dc).multiplyScalar(SUN_LUX*SUN_K*SC);LMU.sunC.value.set(sc.r,sc.g,sc.b);bakeSun(SUN_LUX*SUN_K,lumColor(0xfff1dc));n++;}
 {const w=WBC;LMU.lmScale.value.set(1/SC/w.r,1/SC/w.g,1/SC/w.b);if(G1L.userData.col)G1L.color.setRGB(G1L.userData.col.r/w.r,G1L.userData.col.g/w.g,G1L.userData.col.b/w.b);}   // 白の合わせは固定（点いている照明や昼夜で変えない。変えると同じ部屋の色が状態で変わるため）
 const t1=performance.now();bounce(ED,EBT,EG,NSHOOT[0]);fillTo(EBT,EB1);bounce(EB1,EG,null,NSHOOT[1]);fillTo(EG,EBT);sumMat.uniforms.closed.value=closedMask();r.setRenderTarget(EG);r.render(SUMS,CAM0);[ET,EG]=[EG,ET];LMU.lmTex.value=ET.texture;LMU.lmPrev.value=EG.texture;LM.bounceMs=performance.now()-t1;   // 照り返し2回を足して、表示に使う照度にする
 r.toneMappingExposure=LM.EXPO;updateGlow();r.setRenderTarget(null);LM.bakeMs=performance.now()-t0;LM.nEmit=n;}
draw=function(){if(!ready)return;cam.rotation.set(pitch,yaw,0);r.setRenderTarget(null);r.render(scene,cam);};
// 照明・昼夜・ドア・シェードを切り替えたとき：まず今の光のまま表示を切り替え（ドアの開閉・器具の点灯はすぐ見える）、次の描画で光を描き込み、0.3秒かけて前の光からなめらかに切り替える。
// LM.async=false のとき（確認の道具・読み込み直後）はその場で描き込む
LM.async=false;let rlBusy=false,rlAgain=false;
function requestRelight(){if(!LM.async){relight();LMU.fade.value=1;draw();return;}envAll();draw();if(rlBusy){rlAgain=true;return;}rlBusy=true;
 setTimeout(()=>{rlAgain=false;relight();LMU.fade.value=0;const t0=performance.now();
  const step=()=>{const f=Math.min(1,(performance.now()-t0)/300);LMU.fade.value=f;draw();if(f<1)setTimeout(step,16);else{rlBusy=false;if(rlAgain){rlAgain=false;requestRelight();}}};setTimeout(step,16);},30);}
applyEnvAll=function(){requestRelight();};
{const _td=toggleDoor;toggleDoor=function(k){const was=DS[k];_td(k);if(DS[k]!==was)requestRelight();};}
if(LMQ!=='chk'){applyEnvAll();LM.async=true;let n=0;const t=setInterval(()=>{draw();if(++n>=3)clearInterval(t);},400);}   // 読み込み中の表示が消えた後にも描き直す

LM.tm.all=performance.now()-LM.tm.t0;LM.loaded=true;   // 最後まで読み込めた印（確認の道具が待つ）
