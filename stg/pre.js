// 検証版：部屋の組（光を分ける単位）。吹抜け・ドアの無い開口でつながった部屋は1組にまとめる。部品は面ごとに、面が向いている部屋の組に属する（その組で点いている光だけが当たる。光が壁を越えない）
const RN=['f1N','f1S','datsu','sen','ent','entC','entK','toi','bath','void','hall','bed','wic','study'],RGN={f1N:'ldk',f1S:'ldk',void:'ldk',hall:'ldk',ent:'ent',entC:'ent',entK:'ent'};
let ROOMS=null,REGIONS=null;
function setupRooms(){if(ROOMS)return;const ZB=lightZones();REGIONS=[];
 ROOMS=RN.filter(n=>ZB[n]).map(n=>{const z=n==='hall'?[ZB.hall[0],[ZB.hall[1][0],ZB.hall[1][1],HOUSE.bed.Z0-0.115]]:ZB[n],mn=z[0],mx=z[1],gn=RGN[n]||n;let G=REGIONS.find(x=>x.n===gn);if(!G){G={n:gn,i:REGIONS.length,rooms:[]};REGIONS.push(G);}
  const R={n,mn,mx,rg:G.i,vol:(mx[0]-mn[0])*(mx[1]-mn[1])*(mx[2]-mn[2])};G.rooms.push(R);return R;});}   // 部屋の箱は光の範囲の箱（ZBASE）。2階の廊下の箱は寝室の壁の手前まで
const roomAt=(x,y,z)=>{let b=null;for(const R of ROOMS)if(x>=R.mn[0]&&x<=R.mx[0]&&y>=R.mn[1]&&y<=R.mx[1]&&z>=R.mn[2]&&z<=R.mx[2]&&(!b||R.vol<b.vol))b=R;return b;};   // 重なる所は小さい方の部屋
const regionAt=(x,y,z)=>{const R=roomAt(x,y,z);if(R)return R.rg;let best=0,bd=1e9;const p=[x,y,z];for(const Q of ROOMS){let d=0;for(let a=0;a<3;a++){const e=Math.max(Q.mn[a]-p[a],0,p[a]-Q.mx[a]);d+=e*e;}if(d<bd){bd=d;best=Q.rg;}}return best;};   // 箱の外（壁の中・外壁の外側）は一番近い部屋
// 三角形を部屋の組ごとに分ける（g：家全体の座標・index なし）。2つ以上の組にまたがる大きな三角形（2階の床など）は、部屋の箱の面から5cm外（壁の中）で切り分ける
function splitTris(g,whole){const keys=Object.keys(g.attributes).sort(),A=keys.map(k=>g.attributes[k]),sz=A.map(a=>a.itemSize),off=[];let st=0;sz.forEach(s=>{off.push(st);st+=s;});
 const po=off[keys.indexOf('position')],no=keys.includes('normal')?off[keys.indexOf('normal')]:-1,out=new Map(),n=g.attributes.position.count,P=g.attributes.position.array;
 const vert=i=>{const v=new Array(st);A.forEach((a,j)=>{for(let c=0;c<sz[j];c++)v[off[j]+c]=a.array[i*sz[j]+c];});return v;};
 const emit=(rg,vs)=>{let o=out.get(rg);if(!o){o=keys.map(()=>[]);out.set(rg,o);}vs.forEach(v=>A.forEach((a,j)=>{for(let c=0;c<sz[j];c++)o[j].push(v[off[j]+c]);}));};
 if(whole){g.computeBoundingBox();const c=g.boundingBox.getCenter(new THREE.Vector3());out.set(regionAt(c.x,c.y,c.z),keys.map((k,j)=>Array.from(A[j].array)));return {keys,sz,out};}   // 光の当たらない部品（光る部品など）は形の中心の組
 const clip=(p,ax,v)=>{const L=[],H=[];for(let i=0;i<p.length;i++){const X=p[i],Y=p[(i+1)%p.length],dx=X[po+ax]-v,dy=Y[po+ax]-v;(dx<0?L:H).push(X);if((dx<0)!==(dy<0)){const s=dx/(dx-dy),Z=X.map((x,k)=>x+(Y[k]-x)*s);if(no>=0){const l=Math.hypot(Z[no],Z[no+1],Z[no+2])||1;Z[no]/=l;Z[no+1]/=l;Z[no+2]/=l;}L.push(Z);H.push(Z.slice());}}return [L,H].filter(q=>q.length>=3);};
 for(let t=0;t<n;t+=3){const a=t*3,b=a+3,c=a+6,ux=P[b]-P[a],uy=P[b+1]-P[a+1],uz=P[b+2]-P[a+2],vx=P[c]-P[a],vy=P[c+1]-P[a+1],vz=P[c+2]-P[a+2];let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const nl=Math.hypot(nx,ny,nz);
  if(nl<1e-12){emit(regionAt((P[a]+P[b]+P[c])/3,(P[a+1]+P[b+1]+P[c+1])/3,(P[a+2]+P[b+2]+P[c+2])/3),[vert(t),vert(t+1),vert(t+2)]);continue;}
  nx/=nl;ny/=nl;nz/=nl;const at=(u,v)=>{const w=1-u-v;return [P[a]*u+P[b]*v+P[c]*w+nx*0.03,P[a+1]*u+P[b+1]*v+P[c+1]*w+ny*0.03,P[a+2]*u+P[b+2]*v+P[c+2]*w+nz*0.03];};   // 面の向きへ3cm出た所で判定（壁の面は、向いている部屋の箱に入る）
  const set=new Set();for(const [u,v] of [[0.9,0.05],[0.05,0.9],[0.05,0.05],[1/3,1/3],[0.5,0.45],[0.45,0.05],[0.05,0.45]]){const q=at(u,v),R=roomAt(q[0],q[1],q[2]);if(R)set.add(R.rg);}
  if(set.size<=1){const q=at(1/3,1/3);emit(set.size?[...set][0]:regionAt(q[0],q[1],q[2]),[vert(t),vert(t+1),vert(t+2)]);continue;}
  let polys=[[vert(t),vert(t+1),vert(t+2)]];for(let ax=0;ax<3;ax++){const lo=Math.min(P[a+ax],P[b+ax],P[c+ax]),hi=Math.max(P[a+ax],P[b+ax],P[c+ax]),vs=new Set();ROOMS.forEach(R=>[R.mn[ax]-0.05,R.mx[ax]+0.05].forEach(v=>{if(v>lo&&v<hi)vs.add(v);}));vs.forEach(v=>{polys=polys.flatMap(p=>clip(p,ax,v));});}
  polys.forEach(p=>{let x=0,y=0,z=0;p.forEach(v=>{x+=v[po];y+=v[po+1];z+=v[po+2];});const k=p.length,rg=regionAt(x/k+nx*0.03,y/k+ny*0.03,z/k+nz*0.03);for(let i=1;i<k-1;i++)emit(rg,[p[0],p[i],p[i+1]]);});}
 return {keys,sz,out};}
// 動かない部品を、部屋の組ごと・素材ごとに1つの形にまとめる（もとの mergeStatic の代わり）。動く部品（ドア・シェード）は面ごとに組を分け、ほかの組の面は子の形にする（位置・開閉はもとの部品のまま）。形には userData.rg（組の番号）
function mergeStatic(scene){setupRooms();scene.updateMatrixWorld(true);const buckets=new Map(),olds=[],dyns=[];
 scene.traverse(o=>{if(o.isMesh)(o.userData.dyn?dyns:olds).push(o);});
 olds.forEach(o=>{const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);const {keys,sz,out}=splitTris(g,!!o.material.isMeshBasicMaterial);g.dispose();
  out.forEach((arr,rg)=>{const k=rg+'|'+o.material.uuid+'|'+keys.join(',');let b=buckets.get(k);if(!b){b={m:o.material,rg,keys,sz,arr:keys.map(()=>[])};buckets.set(k,b);}arr.forEach((x,j)=>{const d=b.arr[j];for(let i=0;i<x.length;i++)d.push(x[i]);});});});
 olds.forEach(o=>{o.parent.remove(o);o.geometry.dispose();});
 buckets.forEach(b=>{const g=new THREE.BufferGeometry();b.keys.forEach((k,j)=>g.setAttribute(k,new THREE.BufferAttribute(new Float32Array(b.arr[j]),b.sz[j])));const m=new THREE.Mesh(g,b.m);m.userData.rg=b.rg;scene.add(m);});
 dyns.forEach(o=>{const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone(),w=g.clone().applyMatrix4(o.matrixWorld),P=w.attributes.position.array,grp=new Map();
  if(o.material.isMeshBasicMaterial){w.computeBoundingBox();const c=w.boundingBox.getCenter(new THREE.Vector3());o.userData.rg=regionAt(c.x,c.y,c.z);w.dispose();return;}
  for(let t=0;t<P.length/9;t++){const a=t*9,b=a+3,c=a+6,ux=P[b]-P[a],uy=P[b+1]-P[a+1],uz=P[b+2]-P[a+2],vx=P[c]-P[a],vy=P[c+1]-P[a+1],vz=P[c+2]-P[a+2];let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const nl=Math.hypot(nx,ny,nz)||1;
   const rg=regionAt((P[a]+P[b]+P[c])/3+nx/nl*0.03,(P[a+1]+P[b+1]+P[c+1])/3+ny/nl*0.03,(P[a+2]+P[b+2]+P[c+2])/3+nz/nl*0.03);if(!grp.has(rg))grp.set(rg,[]);grp.get(rg).push(t);}
  w.dispose();const gs=[...grp.entries()].sort((x,y)=>y[1].length-x[1].length);o.userData.rg=gs[0][0];if(gs.length===1)return;
  const sub=ts=>{const s=new THREE.BufferGeometry();Object.keys(g.attributes).forEach(k=>{const at=g.attributes[k],is=at.itemSize,arr=new Float32Array(ts.length*3*is);ts.forEach((t,i)=>arr.set(at.array.subarray(t*3*is,(t+1)*3*is),i*3*is));s.setAttribute(k,new THREE.BufferAttribute(arr,is));});return s;};
  o.geometry=sub(gs[0][1]);gs.slice(1).forEach(([rg,ts])=>{const m=new THREE.Mesh(sub(ts),o.material);m.userData=Object.assign({},o.userData,{rg});o.add(m);});});}
// 窓の位置・向き・大きさを記録する（窓ごとの空の光のため）。窓の光はすべて addDaylight を通る
const BAKE_WINDOWS=[];
{const _ad=addDaylight;addDaylight=function(g,um,ym,w,hh,shadeable){g.updateMatrixWorld(true);const c=g.localToWorld(new THREE.Vector3(um,ym,0)),q=g.getWorldQuaternion(new THREE.Quaternion());
 BAKE_WINDOWS.push({c:c.toArray(),out:new THREE.Vector3(0,0,-1).applyQuaternion(q).toArray(),u:new THREE.Vector3(1,0,0).applyQuaternion(q).toArray(),w,h:hh});return _ad(g,um,ym,w,hh,shadeable);};}   // out：外向き、u：壁に沿った向き
// 天井の位置を記録する（天井と壁の境目のすき間から光が漏れないよう、少し大きい「影だけを落とす板」を天井のすぐ上に置くため）
const CEILS=[];
{const _cr=ceilRect;ceilRect=function(x0,x1,z0,z1,y,m,tile){CEILS.push([x0,x1,z0,z1,y]);return _cr(x0,x1,z0,z1,y,m,tile);};}
// 開閉できるドアの開口の位置・向き・大きさを記録する（開いたドアの開口を「隣の部屋の明るさで光る面」として扱うため）。n：壁の +z（その壁の部屋側）
const DOORWAYS={};
{const _bw=buildWall;buildWall=function(g,len,h,ops,m,sc,bb,cut){g.updateMatrixWorld(true);const q=g.getWorldQuaternion(new THREE.Quaternion());
 ops.forEach(o=>{if(!o.toggle||DOORWAYS[o.toggle])return;const c=g.localToWorld(new THREE.Vector3((o.a+o.b)/2,o.y2/2,0));DOORWAYS[o.toggle]={c:c.toArray(),n:new THREE.Vector3(0,0,1).applyQuaternion(q).toArray(),w:o.b-o.a,h:o.y2};});
 return _bw(g,len,h,ops,m,sc,bb,cut);};}
