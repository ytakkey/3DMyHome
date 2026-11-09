// ===== 家具のサイズ（軽量版 lite/ のパネル「家具のサイズ」） =====
// ダイニングテーブルの幅・奥行・高さをその場で変える（2026-11-09 ユーザー：幅 140〜160cm・5cm刻み、奥行 80〜90cm・5cm刻み、高さ 70〜80cm・1cm刻み）
// 拡大・縮小でなく、その寸法で作り直す（ldk.js の diningSet。脚の太さ・椅子は変えない。キッチン側の東の端と南北の中心はそのまま。ペンダントは天井に付いたまま動かさない）
// テレビは 40・65・75・85・100・116 インチから選ぶ（2026-11-09 ユーザー。標準 75。ldk.js の tvSet：下の端の高さとテレビ面の中心はそのまま、上と左右へ広がる）
// 変えたサイズは覚えない。開くたびに標準のサイズ（2026-11-09 ユーザー「記憶しなくていい。毎回今のデフォルトのサイズにして」）
const SZ=[['w','幅',140,160,5,150],['d','奥行',80,90,5,85],['h','高さ',70,80,1,70]];   // [キー, 名前, 最小, 最大, 刻み, 標準]（cm）
const TVI=[40,65,75,85,100,116],TVDEF=75;   // 40 はいまの家のテレビ（2026-11-09 ユーザー）
const sz={};SZ.forEach(([k,,lo,hi,st,df])=>sz[k]=df);let tvIn=TVDEF;
const rebuild=P=>{P.parts.forEach(o=>{o.parent.remove(o);o.geometry.dispose();});P.parts.length=0;s=scene;};   // 材質は共有なので残す（光の範囲のシェーダーも付いたまま）
function syncReset(){$('szReset').disabled=SZ.every(([k,,,,,df])=>sz[k]===df)&&tvIn===TVDEF;}
function setDining(){rebuild(dining);dining.set(sz.w/100,sz.d/100,sz.h/100);
 SZ.forEach(([k])=>{$('sz_'+k).value=sz[k];$('szv_'+k).textContent=sz[k]+'cm';});syncReset();draw();}
function setTv(){rebuild(tv);tv.set(tvIn);
 $('tvRow').querySelectorAll('button').forEach(b=>mark(b,Number(b.dataset.in)===tvIn));syncReset();draw();}
{const box=$('szRows');SZ.forEach(([k,nm,lo,hi,st])=>{const row=document.createElement('div');row.className='szrow';
  const step=d=>{const n=Math.min(hi,Math.max(lo,sz[k]+d*st));if(n!==sz[k]){sz[k]=n;setDining();}};
  row.innerHTML=`<span class="szn">${nm}</span><button class="tg" aria-label="${nm}を${st}cm小さく">−</button><input type="range" id="sz_${k}" min="${lo}" max="${hi}" step="${st}" aria-label="${nm}（cm）"><button class="tg" aria-label="${nm}を${st}cm大きく">＋</button><b id="szv_${k}"></b>`;
  const [bm,bp]=row.querySelectorAll('button');bm.onclick=()=>{diningView();step(-1);};bp.onclick=()=>{diningView();step(1);};
  row.querySelector('input').oninput=e=>{diningView();const n=Number(e.target.value);if(n!==sz[k]){sz[k]=n;setDining();}};
  box.appendChild(row);});}
{const row=$('tvRow');TVI.forEach(n=>{const b=document.createElement('button');b.className='tg';b.setAttribute('role','radio');b.dataset.in=n;b.textContent=n+'型';
  b.onclick=()=>{tvView();if(n!==tvIn){tvIn=n;setTv();}};row.appendChild(b);});}
// 視点：変える物が全体でパネルより上に見える所（スマホの縦でもパネルに隠れない）。いま見ている物と違う物を変えたときだけ移る
let szSee=null;
function diningView(){if(szSee==='dining')return;szSee='dining';clearView();VK=1;look(0.3,2.2,3.25,2.05,0.05,1.1,75);frame();$('viewLbl').textContent='ダイニング';}   // 南西の仕切り壁の角の上から、テーブル越しに冷蔵庫・カップボード・アイランドを見下ろす（2026-11-09 ユーザーのスクリーンショットの視点）。幅を変えると左手前（西）へ伸びる
function tvView(){if(szSee==='tv')return;szSee='tv';clearView();   // ソファの後ろから、テレビ面の正面を水平に（2026-11-09 ユーザー「上からの角度つきすぎ」「正面からテレビを中心に」。東の階段の桁が入らない所）
 const W=window.innerWidth,H=window.innerHeight,rc=$('sheet').getBoundingClientRect(),side=rc.left>W*0.4,fw=side?rc.left:W,fh=side?H:rc.top,X=3.75,Y=1.348,dist=X-0.455;   // Y：116 型の中心の高さ
 const k=1.15*Math.max(1.476*H/fh,2.574*H/fw)/(2*dist);   // 116 型（1476×2574）が空いている所に余白つきで収まる視野（横長の画面では壁の両脇も見えるよう 58 度より狭くしない）。大きさの違いが比べられるよう、どの大きさでも同じ視野にする
 VK=1;look(X,Y,5.825,0.455,Y,5.825,Math.min(100,Math.max(58,Math.atan(k)*360/Math.PI)));frame();$('viewLbl').textContent='テレビ';}
$('szReset').onclick=()=>{SZ.forEach(([k,,,,,df])=>sz[k]=df);tvIn=TVDEF;setDining();setTv();};
// パネルが開いている間は、写す範囲をパネルの外の空いている所へずらす（レンズのシフト。カメラは傾けない）：横長の画面はパネルの左、縦長の画面（スマホ）はパネルの上の真ん中に、見ている物が来る。
// 縦にずらすときは、見える高さを変えないよう視野角を広げ（VK：tan の倍率）、パネルを閉じたら元に戻す（2026-11-09 ユーザー「正面からテレビを中心に」。スマホではパネルが画面の下半分を覆う）
let VK=1;
function frame(){const W=window.innerWidth,H=window.innerHeight,t=Math.tan(cam.fov*Math.PI/360)/VK;VK=1;cam.clearViewOffset();cam.aspect=W/H;
 if(openK==='size'){const rc=$('sheet').getBoundingClientRect();
  if(rc.left>W*0.4){const d=Math.max(0,W/2-rc.left/2);if(d>0){cam.setViewOffset(W+2*d,H,2*d,0,W,H);cam.aspect=(W+2*d)/H;}}   // パネルの左の真ん中へ
  else{const d=Math.max(0,H/2-rc.top/2);if(d>0){cam.setViewOffset(W,H+2*d,0,2*d,W,H);cam.aspect=W/(H+2*d);VK=(H+2*d)/H;}}}   // パネルの上の真ん中へ
 cam.fov=Math.atan(t*VK)*360/Math.PI;cam.updateProjectionMatrix();draw();}
{const os=openSheet;openSheet=k=>{os(k);frame();};}   // パネルを開け閉めするたびに合わせる
window.addEventListener('resize',frame);   // ui.js の resize（視野の縦横比を戻す）の後に
$('bSize').onclick=()=>{openSheet('size');szSee=null;if(openK==='size')diningView();};
['pointerdown','wheel','keydown'].forEach(t=>window.addEventListener(t,e=>{if(!e.target.closest||!e.target.closest('#panel'))szSee=null;},true));   // 自分で動いたり見回したりしたら、次に変えるときはまたその物の視点へ
setDining();setTv();
