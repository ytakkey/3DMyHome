// 光漏れの確認道具（確認用）：全部のドアを閉じ、照明を部屋ごとに1つずつ点けて、ほかの部屋の面にライトマップの光が増えていないかを調べる。
if(typeof LM!=="undefined")LM.async=false;   // 確認の道具はその場で描き込む（光をなめらかに切り替える動きを止める）
// leakPrep() のあと leakTest(名前) で結果の文字列を返す（部屋の箱は確認のためだけのもの。照明の仕組みには使わない）
window.leakPrep=()=>{Object.keys(DS).forEach(k=>{if(DS[k])toggleDoor(k);});
 const gl=r.getContext(),W=LM.W,H=LM.H,P=new Float32Array(W*H*4);r.readRenderTargetPixels(GB,0,0,W,H,P,undefined,0);
 const rd=rt=>{const b=new Float32Array(W*H*4);r.setRenderTarget(rt);gl.readPixels(0,0,W,H,gl.RGBA,gl.FLOAT,b);r.setRenderTarget(null);return b;};
 const R={ldk:[0.455,4.885,0,2.4,0,7.16],dat:[-2.2725,-0.115,0,2.4,1.8175,3.0675],wash:[-2.2725,-0.57,0,2.4,3.1825,4.4325],toilet:[-2.2725,-1.48,0,2.4,4.5475,6.2525],cor:[-0.455,0.34,0,2.4,3.6375,4.5475],hall:[-1.365,0.34,-0.18,2.4,4.5475,7.16],doma2:[-2.2725,-1.365,-0.18,2.4,6.3675,7.16],bath:[-2.19375,-0.19375,0,2.12,0.05125,1.65125],bed:[-2.2725,0.34,2.9,5.3,3.6375,7.16],wic:[0.455,2.16,2.9,5.3,3.6375,5.3425],study:[0.455,2.16,2.9,5.3,5.4575,7.16]},M=0.04;
 const idx={};for(const k in R)idx[k]=[];for(let i=0;i<W*H;i++){if(P[i*4+3]===0)continue;const x=P[i*4],y=P[i*4+1],z=P[i*4+2];for(const k in R){const [x0,x1,y0,y1,z0,z1]=R[k];if(x>x0+M&&x<x1-M&&y>y0-0.01&&y<y1+0.01&&z>z0+M&&z<z1-M)idx[k].push(i);}}
 const only=(n,keys)=>{setNight(n);Object.keys(LS).forEach(k=>LS[k]=keys.includes(k));applyEnvAll();};
 only(1,[]);const base=[ED,EB1,EBT,ET].map(rd);window._LK={P,rd,idx,only,base};return Object.fromEntries(Object.entries(idx).map(([k,v])=>[k,v.length]));};
window.LEAKG={ldk:[['a6','a4','a2','h1','a5','a3','a1'],['ldk']],bed:[['bdl','bbr'],['bed']],hall2:[['j1'],[]],wic:[['l1'],['wic']],study:[['k1'],['study']],dat:[['e1'],['dat']],wash:[['d1'],['wash']],bath:[['bath'],['bath']],entry:[['eh','ek','ec'],['hall','cor','doma2']],toilet:[['g1'],['toilet']]};
window.leakTest=(g,th=0.2)=>{const L=window._LK,[keys,own]=LEAKG[g];L.only(1,keys);const E=[ED,EB1,EBT,ET].map(L.rd),o=[];
 for(const k in L.idx){if(own.includes(k))continue;let m=0,mi=0,s=0;L.idx[k].forEach(i=>{const d=E[3][i*4+1]-L.base[3][i*4+1];s+=Math.max(d,0);if(d>m){m=d;mi=i;}});
  if(m>th){const c=[0,1,2].map(j=>(E[j][mi*4+1]-L.base[j][mi*4+1]).toFixed(2)).join('/');o.push(k+' max '+m.toFixed(2)+'('+c+') mean '+(s/L.idx[k].length).toFixed(3)+' @'+[L.P[mi*4],L.P[mi*4+1],L.P[mi*4+2]].map(v=>v.toFixed(2)).join(','));}}return g+': '+(o.join(' | ')||'なし');};   // 括弧の中：直接/照り返し1回目/2回目
// 漏れの元を調べる：leakTex(照明の組, 部屋) で、その部屋でいちばん漏れている画素（番号 mi）と量。texInfo(mi) で、その画素の位置・向き・チャート
window.leakTex=(g,room)=>{const L=window._LK,[keys]=LEAKG[g];L.only(1,keys);const E=L.rd(ET);let m=0,mi=-1;L.idx[room].forEach(i=>{const d=E[i*4+1]-L.base[3][i*4+1];if(d>m){m=d;mi=i;}});return {mi,m,pos:[L.P[mi*4],L.P[mi*4+1],L.P[mi*4+2]]};};
window.texInfo=(mi)=>{const W=LM.W,x=mi%W,y=Math.floor(mi/W);const P=new Float32Array(4),N=new Float32Array(4);r.readRenderTargetPixels(GB,x,y,1,1,P,undefined,0);r.readRenderTargetPixels(GB,x,y,1,1,N,undefined,1);
 const gid=Math.abs(P[3]),ch=LM.charts[gid-1],big=LM.slabB.find(S=>S.c===ch);return {x,y,pos:[...P].slice(0,3).map(v=>+v.toFixed(3)),n:[...N].slice(0,3).map(v=>+v.toFixed(2)),w:P[3],chart:ch?{x:ch.x,y:ch.y,w:ch.w,h:ch.h}:null,big:!!big,bigBox:big?[big.box.min.toArray().map(v=>+v.toFixed(2)),big.box.max.toArray().map(v=>+v.toFixed(2))]:null};};
// 照り返しの漏れの元を探す：leakWho(1か2, 画素の番号) で、その回の照り返しで光る面を1つずつ描き込み、その画素に届く量の多い順に返す（画像全体の描き方で計算する）
window.leakWho=(pass,mi,top=6)=>{const W=LM.W,x=mi%W,y=Math.floor(mi/W);const rec=[];const oe=bakeEmitter;bakeEmitter=function(e,t){rec.push({...e,pos:e.pos.clone(),dir:e.dir.clone(),colv:e.colv.clone()});};
 try{if(pass===1)bounce(ED,EBT,EG,NSHOOT[0]);else bounce(EB1,EG,null,NSHOOT[1]);}finally{bakeEmitter=oe;}
 const N=new Float32Array(4),P=new Float32Array(4);r.readRenderTargetPixels(GBP,x,y,1,1,P);r.readRenderTargetPixels(GB,x,y,1,1,N,undefined,1);const rp=new THREE.Vector3(P[0],P[1],P[2]),rn=new THREE.Vector3(N[0],N[1],N[2]).normalize();
 const cand=rec.filter(e=>{const L=e.pos.clone().sub(rp);return L.dot(rn)>0&&(!e.lamb||rp.clone().sub(e.pos).dot(e.dir)>0);});
 const u=bakeMat.uniforms,buf=new Float32Array(4),res=[];
 cand.forEach(e=>{distMat.uniforms.sun.value=0;distMat.uniforms.lp.value.copy(e.pos);CCAM2.position.copy(e.pos);CCAM2.updateMatrixWorld(true);r.setClearColor(0x000000,0);cubeUp(CCAM2,CUBE2,OCCB,e);
  u.kind.value=0;u.sh.value=CUBE2.texture;u.cres.value=CUBE2.width;u.lp.value.copy(e.pos);u.ld.value.copy(e.dir);u.col.value.copy(e.colv);u.isPt.value=0;u.lamb.value=1;u.cosO.value=Math.cos(1);u.cosI.value=Math.cos(1);u.r2.value=e.r2;u.soft.value=e.soft;u.cau.value=0;u.useM.value=0;
  r.setRenderTarget(EBT);r.setClearColor(0x000000,0);r.clear();bq.material=bakeMat;r.autoClear=false;r.render(BQ,CAM0);r.autoClear=true;r.setRenderTarget(EBT);r.getContext().readPixels(x,y,1,1,r.getContext().RGBA,r.getContext().FLOAT,buf);res.push({v:+buf[1].toFixed(3),pos:e.pos.toArray().map(v=>+v.toFixed(3)),dir:e.dir.toArray().map(v=>+v.toFixed(2)),phi:+(e.colv.y).toFixed(4)});});
 r.setRenderTarget(null);res.sort((a,b)=>b.v-a.v);relight();return {rp:rp.toArray().map(v=>+v.toFixed(3)),rn:rn.toArray().map(v=>+v.toFixed(2)),nShoot:rec.length,cand:cand.length,top:res.slice(0,top)};};
// leakWhoPts：実際の描き込み（点）で、光る面ごとにその画素へ届く量を調べる
window.leakWhoPts=(pass,mi,top=6)=>{const W=LM.W,x=mi%W,y=Math.floor(mi/W),gl=r.getContext();const rec=[];const oe=bakeEmitter;bakeEmitter=function(e,t){rec.push({...e,pos:e.pos.clone(),dir:e.dir.clone(),colv:e.colv.clone()});};
 try{if(pass===1)bounce(ED,EBT,EG,NSHOOT[0]);else bounce(EB1,EG,null,NSHOOT[1]);}finally{bakeEmitter=oe;}
 const buf=new Float32Array(4),res=[];rec.forEach(e=>{r.setRenderTarget(EBT);r.setClearColor(0x000000,0);r.clear();ecClear();bakeEmitter(e,EBT);ecScatter(EBT);r.setRenderTarget(EBT);gl.readPixels(x,y,1,1,gl.RGBA,gl.FLOAT,buf);if(buf[1]>0)res.push({v:+buf[1].toFixed(3),pos:e.pos.toArray().map(v=>+v.toFixed(3)),dir:e.dir.toArray().map(v=>+v.toFixed(2)),phi:+(e.colv.y).toFixed(3),r2:+e.r2.toFixed(4)});});
 r.setRenderTarget(null);res.sort((a,b)=>b.v-a.v);relight();return {n:rec.length,hits:res.length,top:res.slice(0,top)};};
