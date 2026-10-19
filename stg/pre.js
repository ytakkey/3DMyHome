// 検証版（stg）：ライトマップ（明るさを面の画像に描き込む方式。0章の要件・8章）の準備。もとの mergeStatic を差し替え、光の当たる部品に「ライトマップのどこに対応するか」（属性 lm）を付ける
// lm = (u, v, 方式, チャートの番号)。方式0：平らな面のまとまり（チャート）ごとに画像の区画を割り当て、u・v は画像の中の位置（0〜1、なめらかに補間）。方式1：曲面の多い部品は頂点ごとに1画素（u・v は画素の番号、頂点の間はなめらかに補間）
const LM={edgeL:0.2,big:new Map(),mid:new Map(),ts:0.04,pad:2,W:2048,H:0,charts:[],nVert:0,items:[]};   // ts：1画素の大きさ（m。全部の面で同じ）、edgeL：両端の画素を面の端に置く長さの下限（m）、pad：区画のまわりの余白（画素。表示で4×4画素をなめらかに読むので2）、W：画像の幅。items：lm を付けた形（G-buffer を作るときに使う）
const lmLit=(o,m)=>!(o.userData.unseen||m.isMeshBasicMaterial||(m.transparent&&!m.userData.lmRecv)||(o.userData.dyn&&o.userData.dk===undefined));   // 光を受ける部品：光る部品・ガラスなどの半透明（水面など lmRecv の印のある物は受ける）・動く部品（シェードの生地とバー）・中から見えない面（unseen：家の外皮。影は落とす）は除く
// 三角形の集まり（家全体の座標・index なし）を、同じ平面でつながった三角形のまとまり（チャート）に分ける。各頂点の平面上の座標（m）を返す
function lmCharts(P,TG,BAR){const n=P.length/9,par=new Int32Array(n).map((_,i)=>i),N=new Float32Array(n*3),D=new Float32Array(n);
 const find=i=>{while(par[i]!==i){par[i]=par[par[i]];i=par[i];}return i;};
 for(let t=0;t<n;t++){const a=t*9,ux=P[a+3]-P[a],uy=P[a+4]-P[a+1],uz=P[a+5]-P[a+2],vx=P[a+6]-P[a],vy=P[a+7]-P[a+1],vz=P[a+8]-P[a+2];let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;N[t*3]=nx;N[t*3+1]=ny;N[t*3+2]=nz;D[t]=nx*P[a]+ny*P[a+1]+nz*P[a+2];}
 const q=v=>Math.round(v*1e4),vk=(t,i)=>q(P[t*9+i*3])+','+q(P[t*9+i*3+1])+','+q(P[t*9+i*3+2]),edge=new Map();   // 頂点は0.1mm単位で同じ物とみなす
 for(let t=0;t<n;t++)for(let e=0;e<3;e++){const A=vk(t,e),B=vk(t,(e+1)%3),k=A<B?A+'|'+B:B+'|'+A,o=edge.get(k);if(o===undefined){edge.set(k,t);continue;}
  if(N[t*3]*N[o*3]+N[t*3+1]*N[o*3+1]+N[t*3+2]*N[o*3+2]>0.9995&&Math.abs(D[t]-D[o])<1e-3&&(!TG||TG[t]===TG[o])&&!(BAR&&BAR.has(k))){const ra=find(t),rb=find(o);if(ra!==rb)par[ra]=rb;}}   // 辺を共有し、向きと面の位置がそろう三角形を同じチャートに（建物の面どうしが接する線＝BAR の辺ではつなげない）
 const id=new Map(),cOf=new Int32Array(n),charts=[];for(let t=0;t<n;t++){const r=find(t);if(!id.has(r)){id.set(r,charts.length);charts.push({nx:N[r*3],ny:N[r*3+1],nz:N[r*3+2],u0:1e9,u1:-1e9,v0:1e9,v1:-1e9});}cOf[t]=id.get(r);}
 const UV=new Float32Array(n*6);charts.forEach(c=>{let ux,uy,uz;if(Math.abs(c.ny)>0.7){ux=1;uy=0;uz=0;}else{ux=-c.nz;uy=0;uz=c.nx;}const l=Math.hypot(ux,uy,uz);ux/=l;uy/=l;uz/=l;c.u=[ux,uy,uz];c.v=[c.ny*uz-c.nz*uy,c.nz*ux-c.nx*uz,c.nx*uy-c.ny*ux];});   // 平面の座標軸：床・天井は東西、壁は水平方向を u に（家の座標の軸にそろう）
 for(let t=0;t<n;t++){const c=charts[cOf[t]];for(let i=0;i<3;i++){const a=t*9+i*3,u=c.u[0]*P[a]+c.u[1]*P[a+1]+c.u[2]*P[a+2],v=c.v[0]*P[a]+c.v[1]*P[a+1]+c.v[2]*P[a+2];UV[t*6+i*2]=u;UV[t*6+i*2+1]=v;if(u<c.u0)c.u0=u;if(u>c.u1)c.u1=u;if(v<c.v0)c.v0=v;if(v>c.v1)c.v1=v;}}
 charts.forEach(c=>{const g=L=>{if(L<LM.edgeL)return [Math.ceil(L/LM.ts+1),LM.ts];const n=Math.round(L/LM.ts)+1;return [n,L/(n-1)];};let nu,nv;c.ts=LM.ts;[nu,c.su]=g(c.u1-c.u0);[nv,c.sv]=g(c.v1-c.v0);c.w=nu+2*LM.pad;c.h=nv+2*LM.pad;});return {cOf,charts,UV};}   // 画素の並び：長さ edgeL 以上の向きは、両端の画素の中心が面の端にくるように画素の間隔（su・sv）を ts（4cm）の近くに合わせる（どの面も同じ決まり。隣り合う面の端の画素が同じ点を計算する＝開いたドアの境目などで明るさがそろう）。短い向き（小さな部品）は、最初の画素の中心だけを面の端に置き、間隔は ts（両端の画素が角に乗ると、器具の部品などで角が陰に入って暗くなった）
// 形（index なし・自分の座標）に lm を付ける準備：チャートか頂点ごとかを決め、あとで画像の区画が決まったら lm を書く
function lmPrepare(o,g,TG,BAR){const W=g.clone().applyMatrix4(o.matrixWorld),P=W.attributes.position.array;W.dispose();const r=lmCharts(P,TG,BAR),n=P.length/9;
 const vkey=new Map();let nv=0;const VI=new Int32Array(n*3);const NA=g.attributes.normal;for(let i=0;i<n*3;i++){const k=Math.round(P[i*3]*1e4)+','+Math.round(P[i*3+1]*1e4)+','+Math.round(P[i*3+2]*1e4)+'|'+(NA?Math.round(NA.getX(i)*100)+','+Math.round(NA.getY(i)*100)+','+Math.round(NA.getZ(i)*100):'');let v=vkey.get(k);if(v===undefined){v=nv++;vkey.set(k,v);}VI[i]=v;}   // 同じ位置・向きの頂点は1画素を共有
 const cost=r.charts.reduce((s,c)=>s+c.w*c.h,0),mode=r.charts.length>24&&cost>3*nv?1:0;   // 曲面の多い部品（チャートが多く、画素が頂点の3倍を超える）は頂点ごと
 const it={o,g,mode,charts:mode?[]:r.charts,cOf:r.cOf,UV:r.UV,VI,nv};if(!mode)r.charts.forEach(c=>{c.gid=LM.charts.length;c.o=o;LM.charts.push(c);});LM.items.push(it);return it;}
// ドアの枠などを扉の面で分ける：閉じた扉の厚みの中心の面（stg/lm.js の SEALS と同じ求め方）をまたぐ小さな部品の三角形（ドアの開口のまわりに収まるもの）を、その面で切って、面の両側を別のチャートにする。
// 1つのチャートのままだと、ライトマップの画素（4cm）が扉の両側にまたがり、表示でなめらかに読むときに、閉じたドアの向こうの光が枠の手前側に明るい線として出る（ハイドアの枠など）
function doorCuts(){const C=[];if(typeof DOORS==='undefined')return C;const v=new THREE.Vector3();Object.keys(DOORWAYS).forEach(k=>{const d=DOORWAYS[k],D=DOORS[k];if(!D||!D.gC)return;const c=new THREE.Vector3(...d.c),n=new THREE.Vector3(...d.n).normalize(),t=new THREE.Vector3(0,1,0).cross(n).normalize(),ds=[];
 let f0=1e9,f1=-1e9;const A=new THREE.Vector3(),B=new THREE.Vector3(),E=new THREE.Vector3();D.gC.updateMatrixWorld(true);D.gC.traverse(o=>{if(!o.isMesh)return;const m=o.material;if(m.isMeshBasicMaterial||(m.transparent&&!(typeof FROST!=='undefined'&&FROST.includes(o)))||m.colorWrite===false)return;const a=o.geometry.attributes.position,ix=o.geometry.index;for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).sub(c);ds.push(v.dot(n));}
  const nt=ix?ix.count/3:a.count/3,vi=k=>ix?ix.getX(k):k;for(let t=0;t<nt;t++){A.fromBufferAttribute(a,vi(t*3)).applyMatrix4(o.matrixWorld);B.fromBufferAttribute(a,vi(t*3+1)).applyMatrix4(o.matrixWorld);E.fromBufferAttribute(a,vi(t*3+2)).applyMatrix4(o.matrixWorld);const cr=B.clone().sub(A).cross(E.clone().sub(A)),ar=cr.length()/2;if(ar<0.02||Math.abs(cr.normalize().dot(n))<0.95)continue;const dd=A.clone().sub(c).dot(n);if(dd<f0)f0=dd;if(dd>f1)f1=dd;}});   // 扉の大きな面（stg/lm.js の SEALS と同じ求め方）
 if(!ds.length)return;ds.sort((x,y)=>x-y);const ofL=f1>f0?(f0+f1)/2:ds[ds.length>>1];C.push({c,n,t,off:ofL>0.005?0:ofL,hw:d.w/2+0.12,y0:c.y-d.h/2-0.05,y1:c.y+d.h/2+0.12});});return C;}
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
// 建物の面が接する線（壁の根元・天井の際・部屋の隅・階の境）：建物の面（userData.arch。壁・床・天井）の縁の辺のうち、ほかの建物の面の平面の上（4.5mm以内。2mm高い石の床と、床の1mm下まで下げた開口の内側の面の間が3mm）にあってその面とほぼ直角で、相手の面がこの面の表側（部屋の側）へ伸びている物を「接する線」とする（裏側で接する面＝壁の中の空洞をふさぐ面などは、表から見える面を分けない）。
// その面の三角形を接する線（と線の両端の直角の線）で切り、線の上の辺ではチャートをつなげない（BAR）。壁の下に入った床・壁の上の天井・壁の裏に隠れた部分などが見えている面と別のチャートになり、隠れた所の値を見えている所が補う元に使わない（光の計算は区切らない）。
// 幅1mm未満のつぶれた三角形の辺は使わない（床の段などの細い面は、建物の面の印を付けない）
function archContacts(objs){const E=[],q=v=>Math.round(v*1e4);
 objs.forEach(o=>{if(!o.userData.arch)return;const g=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(o.matrixWorld),P=g.attributes.position.array;g.dispose();const cnt=new Map(),ed=[];
  for(let t=0;t<P.length/9;t++){const v=[0,1,2].map(i=>new THREE.Vector3(P[t*9+i*3],P[t*9+i*3+1],P[t*9+i*3+2])),cr=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])),ar=cr.length(),L=Math.max(v[0].distanceTo(v[1]),v[1].distanceTo(v[2]),v[2].distanceTo(v[0]));if(!(ar>0))continue;const thin=ar/L<0.001,n=cr.normalize();
   for(let e=0;e<3;e++){const a=v[e],b=v[(e+1)%3],c3=v[(e+2)%3],ed0=b.clone().sub(a).normalize(),bd=c3.clone().sub(a);bd.addScaledVector(ed0,-bd.dot(ed0)).normalize();const ka=q(a.x)+','+q(a.y)+','+q(a.z),kb=q(b.x)+','+q(b.y)+','+q(b.z),k=ka<kb?ka+'|'+kb:kb+'|'+ka;cnt.set(k,(cnt.get(k)||0)+1);ed.push({k,a,b,n,thin,bd});}}
  ed.forEach(x=>{if(!x.thin&&cnt.get(x.k)===1)E.push({a:x.a,b:x.b,n:x.n,bd:x.bd,o});});});   // 縁の辺（その形の中で1つの三角形だけが使う辺）
 if(new URLSearchParams(location.search).get('lm')==='dbg')LM.edges=E.map(e=>[e.a.toArray().map(v=>+v.toFixed(4)),e.b.toArray().map(v=>+v.toFixed(4)),e.n.toArray().map(v=>+v.toFixed(2))]);   // 確認用
 return E;}
// 1つの形（家全体の座標・index なし）について、接する線を求め、その線で三角形を切って、線の上の辺（BAR）を返す
function archSplit(g,o,E){const P0=g.attributes.position.array,PL=[],bb=new THREE.Box3();for(let t=0;t<P0.length/9;t++){const a=new THREE.Vector3(P0[t*9],P0[t*9+1],P0[t*9+2]),b=new THREE.Vector3(P0[t*9+3],P0[t*9+4],P0[t*9+5]),c=new THREE.Vector3(P0[t*9+6],P0[t*9+7],P0[t*9+8]),n=b.clone().sub(a).cross(c.clone().sub(a));if(!(n.length()>1e-12))continue;n.normalize();const d=n.dot(a);
  let p=PL.find(p=>p.n.dot(n)>0.9995&&Math.abs(p.d-d)<1e-3);if(!p){p={n,d,box:new THREE.Box3()};PL.push(p);}p.box.expandByPoint(a).expandByPoint(b).expandByPoint(c);bb.expandByPoint(a).expandByPoint(b).expandByPoint(c);}
 bb.expandByScalar(0.006);const S=[],eb=new THREE.Box3();E.forEach(e=>{if(e.o===o)return;eb.makeEmpty().expandByPoint(e.a).expandByPoint(e.b);if(!bb.intersectsBox(eb))return;PL.forEach(p=>{if(Math.abs(p.n.dot(e.a)-p.d)>0.0045||Math.abs(p.n.dot(e.b)-p.d)>0.0045||Math.abs(p.n.dot(e.n))>0.5||e.bd.dot(p.n)<0.5)return;if(!p.box.clone().expandByScalar(0.006).intersectsBox(eb))return;   // 辺がその面の広がりと重なれば（辺の一部が面の外へ出ていてもよい。開口の内側の面の下の辺は壁の厚さいっぱいにある）
  const a=e.a.clone().addScaledVector(p.n,p.d-p.n.dot(e.a)),b=e.b.clone().addScaledVector(p.n,p.d-p.n.dot(e.b)),L=a.distanceTo(b);if(L<0.001)return;const dir=b.clone().sub(a).multiplyScalar(1/L);S.push({a,b,L,dir,m:dir.clone().cross(p.n).normalize()});});});
 if(!S.length)return {g,BAR:null};
 if(new URLSearchParams(location.search).get('lm')==='dbg')(LM.segs||(LM.segs=[])).push(...S.map(x=>[x.a.toArray().map(v=>+v.toFixed(4)),x.b.toArray().map(v=>+v.toFixed(4))]));   // 確認用（?lm=dbg のときだけ、接する線を残す）
 const cuts=[],seen=new Set(),addC=(n,d)=>{const k=Math.round(n.x*1e4)+','+Math.round(n.y*1e4)+','+Math.round(n.z*1e4)+','+Math.round(d*1e4),k2=Math.round(-n.x*1e4)+','+Math.round(-n.y*1e4)+','+Math.round(-n.z*1e4)+','+Math.round(-d*1e4);if(seen.has(k)||seen.has(k2))return;seen.add(k);cuts.push({n,d});};
 S.forEach(s=>{addC(s.m,s.m.dot(s.a));[s.a,s.b].forEach(p=>addC(s.dir,s.dir.dot(p)));});   // 線と、線の両端の直角の線（辺の上の線だけを BAR にするため）。切るのは面全体（一部の三角形だけ切ると、隣の三角形との間に T 字のつなぎ目ができて、同じ面が別のチャートに割れる）
 cuts.forEach(c=>{g=splitTris(g,c);});
 const P=g.attributes.position.array,qk=v=>Math.round(v*1e4),vk=(i)=>qk(P[i])+','+qk(P[i+1])+','+qk(P[i+2]),BAR=new Set(),A=new THREE.Vector3(),B=new THREE.Vector3();
 for(let t=0;t<P.length/9;t++)for(let e=0;e<3;e++){const i=t*9+e*3,j=t*9+((e+1)%3)*3;A.set(P[i],P[i+1],P[i+2]);B.set(P[j],P[j+1],P[j+2]);for(const s of S){const ta=A.clone().sub(s.a).dot(s.dir),tb=B.clone().sub(s.a).dot(s.dir);if(Math.abs(A.clone().sub(s.a).dot(s.m))>5e-4||Math.abs(B.clone().sub(s.a).dot(s.m))>5e-4)continue;if(Math.min(ta,tb)<-0.001||Math.max(ta,tb)>s.L+0.001||Math.abs(ta-tb)<1e-5)continue;const ka=vk(i),kb=vk(j);BAR.add(ka<kb?ka+'|'+kb:kb+'|'+ka);break;}}
 LM.nBar=(LM.nBar||0)+BAR.size;return {g,BAR};}
// 三角形を平面（n・x＝d）で切る（平面をまたぐ三角形を全部。頂点の値はすべて線形に補う。三角形の並びの向きは保つ）
function splitTris(g,c){const keys=Object.keys(g.attributes),A=keys.map(k=>g.attributes[k]),P=g.attributes.position.array,n=P.length/9,out=keys.map(()=>[]);let cut=0;
 const vert=i=>A.map(a=>Array.from(a.array.subarray(i*a.itemSize,(i+1)*a.itemSize))),lerp=(x,y,f)=>x.map((xa,ai)=>xa.map((xv,q)=>xv+(y[ai][q]-xv)*f)),push=vs=>vs.forEach(vv=>vv.forEach((cv,ai)=>{for(const x of cv)out[ai].push(x);}));
 for(let t=0;t<n;t++){const V=[vert(t*3),vert(t*3+1),vert(t*3+2)];const dd=[0,1,2].map(k=>c.n.x*P[t*9+k*3]+c.n.y*P[t*9+k*3+1]+c.n.z*P[t*9+k*3+2]-c.d),pos=dd.map(x=>x>1e-5),neg=dd.map(x=>x<-1e-5);
  if(!pos.some(Boolean)||!neg.some(Boolean)){push(V);continue;}
  const z=[0,1,2].find(i=>!pos[i]&&!neg[i]);if(z!==undefined){const b=(z+1)%3,e=(z+2)%3,pm=lerp(V[b],V[e],dd[b]/(dd[b]-dd[e]));push([V[z],V[b],pm]);push([V[z],pm,V[e]]);cut++;continue;}   // 1つの頂点が面の上（残りの2つが両側）：2つに
  let a=[0,1,2].find(i=>pos[i]&&!pos[(i+1)%3]&&!pos[(i+2)%3]);if(a===undefined)a=[0,1,2].find(i=>neg[i]&&!neg[(i+1)%3]&&!neg[(i+2)%3]);   // 1つだけ反対側にある頂点を先頭に
  const b=(a+1)%3,e=(a+2)%3,pa=lerp(V[a],V[b],dd[a]/(dd[a]-dd[b])),pc=lerp(V[a],V[e],dd[a]/(dd[a]-dd[e]));push([V[a],pa,pc]);push([pa,V[b],V[e]]);push([pa,V[e],pc]);cut++;}
 if(!cut)return g;const h=new THREE.BufferGeometry();keys.forEach((k,ai)=>h.setAttribute(k,new THREE.BufferAttribute(new Float32Array(out[ai]),A[ai].itemSize)));g.dispose();return h;}
// 区画を並べる（高い順に、幅 W の棚に左から）。頂点ごとの画素はその後ろに並べる。そのあと各形に lm を書く
function lmPack(){const cs=LM.charts.slice().sort((a,b)=>b.h-a.h||b.w-a.w);let x=0,y=0,rowH=0;cs.forEach(c=>{if(x+c.w>LM.W){x=0;y+=rowH;rowH=0;}c.x=x;c.y=y;x+=c.w;rowH=Math.max(rowH,c.h);});y+=rowH;
 let vb=y,vx=0,vy=y;LM.items.forEach(it=>{if(!it.mode)return;it.vbase=(vy-vb)*LM.W+vx;const end=it.vbase+it.nv;vy=vb+Math.floor(end/LM.W);vx=end%LM.W;});LM.H=vy+1;LM.vrow=vb;
 LM.items.forEach(it=>{const n=it.g.attributes.position.count,A=new Float32Array(n*4);
  for(let i=0;i<n;i++){if(it.mode){const k=it.vbase+it.VI[i];A[i*4]=k%LM.W;A[i*4+1]=LM.vrow+Math.floor(k/LM.W);A[i*4+2]=1;A[i*4+3]=-1;}
   else{const c=it.charts[it.cOf[Math.floor(i/3)]],u=it.UV[i*2],v=it.UV[i*2+1];A[i*4]=(c.x+LM.pad+0.5+(u-c.u0)/c.su)/LM.W;A[i*4+1]=(c.y+LM.pad+0.5+(v-c.v0)/c.sv)/LM.H;A[i*4+2]=0;A[i*4+3]=c.gid;}}   // 両端の画素の中心が面の両端に来るように
  it.g.setAttribute('lm',new THREE.BufferAttribute(A,4));it.o.geometry=it.g;delete it.UV;delete it.cOf;delete it.VI;});}
// もとの mergeStatic の代わり：動かない部品を、素材ごと・方式ごとにまとめる（まとめる前の部品ごとにチャートを作る）。動く部品（ドア）は自分の形のまま lm を付ける
function mergeStatic(scene){scene.updateMatrixWorld(true);const olds=[],dyns=[],buckets=new Map();scene.traverse(o=>{if(o.isMesh)(o.userData.dyn?dyns:olds).push(o);});
 const DC=doorCuts(),AE=archContacts(olds);
 olds.forEach(o=>{let g=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(o.matrixWorld),TG=null,BAR=null;const lit=lmLit(o,o.material);let mode=-1,it=null;
  if(lit){if(o.userData.arch)({g,BAR}=archSplit(g,o,AE));else ({g,TG}=cutAtDoors(g,DC));const id=new THREE.Object3D();id.userData.arch=o.userData.arch;it=lmPrepare(id,g,TG,BAR);mode=it.mode;const m=o.material;   // 建物の面は接する線で、ほかの部品（枠など）は閉じた扉の面で切る
   if(!mode&&!m.isMeshBasicMaterial&&!m.transparent&&m.colorWrite!==false){const P=g.attributes.position.array;for(let tr=0;tr<P.length/9;tr++){const c=it.charts[it.cOf[tr]];const ca=(c.u1-c.u0)*(c.v1-c.v0),mp=ca<0.3;if(mp&&(ca<0.01||Math.max(Math.abs(c.nx),Math.abs(c.ny),Math.abs(c.nz))<0.999))continue;const MB=mp?LM.mid:LM.big;let b=MB.get(c);if(!b){const NA=g.attributes.normal;b={c,tri:[],nrm:NA?[NA.getX(tr*3),NA.getY(tr*3),NA.getZ(tr*3)]:null,mat:m};MB.set(c,b);}for(let q=0;q<9;q++)b.tri.push(P[tr*9+q]);}}}   // 大きな平らな面（チャートの広さ0.3m²以上）の三角形を記録（mid：0.01〜0.3m²で家の座標の軸にそろった面。stg/lm.js の「壁の中」の判定だけに使う）（影の計算で裏へ厚みを付ける。stg/lm.js）
  const keys=Object.keys(g.attributes).sort(),k=o.material.uuid+'|'+mode+'|'+keys.join(',');
  let b=buckets.get(k);if(!b){b={m:o.material,keys,parts:[],mode};buckets.set(k,b);}b.parts.push({g,it});});
 olds.forEach(o=>{o.parent.remove(o);o.geometry.dispose();});
 const merged=[];buckets.forEach(b=>{const m=new THREE.Mesh(new THREE.BufferGeometry(),b.m);scene.add(m);merged.push({b,m});});
 dyns.forEach(o=>{if(!lmLit(o,o.material))return;const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();lmPrepare(o,g);});
 shadeProxies();
 lmPack();SHADES.forEach(setShadeLm);   // ここで各部品の形に lm が付く（まとめる前の部品の分は、下でまとめる）
 merged.forEach(({b,m})=>{const keys=b.parts[0].g.attributes.lm?[...b.keys,'lm']:b.keys;keys.forEach(k=>{let n=0;b.parts.forEach(p=>n+=p.g.attributes[k].array.length);const arr=new Float32Array(n);let off=0;b.parts.forEach(p=>{arr.set(p.g.attributes[k].array,off);off+=p.g.attributes[k].array.length;});m.geometry.setAttribute(k,new THREE.BufferAttribute(arr,b.parts[0].g.attributes[k].itemSize));});
  b.parts.forEach(p=>p.g.dispose());if(b.mode>=0)m.userData.lmMode=b.mode;});
 LM.items=LM.items.filter(it=>it.o.isMesh);}   // まとめた部品の仮の Object3D は外す（まとめた形が lm を持つ）
// シェードの生地：生地は開け閉めで長さが変わる（動く部品）ので、閉じきった大きさの見えない面（px）を明るさの画像に入れ、表示の生地と下のバーはその画像の同じ位置を読む（setShadeLm。開け閉めのたびに付け直す）。
// 外の光が布を通って光る分は stg/lm.js（shadeGlow）。材質はシェードごとに分ける（窓の向きで日差しが違うため）
const SHADES=[];{const _aw=addWindow;addWindow=function(...a){const n=shades?shades.length:0,res=_aw.apply(this,a);if(shades)for(let i=n;i<shades.length;i++)SHADES.push(shades[i]);return res;};}
function shadeProxies(){SHADES.forEach(sh=>{const m=sh.fab.material.clone();sh.fab.material=m;const g0=uvPlane(sh.w,sh.max,0,0,sh.w,0.035),g=g0.toNonIndexed();g0.dispose();const px=new THREE.Mesh(g,m);px.position.set(sh.um,sh.top-sh.max/2,sh.z||-0.07);px.visible=false;px.userData.dyn=true;sh.fab.parent.add(px);px.updateMatrixWorld(true);sh.px=px;lmPrepare(px,g);});}
function setShadeLm(sh){const px=sh.px;if(!px||!px.geometry.attributes.lm)return;const P=px.geometry.attributes.position,L=px.geometry.attributes.lm,x0=P.getX(0),y0=P.getY(0),x1=P.getX(1),y1=P.getY(1),x2=P.getX(2),y2=P.getY(2),det=(x1-x0)*(y2-y0)-(x2-x0)*(y1-y0);
 const f=k=>{const q0=L.getComponent(0,k),q1=L.getComponent(1,k),q2=L.getComponent(2,k),a=((q1-q0)*(y2-y0)-(q2-q0)*(y1-y0))/det,b=((q2-q0)*(x1-x0)-(q1-q0)*(x2-x0))/det;return (x,y)=>q0+a*(x-x0)+b*(y-y0);},U=f(0),V=f(1),gid=L.getW(0);   // 面の上で lm は (x,y) の1次式
 [sh.fab,sh.rail].forEach(ms=>{if(!ms)return;ms.userData.lmView=1;const g=ms.geometry,p=g.attributes.position,A=new Float32Array(p.count*4),dx=ms.position.x-px.position.x,dy=ms.position.y-px.position.y;
  for(let i=0;i<p.count;i++){const x=Math.max(-sh.w/2,Math.min(sh.w/2,p.getX(i)+dx)),y=Math.max(-sh.max/2,Math.min(sh.max/2,p.getY(i)+dy));A[i*4]=U(x,y);A[i*4+1]=V(x,y);A[i*4+2]=0;A[i*4+3]=gid;}g.setAttribute('lm',new THREE.BufferAttribute(A,4));});}
{const _as=applyShades;applyShades=function(list,p){_as(list,p);list.forEach(setShadeLm);};}
// 窓の位置・向き・大きさを記録する（窓ごとの空の光のため）。窓の光はすべて addDaylight を通る
const BAKE_WINDOWS=[];
{const _ad=addDaylight;addDaylight=function(g,um,ym,w,hh,shadeable){g.updateMatrixWorld(true);const c=g.localToWorld(new THREE.Vector3(um,ym,0)),q=g.getWorldQuaternion(new THREE.Quaternion());
 BAKE_WINDOWS.push({c:c.toArray(),out:new THREE.Vector3(0,0,-1).applyQuaternion(q).toArray(),u:new THREE.Vector3(1,0,0).applyQuaternion(q).toArray(),w,h:hh,shadeable:!!shadeable});return _ad(g,um,ym,w,hh,shadeable);};}   // out：外向き、u：壁に沿った向き
// 開閉できるドアの開口の位置・向き・大きさを記録する（扉の面で部品を切る doorCuts と、stg/lm.js の SEALS が使う）。n：壁の +z（その壁の部屋側）
const DOORWAYS={};
{const _bw=buildWall;buildWall=function(g,len,h,ops,m,sc,bb,cut){g.updateMatrixWorld(true);const q=g.getWorldQuaternion(new THREE.Quaternion());
 ops.forEach(o=>{if(!o.toggle||DOORWAYS[o.toggle])return;const c=g.localToWorld(new THREE.Vector3((o.a+o.b)/2,o.y2/2,0));DOORWAYS[o.toggle]={c:c.toArray(),n:new THREE.Vector3(0,0,1).applyQuaternion(q).toArray(),w:o.b-o.a,h:o.y2};});
 return _bw(g,len,h,ops,m,sc,bb,cut);};}
