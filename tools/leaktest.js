// 光漏れの確認道具（確認用）：全部のドアを閉じ、照明を部屋ごとに1つずつ点けて、ほかの部屋の面にライトマップの光が増えていないかを調べる。
if(typeof LM!=="undefined")LM.async=false;   // 確認の道具はその場で描き込む（光をなめらかに切り替える動きを止める）
// leakPrep() のあと leakTest(名前) で結果の文字列を返す（部屋の箱は確認のためだけのもの。照明の仕組みには使わない）
window.leakPrep=()=>{Object.keys(DS).forEach(k=>{if(DS[k])toggleDoor(k);});
 const gl=r.getContext(),W=LM.W,H=LM.H,P=new Float32Array(W*H*4);r.readRenderTargetPixels(GB,0,0,W,H,P,undefined,0);
 const rd=rt=>{const b=new Float32Array(W*H*4);r.setRenderTarget(rt);gl.readPixels(0,0,W,H,gl.RGBA,gl.FLOAT,b);r.setRenderTarget(null);return b;};
 const R={ldk:[0.455,4.885,0,2.4,0,7.16],dat:[-2.2725,-0.115,0,2.4,1.8175,3.0675],wash:[-2.2725,-0.57,0,2.4,3.1825,4.4325],toilet:[-2.2725,-1.48,0,2.4,4.5475,6.2525],cor:[-0.455,0.34,0,2.4,3.6375,4.5475],hall:[-1.365,0.34,-0.18,2.4,4.5475,7.16],doma2:[-2.2725,-1.365,-0.18,2.4,6.3675,7.16],bath:[-2.19375,-0.19375,0,2.12,0.05125,1.65125],bed:[-2.2725,0.34,2.9,5.3,3.6375,7.16],wic:[0.455,2.16,2.9,5.3,3.6375,5.3425],study:[0.455,2.16,2.9,5.3,5.4575,7.16]},M=0.04;
 const idx={};for(const k in R)idx[k]=[];for(let i=0;i<W*H;i++){if(P[i*4+3]===0)continue;const x=P[i*4],y=P[i*4+1],z=P[i*4+2];for(const k in R){const [x0,x1,y0,y1,z0,z1]=R[k];if(x>x0+M&&x<x1-M&&y>y0-0.01&&y<y1+0.01&&z>z0+M&&z<z1-M)idx[k].push(i);}}
 const only=(n,keys)=>{setNight(n);Object.keys(LS).forEach(k=>LS[k]=keys.includes(k));applyEnvAll();};
 only(1,[]);const base=[ED,EB1,EB2,ET].map(rd);window._LK={P,rd,idx,only,base};return Object.fromEntries(Object.entries(idx).map(([k,v])=>[k,v.length]));};
window.LEAKG={ldk:[['a6','a4','a2','h1','a5','a3','a1'],['ldk']],bed:[['bdl','bbr'],['bed']],hall2:[['j1'],[]],wic:[['l1'],['wic']],study:[['k1'],['study']],dat:[['e1'],['dat']],wash:[['d1'],['wash']],bath:[['bath'],['bath']],entry:[['eh','ek','ec'],['hall','cor','doma2']],toilet:[['g1'],['toilet']]};
window.leakTest=(g,th=0.2)=>{const L=window._LK,[keys,own]=LEAKG[g];L.only(1,keys);const E=[ED,EB1,EB2,ET].map(L.rd),o=[];
 for(const k in L.idx){if(own.includes(k))continue;let m=0,mi=0,s=0;L.idx[k].forEach(i=>{const d=E[3][i*4+1]-L.base[3][i*4+1];s+=Math.max(d,0);if(d>m){m=d;mi=i;}});
  if(m>th){const c=[0,1,2].map(j=>(E[j][mi*4+1]-L.base[j][mi*4+1]).toFixed(2)).join('/');o.push(k+' max '+m.toFixed(2)+'('+c+') mean '+(s/L.idx[k].length).toFixed(3)+' @'+[L.P[mi*4],L.P[mi*4+1],L.P[mi*4+2]].map(v=>v.toFixed(2)).join(','));}}return g+': '+(o.join(' | ')||'なし');};   // 括弧の中：直接/照り返し1回目/2回目
