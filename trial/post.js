// 試作：寝室の焼き込み。焼き込みのデータ（bake/bedroom.js の BAKE）があれば寝室の周りを焼いた光で照らす。無ければ exportBake() で Blender に渡す形を書き出せる
// 実時間の光（照明・窓の光・補助光）は使わない（焼いた光と、周りの景色の映り込み＝環境マップで照らす）
const ALL_LIGHTS=[];scene.traverse(o=>{if(o.isLight)ALL_LIGHTS.push(o);});
r.toneMapping=THREE.NeutralToneMapping;   // 材質の色を保ちやすいトーンマッピング（明るい所だけを丸める）

// ===== 書き出し（Blender で焼き込むための形・材質の色・照明） =====
// 照明の組（LS のキー）ごとの仕様：光束（1灯あたり lm）・色温度（K）・器具の種類（down：ダウンライト、bracket：上下に光る箱）。照明仕様書から
const BAKE_LAMPS={bdl:{lm:440,K:2700,kind:'down'},bbr:{lm:318,K:2700,kind:'bracket'},j1:{lm:440,K:2700,kind:'down'},l1:{lm:440,K:5000,kind:'down'},k1:{lm:440,K:3500,kind:'down'}};
function texAvg(t){const im=t&&t.image;if(!im||!im.width)return [1,1,1];const c=document.createElement('canvas'),n=16;c.width=c.height=n;const g=c.getContext('2d');g.drawImage(im,0,0,n,n);const d=g.getImageData(0,0,n,n).data;const a=[0,0,0];
 for(let i=0;i<d.length;i+=4)for(let j=0;j<3;j++)a[j]+=THREE.ColorManagement.toWorkingColorSpace?Math.pow(d[i+j]/255,2.2):d[i+j]/255;return a.map(v=>v/(n*n));}   // 柄の平均の色（線形）
function albedo(m){const c=m.color?[m.color.r,m.color.g,m.color.b]:[0.8,0.8,0.8],t=m.map&&!m.map.isDataTexture?texAvg(m.map):[1,1,1];return c.map((v,i)=>Math.min(0.95,v*t[i]));}
const visibleChain=o=>{for(;o;o=o.parent)if(!o.visible)return false;return true;};
function bakeExcluded(m){return m.isMeshBasicMaterial||m.transparent||m===glassMat;}   // 光る部品・ガラス・半透明は焼き込みの形に入れない（光を遮らない）
async function exportBake(){
 const keys=Object.keys(LS),save=Object.assign({},LS),sn=night;night=true;const grp=new Map();
 keys.forEach(k=>{keys.forEach(j=>LS[j]=j===k);envAll();ALL_LIGHTS.forEach(l=>{if((l.isSpotLight||l.isPointLight)&&l.intensity>0&&!grp.has(l))grp.set(l,k);});});
 Object.assign(LS,save);night=sn;envAll();
 const v=new THREE.Vector3(),w=new THREE.Vector3(),lamps=[];
 grp.forEach((k,l)=>{if(!BAKE_LAMPS[k])return;l.getWorldPosition(v);const d=l.isSpotLight?l.target.getWorldPosition(w).sub(v).normalize():new THREE.Vector3(0,-1,0);lamps.push({group:k,pos:v.toArray(),dir:d.toArray(),angle:l.angle||0});});
 const meshes=[],bufs=[];let off=0;
 const add=(o,key,target,state)=>{const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();o.updateWorldMatrix(true,false);g.applyMatrix4(o.matrixWorld);if(!g.attributes.normal)g.computeVertexNormals();
  const p=g.attributes.position.array,n=g.attributes.normal.array;meshes.push({key,target,state,albedo:albedo(o.material),count:p.length/3,off});bufs.push(new Float32Array(p),new Float32Array(n));off+=p.length*2;g.dispose();};
 scene.children.forEach(o=>{if(o.isMesh&&!o.userData.dyn&&!bakeExcluded(o.material)&&o.visible)add(o,o.name,o.name.startsWith('bed:'),null);});
 Object.entries(DOORS).forEach(([k,d])=>[['O',d.gO],['C',d.gC]].forEach(([st,g])=>{const tgt=BAKE_DOORS.includes(k);if(!tgt&&!visibleChain(g))return;let i=0;
  g.traverse(o=>{if(!o.isMesh)return;const idx=i++;if(bakeExcluded(o.material))return;add(o,'door:'+k+':'+st+':'+idx,tgt,tgt?{door:k,open:st==='O'}:null);});}));
 const head={meshes,lamps,lampSpec:BAKE_LAMPS,room:{min:BAKE_ROOM.min.toArray(),max:BAKE_ROOM.max.toArray()},doors:BAKE_DOORS};
 const blob=new Blob(bufs.flatMap(b=>[b]));
 await fetch('/save?path=bake/work/scene.bin',{method:'POST',body:blob});await fetch('/save?path=bake/work/scene.json',{method:'POST',body:JSON.stringify(head)});
 return {meshes:meshes.length,targets:meshes.filter(m=>m.target).length,tris:off/18,lamps:lamps.length};}

// ===== 焼き込みのデータが無いとき：仮の照らし方（全体を均一に照らす） =====
if(typeof BAKE==='undefined'){ALL_LIGHTS.forEach(l=>l.visible=false);const amb=new THREE.HemisphereLight(0xffffff,0x888888,2.5);scene.add(amb);applyEnvAll();}

// ===== 焼き込みのデータがあるとき：寝室の周りを焼いた光で照らす =====
// 焼いた層の照度（lux）× 光の色 × 点灯・開閉の状態 を足して、物理ベースの材質の「環境からの拡散光」として入れる（照りの分だけ拡散光を減らすのは three.js の計算のまま）
const KCOL={2700:0xffc68e,3500:0xffd9b4,5000:0xfff3e8};   // 色温度ごとの光の色（全部屋共通の決まり）。明るさは光束で決めるので、色は明るさ1にそろえて使う
const lumColor=hex=>{const c=new THREE.Color(hex),y=0.2126*c.r+0.7152*c.g+0.0722*c.b;return c.multiplyScalar(1/y);};
const SKY_COL=lumColor(0xf4f8ff),SUN_COL=lumColor(0xfff1dc),MOON_COL=lumColor(0xa8bcff),MOON=4e-5;   // 昼の空・太陽、夜の月明かり（空の層を暗く青くして使う）
const MAXL=32,LMU={lmTex:{value:null},lmN:{value:0},lmL:{value:new Int32Array(MAXL)},lmW:{value:Array.from({length:MAXL},()=>new THREE.Vector3())},lmP:{value:Array.from({length:MAXL},()=>new THREE.Vector3())}};
function lmPatch(sh){Object.assign(sh.uniforms,LMU);
 sh.fragmentShader=sh.fragmentShader.replace('#include <lightmap_pars_fragment>',`#include <lightmap_pars_fragment>
uniform highp sampler2DArray lmTex;uniform int lmN;uniform int lmL[${MAXL}];uniform vec3 lmW[${MAXL}];uniform vec3 lmP[${MAXL}];
vec3 zLM(){vec3 a=vec3(0.0);vec2 t=vec2(vLightMapUv.x,1.0-vLightMapUv.y);
 for(int i=0;i<${MAXL};i++){if(i>=lmN)break;vec3 e=texture(lmTex,vec3(t,float(lmL[i]))).rgb;vec3 p=lmP[i],v;
  if(p.z>0.5){vec3 q=e*2.0-1.0;v=sign(q)*(exp2(abs(q)*p.y)-1.0)*p.x;}else v=(exp2(e*p.y)-1.0)*p.x;a+=v*lmW[i];}
 return max(a,vec3(0.0));}`)
  .replace('#include <lights_fragment_maps>',THREE.ShaderChunk.lights_fragment_maps
   .replace(/#ifdef USE_LIGHTMAP[\s\S]*?#endif/,'')
   .replace('iblIrradiance += getIBLIrradiance( geometryNormal );','')
   .replace('#if defined( RE_IndirectDiffuse )','#if defined( RE_IndirectDiffuse )\n\tiblIrradiance += zLM();'));}
const LMMATS=new Map();   // 元の材質 → 焼き込み用の複製（昼夜などで変わる色は applyEnvAll のたびに元から写す）
let envRT=null,pmrem=null,cubeRT=null,cubeCam=null,BAKE_LAYERS=[];
function lmMat(m){let c=LMMATS.get(m);if(c)return c;c=m.clone();c.lightMap=LMDUMMY;c.onBeforeCompile=lmPatch;c.customProgramCacheKey=()=>'bakeLM';LMMATS.set(m,c);return c;}
const LMDUMMY=new THREE.DataTexture(new Uint8Array(4),1,1);LMDUMMY.channel=1;LMDUMMY.needsUpdate=true;
function syncLM(){LMMATS.forEach((c,m)=>{['color','emissive'].forEach(k=>m[k]&&c[k].copy(m[k]));c.opacity=m.opacity;c.visible=m.visible;c.emissiveIntensity=m.emissiveIntensity;});}
function lmWeights(){let n=0,key=0;
 const p=bedS.shadeP||0,tr=(1-p)+p*0.5;   // ハニカムシェードは閉めても5割の光を通す（全窓共通の開度）
 BAKE_LAYERS.forEach((L,i)=>{let w=null;const g=L.group;
  if(BAKE_LAMPS[g]){if(LS[g])w=lumColor(KCOL[BAKE_LAMPS[g].K]);}
  else if(g==='sky')w=night?MOON_COL.clone().multiplyScalar(MOON):SKY_COL.clone().multiplyScalar(tr);
  else if(g==='sun'){if(!night)w=SUN_COL.clone().multiplyScalar(tr);}
  if(w&&L.door&&!DS[L.door])w=null;
  if(!w)return;LMU.lmL.value[n]=i;LMU.lmW.value[n].set(w.r,w.g,w.b);LMU.lmP.value[n].set(L.s,L.k,L.signed?1:0);n++;key+=L.mean*(0.2126*w.r+0.7152*w.g+0.0722*w.b);});
 LMU.lmN.value=n;return key;}
function exposure(key){return Math.min(0.15,0.56/Math.pow(Math.max(key,1e-3),0.75));}   // 目の慣れ（明るいほど露出を下げる。暗い所では慣れきらない）
function captureEnv(){if(!cubeRT){cubeRT=new THREE.WebGLCubeRenderTarget(128,{type:THREE.HalfFloatType});cubeCam=new THREE.CubeCamera(0.05,60,cubeRT);scene.add(cubeCam);pmrem=new THREE.PMREMGenerator(r);}
 const b=HOUSE.bed;cubeCam.position.set(b.X0+b.W/2,HOUSE.ldk.FL2+1.2,b.Z0+b.D/2);scene.environment=null;cubeCam.update(r,scene);
 if(envRT)envRT.dispose();envRT=pmrem.fromCubemap(cubeRT.texture);scene.environment=envRT.texture;}
async function applyBake(){const res=BAKE.res,N=BAKE.layers.length,data=new Uint8Array(res*res*4*N),cv=document.createElement('canvas');cv.width=cv.height=res;const g=cv.getContext('2d',{willReadFrequently:true});
 for(let i=0;i<N;i++){const im=new Image();await new Promise((ok,ng)=>{im.onload=ok;im.onerror=ng;im.src=BAKE.layers[i].img;});g.clearRect(0,0,res,res);g.drawImage(im,0,0);data.set(g.getImageData(0,0,res,res).data,i*res*res*4);}   // decode() は裏のタブで待たされることがあるので onload で待つ
 const tx=new THREE.DataArrayTexture(data,res,res,N);tx.minFilter=THREE.LinearMipmapLinearFilter;tx.magFilter=THREE.LinearFilter;tx.generateMipmaps=true;tx.needsUpdate=true;LMU.lmTex.value=tx;BAKE_LAYERS=BAKE.layers;
 const setUV=(o,key)=>{const b=BAKE.uv[key];if(!b)return false;const u=Uint8Array.from(atob(b),c=>c.charCodeAt(0)),a=new Uint16Array(u.buffer);
  if(o.geometry.index)o.geometry=o.geometry.toNonIndexed();if(o.geometry.attributes.position.count*2!==a.length){console.warn('UVの数が合わない',key);return false;}
  o.geometry.setAttribute('uv1',new THREE.BufferAttribute(a,2,true));o.material=lmMat(o.material);return true;};
 let n=0;scene.children.forEach(o=>{if(o.isMesh&&o.name.startsWith('bed:')&&setUV(o,o.name))n++;});
 Object.entries(DOORS).forEach(([k,d])=>[['O',d.gO],['C',d.gC]].forEach(([st,gr])=>{let i=0;gr.traverse(o=>{if(!o.isMesh)return;const idx=i++;if(setUV(o,'door:'+k+':'+st+':'+idx))n++;});}));
 scene.traverse(o=>{if(o.isMesh&&o.material.isMeshBasicMaterial)o.material.toneMapped=false;});   // 光る部品・ガラスは露出の影響を受けない（見た目の色のまま）
 ALL_LIGHTS.forEach(l=>l.visible=false);
 return n;}
const _applyEnvAll=applyEnvAll;
applyEnvAll=function(){envAll();syncLM();const key=lmWeights();r.toneMappingExposure=exposure(key);captureEnv();draw();};
if(typeof BAKE!=='undefined')applyBake().then(n=>{console.log('焼き込みを適用',n,'個の形');applyEnvAll();});
