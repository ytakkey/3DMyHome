// 焼き込みの検証ページ（stg/）で、決まった視点・状態を撮って bake/work/trial_cmp/ に保存する（解像度・圧縮の比較用）
// 使い方：検証ページを ?lm=<方式>_r<縮小> で開き、eval(await (await fetch('/tools/trial_cap.js')).text()); await capAll('<方式>_r<縮小>')
const CAPV={   // 名前：[目, 見る点, 視野角]（three.js の座標）
 hall_to_bed:[[-0.05,4.1,2.85],[-0.05,3.8,4.5],80],
 frame_wic:[[-0.35,4.0,4.55],[0.45,3.9,4.85],70],
 bed_wall:[[-0.6,4.0,5.6],[-2.2,3.9,5.2],70],
 bed_to_wic_study:[[-1.6,4.1,5.4],[0.4,3.8,5.6],85],
 study:[[2.0,4.3,5.6],[0.7,3.6,6.9],85],
 living:[[3.84,1.2,6.95],[0.56,1.05,3.18],85]};
const CAPS={   // 状態
 night:{night:true,LS:{bdl:true,bbr:true,j1:true,l1:true,k1:true,h1:true},DS:{sg311:true,sg500w:true,sg33s:true}},
 hallonly:{night:true,LS:{bdl:false,bbr:false,j1:true,l1:false,k1:false,h1:false},DS:{sg311:true,sg500w:true,sg33s:true}},
 day:{night:false,LS:{bdl:false,bbr:false,j1:false,l1:false,k1:false,h1:false},DS:{sg311:true,sg500w:true,sg33s:true}}};
function poseOf([e,t,f]){const d=[t[0]-e[0],t[1]-e[1],t[2]-e[2]];return [e[0],e[1],e[2],Math.atan2(-d[0],-d[2]),Math.atan2(d[1],Math.hypot(d[0],d[2])),f];}
async function capAll(tag,W=960,H=540){const pr=r.getPixelRatio();r.setPixelRatio(1);r.setSize(W,H,false);cam.aspect=W/H;cam.updateProjectionMatrix();
 for(const s in CAPS){await T.set(CAPS[s]);for(const v in CAPV){T.pose(poseOf(CAPV[v]));const u=r.domElement.toDataURL('image/png');
  await fetch('/save?path=bake/work/trial_cmp/'+v+'__'+s+'__'+tag+'.png',{method:'POST',body:await (await fetch(u)).blob()});}}
 r.setPixelRatio(pr);r.setSize(window.innerWidth,window.innerHeight);cam.aspect=window.innerWidth/window.innerHeight;cam.updateProjectionMatrix();draw();return T.memory();}
