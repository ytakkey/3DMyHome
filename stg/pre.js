// 検証版（stg）：ライトマップ（明るさを面の画像に描き込む方式。0章の要件・8章）の準備。もとの mergeStatic を差し替え、光の当たる部品に「ライトマップのどこに対応するか」（属性 lm）を付ける
// lm = (u, v, 方式, チャートの番号)。方式0：平らな面のまとまり（チャート）ごとに画像の区画を割り当て、u・v は画像の中の位置（0〜1、なめらかに補間）。方式1：曲面の多い部品は頂点ごとに1画素（u・v は画素の番号、頂点の間はなめらかに補間）
// fine：中心がこの範囲にあるチャートは画素を細かく（ts）する。リビングの東の壁（階段の踏み板の細い影を描くため。ユーザーの指摘）
const LM={fine:[{min:[4.7,-0.1,2.0],max:[5.0,5.4,7.3],ts:0.02}],big:new Map(),ts:0.04,pad:2,W:2048,H:0,charts:[],nVert:0,items:[]};   // ts：1画素の大きさ（m）、pad：区画のまわりの余白（画素。表示で4×4画素をなめらかに読むので2）、W：画像の幅。items：lm を付けた形（G-buffer を作るときに使う）
const lmLit=(o,m)=>!(m.isMeshBasicMaterial||(m.transparent&&!m.userData.lmRecv)||(o.userData.dyn&&o.userData.dk===undefined));   // 光を受ける部品：光る部品・ガラスなどの半透明（水面など lmRecv の印のある物は受ける）・動く部品（シェードの生地とバー）は除く
// 三角形の集まり（家全体の座標・index なし）を、同じ平面でつながった三角形のまとまり（チャート）に分ける。各頂点の平面上の座標（m）を返す
function lmCharts(P,TG){const n=P.length/9,par=new Int32Array(n).map((_,i)=>i),N=new Float32Array(n*3),D=new Float32Array(n);
 const find=i=>{while(par[i]!==i){par[i]=par[par[i]];i=par[i];}return i;};
 for(let t=0;t<n;t++){const a=t*9,ux=P[a+3]-P[a],uy=P[a+4]-P[a+1],uz=P[a+5]-P[a+2],vx=P[a+6]-P[a],vy=P[a+7]-P[a+1],vz=P[a+8]-P[a+2];let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;N[t*3]=nx;N[t*3+1]=ny;N[t*3+2]=nz;D[t]=nx*P[a]+ny*P[a+1]+nz*P[a+2];}
 const q=v=>Math.round(v*1e4),vk=(t,i)=>q(P[t*9+i*3])+','+q(P[t*9+i*3+1])+','+q(P[t*9+i*3+2]),edge=new Map();   // 頂点は0.1mm単位で同じ物とみなす
 for(let t=0;t<n;t++)for(let e=0;e<3;e++){const A=vk(t,e),B=vk(t,(e+1)%3),k=A<B?A+'|'+B:B+'|'+A,o=edge.get(k);if(o===undefined){edge.set(k,t);continue;}
  if(N[t*3]*N[o*3]+N[t*3+1]*N[o*3+1]+N[t*3+2]*N[o*3+2]>0.9995&&Math.abs(D[t]-D[o])<1e-3&&(!TG||TG[t]===TG[o])){const ra=find(t),rb=find(o);if(ra!==rb)par[ra]=rb;}}   // 辺を共有し、向きと面の位置がそろう三角形を同じチャートに
 const id=new Map(),cOf=new Int32Array(n),charts=[];for(let t=0;t<n;t++){const r=find(t);if(!id.has(r)){id.set(r,charts.length);charts.push({nx:N[r*3],ny:N[r*3+1],nz:N[r*3+2],u0:1e9,u1:-1e9,v0:1e9,v1:-1e9});}cOf[t]=id.get(r);}
 const UV=new Float32Array(n*6);charts.forEach(c=>{let ux,uy,uz;if(Math.abs(c.ny)>0.7){ux=1;uy=0;uz=0;}else{ux=-c.nz;uy=0;uz=c.nx;}const l=Math.hypot(ux,uy,uz);ux/=l;uy/=l;uz/=l;c.u=[ux,uy,uz];c.v=[c.ny*uz-c.nz*uy,c.nz*ux-c.nx*uz,c.nx*uy-c.ny*ux];});   // 平面の座標軸：床・天井は東西、壁は水平方向を u に（家の座標の軸にそろう）
 for(let t=0;t<n;t++){const c=charts[cOf[t]];for(let i=0;i<3;i++){const a=t*9+i*3,u=c.u[0]*P[a]+c.u[1]*P[a+1]+c.u[2]*P[a+2],v=c.v[0]*P[a]+c.v[1]*P[a+1]+c.v[2]*P[a+2];UV[t*6+i*2]=u;UV[t*6+i*2+1]=v;if(u<c.u0)c.u0=u;if(u>c.u1)c.u1=u;if(v<c.v0)c.v0=v;if(v>c.v1)c.v1=v;}}
 const CB=charts.map(()=>[1e9,1e9,1e9,-1e9,-1e9,-1e9]);for(let t=0;t<n;t++){const b=CB[cOf[t]];for(let k=0;k<3;k++)for(let a=0;a<3;a++){const v=P[t*9+k*3+a];if(v<b[a])b[a]=v;if(v>b[a+3])b[a+3]=v;}}
 charts.forEach((c,ci)=>{const b=CB[ci],cx=(b[0]+b[3])/2,cy=(b[1]+b[4])/2,cz=(b[2]+b[5])/2,f=LM.fine.find(f=>cx>=f.min[0]&&cy>=f.min[1]&&cz>=f.min[2]&&cx<=f.max[0]&&cy<=f.max[1]&&cz<=f.max[2]);c.ts=f?f.ts:LM.ts;c.w=Math.ceil((c.u1-c.u0)/c.ts+1)+2*LM.pad;c.h=Math.ceil((c.v1-c.v0)/c.ts+1)+2*LM.pad;});return {cOf,charts,UV};}
// 形（index なし・自分の座標）に lm を付ける準備：チャートか頂点ごとかを決め、あとで画像の区画が決まったら lm を書く
function lmPrepare(o,g,TG){const W=g.clone().applyMatrix4(o.matrixWorld),P=W.attributes.position.array;W.dispose();const r=lmCharts(P,TG),n=P.length/9;
 const vkey=new Map();let nv=0;const VI=new Int32Array(n*3);const NA=g.attributes.normal;for(let i=0;i<n*3;i++){const k=Math.round(P[i*3]*1e4)+','+Math.round(P[i*3+1]*1e4)+','+Math.round(P[i*3+2]*1e4)+'|'+(NA?Math.round(NA.getX(i)*100)+','+Math.round(NA.getY(i)*100)+','+Math.round(NA.getZ(i)*100):'');let v=vkey.get(k);if(v===undefined){v=nv++;vkey.set(k,v);}VI[i]=v;}   // 同じ位置・向きの頂点は1画素を共有
 const cost=r.charts.reduce((s,c)=>s+c.w*c.h,0),mode=r.charts.length>24&&cost>3*nv?1:0;   // 曲面の多い部品（チャートが多く、画素が頂点の3倍を超える）は頂点ごと
 const it={o,g,mode,charts:mode?[]:r.charts,cOf:r.cOf,UV:r.UV,VI,nv};if(!mode)r.charts.forEach(c=>{c.gid=LM.charts.length;c.o=o;LM.charts.push(c);});LM.items.push(it);return it;}
// ドアの枠などを扉の面で分ける：閉じた扉の厚みの中心の面（stg/lm.js の SEALS と同じ求め方）をまたぐ小さな部品の三角形（ドアの開口のまわりに収まるもの）を、その面で切って、面の両側を別のチャートにする。
// 1つのチャートのままだと、ライトマップの画素（4cm）が扉の両側にまたがり、表示でなめらかに読むときに、閉じたドアの向こうの光が枠の手前側に明るい線として出る（ハイドアの枠など）
function doorCuts(){const C=[];if(typeof DOORS==='undefined')return C;const v=new THREE.Vector3();Object.keys(DOORWAYS).forEach(k=>{const d=DOORWAYS[k],D=DOORS[k];if(!D||!D.gC)return;const c=new THREE.Vector3(...d.c),n=new THREE.Vector3(...d.n).normalize(),t=new THREE.Vector3(0,1,0).cross(n).normalize(),ds=[];
 D.gC.updateMatrixWorld(true);D.gC.traverse(o=>{if(!o.isMesh)return;const m=o.material;if(m.isMeshBasicMaterial||(m.transparent&&!(typeof FROST!=='undefined'&&FROST.includes(o)))||m.colorWrite===false)return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).sub(c);ds.push(v.dot(n));}});
 if(!ds.length)return;ds.sort((x,y)=>x-y);C.push({c,n,t,off:ds[ds.length>>1],hw:d.w/2+0.12,y0:c.y-d.h/2-0.05,y1:c.y+d.h/2+0.12});});return C;}
function cutAtDoors(g,C){if(!C.length)return {g,TG:null};const P=g.attributes.position.array,n=P.length/9,reg=new Int16Array(n).fill(-1),DD=new Float32Array(n*3);let any=false;
 for(let t=0;t<n;t++)for(let j=0;j<C.length;j++){const q=C[j];let inside=true;for(let k=0;k<3;k++){const i=t*9+k*3,x=P[i]-q.c.x,y=P[i+1],z=P[i+2]-q.c.z,u=x*q.t.x+z*q.t.z,sv=x*q.n.x+(y-q.c.y)*q.n.y+z*q.n.z-q.off;if(Math.abs(u)>q.hw||y<q.y0||y>q.y1||Math.abs(sv)>0.2){inside=false;break;}DD[t*3+k]=sv;}if(inside){reg[t]=j;any=true;break;}}
 if(!any)return {g,TG:null};   // ドアのまわりに収まる三角形が無い部品はそのまま
 const keys=Object.keys(g.attributes),A=keys.map(k=>g.attributes[k]),out=keys.map(()=>[]),TG=[];let cut=0;
 const vert=i=>A.map(a=>Array.from(a.array.subarray(i*a.itemSize,(i+1)*a.itemSize))),lerp=(x,y,f)=>x.map((xa,ai)=>xa.map((xv,q)=>xv+(y[ai][q]-xv)*f)),push=(vs,tag)=>{vs.forEach(vv=>vv.forEach((c,ai)=>{for(const x of c)out[ai].push(x);}));TG.push(tag);};
 for(let t=0;t<n;t++){const V=[vert(t*3),vert(t*3+1),vert(t*3+2)],j=reg[t];if(j<0){push(V,0);continue;}const dd=[DD[t*3],DD[t*3+1],DD[t*3+2]],pos=dd.map(x=>x>1e-4),neg=dd.map(x=>x<-1e-4);
  if(!neg.some(Boolean)){push(V,j+1);continue;}if(!pos.some(Boolean)){push(V,-(j+1));continue;}
  let a=[0,1,2].find(i=>pos[i]&&!pos[(i+1)%3]&&!pos[(i+2)%3]),side=1;if(a===undefined){a=[0,1,2].find(i=>neg[i]&&!neg[(i+1)%3]&&!neg[(i+2)%3]);side=-1;}   // 1つだけ反対側にある頂点を先頭に（並びの向きは保つ）
  if(a===undefined){push(V,dd[0]+dd[1]+dd[2]>0?j+1:-(j+1));continue;}
  const b=(a+1)%3,c=(a+2)%3,pa=lerp(V[a],V[b],dd[a]/(dd[a]-dd[b])),pc=lerp(V[a],V[c],dd[a]/(dd[a]-dd[c]));
  push([V[a],pa,pc],side*(j+1));push([pa,V[b],V[c]],-side*(j+1));push([pa,V[c],pc],-side*(j+1));cut++;}
 const h=new THREE.BufferGeometry();keys.forEach((k,ai)=>h.setAttribute(k,new THREE.BufferAttribute(new Float32Array(out[ai]),A[ai].itemSize)));g.dispose();LM.doorCut=(LM.doorCut||0)+cut;return {g:h,TG:Int16Array.from(TG)};}
// 区画を並べる（高い順に、幅 W の棚に左から）。頂点ごとの画素はその後ろに並べる。そのあと各形に lm を書く
function lmPack(){const cs=LM.charts.slice().sort((a,b)=>b.h-a.h||b.w-a.w);let x=0,y=0,rowH=0;cs.forEach(c=>{if(x+c.w>LM.W){x=0;y+=rowH;rowH=0;}c.x=x;c.y=y;x+=c.w;rowH=Math.max(rowH,c.h);});y+=rowH;
 let vb=y,vx=0,vy=y;LM.items.forEach(it=>{if(!it.mode)return;it.vbase=(vy-vb)*LM.W+vx;const end=it.vbase+it.nv;vy=vb+Math.floor(end/LM.W);vx=end%LM.W;});LM.H=vy+1;LM.vrow=vb;
 LM.items.forEach(it=>{const n=it.g.attributes.position.count,A=new Float32Array(n*4);
  for(let i=0;i<n;i++){if(it.mode){const k=it.vbase+it.VI[i];A[i*4]=k%LM.W;A[i*4+1]=LM.vrow+Math.floor(k/LM.W);A[i*4+2]=1;A[i*4+3]=-1;}
   else{const c=it.charts[it.cOf[Math.floor(i/3)]],u=it.UV[i*2],v=it.UV[i*2+1];A[i*4]=(c.x+LM.pad+0.5+(u-c.u0)/c.ts)/LM.W;A[i*4+1]=(c.y+LM.pad+0.5+(v-c.v0)/c.ts)/LM.H;A[i*4+2]=0;A[i*4+3]=c.gid;}}   // 画素の中心が面の端に来るように
  it.g.setAttribute('lm',new THREE.BufferAttribute(A,4));it.o.geometry=it.g;delete it.UV;delete it.cOf;delete it.VI;});}
// もとの mergeStatic の代わり：動かない部品を、素材ごと・方式ごとにまとめる（まとめる前の部品ごとにチャートを作る）。動く部品（ドア）は自分の形のまま lm を付ける
function mergeStatic(scene){scene.updateMatrixWorld(true);const olds=[],dyns=[],buckets=new Map();scene.traverse(o=>{if(o.isMesh)(o.userData.dyn?dyns:olds).push(o);});
 const DC=doorCuts();
 olds.forEach(o=>{let g=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(o.matrixWorld),TG=null;const lit=lmLit(o,o.material);let mode=-1,it=null;
  if(lit){({g,TG}=cutAtDoors(g,DC));const id=new THREE.Object3D();it=lmPrepare(id,g,TG);mode=it.mode;const m=o.material;
   if(!mode&&!m.isMeshBasicMaterial&&!m.transparent&&m.colorWrite!==false){const P=g.attributes.position.array;for(let tr=0;tr<P.length/9;tr++){const c=it.charts[it.cOf[tr]];if((c.u1-c.u0)*(c.v1-c.v0)<0.3)continue;let b=LM.big.get(c);if(!b){const NA=g.attributes.normal;b={c,tri:[],nrm:NA?[NA.getX(tr*3),NA.getY(tr*3),NA.getZ(tr*3)]:null};LM.big.set(c,b);}for(let q=0;q<9;q++)b.tri.push(P[tr*9+q]);}}}   // 大きな平らな面（チャートの広さ0.3m²以上）の三角形を記録（影の計算で裏へ厚みを付ける。stg/lm.js）
  const keys=Object.keys(g.attributes).sort(),k=o.material.uuid+'|'+mode+'|'+keys.join(',');
  let b=buckets.get(k);if(!b){b={m:o.material,keys,parts:[],mode};buckets.set(k,b);}b.parts.push({g,it});});
 olds.forEach(o=>{o.parent.remove(o);o.geometry.dispose();});
 const merged=[];buckets.forEach(b=>{const m=new THREE.Mesh(new THREE.BufferGeometry(),b.m);scene.add(m);merged.push({b,m});});
 dyns.forEach(o=>{if(!lmLit(o,o.material))return;const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();lmPrepare(o,g);});
 lmPack();   // ここで各部品の形に lm が付く（まとめる前の部品の分は、下でまとめる）
 merged.forEach(({b,m})=>{const keys=b.parts[0].g.attributes.lm?[...b.keys,'lm']:b.keys;keys.forEach(k=>{let n=0;b.parts.forEach(p=>n+=p.g.attributes[k].array.length);const arr=new Float32Array(n);let off=0;b.parts.forEach(p=>{arr.set(p.g.attributes[k].array,off);off+=p.g.attributes[k].array.length;});m.geometry.setAttribute(k,new THREE.BufferAttribute(arr,b.parts[0].g.attributes[k].itemSize));});
  b.parts.forEach(p=>p.g.dispose());if(b.mode>=0)m.userData.lmMode=b.mode;});
 LM.items=LM.items.filter(it=>it.o.isMesh);}   // まとめた部品の仮の Object3D は外す（まとめた形が lm を持つ）
// 窓の位置・向き・大きさを記録する（窓ごとの空の光のため）。窓の光はすべて addDaylight を通る
const BAKE_WINDOWS=[];
{const _ad=addDaylight;addDaylight=function(g,um,ym,w,hh,shadeable){g.updateMatrixWorld(true);const c=g.localToWorld(new THREE.Vector3(um,ym,0)),q=g.getWorldQuaternion(new THREE.Quaternion());
 BAKE_WINDOWS.push({c:c.toArray(),out:new THREE.Vector3(0,0,-1).applyQuaternion(q).toArray(),u:new THREE.Vector3(1,0,0).applyQuaternion(q).toArray(),w,h:hh,shadeable:!!shadeable});return _ad(g,um,ym,w,hh,shadeable);};}   // out：外向き、u：壁に沿った向き
// 天井の位置を記録する（天井と壁の境目のすき間から光が漏れないよう、少し大きい「影だけを落とす板」を天井のすぐ上に置くため）
const CEILS=[];
{const _cr=ceilRect;ceilRect=function(x0,x1,z0,z1,y,m,tile){CEILS.push([x0,x1,z0,z1,y]);return _cr(x0,x1,z0,z1,y,m,tile);};}
// 開閉できるドアの開口の位置・向き・大きさを記録する（開いたドアの開口を「隣の部屋の明るさで光る面」として扱うため）。n：壁の +z（その壁の部屋側）
const DOORWAYS={};
{const _bw=buildWall;buildWall=function(g,len,h,ops,m,sc,bb,cut){g.updateMatrixWorld(true);const q=g.getWorldQuaternion(new THREE.Quaternion());
 ops.forEach(o=>{if(!o.toggle||DOORWAYS[o.toggle])return;const c=g.localToWorld(new THREE.Vector3((o.a+o.b)/2,o.y2/2,0));DOORWAYS[o.toggle]={c:c.toArray(),n:new THREE.Vector3(0,0,1).applyQuaternion(q).toArray(),w:o.b-o.a,h:o.y2};});
 return _bw(g,len,h,ops,m,sc,bb,cut);};}
