// ===== 共通 =====
const r=new THREE.WebGLRenderer({antialias:true});
r.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
r.setSize(window.innerWidth,window.innerHeight);
document.body.prepend(r.domElement);
const cam=new THREE.PerspectiveCamera(85,window.innerWidth/window.innerHeight,0.05,80);cam.rotation.order='YXZ';
const R=Math.random,WARM=0xffc68e,FIT=0xfbfbf9;
// ===== 寸法データ（m）。座標：X=東、Z=南、原点はLDK北西の室内側の角。部屋を足すときはここに追加する =====
const EYE=1.2;   // 視点（各部屋のショートカット）の目の高さ（どの視点も、その階の基本の床から。玄関も土間ではなくホールの床から）
const HOUSE={
 ldk:{W:4.885,D:7.16,H1:2.4,FL2:2.9,H2:5.3,   // 幅・奥行・1階天井・2階床・吹抜けの天井
  VX:2.215,VZ:3.58,                          // 吹抜けの西端・北端
  SX0:3.99,ZB14:3.519,                       // 階段の踏板の西端、14段目の踏板（2階の床の張り出しの段鼻）の奥の端（階段の作りと合わせる）
  TVX:0.455,TVZ:4.49,                        // リビング西壁（テレビ面）
  PZ0:3.5225,PZ1:3.6375,PX1:1.37,           // 西側から出ている仕切り壁（Y4の壁芯±57.5）
  SGZ0:2.2675,SGZ1:3.0675},                  // 西の壁のSG300（脱衣室との間）の開口。南端は脱衣室の南の壁の室内面にそろう
 wash:{X0:-2.2725,LW:-0.115,                 // 脱衣室・洗面所：西の外壁の室内面・LDKの西の壁の裏（壁厚115）
  DZ0:1.8175,DZ1:3.0675,SZ0:3.1825,SZ1:4.4325,   // 脱衣室の北・南、洗面所の北・南（壁の室内面。Y6・Y4.5・Y3の壁芯±57.5）
  SX1:-0.57,CX0:-0.455,CX1:0.34,             // 洗面所の東、廊下の西・東（X2・X3の壁芯±57.5）。廊下の北は仕切り壁（PZ1）、南は洗面所の南と同じ線（SZ1）
  winZ0:1.8435,winZ1:3.0415,                 // 脱衣室の窓 F4415N（W1198、脱衣室の南北の壁のちょうど中心）
  bathA:-1.405,bathB:-0.58,sgA:-1.369,sgB:-0.587,   // 浴室のドア・脱衣室と洗面所のSG300の開口（X）
  s33A:3.6375,s33B:4.4325,hbX:-0.963},       // SG33の開口（Z。廊下の北の仕切り壁の面から南の端まで。SG11Hと同じ幅）、ヘッダーボックスの中心（X）
 entry:{X1:-1.365,TX1:-1.48,Z0:4.5475,TZ1:6.2525,KZ0:6.3675,Z1:7.16,DY:-0.18,   // 玄関：トイレの東の壁の玄関側・トイレ側の面（X1の壁芯±57.5）、北の壁（洗面所の南の壁の裏）の面、トイレの南・土間収納の北の壁の面（Y1の壁芯±57.5）、南の外壁の室内面、土間の高さ
  KF:[[-1.365,6.1145],[0.34,5.53]],KW:0.072,   // 框：土間側の端の線（西端・東端。シューズボックスの下を通って東の壁まで。約19°）、框の幅（Z方向）。平面図から
  sgA:4.5675,sgB:5.3275,                       // トイレのSG500の開口（Z）
  drA:-1.354,drB:-0.119,drM:-1.032,drH:2.33,    // 玄関ドア（親子扉）の枠（X。幅はカタログの枠W1235、中心は平面図の開口の中心）・子扉（西）と親扉（東）の境（枠の内側をKDW286:DW885で分ける）・枠の高さ（土間から。カタログのH2330）
  sbZ0:5.36,sbD:0.39,                          // シューズボックス GM143R（W1800）：北端（南の壁から1800）・奥行（平面図から）
  twD:0.115},                                  // 土間収納の垂れ壁（H=100）の奥行（土間収納の側へ。仮）
 bath:{X0:-2.19375,X1:-0.19375,Z0:0.05125,Z1:1.65125,H:2.12},   // 浴室（グレイスバス 1.25坪、内寸2000×1600）：西・東・北・南の壁の室内面（平面図の内寸線から。部屋の室内面X0〜X2.5・Y8〜Y6の中央に置く）・天井高（写真の比率から、仮）
 hall:{X0:-0.47,Z0:2.7275},                  // 2階廊下：西の突き当り（収納SGC-30Tの扉の面、仮）・北の壁の室内面（Y5の壁芯+57.5）。南は吹抜けの北端、東はLDKの東の壁
 bed:{X0:-2.2725,Z0:3.6375,W:2.6125,D:3.5225,H:2.4,doorA:1.8355,doorB:2.6125},   // 寝室：北西の室内角・内寸・天井高・入口（北の壁、西端からの位置。東端は東の壁の室内面にそろう）。X0〜X3・Y4〜Y0
 wic:{X0:0.455,X1:2.16,Z0:3.6375,Z1:5.3425},   // ウォークイン（2階、X3〜X5・Y4〜Y2）：西・東・北・南の壁の室内面（壁芯±57.5）
 study:{X0:0.455,X1:2.16,Z0:5.4575,Z1:7.16,winC:1.715},   // 書斎（2帖、X3〜X5・Y2〜Y0）：同上（南は外壁の室内面）、窓 FK2442 の中心（平面図から。幅は寝室の FK2442 と同じ743、東端は東の壁の面から約7cm）
 floorMargin:0.08,                           // 床を壁の向こうへ広げる幅（ドア下に隙間ができないように）
 wallMargin:0.10};                           // 移動で壁・通れない家具に近づける距離（すべての場所で共通）
const MC={};
const P=o=>new THREE.MeshPhongMaterial(Object.assign({specular:0x0a0a0a,shininess:6},o));
const L=c=>MC[c]||(MC[c]=P({color:c}));
const decalMat=m=>{m.polygonOffset=true;m.polygonOffsetFactor=-1;m.polygonOffsetUnits=-4;return m;};   // 貼り物（面の上に薄く重ねる表示・印刷・リングなど）の材質：描画で必ず下の面より手前に出す（ちらつかない）。共有の材質には使わず、貼り物専用に作る
let s=null,shades=null,winLights=null;
// 開閉できるドア（両側の部屋が再現されているもの）。DS：開閉状態（true＝開、ページを開いたときは脱衣室と洗面所のSG300・浴室のドアだけ開）、DOORS：開いた形と閉じた形の部品
const DS={sg300l:false,sg300w:true,sg33:false,sg11h:false,sg311:false,sg500:false,bath:true,sg500w:false,sg33s:false},DOORS={};   // bath：浴室のドア（脱衣室との間）、sg300l：脱衣室とLDK、sg300w：脱衣室と洗面所、sg33：洗面所と廊下、sg11h：廊下とLDK、sg311：寝室と2階廊下、sg500：玄関ホールとトイレ、sg500w：寝室とウォークイン、sg33s：寝室と書斎
const ifOpen=(k,b)=>(b.door=k,b),ifShut=(k,b)=>(b.shut=k,b),ifOpenObs=(k,b)=>(b.opn=k,b);   // 移動範囲の箱：開いているときだけ通れる開口／閉じているときだけ通れない所／開いているときだけ通れない所（開いた扉）
// 開いた形（gO）と閉じた形（gC）を登録。部品はまとめる対象から外し、枠・戸袋・壁（skipの素材）以外を扉の本体（タップで開閉）にする
function regDoor(k,gO,gC,skip){[gO,gC].forEach(x=>x.traverse(c=>{if(!c.isMesh)return;c.userData.dyn=true;c.userData.dk=k;if(!skip.includes(c.material))c.userData.door=k;}));DOORS[k]={gO,gC};}   // 部品を追加する先（作成中の部屋）と、その部屋のシェード一覧・窓の自然光一覧
function cv(draw,w,h){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);return c;}
const TXC=new Map();   // 同じキャンバス・同じ回転のテクスチャは1つを共有する（GPUへの転送を1回に）。繰り返しを変えるときは texR を使う
function tex(c,rot){const k=c,m=TXC.get(k)||new Map();TXC.set(k,m);if(m.has(rot||0))return m.get(rot||0);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=r.capabilities.getMaxAnisotropy();if(rot){t.center.set(0.5,0.5);t.rotation=rot;}m.set(rot||0,t);return t;}
const texR=(m,x,y)=>{m.map=m.map.clone();m.map.repeat.set(x,y);m.map.needsUpdate=true;};   // 材質の柄の繰り返しだけを変える（共有のテクスチャを複製して変える）
function tmat(c,o,rot){return P(Object.assign({map:tex(c,rot)},o||{}));}
function uvPlane(w,h,u0,v0,su,sv){const g=new THREE.PlaneGeometry(w,h);const uv=g.attributes.uv;for(let i=0;i<uv.count;i++){uv.setXY(i,(u0+uv.getX(i)*w)/su,(v0+uv.getY(i)*h)/sv);}return g;}
function box(w,h,d,x,y,z,c){const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),typeof c==='number'?L(c):c);b.position.set(x,y,z);s.add(b);return b;}
// 面を抜いた箱（skip：抜く面の番号の配列。0:+x 1:-x 2:+y 3:-y 4:+z 5:-z）。抜いた面の位置に柄の板などをぴったり重ねずに置くときに使う
function lboxOpen(g,w,h,d,x,y,z,c,skip){const geo=new THREE.BoxGeometry(w,h,d),ix=geo.index.array,keep=[];for(let f=0;f<6;f++)if(!skip.includes(f))for(let i=0;i<6;i++)keep.push(ix[f*6+i]);geo.setIndex(keep);geo.clearGroups();const b=new THREE.Mesh(geo,typeof c==='number'?L(c):c);b.position.set(x,y,z);g.add(b);return b;}
function lbox(g,w,h,d,x,y,z,c){const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),typeof c==='number'?L(c):c);b.position.set(x,y,z);g.add(b);return b;}
function wbox(w,h,d,x,y,z,m,tile){const g=new THREE.BoxGeometry(w,h,d);const uv=g.attributes.uv;const dims=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];for(let f=0;f<6;f++)for(let k=0;k<4;k++){const i=f*4+k;uv.setXY(i,uv.getX(i)*dims[f][0]/tile,uv.getY(i)*dims[f][1]/tile);}const b=new THREE.Mesh(g,m);b.position.set(x,y,z);s.add(b);return b;}
function vplane(w,h,m,x,y,z,ry,tile){const p=new THREE.Mesh(uvPlane(w,h,0,0,tile,tile),m);p.position.set(x,y,z);p.rotation.y=ry||0;s.add(p);return p;}
// 2階の床：寝室・廊下・ウォークイン・書斎と、壁の向こうへ少し広げた分を一枚の形で作る（柄は家全体の座標でそろえる）
function floor2F(m){const {X0:BX,Z0:BZ,W:BW,D:BD}=HOUSE.bed,{W,VX,VZ,FL2}=HOUSE.ldk,{X0:HX,Z0:HZ}=HOUSE.hall,e=HOUSE.floorMargin,T=1.78,EX=Math.min(HOUSE.study.X1+e,VX-0.003);   // EX：東端（ウォークイン・書斎の東の壁の向こう。吹抜けの壁より手前で止める）
 const SB=HOUSE.ldk.SX0,ZB=HOUSE.ldk.ZB14;   // 階段の幅は14段目の踏板（2階の床の張り出し）の奥の端まで
 const sh=new THREE.Shape([[HX-e,HZ-e],[W,HZ-e],[W,ZB],[SB,ZB],[SB,VZ],[EX,VZ],[EX,BZ+BD+e],[BX-e,BZ+BD+e],[BX-e,VZ],[HX-e,VZ]].map(([x,z])=>new THREE.Vector2(x,-z)));
 const g=new THREE.ShapeGeometry(sh);const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/T,uv.getY(i)/T);
 const f=new THREE.Mesh(g,m);f.rotation.x=-Math.PI/2;f.position.y=FL2;s.add(f);return f;}
function floorRect(x0,x1,z0,z1,y,m,tile){const p=new THREE.Mesh(uvPlane(x1-x0,z1-z0,x0,-z1,tile,tile),m);p.rotation.x=-Math.PI/2;p.position.set((x0+x1)/2,y,(z0+z1)/2);s.add(p);return p;}
// 多角形の床（pts：[x,z]の並び。柄は家全体の座標でそろう＝floorRectとつながる）
function floorPoly(pts,y,m,T){const g=new THREE.ShapeGeometry(new THREE.Shape(pts.map(([x,z])=>new THREE.Vector2(x,-z))));const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/T,uv.getY(i)/T);
 const f=new THREE.Mesh(g,m);f.rotation.x=-Math.PI/2;f.position.y=y;s.add(f);return f;}
function ceilRect(x0,x1,z0,z1,y,m,tile){const p=new THREE.Mesh(uvPlane(x1-x0,z1-z0,x0,z0,tile,tile),m);p.rotation.x=Math.PI/2;p.position.set((x0+x1)/2,y,(z0+z1)/2);s.add(p);return p;}
// 色ムラのあるテクスチャ（ピクセル単位で計算。半透明の重ね塗りは色ずれが出るので使わない）
const clamp8=v=>v<0?0:v>255?255:v|0;
function noiseCanvas(size,base,amp,scale,fine){const c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d');const img=g.createImageData(size,size);const d=img.data;
 const oct=[[scale,1],[scale/2,0.5],[scale/4,0.25]].map(([sc,wt])=>{const n=Math.max(1,Math.round(size/sc));const a=new Float32Array(n*n);for(let i=0;i<a.length;i++)a[i]=R()*2-1;return{n,a,wt};});
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){let v=0;for(const o of oct){const n=o.n,fx=x/size*n,fy=y/size*n,x0=Math.floor(fx),y0=Math.floor(fy),tx=fx-x0,ty=fy-y0,sx=tx*tx*(3-2*tx),sy=ty*ty*(3-2*ty),A=o.a,xa=x0%n,xb=(x0+1)%n,ya=(y0%n)*n,yb=((y0+1)%n)*n;v+=o.wt*((A[ya+xa]*(1-sx)+A[ya+xb]*sx)*(1-sy)+(A[yb+xa]*(1-sx)+A[yb+xb]*sx)*sy);}
  v=v/1.75*amp+(R()*2-1)*fine;const p=(y*size+x)*4;d[p]=clamp8(base[0]+v);d[p+1]=clamp8(base[1]+v);d[p+2]=clamp8(base[2]+v);d[p+3]=255;}
 g.putImageData(img,0,0);return c;}

// テクスチャ
// 寝室・脱衣室・洗面所の壁：IC-5016（筋はタイルの端で反対側へ回り込ませ、継ぎ目が出ないようにする）
const plasterC=cv((g,w,h)=>{g.fillStyle='rgb(234,231,225)';g.fillRect(0,0,w,h);for(let i=0;i<500;i++){g.fillStyle=R()<0.5?'rgba(196,190,178,0.22)':'rgba(250,249,246,0.45)';const x=R()*w,y=R()*h,rw=20+R()*110,rh=1+R()*3;for(const dx of[0,-w])for(const dy of[0,-h])g.fillRect(x+dx,y+dy,rw,rh);}for(let i=0;i<3000;i++){g.fillStyle=`rgba(180,175,165,${R()*0.15})`;g.fillRect(R()*w,R()*h,1,1);}},512,512);
// 寝室アクセント面上部：IC-2003
const wovenC=cv((g,w,h)=>{for(let y=0;y<h;y+=4)for(let x=0;x<w;x+=4){const v=Math.round(86+R()*16-(((x+y)/4)%2?7:0));g.fillStyle=`rgb(${v},${v-5},${v-12})`;g.fillRect(x,y,4,4);}},256,256);
// IC-5015（寝室の腰壁、LDKの下がり天井）
const oakC=cv((g,w,h)=>{const nb=6,bw=w/nb;for(let b=0;b<nb;b++){const v=200+Math.floor(R()*14);g.fillStyle=`rgb(${v},${Math.round(v*0.83)},${Math.round(v*0.61)})`;g.fillRect(b*bw,0,bw,h);for(let i=0;i<55;i++){g.fillStyle=`rgba(150,108,66,${0.08+R()*0.2})`;g.fillRect(b*bw+R()*bw,0,1+R()*1.5,h);}for(let i=0;i<40;i++){g.fillStyle='rgba(125,88,52,0.25)';g.fillRect(b*bw+R()*bw,R()*h,2+R()*6,1);}g.fillStyle='rgba(140,100,60,0.35)';g.fillRect(b*bw,0,1,h);}},512,512);
// 天井：IC-1006
const ceilC=cv((g,w,h)=>{g.fillStyle='rgb(250,249,246)';g.fillRect(0,0,w,h);for(let y=0;y<h;y+=6)for(let x=((y/6)%2)*5;x<w;x+=10){g.fillStyle=`rgba(210,208,202,${0.15+R()*0.1})`;g.fillRect(x,y,7,2);}},256,256);
// ハニカムシェード生地
const pleatC=cv((g,w,h)=>{g.fillStyle='rgb(244,241,234)';g.fillRect(0,0,w,h);g.fillStyle='rgba(255,255,255,0.7)';g.fillRect(0,h*0.25,w,h*0.2);g.fillStyle='rgba(165,158,146,0.55)';g.fillRect(0,h-5,w,3);g.fillStyle='rgba(200,194,184,0.4)';g.fillRect(0,h-9,w,4);},64,64);
// キッチン：ナイトストーンの天板（黒のみかげ調）
const nsTopC=cv((g,w,h)=>{g.fillStyle='rgb(46,46,48)';g.fillRect(0,0,w,h);for(let i=0;i<9000;i++){const v=30+R()*60;g.fillStyle=`rgba(${v},${v},${v+3},0.6)`;g.fillRect(R()*w,R()*h,1+R()*1.5,1+R()*1.5);}for(let i=0;i<900;i++){const v=150+R()*90;g.fillStyle=`rgba(${v},${v},${v},${0.4+R()*0.5})`;g.fillRect(R()*w,R()*h,1,1);}},512,512);
// 1階の床：ライブナチュラルプレミアム オークN-45°（近似）。幅151.5mm×12枚＝1.818m四方のタイル
const oakTile=(()=>{const N=1536,rows=12,ph=N/rows,c=document.createElement('canvas');c.width=c.height=N;const g=c.getContext('2d'),img=g.createImageData(N,N),d=img.data;
 const hs=(x,y)=>{let h=Math.imul(x|0,374761393)+Math.imul(y|0,668265263)|0;h=Math.imul(h^h>>>13,1274126177);return((h^h>>>16)>>>0)/4294967296;};
 const vn=(x,y)=>{const x0=Math.floor(x),y0=Math.floor(y),tx=x-x0,ty=y-y0,sx=tx*tx*(3-2*tx),sy=ty*ty*(3-2*ty);return (hs(x0,y0)*(1-sx)+hs(x0+1,y0)*sx)*(1-sy)+(hs(x0,y0+1)*(1-sx)+hs(x0+1,y0+1)*sx)*sy;};
 for(let r=0;r<rows;r++){const segs=[];let x=R()*N;const end=x+N;
  while(x<end-1){const len=Math.min(N*(0.42+R()*0.5),end-x);segs.push({x0:x,len,tone:0.95+R()*0.09,warm:(R()-0.5)*0.04,cath:R()<0.55,cx:x+len*(0.15+R()*0.7),cy:ph*(0.25+R()*0.5),k:0.9+R()*1.6,sp:5.5+R()*5,sd:R()*1000,fleck:R()<0.25});x+=len;}
  const y0=r*ph;
  for(let yy=0;yy<ph;yy++){const y=y0+yy;
   for(let px=0;px<N;px++){let sg=null,lx=0;for(const q of segs){let t=px-q.x0;if(t<0)t+=N;if(t<q.len){sg=q;lx=t;break;}}if(!sg){sg=segs[0];lx=0;}
    const wx=lx+sg.sd*7,wy=yy;   // 板の中の位置で計算（タイルの端で柄が途切れない）
    const warp=7*vn(wx/220,r*3.1+sg.sd)+2.5*vn(wx/45,r*5.7+sg.sd)-4.75;
    let t;
    if(sg.cath){const dy=yy-sg.cy-warp*0.6,dx=lx-(sg.cx-sg.x0<0?sg.cx-sg.x0+N:sg.cx-sg.x0);t=Math.sqrt(dy*dy+Math.max(0,dx)*sg.k*ph*0.05)/sg.sp+vn(wx/60,wy/9+sg.sd)*0.6;}
    else t=(yy+warp)/sg.sp+vn(wx/80,wy/14+sg.sd)*0.5;
    const fr=t-Math.floor(t),late=Math.pow(fr,5);                       // 年輪（晩材が濃い）
    const pore=hs(Math.floor((px+Math.floor(yy/2)*11)/6),y>>1)<0.07?0.10:0; // 道管（木目方向の細かい点）
    const fl=sg.fleck&&vn(wx/14,wy/2.2+sg.sd)>0.78?-0.07:0;               // 虎斑（明るい小さな斑）
    const low=(vn(wx/300,wy/60+sg.sd)-0.5)*0.08;
    let edge=0;if(yy<1.5||yy>ph-1.2)edge=0.32;else if(lx<1.6)edge=0.36;else if(yy<3)edge=0.08;
    const k=sg.tone*(1-0.17*late-pore-edge+low-fl);
    const p=(y*N+px)*4;d[p]=clamp8(196*k*(1+sg.warm));d[p+1]=clamp8(150*k);d[p+2]=clamp8(99*k*(1-sg.warm));d[p+3]=255;}}}
 g.putImageData(img,0,0);return c;})();
// 2階の床：モクリア ビター・ウォールナット（BWT、近似）。幅178mm×10枚＝1.78m四方のタイル
const walnutTile=(()=>{const N=1536,rows=10,ph=N/rows,c=document.createElement('canvas');c.width=c.height=N;const g=c.getContext('2d'),img=g.createImageData(N,N),d=img.data;
 const hs=(x,y)=>{let h=Math.imul(x|0,374761393)+Math.imul(y|0,668265263)|0;h=Math.imul(h^h>>>13,1274126177);return((h^h>>>16)>>>0)/4294967296;};
 const vn=(x,y)=>{const x0=Math.floor(x),y0=Math.floor(y),tx=x-x0,ty=y-y0,sx=tx*tx*(3-2*tx),sy=ty*ty*(3-2*ty);return (hs(x0,y0)*(1-sx)+hs(x0+1,y0)*sx)*(1-sy)+(hs(x0,y0+1)*(1-sx)+hs(x0+1,y0+1)*sx)*sy;};
 for(let r=0;r<rows;r++){const segs=[];let x=R()*N;const end=x+N;
  const lens=R()<0.45?[N]:(l1=>[l1,N-l1])(N*(0.4+R()*0.2));   // 1列に1〜2枚（短い端材ができないように）
  for(const len of lens){segs.push({x0:x,len,tone:0.9+R()*0.2,cath:R()<0.4,cx:len*(0.2+R()*0.6),cy:ph*(0.3+R()*0.4),k:0.8+R()*1.4,sp:4+R()*4.5,sd:R()*1000});x+=len;}
  const y0=Math.round(r*ph),PH=Math.round((r+1)*ph)-y0;   // 板の幅は整数ピクセルに丸める
  for(let yy=0;yy<PH;yy++){const y=y0+yy;
   for(let px=0;px<N;px++){let sg=null,lx=0;for(const q of segs){let t=px-q.x0;if(t<0)t+=N;if(t<q.len){sg=q;lx=t;break;}}if(!sg){sg=segs[0];lx=0;}
    const wx=lx+sg.sd*7;   // 板の中の位置で計算（タイルの端で柄が途切れない）
    const warp=14*vn(wx/260,r*3.3+sg.sd)+4*vn(wx/60,r*6.1+sg.sd)-9;             // 波打つ木目
    let t;if(sg.cath){const dy=yy-sg.cy-warp*0.5,dx=lx-sg.cx;t=Math.sqrt(dy*dy+Math.max(0,dx)*sg.k*ph*0.04)/sg.sp+vn(wx/70,yy/10+sg.sd)*0.7;}
    else t=(yy+warp)/sg.sp+vn(wx/90,yy/12+sg.sd)*0.6;
    const fr=t-Math.floor(t),line=Math.pow(fr,4)*0.30;                           // 濃い木目の線
    const streak=(vn(wx/420,(yy+warp)/16+sg.sd)-0.5)*0.34;                        // 明るい筋・濃い筋（木目方向に長い）
    const pore=hs(Math.floor((px+Math.floor(yy/2)*13)/5),y>>1)<0.09?0.12:0;      // 道管
    let edge=0;if(yy<1.3||yy>PH-1.1||lx<1.4)edge=0.45;else if(yy<3||lx<3)edge=-0.10; // 目地（V溝）と面取りの照り
    const k=sg.tone*(1-line-pore-edge+streak);
    const p=(y*N+px)*4;d[p]=clamp8(84*k);d[p+1]=clamp8(63*k);d[p+2]=clamp8(51*k);d[p+3]=255;}}}
 g.putImageData(img,0,0);return c;})();
// キッチンの床：石目調フローリング（グレー、近似）。幅303mmの板
const stoneTile=(()=>{const c=noiseCanvas(1024,[140,134,127],12,110,10);const g=c.getContext('2d'),n=6,ph=1024/n;g.fillStyle='rgba(88,83,78,0.6)';
 for(let i=0;i<n;i++){g.fillRect(0,i*ph,1024,1.5);const off=(i%2)*256;for(let x=off;x<1024+off;x+=512)g.fillRect(x%1024,i*ph,1.5,ph);}return c;})();
// トイレの床：石目調フローリング（ブラック。見本の色をグレーと同じ比率で換算、近似）。幅303mmの板、目地はピクセル単位で暗くする
const stoneTileK=(()=>{const N=1024,c=noiseCanvas(N,[55,55,56],13,110,11),g=c.getContext('2d'),im=g.getImageData(0,0,N,N),d=im.data,n=6,ph=N/n;
 const dk=(x,y,f)=>{const p=(((y%N)+N)%N*N+((x%N)+N)%N)*4;d[p]=d[p]*f;d[p+1]=d[p+1]*f;d[p+2]=d[p+2]*f;};
 for(let i=0;i<n;i++){const y=Math.round(i*ph);for(let x=0;x<N;x++){dk(x,y,0.5);dk(x,y+1,0.8);}const off=(i%2)*256;for(let x=off;x<N+off;x+=512)for(let yy=y+2;yy<Math.round((i+1)*ph);yy++){dk(x,yy,0.5);dk(x+1,yy,0.8);}}
 g.putImageData(im,0,0);return c;})();
// LDKの壁：IC-5021（温かみのあるグレー）、アクセント面：IC-5025（濃いグレーの砂目調。下の ic5025）
const ic5021C=noiseCanvas(512,[171,166,158],10,128,5);
// ダイニングテーブル天板・テレビボード：アイカ工業 メラミン化粧板 TJ-10239K（グレーの石目調、近似）
const tjC=noiseCanvas(512,[139,135,130],14,160,10);
// IC-5025：細かい砂目の粒（1px＝0.78mm）＋ごく弱いコンクリート調のムラとピンホール、色はごくわずかに黄みのグレー（コンクリート寄り）。ラメは同じ粒の位置から、色（少し明るい銀）・照り（specularMap）・向き（normalMap。粒ごとに傾けて、見る角度で光る粒が変わる）を作る。すべてピクセル単位で計算
const ic5025=(()=>{const N=512,mk=()=>{const c=document.createElement('canvas');c.width=c.height=N;return c;},cC=mk(),cS=mk(),cN=mk(),gC=cC.getContext('2d'),gS=cS.getContext('2d'),gN=cN.getContext('2d'),iC=gC.createImageData(N,N),iS=gS.createImageData(N,N),iN=gN.createImageData(N,N),dC=iC.data,dS=iS.data,dN=iN.data;
 const hs=(x,y)=>{let h=Math.imul(x|0,374761393)+Math.imul(y|0,668265263)|0;h=Math.imul(h^h>>>13,1274126177);return((h^h>>>16)>>>0)/4294967296;};
 const vn=(x,y,n)=>{const xi=Math.floor(x),yi=Math.floor(y),fx=x-xi,fy=y-yi,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy),X0=((xi%n)+n)%n,X1=(X0+1)%n,Y0=((yi%n)+n)%n,Y1=(Y0+1)%n,a=hs(X0,Y0),b=hs(X1,Y0),c=hs(X0,Y1),d=hs(X1,Y1);return a+(b-a)*sx+(c-a)*sy+(a-b-c+d)*sx*sy;};   // 端でつながる（n格子で折り返す）
 const sd=R()*1000|0;
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){const p=(y*N+x)*4,m=(vn(x/128+sd,y/128,4)-0.5)*6+(vn(x/32+sd,y/32+7,16)-0.5)*3,gr=(vn(x/1.6+sd,y/1.6,320)-0.5)*34;   // gr：砂目の粒（約1.2mm）   // m：コンクリート調のムラ（ごく弱く）
  let v=gr+(R()+R()-1)*6;if(R()<0.025)v+=(R()<0.5?-1:1)*(10+R()*8);if(R()<0.0006)v-=26;   // 粒＋1pxの細かいざらつき、ときどき濃い粒・明るい粒、まれにピンホール
  const k=v+m;dC[p]=clamp8(94+k);dC[p+1]=clamp8(93+k);dC[p+2]=clamp8(92+k);dC[p+3]=255;dS[p]=dS[p+1]=dS[p+2]=10;dS[p+3]=255;dN[p]=128;dN[p+1]=128;dN[p+2]=255;dN[p+3]=255;}
 for(let i=0;i<600;i++){const x0=R()*N|0,y0=R()*N|0,sz=R()<0.35?2:1,th=R()*Math.PI*2,ph=R()*0.6,nx=Math.sin(ph)*Math.cos(th),ny=Math.sin(ph)*Math.sin(th),nz=Math.cos(ph),sp=70+R()*80,br=5+R()*9;   // ラメの粒：1〜2px角、法線は最大約34°傾ける
  for(let dy=0;dy<sz;dy++)for(let dx=0;dx<sz;dx++){const p=(((y0+dy)%N)*N+(x0+dx)%N)*4;dC[p]=clamp8(dC[p]+br);dC[p+1]=clamp8(dC[p+1]+br);dC[p+2]=clamp8(dC[p+2]+br+1);dS[p]=dS[p+1]=dS[p+2]=sp|0;dN[p]=clamp8(128+nx*127);dN[p+1]=clamp8(128+ny*127);dN[p+2]=clamp8(128+nz*127);}}
 gC.putImageData(iC,0,0);gS.putImageData(iS,0,0);gN.putImageData(iN,0,0);return{c:cC,s:cS,n:cN};})();
const ic5025Mat=()=>P({map:tex(ic5025.c),specularMap:tex(ic5025.s),normalMap:tex(ic5025.n),specular:0xffffff,shininess:70});   // 照りはspecularMapで決める（地は0x0a相当、ラメの粒だけ強い）
// 玄関のアクセント面：IC-5023（わずかに赤みのあるグレーのモヤモヤ。照りを少し付けて金属っぽさを出す）
const ic5023C=noiseCanvas(512,[126,117,108],12,150,5);
// 玄関の土間：グレイスタイル（天然石の鉱脈を再現したタイル、300×600）。2.4m四方に4枚×8列、1列ごとに半枚ずらす。長手は東西（仮）
// 1枚ごとの濃淡、斜めの層状の濃淡、雲のような明るいムラ、細い白い鉱脈（一部の板だけ）。すべてピクセル単位で計算（重ね塗りの色ずれを避ける）
const domaC=(()=>{const N=1024,TW=256,TH=128,c=document.createElement('canvas');c.width=c.height=N;const g=c.getContext('2d'),im=g.createImageData(N,N),d=im.data;
 const hs=(x,y)=>{let h=Math.imul(x|0,374761393)+Math.imul(y|0,668265263)|0;h=Math.imul(h^h>>>13,1274126177);return((h^h>>>16)>>>0)/4294967296;};
 const vn=(x,y)=>{const xi=Math.floor(x),yi=Math.floor(y),fx=x-xi,fy=y-yi,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy),a=hs(xi,yi),b=hs(xi+1,yi),cc=hs(xi,yi+1),e=hs(xi+1,yi+1);return a+(b-a)*sx+(cc-a)*sy+(a-b-cc+e)*sx*sy;};
 const tiles={};const tile=(cx,ry)=>{const k=cx+','+ry;if(tiles[k])return tiles[k];const r=q=>hs(cx*7+q*131,ry*13+q*17),th=0.25+0.25*r(1),veins=[];   // th：層・鉱脈の傾き
  const nv=r(2)<0.45?(r(3)<0.4?2:1):0;for(let v=0;v<nv;v++)veins.push({c:(r(4+v)-0.5)*160,w:0.7+r(6+v)*0.9,st:0.5+0.5*r(8+v)});
  return tiles[k]={tone:0.82+0.3*r(5),th,cs:Math.cos(th),sn:Math.sin(th),sd:r(9)*100,veins};};
 for(let y=0;y<N;y++){const ry=Math.floor(y/TH),off=(ry%2)*TH,tv=y%TH;
  for(let x=0;x<N;x++){const xs=(x+off)%N,cx=Math.floor(xs/TW),tu=xs%TW,p=(y*N+x)*4;
   if(tu<2||tv<2){d[p]=66;d[p+1]=68;d[p+2]=71;d[p+3]=255;continue;}   // 目地
   const T=tile(cx,ry),a=tu*T.cs+tv*T.sn,b=-tu*T.sn+tv*T.cs;   // a：層の向き、b：層に直角
   const band=vn(b/14+T.sd,a/220)*0.6+vn(b/5+T.sd,a/90)*0.4,cloud=vn(tu/45+T.sd,tv/30),fine=(hs(x,y)-0.5)*0.05;
   let vein=0;for(const V of T.veins){const wob=(vn(a/40+V.c,T.sd)-0.5)*10,dd=Math.abs(b-V.c-TH/2-wob)/V.w;if(dd<1.6)vein=Math.max(vein,(1-dd/1.6)*V.st*(vn(a/30,V.c+3)>0.35?1:0.25));}
   const k=T.tone*(1+0.14*(band-0.5)+0.10*Math.max(0,cloud-0.55)*2+fine);
   d[p]=clamp8(110*k+vein*55);d[p+1]=clamp8(116*k+vein*55);d[p+2]=clamp8(123*k+vein*54);d[p+3]=255;}}
 g.putImageData(im,0,0);return c;})();
// ソファの生地
const fabricC=noiseCanvas(256,[184,184,182],6,32,14);   // 明るめのライトグレー

// 共通のマテリアル（昼夜で色を変えるもの）
const ceilMat=tmat(ceilC,{emissive:0x1c1c1a});
const walnutMat=tmat(walnutTile,{specular:0x2a2018,shininess:30});
const glassMat=new THREE.MeshBasicMaterial({color:0xcfdfec});
const pleatT=tex(pleatC);
const fabMat=P({map:pleatT,emissive:0x5a5650,side:THREE.DoubleSide});
const acrylMat=new THREE.MeshPhongMaterial({color:0xe8f2f8,transparent:true,opacity:0.14,specular:0xffffff,shininess:90,side:THREE.DoubleSide,depthWrite:false});

// 窓からの自然光：窓の外の少し上に光源を置き、窓を通して室内の床へ向けて照らす（窓の大きさに応じた強さ）
function addDaylight(g,um,ym,w,hh,shadeable){g.updateMatrixWorld(true);const c=g.localToWorld(new THREE.Vector3(um,ym,0));const out=new THREE.Vector3(0,0,-1).applyQuaternion(g.quaternion);
 const pos=c.clone().addScaledVector(out,3.0);pos.y+=1.2;const dir=c.clone().sub(pos).normalize();const tgt=c.clone().addScaledVector(dir,2.5);
 const half=Math.min(1.2,Math.atan(Math.max(w,hh)/2/3.2)*1.8),I=0.45*Math.sqrt(w*hh);
 const sp=new THREE.SpotLight(0xfff8f0,0,12,half,0.85,1.0);sp.position.copy(pos);sp.target.position.copy(tgt);s.add(sp);s.add(sp.target);
 winLights.push({light:sp,I,area:w*hh,shadeable,t:1});}
// シェードの閉まり具合から、各窓の光の通り具合と部屋全体の明るさ（0〜1）を計算。ハニカムシェードは閉めても5割の光を通す
// 補助光（空の明るさ・太陽の代わり・照り返しの代わり）：全部屋で同じ光源の組（色・向き・強さ）を使う。照りは出さない（userData.fill。照りは照明と窓の光だけ）
function fillLights(sc){const hemi=new THREE.HemisphereLight(0xffffff,0xe2dbd0,0.58),sun=new THREE.DirectionalLight(0xfff4e0,0.45),up=new THREE.DirectionalLight(0xfffaf2,0.16);sun.position.set(0,6,10);up.position.set(2.4,-3,3.5);sun.userData.fill=up.userData.fill=true;sc.add(hemi);sc.add(sun);sc.add(up);return{hemi,sun,up};}   // 向きは家全体の座標（光源の向き＝位置→原点）
function fillEnv(F,night,k){if(night){F.hemi.intensity=0.1;F.sun.intensity=0;F.up.color.set(0xffe2c2);F.up.intensity=0.12;}else{F.hemi.intensity=0.24+0.34*k;F.sun.intensity=0.15*k;F.up.color.set(0xfffaf2);F.up.intensity=0.08+0.10*k;}}   // 昼の k：窓の明るさの割合（シェードで変わる）
function dayRatio(list,p){let a=0,b=0;list.forEach(w=>{w.t=w.shadeable?(1-p)+p*0.5:1;a+=w.area*w.t;b+=w.area;});return b?a/b:1;}
// 壁：ローカル座標（u=壁に沿って、y=上、+z=室内側）。窓・ドアは穴として抜く
function wallGroup(x,y,z,ry){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=ry;s.add(g);return g;}
function addWindow(g,a,b,y1,y2,panes,noShade,split){const w=b-a,hh=y2-y1,um=(a+b)/2,ym=(y1+y2)/2,RV=0xf0ede7;
lbox(g,0.02,hh-0.04,0.14,a+0.01,ym,-0.07,RV);lbox(g,0.02,hh-0.04,0.14,b-0.01,ym,-0.07,RV);   // 額縁（奥行140）：左右は上下の間だけ（角で部品を重ねない）
lbox(g,w,0.02,0.14,um,y1+0.01,-0.07,RV);lbox(g,w,0.02,0.14,um,y2-0.01,-0.07,RV);
lbox(g,w-0.04,0.03,0.03,um,y1+0.035,-0.13,FIT);lbox(g,w-0.04,0.03,0.03,um,y2-0.035,-0.13,FIT);   // サッシの枠：額縁の内側だけ（額縁に埋めない。見える部分は前と同じ）。左右は上下の間
lbox(g,0.03,hh-0.1,0.03,a+0.035,ym,-0.13,FIT);lbox(g,0.03,hh-0.1,0.03,b-0.035,ym,-0.13,FIT);
for(let k=1;k<(panes||1);k++)lbox(g,0.06,hh-0.1,0.04,a+w*k/panes,ym,-0.12-0.01*(k%2),FIT);   // 召し合わせ：サッシの枠の上下の間
const gl=new THREE.Mesh(new THREE.PlaneGeometry(w,hh),glassMat);gl.position.set(um,ym,-0.15);g.add(gl);
addDaylight(g,um,ym,w,hh,!noShade);
if(noShade)return;
// シェード：split指定の窓は障子（サッシ）ごとに1枚ずつ
const n=split?panes:1;
for(let k=0;k<n;k++){const pw=w/n,cx=a+pw*(k+0.5),sw=pw-(n>1?0.07:0.05),zz=n>1?-0.08-0.02*(k%2):-0.07;
 lbox(g,sw+0.01,0.035,0.045,cx,y2-0.0375,zz,FIT);
 const fab=new THREE.Mesh(new THREE.PlaneGeometry(1,1),fabMat);fab.position.z=zz;fab.userData.dyn=true;g.add(fab);
 const rail=lbox(g,sw,0.02,0.035,cx,0,zz,FIT);rail.userData.dyn=true;   // シェードの生地と下端のバーは動くので、まとめる対象から外す
 shades.push({fab,rail,um:cx,w:sw,top:y2-0.055,max:hh-0.075,z:zz});}}
// 開口の見込み（左右・上）と、扉の奥の面。扉と枠の隙間から壁の向こうが見えないように
// T（壁の厚み）を指定したとき（開いたドア）は、見込みを壁の厚み全体に付け、奥の面は付けない
function doorBox(g,a,b,h,T){const w=b-a,d=T?T-0.002:0.066;   // 壁の厚さいっぱいのとき（T）は、向こうの壁の面と重ならないよう2mm手前まで
if(!T)lbox(g,w+0.04,h+0.03,0.006,(a+b)/2,(h+0.03)/2,-0.069,0xdedcd7);   // 奥の面は見込みの奥の端に接する（重ねない）
 lbox(g,0.008,h,d,a+0.004,h/2,-d/2,FIT);lbox(g,0.008,h,d,b-0.004,h/2,-d/2,FIT);lbox(g,w-0.016,0.008,d,(a+b)/2,h-0.004,-d/2,FIT);}   // 上の見込みは左右の見込みの間（角で重ねない）
// 額縁（ドアの開口の部屋側の枠。幅50・厚さ20）：上枠は左右の外の端まで、縦枠は上枠の下まで（角で部品を重ねない）。a,b：縦枠の中心、h：上枠の中心の高さ
function casing(g,a,b,h){lbox(g,0.05,h-0.025,0.02,a,(h-0.025)/2,0.01,FIT);lbox(g,0.05,h-0.025,0.02,b,(h-0.025)/2,0.01,FIT);lbox(g,b-a+0.05,0.05,0.02,(a+b)/2,h,0.01,FIT);}
function addDoor(g,a,b,h,n){const w=b-a;
casing(g,a,b,h);
const pw=(w-0.01)/n;for(let i=0;i<n;i++)lbox(g,pw-0.006,h-0.01,0.035,a+0.005+pw*(i+0.5),(h-0.01)/2,-0.03,0xf6f5f2);
if(n===1)lbox(g,0.12,0.02,0.03,b-0.12,1.0,0.0,0x8f8b85);
if(n===2)[-1,1].forEach(i=>lbox(g,0.015,0.25,0.025,(a+b)/2+i*0.045,1.0,0.0,0x8f8b85));}
// 折れ戸（閉じた状態。折れ目に溝、丸い引手）。n：2枚折れの組の数（2＝4枚、引手は中央寄りに2つ。1＝2枚、引手は knob の側（-1＝a側の扉）の折れ目寄り）
function addFoldDoor(g,a,b,h,n=2,knob){const w=b-a,pw=(w-0.01)/n;
casing(g,a,b,h);
for(let i=0;i<n;i++){const c=a+0.005+pw*(i+0.5);lbox(g,pw/2-0.004,h-0.01,0.03,c-pw/4,(h-0.01)/2,-0.03,0xf6f5f2);lbox(g,pw/2-0.004,h-0.01,0.03,c+pw/4,(h-0.01)/2,-0.03,0xf6f5f2);}
(n===1?[knob||-1]:[-1,1]).forEach(i=>{const k=new THREE.Mesh(new THREE.CylinderGeometry(0.017,0.017,0.02,20),L(0x8f8b85));k.rotation.x=Math.PI/2;k.position.set(n===1?(a+b)/2+i*0.06:(a+b)/2+i*(pw/2+0.04),1.0,-0.005);g.add(k);});}
// ハイドア（天井までの高さ、中央に縦長の型板ガラス、黒い角型の引手）
const frostMat=P({color:0xdde1e4,emissive:0x202326,specular:0x333333,shininess:40});
// uw指定のとき：開いた状態（b側の吊元で部屋側へ90°開く。扉の中心は吊元の枠の中心から42.5mm内側）
function highFrame(g,a,b,h){const w=b-a;lbox(g,0.035,h-0.015,0.07,a,(h-0.015)/2,-0.015,FIT);lbox(g,0.035,h-0.015,0.07,b,(h-0.015)/2,-0.015,FIT);lbox(g,w+0.035,0.045,0.07,(a+b)/2,h+0.0075,-0.015,FIT);}   // ハイドアの枠：縦枠は上枠の下まで（開閉で変わらないので、開いた形・閉じた形の外に1組だけ作る）
function addHighDoor(g,a,b,h,uw){const w=b-a,DW=0xf4f3f0;
const gw=w*0.22,pw=(w-0.01-gw)/2,ph=h-0.01;
if(uw){const n0=b-0.0425,z0=0.025,lf=(du,dy,ds,sc,y,c)=>lbox(g,du,dy,ds,n0,y,z0+sc,c);
 lf(0.035,ph,pw,pw/2,ph/2,DW);lf(0.035,ph,pw,pw+gw+pw/2,ph/2,DW);lf(0.012,ph-0.08,gw,pw+gw/2,ph/2,frostMat);lf(0.035,0.04,gw,pw+gw/2,0.02,DW);lf(0.035,0.04,gw,pw+gw/2,ph-0.02,DW);
 [-1,1].forEach(k=>lbox(g,0.012,0.035,0.035,n0+k*0.0235,1.0,z0+w-0.065,0x1a1a1a));return;}
lbox(g,pw,ph,0.035,a+0.005+pw/2,ph/2,-0.03,DW);lbox(g,pw,ph,0.035,b-0.005-pw/2,ph/2,-0.03,DW);
lbox(g,gw,ph-0.08,0.012,(a+b)/2,ph/2,-0.03,frostMat);
lbox(g,gw,0.04,0.035,(a+b)/2,0.02,-0.03,DW);lbox(g,gw,0.04,0.035,(a+b)/2,ph-0.02,-0.03,DW);
lbox(g,0.035,0.035,0.012,a+0.06,1.0,-0.008,0x1a1a1a);}
// 開き戸（開いた状態）：b側の吊元で部屋側（+z）へ90°開く。レバーハンドルは両面
function addSwingOpen(g,a,b,h){const w=b-a,lw=w-0.01,n0=b-0.0225;   // n0：開いた扉の中心（吊元の額縁の中心から22.5mm内側）。額縁は開閉で変わらないので呼ぶ側で1組だけ作る
lbox(g,0.035,h-0.01,lw,n0,(h-0.01)/2,0.025+lw/2,0xf6f5f2);
[-1,1].forEach(k=>lbox(g,0.03,0.02,0.12,n0+k*0.0325,1.0,0.025+lw-0.1,0x8f8b85));}
// 浴室のドア（システムバスの開き戸、閉じた状態。実例写真から）：シルバーのアルミ枠と框、すりガラス調の大きなパネル1枚、横一本のタオル掛け、戸先側の框にチャイルドロック（吊元はb側）
const bathFrM=P({color:0xa9a69f,specular:0x5a5a58,shininess:45}),bathLtM=P({color:0xd9d7d1,specular:0x333333,shininess:30}),bathGlM=P({color:0xc6ccc9,emissive:0x1b1e1d,specular:0x404040,shininess:60});
function addBathDoor(g,a,b,h,gC,gO,T){const w=b-a,um=(a+b)/2,GR=0x75736d;
casing(g,a,b,h);   // 額縁（白）
lbox(g,0.03,h,0.06,a+0.015,h/2,-0.035,bathFrM);lbox(g,0.03,h,0.06,b-0.015,h/2,-0.035,bathFrM);lbox(g,w,0.035,0.06,um,h-0.0175,-0.035,bathFrM);lbox(g,w,0.02,0.066,um,0.01,-0.033,bathFrM);   // ドア枠（縦枠・上枠・下枠）
lbox(g,0.004,h-0.035,0.002,a+0.015,(h-0.035)/2,-0.004,GR);lbox(g,0.004,h-0.035,0.002,b-0.015,(h-0.035)/2,-0.004,GR);   // 縦枠の溝
if(T){lbox(g,0.03,h,T-0.065,a+0.015,h/2,-(T+0.065)/2,bathFrM);lbox(g,0.03,h,T-0.065,b-0.015,h/2,-(T+0.065)/2,bathFrM);lbox(g,w,0.035,T-0.065,um,h-0.0175,-(T+0.065)/2,bathFrM);lbox(g,w,0.02,T-0.066,um,0.01,-(T+0.066)/2,bathFrM);   // 開閉できるとき（T：浴室の壁の面までの奥行）：枠の奥（浴室側）を浴室の壁の面まで延ばす（縦枠・上枠・下枠。開口から壁の中が見えないように）
 lbox(g,0.03,h+0.03,0.008,a-0.005,(h+0.03)/2,-T-0.004,bathFrM);lbox(g,0.03,h+0.03,0.008,b+0.005,(h+0.03)/2,-T-0.004,bathFrM);lbox(g,w+0.04,0.03,0.008,um,h+0.015,-T-0.004,bathFrM);}   // 浴室側の枠の縁（仮）
const l0=a+0.03,l1=b-0.03,y0=0.02,y1=h-0.035,z=-0.03,SL=0.065,SH=0.04,RT=0.05,RB=0.06;   // 扉の範囲。戸先側（a側）の框は太め
const g0=l0+SL,g1=l1-SH,gc=(g0+g1)/2,gw=g1-g0;
const leaf=g=>{lbox(g,SL,y1-y0,0.035,l0+SL/2,(y0+y1)/2,z,bathFrM);lbox(g,SH,y1-y0,0.035,l1-SH/2,(y0+y1)/2,z,bathFrM);lbox(g,gw,RT,0.035,gc,y1-RT/2,z,bathFrM);lbox(g,gw,RB,0.035,gc,y0+RB/2,z,bathFrM);   // 縦框・上框・下框
lbox(g,gw,0.022,0.002,gc,y1-RT-0.011,z+0.0185,bathLtM);lbox(g,gw,0.018,0.002,gc,y0+RB+0.009,z+0.0185,bathLtM);   // パネル上下の明るい押縁
const p0=y0+RB+0.018,p1=y1-RT-0.022;lbox(g,gw,p1-p0,0.006,gc,(p0+p1)/2,z,bathGlM);   // すりガラス調のパネル
lbox(g,0.003,p1-p0+0.04,0.002,g0-0.008,(p0+p1)/2,z+0.0185,GR);lbox(g,0.003,p1-p0+0.04,0.002,g1+0.008,(p0+p1)/2,z+0.0185,GR);   // 框の溝
{const ty=0.95,TB=0.022,tz=z+0.0175+0.03,tl=gw+0.03+TB;lbox(g,tl,TB,TB*0.8,gc,ty,tz,bathFrM);[g0-0.015,g1+0.015].forEach(x=>lbox(g,TB,TB,0.03-TB*0.4,x,ty,z+0.0175+(0.03-TB*0.4)/2,bathFrM));}   // タオル掛け（角ばった断面、両端は框へ直角に折れて固定）
lbox(g,0.02,0.06,0.008,l0+0.03,1.27,z+0.0215,0x8e8b84);lbox(g,0.008,0.022,0.006,l0+0.03,1.275,z+0.0275,0x5f5d58);};   // チャイルドロック
leaf(gC||g);   // 閉じた扉
if(gO){const zh=z-0.0175,pv=new THREE.Group();pv.position.set(l1,0,zh);pv.rotation.y=-THREE.MathUtils.degToRad(95);gO.add(pv);const q=new THREE.Group();q.position.set(-l1,0,-zh);pv.add(q);leaf(q);}}   // 開いた扉：吊元（b側）の縦框の浴室側の角を軸に、浴室側へ95°
// 床暖房のヘッダーボックス（壁に埋め込み、白。上・中・下に横長のガラリ、左寄りに小さなつまみ）
function addHB(g,a,b,h){const w=b-a,um=(a+b)/2,HW=0xf5f4f1;
lbox(g,w,h,0.006,um,h/2,-0.063,0xcfcdc8);lbox(g,0.008,h,0.06,a+0.004,h/2,-0.03,FIT);lbox(g,0.008,h,0.06,b-0.004,h/2,-0.03,FIT);lbox(g,w-0.016,0.008,0.06,um,h-0.004,-0.03,FIT);   // 奥の面（見込みの奥の端に接する）・見込み（上は左右の間）
lbox(g,0.025,h,0.03,a+0.0125,h/2,0.015,HW);lbox(g,0.025,h,0.03,b-0.0125,h/2,0.015,HW);lbox(g,w,0.025,0.03,um,h-0.0125,0.015,HW);   // 枠
const dw=w-0.054;lbox(g,dw,h-0.03,0.02,um,(h-0.03)/2+0.002,0.018,HW);   // 扉
const lv=(y0,y1)=>{const lw=dw*0.74,n=Math.round((y1-y0)/0.016);lbox(g,lw,y1-y0,0.002,um,(y0+y1)/2,0.029,0xa9a7a2);for(let i=0;i<n;i++)lbox(g,lw-0.012,0.008,0.005,um,y0+(i+0.5)*(y1-y0)/n,0.0305,HW);
 lbox(g,lw+0.012,0.006,0.004,um,y1,0.03,HW);lbox(g,lw+0.012,0.006,0.004,um,y0,0.03,HW);lbox(g,0.006,y1-y0,0.004,um-lw/2,(y0+y1)/2,0.03,HW);lbox(g,0.006,y1-y0,0.004,um+lw/2,(y0+y1)/2,0.03,HW);};
lv(1.04,1.15);lv(0.69,0.78);lv(0.08,0.34);   // ガラリ（上・中・下）
{const k=new THREE.Mesh(new THREE.CylinderGeometry(0.011,0.011,0.018,20),L(0xe9e9e7));k.rotation.x=Math.PI/2;k.position.set(a+0.05,0.73,0.037);g.add(k);}}   // つまみ
// 開き戸（閉じた状態）：b側の吊元。レバーハンドルは両面で戸先（a側）寄り
function addSwingClosed(g,a,b,h){const w=b-a;   // 額縁は呼ぶ側で1組だけ作る
lbox(g,w-0.01,h-0.01,0.035,(a+b)/2,(h-0.01)/2,-0.03,0xf6f5f2);
[-1,1].forEach(k=>lbox(g,0.12,0.02,0.03,a+0.105,1.0,-0.03+k*0.0325,0x8f8b85));}
// 開閉できるドア（o.toggle）：開いた形と閉じた形を両方作り、表示を切り替える
const PK={door:0.036,thin:0.055};   // 引き戸：扉の厚さ・戸袋の部分の薄い壁の厚さ（仮置き。平面図の比率から。壁115−55＝へこみ60）
function addToggleDoor(g,o,m,sc){const gO=new THREE.Group(),gC=new THREE.Group();g.add(gO);g.add(gC);const a=o.a,b=o.b,h=o.y2,w=b-a;
 if(o.door==='slide'){   // インセットの引き戸（一条の実例写真・平面図から）：戸袋の部分は壁が薄く（奥にへこみ）、扉はそのへこみの前を走る。枠は開口と戸袋をまとめて囲む。R<0（dir<0）はa側へ引く
  const R=o.dir<0?-1:1,T=o.T,TD=PK.door,DP=T-PK.thin,zc=-0.002-TD/2,wd=w+0.02,   // DP：戸袋のへこみの深さ、zc：扉の中心（表は壁の面とほぼそろう）、wd：扉の幅（閉めたとき戸袋側へ2cm重なる）
   mo=R>0?b:a,pe=mo+R*w,pc=mo+R*w/2,c0=Math.min(a,pe),c1=Math.max(b,pe),xs=R>0?a+0.004:b-0.004;   // mo：開口の戸袋側の端、pe：戸袋の奥の端、xs：戸当り側の見込み
  casing(g,c0,c1,h);   // 額縁（開口と戸袋を囲む。開閉で変わらない）
  lbox(g,0.008,h,T-0.002,xs,h/2,-(T-0.002)/2,FIT);lbox(g,w-0.016,0.008,T-0.002,(a+b)/2,h-0.004,-(T-0.002)/2,FIT);   // 開口：戸当り側の見込み・上枠（壁の厚さいっぱい。上枠は両側の見込みの間）
  const bk=new THREE.Mesh(uvPlane(w,h,Math.min(mo,pe),0,sc,sc),m);bk.position.set(pc,h/2,-DP);g.add(bk);   // 戸袋：へこんだ壁（クロス貼り）
  lbox(g,w-0.008,0.06,0.012,pc-R*0.004,0.03,-DP+0.006,FIT);lbox(g,0.008,h,DP,pe-R*0.004,h/2,-DP/2,FIT);lbox(g,w-0.008,0.008,DP,pc-R*0.004,h-0.004,-DP/2,FIT);   // 戸袋：幅木・奥の端と上の見込み（幅木と上の見込みは奥の端の手前まで）
  {const zb=zc-TD/2-0.003,Tz=T-0.002;lbox(g,0.008,h,Tz+zb,mo+R*0.004,h/2,(zb-Tz)/2,FIT);}   // 開口の戸袋側の見込み：反対側の枠から扉の裏（すき間3mm）まで巻き込み、段差をなくす
  const door=(gp,u0)=>{lbox(gp,wd,h-0.01,TD,u0+R*wd/2,(h-0.01)/2,zc,0xf6f5f2);const hx=u0+R*0.07;lbox(gp,0.025,0.16,0.01,hx,1.0,zc+TD/2,0x2a2a2a);lbox(gp,0.025,0.16,0.01,hx,1.0,zc-TD/2,0x2a2a2a);};   // 扉と引手（表と裏、戸先寄り）。u0：戸先の位置
  const u0=R>0?a+0.003:b-0.003;door(gC,u0);door(gO,u0+R*w);}   // 閉：開口を覆う、開：戸袋のへこみの前へ引いた位置
 else if(o.door==='outset'){   // アウトセットの引き戸：扉は壁の面の外（部屋側）を上のレールに吊られて走る。開口は壁の厚さいっぱいの見込みで囲む。R<0はa側へ引く
  const R=o.dir<0?-1:1,T=o.T,TD=PK.door,ov=0.02,wd=w+2*ov,zc=0.008+TD/2,hd=h+0.004;   // ov：扉が開口に重なる幅、zc：扉の中心（壁から8mm離す）、hd：扉の高さ（床から8mm上〜開口の上端の12mm上）
  lbox(g,0.008,h,T-0.002,a+0.004,h/2,-(T-0.002)/2,FIT);lbox(g,0.008,h,T-0.002,b-0.004,h/2,-(T-0.002)/2,FIT);lbox(g,w-0.016,0.008,T-0.002,(a+b)/2,h-0.004,-(T-0.002)/2,FIT);   // 開口の見込み（左右・上。壁の厚さいっぱい。上は左右の間）
  {const c0=Math.min(a-ov,a-ov+R*w),c1=Math.max(b+ov,b+ov+R*w);lbox(g,c1-c0+0.03,0.05,0.05,(c0+c1)/2,h+0.037,0.025,FIT);}   // 上のレール（カバー付き。扉の動く範囲いっぱい）
  const door=(gp,u0)=>{const uc=u0+R*wd/2;lbox(gp,wd,hd,TD,uc,0.008+hd/2,zc,0xf6f5f2);if(!o.noWin){const w2=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,TD+0.003,24),frostMat);w2.rotation.x=Math.PI/2;w2.position.set(u0+R*0.1,hd-0.12,zc);gp.add(w2);}   // 扉と小窓（戸先寄りの上に小さな丸い穴。中の明かりが分かる程度。大きさは仮。noWin で小窓なし）
   const hx=u0+R*0.07;lbox(gp,0.025,0.16,0.01,hx,1.0,zc+TD/2,0x2a2a2a);lbox(gp,0.025,0.16,0.01,hx,1.0,zc-TD/2,0x2a2a2a);};   // 引手（表と裏、戸先寄り）。u0：戸先の位置
  const u0=R>0?a-ov:b+ov;door(gC,u0);door(gO,u0+R*w);}   // 閉：開口を覆う、開：引いた位置
 else if(o.door==='high'){highFrame(g,a,b,h);addHighDoor(gO,a,b,h,o.uw);addHighDoor(gC,a,b,h,0);lbox(gC,0.035,0.035,0.012,a+0.06,1.0,-0.0535,0x1a1a1a);}   // 閉じたとき：裏側の引手
 else if(o.door==='swing'){casing(g,a,b,h);const M=gp=>{if(!o.hingeA)return gp;const q=new THREE.Group();q.position.x=a+b;q.scale.x=-1;gp.add(q);return q;};addSwingOpen(M(gO),a,b,h);addSwingClosed(M(gC),a,b,h);}   // hingeA：吊元がa側（左右を反転して作る。動く部品なので反転してよい）
 else if(o.door==='bath')addBathDoor(g,a,b,h,gC,gO,o.T);   // 浴室のドア（枠は動かない部品、扉だけ切り替える）
 if(o.fixed){g.remove(gO);return;}   // fixed：開閉しないドア（閉じた形だけ。動かない部品としてまとめる）
 regDoor(o.toggle,gO,gC,[L(FIT),L(0xdedcd7),m]);}
// ドアの開口（a〜b）は壁の穴（図面の壁と壁の間）。枠（額縁）は穴の内側に収め、外の端を穴の端にそろえる（隣の壁に埋まらない）。
// 扉や枠の部品は、穴を額縁の幅の半分（DS2）ずつ内側へ狭めた位置（a'〜b'）を基準に作り、穴の端から a' までは見込み（壁の厚さ）でふさぐ。全ドア共通
const DS2=o=>o.door==='high'?0.0175:0.025,inner=o=>({...o,a:o.a+DS2(o),b:o.b-DS2(o)});
function buildWall(g,len,h,ops,m,sc,bb,cut){   // cut={u,y}：u より先・高さ y より上を抜く（壁の形を L 字に）
ops=ops.concat(ops.filter(o=>o.door==='slide'&&o.open).map(o=>{const q=inner(o),w=q.b-q.a;return o.dir<0?{a:q.a-w-0.025,b:o.a,y1:0,y2:o.y2}:{a:o.b,b:q.b+w+0.025,y1:0,y2:o.y2};}));   // 穴どうしは重ねない（重なると穴が抜けない）   // 引き戸の戸袋（手前の壁を抜いて、奥にへこんだ壁を作る。奥の端は額縁の外の端）。dir<0：a側へ引く
const shp=new THREE.Shape();shp.moveTo(0,0);shp.lineTo(len,0);if(cut){shp.lineTo(len,cut.y);shp.lineTo(cut.u,cut.y);shp.lineTo(cut.u,h);}else shp.lineTo(len,h);shp.lineTo(0,h);shp.lineTo(0,0);
ops.forEach(o=>{const y1=Math.max(o.y1,0.002),p=new THREE.Path();p.moveTo(o.a,y1);p.lineTo(o.a,o.y2);p.lineTo(o.b,o.y2);p.lineTo(o.b,y1);p.lineTo(o.a,y1);shp.holes.push(p);});
const geo=new THREE.ShapeGeometry(shp);const uv=geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/sc,uv.getY(i)/sc);
g.add(new THREE.Mesh(geo,m));
if(bb){const by=bb.y||0,seg=(u0,u1)=>{const v0=u0<0.001?0.012:u0;lbox(g,u1-v0,0.06,0.012,(v0+u1)/2,by+0.03,0.006,FIT);   // 幅木（開口の間ごと。壁の始まりの角では、前の壁の幅木に突き付けて厚さ12mm分短くする＝角で重ねない）。bb={y,tile}のときは、高さyに幅木、その下にタイル（土間の壁）
  if(by>0){const t=new THREE.Mesh(uvPlane(u1-u0,by,u0,0.05,2.4,2.4),bb.tile);t.position.set((u0+u1)/2,by/2,0.004);g.add(t);}};   // タイルは目地の横線が入らない高さで切り出す
 const cuts=ops.filter(o=>o.y1<0.3).sort((p,q)=>p.a-q.a);let u=0;cuts.forEach(o=>{if(o.a-u>0.01)seg(u,o.a);u=Math.max(u,o.b);});if(len-u>0.01)seg(u,len);}
ops.forEach(o=>{if(o.win)addWindow(g,o.a,o.b,o.y1,o.y2,o.panes,o.noShade,o.splitShade);if(o.hb)addHB(g,o.a,o.b,o.y2);if(o.door){const O=o;o=inner(o);const d=O.toggle||O.open?O.T:0.066,s2=DS2(O),fl=(u0,u1)=>{const dd=d-(d===O.T?0.002:0);lbox(g,u1-u0,O.y2,dd,(u0+u1)/2,O.y2/2,-dd/2,FIT);};if(O.door!=='frame'&&d){if(!(O.door==='slide'&&O.dir<0))fl(O.a,o.a);if(!(O.door==='slide'&&!(O.dir<0)))fl(o.b,O.b);}   // 穴の端から a'・b' までの見込み（引き戸の戸袋側は扉が通るので付けない。壁の厚さいっぱいのときは、向こうの壁の面と重ならないよう2mm手前まで）
 if(o.door!=='frame')if(!((o.toggle||o.fixed)&&(o.door==='slide'||o.door==='outset'||o.door==='bath')))doorBox(g,o.a,o.b,o.y2,(o.open||o.door==='swing')?o.T:0);}if(o.toggle||o.fixed)addToggleDoor(g,o,m,sc);else if(o.door==='fold')addFoldDoor(g,o.a,o.b,o.y2,o.n,o.knob);else if(o.door==='frame'){const w=o.b-o.a,h=o.y2;casing(g,o.a,o.b,h);}else if(o.door)addDoor(g,o.a,o.b,o.y2,o.n||1);});}
// 壁を2点（A→B）で指定：Aから見てBへ向かう向きに壁を張り、部屋側（+z）はその向きの右手（真上から見て）。y0：下端の高さ
function wallAB(ax,az,bx,bz,y0,h,ops,m,bb){const dx=bx-ax,dz=bz-az;buildWall(wallGroup(ax,y0,az,Math.atan2(-dz,dx)),Math.hypot(dx,dz),h,ops,m,1,bb);}
function applyShades(list,p){list.forEach(sh=>{const len=Math.max(0.02,sh.max*p);sh.fab.geometry.dispose();sh.fab.geometry=uvPlane(sh.w,len,0,0,sh.w,0.035);sh.fab.position.set(sh.um,sh.top-len/2,sh.z||-0.07);sh.fab.visible=p>0;sh.rail.position.y=sh.top-len-0.01;});}
// エアコン：ダイキン AXシリーズ（W798×H295×D370、ホワイト）。x,z=取付け壁面での左右中心、y=本体の下端、ry=向き（+z側が室内）
const acWhite=P({color:0xf6f6f4,specular:0x333333,shininess:30}),acGrey=P({color:0xb4b1ab,specular:0x222222,shininess:20}),acFlap=P({color:0xe9e9e6,specular:0x333333,shininess:30});
function acUnit(x,y,z,ry){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=ry;s.add(g);
 const W=0.798,H=0.295,D=0.37,FD=D*0.92,R0=0.06,BH=0.07;
 lbox(g,W,H-BH-R0,FD,0,BH+(H-BH-R0)/2,FD/2,acWhite);
 lbox(g,W,R0,FD-R0,0,H-R0/2,(FD-R0)/2,acWhite);
 const cyl=new THREE.Mesh(new THREE.CylinderGeometry(R0,R0,W,24),acWhite);cyl.rotation.z=Math.PI/2;cyl.position.set(0,H-R0,FD-R0);g.add(cyl);
 lbox(g,W,BH,FD*0.86,0,BH/2,FD*0.43,acGrey);
 const flap=lbox(g,W-0.07,0.012,0.11,0,0.03,FD*0.86-0.03,acFlap);flap.rotation.x=-0.18;
 lbox(g,W-0.12,0.003,0.12,0,H+0.0015,0.10,acGrey);
 lbox(g,0.07,0.014,0.003,W*0.2,BH+0.014,FD+0.0015,0xa9c9e2);
 lbox(g,0.06,0.008,0.002,-W*0.38,BH+0.03,FD+0.001,0xb0b0b0);}

