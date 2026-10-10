const MBA=[...ldkS.boxes,...stS.boxes,...washS.boxes,...bathS.boxes],MOA=[...ldkS.obs,...stS.obs,...washS.obs,...bathS.obs];let MB,MO;   // 移動範囲と通れない所（全部屋）。MB・MOはドアの開閉に合わせて絞ったもの
function updMove(){MB=MBA.filter(b=>!b.door||DS[b.door]);MO=MOA.filter(b=>(!b.shut||!DS[b.shut])&&(!b.opn||DS[b.opn]));}
const inB=(b,q,m)=>q.x>=b[0]-m&&q.x<=b[1]+m&&q.y>=b[2]&&q.y<=b[3]&&q.z>=b[4]-m&&q.z<=b[5]+m;
const okPos=q=>MB.some(b=>inB(b,q,0))&&!MO.some(b=>inB(b,q,HOUSE.wallMargin));
// ドアの開閉：表示・移動範囲・光の範囲（寝室の入口越し）を切り替える。閉じると立っている場所から動けなくなるとき（開口の中にいるとき）は閉じない
const ZBASE=lightZones();
function showDoor(k){DOORS[k].gO.visible=DS[k];DOORS[k].gC.visible=!DS[k];}
function doorZones(){['hallNearBed','bedNearHall'].forEach(n=>{const z=ZONES[n],b=ZBASE[n];z[0]=DS.sg311?b[0]:[1,0,0];z[1]=DS.sg311?b[1]:[0,0,0];});}
function toggleDoor(k){const was=okPos(cam.position);DS[k]=!DS[k];updMove();if(was&&!okPos(cam.position)){DS[k]=!DS[k];updMove();return;}
 showDoor(k);if(k==='sg311'){doorZones();updateLights();}draw();}
Object.keys(DOORS).forEach(showDoor);updMove();doorZones();
const DOORM=[];scene.traverse(o=>{if(o.isMesh&&o.userData.door)DOORM.push(o);});   // 扉の本体（タップの対象）
const rcast=new THREE.Raycaster();
function tapAt(x,y){cam.rotation.set(pitch,yaw,0);cam.updateMatrixWorld();rcast.setFromCamera({x:x/window.innerWidth*2-1,y:-(y/window.innerHeight)*2+1},cam);rcast.far=80;
 const vis=o=>{for(;o;o=o.parent)if(!o.visible)return false;return true;};
 const h=rcast.intersectObjects(DOORM,false).find(i=>vis(i.object));if(!h)return;const k=h.object.userData.door;
 rcast.far=h.distance-0.003;   // 手前に壁などがあれば開閉しない（透明なアクリル板は除く）
 if(rcast.intersectObjects(scene.children,true).some(i=>vis(i.object)&&i.object.userData.dk!==k&&!(i.object.material.transparent&&i.object.material.opacity<0.5)))return;
 toggleDoor(k);}
ready=true;
function applyEnvAll(){envAll();updateLights();draw();}
function shadeLabel(p){$('shadeOut').textContent=p===0?'全開':Math.round(p*100)+'%閉';}
// 視点（リビング・キッチン・寝室・2F廊下・洗面脱衣・浴室・玄関・トイレ）
const VIEWS=[['リビング',()=>ldkS.viewLiv()],['キッチン',()=>ldkS.viewKit()],['寝室',()=>bedS.home()],['2F廊下',()=>ldkS.viewHall()],['洗面脱衣',()=>washS.viewWash()],['浴室',()=>bathS.viewBath()],['玄関',()=>washS.viewEntry()],['トイレ',()=>washS.viewToilet()]];
{const vr=$('viewRow');vr.innerHTML='';VIEWS.forEach(([lb,fn])=>{const b=document.createElement('button');b.textContent=lb;b.onclick=()=>{setView(lb);openSheet(null);};vr.appendChild(b);});}   // 視点を選んだらパネルを閉じる
function clearView(){$('viewRow').querySelectorAll('button.on').forEach(x=>mark(x,false));$('viewLbl').textContent='';}   // 動いたら、バーの視点の名前を消す
function setView(lb){VIEWS.find(v=>v[0]===lb)[1]();$('viewRow').querySelectorAll('button').forEach(x=>mark(x,x.textContent===lb));$('viewLbl').textContent=lb;}
// 照明のパネル：上に全点灯・全消灯、その下に、いまいる部屋の照明だけ（「すべての部屋」で全部屋の一覧。キーは LS の名前）
const LG=[['リビング',[['ウォールライト','a6'],['ダウンライト','a4'],['スポット','a2'],['階段','h1']]],['キッチン',[['ペンダント','a5'],['下がり天井','a3'],['ダウンライト','a1']]],
 ['寝室',[['ダウンライト','bdl'],['ブラケット','bbr'],['廊下','j1']]],['WIC',[['ダウンライト','l1']]],['書斎',[['ダウンライト','k1']]],['洗面脱衣',[['脱衣室','e1'],['洗面所','d1']]],['浴室',[['ダウンライト','bath']]],['玄関',[['ホール','eh'],['収納','ek'],['廊下','ec']]],['トイレ',[['ペンダント','g1']]]];
{const box=$('indList');LG.forEach(([rn,items])=>{const r=document.createElement('div');r.className='irow';r.dataset.room=rn;const t=document.createElement('span');t.className='rn';t.textContent=rn;r.appendChild(t);
 const c=document.createElement('div');c.className='chips';items.forEach(([lb,k])=>{const b=document.createElement('button');b.className='tg';b.setAttribute('role','switch');b.innerHTML='<i></i>'+lb;
  b.dataset.k=k;b.onclick=()=>{LS[k]=!LS[k];syncLights();applyEnvAll();};c.appendChild(b);});r.appendChild(c);box.appendChild(r);});}
function syncLights(){const ks=Object.keys(LS),n=ks.filter(k=>LS[k]).length;mark($('tAllOn'),n===ks.length);mark($('tAllOff'),n===0);$('bLight').classList.toggle('lit',n>0);$('indList').querySelectorAll('button[data-k]').forEach(b=>mark(b,LS[b.dataset.k]));}   // 全点灯・全消灯は、すべてそろった時だけ選択表示。バーの照明のアイコンは、点灯している照明があれば点を付ける
function setAll(v){Object.keys(LS).forEach(k=>LS[k]=v);syncLights();applyEnvAll();}
$('tAllOn').onclick=()=>setAll(true);$('tAllOff').onclick=()=>setAll(false);
// いまいる部屋（カメラの位置から。照明のパネルの部屋分けと同じ名前。どこにも当てはまらなければ null＝全部屋を出す）。2階の廊下は寝室の組（廊下の照明J1が寝室の組にあるため）、吹抜けはリビング
function curRoom(){const p=cam.position,{W,D,FL2,VX,VZ,PZ1}=HOUSE.ldk,{X0:WX,LW,DZ0,SZ1}=HOUSE.wash,{CX0,CX1}=HOUSE.wash,EN=HOUSE.entry,B=HOUSE.bath,in2=(x0,x1,z0,z1)=>p.x>=x0&&p.x<=x1&&p.z>=z0&&p.z<=z1;
 if(p.y>FL2){if(p.x>=VX&&p.z>=VZ)return 'リビング';if(p.x>HOUSE.bed.X0+HOUSE.bed.W+0.0575&&p.z>HOUSE.bed.Z0)return p.z<(HOUSE.wic.Z1+HOUSE.study.Z0)/2?'WIC':'書斎';return '寝室';}
 if(in2(WX,EN.TX1,EN.Z0,EN.TZ1))return 'トイレ';
 if(in2(CX0,CX1,PZ1,EN.Z1)||in2(EN.X1,CX1,EN.Z0,EN.Z1)||in2(WX,EN.X1,EN.KZ0,EN.Z1))return '玄関';
 if(in2(B.X0,B.X1,B.Z0,B.Z1))return '浴室';
 if(in2(WX,LW,DZ0,SZ1))return '洗面脱衣';   // 脱衣室・洗面所
 if(in2(0,W,0,D))return p.z<VZ?'キッチン':'リビング';
 return null;}
let allRooms=false;   // 「すべての部屋」の一覧（照明のパネルを開き直すと、いまの部屋だけに戻る）
function renderInd(){const cr=curRoom(),rm=allRooms?null:cr;$('roomLbl').textContent=rm||'すべての部屋';$('tAllRooms').textContent=allRooms?cr+'だけ':'すべての部屋';$('tAllRooms').hidden=!cr;$('indList').querySelectorAll('.irow').forEach(r=>{r.hidden=!!rm&&r.dataset.room!==rm;r.querySelector('.rn').hidden=!!rm;});}   // 1部屋のときは部屋名の列を出さない（上に部屋名を出す）
$('tAllRooms').onclick=()=>{allRooms=!allRooms;renderInd();};   // 切替のボタン：1部屋のとき「すべての部屋」、全部屋のとき「（いまの部屋）だけ」
// パネル（視点・照明・シェード）：同時に1つだけ開く。同じアイコンをもう一度押すか、画面をタップすると閉じる
let openK=null;
function openSheet(k){if(k&&openK===k)k=null;if(k==='light'&&openK!=='light')allRooms=false;openK=k;$('sheet').hidden=!k;['view','light','shade'].forEach(n=>$('p_'+n).hidden=n!==k);mark($('bView'),k==='view');mark($('bLight'),k==='light');mark($('bShade'),k==='shade');if(k==='light')renderInd();}
$('bView').onclick=()=>openSheet('view');$('bLight').onclick=()=>openSheet('light');$('bShade').onclick=()=>openSheet('shade');
// 昼夜：押すたびに切り替える（アイコンは今の状態：太陽＝昼、月＝夜）
function setNight(v){night=v;const b=$('bDay');b.classList.toggle('night',v);b.setAttribute('aria-label',v?'夜（押すと昼）':'昼（押すと夜）');applyEnvAll();}
$('bDay').onclick=()=>setNight(!night);
$('shade').oninput=e=>{const p=Number(e.target.value)/100;bedS.setShade(p);stS.setShade(p);ldkS.setShade(p);shadeLabel(p);applyEnvAll();};

// 全画面（非対応のブラウザではボタンを隠す）
const de=document.documentElement;
const fsReq=de.requestFullscreen||de.webkitRequestFullscreen;
const fsExit=document.exitFullscreen||document.webkitExitFullscreen;
const fsEl=()=>document.fullscreenElement||document.webkitFullscreenElement;
if(!fsReq){$('tFs').hidden=true;}
$('tFs').onclick=()=>{if(fsEl()){fsExit.call(document);}else{fsReq.call(de);}};
const onFs=()=>{const l=fsEl()?'全画面解除':'全画面';$('tFs').setAttribute('aria-label',l);$('tFs').title=l;mark($('tFs'),!!fsEl());};
document.addEventListener('fullscreenchange',onFs);document.addEventListener('webkitfullscreenchange',onFs);

// 移動：前後左右＋上下。家具・階段は通り抜け、壁・閉じたドア・天井は越えない
const keys={f:0,b:0,l:0,r:0,u:0,d:0},joy={f:0,r:0},SPEED=1.8,VSPEED=1.2;   // joy：ジョイスティックの傾き（-1〜1）。SPEED：前後左右の速さ（キー・ジョイスティック共通、m/秒）、VSPEED：上下の速さ
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let moving=false,last=0;
function step(t){const dt=clamp((t-last)/1000,0,0.05);last=t;const mf=keys.f-keys.b+joy.f,mr=keys.r-keys.l+joy.r,mu=keys.u-keys.d;if(!mf&&!mr&&!mu){moving=false;if(openK==='light')renderInd();return;}   // 止まったら、照明のパネルの部屋を更新
const p=cam.position,o=p.clone();
if(mf||mr){const h=Math.hypot(mf,mr),n=h/Math.min(1,h),fx=-Math.sin(yaw),fz=-Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw);p.x+=(fx*mf+rx*mr)/n*SPEED*dt;p.z+=(fz*mf+rz*mr)/n*SPEED*dt;}
p.y+=mu*VSPEED*dt;
const ok=okPos;
if(ok(o)&&!ok(p)){const d=p.clone().sub(o);p.copy(o);['x','z','y'].forEach(k=>{const v=p[k];p[k]+=d[k];if(!ok(p))p[k]=v;});}
draw();requestAnimationFrame(step);}
function startMove(){clearView();if(!moving){moving=true;last=performance.now();requestAnimationFrame(step);}}
document.querySelectorAll('#move button[data-k]').forEach(b=>{const k=b.dataset.k;
b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys[k]=1;b.classList.add('on');startMove();});
const off=()=>{keys[k]=0;b.classList.remove('on');};
b.addEventListener('pointerup',off);b.addEventListener('pointercancel',off);b.addEventListener('lostpointercapture',off);
b.addEventListener('contextmenu',e=>e.preventDefault());});
document.querySelectorAll('#move button[data-k]').forEach(b=>b.addEventListener('touchstart',e=>e.preventDefault(),{passive:false}));
// ジョイスティック：中心からのずれの向きへ、傾きに関係なく一定の速さ（SPEED）で進む（半径の10%以内は反応しない）
{const jb=$('joy'),kn=jb.querySelector('.knob'),DEAD=0.10;let pid=null;
 const set=e=>{const rc=jb.getBoundingClientRect(),RAD=rc.width*0.34;let dx=e.clientX-(rc.left+rc.width/2),dy=e.clientY-(rc.top+rc.height/2);const d=Math.hypot(dx,dy);if(d>RAD){dx*=RAD/d;dy*=RAD/d;}
  kn.style.transform=`translate(${dx}px,${dy}px)`;const m=Math.min(1,d/RAD),a=m<DEAD?0:1;const dd=Math.hypot(dx,dy);joy.r=dd?dx/dd*a:0;joy.f=dd?-dy/dd*a:0;if(joy.r||joy.f)startMove();};
 const end=()=>{pid=null;joy.f=joy.r=0;kn.style.transform='';jb.classList.remove('on');};
 jb.addEventListener('pointerdown',e=>{e.preventDefault();pid=e.pointerId;jb.setPointerCapture(pid);jb.classList.add('on');set(e);});
 jb.addEventListener('pointermove',e=>{if(e.pointerId===pid)set(e);});
 ['pointerup','pointercancel','lostpointercapture'].forEach(t=>jb.addEventListener(t,e=>{if(e.pointerId===pid)end();}));
 jb.addEventListener('touchstart',e=>e.preventDefault(),{passive:false});jb.addEventListener('contextmenu',e=>e.preventDefault());}
r.domElement.addEventListener('touchstart',e=>e.preventDefault(),{passive:false});
document.addEventListener('contextmenu',e=>e.preventDefault());
const keyMap={ArrowUp:'f',KeyW:'f',ArrowDown:'b',KeyS:'b',ArrowLeft:'l',KeyA:'l',ArrowRight:'r',KeyD:'r',KeyE:'u',PageUp:'u',KeyQ:'d',PageDown:'d'};
window.addEventListener('keydown',e=>{const k=keyMap[e.code];if(!k)return;e.preventDefault();keys[k]=1;startMove();});
window.addEventListener('keyup',e=>{const k=keyMap[e.code];if(k)keys[k]=0;});
window.addEventListener('blur',()=>{for(const k in keys)keys[k]=0;});

// ドラッグで見回し、ピンチ・ホイールで拡大縮小
const cvs=r.domElement,pts=new Map();let pinch=0;
function setFov(f){cam.fov=Math.max(40,Math.min(100,f));cam.updateProjectionMatrix();draw();}
// タップ（指・マウスがほぼ動かずに離れた）でドアを開閉。移動中は反応しない
let tap=null;
cvs.addEventListener('pointerdown',e=>{tap=(pts.size===0&&e.button===0)?{id:e.pointerId,x:e.clientX,y:e.clientY}:null;});
cvs.addEventListener('pointermove',e=>{if(tap&&e.pointerId===tap.id&&Math.hypot(e.clientX-tap.x,e.clientY-tap.y)>8)tap=null;});
cvs.addEventListener('pointerup',e=>{if(tap&&e.pointerId===tap.id&&!moving){if(openK)openSheet(null);else tapAt(e.clientX,e.clientY);}tap=null;});   // パネルが開いているときのタップは、パネルを閉じるだけ
cvs.addEventListener('pointercancel',()=>{tap=null;});
cvs.addEventListener('pointerdown',e=>{pts.set(e.pointerId,[e.clientX,e.clientY]);cvs.setPointerCapture(e.pointerId);if(pts.size===2){const [a,b]=[...pts.values()];pinch=Math.hypot(a[0]-b[0],a[1]-b[1]);}});
cvs.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId))return;clearView();const prev=pts.get(e.pointerId);pts.set(e.pointerId,[e.clientX,e.clientY]);if(pts.size===1){yaw+=(e.clientX-prev[0])*0.004;pitch=Math.max(-1.3,Math.min(1.3,pitch+(e.clientY-prev[1])*0.004));draw();}else if(pts.size===2){const [a,b]=[...pts.values()];const d=Math.hypot(a[0]-b[0],a[1]-b[1]);setFov(cam.fov-(d-pinch)*0.1);pinch=d;}});
const end=e=>{pts.delete(e.pointerId);};
cvs.addEventListener('pointerup',end);cvs.addEventListener('pointercancel',end);
cvs.addEventListener('wheel',e=>{e.preventDefault();clearView();setFov(cam.fov+e.deltaY*0.03);},{passive:false});

window.addEventListener('resize',()=>{r.setSize(window.innerWidth,window.innerHeight);cam.aspect=window.innerWidth/window.innerHeight;cam.updateProjectionMatrix();draw();});
bedS.setShade(0);stS.setShade(0);ldkS.setShade(0);syncLights();$('shade').value=0;shadeLabel(0);
applyEnvAll();setView('リビング');
