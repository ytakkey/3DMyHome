// 点検：ぴったり重なった面（gap<0.5mm）と近すぎる面（<2mm）を、部品の組ごとに重なりの面積で数える
function audit(){scene.updateMatrixWorld(true);
 const stateOf=new Map();Object.entries(DOORS).forEach(([k,d])=>{d.gO.traverse(o=>{if(o.isMesh)stateOf.set(o,k+':O')});d.gC.traverse(o=>{if(o.isMesh)stateOf.set(o,k+':C')});});
 const visibleIn=(o,stop)=>{for(let q=o;q&&q!==stop;q=q.parent)if(!q.visible)return false;return true;};
 const meshes=[];scene.traverse(o=>{if(!o.isMesh)return;const st=stateOf.get(o);if(st){const d=DOORS[st.split(':')[0]];if(!visibleIn(o,st.endsWith('O')?d.gO:d.gC))return;}else if(!visibleIn(o,null))return;meshes.push(o);});
 const T=[];const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),n=new THREE.Vector3(),t=new THREE.Vector3();
 meshes.forEach((o,mi)=>{const g=o.geometry,p=g.attributes.position,ix=g.index,cnt=ix?ix.count:p.count;for(let i=0;i<cnt;i+=3){const i0=ix?ix.getX(i):i,i1=ix?ix.getX(i+1):i+1,i2=ix?ix.getX(i+2):i+2;a.fromBufferAttribute(p,i0).applyMatrix4(o.matrixWorld);b.fromBufferAttribute(p,i1).applyMatrix4(o.matrixWorld);c.fromBufferAttribute(p,i2).applyMatrix4(o.matrixWorld);n.subVectors(b,a).cross(t.subVectors(c,a));const L=n.length();if(L<1e-10)continue;n.divideScalar(L);T.push({mi,n:n.clone(),d:n.dot(a),v:[a.clone(),b.clone(),c.clone()]});}});
 const basis=nn=>{const u=Math.abs(nn.x)<0.9?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0);u.sub(nn.clone().multiplyScalar(u.dot(nn))).normalize();return [u,nn.clone().cross(u)];};
 const area2=P=>{let s=0;for(let i=0;i<P.length;i++){const p=P[i],q=P[(i+1)%P.length];s+=p[0]*q[1]-q[0]*p[1];}return s/2;};
 const clipP=(S,C)=>{if(area2(C)<0)C=C.slice().reverse();let out=S;for(let i=0;i<C.length&&out.length;i++){const A=C[i],B=C[(i+1)%C.length],inp=out;out=[];const side=p=>(B[0]-A[0])*(p[1]-A[1])-(B[1]-A[1])*(p[0]-A[0]);for(let j=0;j<inp.length;j++){const P=inp[j],Q=inp[(j+1)%inp.length],sp=side(P),sq=side(Q);if(sp>=0)out.push(P);if((sp>=0)!==(sq>=0)){const tt=sp/(sp-sq);out.push([P[0]+(Q[0]-P[0])*tt,P[1]+(Q[1]-P[1])*tt]);}}}return out.length>=3?out:null;};
 const clip=(S,C)=>{if(area2(C)<0)C=C.slice().reverse();let out=S;for(let i=0;i<C.length&&out.length;i++){const A=C[i],B=C[(i+1)%C.length],inp=out;out=[];const side=p=>(B[0]-A[0])*(p[1]-A[1])-(B[1]-A[1])*(p[0]-A[0]);for(let j=0;j<inp.length;j++){const P=inp[j],Q=inp[(j+1)%inp.length],sp=side(P),sq=side(Q);if(sp>=0)out.push(P);if((sp>=0)!==(sq>=0)){const tt=sp/(sp-sq);out.push([P[0]+(Q[0]-P[0])*tt,P[1]+(Q[1]-P[1])*tt]);}}}return out.length>=3?Math.abs(area2(out)):0;};
 const G=new Map();T.forEach((tr,i)=>{const k=[tr.n.x,tr.n.y,tr.n.z].map(v=>Math.round(v*200)).join(',');(G.get(k)||G.set(k,[]).get(k)).push(i);});
 const res=new Map(),RC=new THREE.Raycaster(),sides=new Map();meshes.forEach(o=>{sides.set(o.material,o.material.side);o.material.side=THREE.DoubleSide;});   // 光線は面の裏にも当てる
 G.forEach(ids=>{ids.sort((x,y)=>T[x].d-T[y].d);for(let ii=0;ii<ids.length;ii++){const A=T[ids[ii]];for(let jj=ii+1;jj<ids.length;jj++){const B=T[ids[jj]];const gap=B.d-A.d;if(gap>0.0019)break;if(A.mi===B.mi)continue;const MA=meshes[A.mi].material,MB=meshes[B.mi].material;if(MA.polygonOffset||MB.polygonOffset)continue;if(MA===MB&&!MA.map)continue;   // 貼り物（描画で手前に出す設定）と、同じ材質（柄なし）どうしは見た目に差が出ないので数えない
  const sa=stateOf.get(meshes[A.mi]),sb=stateOf.get(meshes[B.mi]);if(sa&&sb&&sa.split(':')[0]===sb.split(':')[0]&&sa!==sb)continue;
  const [u,w]=basis(A.n);const P2=clipP(A.v.map(p=>[p.dot(u),p.dot(w)]),B.v.map(p=>[p.dot(u),p.dot(w)]));const ov=P2?Math.abs(area2(P2)):0;if(ov<1e-6)continue;
  // 見えない重なり：重なった所が、反対向きの面（床・壁・天井など。3つ目の部品）でぴったりふさがれている
  let cov=0;const opp=G.get([-A.n.x,-A.n.y,-A.n.z].map(v=>Math.round(v*200)).join(','));if(opp)for(const oi of opp){const O=T[oi];if(Math.abs(O.d+A.d)>0.0006||O.mi===A.mi||O.mi===B.mi)continue;cov+=clip(P2,O.v.map(p=>[p.dot(u),p.dot(w)]));if(cov>=ov*0.95)break;}
  let hidden=cov>=ov*0.95;
  if(!hidden){   // 囲まれていて見えない（壁の中など）：重なりの中心から面の外側へ9方向に光線を飛ばし、どれも15cm以内で当たる
   let cx=0,cy=0;P2.forEach(q=>{cx+=q[0];cy+=q[1];});cx/=P2.length;cy/=P2.length;const c3=u.clone().multiplyScalar(cx).add(w.clone().multiplyScalar(cy)).add(A.n.clone().multiplyScalar(A.d+0.001));
   let open=false;for(const [du,dw] of [[0,0],[0.7,0],[-0.7,0],[0,0.7],[0,-0.7],[0.5,0.5],[-0.5,0.5],[0.5,-0.5],[-0.5,-0.5]]){const dir=A.n.clone().add(u.clone().multiplyScalar(du)).add(w.clone().multiplyScalar(dw)).normalize();RC.set(c3,dir);RC.far=0.15;if(!RC.intersectObjects(meshes,false).length){open=true;break;}}
   hidden=!open;}
  const key=[A.mi,B.mi].sort((x,y)=>x-y).join('-');let r=res.get(key);if(!r){r={a:A.mi,b:B.mi,area:0,vis:0,gap,at:null};res.set(key,r);}r.area+=ov;if(!hidden){r.vis+=ov;if(!r.at){let cx=0,cy=0;P2.forEach(q=>{cx+=q[0];cy+=q[1];});cx/=P2.length;cy/=P2.length;r.at=u.clone().multiplyScalar(cx).add(w.clone().multiplyScalar(cy)).add(A.n.clone().multiplyScalar(A.d)).toArray().map(v=>+v.toFixed(3));r.n=A.n.toArray().map(v=>+v.toFixed(2));}}r.gap=Math.min(r.gap,gap);}}});
 sides.forEach((v,m)=>m.side=v);
 const list=[...res.values()].map(r=>{const A=meshes[r.a],B=meshes[r.b],pA=new THREE.Vector3();A.getWorldPosition(pA);return {kind:r.gap<0.0005?'coplanar':'near',area:r.area,vis:r.vis,at:r.at,nrm:r.n,gap:r.gap,A:A.userData._src,B:B.userData._src,ca:A.material.color?.getHexString(),cb:B.material.color?.getHexString(),same:A.material===B.material,pos:pA.toArray().map(v=>+v.toFixed(2))};});
 window.AUDIT_OVERLAP=list;
 const site=s=>{const fr=s.split(' < ');return (fr.find(x=>!x.startsWith('common.js'))||fr[0]).replace(/:\d+$/,'');};
 const agg=new Map();list.forEach(x=>{const k=[site(x.A),site(x.B)].sort().join(' & ');let r=agg.get(k);if(!r){r={k,n:0,area:0,cop:0,near:0};agg.set(k,r);}r.n++;r.area+=x.area;x.kind==='coplanar'?r.cop++:r.near++;});
 window.AUDIT_SITES=[...agg.values()].sort((a,b)=>b.area-a.area);
 return {meshes:meshes.length,visiblePairs:list.filter(x=>x.vis>1e-6).length,pairs:list.length,coplanar:list.filter(x=>x.kind==='coplanar').length,near:list.filter(x=>x.kind==='near').length,sites:agg.size};}
// その他の点検：二重の部品・つぶれた三角形・鏡像・裏から見える片面の面（向こうが透ける）
function audit2(){scene.updateMatrixWorld(true);const ms=[];scene.traverse(o=>{if(o.isMesh)ms.push(o);});const out={};
 const key=o=>{const g=o.geometry,p=g.attributes.position;let h=0;for(let i=0;i<p.array.length;i+=7)h=(h*31+Math.round(p.array[i]*1e4))|0;const e=o.matrixWorld.elements.map(v=>v.toFixed(4)).join(',');return g.type+'|'+p.count+'|'+h+'|'+e;};
 const seen=new Map(),dup=[];ms.forEach(o=>{const k=key(o);if(seen.has(k))dup.push(o.userData._src+' == '+seen.get(k).userData._src);else seen.set(k,o);});out.duplicates=dup.length;out.dupList=dup.slice(0,12);
 let deg=0;const degSrc=new Map();const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();ms.forEach(o=>{const g=o.geometry,p=g.attributes.position,ix=g.index,n=ix?ix.count:p.count;for(let i=0;i<n;i+=3){a.fromBufferAttribute(p,ix?ix.getX(i):i);b.fromBufferAttribute(p,ix?ix.getX(i+1):i+1);c.fromBufferAttribute(p,ix?ix.getX(i+2):i+2);if(b.sub(a).cross(c.sub(a)).length()<1e-12){deg++;degSrc.set(o.userData._src,(degSrc.get(o.userData._src)||0)+1);}}});out.degenerate=deg;out.degSrc=[...degSrc.entries()].sort((x,y)=>y[1]-x[1]).slice(0,6);
 out.mirrored=ms.filter(o=>o.matrixWorld.determinant()<0).map(o=>o.userData._src+(o.userData.dyn?' (動く部品)':'')).slice(0,10);out.mirroredCount=ms.filter(o=>o.matrixWorld.determinant()<0).length;
 // 裏から見える片面の面：各視点から多方向に光線を飛ばし、最初に当たった面が片面の材質の裏なら記録
 const vis=o=>{for(;o;o=o.parent)if(!o.visible)return false;return true;};const vm=ms.filter(vis);const sides=new Map();vm.forEach(o=>{sides.set(o.material,o.material.side);});vm.forEach(o=>o.material.side=THREE.DoubleSide);
 const rc=new THREE.Raycaster(),back=new Map();const pts=[];VIEWS.forEach(([n,f])=>{f();pts.push(cam.position.clone());});
 const N=1500;for(const p of pts)for(let i=0;i<N;i++){const z=Math.random()*2-1,t=Math.random()*Math.PI*2,r=Math.sqrt(1-z*z),d=new THREE.Vector3(r*Math.cos(t),z,r*Math.sin(t));rc.set(p,d);rc.far=30;const h=rc.intersectObjects(vm,false)[0];if(!h)continue;const sd=sides.get(h.object.material);if(sd===THREE.DoubleSide)continue;const nw=h.face.normal.clone().transformDirection(h.object.matrixWorld);if(nw.dot(d)>0){const k=h.object.userData._src;const e=back.get(k)||{n:0,at:h.point.toArray().map(v=>+v.toFixed(2))};e.n++;back.set(k,e);}}
 sides.forEach((v,m)=>m.side=v);setView('リビング');
 out.seeThrough=[...back.entries()].sort((x,y)=>y[1].n-x[1].n).slice(0,15).map(([k,e])=>k+' n'+e.n+' @'+e.at);return out;}
