// ドアまわりの異常検出（確認用。?lm=dbg で開く）：閉じたドアの面から35cm以内の画素（大きな面＝床・壁・天井）を、同じチャート・同じ側・ドアの面から12〜30cm離れた同じ幅の画素の平均と比べ、
// 暗すぎる（BLACK：基準の0.45倍未満）・明るすぎる（BRIGHT：基準の2.2倍超）画素を数える。anomaly(状態) で [ドアごとの {BLACK,BRIGHT,n}] と、多い所の位置を返す。基準が小さい（暗い部屋）ときは数えない
window.anomaly=(st,opt={})=>{vset(st);const W=LM.W,H=LM.H,D=LM.dbg,gl=r.getContext(),E=new Float32Array(W*H*4),P=new Float32Array(W*H*4);
 r.setRenderTarget(ET);gl.readPixels(0,0,W,H,gl.RGBA,gl.FLOAT,E);r.setRenderTarget(null);r.readRenderTargetPixels(GB,0,0,W,H,P,undefined,0);
 const lum=i=>0.2126*E[i*4]+0.7152*E[i*4+1]+0.0722*E[i*4+2],minRef=opt.minRef||3,out={},bad=[];
 SEALS.forEach((q,j)=>{const o={BLACK:0,BRIGHT:0,n:0},byG=new Map();
  for(let i=0;i<W*H;i++){const g=P[i*4+3];if(!(g>0)||!((D.SC[i]>>j)&1)||D.REG[i]<=0)continue;const x=P[i*4]-q.c.x,y=P[i*4+1],z=P[i*4+2]-q.c.z,sv=x*q.n.x+(y-q.c.y)*q.n.y+z*q.n.z-q.off,u=x*q.t.x+z*q.t.z;if(Math.abs(sv)>0.35||u<q.t0||u>q.t1)continue;
   const side=sv>0?1:0,a=Math.abs(sv),key=g*2+side;let m=byG.get(key);if(!m)byG.set(key,m=[]);m.push({i,a,u,L:lum(i),y});}
  byG.forEach(list=>{const ref=list.filter(t=>t.a>0.12&&t.a<0.30);if(ref.length<4)return;list.forEach(t=>{if(t.a>=0.12)return;const near=ref.filter(s=>Math.abs(s.u-t.u)<0.1&&Math.abs(s.y-t.y)<0.1);if(near.length<2)return;const R=near.reduce((s,v)=>s+v.L,0)/near.length;if(R<minRef)return;o.n++;if(t.L<R*0.45){o.BLACK++;bad.push([q.k,'B',t.i%W,Math.floor(t.i/W),+t.L.toFixed(1),+R.toFixed(1)]);}else if(t.L>R*2.2){o.BRIGHT++;bad.push([q.k,'L',t.i%W,Math.floor(t.i/W),+t.L.toFixed(1),+R.toFixed(1)]);}});});
  out[q.k]=o;});
 return {out,bad:bad.slice(0,opt.top||12),total:bad.length};};
