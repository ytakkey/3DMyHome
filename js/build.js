// ===== 操作 =====
const $=id=>document.getElementById(id);
let night=false,yaw=0,pitch=0;
function look(px,py,pz,tx,ty,tz,f){cam.position.set(px,py,pz);cam.fov=f;cam.updateProjectionMatrix();const d=new THREE.Vector3(tx-px,ty-py,tz-pz);yaw=Math.atan2(-d.x,-d.z);pitch=Math.atan2(d.y,Math.hypot(d.x,d.z));draw();}
function draw(){if(!ready)return;cam.rotation.set(pitch,yaw,0);r.render(scene,cam);}
function mark(el,on){el.classList.toggle('on',on);el.setAttribute(el.getAttribute('role')==='switch'?'aria-checked':(el.getAttribute('role')==='tab'?'aria-selected':'aria-pressed'),on);}
let ready=false;
const scene=new THREE.Scene();
const LS={a6:false,a4:false,a2:false,h1:false,a5:false,a3:false,a1:false,bdl:false,bbr:false,j1:false,d1:false,e1:false,eh:false,ec:false,ek:false,g1:false,bath:false,l1:false,k1:false};   // 照明の点灯状態（初期はすべて消灯）
const bedS=buildBedroom(scene),stS=buildStudy(scene);
const ldkS=buildLDK(scene);
const washS=buildWash(scene,ldkS.mats),bathS=buildBath(scene,ldkS.mats);
function envAll(){glassMat.color.set(night?0x141c28:0xcfdfec);fabMat.emissive.set(night?0x0c0a08:0x5a5650);bedS.applyEnv(night);ldkS.applyEnv(night);stS.applyEnv(night);washS.applyEnv(night);bathS.applyEnv(night);}   // 昼夜・照明の状態を素材と光源に反映（範囲の受け渡しと描画は applyEnvAll）
mergeStatic(scene);
setupZones(scene,[...bedS.zoneLights,...stS.zoneLights,...ldkS.zoneLights,...washS.zoneLights,...bathS.zoneLights]);
