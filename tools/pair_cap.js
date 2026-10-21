// 本番（index.html）と検証ページ（STG/）を同じ視点・状態で撮る（見比べ用）：eval(await (await fetch('/tools/pair_cap.js')).text()); await pairCap('prod'|'trial')
// 状態：昼・照明すべて消灯・試作のドア3枚を開。保存は bake/work/pair/<視点>__<prod|trial>.png
const PAIRV={
 downlight:[[-0.47,4.6,4.7],[-0.47,5.3,5.44],70],
 aircon:[[-1.0,4.4,5.0],[-1.67,4.94,3.64],60],
 stool:[[3.5,1.3,4.2],[3.5,0.6,2.69],60],
 base_bed:[[-0.5,3.6,5.5],[-2.2,3.0,6.5],75],
 door311:[[-0.05,4.0,2.9],[-0.05,3.2,3.7],75],
 door500w:[[-0.6,3.8,4.85],[0.4,3.1,4.85],75],
 door33s:[[-0.5,3.8,6.75],[0.5,3.2,6.75],75],
 living:[[3.84,1.2,6.95],[0.56,1.05,3.18],85]};
async function pairCap(tag,W=960,H=540){const trial=typeof T!=='undefined';
 if(trial)await T.set({night:false,LS:{bdl:false,bbr:false,j1:false,l1:false,k1:false,h1:false},DS:{sg311:true,sg500w:true,sg33s:true}});
 else{setNight(false);setAll(false);['sg311','sg500w','sg33s'].forEach(k=>{if(!DS[k]){DS[k]=true;updMove();showDoor(k);if(k==='sg311'){doorZones();updateLights();}}});}
 r.setPixelRatio(1);r.setSize(W,H,false);cam.aspect=W/H;cam.updateProjectionMatrix();
 for(const v in PAIRV){const [e,t,f]=PAIRV[v],d=[t[0]-e[0],t[1]-e[1],t[2]-e[2]];cam.position.set(...e);cam.fov=f;cam.updateProjectionMatrix();yaw=Math.atan2(-d[0],-d[2]);pitch=Math.atan2(d[1],Math.hypot(d[0],d[2]));draw();
  const u=r.domElement.toDataURL('image/png');await fetch('/save?path=bake/work/pair/'+v+'__'+tag+'.png',{method:'POST',body:await (await fetch(u)).blob()});}
 r.setPixelRatio(Math.min(window.devicePixelRatio||1,2));r.setSize(window.innerWidth,window.innerHeight);cam.aspect=window.innerWidth/window.innerHeight;cam.updateProjectionMatrix();draw();return 'ok';}
