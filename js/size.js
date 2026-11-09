// ===== 家具のサイズ（軽量版 lite/ のパネル「家具のサイズ」） =====
// ダイニングテーブルの幅・奥行・高さをその場で変える（2026-11-09 ユーザー：幅 140〜160cm・5cm刻み、奥行 80〜90cm・5cm刻み、高さ 70〜80cm・1cm刻み）
// 拡大・縮小でなく、その寸法で作り直す（ldk.js の diningSet。脚の太さ・椅子は変えない。キッチン側の東の端と南北の中心はそのまま。ペンダントは天井に付いたまま動かさない）
// 変えたサイズはこの端末に覚える（localStorage。使えないときは毎回標準から）
const SZ=[['w','幅',140,160,5,150],['d','奥行',80,90,5,85],['h','高さ',70,80,1,70]];   // [キー, 名前, 最小, 最大, 刻み, 標準]（cm）
const SZKEY='3dmyhome.dining';
const sz={};SZ.forEach(([k,,lo,hi,st,df])=>sz[k]=df);
try{const v=JSON.parse(localStorage.getItem(SZKEY)||'null');if(v)SZ.forEach(([k,,lo,hi,st])=>{const n=Number(v[k]);if(n>=lo&&n<=hi&&(n-lo)%st===0)sz[k]=n;});}catch(e){}
function setDining(){dining.parts.forEach(o=>{o.parent.remove(o);o.geometry.dispose();});dining.parts.length=0;   // 材質は共有なので残す（光の範囲のシェーダーも付いたまま）
 s=scene;dining.set(sz.w/100,sz.d/100,sz.h/100);
 try{localStorage.setItem(SZKEY,JSON.stringify(sz));}catch(e){}
 SZ.forEach(([k,,,,,df])=>{$('sz_'+k).value=sz[k];$('szv_'+k).textContent=sz[k]+'cm';});
 mark($('szReset'),false);$('szReset').disabled=SZ.every(([k,,,,,df])=>sz[k]===df);draw();}
{const box=$('szRows');SZ.forEach(([k,nm,lo,hi,st])=>{const row=document.createElement('div');row.className='szrow';
  const step=d=>{const n=Math.min(hi,Math.max(lo,sz[k]+d*st));if(n!==sz[k]){sz[k]=n;setDining();}};
  row.innerHTML=`<span class="szn">${nm}</span><button class="tg" aria-label="${nm}を${st}cm小さく">−</button><input type="range" id="sz_${k}" min="${lo}" max="${hi}" step="${st}" aria-label="${nm}（cm）"><button class="tg" aria-label="${nm}を${st}cm大きく">＋</button><b id="szv_${k}"></b>`;
  const [bm,bp]=row.querySelectorAll('button');bm.onclick=()=>step(-1);bp.onclick=()=>step(1);
  row.querySelector('input').oninput=e=>{const n=Number(e.target.value);if(n!==sz[k]){sz[k]=n;setDining();}};
  box.appendChild(row);});}
$('szReset').onclick=()=>{SZ.forEach(([k,,,,,df])=>sz[k]=df);setDining();};
$('bSize').onclick=()=>{openSheet('size');if(openK==='size'){clearView();look(2.4,2.2,4.7,1.45,-0.6,2.15,72);$('viewLbl').textContent='ダイニング';}};   // 開いたら、テーブル全体がパネルより上に見える視点へ（南東の上から見下ろす。スマホの縦でもパネルに隠れない）
setDining();
