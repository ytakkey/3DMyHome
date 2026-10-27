// ===== LDK（1階リビング・ダイニング・キッチン＋吹抜け・2階廊下） =====
function buildLDK(sc){
s=sc;shades=[];winLights=[];const myShades=shades,myWins=winLights;
const {W,D,H1,FL2,H2,VX,VZ,TVX,TVZ,PZ0,PZ1,PX1,SGZ0,SGZ1}=HOUSE.ldk,HALLZ=HOUSE.hall.Z0,B=HOUSE.bed;
sc.background=new THREE.Color(0xdfe9f2);
const F=fillLights(sc),{hemi,sun,up}=F;   // 補助光（全部屋共通）。1階全体（脱衣室・洗面所・廊下・玄関・トイレを含む）・吹抜け・2階廊下に届く
const plasterMat=tmat(ic5021C),accentMat=ic5025Mat(),woodMat=tmat(oakC,{},Math.PI/2);
const oakFloorMat=tmat(oakTile,{specular:0x1c1813,shininess:18},Math.PI/2);
const stoneMat=tmat(stoneTile,{specular:0x222222,shininess:14},Math.PI/2),stoneKMat=tmat(stoneTileK,{specular:0x222222,shininess:14},Math.PI/2);
const railWood=P({color:0xc48c56,specular:0x1c1813,shininess:20});
function hRect(x0,x1,z0,z1,y,m,su,sv,down){const p=new THREE.Mesh(uvPlane(x1-x0,z1-z0,x0,down?z0:D-z1,su,sv||su),m);p.rotation.x=down?Math.PI/2:-Math.PI/2;p.position.set((x0+x1)/2,y,(z0+z1)/2);s.add(p);return p;}

// 床
{const L300=-0.002-PK.door/2,L11=TVX-0.03,CB=0.5-0.069,BK=HOUSE.wash.LW+PK.thin,PW=SGZ1-SGZ0-0.05;   // L300：SG300l（インセットの引き戸）の扉の厚みの中心（X）、L11：SG11H の扉の厚みの中心（X）、CB：押入の扉の奥の面（Z）、BK・PW：SG300l の戸袋のへこみの奥の面（X）と長さ（Z。開口の内側の幅）
 floorPoly([[L300,CB],[1.30,CB],[1.30,-0.08],[W,-0.08],[W,0],[2.155,0],[2.155,1.76],[W,1.76],[W,D],[L11,D],[L11,PZ1],[L300,PZ1],[L300,SGZ0],[BK,SGZ0],[BK,SGZ0-PW],[L300,SGZ0-PW]],0,oakFloorMat,1.818);}   // LDK の床（1枚）：北は北の壁の向こうまで少し広げる。西は SG300l の扉の中心まで（その向こうは脱衣室の床）、仕切り壁より南は西の壁（テレビ面）の中の SG11H の扉の中心まで（その西は廊下・玄関）。押入の中（x0〜1.24・z0〜0.5）は床を作らない（扉の奥の面まで）
// キッチン部分（東の壁から3マス×北の壁から2マス）は石目調フローリング、張り方向は南北
floorRect(2.155,W,0,1.76,0,stoneMat,1.818);   // 石の床は木の床をくり抜いた所に同じ高さで（重ねない）

// 1階の壁
buildWall(wallGroup(0,0,0,0),W,H1,[{a:2.50,b:3.10,y1:1.541,y2:2.141,win:1,noShade:1},{a:3.15,b:3.75,y1:1.541,y2:2.141,win:1,noShade:1}],plasterMat,1,true);           // 北（FF2020×2）
const F2a=FL2+0.969,F2b=FL2+2.144,hw=0.3715;
buildWall(wallGroup(W,0,0,-Math.PI/2),D,H2,[{a:0.615,b:1.215,y1:0.969,y2:2.144,win:1,noShade:1}].concat([4.13,4.97,5.81].map(c=>({a:c-hw,b:c+hw,y1:F2a,y2:F2b,win:1}))),plasterMat,1,true); // 東（1階FK2042：シェードなし、2階FF2442×3）
buildWall(wallGroup(W,0,D,Math.PI),W-TVX,H2,[{a:0.9615,b:3.4485,y1:0.02,y2:2.194,win:1,panes:3,splitShade:1}].concat([2.195,1.355].map(c=>({a:c-hw,b:c+hw,y1:F2a,y2:F2b,win:1}))),plasterMat,1,true,{u:W-VX,y:H1}); // 南（1階F8671：シェードは障子ごと、2階FF2442×2）。吹抜けより西の1階の天井より上は抜く（2階の書斎の南の壁は書斎で作る）
buildWall(wallGroup(0,0,PZ0,Math.PI/2),PZ0,H1,[{a:PZ0-SGZ1,b:PZ0-SGZ0,y1:0,y2:2.0,door:'slide',open:1,T:-HOUSE.wash.LW,toggle:'sg300l'}],plasterMat,1,true);              // 西（SG300：開閉できる引き戸。北へ引いて開ける）
buildWall(wallGroup(TVX,0,D,Math.PI/2),D-HOUSE.wash.SZ1,H1,[],accentMat,0.4,true);                                                             // リビング西（アクセント面：IC-5025）。北端はSG11Hの開口の端（建具の横）まで
buildWall(wallGroup(TVX,0,HOUSE.wash.SZ1,Math.PI/2),HOUSE.wash.SZ1-PZ1,H1,[{a:0,b:HOUSE.wash.SZ1-PZ1,y1:0,y2:H1-0.03,door:'high',open:1,T:TVX-HOUSE.wash.CX1,uw:1,toggle:'sg11h'}],plasterMat,1,true);   // 西のドア（SG11H：北側吊元でリビング側へ開いた状態）
wbox(PX1,H1,PZ1-PZ0,PX1/2,H1/2,(PZ0+PZ1)/2,plasterMat,1);                                                                                         // 仕切り壁
box(PX1+0.012,0.06,0.012,(PX1+0.012)/2,0.03,PZ0-0.006,FIT);box(0.012,0.06,PZ1-PZ0+0.012,PX1+0.006,0.03,(PZ0+PZ1+0.012)/2,FIT);box(PX1-TVX,0.06,0.012,(TVX+PX1)/2,0.03,PZ1+0.006,FIT);box(HOUSE.wash.CX1,0.06,0.012,HOUSE.wash.CX1/2,0.03,PZ1+0.006,FIT);   // 仕切り壁の幅木（北・東の端・南の LDK 側・南の廊下側。テレビ面の壁の中は通さない＝廊下と LDK をつながない）

// 押入（2枚扉の観音開き）
buildWall(wallGroup(0,0,0.5,0),1.24,H1,[{a:0.04,b:1.2,y1:0,y2:2.0,door:1,n:2}],plasterMat,1,true);
wbox(0.12,H1,0.5,1.30,H1/2,0.25,plasterMat,1);

// 1階天井（2400）とキッチン上の下がり天井（2300・IC-5015）
ceilPoly([[0,0.45],[1.30,0.45],[1.30,0],[W,0],[W,1.565],[2.15,1.565],[2.15,2.67],[W,2.67],[W,VZ],[VX,VZ],[VX,D],[TVX,D],[TVX,VZ],[0,VZ]],H1,ceilMat,0.4);   // 1階の天井（LDK で1枚。下がり天井の所は抜く。押入の上は扉の面の向こう5cmまで）
hRect(2.15,W,1.565,2.67,2.3,woodMat,0.9,0.9,true);
{const p1=new THREE.Mesh(uvPlane(1.105,0.1,0,0,0.9,0.9),woodMat);p1.rotation.y=-Math.PI/2;p1.position.set(2.15,2.35,2.1175);s.add(p1);
 const p2=new THREE.Mesh(uvPlane(W-2.15,0.1,0,0,0.9,0.9),woodMat);p2.rotation.y=Math.PI;p2.position.set((W+2.15)/2,2.35,1.565);s.add(p2);
 const p3=new THREE.Mesh(uvPlane(W-2.15,0.1,0,0,0.9,0.9),woodMat);p3.position.set((W+2.15)/2,2.35,2.67);s.add(p3);}

// 2階：吹抜けまわりとホール（赤枠の範囲）
const HALLX=HOUSE.hall.X0,HCH=H2;  // ホール西の突き当り（収納SGC-30Tの折れ戸）、ホール天井（吹抜けと同じ高さ）
buildWall(wallGroup(VX,H1,D,Math.PI/2),D-PZ0,H2-H1,[],plasterMat,1,false);                      // 吹抜け西の壁（主寝室・書斎側。北端は廊下の南の壁の面まで）
buildWall(wallGroup(VX,H1,VZ,0),W-VX,FL2-H1,[],plasterMat,1,false);                             // 2階床の端（吹抜け北）
buildWall(wallGroup(HALLX,FL2,HALLZ,0),W-HALLX,HCH-FL2,[{a:0.033,b:0.81,y1:0,y2:2.0,door:1},{a:1.83,b:2.63,y1:0,y2:2.0,door:'frame'},{a:W-HALLX-0.78,b:W-HALLX,y1:0,y2:2.0,door:1}],plasterMat,1,true); // ホール北（洋室2-A・洋室(2)の開き戸、トイレのSG300の枠）
buildWall(wallGroup(HALLX+2.63,FL2,HALLZ-0.115,Math.PI),1.7,2.4,[{a:0,b:0.8,y1:0,y2:2.0,door:'slide',open:1,T:0.115,fixed:1}],plasterMat,1,false);   // 2階トイレのSG300（ダイニング↔脱衣室と同じインセットの引き戸。扉はトイレ側、西へ引く。閉じたまま開閉しない。トイレの中は作らないので、壁はドアと戸袋のまわりだけ）
buildWall(wallGroup(HALLX,FL2,VZ,Math.PI/2),VZ-HALLZ,HCH-FL2,[{a:0.03,b:0.82,y1:0,y2:2.0,door:'fold',n:1,knob:-1}],plasterMat,1,true);   // ホール西の突き当り（収納の2枚折れ戸。引手は南の扉の折れ目寄り）
buildWall(wallGroup(VX,FL2,PZ0,Math.PI),VX-HALLX,HCH-FL2,[{a:VX-(B.X0+B.doorB),b:VX-(B.X0+B.doorA),y1:0,y2:2.0,door:'frame'}],plasterMat,1,true);   // ホール南（主寝室の引き戸、ウォークイン側）。寝室との壁（Y4、厚さ115）の廊下側の面
floor2F(walnutMat);   // 2階の床（寝室・廊下で一枚）
hRect(HALLX,W,HALLZ,VZ,HCH,ceilMat,0.4,0.4,true);
hRect(VX,W,VZ,D,H2,ceilMat,0.4,0.4,true);
// オープンステア（東の壁沿いに北へ上る、14段。14段目は2階の床）：階段の詳細図（側面・断面）と2階の間取り図から
// 詳細図の高さは1階床〜2階床2770（1段目200、2〜13段目198、14段目194）。この家の2階の床（FL2＝2900）に合わせて高さだけを同じ比率（KV）で伸ばす。水平の寸法は図のまま
// d：1段目の踏板の先端（Z1）から北へ測った水平の距離。踏板の割り（G）204.7、2階の床の端（ZE＝吹抜けの北の縁 VZ）は1段目の先端から2720、14段目の段鼻は2階の床の端から57張り出す
const SX0=HOUSE.ldk.SX0,STW=0.875,SX1=SX0+STW,SXC=(SX0+SX1)/2,Z1=VZ+2.72,G=2.661/13,NST=14,KV=FL2/2.77,ZE=VZ,ZN=Z1-13*G,STT=0.035,TD=0.235;   // 踏板：幅875（壁から20あける）・奥行235・厚さ35
const zOf=d=>Z1-d,yTop=i=>i>=NST?FL2:(0.2+0.198*(i-1))*KV,ny=z=>(0.2+0.198*(Z1-z)/G)*KV,SL=0.198*KV/G,ang=Math.atan(SL),cA=Math.cos(ang);   // yTop：i段目の踏板の上面、ny：踏板の先端を結んだ線の高さ
const treadMat=P({color:0xc48c56,specular:0x1c1813,shininess:20}),steel=0x1c1c1c;
// 踏板の上面：先端に2本線のすべり止め（溝。写真から：先端から20と40、幅5、両端から70あけて止める）。上面だけ溝を描いたテクスチャ（v＝1が奥、0が先端）
const tdTop=(w,d)=>{const c=cv((x,CW,CH)=>{const sx=CW/w,sy=CH/d;x.fillStyle='#c48c56';x.fillRect(0,0,CW,CH);[0.02,0.04].forEach(g=>{const y=CH-(g+0.005)*sy;x.fillStyle='#7d5634';x.fillRect(0.07*sx,y,CW-0.14*sx,0.005*sy);x.fillStyle='#d9a473';x.fillRect(0.07*sx,y+0.005*sy,CW-0.14*sx,Math.max(1,0.0008*sy));});},1024,Math.round(1024*d/w/4)*4||256);
 return P({map:new THREE.CanvasTexture(c),specular:0x1c1813,shininess:20});};
const tdMat=tdTop(STW,TD),D14=0.12,TL=0.004,tread=(w,d,x,yt,z,m)=>{box(w,STT-TL,d,x,yt-TL-(STT-TL)/2,z,treadMat);box(w,TL,d,x,yt-TL/2,z,m);};   // D14：14段目の段鼻の板の奥行（踏板より短くし、2階の床材の範囲を広く。2階の床の端から出る57＋床の上に63）。tread：踏板＝下の板＋上の4mm（上面に溝のテクスチャ）

for(let i=1;i<NST;i++){const zf=zOf((i-1)*G);tread(STW,TD,SXC,yTop(i),zf-TD/2,tdMat);box(STW-0.08,0.006,TD-0.06,SXC,yTop(i)-STT-0.003,zf-TD/2,steel);}   // 1〜13段目の踏板（木、すべり止めつき）と裏の鉄板
tread(W-SX0,D14,(SX0+W)/2,FL2,ZN-D14/2,tdTop(W-SX0,D14));   // 14段目：2階の床の張り出しの段鼻（踏板と同じ板・すべり止め、上面は2階の床。奥の端は HOUSE.ldk.ZB14）
// タレ壁（階段の幅＝1マス分、高さ100）：ササラ桁の上端を受けるため、2階の床の端の壁の下に。南の面は2階の床の端の壁と面一（手前へは出さない）、厚さ100
{const w=W-SX0,cx=(SX0+W)/2,u0=SX0-VX,pl=(g,x,y,z,rx,ry)=>{const m=new THREE.Mesh(g,plasterMat);m.position.set(x,y,z);m.rotation.set(rx,ry,0);s.add(m);};   // 壁紙はIC-5021（plasterMat）。柄の位置は上の2階床の端の壁（原点：吹抜けの西端・1階の天井の高さ、1m角）から続け、角では折り返して貼る
 pl(uvPlane(w,0.1,u0,-0.1,1,1),cx,H1-0.05,VZ,0,0);pl(uvPlane(w,0.1,u0,-0.2,1,1),cx,H1-0.1,VZ-0.05,Math.PI/2,0);pl(uvPlane(w,0.1,-(W-VX),0.2,-1,-1),cx,H1-0.05,VZ-0.1,0,Math.PI);pl(uvPlane(0.1,0.1,u0-0.1,-0.1,1,1),SX0,H1-0.05,VZ-0.05,0,-Math.PI/2);}   // 南の面（上の壁と面一）・下の面・北の面・西の端の面
// ササラ桁×2（黒、幅75・せい125）：踏板の両端から190の位置（断面図）。上面は踏板の先端を結んだ線から鉛直に322.7下（側面図）、下端は床で水平に、上端は2階の床の端で垂直に切る
// 受け金物：ササラ桁と同じ幅で面一。上の辺は踏板の下面（先端から34〜奥の端の29手前）、前と後ろの辺はササラ桁に直角に下ろしてササラ桁の上面まで
{const BW=0.075,BV=0.125/cA,ys=d=>(0.2+0.198*d/G-0.3227)*KV,dAt=y=>(y/KV+0.3227-0.2)*G/0.198;   // ys：ササラ桁の上面の高さ、BV：せい（鉛直方向）、dAt：上面が高さyになる位置
 const shp=pts=>{const sh=new THREE.Shape();pts.forEach(([d,y],k)=>k?sh.lineTo(d,y):sh.moveTo(d,y));return sh;},dE=Z1-ZE;
 const beam=shp([[dAt(0),0],[dE,ys(dE)],[dE,ys(dE)-BV],[dAt(BV),0]]);
 const drop=(d,y)=>{const u=(y-ys(d))/(1+SL*SL);return [d+SL*u,y-u];};   // 点(d,y)からササラ桁に直角に下ろした足
 const brs=[];for(let i=1;i<NST;i++){const df=(i-1)*G,y=yTop(i)-STT-0.006,a=[df+0.034,y],b=[df+TD-0.029,y];brs.push(shp([a,b,drop(...b),drop(...a)].map(([d,yy])=>[d,Math.max(0,yy)])));}
 [SX0+0.2275,SX1-0.2275].forEach(x=>{const ex=sh=>{const g=new THREE.ExtrudeGeometry(sh,{depth:BW,bevelEnabled:false});g.rotateY(Math.PI/2);const m=new THREE.Mesh(g,L(steel));m.position.set(x-BW/2,0,Z1);s.add(m);};   // 形のx＝d（北へ）→ −z、押し出し→ +x
  ex(beam);brs.forEach(ex);});}
// ファイン手すり（階段の西側と2階廊下で同じ作り）：黒い角の支柱30角、その上に黒い平らな金物（幅30・厚さ12）、上に木の笠木（幅70・厚さ40）、支柱の間に透明のアクリル板（下は踏板の先端の線・床から50、上は金物の下面から38あける）
// 階段の支柱：1・4・7・10・13段目の踏板の奥側（上の段の先端の2手前に後ろの面）、踏板の西端に寄せて立て、下端は踏板に10刺さる。笠木の上面は踏板の先端の線から鉛直に800（詳細図）
// 笠木と金物は側面の形を押し出して作る：南端は1段目の踏板の先端と鉛直にそろえ、北端は2階廊下の手すりの角の支柱の手前3mmで鉛直に切る
const RH=0.8,PS=0.03,WT=0.04,WW=0.07,MT=0.012,MW=0.03,xr=SX0+0.02,zr=VZ-0.03,zTop=zr+PS/2+0.003,Y2=1.14-WT-MT;   // xr：階段の手すりの芯、zr：2階廊下の手すりの芯、zTop：階段の笠木の北端、Y2：2階の金物の下面の床からの高さ
{const yb=z=>ny(z)+RH-(WT+MT)/cA,tp=[1,4,7,10,13].map(i=>({i,z:zOf((i-1)*G+G-0.002-PS/2)}));
 tp.forEach(({i,z})=>{const y0=yTop(i)-0.01,y1=yb(z);box(PS,y1-y0,PS,xr,(y0+y1)/2,z,steel);});
 const band=(off,h,w,m)=>{const pts=[[Z1,ny(Z1)+off],[zTop,ny(zTop)+off],[zTop,ny(zTop)+off-h],[Z1,ny(Z1)+off-h]];const s2=new THREE.Shape(pts.map(([z,y])=>new THREE.Vector2(-z,y)));const g=new THREE.ExtrudeGeometry(s2,{depth:w,bevelEnabled:false});g.rotateY(Math.PI/2);const me=new THREE.Mesh(g,m);me.position.x=xr-w/2;s.add(me);};   // 側面が平行四辺形の帯（上の辺は踏板の先端の線＋off、鉛直の厚さh）
 band(RH,WT/cA,WW,railWood);band(RH-WT/cA,MT/cA,MW,L(steel));   // 笠木と金物
 const p0=tp[0].z,p1=tp[tp.length-1].z,sh=new THREE.Shape([[p0,ny(p0)+0.05],[p1,ny(p1)+0.05],[p1,yb(p1)-0.038],[p0,yb(p0)-0.038]].map(([z,y])=>new THREE.Vector2(z,y)));
 const ac=new THREE.Mesh(new THREE.ShapeGeometry(sh),acrylMat);ac.rotation.y=-Math.PI/2;ac.position.x=xr;s.add(ac);}   // 階段のアクリル板（1段目と13段目の支柱の間）
// 2階廊下：吹抜けの北の縁、西端から階段の手すりの線まで。支柱は西端・中央・東端（角）
{const x0=VX+0.025;[x0,(x0+xr)/2,xr].forEach(x=>box(PS,Y2,PS,x,FL2+Y2/2,zr,steel));
 const a2=new THREE.Mesh(new THREE.PlaneGeometry(xr-x0,Y2-0.038-0.05),acrylMat);a2.position.set((x0+xr)/2,FL2+0.05+(Y2-0.038-0.05)/2,zr);s.add(a2);
 box(xr-x0+PS,MT,MW,(x0+xr)/2,FL2+Y2+MT/2,zr,steel);box(xr-VX+0.02,WT,WW,(VX+xr)/2+0.01,FL2+Y2+MT+WT/2,zr,railWood);}   // 2階の金物と笠木
// 壁側の手すり（東の壁）：木の丸い笠木（楕円の断面 幅40×高さ36、壁から芯まで65）。高さ・長さ・傾き は階段の笠木と同じ（上面が踏板の先端の線から800、南端は1段目の先端、北端は階段の笠木の北端）
// 両端は黒いエンドキャップ（写真から）：笠木の端にかぶさる筒が、笠木の向きのまままっすぐ延び、先で壁へ曲がって壁に留まる（断面は笠木より少し太い楕円）。外側の端は、南は1段目の先端の線、北は階段の笠木の北端にそろえる
// ブラケット×3：両端のエンドキャップの根元（笠木の端）の間を4等分した位置（壁の座金から出て下から笠木に刺さるJ字の腕）
{const xc=W-0.065,RX=0.02,RY=0.018,CX=0.023,CY=0.021,yc=z=>ny(z)+RH-RY/cA,el=(rx,ry)=>{const sh=new THREE.Shape();sh.absellipse(0,0,rx,ry,0,Math.PI*2,false,0);return sh;},V=(x,y,z)=>new THREE.Vector3(x,y,z),sA=Math.sin(ang);   // CX・CY：エンドキャップの断面の半径
 const capRel=sg=>{const os=V(0,-sg*sA,sg*cA),at=(t,x)=>os.clone().multiplyScalar(t).add(V(x,0,0));   // 笠木の端（原点）からの相対の点：笠木の向きのまままっすぐ延び（t）、先で壁へ曲がる（x）。sg：1＝南の端（下り）、−1＝北の端（上り）
  return [at(-0.025,0),at(0.006,0),at(0.022,0.012),at(0.034,0.038),at(0.04,W-0.002-xc)];},EXT=0.04*cA+CX;   // EXT：笠木の端からエンドキャップの外側の端までの水平の距離
 const zA=Z1-EXT,zB=zTop+EXT;   // 笠木の両端
 {const Lh=(zA-zB)/cA,g=new THREE.ExtrudeGeometry(el(RX,RY),{depth:Lh,bevelEnabled:false,curveSegments:24});g.translate(0,0,-Lh/2);const m=new THREE.Mesh(g,railWood);m.position.set(xc,yc((zA+zB)/2),(zA+zB)/2);m.rotation.x=ang;s.add(m);}   // 笠木（木）
 [[zA,1],[zB,-1]].forEach(([z,sg])=>{const E=V(xc,yc(z),z),cur=new THREE.CatmullRomCurve3(capRel(sg).map(p=>p.add(E))),NR=40,NM=24,pos=[],idx=[];   // エンドキャップ：曲線にそって楕円の断面を掃引
  for(let i=0;i<=NR;i++){const p=cur.getPointAt(i/NR),T=cur.getTangentAt(i/NR),Nn=V(0,1,0).addScaledVector(T,-T.y).normalize(),B=T.clone().cross(Nn);for(let j=0;j<NM;j++){const a=j/NM*Math.PI*2;pos.push(p.x+B.x*CX*Math.cos(a)+Nn.x*CY*Math.sin(a),p.y+B.y*CX*Math.cos(a)+Nn.y*CY*Math.sin(a),p.z+B.z*CX*Math.cos(a)+Nn.z*CY*Math.sin(a));}}
  for(let i=0;i<NR;i++)for(let j=0;j<NM;j++){const a=i*NM+j,b=i*NM+(j+1)%NM,c=a+NM,d=b+NM;idx.push(a,c,b,b,c,d);}
  [0,NR].forEach((i,k)=>{const p=cur.getPointAt(i/NR),ci=pos.length/3;pos.push(p.x,p.y,p.z);for(let j=0;j<NM;j++){const a=i*NM+j,b=i*NM+(j+1)%NM;k?idx.push(ci,a,b):idx.push(ci,b,a);}});   // 両端のふた
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();s.add(new THREE.Mesh(g,L(steel)));});
 [1,2,3].forEach(k=>{const z=zA+(zB-zA)*k/4,yr=yc(z)-RY/cA,BH=0.058,BZ=0.022;   // ブラケット（黒、写真から）：yr＝笠木の下端の高さ。壁から笠木の下までひと続きのがっしりした塊（側面の形を押し出し、幅22）
  const sh=new THREE.Shape();sh.moveTo(W,yr-BH);sh.lineTo(W,yr-0.012);sh.quadraticCurveTo(W-0.035,yr-0.012,xc+0.012,yr);sh.lineTo(xc-0.012,yr);sh.lineTo(xc-0.012,yr-0.008);sh.quadraticCurveTo(xc-0.006,yr-BH,W-0.014,yr-BH);sh.lineTo(W,yr-BH);   // 側面：壁に付く高さ46の面から、上の縁はなめらかに上がって笠木の下の受け（幅24）へ、下の縁は受けの前から壁の下端へ大きく回る
  const g=new THREE.ExtrudeGeometry(sh,{depth:BZ,bevelEnabled:true,bevelThickness:0.001,bevelSize:0.001,bevelSegments:2,curveSegments:16});g.translate(0,0,-BZ/2);
  const pa=g.attributes.position;for(let j=0;j<pa.count;j++){const f=Math.min(1,Math.max(0,(pa.getY(j)-(yr-BH))/BH));pa.setY(j,pa.getY(j)-pa.getZ(j)*SL*f);}g.computeVertexNormals();   // 上ほど笠木の傾きに合わせてずらす（受けの面が笠木の下面に沿う。壁の下端は水平のまま）
  const m=new THREE.Mesh(g,L(steel));m.position.z=z;s.add(m);});}
// ロボット掃除機 roborock Qrevo Curv 2 Flow：ステーション W450×D450×H450、本体 φ353×H119（製品の寸法図から）。階段の下、背を東の壁から120あけ、正面をテレビの方（西）へ向ける。本体はステーションに収まった状態（ユーザーの指定）
// 南北：階段に余裕を持たせる（ユーザーの指定）。東のササラ桁（x 4.60〜4.68）の下端がステーションの上面（450）より約10cm上になる南の端 z=5.455、中心 z=5.23
// ドックの形は写真から：全体はドーム状で、くびれは無い（上へ行くほど細く、下の幅が上の幅を下回らない。ユーザーの指定）。外形は寸法図の W450×D450×H450（いちばん下で450角、高さ450）
// 下の灰色の台（高さ150、全体の約1/3）は床へ向かってわずかに広がり、前は床へ向かって前へ反り出す（すくい形）。前の口の両側は台の丸い前の角、口の上の角は丸い。床に乗り入れの板（口の前まで）。上の白い本体は台の上の外形から続けて細くなり、肩を大きく丸める
{const g=new THREE.Group();g.position.set(W-0.12-0.225,0,5.23);g.rotation.y=-Math.PI/2;s.add(g);   // ローカル：+z＝前（西）、x＝幅
 const rbW=P({color:0xf3f3f1,specular:0x333333,shininess:30}),rbG=P({color:0xa6a7a8,specular:0x1a1a1a,shininess:12}),rbG2=P({color:0xa6a7a8,specular:0x1a1a1a,shininess:12,side:THREE.DoubleSide}),rbD=P({color:0x9a9b9c,specular:0x111111,shininess:8});
 const NS=3,HO=0.128,HB=0.15,TW=0.015,XO=0.182;   // NS：上から見た角の丸み（超楕円の指数）、HO：口の高さ、HB：灰色の台の高さ、TW：台の壁の厚さ、XO：口の幅の半分
 const se=(t,a,b,cz)=>{const c=Math.cos(t),si=Math.sin(t);return [a*Math.sign(c)*Math.abs(c)**(2/NS),cz+b*Math.sign(si)*Math.abs(si)**(2/NS)];};   // 上から見た外形（角の丸い四角）の点：[x, z]。a・b：幅・奥行の半分、cz：中心
 const ring=y=>{const f=((HO-Math.max(0,Math.min(HO,y)))/HO)**2;return [0.222+0.003*f,0.1975+0.0275*f,-0.0275+0.0275*f];};   // 台の高さごとの外形 [幅の半分, 奥行の半分, 中心]（後ろの面は z＝−0.225 でまっすぐ）：上（口の高さ）で白い本体の下にそろい、床へ向かって横へ広がり前へ反り出す（後ろの面はまっすぐ）
 const xo=y=>y<=0.1?XO:XO-(0.028-Math.sqrt(Math.max(0,0.028**2-(y-0.1)**2)));   // 口の幅の半分：本体の上面（97）より上（100〜128）で上の角を半径28で丸める（写真から）
 const mesh=(pos,idx,m)=>{const ge=new THREE.BufferGeometry();ge.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));ge.setIndex(idx);ge.computeVertexNormals();g.add(new THREE.Mesh(ge,m));};
 const loft=(R,closed,flip,m,top)=>{const n=R[0].length,pos=[],idx=[];R.forEach(r=>r.forEach(p=>pos.push(...p)));   // 輪を下から順に面でつなぐ（top：上の輪の中心でふたをする）
  for(let k=0;k+1<R.length;k++)for(let i=0;i<(closed?n:n-1);i++){const a=k*n+i,b=k*n+(i+1)%n,c=a+n,d=b+n;flip?idx.push(a,b,c,b,d,c):idx.push(a,c,b,b,c,d);}
  if(top){const t=pos.length/3,r=R[R.length-1];pos.push(r.reduce((s,p)=>s+p[0],0)/n,r[0][1],r.reduce((s,p)=>s+p[2],0)/n);for(let i=0;i<n;i++){const a=(R.length-1)*n+i,b=(R.length-1)*n+(i+1)%n;idx.push(a,t,b);}}
  mesh(pos,idx,m);};
 {const R=[],rs=[[HB,0.222,0.1975],[0.25,0.2205,0.196],[0.34,0.2175,0.193]];for(let k=1;k<=12;k++){const f=k/12*Math.PI/2,q=0.11*(1-Math.cos(f));rs.push([0.34+0.11*Math.sin(f),0.2175-q,0.193-q,-0.032]);}   // 白い本体：高さ・幅の半分・奥行の半分。台の上の外形から上へ少しずつ細くなり、肩は半径110で丸めて上は450（上は広めの丸い面）
  rs.forEach(([y,a,b,cz])=>R.push(Array.from({length:96},(_,i)=>{const [x,z]=se(-Math.PI+i/96*Math.PI*2,a,b,cz===undefined?-0.225+b:cz);return [x,y,z];})));loft(R,true,false,rbW,true);}   // まっすぐな所は後ろの面を台とそろえ（z＝−0.225）、肩は前後同じに丸める
 {const J=14,arcs=w=>{const O=[],I=[];for(let j=0;j<=J;j++){const y=0.008+(HO-0.008)*j/J,[a,b,cz]=ring(HO*j/J);[[a,b,O],[a-TW,b-TW,I]].forEach(([aa,bb,L])=>{const t0=Math.acos((xo(y)/aa)**(NS/2));L.push(Array.from({length:65},(_,i)=>{const [x,z]=se(-Math.PI-t0+(Math.PI+2*t0)*i/64,aa,bb,cz);return [x,y,z];}));});}return [O,I];},[O,I]=arcs();   // 台の壁：外の面・内の面（口の両端 x＝±XO で切る）。乗り入れの板の上（8mm）から立て、下の端の外形は板の外周（ring(0)）とそろえる
  loft(O,false,false,rbG);loft(I,false,true,rbG);
  [0,64].forEach(e=>{const K=8,pos=[],idx=[];for(let j=0;j<=J;j++){const o=O[j][e],n=I[j][e],sx=-Math.sign(o[0]),r=0.004;for(let k=0;k<=K;k++){const u=k/K*Math.PI,c=(1+Math.cos(u))/2;pos.push(n[0]+(o[0]-n[0])*c+sx*r*Math.sin(u),o[1],n[2]+(o[2]-n[2])*c);}
   if(j<J)for(let k=0;k<K;k++){const a=j*(K+1)+k,b=a+1,c=a+K+1,d=c+1;idx.push(a,b,c,b,d,c);}}mesh(pos,idx,rbG2);});   // 口の両端：外の面と内の面を、口の側へ4mmだけふくらませてつなぐ（角を少し丸める。両面）
  const [a,b,cz]=ring(HO),top=Array.from({length:96},(_,i)=>se(-Math.PI+i/96*Math.PI*2,a,b,cz));loft([top.map(([x,z])=>[x,HO,z]),top.map(([x,z])=>[x,HB,z])],true,false,rbG);   // 口の上の帯（白い本体の下の外形）
  const fl=new THREE.Shape(top.map(([x,z])=>new THREE.Vector2(x,z))),fg=new THREE.ShapeGeometry(fl);fg.rotateX(Math.PI/2);fg.translate(0,HO,0);g.add(new THREE.Mesh(fg,rbG));   // 口の天井（下向き）
  const [a0,b0,c0]=ring(0),tray=Array.from({length:96},(_,i)=>se(i/96*Math.PI*2,a0,b0,c0));const ts=new THREE.Shape(tray.map(([x,z])=>new THREE.Vector2(x,-z)));[-0.13,0.13].forEach(x=>{const h=new THREE.Path();h.moveTo(x-0.025,-0.168);h.lineTo(x+0.025,-0.168);h.lineTo(x+0.025,0.14);h.lineTo(x-0.025,0.14);h.closePath();ts.holes.push(h);const p=new THREE.Mesh(new THREE.PlaneGeometry(0.05,0.308),P({color:0x8a8b8c}));p.rotation.x=-Math.PI/2;p.position.set(x,0.003,0.014);g.add(p);});   // 車輪の通る2本の溝（深さ5mm、板の縁より内側で止める）
  const tg=new THREE.ExtrudeGeometry(ts,{depth:0.008,bevelEnabled:false});tg.rotateX(-Math.PI/2);g.add(new THREE.Mesh(tg,rbD));}   // 乗り入れの板（台の底の外形いっぱい、口の前まで。壁はこの上に乗る）
 lbox(g,0.1,0.002,0.008,0,0.4515,-0.011,0xd0d1d2);   // 上のふたの合わせ目
 const bz=-0.21+0.1765+0.005,cy=(r,h,y,z,m,x)=>{const c=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,64),m);c.position.set(x||0,y,z);g.add(c);return c;};   // bz：本体の中心（台の奥の内の面から5mm）
 cy(0.1765,0.082,0.015+0.041,bz,rbW);cy(0.174,0.006,0.012,bz,rbG);cy(0.1768,0.003,0.091,bz,P({color:0xdcdcda}));   // 本体（白）、下の縁（灰）、上のふたの合わせ目
 cy(0.042,0.022,0.097+0.011,bz+0.03,rbW);cy(0.0435,0.006,0.104,bz+0.03,P({color:0x8c8e90,specular:0x666666,shininess:60}));   // 上のレーザーセンサー（高さ119まで）と銀の帯（前の形に戻す。部品の面を重ねない）
 const fz=bz+0.1765;lbox(g,0.09,0.05,0.012,0,0.056,fz-0.003,P({color:0xe6e7e8}));lbox(g,0.05,0.022,0.004,0,0.063,fz+0.0045,0x26282a);[-0.012,0.012].forEach(x=>lbox(g,0.014,0.008,0.004,x,0.042,fz+0.0045,0x55585b));   // 前の表示の窓：明るい灰の台に黒い画面とボタン2つ
 lbox(g,0.016,0.02,0.01,-0.075,0.025,bz+Math.sqrt(0.1765**2-0.075**2)-0.002,0xe0912a);}   // 前の下の橙色の部品（写真から）

// キッチンの東の壁のパネル：アイカ工業 セラール セレント CFN10304ZD クランチコンクリート ダークグレー（柄は商品画像）。幅はキッチンの奥行（KZ0〜KZ1）、高さは幅木の上から下がり天井（2300）まで、厚さ1（幅木にはかぶせない）
{const img=new Image(),tx=new THREE.Texture(img);img.onload=()=>{tx.needsUpdate=true;draw();};img.src=KITCHEN_PANEL_JPG;
 const pz0=1.62,pz1=2.62,ph=2.3,pw=pz1-pz0,IW=ph/1.414;tx.repeat.set(pw/IW,(ph-0.06)/ph);tx.offset.set((1-pw/IW)/2,0.06/ph);   // 画像は縦横比1:1.414のまま高さに合わせ、中央を使う
 const BB=0.06,hh=ph-BB,pm=new THREE.Mesh(new THREE.BoxGeometry(0.001,hh,pw),P({map:tx,specular:0x222222,shininess:18}));pm.position.set(W-0.0035,BB+hh/2,(pz0+pz1)/2);s.add(pm);}   // パネル（厚さ1、幅木の上から。柄は室内側の面に1枚。壁から3mm離す＝ちらつかない）
// キッチン：一条 グレイスキッチン ナイトストーン KG19-27WDR（天板は黒のみかげ調。天板以外の面＝扉・引出し・側板・台輪・本体はすべて同じナイトストーンの石目調 nsSide）
// 調理側は引出し、ダイニング側は両端に引出し＋中央がカウンター（足元が空いている）
const nsTop=tmat(nsTopC,{specular:0x3a3a3a,shininess:45});texR(nsTop,4,2);
const hdl=0x1e1e1e;
// ナイトストーンの石目調（キッチン・カップボードの天板以外のすべての面）：チャコールの地に、ゆるいムラと、まばらな明るい粒・暗い粒（0.5m四方で繰り返す）
const nsSideC=cv((x,N)=>{const hs=(a,b)=>{let h=Math.imul(a|0,374761393)+Math.imul(b|0,668265263)|0;h=Math.imul(h^h>>>13,1274126177);return((h^h>>>16)>>>0)/4294967296;},
 vn=(a,b,p)=>{const xi=Math.floor(a),yi=Math.floor(b),fx=a-xi,fy=b-yi,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy),m=(c,d)=>hs(((c%p)+p)%p,((d%p)+p)%p),A=m(xi,yi),B=m(xi+1,yi),C=m(xi,yi+1),D=m(xi+1,yi+1);return A+(B-A)*sx+(C-A)*sy+(A-B-C+D)*sx*sy;},
 im=x.createImageData(N,N),d=im.data;for(let y=0;y<N;y++)for(let i=0;i<N;i++){const u=i/N,v=y/N,m=(vn(u*5,v*5,5)-0.5)*7+(vn(u*23,v*23,23)-0.5)*5,r=hs(i,y),k=r>0.992?26+12*hs(y,i):r>0.982?13:r<0.012?-11:0,g=47+m+k+(hs(i+7,y+3)-0.5)*4,o=(y*N+i)*4;d[o]=clamp8(g);d[o+1]=clamp8(g);d[o+2]=clamp8(g+1.5);d[o+3]=255;}x.putImageData(im,0,0);},512,512);   // 周期つきのムラ＋まばらな粒
const nsSide=tmat(nsSideC,{specular:0x1a1a1a,shininess:12});
const NS=(w,h,d,x,y,z)=>wbox(w,h,d,x,y,z,nsSide,0.5);   // ナイトストーンの面の箱（柄の大きさは面の寸法に合わせる）
function drawer(x0,x1,y0,y1,z,face){const xc=(x0+x1)/2;NS(x1-x0-0.004,y1-y0-0.004,0.02,xc,(y0+y1)/2,z+face*0.01);box((x1-x0)*0.55,0.012,0.018,xc,y1-0.045,z+face*0.03,hdl);}   // 引出しの前板（周りに4mmの目地）と取っ手
const KX0=2.18,KX1=W-0.005,KZ0=1.62,KZ1=2.62,KZM=2.22,CH=0.82,TK=0.08,SP=0.02,TR=0.05;   // SP：西の側板の厚さ、TR：台輪の引っ込み
const rows=[[TK,0.33],[0.33,0.58],[0.58,CH]];
// 本体の作り：西の側板（床から天板の下まで、前板の面まで通す）＋調理側の本体＋ダイニング側の両端の本体＋引っ込めた台輪。中央の足元は空き、奥は調理側の本体の背面がそのまま見える
NS(SP,CH,KZ1-KZ0+0.04,KX0-SP/2,CH/2,(KZ0+KZ1)/2);   // 西の側板（南北は前板の面まで）
NS(KX1-KX0,CH-TK,KZM-KZ0,(KX0+KX1)/2,TK+(CH-TK)/2,(KZ0+KZM)/2);NS(KX1-KX0,TK,KZM-KZ0-TR,(KX0+KX1)/2,TK/2,(KZ0+TR+KZM)/2);   // 調理側の本体と台輪
[[2.20,3.08],[3.08,3.98],[3.98,KX1]].forEach(([a,b])=>rows.forEach(([y0,y1])=>{if(a===3.98&&y0===0.58)return;drawer(a,b,y0,y1,KZ0,-1);}));   // 調理側の引出し（コンロ下の最上段はグリル）
[[KX0,KX0+0.75],[KX1-0.75,KX1]].forEach(([a,b])=>{NS(b-a,CH-TK,KZ1-KZM,(a+b)/2,TK+(CH-TK)/2,(KZM+KZ1)/2);NS(b-a,TK,KZ1-KZM-TR,(a+b)/2,TK/2,(KZM+KZ1-TR)/2);rows.forEach(([y0,y1])=>drawer(a+(a===KX0?0:0.002),b,y0,y1,KZ1,1));});   // ダイニング側の両端の本体・台輪・引出し（左右同じ幅）
// 天板
box(KX1-KX0+0.025,0.03,KZ1-KZ0+0.03,(KX0-0.025+KX1)/2,CH+0.015,(KZ0+KZ1)/2,nsTop);
// シンク（左端＝西側）と水栓
box(0.72,0.004,0.42,2.69,CH+0.0315,1.93,0x1f1f20);
// 水栓：マットブラックのグースネック（引出しシャワー・センサー付き）。高さ396・吐水口までの出幅245・吐水口高185、レバーは横
{const fx=2.69,fy=CH+0.03,fz=2.2,fm=P({color:0x1a1a1a,specular:0x222222,shininess:18});
 const cy=(rt,rb,h,y,dx,dz)=>{const c=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,24),fm);c.position.set(fx+(dx||0),fy+y,fz+(dz||0));s.add(c);return c;};
 cy(0.03,0.03,0.008,0.004);                                   // 座
 cy(0.017,0.026,0.25,0.008+0.125);                            // 本体（下が太い）
 const neck=new THREE.CatmullRomCurve3([[0,0.25,0],[0,0.31,-0.005],[-0.0,0.37,-0.05],[0,0.396,-0.12],[0,0.37,-0.2],[0,0.32,-0.24],[0,0.295,-0.245]].map(([x,y,z])=>new THREE.Vector3(fx+x,fy+y,fz+z)));
 s.add(new THREE.Mesh(new THREE.TubeGeometry(neck,48,0.0125,14,false),fm));
 cy(0.0165,0.0165,0.1,0.245,0,-0.245);                        // 引出しシャワーヘッド（吐水口高185）
 cy(0.015,0.0165,0.012,0.191,0,-0.245);
 {const sw=new THREE.Mesh(new THREE.BoxGeometry(0.012,0.03,0.006),L(0x2c2c2c));sw.position.set(fx,fy+0.26,fz-0.245-0.016);s.add(sw);}   // シャワー切替ボタン
 {const se=new THREE.Mesh(new THREE.CylinderGeometry(0.006,0.006,0.004,16),P({color:0x050505,specular:0x777777,shininess:90}));se.rotation.x=Math.PI/2;se.position.set(fx,fy+0.22,fz-0.019);s.add(se);}   // センサー窓
 {const hub=new THREE.Mesh(new THREE.CylinderGeometry(0.019,0.019,0.045,20),fm);hub.rotation.z=Math.PI/2;hub.position.set(fx+0.04,fy+0.083,fz);s.add(hub);}   // レバーの付け根（東側）
 cy(0.005,0.005,0.09,0.083+0.045,0.058,0);}                   // レバー
// IHクッキングヒーター（パナソニック、W748×D516、2口＋奥中央の小径）。キャビネット右端（東）の上、手前が北
// 調理する人から見て左＝東。平面図の寸法：左右の口の中心は端から222・間隔304（φ190）、奥の口φ140は中央・後端から245、手前の口は前端から201
{const CX=4.43,ZF=1.665,Wc=0.748,Dc=0.516,top=CH+0.03,xe=CX+Wc/2;
 const glass=P({color:0x07070a,specular:0x2e2e30,shininess:60}),sus=P({color:0xa9abad,specular:0xdddddd,shininess:70});
 box(Wc,0.006,Dc,CX,top+0.003,ZF+Dc/2,sus);                                       // ステンレスの枠
 box(Wc-0.016,0.003,Dc-0.1075-0.012,CX,top+0.0075,ZF+0.006+(Dc-0.1075-0.012)/2,glass);   // ガラストップ
 box(Wc-0.016,0.004,0.1075-0.012,CX,top+0.008,ZF+Dc-0.006-(0.1075-0.012)/2,sus);  // 奥の吸排気口カバー
 [-1,1].forEach(i=>box(0.2,0.002,0.045,CX+i*0.14,top+0.0105,ZF+Dc-0.055,0x2a2b2d)); // 吸排気のスリット
 box(0.03,0.002,0.03,CX,top+0.0105,ZF+Dc-0.055,0x2a2b2d);
 const rg=(x,z,r)=>{const m=new THREE.Mesh(new THREE.RingGeometry(r-0.004,r,48),decalMat(P({color:0x4a4a4e})));m.rotation.x=-Math.PI/2;m.position.set(x,top+0.0092,z);s.add(m);};
 rg(xe-0.222,ZF+0.201,0.095);rg(xe-0.222-0.304,ZF+0.201,0.095);rg(CX,ZF+Dc-0.245,0.07);
 const ctl=new THREE.MeshBasicMaterial({color:0x5c6470});
 [-0.2,0,0.2].forEach(dx=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(0.12,0.006),decalMat(ctl.clone()));m.rotation.x=-Math.PI/2;m.position.set(CX+dx,top+0.0092,ZF+0.04);s.add(m);});   // 前の操作表示
 const ln=new THREE.Mesh(new THREE.PlaneGeometry(0.48,0.008),decalMat(P({color:0x3a3a3e})));ln.rotation.x=-Math.PI/2;ln.position.set(CX,top+0.0092,ZF+0.08);s.add(ln);
 // 前面：最上段にグリル（幅594。左＝東がグリル扉、右＝西が操作部）。周りは引出しと同じナイトストーン
 const zf=KZ0,y0=0.58,y1=CH;
 NS(KX1-3.98-0.004,y1-y0-0.004,0.02,(3.98+KX1)/2,(y0+y1)/2,zf-0.01);
 const gx0=CX-0.297,gx1=CX+0.297,gy1=CH-0.012,gy0=gy1-0.16,gd=gx1-0.37;
 const gg=P({color:0x0b0b0d,specular:0x666666,shininess:90});
 box(gx1-gd-0.004,gy1-gy0,0.012,(gd+gx1)/2+0.002,(gy0+gy1)/2,zf-0.026,gg);                  // グリル扉
 box(0.25,0.06,0.002,(gd+gx1)/2+0.002,gy0+0.075,zf-0.033,0x2a2218);                          // 窓
 box(0.25,0.004,0.002,(gd+gx1)/2+0.002,gy0+0.075,zf-0.0335,decalMat(P({color:0x6b5636})));
 box(0.29,0.01,0.012,(gd+gx1)/2+0.002,gy1-0.018,zf-0.038,P({color:0x8e9093,specular:0xbbbbbb,shininess:60}));   // 取っ手
 box(gd-gx0-0.004,gy1-gy0,0.012,(gx0+gd)/2-0.002,(gy0+gy1)/2,zf-0.026,0x121214);           // 操作部
 box(0.09,0.022,0.002,(gx0+gd)/2,gy1-0.05,zf-0.033,0x34404c);                               // 表示
 [-2,-1,0,1,2].forEach(k=>box(0.01,0.006,0.002,(gx0+gd)/2+k*0.02,gy1-0.09,zf-0.033,0x55585c));
}
// レンジフード：アリアフィーナ SBARR-903 TBK（横壁取付・テクスチャーブラック、W900×D650、高さ700〜900）。東の壁に付くので左壁取付（左右反転）
// 下がり天井（2300）からの高さを最小の700とした
{const HX0=W-0.9,HX1=W,HZ0=1.59,HZ1=HZ0+0.65,yb=2.3-0.7,tk=0.075;
 const hm=P({color:0x18181a,specular:0x202020,shininess:10});
 const sh=new THREE.Shape();sh.moveTo(HZ1,0);sh.lineTo(HZ0,0);sh.lineTo(HZ0,0.025);sh.lineTo(HZ0+0.12,tk);sh.lineTo(HZ1,tk);sh.lineTo(HZ1,0);
 const g=new THREE.ExtrudeGeometry(sh,{depth:HX1-HX0,bevelEnabled:false});
 const cn=new THREE.Mesh(g,hm);cn.rotation.y=-Math.PI/2;cn.position.set(HX1,yb,0);s.add(cn);   // 断面（Z×高さ）を東の壁から西へ押し出す
 box(HX1-HX0-0.06,0.003,0.65-0.08,(HX0+HX1)/2,yb-0.0015,(HZ0+HZ1)/2+0.01,0x0f0f10);          // 下面の整流板
 box(0.3,0.004,0.025,(HX0+HX1)/2,yb-0.0035,HZ0+0.06,0x5a5a5c);                              // 手元灯
 box(0.12,0.004,0.004,(HX0+HX1)/2-0.02,yb+0.014,HZ0-0.002,0xd8d8d8);                        // 前面の表示灯
 [-0.14,-0.11,-0.08,0.06,0.09].forEach(dx=>box(0.012,0.006,0.003,(HX0+HX1)/2+dx,yb+0.014,HZ0-0.002,decalMat(P({color:0x3a3a3c}))));   // ボタン
 box(0.06,0.006,0.003,HX1-0.12,yb+0.014,HZ0-0.002,0x4a4a4c);                                 // ロゴ（東端側）
 const CW=0.36,CD=0.36,cz=HZ1-0.04-CD/2,ctop=2.3;
 box(CW,ctop-(yb+tk)-0.16,CD,HX1-CW/2,(yb+tk+ctop-0.16)/2,cz,hm);                           // 幕板（下）
 box(CW+0.01,0.16,CD+0.01,HX1-CW/2-0.005,ctop-0.08,cz,hm);}                                  // 幕板（上）
// A3：下がり天井のグレアレスダウンライト パナソニック SLD1035LLB1 ×2（電球色2700K・326lm・集光40度、枠はプラチナメタリック）。電気図面の位置。光の色は他の2700K（RML(P1)）と同じ
const kdlEm=new THREE.MeshBasicMaterial({color:0x6a665e});
const kdl=[2.75,3.53].map(x=>{const y=2.3,z=2.22;
 const ring=new THREE.Mesh(new THREE.CylinderGeometry(0.046,0.046,0.004,32),P({color:0xcdc6b6,specular:0x888888,shininess:60}));ring.position.set(x,y-0.002,z);s.add(ring);
 const hole=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,0.005,32),L(0x2a2826));hole.position.set(x,y-0.004,z);s.add(hole);
 const src=new THREE.Mesh(new THREE.CylinderGeometry(0.016,0.016,0.006,24),kdlEm);src.position.set(x,y-0.0055,z);s.add(src);   // 枠・穴・光源の下面は2.5mmずつずらす（ちらつかない）
 const sp=new THREE.SpotLight(0xffc68e,0,4,THREE.MathUtils.degToRad(24),0.55,1.2);sp.position.set(x,y-0.02,z);sp.target.position.set(x,0,z);s.add(sp);s.add(sp.target);return sp;});

// カップボード（CS19-B180DB、ナイトストーン）
NS(4.04-2.18,CH-TK,0.6,(2.18+4.04)/2,TK+(CH-TK)/2,0.30);NS(4.04-2.18,TK,0.6-TR,(2.18+4.04)/2,TK/2,(0.6-TR)/2);   // 本体と引っ込めた台輪（天板以外はすべてナイトストーン）
[[2.18,3.11],[3.11,4.04]].forEach(([a,b])=>[[TK,0.42],[0.42,0.62],[0.62,CH]].forEach(([y0,y1])=>drawer(a,b,y0,y1,0.60,1)));   // 横2列×3段（3段目は深め）
box(4.04-2.18,0.03,0.63,(2.18+4.04)/2,CH+0.015,0.315,nsTop);
// カップボード上の家電（すべて黒）：西からオーブンレンジ・電気ケトル・炊飯器
{const top=CH+0.03,bm=P({color:0x1b1b1b,specular:0x222222,shininess:20});
 // 炊飯器：象印 NW-YA10（W250×D365×H205、黒）。カップボードの右端（東端からの距離はオーブンレンジの西端からの距離と同じ）、奥は壁から4cm、操作部は手前（南）
 {const RG=2.53-0.498/2-2.18,RS=1.05,g=new THREE.Group();g.scale.setScalar(RS);g.position.set(4.04-RG-0.125*RS,top,0.04+0.1825*RS);s.add(g);   // RS：実物より5%大きく
  const A0=0.125,B0=0.1825,R0=0.06,ZC=0.072,TS=0.3,HT=0.205,FR=0.03,glo=P({color:0x161616,specular:0x333333,shininess:36});   // ZC：上面から操作パネルへ折れる位置、TS：操作パネルの傾き
  const rr=(a,b,r)=>{const p=[],c=[[a-r,b-r],[-(a-r),b-r],[-(a-r),-(b-r)],[a-r,-(b-r)]],ne=[6,12,6,12];   // 角丸長方形の周（辺も分割して、傾きの変形が側面にも効くように）
   for(let i=0;i<4;i++){const [cx,cz]=c[i],[nx,nz]=c[(i+1)%4],t1=(i+1)*Math.PI/2;for(let k=0;k<=8;k++){const t=(i+k/8)*Math.PI/2;p.push([cx+r*Math.cos(t),cz+r*Math.sin(t)]);}
    const e0=[cx+r*Math.cos(t1),cz+r*Math.sin(t1)],e1=[nx+r*Math.cos(t1),nz+r*Math.sin(t1)];for(let j=1;j<ne[i];j++){const f=j/ne[i];p.push([e0[0]+(e1[0]-e0[0])*f,e0[1]+(e1[1]-e0[1])*f]);}}return p;};
  const loft=(rings,mat,ox,oz,def)=>{const pos=[],idx=[];let N=0;rings.forEach(([y,a,b,r])=>{const p=rr(a,b,r);N=p.length;p.forEach(([x,z])=>{let yy=y;if(def)yy=def(x+ox,z+oz,y);pos.push(x+ox,yy,z+oz);});});   // 角丸長方形の輪を下から上へ積む
   for(let l=0;l<rings.length-1;l++)for(let k=0;k<N;k++){const a=l*N+k,b=l*N+(k+1)%N,c=a+N,d=b+N;idx.push(a,c,b,b,c,d);}
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();const m=new THREE.Mesh(geo,mat);g.add(m);return m;};
  const ring=(y,d,r)=>[y,A0-d,B0-d,(r===undefined?R0:r)-d];
  const cap=(rg,top)=>{const o=[];[0.02,0.12,0.24,0.36,0.48,0.6,0.7,0.8,0.88,0.95].forEach(k=>o.push([rg[0],rg[1]*k,rg[2]*k,rg[3]*k]));return top?o.reverse():o;};   // 上下のふた（同心の輪）
  const slope=(x,z,y)=>y-Math.max(0,z-ZC)*TS*Math.min(1,Math.max(0,(y-0.13)/(HT-0.13)));   // 手前の操作パネルを下げる
  const r0=ring(0.004,0.016);loft([...cap(r0),r0,ring(0.012,0.009),ring(0.03,0.004),ring(0.06,0.0015),ring(0.112,0)],bm,0,0);   // 本体の下側（下ですぼまる）
  loft([ring(0.112,0.0025),ring(0.118,0.0025)],L(0x0a0a0a),0,0);   // 本体とフタまわりの継ぎ目
  {const up=[ring(0.118,0),ring(0.15,0),ring(HT-FR,0)];for(let k=1;k<=6;k++){const t=k/6*Math.PI/2;up.push(ring(HT-FR+FR*Math.sin(t),FR*(1-Math.cos(t))));}loft([...up,...cap(up[up.length-1],true)],glo,0,0,slope);}   // フタまわり（上の角を丸める）
  const knob=(cx,cz,a,b,r,y0,y1,f,mat)=>{const rg=[[y0,a,b,r],[y1-f,a,b,r]];for(let k=1;k<=4;k++){const t=k/4*Math.PI/2,d=f*(1-Math.cos(t));rg.push([y1-f+f*Math.sin(t),a-d,b-d,Math.max(0.002,r-d)]);}const t=rg[rg.length-1];loft([...rg,...cap(t,true)],mat,cx,cz);};
  knob(0,-0.158,0.08,0.022,0.018,0.17,HT+0.004,0.008,glo);       // 後ろのヒンジカバー
  knob(0,-0.112,0.038,0.024,0.012,HT-0.005,HT+0.004,0.003,glo);  // 蒸気口
  knob(0,0.02,0.036,0.021,0.012,HT-0.005,HT+0.0025,0.002,glo);   // フタの開閉ボタン
  [-0.016,-0.011,-0.006,-0.001,0.004].forEach(dz=>{const b=box(0.052,0.001,0.0025,0,HT+0.0042,-0.112+dz,decalMat(P({color:0x050505})));s.remove(b);g.add(b);});   // 蒸気口のスリット
  [[0.19,0.0006,0.0015,0,HT+0.0003,ZC,0x080808],[0.05,0.0005,0.006,0,HT+0.0003,-0.072,0x8c8c8c]].forEach(([w,h,d,x,y,z,c])=>{const b=box(w,h,d,x,y,z,decalMat(P({color:c})));s.remove(b);g.add(b);});   // フタと操作パネルの境目、ロゴ（ZOJIRUSHI）
  const decal=(w,h,ppm,draw)=>{const t=tex(cv((x,W,H)=>{x.scale(ppm/1000,ppm/1000);draw(x);},Math.round(w*ppm),Math.round(h*ppm)));t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;
   return new THREE.Mesh(new THREE.PlaneGeometry(w,h),P({map:t,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,specular:0x222222,shininess:30}));};   // 印刷・表示部（mm単位で描く）
  const rrect=(x,l,t,w,h,r)=>{x.beginPath();x.moveTo(l+r,t);x.arcTo(l+w,t,l+w,t+h,r);x.arcTo(l+w,t+h,l,t+h,r);x.arcTo(l,t+h,l,t,r);x.arcTo(l,t,l+w,t,r);x.closePath();};
  {const z0=ZC+0.004,z1=0.148,al=Math.atan(TS),Wd=0.186,Ls=(z1-z0)/Math.cos(al),zc=(z0+z1)/2;   // 操作パネル（傾いた面に貼る。画像の上が奥）
   const m=decal(Wd,Ls,2500,x=>{const X=v=>v+93;   // デフォルメ：文字は描かず、液晶・2つの大きなキー・小さなボタンだけ
    rrect(x,X(-40),10,82,34,3);x.fillStyle='#e0823c';x.fill();rrect(x,X(14),24,24,14,1.5);x.fillStyle='#4a2410';x.fill();   // 液晶と時刻表示
    [[-70,'#b8202c'],[70,'#e07a1f']].forEach(([cx,rc])=>{rrect(x,X(cx)-14,16,28,26,7);x.fillStyle=rc;x.fill();});   // 保温・炊飯キー
    [-38,-17,13].forEach(cx=>{rrect(x,X(cx)-7,49,14,10,2);x.fillStyle='#2e2e2e';x.fill();});});   // 小さなボタン
   m.rotation.x=-Math.PI/2+al;m.position.set(0,HT-(zc-ZC)*TS+0.0007*Math.cos(al),zc+0.0007*Math.sin(al));g.add(m);}
  {const m=decal(0.03,0.042,1000,x=>{x.fillStyle='#bdbdbd';x.fillRect(3,2,24,6);x.strokeStyle='#bdbdbd';x.lineWidth=1;x.strokeRect(2,13,26,27);});   // 圧力IHの警告表示（デフォルメ）
   m.rotation.x=-Math.PI/2;m.position.set(0.074,HT+0.0004,-0.118);g.add(m);}}
 // 電気ケトル：T-fal ジャスティン ブラック1.2L（W250×D160×H230）を7%拡大。炊飯器の左隣（4cm空ける）、注ぎ口は西・取っ手は東、水量窓は両側面
 // 形：上ほどすぼまる本体（側面はわずかにふくらむ）、肩を丸めてほぼ平らなフタへ。上部の西側が前へ伸びて先のとがった注ぎ口。取っ手は上端が水平に出てからグリップで下へ回り込み、下端は本体の手前で終わる（つながらない。断面は楕円で下ほど細い）
 {const KS=1.07,KHX=0.127,KX=4.04-(2.53-0.498/2-2.18)-0.25*1.05-0.04-KHX*KS,KZ=0.25,y0=top,g=new THREE.Group();g.position.set(KX,y0,KZ);g.scale.setScalar(KS);s.add(g);   // KHX：取っ手の東端（中心から）
  const km=P({color:0xffffff,vertexColors:true,specular:0x1c1c1c,shininess:16}),blk=P({color:0x141414,specular:0x1c1c1c,shininess:16});
  const NS=128,yb=0.022,yt=0.212,RS=0.012,rb=0.087,ZR=0.91,C0=[0.075,0.075,0.075],CW=[0.5,0.5,0.5],CT=[0.82,0.82,0.82],CL=[0.03,0.03,0.03];   // yb：本体の下端（電源プレートの上）、yt：肩の始まり、RS：肩の丸み、ZR：奥行き方向の比率
  const rad=t=>rb*(1-0.22*t)+0.004*Math.sin(Math.PI*t)-0.007*Math.pow(Math.max(0,1-t/0.07),2);   // 本体の半径（下の角は小さく丸める）
  const rings=[];const NB=96;for(let l=0;l<=NB;l++){const t=l/NB;rings.push({y:yb+(yt-yb)*t,r:rad(t),t,h:t});}
  const rt=rad(1);for(let k=1;k<=6;k++){const th=k/6*Math.PI/2;rings.push({y:yt+RS*Math.sin(th),r:rt-RS*(1-Math.cos(th)),t:1,h:1});}   // 肩
  const rc=rt-RS;[0.94,0.88,0.86,0.84,0.7,0.5,0.3,0.12,0].forEach((u,k)=>rings.push({y:yt+RS+0.004*(1-u*u),r:rc*u+0.0001,t:1,h:1,lid:k===2||k===3}));   // フタ（わずかに盛り上がる。k=2・3はフタの継ぎ目）
  const pos=[],col=[],idx=[];
  rings.forEach(R=>{const sp=0.6*Math.pow(Math.max(0,(R.h-0.55)/0.45),1.6);   // 注ぎ口：上へ行くほど西側を前へ伸ばす
   for(let k=0;k<NS;k++){const th=k/NS*Math.PI*2,c=Math.cos(th),sn=Math.sin(th),w=Math.pow(Math.max(0,-c),8),f=1+sp*w,y=R.y+0.012*w*Math.pow(R.h,4)*(R.lid?1:Math.min(1,R.r/rc));
    pos.push(R.r*c*f,y,R.r*sn*ZR*(1-0.35*sp*w));
    const a=Math.abs(Math.atan2(sn,c))*180/Math.PI,win=a>36&&a<60&&R.t>0.2&&R.t<0.84&&R.h<1,tick=win&&a>42&&a<48&&[0.32,0.46,0.6,0.74].some(v=>Math.abs(R.t-v)<0.005);
    col.push(...(R.lid?CL:tick?CT:win?CW:C0));}});
  for(let l=0;l<rings.length-1;l++)for(let k=0;k<NS;k++){const a=l*NS+k,b=l*NS+(k+1)%NS,c=a+NS,d=b+NS;idx.push(a,c,b,b,c,d);}
  {const gm=new THREE.BufferGeometry();gm.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));gm.setAttribute('color',new THREE.Float32BufferAttribute(col,3));gm.setIndex(idx);gm.computeVertexNormals();g.add(new THREE.Mesh(gm,km));}
  {const b=new THREE.Mesh(new THREE.CylinderGeometry(0.083,0.085,yb-0.002,64),blk);b.scale.z=ZR;b.position.set(0,yb/2-0.001,0);g.add(b);}   // 電源プレート（本体より少し小さく、継ぎ目が見える）
  // 取っ手：曲線に沿って楕円の断面を流す（a：曲線の外向きの半径、bz：奥行き方向の半径。上が太く下ほど細い）
  {const cp=new THREE.CatmullRomCurve3([[0.045,0.214],[0.08,0.216],[0.103,0.207],[0.114,0.184],[0.115,0.157],[0.112,0.132],[0.108,0.11],[0.105,0.094]].map(([x,y])=>new THREE.Vector3(x,y,0)));   // 写真の側面から読んだ中心線
   const NU=60,NV=20,hp=[],hi=[],ar=q=>0.012-0.004*q,br=q=>0.014-0.0035*q;for(let u=0;u<=NU;u++){const q=u/NU,p=cp.getPointAt(q),tg=cp.getTangentAt(q),nx=-tg.y,ny=tg.x,a=ar(q),bz=br(q);
    for(let v=0;v<NV;v++){const ph=v/NV*Math.PI*2;hp.push(p.x+nx*a*Math.cos(ph),p.y+ny*a*Math.cos(ph),bz*Math.sin(ph));}}
   for(let u=0;u<NU;u++)for(let v=0;v<NV;v++){const a=u*NV+v,b=u*NV+(v+1)%NV,c=a+NV,d=b+NV;hi.push(a,b,c,b,d,c);}
   const hg=new THREE.BufferGeometry();hg.setAttribute('position',new THREE.Float32BufferAttribute(hp,3));hg.setIndex(hi);hg.computeVertexNormals();g.add(new THREE.Mesh(hg,blk));
   const pe=cp.getPointAt(1),tp=new THREE.Mesh(new THREE.SphereGeometry(1,20,12),blk);tp.scale.set(ar(1),ar(1),br(1));tp.position.copy(pe);g.add(tp);}   // 下端は丸く閉じる（本体とはすき間をあける）
  lbox(g,0.026,0.004,0.02,0.074,0.228,0,0x262626);   // フタの開閉ボタン（取っ手の付け根の上面）
  lbox(g,0.016,0.008,0.016,rad((0.078-yb)/(yt-yb))+0.004,0.078,0,0x0d0d0d);       // スイッチ（取っ手の下端の下、本体から出るレバー）
  [[0.02,0.0045,0.045],[0.015,0.0022,0.037]].forEach(([w,h,y])=>lbox(g,w,h,0.001,-0.004,y,rad((y-yb)/(yt-yb))*ZR+0.0006,0x777777));}   // 正面のロゴ（デフォルメ：T-fal・Justine）
 // オーブンレンジ：東芝 ER-D5000C（W498×H399×D399、ハンドル込み奥行446）。カップボード西端から約10cm空けて設置
 {const x=2.53,W=0.498,H=0.399,Dp=0.399,z0=0.04,fz=z0+Dp,y0=top+0.015,gl=P({color:0x08080a,specular:0x666666,shininess:90});
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([i,k])=>box(0.06,0.015,0.04,x+i*(W/2-0.06),top+0.0075,z0+Dp/2+k*(Dp/2-0.04),0x111111));
  box(W,H-0.015,Dp,x,y0+(H-0.015)/2,z0+Dp/2,bm);
  box(W-0.008,H-0.09,0.006,x,y0+0.06+(H-0.09)/2,fz+0.003,gl);                       // 前面ガラス
  box(W*0.66,H*0.5,0.001,x-W*0.12,y0+0.06+(H-0.09)*0.52,fz+0.0085,0x232327);       // 庫内窓（ガラスの面から2mm離す）
  box(0.065,0.07,0.002,x+W*0.355,y0+H*0.66,fz+0.0065,0x3a3e44);                    // 表示部
  [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]].forEach(([c,r])=>box(0.02,0.011,0.002,x+W*0.355+(c-1)*0.024,y0+H*0.48-r*0.02,fz+0.0065,0x3c3c3c));
  {const st=new THREE.Mesh(new THREE.CylinderGeometry(0.022,0.022,0.01,24),P({color:0x1e1e1e,specular:0x555555,shininess:60}));st.rotation.x=Math.PI/2;st.position.set(x+W*0.355,y0+H*0.3,fz+0.008);s.add(st);}
  box(0.016,0.016,0.004,x+W*0.355,y0+H*0.18,fz+0.007,0x2a2a2a);
  box(W-0.01,0.022,0.047,x,y0+H-0.03,fz+0.0235,P({color:0x2c2c2e,specular:0x555555,shininess:70}));   // 上部ハンドル
  box(W-0.03,0.045,0.008,x,y0+0.03,fz+0.004,0x151515);                               // 下部パネル
  [-1,1].forEach(i=>box(0.15,0.008,0.07,x+i*0.12,y0+H-0.015+0.004,z0+0.1,0x2b2f38));} // 上面の排気口
}

// うす壁と自在棚（4枚）
wbox(0.06,H1,0.62,4.07,H1/2,0.31,plasterMat,1);
[0.45,0.85,1.25,1.65].forEach(y=>box(W-4.10-0.004,0.02,0.45,(4.10+W)/2,y,0.23,FIT));
// 冷蔵庫：東芝 3ドア（W600×H1757×D665、ハンドル込み677）。サテンベージュ系のガラス扉、上から冷蔵・野菜・冷凍。押入とカップボードの間
{const FX=1.77,FW=0.6,FD=0.665,FH=1.757,z0=0.02,fz=z0+FD;
 const body=P({color:0xd6cab4,specular:0x222222,shininess:20}),gls=P({color:0xe0d1b6,specular:0x303030,shininess:60}),trim=P({color:0xb39466,specular:0x777777,shininess:70});
 box(FW,FH,FD-0.025,FX,FH/2,z0+(FD-0.025)/2,body);
 box(FW-0.02,0.045,0.02,FX,0.0225,fz-0.03,0xcfc2ab);                                   // 下の脚カバー
 const fd=(y0,y1)=>box(FW-0.004,y1-y0-0.006,0.025,FX,(y0+y1)/2,fz-0.0125,gls);
 fd(0.745,FH);fd(0.455,0.745);fd(0.05,0.455);                                            // 冷蔵室・野菜室・冷凍室
 [0.745,0.455].forEach(y=>box(FW-0.03,0.012,0.004,FX,y-0.012,fz+0.001,trim));            // 引出し上端の取っ手（シャンパン色）
 box(0.008,0.07,0.012,FX+FW/2-0.008,0.79,fz-0.008,trim);                                 // 冷蔵室の取っ手（右下）
 box(0.05,0.008,0.002,FX-FW/2+0.06,FH-0.05,fz+0.001,0x9a9080);}                          // ロゴ

// ダイニングテーブル（1500×850、キッチン西端に横付け）：天板TJ-10239K＋黒いスチールのロの字脚
const tblTop=tmat(tjC,{specular:0x222222,shininess:20});
const blk=0x1a1a1a;
const TX1=2.165,TX0=TX1-1.5,TZ0=1.695,TZ1=TZ0+0.85,TH=0.70,TT=0.025,LG=0.04;
box(1.5,TT,0.85,(TX0+TX1)/2,TH-TT/2,(TZ0+TZ1)/2,tblTop);
[TX0+0.07,TX1-0.07].forEach(x=>{
 [TZ0+0.06,TZ1-0.06].forEach(z=>box(LG,TH-TT,LG,x,(TH-TT)/2,z,blk));
 box(LG,LG,0.85-0.12+LG,x,LG/2,(TZ0+TZ1)/2,blk);
 box(LG,LG,0.85-0.12+LG,x,TH-TT-LG/2,(TZ0+TZ1)/2,blk);});
// 椅子4脚：テーブルに合わせて黒いスチール脚＋ダークグレーの座面・背もたれ。テーブルの下にしまった状態
const chairSeat=P({color:0x4a4846,specular:0x111111,shininess:10});
function chair(x,z,dir){ // dir=+1:南向きに座る（背もたれは北側）、-1:北向き
 const SW=0.43,SD=0.42,SH=0.44,t=0.02,bz=z-dir*(SD/2-0.015),fz=z+dir*(SD/2-0.03);
 box(SW,0.05,SD,x,SH-0.025,z,chairSeat);
 [-1,1].forEach(i=>{const xs=x+i*(SW/2-0.015);
  box(t,SH-0.05,t,xs,(SH-0.05)/2,fz,blk);
  box(t,0.86,t,xs,0.43,bz,blk);
  box(t,t,Math.abs(fz-bz)+t,xs,t/2,(fz+bz)/2,blk);
  box(t,t,Math.abs(fz-bz)+t,xs,SH-0.06,(fz+bz)/2,blk);});
 box(SW-0.014,0.2,0.025,x,0.72,bz,chairSeat);}   // 背板（左右の面は後ろ脚の外の面から2mm内側＝面をそろえない）
const chairs=[[TX0+0.375,TZ0+0.175,1],[TX0+1.125,TZ0+0.175,1],[TX0+0.375,TZ1-0.175,-1],[TX0+1.125,TZ1-0.175,-1]];
chairs.forEach(([x,z,d])=>chair(x,z,d));
// カウンターチェア2脚：参考画像（Clay バーチェア）風。黒いシェル座面＋クッション（背もたれなし）、1本脚のポールと円盤ベース、前側半円の足置き。座面高640mm（天板850mm用）。キッチン側を向けて設置
const shellMat=P({color:0x1b1b1b,specular:0x1a1a1a,shininess:14,side:THREE.DoubleSide}),cushMat=P({color:0x2b2b2b,specular:0x2a2a2a,shininess:30}),barBlk=P({color:0x161616,specular:0x333333,shininess:30});
function counterStool(x,z){const SH=0.64;
 const cy=(rt,rb,h,y,m,seg)=>{const c=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg||32),m);c.position.set(x,y,z);s.add(c);return c;};
 cy(0.17,0.21,0.025,0.0125,barBlk,40);                  // 円盤ベース（Φ420）
 cy(0.03,0.03,0.32,0.025+0.16,barBlk);                  // ポール下部（太め）
 cy(0.024,0.024,SH-0.05-0.345,0.345+(SH-0.05-0.345)/2,barBlk);   // ポール上部
 cy(0.06,0.05,0.03,SH-0.065,barBlk);                    // 座面下の受け
 // 足置き（前＝北側に半円＋ポールへの横棒）
 const ring=new THREE.Mesh(new THREE.TorusGeometry(0.165,0.009,8,32,Math.PI),barBlk);ring.rotation.x=-Math.PI/2;ring.position.set(x,0.3,z);s.add(ring);
 box(0.33,0.018,0.018,x,0.3,z,barBlk);
 // ガス圧レバー
 box(0.012,0.012,0.12,x+0.09,SH-0.08,z+0.02,barBlk).rotation.y=0.6;
 // 座面（シェル＋クッション）。背もたれなし
 cy(0.21,0.2,0.035,SH-0.035,shellMat,40);                 // シェル座面（丸型）
 {const cu=cy(0.185,0.185,0.025,SH-0.005,cushMat,40);cu.position.z=z-0.012;}}   // クッション
[3.23,3.83].forEach(x=>counterStool(x,2.69));


// ダクトレール（黒）とペンダントライト A5：レール LD0211BT（1m、天井付け、中心はテーブルの中心）＋フィードインキャップ LD0231BT（西端）＋エンドキャップ LD0232BT（東端）、ペンダント オーデリック OP252618LC ×3（レールの両端から150mmと中央。仮）
// 真鍮古美の器具（フランジΦ120、高199＝上のキャップから電球の下端まで）＋フィラメント形ボール球Φ95（電球色2400K・350lm）。電球の下端はテーブル天板から約75cm
const RX0=(TX0+TX1)/2-0.5,RX1=RX0+1.0,RZ=(TZ0+TZ1)/2,railBlk=0x161616;
box(RX1-RX0,0.018,0.035,(RX0+RX1)/2,H1-0.009,RZ,railBlk);
box(0.06,0.03,0.045,RX0+0.03,H1-0.015,RZ,railBlk);box(0.006,0.02,0.037,RX1+0.003,H1-0.01,RZ,railBlk);   // フィードインキャップ（寸法は仮）・エンドキャップ（仮）
const brass=P({color:0x8a7650,specular:0x6b5a3a,shininess:40});
const bulbMat=new THREE.MeshPhongMaterial({color:0xddb07a,transparent:true,opacity:0.42,specular:0xffffff,shininess:90,emissive:0x000000});
const filMat=new THREE.MeshBasicMaterial({color:0x8a6a3a});
const pends=[];
[RX0+0.15,(RX0+RX1)/2,RX1-0.15].forEach(x=>{
 const bc=TH+0.75+0.0475,top=bc+0.199-0.0475;   // 電球の中心、器具の上端（高199）
 const cyl=(r,h,y,m)=>{const c=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,24),m);c.position.set(x,y,RZ);s.add(c);return c;};
 cyl(0.018,0.11,H1-0.018-0.055,L(railBlk));                 // プラグ（コード収納フランジ）
 cyl(0.0025,(H1-0.128)-top,(H1-0.128+top)/2,L(0x111111));   // コード
 cyl(0.024,0.03,top-0.015,brass);                           // 上部キャップ
 cyl(0.06,0.003,top-0.022,brass);                           // フランジ（Φ120）
 cyl(0.024,0.074,top-0.067,brass);                          // 本体（ソケット。電球の上端まで）
 const bulb=new THREE.Mesh(new THREE.SphereGeometry(0.0475,24,16),bulbMat);bulb.position.set(x,bc,RZ);s.add(bulb);
 [-0.008,0.008].forEach(dx=>{const f=new THREE.Mesh(new THREE.BoxGeometry(0.002,0.05,0.002),filMat);f.position.set(x+dx,bc+0.005,RZ);s.add(f);});
 const pl=new THREE.PointLight(0xffb066,0,4.5,1.5);pl.position.set(x,bc,RZ);s.add(pl);pends.push(pl);});

// テレビ（75インチ・壁掛け）とテレビボード（W2000×H200×D295・フロート）：ドアを除いたテレビ設置面の中心に配置
const TVC=(TVZ+D)/2;
const bdWood=tmat(tjC,{specular:0x222222,shininess:20});   // TJ-10239K（本体も前板もダイニングテーブルと同じ柄。本体を無地の灰色にしていた。2026-10-27）
const bdBox=(w,h,d,x,y,z)=>{const b=box(w,h,d,x,y,z,bdWood),uv=b.geometry.attributes.uv,S=1.2,fs=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];   // 柄の大きさを面の大きさに合わせる（箱の UV は面ごとに 0〜1 なので、細い板では柄が伸びていた）。S：柄1枚の長さ(m)
 for(let i=0;i<uv.count;i++){const [fu,fv]=fs[i>>2];uv.setXY(i,uv.getX(i)*fu/S,uv.getY(i)*fv/S);}return b;};
bdBox(0.295,0.2,2.0,TVX+0.1475,0.30,TVC);
[-1,0,1].forEach(k=>bdBox(0.006,0.154,0.649,TVX+0.298,0.30,TVC+k*0.6536));
bdBox(0.006,0.023,2.0,TVX+0.298,0.2115,TVC);bdBox(0.006,0.023,2.0,TVX+0.298,0.3885,TVC);
bdBox(0.006,0.154,0.0196,TVX+0.298,0.30,TVC-0.9902);bdBox(0.006,0.154,0.0196,TVX+0.298,0.30,TVC+0.9902);   // 両端の縦の帯は上下の帯の間だけ（角で重ねない）
box(0.04,0.962,1.672,TVX+0.055,0.61+0.481,TVC,0x121212);
{const sc=new THREE.Mesh(new THREE.PlaneGeometry(1.65,0.94),P({color:0x07070a,specular:0x555555,shininess:90}));sc.rotation.y=Math.PI/2;sc.position.set(TVX+0.0775,1.091,TVC);s.add(sc);}
// テレビ前のウォールウォッシャダウンライト A6：パナソニック SLD1310VLB1 ×2（拡散タイプのウォールウォッシャ。LEDが壁向きに傾いていて壁面を照らす・温白色3500K・320lm・埋込穴φ75）：中心から左右750mm、壁の中心（仕上げ面から60mm奥と仮定）から500mm
const a6Mat=new THREE.MeshBasicMaterial({color:0xd9d8d4});
const a6=[TVC-0.75,TVC+0.75].map(z=>{const x=TVX-0.06+0.5;const ring=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.006,32),L(0xffffff));ring.position.set(x,H1-0.003,z);s.add(ring);const disc=new THREE.Mesh(new THREE.CylinderGeometry(0.037,0.037,0.008,32),a6Mat);disc.position.set(x,H1-0.0045,z);s.add(disc);lbox(s,0.004,0.012,0.07,x+0.03,H1-0.01,z,0x9a9a9a);const sp=new THREE.SpotLight(0xffd9b4,0,5,THREE.MathUtils.degToRad(55),0.8,1.1);sp.position.set(x,H1-0.02,z);sp.target.position.set(TVX-0.2,0.5,z);s.add(sp);s.add(sp.target);return sp;});

// ソファ：ニトリ 3人掛け電動リクライニングソファ KK6133 LGY（W1830×D890×H945、写真より少し暗めのライトグレー）
// テレビの正面に配置（テレビとの距離は座った目線から約2.3m。位置はユーザーの指定）

const fabric=tmat(fabricC,{specular:0x0a0a0a,shininess:4});texR(fabric,7,7);
const fabricDk=tmat(fabricC,{color:0xd6d6d4,specular:0x0a0a0a,shininess:4});texR(fabricDk,7,7);
// 角の丸い箱（クッション用）
const SOFA_BACK=3.35,SOFA_W=1.83,SOFA_D=0.89;   // SOFA_BACK：背の東端
const sofa=new THREE.Group();sofa.position.set(SOFA_BACK-SOFA_D/2,0,TVC);sofa.rotation.y=-Math.PI/2;s.add(sofa);
{const g=sofa,hz=SOFA_D/2,hx=SOFA_W/2,AW=0.17,IW=SOFA_W-2*AW,half=IW/2;
 // 脚（黒、肘掛けの下に4つ）
 [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([i,k])=>{const f=new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.024,0.05,12),L(0x151515));f.position.set(i*(hx-0.07),0.025,k*(hz-0.08));g.add(f);});
 // 肘掛け：本体と、上端の外側に張り出した丸いロール
 [-1,1].forEach(i=>{rbox(g,AW,0.5,SOFA_D-0.02,0.035,i*(hx-AW/2),0.05+0.25,0,fabric);
  rbox(g,AW+0.05,0.12,SOFA_D-0.03,0.055,i*(hx-AW/2+0.012),0.6,0,fabric);});
 // 背もたれの外側
 rbox(g,IW+0.02,0.62,0.12,0.045,0,0.53,-hz+0.06,fabric);   // 背もたれの外側（薄め）
 [-1,1].forEach(i=>{const cx=i*half/2;
  rbox(g,half-0.012,0.25,SOFA_D-0.16,0.03,cx,0.185,0.07,fabricDk);        // 座面の土台と前のフットレスト（電動リクライニング部）
  rbox(g,half-0.014,0.17,0.66,0.07,cx,0.395,hz-0.34,fabric);             // 座クッション
  rbox(g,half-0.02,0.475,0.225,0.08,cx,0.705,-hz+0.209,fabric,-0.1);});}   // 背クッション（上下に分けない一体の厚めのクッション、上を後ろへ傾ける）

// エアコン（AC④）
// A1・A4：拡散タイプのダウンライト パナソニック RMW(P1)（LEDフラットランプφ70・温白色3500K・440lm・白枠）
// A1×3：キッチン通路（カップボードとカウンターの間）。A4×2：リビング（テレビ前のウォールウォッシャA6と同じ列にそろえた）
const rmwEm=new THREE.MeshBasicMaterial({color:0xd9d8d4}),rmwEm4=new THREE.MeshBasicMaterial({color:0xd9d8d4});   // 発光面：rmwEm＝A1（キッチン）、rmwEm4＝A4（リビング）
const rmw=[[2.63,1.0],[3.53,1.0],[4.30,1.0],[1.79,TVC-0.75],[1.79,TVC+0.75]].map(([x,z],i)=>{const y=H1;
 const ring=new THREE.Mesh(new THREE.CylinderGeometry(0.058,0.058,0.004,32),L(0xf7f7f5));ring.position.set(x,y-0.002,z);s.add(ring);
 const lamp=new THREE.Mesh(new THREE.CylinderGeometry(0.044,0.044,0.0025,32),i<3?rmwEm:rmwEm4);lamp.position.set(x,y-0.00525,z);s.add(lamp);
 const sp=new THREE.SpotLight(0xffd9b4,0,5,THREE.MathUtils.degToRad(62),0.8,1.3);sp.position.set(x,y-0.02,z);sp.target.position.set(x,0,z);s.add(sp);s.add(sp.target);return sp;});
acUnit(0.9,H1-0.065-0.295,D,Math.PI);   // ダイキン AXシリーズ（南の壁の西寄り）
// 2階天井のダウンライト（電気図面の位置）。J1×2：2階廊下 RML(P1)（電球色2700K）。H1×2：階段の上 RMW(P1)（温白色3500K）
const hlEmL=new THREE.MeshBasicMaterial({color:0xa8a6a1}),hlEmW=new THREE.MeshBasicMaterial({color:0xa8a6a1});
const hallDL=[[0.99,3.12,0xffc68e,hlEmL],[3.32,3.12,0xffc68e,hlEmL],[4.43,4.35,0xffd9b4,hlEmW],[4.43,5.51,0xffd9b4,hlEmW]].map(([x,z,c,em])=>{const y=H2;   // 器具・配光はA1・A4（RMW(P1)）と同じ
 const ring=new THREE.Mesh(new THREE.CylinderGeometry(0.058,0.058,0.004,32),L(0xf7f7f5));ring.position.set(x,y-0.002,z);s.add(ring);
 const lamp=new THREE.Mesh(new THREE.CylinderGeometry(0.044,0.044,0.0025,32),em);lamp.position.set(x,y-0.00525,z);s.add(lamp);
 const sp=new THREE.SpotLight(c,0,5,THREE.MathUtils.degToRad(62),0.8,1.3);sp.position.set(x,y-0.02,z);sp.target.position.set(x,0,z);s.add(sp);s.add(sp.target);return sp;});
// A2×3：吹抜けの壁付けスポットライト RSP2W(K1)（2灯・温白色3500K・1240lm（1灯620lm）・散光、ファインホワイト）。H=1FL+2450
// 位置は電気図面から：吹抜け西の壁に2台（A4と同じ列）、南の壁に1台。2灯は壁に向かって左が上、右が下を照らす
const a2Em=new THREE.MeshBasicMaterial({color:0xa8a6a1}),a2W=P({color:0xf4f4f2,emissive:0x1e1e1c,specular:0x333333,shininess:30});   // 白い器具が暗く沈まないよう、わずかに自己発光（周りからの照り返しの代わり）
const a2=[];[[VX,TVC-0.75,1,0],[VX,TVC+0.75,1,0],[4.05,D,0,-1]].forEach(([px,pz,nx,nz])=>{const g=new THREE.Group();g.position.set(px,2.45,pz);g.rotation.y=Math.atan2(nx,nz);s.add(g);   // 子の座標：Z＝壁から部屋側、X＝壁に向かって右
 const add=(m,x,y,z)=>{m.position.set(x,y,z);g.add(m);return m;};
 add(new THREE.Mesh(new THREE.BoxGeometry(0.16,0.04,0.015),a2W),0,0,0.0075);[-0.08,0.08].forEach(x=>{const c=add(new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.015,24),a2W),x,0,0.0075);c.rotation.x=Math.PI/2;});   // フランジ（200×40の長円）
 add(new THREE.Mesh(new THREE.BoxGeometry(0.03,0.03,0.066),a2W),0,0,0.048);add(new THREE.Mesh(new THREE.BoxGeometry(0.055,0.028,0.03),a2W),0,0,0.0815);   // 腕
 [[-0.07,1],[0.07,-1]].forEach(([x,dir])=>{add(new THREE.Mesh(new THREE.CylinderGeometry(0.0425,0.0425,0.066,40),a2W),x,0,0.0815);   // 灯体（φ85×66）。dir：1＝上向き、-1＝下向き
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.0428,0.0428,0.0012,40),decalMat(P({color:0xd2d2cf}))),x,0,0.0815);   // 灯体の継ぎ目
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.037,0.037,0.002,40),decalMat(P({color:0xdedede}))),x,dir*0.0331,0.0815);add(new THREE.Mesh(new THREE.CylinderGeometry(0.033,0.033,0.0024,40),decalMat(a2Em)),x,dir*0.0334,0.0815);   // 発光面
  const wp=new THREE.Vector3(x,dir*0.04,0.0815);g.updateMatrixWorld(true);g.localToWorld(wp);
  const sp=new THREE.SpotLight(0xffd9b4,0,5,THREE.MathUtils.degToRad(62),0.8,1.3);sp.position.copy(wp);sp.target.position.set(wp.x,wp.y+dir*3,wp.z);s.add(sp);s.add(sp.target);a2.push(sp);});});

// 状態・視点・移動範囲
const WM=HOUSE.wallMargin,OX=B.X0,OY=FL2,OZ=B.Z0;
const win1=myWins.filter(w=>w.light.position.y-1.2<FL2).map(w=>w.light),win2=myWins.filter(w=>w.light.position.y-1.2>=FL2).map(w=>w.light);   // 1階・2階の窓（光源は窓の中心の1.2m上）
const S={shadeP:0,
 // 光源ごとの、光の届く範囲（範囲の名前は lightZones() を参照）
 zoneLights:[[[hemi,sun,up],['f1G','voidG','hallG']],[[...a6,...pends,...kdl,...rmw],['f1N','f1S','void']],[hallDL.slice(0,2),['hall','void','bedNearHall']],[hallDL.slice(2),['void','hall','f1']],[a2,['f1S','void','hall']],[win1,['f1N','f1S','void']],[win2,['void','hall','f1']]],
 // 動ける範囲（箱の和）：[x0,x1,y0,y1,z0,z1]。壁・閉じたドア・天井は越えない。階段・手すり・家具はすり抜ける（obs に入れた家具と2階の床は通れない）
 boxes:[[WM,W-WM,0.2,H1-0.08,WM,D-WM],                                // 1階LDK
  [VX+WM,W-WM,0.2,H2-0.08,HALLZ+WM,D-WM],                            // 吹抜け＋2階廊下の東側（階段を含む）
  [WM,W-WM,0.2,H2-0.08,HALLZ+WM,PZ0-WM],                             // 2階廊下（南は寝室との壁。床は obs で通れない）
  [HALLX+WM,WM+0.01,FL2+0.2,H2-0.08,HALLZ+WM,PZ0-WM],                // 2階廊下の西端（下は家の外なので床は抜けない）
  [OX+WM,OX+B.W-WM,OY+0.2,OY+B.H-0.08,OZ+WM,OZ+B.D-WM],             // 寝室
  ifOpen('sg311',[OX+B.doorA+0.08,OX+B.doorB-0.08,OY+0.2,OY+1.95,PZ0-WM-0.01,OZ+WM+0.01])],   // 寝室の入口（開いた引き戸）
 // 通れない所（壁から WM の余裕を取って判定）
 obs:[[0,1.36,-1,2.45,0,0.5],                                        // 押入
  [0,W,H1-0.07,FL2+0.19,HALLZ,VZ],[HOUSE.ldk.SX0,W,H1-0.07,FL2+0.19,VZ,ZN],   // 2階の床（廊下の床と、階段の幅の張り出し＝14段目の段鼻まで）：1階の天井から2階の床に立つ高さまで通れない
  [0,PX1,-1,2.45,PZ0,PZ1],                                           // 西側の仕切り壁
  [HOUSE.wash.CX1,TVX,-1,2.45,TVZ,99],                               // テレビ面の壁（玄関との間）
  [HOUSE.wash.CX1,TVX,-1,2.45,PZ1,HOUSE.wash.SZ1-0.77],[HOUSE.wash.CX1,TVX,-1,2.45,HOUSE.wash.SZ1,TVZ],   // SG11Hの両脇の壁（開口の先は廊下）
  ifShut('sg11h',[HOUSE.wash.CX1,TVX,-1,2.45,HOUSE.ldk.PZ1,HOUSE.wash.SZ1]),   // SG11Hを閉じたとき
  [4.04,4.10,-1,2.45,0,0.62],                                        // うす壁
  [2.15,W,2.22,FL2,1.565,2.67],                                      // キッチン上の下がり天井（CH2300）
  [2.18,4.04,-1,2.45,0,0.63],                                        // カップボード（天板まで。上の家電はカップボードの奥行に収まるので個別には設定しない）
  [4.10,W,-1,2.45,0,0.455],                                          // カップボード東の自在棚
  [1.47,2.07,-1,2.45,0,0.685],                                       // 冷蔵庫（本体と扉。取っ手の出っ張りは含めない）
  [TVX,TVX+0.301,-1,2.45,TVC-1.0,TVC+1.0]],                          // テレビボード（前板まで。床から天井までなので、上の壁掛けテレビも含む）
 setShade(p){S.shadeP=p;applyShades(myShades,p);},
 mats:{plasterMat,accentMat,stoneMat,stoneKMat,oakFloorMat},
 lights(f){const off=f===1?0x2a2927:0xa8a6a1,on=k=>LS[k];   // 照明のグループごとに点灯・消灯（LS：全体の照明の状態）
  a6.forEach(p=>p.intensity=on('a6')?1.0*f:0);a6Mat.color.set(on('a6')?0xfff1e0:off);                                        // リビング：ウォールライト（A6）
  rmw.forEach((p,i)=>p.intensity=on(i<3?'a1':'a4')?0.8*f:0);rmwEm4.color.set(on('a4')?0xfff1e0:off);rmwEm.color.set(on('a1')?0xfff1e0:off);   // リビング：ダウンライト（A4）、キッチン：ダウンライト（A1）
  a2.forEach(p=>p.intensity=on('a2')?0.8*620/440*f:0);a2Em.color.set(on('a2')?0xfff1e0:off);                                 // リビング：スポット（A2）
  hallDL.forEach((p,i)=>p.intensity=on(i<2?'j1':'h1')?0.8*f:0);hlEmW.color.set(on('h1')?0xfff1e0:off);hlEmL.color.set(on('j1')?0xffe2b8:off);   // リビング：階段（H1）、寝室：廊下（J1）
  pends.forEach(p=>p.intensity=on('a5')?0.35*f:0);bulbMat.emissive.set(on('a5')?0xffb066:0x000000);bulbMat.opacity=on('a5')?0.9:0.42;filMat.color.set(on('a5')?0xffe08a:0x8a6a3a);   // キッチン：ペンダント（点灯時のガラスは光の色＝2400K。光っているときは透けを減らし、後ろの色が混ざらないように）
  kdl.forEach(p=>p.intensity=on('a3')?1.3*f:0);kdlEm.color.set(on('a3')?0xffe2b8:(f===1?0x222120:0x6a665e));},              // キッチン：下がり天井（A3）
 applyEnv(night){S.lights(night?1:0.3);const k=dayRatio(myWins,S.shadeP);fillEnv(F,night,k);myWins.forEach(w=>w.light.intensity=night?0:w.I*w.t);
  if(night){sc.background.set(0x141c28);ceilMat.emissive.setScalar(0.045);}else{sc.background.set(0xdfe9f2);ceilMat.emissive.setScalar(0.06+0.16*k);}},
 viewLiv(){view(3.84,0,6.95,0.56,3.18,85);},
 viewHall(){view(4.6,FL2,3.0,0.5,4.4,85);},   // 2F廊下：東の端（階段の上）から西南西。吹抜けの窓・手摺・廊下が入る（前は廊下の壁ばかりだった）
 viewKit(){view(4.67,0,0.8,1.29,2.93,85);}};
return S;}

