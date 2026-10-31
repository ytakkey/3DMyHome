// ===== 焼き込みの検証ページ（本番とは別。CLAUDE.md 1章「照明とドア」）=====
// 模型：house.glb（tools/blender/export_gltf.py。uv＝元の柄、uv2＝ライトマップ）。光：lm/index.json と層ごと・アトラスごとの画像（tools/blender/lm_images.py）
// 点灯している光源・ドアの開閉・昼夜・シェードが変わったときだけ、要る層をアトラスごとに1枚（半精度）へ足し合わせ、普段の描画はその1枚を読むだけ
// ?lm=<方式>_r<縮小>（例 rgbm_r2）で、bake/work/trial_lm/ の比較用の画像を読む（手元の確認用。無指定は stg/lm/）
const $=id=>document.getElementById(id);
const Q=new URLSearchParams(location.search);
const LMV=Q.get('lm')||'',LMDIR=LMV?'../bake/work/trial_lm/'+LMV+'/':'lm/';
const TEX_BUDGET=(+Q.get('budget')||128)*2**20,BYTE_BUDGET=64*2**20;   // GPU に置いておく層の画像・取得済みのファイルの上限（超えたら、いまの状態で使わない物から捨てる）
const LMK=32;   // まとめた画像には lux/32 を入れる（半精度の最大 65504 を超えないように）。表示で ×32
const EXPO={day:+Q.get('ed')||2500,night:+Q.get('en')||700};   // 白（反射率1）が 1.0 になる照度（lux）。本番の見え方に近くなるよう選んだ（?ed=・?en= で変えて比べられる）
const GAM={day:+Q.get('gd')||0.6,night:+Q.get('gn')||0.75};   // 明るさの幅を縮める：照度を 露出×(照度/露出)^GAM にする（明るさだけ。暗い所の黒つぶれ・明るい所の白飛びを抑える。E7。見る場所によらず同じ式＝D1）
// 照明の色（色温度。4章「照明」の色を線形にして明るさ1にそろえる）：焼き込みは白い光なので、層に掛ける
const KC=h=>{const c=new THREE.Color(h).convertSRGBToLinear(),y=0.2126*c.r+0.7152*c.g+0.0722*c.b;return [c.r/y,c.g/y,c.b/y];},K2700=KC(0xffc68e),K3500=KC(0xffd9b4),K5000=KC(0xfff3e8),K2400=KC(0xffb066);
const TINT={bdl:K2700,bbr:K2700,j1:K2700,h1:K3500,k1:K3500,l1:K5000,a1:K3500,a2:K3500,a4:K3500,a6:K3500,a3:K2700,a5:K2400,
 d1:K5000,e1:K3500,eh:K2700,b3:K2400,ec:K2700,ek:K2700,g1:K2700,bath:K5000};   // O1・O2・J1・A3・B1・B2・F1・G1 は 2700K、H1・K1・A1・A2・A4・A6・E1（温白色）は 3500K、L1・D1・浴室は 5000K、A5・B3（電球）は 2400K（js のコメント）
const WITH={eh:['b3'],g1:['g1d']};   // 一緒に点く層（玄関ホールのボタンで B2 のダウンライトと B3 のブラケット、トイレで G1 の反射した光とまっすぐ届く光）
TINT.g1d=K2700;
// G1（トイレのペンダント）の揺らいだ光（F4。本番の js/lighting.js の cauTex・cauF と同じ）：まっすぐ届く光（g1d。ガラスなしで焼いた層）に、
// 光源から見た向きで模様を掛ける（下の口から出る光はそのまま、ガラスを通る光は透過率×模様、真上はソケットの陰、口の縁の向きは明るい帯）
const CAU={p:[-2.1225,1.628,5.9525],k:[0.441,0.97,0.85,0.8]};
const cauImg=(()=>{const W=512,H=256,img=new Uint8Array(W*H*4);let sd=7;const rnd=()=>(sd=sd*16807%2147483647)/2147483647;
 const pts=(N,seed)=>{sd=seed;const o=[];for(let i=0;i<N;i++){const y=rnd()*2-1,a=rnd()*Math.PI*2,r=Math.sqrt(1-y*y);o.push([r*Math.cos(a),y,r*Math.sin(a)]);}return o;};
 const warp=(v,A,f,ph)=>[v[0]+A*Math.sin(f*(1.1*v[1]+0.7*v[2])+ph),v[1]+A*Math.sin(f*(0.9*v[2]+0.8*v[0])+ph*1.7),v[2]+A*Math.sin(f*(1.2*v[0]+0.6*v[1])+ph*2.3)];
 const layer=(P,v,A1,A2)=>{let w=warp(warp(v,A1,4.5,1.0),A2,11.0,2.0);const l=Math.hypot(...w);w=w.map(c=>c/l);let d1=-2,d2=-2;for(let n=0;n<P.length;n++){const p=P[n],d=p[0]*w[0]+p[1]*w[1]+p[2]*w[2];if(d>d1){d2=d1;d1=d;}else if(d>d2)d2=d;}return Math.sqrt(Math.max(0,2-2*d2))-Math.sqrt(Math.max(0,2-2*d1));};
 const PA=pts(170,7),PB=pts(70,11);
 for(let j=0;j<H;j++){const el=(j+0.5)/H*Math.PI-Math.PI/2;if(el<-0.85||el>1.45)continue;const cy=Math.sin(el),ce=Math.cos(el);
  for(let i=0;i<W;i++){const az=(i+0.5)/W*Math.PI*2-Math.PI,v=[ce*Math.cos(az),cy,ce*Math.sin(az)],ea=layer(PA,v,0.07,0.018),eb=layer(PB,v,0.08,0.02);
   const val=Math.min(1,Math.max(Math.exp(-((ea/0.018)**2)),0.35*Math.exp(-((eb/0.03)**2)))+0.15*Math.exp(-ea/0.05)),k=(j*W+i)*4;img[k]=img[k+1]=img[k+2]=Math.round(val*255);img[k+3]=255;}}
 return {W,H,img};})();
const cauTex=(()=>{const t=new THREE.DataTexture(cauImg.img,cauImg.W,cauImg.H,THREE.RGBAFormat);t.wrapS=THREE.RepeatWrapping;t.magFilter=t.minFilter=THREE.LinearFilter;t.generateMipmaps=false;t.needsUpdate=true;return t;})();
const ss=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
function cauF(x,y,z){const dx=x-CAU.p[0],dy=y-CAU.p[1],dz=z-CAU.p[2],l=Math.hypot(dx,dy,dz)||1,d=[dx/l,dy/l,dz/l],K=CAU.k;   // 頂点で焼く物の分（CPU。シェーダーの cauF と同じ式）
 const u=Math.atan2(d[2],d[0])*0.1591549+0.5,v=Math.asin(Math.max(-1,Math.min(1,d[1])))*0.3183099+0.5,i=((Math.floor(u*cauImg.W)%cauImg.W)+cauImg.W)%cauImg.W,j=Math.min(cauImg.H-1,Math.max(0,Math.floor(v*cauImg.H))),p=cauImg.img[(j*cauImg.W+i)*4]/255;
 const cd=-d[1],op=ss(K[0]-0.015,K[0]+0.015,cd),gl=K[2]*(0.3+1.6*p)*(1-ss(K[1]-0.02,K[1]+0.01,d[1])),rim=K[3]*Math.exp(-(((cd-K[0]+0.02)/0.03)**2))*(0.5+p);return gl*(1-op)+op+rim;}
const CAUGL=`uniform sampler2D uCau;uniform sampler2D uCauT;uniform vec3 uCauP;uniform vec4 uCauK;varying vec3 vWC;
float cauF(){vec3 d=normalize(vWC-uCauP);float p=texture2D(uCauT,vec2(atan(d.z,d.x)*0.1591549+0.5,asin(clamp(d.y,-1.0,1.0))*0.3183099+0.5)).r;
 float cd=-d.y,op=smoothstep(uCauK.x-0.015,uCauK.x+0.015,cd),gl=uCauK.z*(0.3+1.6*p)*(1.0-smoothstep(uCauK.y-0.02,uCauK.y+0.01,d.y)),rim=uCauK.w*exp(-pow((cd-uCauK.x+0.02)/0.03,2.0))*(0.5+p);return mix(gl,1.0,op)+rim;}
`;
const MOON=1/1000,MOONC=[0.6,0.7,1.0];   // 夜の月明かり：空の層を弱めて青く（仮）
const EMIT=3000;   // 点灯している照明器具の発光面の明るさ（lux 相当。仮）
const SHADE_T=p=>1-0.5*p;   // シェードを閉めた割合 p で、その窓から入る光の割合（閉めても5割通す）
// 焼いた層の組み合わせ（光源→関係するドア。bake_layers.py の COMBOS を lm/index.json の combos で受け取る）。層の名前＝光源@ドアの開閉（関係するドアだけ）
let COMBOS={};
const D3=['SG311','SG500w','SG33s'],OLDC={bdl:D3,bbr:D3,sky_bed:D3,sun_bed:D3,j1:['SG311','SG500w'],l1:['SG500w','SG311'],k1:['SG33s'],sky_study:['SG33s'],sun_study:['SG33s'],sky_void:['SG311']};   // combos の無い一覧（寝室の試作のとき）
const NATURAL=['sky_bed','sun_bed','sky_study','sun_study','sky_void','sun_void','sky_ldk1F','sun_ldk1F','sky_dress','sun_dress','sky_ent','sun_ent'];
const SHADED=new Set(['bed','study','ldk1F']);   // シェードの付いた窓の組（ldk1F は南の大きな窓 FK2042 だけシェード付き。組をまとめて弱める＝仮）
const LG=[['リビング',[['ウォールライト','a6'],['ダウンライト','a4'],['スポット','a2'],['階段','h1']]],['キッチン',[['ペンダント','a5'],['下がり天井','a3'],['ダウンライト','a1']]],['寝室',[['ダウンライト','bdl'],['ブラケット','bbr'],['廊下','j1']]],['WIC',[['ダウンライト','l1']]],['書斎',[['ダウンライト','k1']]],
 ['洗面脱衣',[['脱衣室','e1'],['洗面所','d1']]],['浴室',[['ダウンライト','bath']]],['玄関',[['ホール','eh'],['収納','ek'],['廊下','ec']]],['トイレ',[['ペンダント','g1']]]];   // 照明のボタン（並びは本番の js/ui.js の LG と同じ）
const LS={a6:false,a4:false,a2:false,h1:false,a5:false,a3:false,a1:false,bdl:false,bbr:false,j1:false,l1:false,k1:false,d1:false,e1:false,eh:false,ec:false,ek:false,g1:false,bath:false};
const DS={sg311:false,sg500w:false,sg33s:false,sg300l:false,sg300w:false,bath:false,sg33:false,sg11h:false,sg500:false};   // ドアの開閉（キーは本番の DS と同じ）。?doors=open で開いた状態から（一部の層だけ試しに焼いたときの確認用）
if(Q.get('doors')==='open')for(const k in DS)DS[k]=true;
const dk=d=>d==='BATHD'?'bath':d.toLowerCase();   // 焼き込みのドアの名前 → DS のキー
let night=false,shadeP=0,yaw=0,pitch=0,ready=false;

// ===== 描画の準備。表示の色＝反射率×照度÷露出を AgX で（Blender の確認の表示と同じ見え方）=====
THREE.ShaderChunk.tonemapping_pars_fragment=THREE.ShaderChunk.tonemapping_pars_fragment.replace('vec3 CustomToneMapping( vec3 color ) { return color; }',`
vec3 agxCurve(vec3 x){vec3 x2=x*x;vec3 x4=x2*x2;return 15.5*x4*x2-40.14*x4*x+31.96*x4-6.868*x2*x+0.4298*x2+0.1191*x-0.00232;}
vec3 CustomToneMapping(vec3 color){
 const mat3 S2R=mat3(vec3(0.6274,0.0691,0.0164),vec3(0.3293,0.9195,0.0880),vec3(0.0433,0.0113,0.8956));
 const mat3 R2S=mat3(vec3(1.6605,-0.1246,-0.0182),vec3(-0.5876,1.1329,-0.1006),vec3(-0.0728,-0.0083,1.1187));
 const mat3 INS=mat3(vec3(0.856627153315983,0.137318972929847,0.11189821299995),vec3(0.0951212405381588,0.761241990602591,0.0767994186031903),vec3(0.0482516061458583,0.101439036467562,0.811302368396859));
 const mat3 OUTS=mat3(vec3(1.1271005818144368,-0.1413297634984383,-0.14132976349843826),vec3(-0.11060664309660323,1.157823702216272,-0.11060664309660294),vec3(-0.016493938717834573,-0.016493938717834257,1.2519364065950405));
 color=INS*(S2R*(color*toneMappingExposure));
 color=clamp((log2(max(color,1e-10))+12.47393)/16.5,0.0,1.0);
 color=OUTS*agxCurve(color);
 return clamp(R2S*pow(max(color,vec3(0.0)),vec3(2.2)),0.0,1.0);}`);
const r=new THREE.WebGLRenderer({antialias:true});
r.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
r.setSize(window.innerWidth,window.innerHeight);
r.outputEncoding=THREE.sRGBEncoding;r.toneMapping=THREE.CustomToneMapping;
document.body.prepend(r.domElement);
const cam=new THREE.PerspectiveCamera(85,window.innerWidth/window.innerHeight,0.05,80);cam.rotation.order='YXZ';
const scene=new THREE.Scene();
function look(px,py,pz,ya,pi,f){cam.position.set(px,py,pz);cam.fov=f;cam.updateProjectionMatrix();yaw=ya;pitch=pi;draw();}
function draw(){if(!ready)return;cam.rotation.set(pitch,yaw,0);r.render(scene,cam);}
function mark(el,on){el.classList.toggle('on',on);el.setAttribute(el.getAttribute('role')==='switch'?'aria-checked':(el.getAttribute('role')==='tab'?'aria-selected':'aria-pressed'),on);}
const sRGB=h=>new THREE.Color(h).convertSRGBToLinear();
const UNI={uE:{value:EXPO.day},uG:{value:GAM.day},uShP:{value:0}};   // 明るさの幅を縮める式の露出と指数・シェードを閉めた割合（すべての材質で共有）
// シェード（S_<アトラス>）：生地は閉めきった形・バーは全開の位置で焼いてある。開度 p で本番の applyShades と同じ長さ max(0.02, 閉めきった長さ×p) に縮め、柄とライトマップは上の端からその長さの分だけ使う
const SHV=`#include <begin_vertex>
if(shd.z>0.5){float sL=max(0.02,shd.y*uShP);
 if(shd.z<1.5){float sf=sL/shd.y;transformed.y+=shd.x*(shd.y-sL);
#ifdef USE_UV
 vUv=(uvTransform*vec3(mix(stop.xy,uv,sf),1.0)).xy;
#endif
#ifdef USE_LIGHTMAP
 vUv2=(uv2Transform*vec3(mix(stop.zw,uv2,sf),1.0)).xy;
#endif
 if(uShP<=0.0)transformed=vec3(0.0);}
 else transformed.y-=sL-0.02;}`;
const CMP='vec3 cmpL(vec3 l){float y=max(dot(l,vec3(0.2126,0.7152,0.0722)),1e-6);return l*pow(y/uE,uG-1.0);}';
function patchMat(m,vl,vo,cg,sd){m.onBeforeCompile=sh=>{sh.uniforms.uE=UNI.uE;sh.uniforms.uG=UNI.uG;
 if(sd){sh.uniforms.uShP=UNI.uShP;sh.vertexShader='attribute vec3 shd;attribute vec4 stop;uniform float uShP;\n'+sh.vertexShader.replace('#include <begin_vertex>',SHV);}
 if(cg){sh.uniforms.uCau={value:compRT('c:'+cg).texture};sh.uniforms.uCauT={value:cauTex};sh.uniforms.uCauP={value:new THREE.Vector3(...CAU.p)};sh.uniforms.uCauK={value:new THREE.Vector4(...CAU.k)};   // cg：G1 のまっすぐ届く光のアトラス
  sh.vertexShader='varying vec3 vWC;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvWC=(modelMatrix*vec4(transformed,1.0)).xyz;');}
 sh.fragmentShader='uniform float uE;uniform float uG;'+(vo?'varying vec3 vOrig;':'')+(cg?CAUGL:'')+CMP+sh.fragmentShader;
 if(vo)sh.vertexShader='attribute vec3 vorig;varying vec3 vOrig;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvOrig=vorig;');   // 元の頂点の色は縮めた後に掛ける（先に掛けると暗い色が持ち上がる：電気ケトルが白くなっていた）
 if(vl)sh.fragmentShader=sh.fragmentShader.replace('#include <color_fragment>','diffuseColor.rgb*=cmpL(vColor)'+(vo?'*vOrig':'')+';');
 else sh.fragmentShader=sh.fragmentShader.replace('reflectedLight.indirectDiffuse += lightMapTexelToLinear( lightMapTexel ).rgb * lightMapIntensity;','reflectedLight.indirectDiffuse+=cmpL((lightMapTexelToLinear(lightMapTexel).rgb'+(cg?'+texture2D(uCau,vUv2).rgb*cauF()':'')+')*lightMapIntensity);');};   // r128 の MeshBasicMaterial のライトマップの行
 m.customProgramCacheKey=()=>'cmp'+(vl?1:0)+(vo?1:0)+(sd?1:0)+(cg||'');return m;}
const glassMat=new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false});   // 窓のガラス（本番と同じく、昼夜で色だけ変える）
const entGlassMat=new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false,side:THREE.DoubleSide});   // 玄関ドアの窓（本番 wash.js の entGl：昼 0xdfe3e5・夜 0x101318）

// ===== PNG を自前で読む（ブラウザの画像の読み込みは、透明度で色の値を丸める端末がある＝RGBM が崩れる。16bit もそのまま読む）=====
async function decodePNG(buf){const dv=new DataView(buf);let p=8,w=0,h=0,depth=8,ct=6;const parts=[];
 while(p<buf.byteLength){const len=dv.getUint32(p),t=String.fromCharCode(dv.getUint8(p+4),dv.getUint8(p+5),dv.getUint8(p+6),dv.getUint8(p+7));
  if(t==='IHDR'){w=dv.getUint32(p+8);h=dv.getUint32(p+12);depth=dv.getUint8(p+16);ct=dv.getUint8(p+17);}else if(t==='IDAT')parts.push(new Uint8Array(buf,p+8,len));else if(t==='IEND')break;p+=12+len;}
 const raw=new Uint8Array(await new Response(new Blob(parts).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());
 const ch=ct===6?4:3,bpp=ch*depth/8,st=w*bpp,out=new Uint8Array(h*st);
 for(let y=0;y<h;y++){const f=raw[y*(st+1)],s=y*(st+1)+1,o=y*st;
  if(f===0){out.set(raw.subarray(s,s+st),o);continue;}
  for(let i=0;i<st;i++){const a=i>=bpp?out[o+i-bpp]:0,b=y?out[o-st+i]:0;let pr;
   if(f===1)pr=a;else if(f===2)pr=b;else if(f===3)pr=(a+b)>>1;else{const c=(y&&i>=bpp)?out[o-st+i-bpp]:0,q=a+b-c,pa=Math.abs(q-a),pb=Math.abs(q-b),pc=Math.abs(q-c);pr=(pa<=pb&&pa<=pc)?a:(pb<=pc?b:c);}
   out[o+i]=(raw[s+i]+pr)&255;}}
 return {w,h,depth,ch,data:out};}

// ===== 層の画像：取得（ファイルのまま持つ）→ GPU の画像（使い終わっても上限までは置いておく）=====
let IDX=null,netBytes=0,tick=0;
const byteCache=new Map(),texCache=new Map();   // ファイル名 → {p:Promise<ArrayBuffer>,n,used} ／ {tex,n,used}
async function fetchRetry(f,tries=4){for(let i=0;;i++){try{const x=await fetch(LMDIR+f);if(!x.ok)throw new Error(f+' '+x.status);return await x.arrayBuffer();}catch(e){if(i>=tries-1)throw e;await new Promise(z=>setTimeout(z,500*2**i));}}}   // 通信が途切れたときは間をあけて数回やり直す
function fetchBytes(f){let c=byteCache.get(f);if(!c){c={p:fetchRetry(f).then(b=>{c.n=b.byteLength;netBytes+=b.byteLength;return b;},e=>{if(byteCache.get(f)===c)byteCache.delete(f);throw e;}),n:0};byteCache.set(f,c);}c.used=++tick;return c.p;}   // 失敗したらキャッシュから外す（次に要るとき取り直す）
async function getTex(e){let c=texCache.get(e.file);if(c){c.used=++tick;return c.tex;}
 const buf=await fetchBytes(e.file);let w,h,data,type=THREE.UnsignedByteType,n;
 if(IDX.enc==='logj'){const bmp=await createImageBitmap(new Blob([buf],{type:'image/jpeg'}),{colorSpaceConversion:'none',premultiplyAlpha:'none'});w=bmp.width;h=bmp.height;
  const cv=document.createElement('canvas');cv.width=w;cv.height=h;const cx=cv.getContext('2d');cx.drawImage(bmp,0,0);data=new Uint8Array(cx.getImageData(0,0,w,h).data.buffer);bmp.close();n=w*h*4;}
 else{const im=await decodePNG(buf);w=im.w;h=im.h;
  if(im.depth===16){const s=im.data;data=new Uint16Array(w*h*4);type=THREE.HalfFloatType;for(let i=0,j=0;i<w*h;i++,j+=6){data[i*4]=s[j]<<8|s[j+1];data[i*4+1]=s[j+2]<<8|s[j+3];data[i*4+2]=s[j+4]<<8|s[j+5];data[i*4+3]=0x3c00;}n=w*h*8;}
  else{data=im.data;n=w*h*4;}}
 c=texCache.get(e.file);if(c)return c.tex;   // 同時に読んだとき
 const tex=new THREE.DataTexture(data,w,h,THREE.RGBAFormat,type);tex.minFilter=tex.magFilter=THREE.NearestFilter;tex.generateMipmaps=false;tex.flipY=false;tex.needsUpdate=true;
 tex.onUpdate=()=>{tex.image.data=null;};   // GPU へ送ったら CPU の画素は捨てる
 texCache.set(e.file,{tex,n,used:++tick});return tex;}
const vtxCache=new Map();   // 頂点の明るさのファイル → 読んだ画素（RGBM、小さいので取っておく）
async function getVtx(e){let c=vtxCache.get(e.file);if(!c){c=fetchBytes(e.file).then(decodePNG).then(im=>im.data);c.catch(()=>{if(vtxCache.get(e.file)===c)vtxCache.delete(e.file);});vtxCache.set(e.file,c);}return c;}
function evict(keep){
 let t=[...texCache.values()].reduce((s,c)=>s+c.n,0);
 for(const [f,c] of [...texCache].sort((a,b)=>a[1].used-b[1].used)){if(t<=TEX_BUDGET)break;if(keep.has(f))continue;c.tex.dispose();texCache.delete(f);t-=c.n;}
 let b=[...byteCache.values()].reduce((s,c)=>s+c.n,0);
 for(const [f,c] of [...byteCache].sort((a,b)=>a[1].used-b[1].used)){if(b<=BYTE_BUDGET)break;if(keep.has(f))continue;byteCache.delete(f);b-=c.n;}}

// ===== 足し合わせ：アトラスごとの半精度の画像へ、層を重み付きで足す（GPU で1回ずつ）=====
const comp={};   // アトラス → 描画先（WebGLRenderTarget）
function compRT(g){if(!comp[g]){const n=IDX.res[g.replace(/^c:/,'')];comp[g]=new THREE.WebGLRenderTarget(n,n,{type:THREE.HalfFloatType,format:THREE.RGBAFormat,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:false,stencilBuffer:false});comp[g].texture.generateMipmaps=false;}return comp[g];}
const cScene=new THREE.Scene(),cCam=new THREE.Camera();
const cMat=new THREE.ShaderMaterial({uniforms:{t:{value:null},mode:{value:1},w:{value:new THREE.Vector3()},p:{value:new THREE.Vector2()}},
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}',
 fragmentShader:`uniform sampler2D t;uniform int mode;uniform vec3 w;uniform vec2 p;varying vec2 vUv;
void main(){vec4 c=texture2D(t,vUv);vec3 v;
 if(mode==0)v=c.rgb;
 else if(mode==1)v=c.rgb*c.a*c.a;
 else{vec3 q=floor(c.rgb*255.0+0.5);v=exp2(p.x+(q-1.0)/254.0*(p.y-p.x))*step(0.5,q);}
 gl_FragColor=vec4(v*w,1.0);}`,
 blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneFactor,blendEquation:THREE.AddEquation,depthTest:false,depthWrite:false});
{const m=new THREE.Mesh(new THREE.PlaneGeometry(2,2),cMat);m.frustumCulled=false;cScene.add(m);}
function layerName(src,ds){return src+'@'+((COMBOS[src]||[]).map(d=>d+(ds[dk(d)]?'o':'c')).join('_')||'all');}
function wanted(st){const out=[];const add=(src,k,tint)=>out.push({L:layerName(src,st.DS),w:(tint||[1,1,1]).map(x=>x*k)});
 Object.keys(LS).forEach(k=>{if(st.LS[k])[k,...(WITH[k]||[])].forEach(q=>add(q,1,TINT[q]));});
 NATURAL.filter(s=>IDX.layers[layerName(s,st.DS)]).forEach(s=>{const t=SHADED.has(s.split('_')[1])?SHADE_T(st.shade):1;if(!st.night)add(s,t);else if(s.startsWith('sky_'))add(s,t*MOON,MOONC);});
 const items=[];out.forEach(({L,w})=>{const ent=IDX.layers[L];if(!ent)throw new Error('層がない '+L);const c=L.startsWith('g1d@');for(const g in ent)if(ent[g])items.push(g.startsWith('V_')?{v:g.slice(2),e:ent[g],w,c}:{g:c?'c:'+g:g,e:ent[g],w});});return items;}
const cur=()=>({LS:{...LS},DS:{...DS},night,shade:shadeP});
let ver=0,shown=null,stat={};
async function recompose(){const v=++ver,st=cur(),t0=performance.now();const items=wanted(st);
 const texs=await Promise.all(items.map(it=>it.v?getVtx(it.e):getTex(it.e)));if(v!==ver)return false;
 const acc={};for(const g in VMESH)acc[g]=new Float32Array(((IDX.vn||{})[g]||0)*3);   // 頂点で焼く物：アトラスごとに点の明るさ（lux）を CPU で足す
 items.forEach((it,i)=>{if(!it.v)return;const a=acc[it.v],d=texs[i],w=it.w,k=it.e.max,cf=it.c?vCau(it.v):null;if(!a)return;for(let j=0,n=it.e.n;j<n;j++){const q=d[j*4+3]/255,s=q*q*k/255*(cf?cf[j]:1);a[j*3]+=d[j*4]*s*w[0];a[j*3+1]+=d[j*4+1]*s*w[1];a[j*3+2]+=d[j*4+2]*s*w[2];}});
 for(const g in VMESH)VMESH[g].forEach(m=>{const c=m.col.array,a=acc[g],id=m.vid;for(let j=0;j<id.length;j++){const b=id[j]*3;c[j*3]=a[b]||0;c[j*3+1]=a[b+1]||0;c[j*3+2]=a[b+2]||0;}m.col.needsUpdate=true;});
 const t1=performance.now(),ac=r.autoClear,rt0=r.getRenderTarget();r.autoClear=false;
 for(const g of [...Object.keys(IDX.res),...CAUG.map(x=>'c:'+x)]){r.setRenderTarget(compRT(g));r.setClearColor(0x000000,0);r.clear(true,false,false);
  items.forEach((it,i)=>{if(it.v||it.g!==g)return;const u=cMat.uniforms,e=it.e;u.t.value=texs[i];
   u.mode.value=IDX.enc==='h16'?0:IDX.enc==='rgbm'?1:2;const k=(IDX.enc==='rgbm'?e.max:1)/LMK;u.w.value.set(it.w[0]*k,it.w[1]*k,it.w[2]*k);u.p.value.set(e.lo||0,e.hi||0);r.render(cScene,cCam);});}
 r.setRenderTarget(rt0);r.autoClear=ac;r.getContext().finish();
 shown=st;applyShown();evict(new Set(items.map(it=>it.e.file)));
 stat.load=Math.round(t1-t0);stat.gpu=Math.round(performance.now()-t1);stat.layers=items.length;draw();showStat();prefetch();return true;}
// 1回の操作で変わりうる状態（ドア1枚・照明1つ・昼夜）の層のファイルを先に取っておく（GPU には送らない）
function prefetch(){const st=cur(),fs=new Set();const add=s=>{try{wanted(s).forEach(it=>{if(!texCache.has(it.e.file))fs.add(it.e.file);});}catch(e){}};   // 焼いていない組み合わせ（試しに焼いた一部の層だけのとき）は飛ばす
 Object.keys(DS).forEach(k=>add({...st,DS:{...st.DS,[k]:!st.DS[k]}}));Object.keys(LS).forEach(k=>add({...st,LS:{...st.LS,[k]:!st.LS[k]}}));add({...st,night:!st.night});
 [...fs].reduce((p,f)=>p.then(()=>fetchBytes(f)).catch(()=>{}),Promise.resolve());}
let pending=null;function changed(){if(!pending)pending=Promise.resolve().then(()=>{pending=null;return recompose();});return pending;}

// ===== 模型：材質は元の色・柄のまま、光はアトラスの1枚（uv2）から =====
let CAUG=[];const VCAU={};   // G1 のまっすぐ届く光の届くアトラス、頂点で焼く物の模様の係数（アトラス → 焼いた頂点ごと）
function vCau(g){if(VCAU[g])return VCAU[g];const n=(IDX.vn||{})[g]||0,f=new Float32Array(n),v=new THREE.Vector3();
 (VMESH[g]||[]).forEach(m=>{const p=m.pos;for(let j=0;j<m.vid.length;j++){v.fromArray(p,j*3);f[m.vid[j]]=cauF(v.x,v.y,v.z);}});return VCAU[g]=f;}
const DOORN={},LAMPM=[],DOORM=[],VMESH={},SHM=[];   // SHM：シェード   // VMESH：アトラス → 頂点で焼く物の形（{col:色の属性, vid:元の頂点の番号, orig:元の頂点の色}）   // ドア → {open:[物体],closed:[物体]}、照明器具の発光面、扉（タップの対象）
function info(o){for(;o;o=o.parent)if(o.userData&&o.userData.atlas)return o.userData;return null;}
function setupModel(root){const mc=new Map();
 root.traverse(o=>{if(o.userData&&o.userData.door){const d=dk(o.userData.door);(DOORN[d]=DOORN[d]||{open:[],closed:[]})[o.userData.state].push(o);}
  if(!o.isMesh)return;const u=info(o),m=o.material;
  if(!u){o.material=glassMat;return;}
  if(m.userData&&m.userData.entglass){o.material=entGlassMat;return;}   // 玄関ドアの窓：本番の entGl と同じく焼いた明るさを使わない
  const vl=!!u.vlit,sd=!!u.shadeobj,key=m.uuid+'|'+u.atlas+'|'+vl+'|'+sd;let nm=mc.get(key);if(sd)SHM.push(o);
  if(vl){const g=o.geometry,vid=g.attributes._vid,n=vid.count,id=new Int32Array(n);for(let j=0;j<n;j++)id[j]=Math.round(vid.getX(j));
   const ca=g.attributes.color_1||g.attributes.color,cs=ca&&ca.normalized?({Uint8Array:255,Uint16Array:65535}[ca.array.constructor.name]||1):1,lin=v=>v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4),orig=m.userData&&m.userData.vcol&&ca?Float32Array.from({length:n*3},(_,j)=>lin(ca.array[Math.floor(j/3)*ca.itemSize+j%3]/cs)):null;   // 元の頂点の色（縮めた明るさに掛ける）。まとめた物では最後の色（COLOR_1）が元の色。色の数値は画面の色なので線形へ（材質の色と同じ扱い）
   if(g.attributes.color_1)g.deleteAttribute('color_1');if(orig)g.setAttribute('vorig',new THREE.BufferAttribute(orig,3));
   const col=new THREE.BufferAttribute(new Float32Array(n*3),3);g.setAttribute('color',col);g.deleteAttribute('_vid');
   let pos=null;if(CAUG.includes(u.atlas)){o.updateWorldMatrix(true,false);const pa=g.attributes.position,v=new THREE.Vector3();pos=new Float32Array(n*3);for(let j=0;j<n;j++){v.fromBufferAttribute(pa,j).applyMatrix4(o.matrixWorld);v.toArray(pos,j*3);}}   // G1 の模様のための点の位置
   (VMESH[u.atlas]=VMESH[u.atlas]||[]).push({col,vid:id,pos});}
  const vo=vl&&!!o.geometry.attributes.vorig;
  if(!nm){nm=new THREE.MeshBasicMaterial({color:m.color.clone(),map:m.map||null,vertexColors:vl||!!(m.userData&&m.userData.vcol),side:m.side,transparent:m.transparent,opacity:m.opacity,alphaTest:m.alphaTest,depthWrite:m.depthWrite,
    lightMap:vl?null:compRT(u.atlas).texture,lightMapIntensity:LMK});patchMat(nm,vl,vo,!vl&&CAUG.includes(u.atlas)?u.atlas:null,sd);if(nm.map)nm.map.anisotropy=r.capabilities.getMaxAnisotropy();mc.set(key,nm);}   // 異方性フィルタは本番と同じ（無いと斜めに見た柄が筋状につぶれる：テレビボードの前板）
  o.material=nm;
  if(m.userData&&m.userData.lamp)LAMPM.push({o,k:m.userData.lamp,off:nm,on:new THREE.MeshBasicMaterial({color:m.userData.lamp==='a5'?sRGB(0xffb066).multiplyScalar(EXPO.night*(m.transparent?0.5:0.9)):m.color.clone().multiplyScalar(EMIT),side:m.side,transparent:m.transparent,opacity:m.transparent?Math.max(m.opacity,0.9):m.opacity})});
  if(u.door)DOORM.push(o);});
 scene.add(root);root.updateMatrixWorld(true);
 SHM.forEach(o=>{const g=o.geometry;g.applyMatrix4(o.matrixWorld);o.position.set(0,0,0);o.quaternion.identity();o.scale.set(1,1,1);scene.add(o);   // 家全体の座標に直す（上下に動かすのは y）
  const p=g.attributes.position,s=g.attributes._shd,u=g.attributes.uv,u2=g.attributes.uv2,n=p.count,st=new Float32Array(n*4);
  for(let i=0;i<n;i++){let j=i;if(s.getZ(i)>0.5&&s.getZ(i)<1.5&&s.getX(i)>1e-4)for(let k=0;k<n;k++)if(s.getZ(k)>0.5&&s.getZ(k)<1.5&&s.getX(k)<1e-4&&Math.abs(p.getX(k)-p.getX(i))<1e-3&&Math.abs(p.getZ(k)-p.getZ(i))<1e-3){j=k;break;}   // 同じ縦の線の上の端の点
   st[i*4]=u?u.getX(j):0;st[i*4+1]=u?u.getY(j):0;st[i*4+2]=u2.getX(j);st[i*4+3]=u2.getY(j);}
  g.setAttribute('shd',s);g.deleteAttribute('_shd');g.setAttribute('stop',new THREE.BufferAttribute(st,4));});}
function applyShown(){const s=shown;
 for(const d in DOORN){DOORN[d].open.forEach(o=>o.visible=s.DS[d]);DOORN[d].closed.forEach(o=>o.visible=!s.DS[d]);}
 LAMPM.forEach(l=>l.o.material=s.LS[l.k]?l.on:l.off);
 r.toneMappingExposure=1/(s.night?EXPO.night:EXPO.day);UNI.uE.value=s.night?EXPO.night:EXPO.day;UNI.uShP.value=s.shade;UNI.uG.value=s.night?GAM.night:GAM.day;
 glassMat.color.copy(sRGB(s.night?0x141c28:0xcfdfec));entGlassMat.color.copy(sRGB(s.night?0x101318:0xdfe3e5));scene.background=sRGB(s.night?0x0b1018:0xcfdfec);}

// ===== 移動範囲（本番の ui.js と同じ。範囲は本番から書き出した move.json）=====
let MOVE,MB,MO;
const DSv=k=>!!DS[k];   // 試作のドア以外は閉じたまま
function updMove(){MB=MOVE.boxes.filter(x=>!x.door||DSv(x.door));MO=MOVE.obs.filter(x=>(!x.shut||!DSv(x.shut))&&(!x.opn||DSv(x.opn)));}
const inB=(x,q,m)=>{const b=x.b;return q.x>=b[0]-m&&q.x<=b[1]+m&&q.y>=b[2]&&q.y<=b[3]&&q.z>=b[4]-m&&q.z<=b[5]+m;};
const okPos=q=>MB.some(b=>inB(b,q,0))&&!MO.some(b=>inB(b,q,MOVE.wallMargin));
function toggleDoor(k){const was=okPos(cam.position);DS[k]=!DS[k];updMove();if(was&&!okPos(cam.position)){DS[k]=!DS[k];updMove();return;}changed();}
const rcast=new THREE.Raycaster();
function tapAt(x,y){cam.rotation.set(pitch,yaw,0);cam.updateMatrixWorld();rcast.setFromCamera({x:x/window.innerWidth*2-1,y:-(y/window.innerHeight)*2+1},cam);rcast.far=80;
 const vis=o=>{for(;o;o=o.parent)if(!o.visible)return false;return true;};
 const h=rcast.intersectObjects(DOORM,false).find(i=>vis(i.object));if(!h)return;const u=info(h.object),k=dk(u.door);
 rcast.far=h.distance-0.003;   // 手前に壁などがあれば開閉しない（ドアの枠・透明な物は除く）
 if(rcast.intersectObjects(scene.children,true).some(i=>{const v=info(i.object);return vis(i.object)&&v&&v.atlas!==u.atlas&&!(i.object.material.transparent&&i.object.material.opacity<0.5);}))return;
 toggleDoor(k);}

// ===== 画面：視点・昼夜・照明・シェード・検証（本番と同じ部品）=====
let VIEWS=[];
function clearView(){$('viewRow').querySelectorAll('button.on').forEach(x=>mark(x,false));$('viewLbl').textContent='';}
function setView(lb){const v=MOVE.views[lb];look(...v);$('viewRow').querySelectorAll('button').forEach(x=>mark(x,x.textContent===lb));$('viewLbl').textContent=lb;}
function buildUI(){
 const vr=$('viewRow');vr.innerHTML='';['リビング','キッチン','寝室','WIC','書斎','2F廊下','洗面脱衣','浴室','玄関','トイレ'].forEach(lb=>{const b=document.createElement('button');b.textContent=lb;b.onclick=()=>{setView(lb);openSheet(null);};vr.appendChild(b);});
 const box=$('indList');LG.forEach(([rn,items])=>{const rw=document.createElement('div');rw.className='irow';rw.dataset.room=rn;const t=document.createElement('span');t.className='rn';t.textContent=rn;rw.appendChild(t);
  const c=document.createElement('div');c.className='chips';items.forEach(([lb,k])=>{const b=document.createElement('button');b.className='tg';b.setAttribute('role','switch');b.innerHTML='<i></i>'+lb;b.dataset.k=k;b.onclick=()=>{LS[k]=!LS[k];syncLights();changed();};c.appendChild(b);});rw.appendChild(c);box.appendChild(rw);});
 const local=/^(localhost|127\.0\.0\.1)$/.test(location.hostname);   // 比較用の画像（bake/work/）は手元のサーバーでだけ選べる
 const sel=$('lmSel');[['','stg/lm（公開用）'],...(local?['h16','rgbm','logj']:[]).flatMap(e=>[1,2,4].map(k=>[e+'_r'+k,{h16:'半精度',rgbm:'RGBM',logj:'対数JPEG'}[e]+'・'+{1:'原寸',2:'1/2',4:'1/4'}[k]]))].forEach(([v,l])=>{const o=document.createElement('option');o.value=v;o.textContent=l;sel.appendChild(o);});
 sel.value=LMV;sel.onchange=()=>{const q=new URLSearchParams(location.search);if(sel.value)q.set('lm',sel.value);else q.delete('lm');location.search=q.toString();};}
function syncLights(){const ks=Object.keys(LS),n=ks.filter(k=>LS[k]).length;mark($('tAllOn'),n===ks.length);mark($('tAllOff'),n===0);$('bLight').classList.toggle('lit',n>0);$('indList').querySelectorAll('button[data-k]').forEach(b=>mark(b,LS[b.dataset.k]));}
function setAll(v){Object.keys(LS).forEach(k=>LS[k]=v);syncLights();changed();}
$('tAllOn').onclick=()=>setAll(true);$('tAllOff').onclick=()=>setAll(false);
let openK=null;
// いまいる部屋（本番の ui.js の curRoom と同じ。寸法は move.json の room）。照明のパネルは、いまの部屋の照明だけを出す
function curRoom(){const p=cam.position,G=MOVE.room;if(!G)return null;const EN=G.EN,B=G.B,in2=(x0,x1,z0,z1)=>p.x>=x0&&p.x<=x1&&p.z>=z0&&p.z<=z1;
 if(p.y>G.FL2){if(p.x>=G.VX&&p.z>=G.VZ)return 'リビング';if(p.x>G.BX&&p.z>G.BZ0)return p.z<G.WZ?'WIC':'書斎';return '寝室';}
 if(in2(G.WX,EN.TX1,EN.Z0,EN.TZ1))return 'トイレ';
 if(in2(G.CX0,G.CX1,G.PZ1,EN.Z1)||in2(EN.X1,G.CX1,EN.Z0,EN.Z1)||in2(G.WX,EN.X1,EN.KZ0,EN.Z1))return '玄関';
 if(in2(B.X0,B.X1,B.Z0,B.Z1))return '浴室';
 if(in2(G.WX,G.LW,G.DZ0,G.SZ1))return '洗面脱衣';
 if(in2(0,G.W,0,G.D))return p.z<G.VZ?'キッチン':'リビング';
 return null;}
let allRooms=false;   // 「すべての部屋」の一覧（照明のパネルを開き直すと、いまの部屋だけに戻る）
function renderInd(){const cr=curRoom(),rm=allRooms?null:cr;$('roomLbl').textContent=rm||'すべての部屋';$('tAllRooms').textContent=allRooms?cr+'だけ':'すべての部屋';$('tAllRooms').hidden=!cr;$('indList').querySelectorAll('.irow').forEach(r=>{r.hidden=!!rm&&r.dataset.room!==rm;r.querySelector('.rn').hidden=!!rm;});}
$('tAllRooms').onclick=()=>{allRooms=!allRooms;renderInd();};
function openSheet(k){if(k&&openK===k)k=null;if(k==='light'&&openK!=='light')allRooms=false;openK=k;$('sheet').hidden=!k;['view','light','shade','trial'].forEach(n=>$('p_'+n).hidden=n!==k);mark($('bView'),k==='view');mark($('bLight'),k==='light');mark($('bShade'),k==='shade');mark($('bTrial'),k==='trial');if(k==='trial')showStat();if(k==='light')renderInd();}
$('bView').onclick=()=>openSheet('view');$('bLight').onclick=()=>openSheet('light');$('bShade').onclick=()=>openSheet('shade');$('bTrial').onclick=()=>openSheet('trial');
function setNight(v){night=v;const b=$('bDay');b.classList.toggle('night',v);b.setAttribute('aria-label',v?'夜（押すと昼）':'昼（押すと夜）');changed();}
$('bDay').onclick=()=>setNight(!night);
function shadeLabel(p){$('shadeOut').textContent=p===0?'全開':Math.round(p*100)+'%閉';}
$('shade').oninput=e=>{shadeP=Number(e.target.value)/100;shadeLabel(shadeP);changed();};
// 検証の数字：画像の容量と、GPU に置いている量の見積もり（MB）
const MB_=n=>(n/2**20).toFixed(1);
function memory(){const o={rt:0,lay:0,layN:texCache.size,tex:0,geo:0,bytes:0};for(const g in comp)o.rt+=comp[g].width*comp[g].height*8;for(const g in VMESH)VMESH[g].forEach(m=>o.rt+=m.col.array.byteLength);texCache.forEach(c=>o.lay+=c.n);byteCache.forEach(c=>o.bytes+=c.n);
 const ts=new Set(),gs=new Set();scene.traverse(x=>{if(!x.isMesh)return;gs.add(x.geometry);const m=x.material;if(m.map)ts.add(m.map);});
 ts.forEach(t=>{const i=t.image;if(i)o.tex+=i.width*i.height*4*4/3;});gs.forEach(g=>{for(const k in g.attributes)o.geo+=g.attributes[k].array.byteLength;if(g.index)o.geo+=g.index.array.byteLength;});return o;}
function showStat(){if(!IDX||openK!=='trial')return;const m=memory(),hp=performance.memory?performance.memory.usedJSHeapSize:0;
 $('stat').textContent=`画像：${IDX.enc}・1/${IDX.scale}（全${Object.keys(IDX.layers).length}層 ${MB_(IDX.bytes)}MB）
取得 ${MB_(netBytes)}MB・手元に ${MB_(m.bytes)}MB
GPU：まとめた画像 ${MB_(m.rt)}・層 ${m.layN}枚 ${MB_(m.lay)}・柄 ${MB_(m.tex)}・形 ${MB_(m.geo)}
いまの層 ${stat.layers}枚：読み込み ${stat.load}ms・足し合わせ ${stat.gpu}ms
描画 ${r.info.render.calls}回・三角形 ${Math.round(r.info.render.triangles/1000)}k${hp?`・JS ${MB_(hp)}MB`:''}`;}

// 全画面（非対応のブラウザではボタンを隠す）
const de=document.documentElement,fsReq=de.requestFullscreen||de.webkitRequestFullscreen,fsExit=document.exitFullscreen||document.webkitExitFullscreen,fsEl=()=>document.fullscreenElement||document.webkitFullscreenElement;
if(!fsReq)$('tFs').hidden=true;
$('tFs').onclick=()=>{if(fsEl())fsExit.call(document);else fsReq.call(de);};
const onFs=()=>{const l=fsEl()?'全画面解除':'全画面';$('tFs').setAttribute('aria-label',l);$('tFs').title=l;mark($('tFs'),!!fsEl());};
document.addEventListener('fullscreenchange',onFs);document.addEventListener('webkitfullscreenchange',onFs);

// 移動：前後左右＋上下。家具・階段は通り抜け、壁・閉じたドア・天井は越えない（本番の ui.js と同じ）
const keys={f:0,b:0,l:0,r:0,u:0,d:0},joy={f:0,r:0},SPEED=1.8,VSPEED=1.2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let moving=false,last=0;
function step(t){const dt=clamp((t-last)/1000,0,0.05);last=t;const mf=keys.f-keys.b+joy.f,mr=keys.r-keys.l+joy.r,mu=keys.u-keys.d;if(!mf&&!mr&&!mu){moving=false;if(openK==='light')renderInd();return;}   // 止まったら、照明のパネルの部屋を更新
const p=cam.position,o=p.clone();
if(mf||mr){const h=Math.hypot(mf,mr),n=h/Math.min(1,h),fx=-Math.sin(yaw),fz=-Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw);p.x+=(fx*mf+rx*mr)/n*SPEED*dt;p.z+=(fz*mf+rz*mr)/n*SPEED*dt;}
p.y+=mu*VSPEED*dt;
if(okPos(o)&&!okPos(p)){const d=p.clone().sub(o);p.copy(o);['x','z','y'].forEach(k=>{const v=p[k];p[k]+=d[k];if(!okPos(p))p[k]=v;});}
draw();requestAnimationFrame(step);}
function startMove(){clearView();if(!moving){moving=true;last=performance.now();requestAnimationFrame(step);}}
document.querySelectorAll('#move button[data-k]').forEach(b=>{const k=b.dataset.k;
b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys[k]=1;b.classList.add('on');startMove();});
const off=()=>{keys[k]=0;b.classList.remove('on');};
b.addEventListener('pointerup',off);b.addEventListener('pointercancel',off);b.addEventListener('lostpointercapture',off);
b.addEventListener('contextmenu',e=>e.preventDefault());b.addEventListener('touchstart',e=>e.preventDefault(),{passive:false});});
{const jb=$('joy'),kn=jb.querySelector('.knob'),DEAD=0.10;let pid=null;
 const set=e=>{const rc=jb.getBoundingClientRect(),RAD=rc.width*0.34;let dx=e.clientX-(rc.left+rc.width/2),dy=e.clientY-(rc.top+rc.height/2);const d=Math.hypot(dx,dy);if(d>RAD){dx*=RAD/d;dy*=RAD/d;}
  kn.style.transform=`translate(${dx}px,${dy}px)`;const m=Math.min(1,d/RAD),a=m<DEAD?0:1;const dd=Math.hypot(dx,dy);joy.r=dd?dx/dd*a:0;joy.f=dd?-dy/dd*a:0;if(joy.r||joy.f)startMove();};
 const end=()=>{pid=null;joy.f=joy.r=0;kn.style.transform='';jb.classList.remove('on');};
 jb.addEventListener('pointerdown',e=>{e.preventDefault();pid=e.pointerId;jb.setPointerCapture(pid);jb.classList.add('on');set(e);});
 jb.addEventListener('pointermove',e=>{if(e.pointerId===pid)set(e);});
 ['pointerup','pointercancel','lostpointercapture'].forEach(t=>jb.addEventListener(t,e=>{if(e.pointerId===pid)end();}));
 jb.addEventListener('touchstart',e=>e.preventDefault(),{passive:false});jb.addEventListener('contextmenu',e=>e.preventDefault());}
r.domElement.addEventListener('touchstart',e=>e.preventDefault(),{passive:false});
document.addEventListener('contextmenu',e=>e.preventDefault());
const keyMap={ArrowUp:'f',KeyW:'f',ArrowDown:'b',KeyS:'b',ArrowLeft:'l',KeyA:'l',ArrowRight:'r',KeyD:'r',KeyE:'u',PageUp:'u',KeyQ:'d',PageDown:'d'};
const shiftMap={ArrowUp:'u',ArrowDown:'d'};   // Shift＋↑／↓：上下に移動
window.addEventListener('keydown',e=>{const k=(e.shiftKey&&shiftMap[e.code])||keyMap[e.code];if(!k)return;e.preventDefault();if(shiftMap[e.code])keys[e.shiftKey?keyMap[e.code]:shiftMap[e.code]]=0;keys[k]=1;startMove();});   // 押したまま Shift を変えたら、もう片方の動きは止める
window.addEventListener('keyup',e=>{const k=keyMap[e.code];if(k)keys[k]=0;if(shiftMap[e.code])keys[shiftMap[e.code]]=0;});
window.addEventListener('blur',()=>{for(const k in keys)keys[k]=0;});
// ドラッグで見回し、ピンチ・ホイールで拡大縮小、タップでドアの開閉
const cvs=r.domElement,pts=new Map();let pinch=0,tap=null;
function setFov(f){cam.fov=Math.max(40,Math.min(100,f));cam.updateProjectionMatrix();draw();}
cvs.addEventListener('pointerdown',e=>{tap=(pts.size===0&&e.button===0)?{id:e.pointerId,x:e.clientX,y:e.clientY}:null;});
cvs.addEventListener('pointermove',e=>{if(tap&&e.pointerId===tap.id&&Math.hypot(e.clientX-tap.x,e.clientY-tap.y)>8)tap=null;});
cvs.addEventListener('pointerup',e=>{if(tap&&e.pointerId===tap.id&&!moving){if(openK)openSheet(null);else tapAt(e.clientX,e.clientY);}tap=null;});
cvs.addEventListener('pointercancel',()=>{tap=null;});
cvs.addEventListener('pointerdown',e=>{pts.set(e.pointerId,[e.clientX,e.clientY]);cvs.setPointerCapture(e.pointerId);if(pts.size===2){const [a,b]=[...pts.values()];pinch=Math.hypot(a[0]-b[0],a[1]-b[1]);}});
cvs.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId))return;clearView();const prev=pts.get(e.pointerId);pts.set(e.pointerId,[e.clientX,e.clientY]);if(pts.size===1){yaw+=(e.clientX-prev[0])*0.004;pitch=Math.max(-1.3,Math.min(1.3,pitch+(e.clientY-prev[1])*0.004));draw();}else if(pts.size===2){const [a,b]=[...pts.values()];const d=Math.hypot(a[0]-b[0],a[1]-b[1]);setFov(cam.fov-(d-pinch)*0.1);pinch=d;}});
const endP=e=>{pts.delete(e.pointerId);};
cvs.addEventListener('pointerup',endP);cvs.addEventListener('pointercancel',endP);
cvs.addEventListener('wheel',e=>{e.preventDefault();clearView();setFov(cam.fov+e.deltaY*0.03);},{passive:false});
window.addEventListener('resize',()=>{r.setSize(window.innerWidth,window.innerHeight);cam.aspect=window.innerWidth/window.innerHeight;cam.updateProjectionMatrix();draw();});

// ===== 読み込み：一覧と移動範囲 → 模型 → 最初の状態の層（そろうまで読み込み中の表示）。開いたとき：寝室の視点・昼・照明すべて消灯・ドアは閉 =====
const bar=$('ldBar'),ldBox=$('loading');
function fail(e){console.error(e);ldBox.querySelector('span').textContent='読み込みに失敗しました';ldBox.querySelector('.spin').hidden=true;}
// 確認用（自動で撮るとき）：T.set({night,LS,DS,shade})→まとめ終わるまで待つ、T.view(名前)、T.pose([x,y,z,yaw,pitch,fov])
window.T={async set(s){if('night' in s)night=s.night;if('shade' in s)shadeP=s.shade;Object.assign(LS,s.LS||{});Object.assign(DS,s.DS||{});updMove();syncLights();return changed();},view:setView,pose:a=>look(...a),memory,stat:()=>stat};
(async()=>{
 const [idx,mv]=await Promise.all([fetch(LMDIR+'index.json').then(x=>x.json()),fetch('move.json').then(x=>x.json())]);IDX=idx;COMBOS=idx.combos||OLDC;CAUG=[...new Set(Object.entries(idx.layers).filter(([L])=>L.startsWith('g1d@')).flatMap(([,e])=>Object.keys(e).filter(g=>e[g]&&!g.startsWith('V_'))))];MOVE=mv;updMove();buildUI();bar.style.width='10%';
 const g=await new Promise((res,rej)=>new THREE.GLTFLoader().load('house.glb',res,e=>{if(e.total)bar.style.width=(10+e.loaded/e.total*50)+'%';},rej));
 setupModel(g.scene);bar.style.width='70%';
 ready=true;syncLights();shadeLabel(0);setView('寝室');
 await recompose();bar.style.width='100%';
 ldBox.classList.add('done');setTimeout(()=>ldBox.remove(),400);
})().catch(fail);
