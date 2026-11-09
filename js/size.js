// ===== 家具のサイズ（軽量版 lite/ のパネル「家具のサイズ」） =====
// ダイニングテーブルの幅・奥行・高さをその場で変える（2026-11-09 ユーザー：幅 140〜160cm・5cm刻み、奥行 80〜90cm・5cm刻み、高さ 70〜80cm・1cm刻み）
// 拡大・縮小でなく、その寸法で作り直す（ldk.js の diningSet。脚の太さ・椅子は変えない。キッチン側の東の端と南北の中心はそのまま。ペンダントは天井に付いたまま動かさない）
// テレビは 65・75・85・100・116 インチから選ぶ（2026-11-09 ユーザー。標準 75。ldk.js の tvSet：下の端の高さとテレビ面の中心はそのまま、上と左右へ広がる）
// 変えたサイズは覚えない。開くたびに標準のサイズ（2026-11-09 ユーザー「記憶しなくていい。毎回今のデフォルトのサイズにして」）
const SZ=[['w','幅',140,160,5,150],['d','奥行',80,90,5,85],['h','高さ',70,80,1,70]];   // [キー, 名前, 最小, 最大, 刻み, 標準]（cm）
const TVI=[65,75,85,100,116],TVDEF=75;
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
function diningView(){if(szSee==='dining')return;szSee='dining';clearView();look(0.15,2.25,0.6,1.0,-1.0,3.05,75);$('viewLbl').textContent='ダイニング';}   // テーブルの後ろ（北西）の内壁の角の上から、テーブルとキッチンを見下ろす（2026-11-09 ユーザー）。幅を変えると手前（西）へ伸びる
function tvView(){if(szSee==='tv')return;szSee='tv';clearView();look(3.75,1.8,5.825,0.455,-0.3,5.825,80);$('viewLbl').textContent='テレビ';}   // ソファの後ろの上から、テレビ面の正面（東の階段の桁が入らない所。116 型でも上の端まで入る）
$('szReset').onclick=()=>{SZ.forEach(([k,,,,,df])=>sz[k]=df);tvIn=TVDEF;setDining();setTv();};
$('bSize').onclick=()=>{openSheet('size');szSee=null;if(openK==='size')diningView();};
['pointerdown','wheel','keydown'].forEach(t=>window.addEventListener(t,e=>{if(!e.target.closest||!e.target.closest('#panel'))szSee=null;},true));   // 自分で動いたり見回したりしたら、次に変えるときはまたその物の視点へ
setDining();setTv();
