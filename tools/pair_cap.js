// 本番（index.html）と検証ページ（STG/）を同じ視点・状態で撮る（見比べ用。CLAUDE.md 8章の確認の一覧）
// 使い方：eval(await (await fetch('/tools/pair_cap.js')).text()); await pairCap('<名前>', 960, 540, [視点,...]|null, 夜か)
// 状態：試作のドア3枚を開。昼＝照明すべて消灯、夜＝照明すべて点灯。保存は bake/work/pair/<視点>__<名前>.png
var PAIRV={   // 名前：[目, 見る点, 視野角]（three.js の座標）
 bed_home:[[0.1475,4.1,6.9475],[-2.0725,3.75,3.6375],85],
 bed_ne:[[-1.6,4.1,6.6],[0.3,3.3,3.7],85],
 bed_sw:[[0.0,4.1,4.1],[-2.2,3.3,7.1],85],
 bed_ewall:[[-1.9,4.0,5.4],[0.34,3.4,5.4],80],
 bed_door311:[[-0.6,4.0,5.2],[-0.05,3.5,3.64],75],
 bed_window:[[-1.0,4.0,6.0],[-1.0,3.9,7.16],75],
 hall_e:[[-0.35,4.1,3.1],[4.5,3.7,3.1],80],
 hall_w:[[4.2,4.1,3.1],[-0.5,3.6,3.1],80],
 hall_to_bed:[[-0.05,4.1,2.85],[-0.05,3.4,3.9],80],
 wic_in:[[0.55,4.1,4.4],[2.1,3.4,4.6],85],
 wic_out:[[1.9,4.1,4.5],[0.34,3.4,4.5],80],
 study_in:[[0.7,4.1,6.2],[2.1,3.5,7.0],85],
 study_out:[[1.9,4.1,6.6],[0.34,3.5,6.4],80],
 jamb500w:[[-0.25,3.9,4.85],[0.45,3.6,4.85],65],
 jamb33s:[[-0.25,3.9,6.75],[0.45,3.6,6.75],65],
 jamb311:[[-0.35,3.9,3.95],[-0.05,3.6,3.55],65],
 living:[[3.84,1.2,6.95],[0.56,1.05,3.18],85],
 kitchen:[[4.67,1.2,0.8],[1.29,0.95,2.93],85],
 tv_base:[[1.7,0.8,5.6],[0.455,0.15,5.9],75],
 stairs:[[2.9,1.2,5.6],[4.4,1.6,4.3],85],
 dining:[[3.6,1.2,1.2],[0.4,0.7,1.6],85],
 west_doors:[[1.8,1.2,2.4],[0.0,0.9,2.0],85],
 void_down:[[3.0,4.1,3.4],[3.4,0.8,6.2],85],
 ldk_ceil:[[2.4,1.2,4.8],[2.4,2.4,3.0],85],
 stool:[[3.5,1.3,4.2],[3.5,0.6,2.69],60],
 downlight:[[-0.47,4.6,4.7],[-0.47,5.3,5.44],70],
 aircon:[[-1.0,4.4,5.0],[-1.67,4.94,3.64],60]};
async function pairCap(tag,W=960,H=540,only,night=false){const trial=typeof T!=='undefined';
 if(trial)await T.set({night,LS:Object.fromEntries(Object.keys(LS).map(k=>[k,night])),DS:{sg311:true,sg500w:true,sg33s:true}});
 else{setNight(night);setAll(night);['sg311','sg500w','sg33s'].forEach(k=>{if(!DS[k]){DS[k]=true;updMove();showDoor(k);if(k==='sg311'){doorZones();updateLights();}}});}
 r.setPixelRatio(1);r.setSize(W,H,false);cam.aspect=W/H;cam.updateProjectionMatrix();
 for(const v in PAIRV){if(only&&!only.includes(v))continue;const [e,t,f]=PAIRV[v],d=[t[0]-e[0],t[1]-e[1],t[2]-e[2]];cam.position.set(...e);cam.fov=f;cam.updateProjectionMatrix();yaw=Math.atan2(-d[0],-d[2]);pitch=Math.atan2(d[1],Math.hypot(d[0],d[2]));draw();
  const u=r.domElement.toDataURL('image/png');await fetch('/save?path=bake/work/pair/'+v+'__'+tag+'.png',{method:'POST',body:await (await fetch(u)).blob()});}
 r.setPixelRatio(Math.min(window.devicePixelRatio||1,2));r.setSize(window.innerWidth,window.innerHeight);cam.aspect=window.innerWidth/window.innerHeight;cam.updateProjectionMatrix();draw();return 'ok';}
