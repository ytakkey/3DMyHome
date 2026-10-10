// ===== 動かない部品を素材ごとに1つの形にまとめる（描画の回数を減らす）。動く部品（userData.dyn）は除く =====
function mergeStatic(scene){scene.updateMatrixWorld(true);const buckets=new Map(),olds=[];
 scene.traverse(o=>{if(!o.isMesh||o.userData.dyn)return;const keys=Object.keys(o.geometry.attributes).sort(),k=o.material.uuid+'|'+keys.join(',');
  let b=buckets.get(k);if(!b){b={m:o.material,keys,gs:[]};buckets.set(k,b);}
  const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);b.gs.push(g);olds.push(o);});
 olds.forEach(o=>{o.parent.remove(o);o.geometry.dispose();});
 buckets.forEach(b=>{const out=new THREE.BufferGeometry();
  b.keys.forEach(k=>{let n=0;b.gs.forEach(g=>n+=g.attributes[k].array.length);const arr=new Float32Array(n);let off=0;b.gs.forEach(g=>{arr.set(g.attributes[k].array,off);off+=g.attributes[k].array.length;});out.setAttribute(k,new THREE.BufferAttribute(arr,b.gs[0].attributes[k].itemSize));});
  b.gs.forEach(g=>g.dispose());scene.add(new THREE.Mesh(out,b.m));});}

// ===== 光の届く範囲（光源ごと） =====
// 範囲は家全体の座標の箱。箱の外では soft(m) の距離をかけて弱まり（soft は数1つ、または [東西・上下, 南北]）、それより外には届かない（壁や床を光が通り抜けないように）
function lightZones(){const {W,D,H1,FL2,H2,VX,VZ,TVX,PZ0,PZ1}=HOUSE.ldk,{X0:WX,LW,DZ0,DZ1,SZ0,SZ1,SX1,CX0,CX1}=HOUSE.wash,EN=HOUSE.entry,{X0:HX,Z0:HZ}=HOUSE.hall,{X0:BX,Z0:BZ,W:BW,D:BD,H:BH,doorA,doorB}=HOUSE.bed,e=0.3;   // e：外壁の外側の余裕（窓枠・サッシまで照らすため）
 return {
  f1:[[0,-e,-e],[W+e,H1,D+e],0.15],                         // 1階のLDK（天井まで。西の壁より西は含めない）
  f1N:[[0,-e,-e],[W+e,H1,PZ0],0.15],                        // 1階LDKの北側（仕切り壁まで）
  f1S:[[TVX,-e,PZ0],[W+e,H1,D+e],0.15],                     // 1階LDKの南側（リビング。テレビ壁・SG11Hより東。廊下を照らさないように北側と分ける）
  wash:[[WX-e,-e,DZ0],[LW,H1,DZ1],0.15],                    // 脱衣室（窓の自然光）
  datsu:[[WX-e,-e,DZ0],[LW,H1,DZ1],0.1],                    // 脱衣室（照明E1。洗面所・LDKへ漏れないよう、ぼかしは壁の厚さより狭く）
  sen:[[WX-e,-e,SZ0],[SX1,H1,SZ1],0.1],                     // 洗面所（照明D1）
  senNE:[[WX-e,-e,SZ0],[LW,H1,PZ0],0.1],                    // 洗面所の北東（仕切り壁の北側まで）
  ent:[[EN.X1,-e,EN.Z0],[CX1,H1,EN.Z1+0.15],0.1],          // 玄関ホール・土間（トイレの東の壁から東、玄関ドアの室内側の面まで。トイレ・洗面所・LDKへ漏れないよう、ぼかしは壁の厚さより狭く）
  entC:[[CX0,-e,PZ1],[CX1,H1,EN.Z0],0.1],                  // 廊下（洗面所とリビングの間）
  entK:[[WX,-e,EN.KZ0],[EN.X1,H1,EN.Z1+0.15],0.1],         // 土間収納（土間とは垂れ壁だけで仕切られている）
  void:[[VX,-e,VZ],[W+e,H2+e,D+e],[0.05,0.15]],            // 吹抜け（階段を含む、1階から2階の天井まで）。西（ウォークイン・書斎）へは漏れないよう東西のぼかしは狭く
  hall:[[HX-e,FL2,HZ-e],[W+e,H2+e,VZ],[0.15,0.05]],        // 2階廊下（南の寝室・ウォークインへ漏れないよう南北のぼかしは狭く。南の吹抜けは void が受け持つ）
  bed:[[BX-e,FL2,BZ],[BX+BW,FL2+BH+e,BZ+BD+e],[0.1,0.15]],  // 寝室（東はウォークイン・書斎へ漏れないよう、東の壁の面までで東西のぼかしは壁の厚さより狭く）
  hallNearBed:[[HX-e,FL2,HZ-e],[BX+doorB+0.4,H2,VZ],[0.6,0.05]],   // 寝室の入口から見える廊下（寝室の光が入口からこぼれる範囲。東西は0.6mかけて弱まる。南のウォークインへは漏らさない）
  bedNearHall:[[BX+doorA-0.4,FL2,BZ],[HOUSE.wic.X0-0.6,FL2+BH,BZ+1.0],0.6],  // 廊下から入口越しに見える寝室（廊下の光がこぼれる範囲。0.6mかけて弱まり、ウォークインの西の壁の面で0になる）
  wic:[[HOUSE.wic.X0,FL2,HOUSE.wic.Z0],[HOUSE.wic.X1,FL2+BH,HOUSE.wic.Z1],0.05],   // ウォークイン（照明L1。寝室・廊下・書斎・吹抜けへ漏れないよう、ぼかしは壁の厚さより狭く）
  study:[[HOUSE.study.X0,FL2,HOUSE.study.Z0],[HOUSE.study.X1,FL2+BH,HOUSE.study.Z1+e],0.05],   // 書斎（照明K1・窓の自然光）
  toi:[[WX-e,-e,EN.Z0],[EN.TX1,H1,EN.TZ1],0.1],              // 1階トイレ（照明G1。玄関・洗面所・土間収納へ漏れないよう、ぼかしは壁の厚さより狭く）
  bath:[[HOUSE.bath.X0,-e,HOUSE.bath.Z0],[HOUSE.bath.X1,HOUSE.bath.H,HOUSE.bath.Z1],0.1],   // 浴室（ダウンライト。脱衣室・LDKへ漏れないよう、ぼかしは壁の厚さより狭く）
  // 全体光（空・太陽・照り返し）用：部屋の境目でほとんどぼかさない
  f1G:[[WX-e,-e,-e],[W+e,H1,D+e],0.02],voidG:[[VX,-e,PZ0],[W+e,H2+e,D+e],0.02],hallG:[[HX-e,FL2,HZ-e],[W+e,H2+e,PZ0+0.0175],0.02],
  bedG:[[BX-e,FL2,BZ-0.0775],[HOUSE.study.X1+0.03,FL2+BH+e,BZ+BD+e],0.02]};}   // bedG は寝室・ウォークイン・書斎（東は吹抜けの壁の手前まで）   // 廊下用と寝室用は、寝室の入口の戸袋のへこみより廊下側（z≒3.55）でぼかしが半分ずつ重なってつながる（途切れも二重にもならない）。吹抜けの範囲は廊下の南の壁の面から
const ZK=3,MAXS=64,MAXP=16,MAXD=8,MAXH=4;    // 光源1つあたりの範囲の数、種類ごとの光源の最大数
// G1（トイレのペンダント）の揺らいだ光の模様：光源からの向き（経度・緯度の正距円筒図）ごとの明るさ。波打ったガラスの屈折で集まった明るい筋の網目（球面上のボロノイ図の境界を波打たせたもの。向きで計算するので壁・天井の角でも模様がつながる）
const cauTex=(()=>{const W=512,H=256,img=new Uint8Array(W*H*4);let sd=7;const rnd=()=>(sd=sd*16807%2147483647)/2147483647;
 const pts=(N,seed)=>{sd=seed;const o=[];for(let i=0;i<N;i++){const y=rnd()*2-1,a=rnd()*Math.PI*2,r=Math.sqrt(1-y*y);o.push([r*Math.cos(a),y,r*Math.sin(a)]);}return o;};
 const warp=(v,A,f,ph)=>[v[0]+A*Math.sin(f*(1.1*v[1]+0.7*v[2])+ph),v[1]+A*Math.sin(f*(0.9*v[2]+0.8*v[0])+ph*1.7),v[2]+A*Math.sin(f*(1.2*v[0]+0.6*v[1])+ph*2.3)];   // 境界を波打たせる（大きい波と細かい波）
 const layer=(P,v,A1,A2)=>{let w=warp(warp(v,A1,4.5,1.0),A2,11.0,2.0);const l=Math.hypot(...w);w=w.map(c=>c/l);let d1=-2,d2=-2;for(let n=0;n<P.length;n++){const p=P[n],d=p[0]*w[0]+p[1]*w[1]+p[2]*w[2];if(d>d1){d2=d1;d1=d;}else if(d>d2)d2=d;}return Math.sqrt(Math.max(0,2-2*d2))-Math.sqrt(Math.max(0,2-2*d1));};   // 境界からの距離
 const PA=pts(170,7),PB=pts(70,11);   // 細かい網目と、薄く重なる大きい網目
 for(let j=0;j<H;j++){const el=(j+0.5)/H*Math.PI-Math.PI/2;if(el<-0.85||el>1.45)continue;const cy=Math.sin(el),ce=Math.cos(el);   // 下の口から出る向き・真上（ソケットの陰）は使わない
  for(let i=0;i<W;i++){const az=(i+0.5)/W*Math.PI*2-Math.PI,v=[ce*Math.cos(az),cy,ce*Math.sin(az)],ea=layer(PA,v,0.07,0.018),eb=layer(PB,v,0.08,0.02);
   const val=Math.min(1,Math.max(Math.exp(-((ea/0.018)**2)),0.35*Math.exp(-((eb/0.03)**2)))+0.15*Math.exp(-ea/0.05)),k=(j*W+i)*4;img[k]=img[k+1]=img[k+2]=Math.round(val*255);img[k+3]=255;}}
 const t=new THREE.DataTexture(img,W,H,THREE.RGBAFormat);t.wrapS=THREE.RepeatWrapping;t.magFilter=t.minFilter=THREE.LinearFilter;t.generateMipmaps=false;t.needsUpdate=true;return t;})();
const ZU={zPC:{value:Array.from({length:MAXP},()=>new THREE.Vector4())},zCau:{value:cauTex},zCauK:{value:new THREE.Vector4(0.441,0.97,0.85,0.8)},zDF:{value:new Array(MAXD).fill(0)},zSMin:{value:[]},zSMax:{value:[]},zPMin:{value:[]},zPMax:{value:[]},zDMin:{value:[]},zDMax:{value:[]},zHMin:{value:[]},zHMax:{value:[]}};
[['zSMin','zSMax',MAXS],['zPMin','zPMax',MAXP],['zDMin','zDMax',MAXD],['zHMin','zHMax',MAXH]].forEach(([a,b,n])=>{for(let i=0;i<n*ZK;i++){ZU[a].value.push(new THREE.Vector4(1,0,0,1));ZU[b].value.push(new THREE.Vector4(0,0,0,1));}});
// 揺らいだ光（zPC.w=1の点光源だけ。今はG1）：光源から見た向きで、下の口から出る光（zCauK.x：口の縁の向きのcos）はそのまま、ガラスを通る光は透過率（zCauK.z）と模様（zCau）を掛ける。真上はソケットの陰（zCauK.y）、口の縁の向きは縁で集まった明るい帯（zCauK.w）
const cauGL=`#if NUM_POINT_LIGHTS>0\nuniform vec4 zPC[${MAXP}];uniform sampler2D zCau;uniform vec4 zCauK;\nfloat cauF(int li){vec4 c=zPC[li];if(c.w<0.5)return 1.0;vec3 d=normalize(vWPos-c.xyz);float p=texture2D(zCau,vec2(atan(d.z,d.x)*0.1591549+0.5,asin(clamp(d.y,-1.0,1.0))*0.3183099+0.5)).r;\nfloat cd=-d.y,op=smoothstep(zCauK.x-0.015,zCauK.x+0.015,cd),gl=zCauK.z*(0.3+1.6*p)*(1.0-smoothstep(zCauK.y-0.02,zCauK.y+0.01,d.y)),rim=zCauK.w*exp(-pow((cd-zCauK.x+0.02)/0.03,2.0))*(0.5+p);return mix(gl,1.0,op)+rim;}\n#endif\n`;
// 照明の計算（Phong）に、光源ごとの範囲を掛ける
function zonePatch(sh){Object.assign(sh.uniforms,ZU);
 sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWPos;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvWPos=(modelMatrix*vec4(transformed,1.0)).xyz;');
 const fn=(t,N)=>`#if ${N}>0\nuniform vec4 z${t}Min[${N}*${ZK}];uniform vec4 z${t}Max[${N}*${ZK}];\n#define zone${t}(i) ZONE(z${t}Min,z${t}Max,i)\n#endif\n`,   // 範囲の判定はマクロで展開（配列の添字が定数になり速い）
  zm=`float zB(vec4 mn,vec4 mx){if(mn.x>mx.x)return 0.0;vec3 d=max(mn.xyz-vWPos,vWPos-mx.xyz)/vec3(mn.w,mn.w,mx.w);return 1.0-smoothstep(0.0,1.0,max(max(d.x,d.y),d.z));}\n#define ZONE(A,B,i) max(max(zB(A[(i)*${ZK}],B[(i)*${ZK}]),zB(A[(i)*${ZK}+1],B[(i)*${ZK}+1])),zB(A[(i)*${ZK}+2],B[(i)*${ZK}+2]))\n`;
 sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vWPos;\n'+'#if NUM_DIR_LIGHTS>0\nuniform float zDF['+MAXD+'];\n#endif\n'+zm+fn('S','NUM_SPOT_LIGHTS')+fn('P','NUM_POINT_LIGHTS')+cauGL+fn('D','NUM_DIR_LIGHTS')+fn('H','NUM_HEMI_LIGHTS'))
  .replace('#include <lights_fragment_begin>',THREE.ShaderChunk.lights_fragment_begin
   .replace(/(pointLight = pointLights\[ i \];)([\s\S]*?)(RE_Direct\( directLight, geometry, material, reflectedLight \);)/,'$1\nif(dot(pointLight.color,vec3(1.0))>0.0){float zf=zoneP( UNROLLED_LOOP_INDEX );if(zf>0.0){$2directLight.color *= zf * cauF( UNROLLED_LOOP_INDEX );\n$3}}')
   .replace(/(spotLight = spotLights\[ i \];)([\s\S]*?)(RE_Direct\( directLight, geometry, material, reflectedLight \);)/,'$1\nif(dot(spotLight.color,vec3(1.0))>0.0){float zf=zoneS( UNROLLED_LOOP_INDEX );if(zf>0.0){$2directLight.color *= zf;\n$3}}')   // 範囲の外・消えている光は計算を飛ばす
   .replace('getDirectionalDirectLightIrradiance( directionalLight, geometry, directLight );','getDirectionalDirectLightIrradiance( directionalLight, geometry, directLight );\n\t\tdirectLight.color *= zoneD( UNROLLED_LOOP_INDEX );')
   .replace('getHemisphereLightIrradiance( hemisphereLights[ i ], geometry )','getHemisphereLightIrradiance( hemisphereLights[ i ], geometry ) * zoneH( UNROLLED_LOOP_INDEX )')
   .replace(/(NUM_DIR_LIGHTS > 0 \) && defined\( RE_Direct \)[\s\S]*?)RE_Direct\( directLight, geometry, material, reflectedLight \);/,'$1{vec3 zSp=reflectedLight.directSpecular;RE_Direct( directLight, geometry, material, reflectedLight );reflectedLight.directSpecular=mix(reflectedLight.directSpecular,zSp,zDF[ UNROLLED_LOOP_INDEX ]);}'));}   // 補助光（zDF=1）は照りを足さない
let ZONES=null;   // setupZonesで作った範囲（光源が参照している。寝室の入口越しの範囲はドアの開閉で切り替える）
function setupZones(scene,groups){const Z=lightZones();ZONES=Z;
 groups.forEach(([ls,names])=>ls.forEach(l=>l.userData.zones=names.map(n=>Z[n])));
 scene.traverse(o=>{if(o.isMesh&&o.material.isMeshPhongMaterial&&!o.material.userData.zone){o.material.userData.zone=1;o.material.onBeforeCompile=zonePatch;o.material.customProgramCacheKey=()=>'zone';o.material.needsUpdate=true;}});}
// 光源の範囲をシェーダーへ渡す（並びは描画時の光源の並びと同じ）。光源の数は点灯・消灯で変えない（数が変わるとシェーダーを作り直して固まるため）。消えている光はシェーダーで計算を飛ばす
function updateLights(){const sp=[],pt=[],dr=[],hm=[];
 (function walk(o){if(!o.visible)return;if(o.isSpotLight)sp.push(o);else if(o.isPointLight)pt.push(o);else if(o.isDirectionalLight)dr.push(o);else if(o.isHemisphereLight)hm.push(o);o.children.forEach(walk);})(scene);
 const fill=(ls,mn,mx)=>ls.forEach((l,i)=>{for(let k=0;k<ZK;k++){const z=(l.userData.zones||[])[k],a=ZU[mn].value[i*ZK+k],b=ZU[mx].value[i*ZK+k];
  if(z){const w=Array.isArray(z[2])?z[2]:[z[2],z[2]];a.set(z[0][0],z[0][1],z[0][2],w[0]);b.set(z[1][0],z[1][1],z[1][2],w[1]);}else if(k===0&&!l.userData.zones){a.set(-1e4,-1e4,-1e4,1);b.set(1e4,1e4,1e4,1);}else{a.set(1,0,0,1);b.set(0,0,0,1);}}});   // ぼかし：数1つ＝全方向、[東西と上下, 南北]
 fill(sp,'zSMin','zSMax');fill(pt,'zPMin','zPMax');ZU.zPC.value.forEach((v,i)=>{const l=pt[i];if(l&&l.userData.caustic){const p=l.getWorldPosition(new THREE.Vector3());v.set(p.x,p.y,p.z,1);}else v.set(0,0,0,0);});fill(dr,'zDMin','zDMax');fill(hm,'zHMin','zHMax');ZU.zDF.value.fill(0);dr.forEach((l,i)=>ZU.zDF.value[i]=l.userData.fill?1:0);}

