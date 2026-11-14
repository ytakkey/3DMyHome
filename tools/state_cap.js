// リアル版（real/）を、決まった状態×視点で撮る（作りを変える前後で、画素が同じかを比べる用。tools/blender/imgcmp.py で比べる）
// 使い方：real/?seed=1 を開き（seed：ラメの柄を毎回同じにする）、eval(await (await fetch('/tools/state_cap.js')).text()); await stateCap('<名前>')
// 保存は bake/work/pair/<視点>__<名前><状態の番号>.png（視点は tools/pair_cap.js の PAIRV）
var SCAP_V=['living','kitchen','dining','tv_base','stairs','void_down','sofa_gap','table','west_doors','bed_home','bed_ne','hall_e','wic_in','study_in','dress','bath','wash','corridor','hall1','doma','toilet','sg500','lame_tv3','lame_wc','brk1','downlight'];
var SCAP_S=[   // 状態：開いたときのまま／夜・全点灯・ドア全開／昼・全消灯・ドア全閉・シェード6割／夜・一部の照明・開いたときのドア
 s=>({}),
 s=>({night:true,shade:0,LS:Object.fromEntries(Object.keys(LS).map(k=>[k,true])),DS:Object.fromEntries(Object.keys(DS).map(k=>[k,true]))}),
 s=>({night:false,shade:0.6,LS:Object.fromEntries(Object.keys(LS).map(k=>[k,false])),DS:Object.fromEntries(Object.keys(DS).map(k=>[k,false]))}),
 s=>({night:true,shade:0,LS:{...Object.fromEntries(Object.keys(LS).map(k=>[k,false])),a4:true,a5:true,eh:true,bdl:true,g1:true,d1:true},DS:{...s.DS}})];
// いまの状態のまま、視点だけ変えて撮る（軽量版 lite/?seed=1 でも使える。?dev の昼夜・照明・ドアは pair_cap.js の pairCap で）
async function viewCap(tag,W=960,H=540,views){eval(await (await fetch('/tools/pair_cap.js')).text());r.setPixelRatio(1);r.setSize(W,H,false);cam.aspect=W/H;cam.updateProjectionMatrix();
 for(const v of views||SCAP_V){const [e,t,f]=PAIRV[v],d=[t[0]-e[0],t[1]-e[1],t[2]-e[2]];cam.position.set(...e);cam.fov=f;cam.updateProjectionMatrix();yaw=Math.atan2(-d[0],-d[2]);pitch=Math.atan2(d[1],Math.hypot(d[0],d[2]));draw();
  const b=await (await fetch(r.domElement.toDataURL('image/png'))).blob();
  for(let k=0;;k++){try{await fetch('/save?path=bake/work/pair/'+v+'__'+tag+'.png',{method:'POST',body:b});break;}catch(x){if(k>=4)throw x;await new Promise(q=>setTimeout(q,1000));}}}
 r.setPixelRatio(Math.min(window.devicePixelRatio||1,2));r.setSize(window.innerWidth,window.innerHeight);cam.aspect=window.innerWidth/window.innerHeight;cam.updateProjectionMatrix();draw();return 'ok';}
// 場面で使っている柄の画像（キャンバス・データ）の中身を1つずつ数にまとめる（軽量版。柄を作る計算を速くしたとき、前後で同じ数になることを確かめる）
function texHashes(){const out={},seen=new Set();scene.traverse(o=>{if(!o.isMesh)return;for(const k of ['map','normalMap','specularMap','emissiveMap','envMap','alphaMap','bumpMap']){const t=o.material[k];if(!t||seen.has(t.image))continue;seen.add(t.image);
  for(const im of Array.isArray(t.image)?t.image:[t.image]){let d=null;if(im&&im.getContext)d=im.getContext('2d').getImageData(0,0,im.width,im.height).data;else if(im&&im.data)d=im.data;if(!d)continue;
   let h=2166136261;for(let i=0;i<d.length;i++){h^=d[i];h=Math.imul(h,16777619);}const key=im.width+'x'+im.height+':'+(h>>>0).toString(16);out[key]=(out[key]||0)+1;}}});return out;}
async function stateCap(tag,W=960,H=540,views){eval(await (await fetch('/tools/pair_cap.js')).text());const s0={LS:{...LS},DS:{...DS},night,shade:shadeP};
 r.setPixelRatio(1);r.setSize(W,H,false);cam.aspect=W/H;cam.updateProjectionMatrix();
 for(let i=0;i<SCAP_S.length;i++){await T.set({...s0,...SCAP_S[i](s0)});
  for(const v of views||SCAP_V){const [e,t,f]=PAIRV[v],d=[t[0]-e[0],t[1]-e[1],t[2]-e[2]];cam.position.set(...e);cam.fov=f;cam.updateProjectionMatrix();yaw=Math.atan2(-d[0],-d[2]);pitch=Math.atan2(d[1],Math.hypot(d[0],d[2]));draw();
   const b=await (await fetch(r.domElement.toDataURL('image/png'))).blob();
   for(let k=0;;k++){try{await fetch('/save?path=bake/work/pair/'+v+'__'+tag+i+'.png',{method:'POST',body:b});break;}catch(x){if(k>=4)throw x;await new Promise(q=>setTimeout(q,1000));}}}}
 await T.set(s0);r.setPixelRatio(Math.min(window.devicePixelRatio||1,2));r.setSize(window.innerWidth,window.innerHeight);cam.aspect=window.innerWidth/window.innerHeight;cam.updateProjectionMatrix();draw();return 'ok';}
