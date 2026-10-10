// ===== 脱衣室・洗面所・廊下・玄関（1階。座標はLDKと同じ） =====
// 脱衣室・洗面所の床は石目調フローリング（キッチンと同じ、南北張り）。SG300×2・SG33・SG11H・SG500・浴室のドアは開閉できる（ページを開いたときの状態は DS）
function buildWash(sc,M){s=sc;shades=[];winLights=[];const myWins=winLights;
const {X0,LW,DZ0,DZ1,SZ0,SZ1,SX1,CX0,CX1,winZ0,winZ1,bathA,bathB,sgA,sgB,s33A,s33B,hbX}=HOUSE.wash,{H1,TVZ,PZ0,PZ1,SGZ0,SGZ1}=HOUSE.ldk,EN=HOUSE.entry,wm=tmat(plasterC),e=HOUSE.floorMargin,WM=HOUSE.wallMargin;   // wm：脱衣室・洗面所・廊下・玄関の壁（IC-5016、寝室と同じ）
floorRect(X0-e,-0.08,DZ0-e,PZ1,0.002,M.stoneMat,1.818);                    // 脱衣室・洗面所の北側（LDKの床はX=-0.08から）
floorRect(X0-e,CX0-0.035,PZ1,SZ1+e,0.002,M.stoneMat,1.818);                // 洗面所の南側（SG33の扉の下で廊下の床に切り替え。廊下・玄関の床は玄関の部分で作る）
ceilRect(X0,0,DZ0,TVZ,H1,ceilMat,0.4);ceilRect(0,HOUSE.ldk.TVX,HOUSE.ldk.VZ,TVZ,H1,ceilMat,0.4);   // 天井（2400）
// 脱衣室
buildWall(wallGroup(X0,0,DZ1,Math.PI/2),DZ1-DZ0,H1,[{a:DZ1-winZ1,b:DZ1-winZ0,y1:1.677,y2:2.134,win:1,panes:2,noShade:1}],wm,1,true);   // 西（F4415N：W1198×H457、+1677）
buildWall(wallGroup(X0,0,DZ0,0),LW-X0,H1,[{a:bathA-X0,b:bathB-X0,y1:0,y2:2.0,door:'bath',T:DZ0-HOUSE.bath.Z1,toggle:'bath'}],wm,1,true);   // 北（浴室のドア：開閉できる。東側吊元で浴室側へ95°開く）
buildWall(wallGroup(LW,0,DZ0,-Math.PI/2),DZ1-DZ0,H1,[{a:SGZ0-DZ0,b:SGZ1-DZ0,y1:0,y2:2.0,door:'frame'}],wm,1,true);                    // 東（LDKとの間のSG300。扉はLDK側）
buildWall(wallGroup(LW,0,DZ1,Math.PI),LW-X0,H1,[{a:LW-sgB,b:LW-sgA,y1:0,y2:2.0,door:'slide',open:1,T:SZ0-DZ1,toggle:'sg300w'}],wm,1,true);           // 南（洗面所とのSG300：開閉できる引き戸。西へ引いて開ける）
// 洗濯機：パナソニック NA-LX127FL（左開き、白）。ホースを含めない寸法 W604×D732×H1038。脱衣室の南西の角、西と南の壁から30mm、正面は東
// 形：正面は平らな箱（ドアも本体の面とそろう）。上部の前の角を斜めに落とした操作パネルの面、ドアの左上にくぼみ、下部に2枚のパネル、濃いグレーの台と脚。側面は横リブと運搬用の取っ手。操作パネルはデフォルメ、ガラス越しのドラムは描かない
{const g=new THREE.Group(),WW=0.604,WD=0.732,WH=1.038,BH=0.089,BW=0.598;g.position.set(X0+0.03+WD/2,0,DZ1-0.03-WW/2);g.rotation.y=Math.PI/2;s.add(g);   // 子の座標：+Z＝正面（東）、+X＝正面に向かって右（北）。BW：リブを除いた本体の幅
 const wht=P({color:0xf3f3f1,specular:0x333333,shininess:36}),zb=-WD/2,zf=WD/2,LN=0xcfcfcd,PY0=WH-0.049,PSK=0.092,PA=Math.atan2(PSK,WH-PY0);   // zb：背面、zf：正面。操作パネルは前上の角を斜めに落とした面（側面図から：高さ49・奥行92、約62°倒れる）。PY0：斜めの面の下端、PSK：上端で奥へ下がる量、PA：傾き
 {const bv=0.004,hx=BW/2-bv,hz=WD/2-bv,r=0.012,w=hx-r,d=hz-r,sh=new THREE.Shape();sh.moveTo(-w,-hz);sh.lineTo(w,-hz);sh.absarc(w,-d,r,-Math.PI/2,0);sh.lineTo(hx,d);sh.absarc(w,d,r,0,Math.PI/2);sh.lineTo(-w,hz);sh.absarc(-w,d,r,Math.PI/2,Math.PI);sh.lineTo(-hx,-d);sh.absarc(-w,-d,r,Math.PI,Math.PI*1.5);   // 本体（角を少し丸めた箱）
  const part=(y0,y1,sk)=>{const geo=new THREE.ExtrudeGeometry(sh,{depth:y1-y0-2*bv,bevelEnabled:true,bevelThickness:bv,bevelSize:bv,bevelSegments:2,curveSegments:6});geo.rotateX(-Math.PI/2);geo.translate(0,y0+bv,0);   // sk：上ほど正面を奥へ下げる量（操作パネルの斜め）
   if(sk){const p=geo.attributes.position;for(let i=0;i<p.count;i++){const t=Math.min(1,Math.max(0,(p.getY(i)-y0)/(y1-y0)));p.setZ(i,Math.min(p.getZ(i),zf-sk*t));}geo.computeVertexNormals();}
   g.add(new THREE.Mesh(geo,wht));};
  part(BH,PY0,0);part(PY0,WH,PSK);}   // 本体と、上の部分（前の角を斜めに落として操作パネルの面にする。境目は面取りの溝になる）
 // 台（濃いグレー）と脚
 lbox(g,0.584,BH-0.02,WD-0.02,0,0.02+(BH-0.02)/2,-0.005,0x3a3c3f);
 [[-0.25,1],[0.25,1],[-0.25,-1],[0.25,-1]].forEach(([x,k])=>{const f=new THREE.Mesh(new THREE.CylinderGeometry(0.024,0.026,0.02,20),L(0x2c2d2f));f.position.set(x,0.01,k*(WD/2-0.06));g.add(f);});
 // 正面：下部パネルの継ぎ目（右は糸くずフィルターのフタ）
 lbox(g,BW-0.01,0.002,0.002,0,0.296,zf+0.001,LN);lbox(g,0.002,0.296-BH-0.004,0.002,0.129,(0.296+BH)/2,zf+0.001,LN);
 // 操作パネル（デフォルメ）：ロゴ・小さな表示・黒い液晶・丸いダイヤル
 {const pg=new THREE.Group();pg.position.set(0,(PY0+WH)/2,zf-PSK/2);pg.rotation.x=-PA;g.add(pg);const pb=(w,h,d,x,y,z,c)=>lbox(pg,w,h,d,x,y,z,c);   // 斜めの面に貼る（子の座標：z=0が斜めの面）
  pb(0.05,0.006,0.001,-0.235,0,0.0006,0x8a8a8a);[-0.13,-0.1,-0.074].forEach(x=>pb(0.006,0.006,0.001,x,0.004,0.0006,0xbdbdbb));[0.18,0.22,0.255].forEach(x=>pb(0.014,0.006,0.001,x,0.002,0.0006,0xbdbdbb));
  pb(0.105,0.027,0.002,0,0.002,0.001,0x161618);pb(0.07,0.003,0.001,0,0.004,0.0022,0xd8d8d8);pb(0.05,0.002,0.001,-0.01,-0.004,0.0022,0x9a9a9a);   // 液晶（黒地に白い表示）
  const d=new THREE.Mesh(new THREE.CylinderGeometry(0.026,0.026,0.004,40),L(0xf7f7f7));d.rotation.x=Math.PI/2;d.position.set(0.116,0,0.002);pg.add(d);const rg=new THREE.Mesh(new THREE.RingGeometry(0.0255,0.0272,48),decalMat(P({color:0xb8b8b6})));rg.position.set(0.116,0,0.0041);pg.add(rg);}   // ダイヤル
 // ドア（φ490、中心は床から662、本体の面とそろえる）とドアの左上のくぼみ
 {const DY=0.662,dr=new THREE.Group();dr.position.set(0,DY,zf);g.add(dr);
  const rc=tex(cv((x,W,H)=>{const k=W/0.229,R=0.06*k;x.beginPath();x.moveTo(0,H);x.lineTo(0,R);x.quadraticCurveTo(0,0,R,0);x.lineTo(W,0);x.lineTo(W,H);x.closePath();const gr=x.createLinearGradient(0,0,W*0.6,H*0.6);gr.addColorStop(0,'#6c6c6c');gr.addColorStop(1,'#8e8e8e');x.fillStyle=gr;x.fill();},229,238));   // くぼみ（左上が角丸の四角。ドアに隠れない部分が見える）
  rc.wrapS=rc.wrapT=THREE.ClampToEdgeWrapping;const rp=new THREE.Mesh(new THREE.PlaneGeometry(0.229,0.238),decalMat(P({map:rc,transparent:true,depthWrite:false,shininess:4})));rp.position.set(-0.229/2,0.238/2,0.0006);dr.add(rp);   // 左端はドア中心から229、上端は238（写真の比率）
  const rg=(r0,r1,z,c)=>{const m=new THREE.Mesh(new THREE.RingGeometry(r0,r1,96),decalMat(typeof c==='number'?P({color:c}):c.clone()));m.position.z=z;dr.add(m);};
  rg(0.244,0.248,0.0009,0x707070);   // ドアの外周の細いすき間
  const dw=new THREE.Mesh(new THREE.CylinderGeometry(0.244,0.244,0.004,96),P({color:0xf6f6f4,specular:0x444444,shininess:50}));dw.rotation.x=Math.PI/2;dw.position.z=0.002;dr.add(dw);   // ドアの白い枠（平ら）
  rg(0.15,0.175,0.0042,P({color:0xd9d9d8,specular:0x444444,shininess:40}));   // ガラスまわりの薄いグレーの縁
  const gt=tex(cv((x,W,H)=>{const c=W/2;let gr=x.createRadialGradient(c,c,0,c,c,c);gr.addColorStop(0,'#3a3b3e');gr.addColorStop(1,'#1c1d1f');x.fillStyle=gr;x.fillRect(0,0,W,H);   // ガラス（濃い色の地に、うっすら映り込み。中のドラムは描かない）
   gr=x.createRadialGradient(c*0.65,c*0.55,0,c*0.65,c*0.55,c*0.6);gr.addColorStop(0,'rgba(255,255,255,0.16)');gr.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=gr;x.fillRect(0,0,W,H);},256,256));gt.wrapS=gt.wrapT=THREE.ClampToEdgeWrapping;
  const gd=new THREE.Mesh(new THREE.CircleGeometry(0.15,72),decalMat(P({map:gt,specular:0x666666,shininess:80})));gd.position.z=0.0043;dr.add(gd);}
 // 側面：横リブ（浅い帯）と運搬用の取っ手（両側）
 [-1,1].forEach(sd=>{const x=sd*(BW/2+0.0015);for(let y=0.13;y+0.042<PY0-0.01;y+=0.07)lbox(g,0.003,0.042,WD-0.05,x,y+0.021,0,wht);
  [[0.93,1],[0.31,1],[0.93,-1],[0.31,-1]].forEach(([y,k])=>{const z=k*(WD/2-0.09);lbox(g,0.004,0.03,0.075,sd*(BW/2+0.002),y,z,0xa9a9a7);lbox(g,0.0045,0.018,0.06,sd*(BW/2+0.0025),y,z,decalMat(P({color:0x7c7c7a})));});});
 // 上面：洗剤ケースのフタなどの継ぎ目（デフォルメ）
 [[-0.235,-0.04],[0.02,0.235]].forEach(([a,b])=>{const zz0=zb+0.04,zz1=zb+0.3,y=WH+0.0005;lbox(g,b-a,0.001,0.002,(a+b)/2,y,zz0,LN);lbox(g,b-a,0.001,0.002,(a+b)/2,y,zz1,LN);lbox(g,0.002,0.001,zz1-zz0,a,y,(zz0+zz1)/2,LN);lbox(g,0.002,0.001,zz1-zz0,b,y,(zz0+zz1)/2,LN);});}
// 物干しバー×2（天井吊りのU字形、黒のマット塗装）：芯々1515・天井から下端まで500・パイプφ22.2・曲げ半径50・座金φ75×3.2。長手方向（東西）に、北の壁から芯350と900、西の壁から西の脚の芯まで50（仮）
{const barM=P({color:0x1b1b1b,specular:0x121212,shininess:7}),r=0.0111,CC=1.515,Rb=0.05+r,yb=H1-0.5+r,x0=X0+0.05,x1=x0+CC,yt=H1-0.0032;   // Rb：曲げの芯の半径（内側50）、yb：横棒の芯の高さ
 [DZ0+0.35,DZ0+0.9].forEach(z=>{const add=(geo,x,y,rz,rx)=>{const m=new THREE.Mesh(geo,barM);m.position.set(x,y,z);m.rotation.set(rx||0,0,rz||0);s.add(m);};
  [x0,x1].forEach(x=>{add(new THREE.CylinderGeometry(r,r,yt-(yb+Rb),20),x,(yt+yb+Rb)/2);add(new THREE.CylinderGeometry(0.0375,0.0375,0.0032,32),x,H1-0.0016);});   // 脚・座金
  add(new THREE.CylinderGeometry(r,r,CC-2*Rb,20),(x0+x1)/2,yb,Math.PI/2);   // 横棒
  add(new THREE.TorusGeometry(Rb,r,14,16,Math.PI/2),x0+Rb,yb+Rb,Math.PI);add(new THREE.TorusGeometry(Rb,r,14,16,Math.PI/2),x1-Rb,yb+Rb,-Math.PI/2);});}   // 曲げ（西・東）
// 洗面所（北東は仕切り壁の北側まで広がる）
buildWall(wallGroup(X0,0,SZ1,Math.PI/2),SZ1-SZ0,H1,[],wm,1,true);                                                                       // 西
buildWall(wallGroup(X0,0,SZ0,0),LW-X0,H1,[{a:sgA-X0,b:sgB-X0,y1:0,y2:2.0,door:'frame'}],wm,1,true);                                   // 北（SG300）
buildWall(wallGroup(LW,0,SZ0,-Math.PI/2),PZ0-SZ0,H1,[],wm,1,true);                                                                      // 北東の東（LDKの西の壁の裏）
buildWall(wallGroup(LW,0,PZ0,Math.PI),LW-SX1,H1,[],wm,1,true);                                                                          // 北東の南（仕切り壁の北側）
buildWall(wallGroup(SX1,0,PZ0,-Math.PI/2),SZ1-PZ0,H1,[{a:s33A-PZ0,b:s33B-PZ0,y1:0,y2:2.0,door:'frame'}],wm,1,true);                  // 東（SG33。扉は廊下側）
buildWall(wallGroup(SX1,0,SZ1,Math.PI),SX1-X0,H1,[{a:SX1-hbX-0.225,b:SX1-hbX+0.225,y1:0,y2:1.25,hb:1}],wm,1,true);                   // 南（床暖房のヘッダーボックス H1250×W450）
// グレイス・シリーズの面材（ドレッサーとシューズボックスで共通）：グレージュの木目（grM：面、grE：小口）、取っ手の色、鏡
 const hs=(x,y)=>{let h=Math.imul(x|0,374761393)+Math.imul(y|0,668265263)|0;h=Math.imul(h^h>>>13,1274126177);return((h^h>>>16)>>>0)/4294967296;};
 const vn=(x,y,px,py)=>{const xi=Math.floor(x),yi=Math.floor(y),fx=x-xi,fy=y-yi,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy),m=(a,b)=>hs(((a%px)+px)%px,((b%py)+py)%py),a=m(xi,yi),b=m(xi+1,yi),c=m(xi,yi+1),d=m(xi+1,yi+1);return a+(b-a)*sx+(c-a)*sy+(a-b-c+d)*sx*sy;};   // 周期つきのなめらかなノイズ（タイルの端で継ぎ目が出ない）
 const grC=cv((x,W,H)=>{const im=x.createImageData(W,H),D=im.data;for(let y=0;y<H;y++)for(let i=0;i<W;i++){const u=i/W,v=y/H,w=vn(u*3,v*8,3,8);   // グレージュの木目（横方向の細かい筋。ピクセル単位で計算。柄は前のまま、色は見本の木目同調エンボスパネル グレージュに合わせる）
   const n1=vn(u*5,v*150+w*6,5,150),n2=vn(u*24,v*400+w*14,24,400),n3=vn(u*2,v*6,2,6),k=0.80+0.15*n1+0.12*n2+0.05*n3-(n2>0.72?0.09:0)-(n1>0.8?0.05:0),o=(y*W+i)*4;
   D[o]=Math.min(255,201*k);D[o+1]=Math.min(255,182*k);D[o+2]=Math.min(255,166*k);D[o+3]=255;}x.putImageData(im,0,0);},512,512);
 const grM=tmat(grC,{specular:0x1a1a1a,shininess:10}),grE=P({color:0xb4a090}),HC=0x5c4e45;   // HC：取っ手の色
 const mirC=cv((x,W,H)=>{const gr=x.createLinearGradient(0,0,W*0.3,H);gr.addColorStop(0,'#eef2f4');gr.addColorStop(0.45,'#c3cbd0');gr.addColorStop(1,'#d9dfe2');x.fillStyle=gr;x.fillRect(0,0,W,H);},64,256),mm=tmat(mirC,{specular:0xffffff,shininess:120});   // 鏡（映り込みは計算しないので、明るいグラデーションで代用）
// ドレッサー（DS19-W222R、カウンター高850）：洗面所の西の壁いっぱい（南北の壁から壁まで）。正面は東。扉・引出し・側板・吊戸棚の面材はグレージュの木目、カウンター・ボウル・背面パネルは白
// 構成（正面に向かって左から）：洗面ボウルと引出し2段、右に収納（引出し側と同じ2段＋小引出し、天板は一段高い）。下端はそろえて床から120浮かせ、両端の側板だけ床まで。上に背面パネル・4面鏡の鏡収納と照明・吊戸棚（すべて壁から壁まで、吊戸棚は天井まで）。細部の寸法は写真の比率から（仮置き）
{const DW=SZ1-SZ0,g=new THREE.Group();g.position.set(X0,0,SZ1);g.rotation.y=Math.PI/2;s.add(g);   // 子の座標：x＝南の壁から北へ（正面に向かって右）、y＝上、z＝壁から室内側
 const wh=P({color:0xf4f4f2,specular:0x222222,shininess:20}),cw=P({color:0xf7f7f5,specular:0x555555,shininess:50}),cm=P({color:0xd5d8db,specular:0xffffff,shininess:110});
 const front=(x0,x1,y0,y1,zf,vert)=>{const w=x1-x0,h=y1-y0;lboxOpen(g,w,h,0.018,(x0+x1)/2,(y0+y1)/2,zf-0.009,grE,[4]);const p=new THREE.Mesh(uvPlane(w,h,R()*2,R()*2,0.7,0.7),grM);p.position.set((x0+x1)/2,(y0+y1)/2,zf);g.add(p);};   // 扉・引出しの前板（木目は横。箱の前の面は作らず、そこへ木目の面を置く＝重ねない）
 const side=(x0,x1,y0,y1,z0,z1)=>{lboxOpen(g,x1-x0,y1-y0,z1-z0,(x0+x1)/2,(y0+y1)/2,(z0+z1)/2,grE,[0,1]);[x0,x1].forEach((xx,k)=>{const p=new THREE.Mesh(uvPlane(z1-z0,y1-y0,R()*2,R()*2,0.7,0.7),grM);p.rotation.y=k?Math.PI/2:-Math.PI/2;p.position.set(xx,(y0+y1)/2,(z0+z1)/2);g.add(p);});};   // 木目の側板（両面に木目。箱の左右の面は作らず、そこへ木目の面を置く）
 const bar=(cx,y,len,zf)=>{lbox(g,len,0.011,0.01,cx,y,zf+0.024,HC);[-1,1].forEach(k=>lbox(g,0.01,0.011,0.02,cx+k*(len/2-0.006),y,zf+0.01,HC));};   // 横長の取っ手（両端で前板に付く）
 const XS=0.93,YB=0.12,ZF=0.52;   // XS：ボウル側と右の収納の境、YB：下端の高さ、ZF：前板の面
 // 両端の側板（床まで）と本体
 side(0,0.02,0,0.82,0,ZF);side(DW-0.02,DW,0,0.93,0,ZF);
 lbox(g,XS-0.02,0.69-YB,0.5,(0.02+XS)/2,(YB+0.69)/2,0.25,wh);   // ボウル側の本体はボウルの底より下まで（上はボウルが入るので空ける）
 lbox(g,DW-0.02-XS,0.93-YB,0.5,(XS+DW-0.02)/2,(YB+0.93)/2,0.25,wh);
 front(0.022,XS-0.002,YB,0.445,ZF);front(0.022,XS-0.002,0.455,0.815,ZF);bar((0.02+XS)/2,0.385,0.67,ZF);bar((0.02+XS)/2,0.755,0.67,ZF);   // 引出し2段
 front(XS+0.002,DW-0.022,YB,0.445,ZF);front(XS+0.002,DW-0.022,0.455,0.815,ZF);front(XS+0.002,DW-0.022,0.825,0.925,ZF);bar((XS+DW-0.02)/2,0.385,0.22,ZF);bar((XS+DW-0.02)/2,0.755,0.22,ZF);   // 右の収納：下2段は引出し側と同じ高さ・取っ手位置、3段目（小引出し）は取っ手なし
 lbox(g,DW-XS,0.02,0.53,(XS+DW)/2,0.94,0.265,cw);   // 右の収納の天板（白、一段高い）
 // カウンターとボウル（白、一体）。ボウルは前が広い台形で、奥は背面パネルの足元から斜めに下がり、底は手前寄り
 {const YT=0.85,YD=0.71,top=[[0.24,0.10],[0.68,0.10],[0.73,0.47],[0.19,0.47]],bot=[[0.28,0.30],[0.64,0.30],[0.665,0.445],[0.255,0.445]];   // 角：奥左・奥右・手前右・手前左（x,z）
  const rq=(c,r,n)=>{const p=[];for(let i=0;i<4;i++){const A=c[(i+3)%4],B=c[i],C=c[(i+1)%4],u=(P,Q)=>{const dx=Q[0]-P[0],dz=Q[1]-P[1],l=Math.hypot(dx,dz);return [dx/l,dz/l];},d1=u(B,A),d2=u(B,C),a=[B[0]+d1[0]*r,B[1]+d1[1]*r],b=[B[0]+d2[0]*r,B[1]+d2[1]*r];
   for(let k=0;k<=n;k++){const t=k/n,q=1-t;p.push([q*q*a[0]+2*q*t*B[0]+t*t*b[0],q*q*a[1]+2*q*t*B[1]+t*t*b[1]]);}}return p;};   // 角を丸めた四角形の周
  const NL=10,NC=8,pos=[],idx=[],col=[];   // col：奥ほど少し暗く（照明が無いため、深さが分かるように）
  let N=0;for(let l=0;l<=NL;l++){const t=l/NL,eh=1-Math.cos(t*Math.PI/2),ev=Math.sin(t*Math.PI/2),c=top.map((p,i)=>[p[0]+(bot[i][0]-p[0])*eh,p[1]+(bot[i][1]-p[1])*eh]),pts=rq(c,0.03+0.04*t,NC);N=pts.length;pts.forEach(([x,z])=>{pos.push(x,YT-(YT-YD)*ev,z);const k=1-0.13*ev;col.push(k,k,k*0.995);});}   // 壁は上で立ち、下で丸く底へつながる
  for(let l=0;l<NL;l++)for(let k=0;k<N;k++){const a=l*N+k,b=l*N+(k+1)%N;idx.push(a,b,a+N,b,b+N,a+N);}
  {const c0=pos.length/3;let cx=0,cz=0;for(let k=0;k<N;k++){cx+=pos[(NL*N+k)*3];cz+=pos[(NL*N+k)*3+2];}pos.push(cx/N,YD,cz/N);col.push(0.87,0.87,0.866);for(let k=0;k<N;k++)idx.push(c0,NL*N+k,NL*N+(k+1)%N);}   // 底
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));geo.setIndex(idx);geo.computeVertexNormals();g.add(new THREE.Mesh(geo,P({color:0xf7f7f5,specular:0x555555,shininess:50,side:THREE.DoubleSide,vertexColors:true})));
  const sh=new THREE.Shape([[0,0],[XS,0],[XS,-0.53],[0,-0.53]].map(([x,y])=>new THREE.Vector2(x,y))),hl=new THREE.Path(rq(top,0.03,NC).map(([x,z])=>new THREE.Vector2(x,-z)));sh.holes.push(hl);   // カウンターの上面（ボウルの穴あき）
  const cg=new THREE.ShapeGeometry(sh);cg.rotateX(-Math.PI/2);const ct=new THREE.Mesh(cg,cw);ct.position.y=YT;g.add(ct);
  lbox(g,XS,0.03,0.012,XS/2,YT-0.015,0.524,cw);   // カウンターの前の縁
  const dn=new THREE.Mesh(new THREE.CylinderGeometry(0.022,0.022,0.003,24),cm);dn.position.set(0.46,YD+0.003,0.40);g.add(dn);}   // 排水口
 // 背面パネル（水栓の付く白い壁）と水栓
 lbox(g,DW-0.04,0.31,0.1,DW/2,1.005,0.05,cw);   // 壁から壁まで（両端の側板の間）
 {const cyl=(r,l,x,y,z,ax)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,l,24),cm);if(ax)m.rotation.x=Math.PI/2;m.position.set(x,y,z);g.add(m);return m;};   // 水栓（壁付け、クローム）：吐水口はボウルの中心、右にレバー、その右に小さなボタン
  cyl(0.02,0.008,0.455,1.075,0.104,1);cyl(0.012,0.06,0.455,1.075,0.13,1);cyl(0.013,0.03,0.455,1.065,0.158);
  cyl(0.024,0.01,0.575,1.09,0.105,1);cyl(0.016,0.04,0.575,1.09,0.128,1);lbox(g,0.024,0.08,0.012,0.575,1.05,0.15,cm);
  cyl(0.008,0.006,0.657,1.08,0.103,1);lbox(g,0.08,0.024,0.006,0.73,1.142,0.103,0xf0f0ee);[0.71,0.75].forEach(x=>cyl(0.007,0.004,x,1.142,0.107,1).material=L(0xc9c9c7));}   // 背面上の操作ボタン（2つ）
 // 鏡収納：壁から壁まで。両端の木目の側板の間いっぱいに鏡（4枚。幅は写真の比率）、下に白い棚板、上に照明
 {
  const MX0=0.02,MX1=DW-0.02,MY0=1.175,MY1=1.865;side(0,0.02,0.85,1.92,0,0.17);side(MX1,DW,0.95,1.92,0,0.17);
  lbox(g,MX1-MX0,MY1-MY0+0.01,0.15,(MX0+MX1)/2,(MY0+MY1)/2,0.075,wh);lbox(g,MX1-MX0,0.015,0.165,(MX0+MX1)/2,1.1675,0.0825,wh);
  const wr=[217,330,210,255],ws=wr.reduce((a,b)=>a+b);let xx=MX0;wr.forEach(r=>{const w=(MX1-MX0)*r/ws,cx=xx+w/2;xx+=w;lbox(g,w-0.003,MY1-MY0,0.010,cx,(MY0+MY1)/2,0.155,0x9aa0a4);const p=new THREE.Mesh(new THREE.PlaneGeometry(w-0.008,MY1-MY0-0.006),mm);p.position.set(cx,(MY0+MY1)/2,0.1623);g.add(p);});
  lbox(g,MX1-MX0,0.05,0.17,(MX0+MX1)/2,1.895,0.085,wh);lbox(g,MX1-MX0,0.025,0.012,(MX0+MX1)/2,1.885,0.1665,0xc3c7ca);lbox(g,MX1-MX0-0.02,0.004,0.03,(MX0+MX1)/2,1.8685,0.14,0xf0f0ee);}   // 縁は箱の前の面から2.5mm前、拡散板は箱の下の面から3.5mm下に出す（面をそろえない）   // 照明（白い箱、前にシルバーの縁、下に拡散板）
 // 吊戸棚（壁から壁まで、天井まで。大きい扉は引出し側、小さい扉は右の収納の上）
 side(0,0.02,1.92,2.4,0,0.3);side(DW-0.02,DW,1.92,2.4,0,0.3);lbox(g,DW-0.04,0.48,0.282,DW/2,2.16,0.141,grE);front(0.022,XS-0.002,1.922,2.398,0.3);front(XS+0.002,DW-0.022,1.922,2.398,0.3);}
// 廊下（洗面所とリビングの間。南は玄関ホールへ続く）。壁は玄関と同じIC-5016
buildWall(wallGroup(CX0,0,PZ1,0),-CX0,H1,[],wm,1,true);                                                                                 // 北（仕切り壁の南側）
buildWall(wallGroup(0,0,PZ1+0.0025,0),CX1,H1,[],wm,1,false);                                                                             // 北：X=0から東（LDKの仕切り壁の面から2.5mm離して重ねる＝ちらつかない。幅木はLDKの仕切り壁のもの）
buildWall(wallGroup(CX0,0,EN.Z0,Math.PI/2),EN.Z0-PZ1,H1,[{a:EN.Z0-s33B,b:EN.Z0-s33A,y1:0,y2:2.0,door:'swing',T:CX0-SX1,toggle:'sg33'}],wm,1,true);   // 西（SG33：北側吊元で廊下側へ開く。開閉できる）。南端は玄関ホールの北の壁の面

// ===== 玄関（玄関ホール・土間・土間収納）とトイレ =====
// 床：ホール・廊下・トイレはリビングと同じオーク（柄は家全体の座標でそろうので、リビングとつながる）、土間（−180）はグレーのタイル（仮）
// 框は斜め（平面図から約19°）で、東端はシューズボックスの下を通って東の壁まで（シューズボックスの南側は土間から浮く）
// 壁はIC-5016（北の1面だけアクセントIC-5023）。土間に接する壁は土間の高さから張り、下部は土間と同じタイル（床の高さまで）＋その上に幅木（ホールの幅木と同じ高さ）
// G1（トイレのペンダント）の素材：スモークグレーの波打ったガラス（暗い部分を減らし、透けを多めにしてクリアな印象に。明るいゆらぎの模様と、凹凸の向きのテクスチャを同じ高さの値から作る。点灯すると模様が光る）、クリアの電球、電球の中の発光部
const g1M=(()=>{const N=256,T2=Math.PI*2,hg=new Float32Array(N*N);
 for(let j=0;j<N;j++)for(let i=0;i<N;i++){const u=i/N,v=j/N;hg[j*N+i]=0.55*Math.sin(T2*(4*u+0.45*Math.sin(T2*(2*v+u))+0.3*Math.sin(T2*3*v)))+0.45*Math.sin(T2*(3*v-u+0.35*Math.sin(T2*(3*u-v))))+0.25*Math.sin(T2*(7*u+5*v+0.5*Math.sin(T2*(2*u+3*v))));}
 const H=(i,j)=>hg[((j+N)%N)*N+(i+N)%N];
 const mapC=cv((g,w,h)=>{const im=g.createImageData(w,h),d=im.data;for(let j=0;j<h;j++)for(let i=0;i<w;i++){const t=Math.min(1,Math.max(0,(H(i,j)-0.35)/0.55)),p=t*t*(3-2*t),k=(j*w+i)*4;d[k]=Math.round(96+112*p);d[k+1]=Math.round(101+113*p);d[k+2]=Math.round(108+112*p);d[k+3]=255;}g.putImageData(im,0,0);},N,N);
 const nrmC=cv((g,w,h)=>{const im=g.createImageData(w,h),d=im.data;for(let j=0;j<h;j++)for(let i=0;i<w;i++){const nx=-(H(i+1,j)-H(i-1,j))*3,ny=-(H(i,j+1)-H(i,j-1))*3,l=Math.hypot(nx,ny,1),k=(j*w+i)*4;d[k]=Math.round((nx/l*0.5+0.5)*255);d[k+1]=Math.round((ny/l*0.5+0.5)*255);d[k+2]=Math.round((1/l*0.5+0.5)*255);d[k+3]=255;}g.putImageData(im,0,0);},N,N);
 const mapT=tex(mapC),nrmT=tex(nrmC);[mapT,nrmT].forEach(t=>t.repeat.set(3,2));
 return {glass:P({map:mapT,emissiveMap:mapT,emissive:0x000000,normalMap:nrmT,normalScale:new THREE.Vector2(0.8,0.8),transparent:true,opacity:0.6,specular:0x9a9a9a,shininess:90,side:THREE.DoubleSide,depthWrite:false}),
  bulb:P({color:0xf2efe8,transparent:true,opacity:0.35,specular:0xffffff,shininess:100,emissive:0x000000,depthWrite:false}),led:new THREE.MeshBasicMaterial({color:0x8a8478})};})();
let g1L;
const entGl=new THREE.MeshBasicMaterial({color:0xdfe3e5,side:THREE.DoubleSide});   // 玄関ドアの窓（型ガラス調。昼夜で色を変える）
{const {X1,TX1,Z0:EZ0,TZ1,KZ0,Z1:EZ1,DY,KF,KW,sgA:gA,sgB:gB,drA,drB,drM,drH,sbZ0,sbD,twD}=EN,TVX=HOUSE.ldk.TVX,OAK=M.oakFloorMat;
 const zf=x=>KF[0][1]+(x-KF[0][0])*(KF[1][1]-KF[0][1])/(KF[1][0]-KF[0][0]),zb=x=>zf(x)-KW;   // 框の土間側の端・ホール側の端（Z）
 const accM=tmat(ic5023C,{specular:0x2a2724,shininess:22}),domaM=tmat(domaC,{specular:0x1a1a1a,shininess:10}),wood=P({color:0xc89e6e,specular:0x1c1813,shininess:18});   // wood：框・手摺（床に近い木の色）
 // 床と天井
 floorPoly([[CX0-e,PZ1],[TVX-0.05,PZ1],[TVX-0.05,zb(TVX-0.05)],[X1-e,zb(X1-e)],[X1-e,EZ0-e],[CX0-e,EZ0-e]],0,OAK,1.818);   // 廊下・玄関ホール（框まで）
 floorRect(X0-e,TX1,EZ0-e,TZ1+e,0,M.stoneKMat,1.818);floorRect(TX1,X1-e,EZ0-e,TZ1+e,0,OAK,1.818);                              // トイレ：石目調フローリング（ブラック、南北張り）。SG500の扉の下（トイレ側の壁の面）でホールのオークに切り替え
 floorPoly([[X1-e,zf(X1-e)],[TVX-0.05,zf(TVX-0.05)],[TVX-0.05,EZ1+e],[X0-e,EZ1+e],[X0-e,KZ0-e],[X1-e,KZ0-e]],DY,domaM,2.4);   // 土間・土間収納
 ceilRect(X0,TVX,TVZ,EZ0,H1,ceilMat,0.4);ceilRect(TX1,TVX,EZ0,TZ1,H1,ceilMat,0.4);ceilRect(X0,TVX,TZ1,EZ1,H1,ceilMat,0.4);   // 天井（2400。土間収納も。トイレの部分は除く）
 ceilRect(X0,TX1,EZ0,TZ1,H1,tmat(ic5021C,{emissive:0x1c1c1a}),1);                                                        // トイレの天井：IC-5021（照り返しの明るさは他の天井と同じ）
 // 框（木。上面は床の高さ、前の面は土間まで）
 {const x0=X1-0.01,x1=CX1+0.03,g=new THREE.ExtrudeGeometry(new THREE.Shape([[x0,zb(x0)],[x1,zb(x1)],[x1,zf(x1)],[x0,zf(x0)]].map(([x,z])=>new THREE.Vector2(x,z))),{depth:0.002-DY,bevelEnabled:false});
  g.rotateX(Math.PI/2);g.translate(0,0.002,0);s.add(new THREE.Mesh(g,wood));}   // 平面の形（x,z）を下へ押し出す
 // 壁
 wallAB(X1,EZ0,CX0,EZ0,0,H1,[],accM,true);                                                                   // 北：アクセント面（洗面所の南の壁の裏。HBの裏）
 wallAB(X1,zb(X1),X1,EZ0,0,H1,[{a:zb(X1)-gB,b:zb(X1)-gA,y1:0,y2:2.0,door:'frame'}],wm,true);                 // 西（トイレの東の壁）：ホール側。SG500の開口（額縁）
 wallAB(X1,KZ0,X1,zb(X1),DY,H1-DY,[],wm,{y:-DY,tile:domaM});                                                              // 西：土間側
 wallAB(X0,KZ0,X1,KZ0,DY,H1-DY,[],wm,{y:-DY,tile:domaM});                                                                 // 土間収納の北（トイレの南の壁の裏）
 wallAB(X0,EZ1,X0,KZ0,DY,H1-DY,[],wm,{y:-DY,tile:domaM});                                                                 // 土間収納の西（外壁）
 wallAB(CX1,EZ1,X0,EZ1,DY,H1-DY,[{a:CX1-drB,b:CX1-drA,y1:0,y2:drH}],wm,{y:-DY,tile:domaM});                              // 南（外壁）：玄関ドアの開口
 wallAB(CX1,PZ1,CX1,zb(CX1),0,H1,[{a:SZ1-0.77-PZ1,b:SZ1-PZ1,y1:0,y2:H1-0.03,door:'frame'}],wm,true);        // 東（LDKの西の壁の裏）：ホール側。SG11Hの裏（開口の南端は洗面所の南の壁の面にそろう）
 wallAB(CX1,zb(CX1),CX1,EZ1,DY,H1-DY,[],wm,{y:-DY,tile:domaM});                                                           // 東：土間側（ほとんどシューズボックスの裏）
 wbox(twD,0.1,EZ1-KZ0,X1-twD/2,H1-0.05,(KZ0+EZ1)/2,wm,1);                                                   // 土間収納の垂れ壁（H=100。ロールカーテンの後付け用）：土間収納の中に収まり、玄関側の面は手摺のある壁（トイレの東の壁）とそろう
 // トイレ（壁・床・天井。便器・カウンター収納・ペーパーホルダー・照明G1は手摺の後）：南はアクセント面IC-5025（リビングのテレビ面と同じ）、北・東・西はIC-5021（LDKと同じ）
 wallAB(X0,EZ0,TX1,EZ0,0,H1,[],M.plasterMat,true);wallAB(X0,TZ1,X0,EZ0,0,H1,[],M.plasterMat,true);buildWall(wallGroup(TX1,0,TZ1,Math.PI),TX1-X0,H1,[],M.accentMat,0.4,true);
 wallAB(TX1,EZ0,TX1,TZ1,0,H1,[{a:gA-EZ0,b:gB-EZ0,y1:0,y2:2.0,door:'outset',T:X1-TX1,toggle:'sg500'}],M.plasterMat,true);   // 東：SG500（アウトセットの引き戸。扉はトイレ側の面を南へ引く）
 // 手摺（I型、框の位置のトイレの壁。高さは仮）：白い丸棒（他の建具と同じ白）、両端はシルバーの受け（形は写真から）。受けは棒の端にかぶせる筒（棒より少し太い）と、そこから壁へ向かう腕。腕の幅は棒の径くらいで、棒の端側の面が壁へ向かって斜めに上がる（下の受けは上下反転）
 {const hx=X1+0.07,hz=6.08,y0=0.5,y1=1.1,hw=P({color:0xf6f5f2,specular:0x222222,shininess:20}),mt=P({color:0xbcbfc2,specular:0x6a6c6e,shininess:38});   // mt：受け（シルバー）
  const c=new THREE.Mesh(new THREE.CylinderGeometry(0.0175,0.0175,y1-y0,24),hw);c.position.set(hx,(y0+y1)/2,hz);s.add(c);
  [[y1,1],[y0,-1]].forEach(([ye,k])=>{const sh=new THREE.Shape([[0,-0.009],[0,0.027],[0.067,0.0105],[0.067,-0.001]].map(([dx,dy])=>new THREE.Vector2(dx,ye+k*dy)));   // 腕を横から見た形（壁からの距離, 高さ。面取りで外へ3mm広がる）
   const m=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth:0.026,bevelEnabled:true,bevelThickness:0.003,bevelSize:0.003,bevelSegments:2}),mt);m.position.set(X1,0,hz-0.013);s.add(m);
   const cg=new THREE.CylinderGeometry(0.019,0.019,0.04,24),ps=cg.attributes.position;for(let i=0;i<ps.count;i++){const lx=ps.getX(i),ly=ps.getY(i);ps.setY(i,ly>0?0.03-0.247*(0.07+k*lx):-0.02);}cg.computeVertexNormals();   // 棒の端にかぶせる筒（棒の端から20下から）。上面は腕の斜めの面とひと続き（下の受けは180°回すので、xの向きを反転して計算）
   const cp=new THREE.Mesh(cg,mt);cp.position.set(hx,ye,hz);if(k<0)cp.rotation.z=Math.PI;s.add(cp);});}
 // 便器：パナソニック アラウーノ L150（ホワイト）。南の壁に寄せ、東西はトイレの中心（仮）。寸法は寸法図から：幅383・奥行700（壁から720。本体の後ろは壁から20）・高さ540（後部）、前の高さ437（ふたの上面）・385（ふたの下端＝胴の上端）
 // 形：下の胴は床に向かってすぼまる（幅383→295、奥行700→610。正面図・側面図から）。その上に、ふた（前は厚さ48、上面は後ろで山なりに上がって540、下の縁は後ろ寄りで本体の側面に沿って上がる。側面図と写真から）と、ふたの下・後ろの本体（後ろの上の角は丸い）
 // ふたと本体・胴のすき間は暗い線（3mm）。左（西）の側面に操作部（窓・ボタン・吹出口。デフォルメ、文字は描かない）と、側面の板の継ぎ目（両側）、ふたの上の後ろ寄り（東）にセンサー窓（止水栓・ホースは付けない）
 {const tg=new THREE.Group();tg.position.set((X0+TX1)/2,0,TZ1-0.02);tg.rotation.y=Math.PI;s.add(tg);   // 子の座標：z＝本体の後ろから前（北）へ、x＝便器の左（西）が正、y＝床から上
  const TW=0.383,TD=0.70,TZC=0.552,TRC=0.03,YR=0.385,ZL=0.09,ss=t=>t*t*(3-2*t);   // TZC：前の半楕円の始まり、TRC：後ろの角の丸み、YR：胴の上端、ZL：ふたの後ろの端
  const hwF=(w,d,zc,z)=>z<0||z>d?-1:z<TRC?w/2-TRC+Math.sqrt(Math.max(0,TRC*TRC-(TRC-z)**2)):z<=zc?w/2:w/2*Math.sqrt(Math.max(0,1-((z-zc)/(d-zc))**2)),hw=z=>Math.max(0,hwF(TW,TD,TZC,z));   // 平面の形の、zの位置での半幅（形の外は-1）
  const T=z=>z<0.2?0.54:z>0.52?0.437:0.437+0.103*(1-ss((z-0.2)/0.32));   // ふたの上面
  const Tb=z=>z>=0.225?0.389:0.389+0.141*(1-Math.pow(Math.max(0,(z-0.1)/0.125),2.5));   // ふたの下の縁（側面図の、本体との境の線から）
  const ch=z=>0.437+0.1*Math.sqrt(Math.max(0,1-((ZL-z)/ZL)**2));   // 本体の後ろの上の角（丸い）
  const wt=P({color:0xf4f4f2,specular:0x3c3c3c,shininess:55}),gapM=L(0x6e6e6c),dk=L(0x3a3a3c);
  const mk=(pos,idx,m)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();const o=new THREE.Mesh(g,m);tg.add(o);return o;};
  {const M=112,NL=4,pos=[],idx=[];   // 下の胴：高さごとの平面の形（輪）をつなぐ。後ろは垂直
   for(let j=0;j<=NL;j++){const t=j/NL,y=YR*t,w=0.295+(TW-0.295)*t,d=0.61+(TD-0.61)*t,zc=TZC*d/TD,cz=d/2;
    for(let i=0;i<M;i++){const a=i/M*Math.PI*2,dx=Math.cos(a),dz=Math.sin(a);let lo=0,hi=d;for(let k=0;k<28;k++){const r=(lo+hi)/2,h=hwF(w,d,zc,cz+dz*r);if(h>=0&&Math.abs(dx*r)<=h)lo=r;else hi=r;}pos.push(dx*lo,y,cz+dz*lo);}}
   for(let j=0;j<NL;j++)for(let i=0;i<M;i++){const a=j*M+i,b=j*M+(i+1)%M,c=(j+1)*M+(i+1)%M,d=(j+1)*M+i;idx.push(a,c,b,a,d,c);}
   mk(pos,idx,wt);}
  const loftZ=(zl,hf,yb,yt,rt,rb,m)=>{const A=4,N=4*(A+1),pos=[],idx=[];   // zの位置ごとの断面（角を丸めた長方形）をつなぐ。後ろの端は平らな面でふさぐ（前の端は幅0で閉じる）
   const sec=z=>{const h=hf(z),b=yb(z),t=yt(z),q=Math.max(0,Math.min(rt,h,(t-b)/2)),p=Math.max(0,Math.min(rb,h,(t-b)/2)),o=[],arc=(cx,cy,r,a0)=>{for(let k=0;k<=A;k++){const a=a0+k/A*Math.PI/2;o.push([cx+r*Math.cos(a),cy+r*Math.sin(a)]);}};
    arc(h-p,b+p,p,-Math.PI/2);arc(h-q,t-q,q,0);arc(-h+q,t-q,q,Math.PI/2);arc(-h+p,b+p,p,Math.PI);return o;};
   zl.forEach(z=>sec(z).forEach(([x,y])=>pos.push(x,y,z)));
   for(let j=0;j<zl.length-1;j++)for(let k=0;k<N;k++){const a=j*N+k,b=j*N+(k+1)%N,c=(j+1)*N+(k+1)%N,d=(j+1)*N+k;idx.push(a,b,c,a,c,d);}
   const s0=sec(zl[0]),c0=pos.length/3;let cx=0,cy=0;s0.forEach(([x,y])=>{cx+=x/N;cy+=y/N;});pos.push(cx,cy,zl[0]);s0.forEach(([x,y])=>pos.push(x,y,zl[0]));for(let k=0;k<N;k++)idx.push(c0,c0+1+(k+1)%N,c0+1+k);
   return mk(pos,idx,m);};
  const ZC=[];for(let i=0;i<=8;i++){ZC.push(TRC*(1-Math.cos(i/8*Math.PI/2)));ZC.push((ZL-0.004)*(1-Math.cos(i/8*Math.PI/2)));}for(let z=0.012;z<TZC;z+=0.008)ZC.push(z);for(let i=0;i<=16;i++)ZC.push(TZC+(TD-TZC)*Math.sin(i/16*Math.PI/2));ZC.sort((a,b)=>a-b);   // 断面を置くzの位置（丸みと前の半楕円で細かく）
  const zr=(a,b,ex)=>[a,...ZC.filter(z=>z>a+0.0008&&z<b-0.0008),...(ex||[]),b].sort((p,q)=>p-q);
  loftZ(zr(0,TD,[ZL-0.004]),hw,()=>YR,z=>z<ZL-0.0038?ch(z):Math.max(YR+0.001,Tb(z)-0.003),0.012,0.001,wt);   // 本体（ふたの下・後ろ）
  loftZ(zr(ZL,TD),hw,Tb,T,0.014,0.004,wt);   // ふた
  loftZ(zr(ZL-0.0035,TD-0.003),z=>Math.max(0,hwF(TW-0.006,TD-0.003,TZC,z)),()=>YR-0.002,z=>Tb(z)+0.002,0,0,gapM);   // すき間の奥（3mm内側の暗い芯）
  lbox(tg,0.046,0.002,0.02,-0.124,0.5405,0.195,0xd4d6d8);   // ふたの上のセンサー窓（正面図・写真から）
  lbox(tg,0.002,0.08,0.12,TW/2+0.0008,0.46,0.09,0xebebea);   // 操作部の窓（左の側面）
  lbox(tg,0.003,0.022,0.006,TW/2+0.0012,0.484,0.125,decalMat(P({color:0xd6d8da})));   // 窓の中の縦長の表示
  [0.04,0.05].forEach(z=>lbox(tg,0.003,0.03,0.005,TW/2+0.0012,0.448,z,decalMat(dk.clone())));   // ボタン（縦長2つ）
  [0,1,2].forEach(k=>lbox(tg,0.003,0.0025,0.05,TW/2+0.0012,0.405+k*0.005,0.09,dk));   // 吹出口（横のすじ）
  [1,-1].forEach(k=>{lbox(tg,0.0015,0.0015,0.213,k*(TW/2+0.0004),0.392,0.1365,0xcfcfcd);const v=lbox(tg,0.0015,0.3875,0.0015,k*(0.1695+0.0005),YR/2,0.243,0xcfcfcd);v.rotation.z=-k*Math.atan(0.044/YR);});   // 側面の板の継ぎ目（横・縦）
 }
 // カウンター収納（奥の壁＝西の壁）：カウンターと収納の扉の面材はドレッサー・シューズボックスと同じグレイス・シリーズのグレージュの木目（grM：面、grE：小口。木目は横）、収納の箱は白。南の壁から北の壁まで通しのカウンターと、北寄りに床からの収納（扉1枚、取っ手なし。北の壁から100あける）。形は写真から、寸法は仮
 // 寸法（仮）：カウンターは奥行150・高さ800（上面）・厚さ35、収納は幅400で、扉の面はカウンターの前の面から5mm奥
 {const CD=0.15,CT=0.8,CTH=0.035,KW=0.4,KZ0=EZ0+0.1,KZ1=KZ0+KW,ky=CT-CTH,len=TZ1-EZ0,KF=X0+CD-0.005;
  const gp=(w,h,x,y,z,f)=>{const geo=uvPlane(w,h,R()*2,R()*2,0.7,0.7);f(geo);const p=new THREE.Mesh(geo,grM);p.position.set(x,y,z);s.add(p);return p;};   // 木目の面（f：向きを変える）
  lboxOpen(s,CD,CTH,len,X0+CD/2,CT-CTH/2,(EZ0+TZ1)/2,grE,[0,2,3]);   // カウンター（小口の色の芯。上面・下面・前の面は木目の面を置くので作らない）
  gp(len,CD,X0+CD/2,CT,(EZ0+TZ1)/2,g=>{g.rotateZ(Math.PI/2);g.rotateX(-Math.PI/2);});gp(len,CD,X0+CD/2,ky,(EZ0+TZ1)/2,g=>{g.rotateZ(Math.PI/2);g.rotateX(Math.PI/2);});gp(len,CTH,X0+CD,CT-CTH/2,(EZ0+TZ1)/2,g=>g.rotateY(Math.PI/2));   // 上面・下面・前の面
  box(CD-0.023,ky,KW,X0+(CD-0.023)/2,ky/2,(KZ0+KZ1)/2,P({color:0xf6f5f2,specular:0x222222,shininess:20}));   // 収納の本体（白。他の建具と同じ）
  lboxOpen(s,0.018,ky-0.006,KW-0.004,KF-0.009,(ky-0.006)/2+0.003,(KZ0+KZ1)/2,grE,[0]);gp(KW-0.004,ky-0.006,KF,(ky-0.006)/2+0.003,(KZ0+KZ1)/2,g=>g.rotateY(Math.PI/2));}   // 収納の扉（周りに細いすき間）
 // ペーパーホルダー：カワジュン SC-473-XK（ブラストブラック）×1。カウンターの下の壁、カバーの上端は床から709、芯は南の壁から750
 // 寸法は寸法図から：巾144・出109、壁の座（巾41×高30、ネジのピッチ28。カバーの下に隠れる）、カバーは厚さ3の板で、壁ぎわは平らで前で下へ28下がる
 // 紙を掛ける枠は厚さ3の平らな板1枚（写真から）：座から斜め（約42°）に下りる面の中で、上の縁（座につながる）・左（南）の脚・紙管を通す下の棒（全巾）がひと続きで、右（北）は開いている（右差し）。下の棒の右端に小さな立ち上がり。内側の角は丸い
 {const g=new THREE.Group();g.position.set(X0,0.709,TZ1-0.75);g.rotation.y=Math.PI/2;s.add(g);   // 子の座標：z＝壁から室内（東）、x＝壁に沿って北が正、y＝カバーの上端から上（mm で指定して m に直す）
  const bk=P({color:0x1c1c1c,specular:0x1a1a1a,shininess:12}),HW=0.144,mm=v=>v/1000;
  {const C=[[0,-6],[6,-1.5],[14,0],[52,-3.5],[78,-8],[94,-14],[103,-20],[109,-28]],sh=new THREE.Shape([...C.map(([z,y])=>new THREE.Vector2(mm(z),mm(y))),...C.slice().reverse().map(([z,y])=>new THREE.Vector2(mm(z),mm(y-3)))]);   // カバー：横から見た形（z,y）
   const geo=new THREE.ExtrudeGeometry(sh,{depth:HW,bevelEnabled:false,curveSegments:8});geo.rotateY(-Math.PI/2);const o=new THREE.Mesh(geo,bk);o.position.x=HW/2;g.add(o);}
  lbox(g,mm(41),mm(30),mm(6),0,mm(-18),mm(3),bk);   // 壁の座
  {const f=new THREE.Group();f.position.set(0,mm(-11),mm(16));f.rotation.x=THREE.MathUtils.degToRad(42);g.add(f);   // 枠の面：座の上から斜めに下りる（子の座標：x＝壁に沿って、z＝面に沿って下へ、y＝面の上側）
   const sh=new THREE.Shape(),r=4,V=(x,y)=>new THREE.Vector2(mm(x),mm(y));   // 枠の形（x, 面に沿った距離。mm）
   sh.moveTo(mm(-72),0);sh.lineTo(mm(18),0);sh.lineTo(mm(18),mm(10));sh.lineTo(mm(-59+r),mm(10));sh.quadraticCurveTo(mm(-59),mm(10),mm(-59),mm(10+r));sh.lineTo(mm(-59),mm(67-r));sh.quadraticCurveTo(mm(-59),mm(67),mm(-59+r),mm(67));
   sh.lineTo(mm(72),mm(67));sh.lineTo(mm(72),mm(85));sh.lineTo(mm(-72+2),mm(85));sh.quadraticCurveTo(mm(-72),mm(85),mm(-72),mm(85-2));sh.lineTo(mm(-72),0);
   const geo=new THREE.ExtrudeGeometry(sh,{depth:mm(3),bevelEnabled:false,curveSegments:6});geo.rotateX(Math.PI/2);f.add(new THREE.Mesh(geo,bk));   // 板（厚さ3。面の上側から下へ）
   lbox(f,mm(10),mm(14),mm(3),mm(67),mm(7),mm(83.5),bk);}   // 下の棒の右端の立ち上がり（紙が抜けないように）
  const roll=new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.055,0.114,40),L(0xf2f1ee));roll.rotation.z=Math.PI/2;roll.position.set(0,mm(-72),mm(66));g.add(roll);   // ペーパー（中心は寸法図の点線の円から）
  [-1,1].forEach(k=>{const c=new THREE.Mesh(new THREE.RingGeometry(0.017,0.02,32),decalMat(P({color:0xb3a690})));c.rotation.y=k*Math.PI/2;c.position.set(k*0.0575,mm(-72),mm(66));g.add(c);const h=new THREE.Mesh(new THREE.CircleGeometry(0.017,32),decalMat(P({color:0x2a2826})));h.rotation.y=k*Math.PI/2;h.position.set(k*0.0574,mm(-72),mm(66));g.add(h);});}   // ペーパーの芯（紙管の縁と穴）
 // G1：ペンダント オーデリック OP252988LR（スモークグレーの波打ったガラスφ130、下は開いている。LED電球クリアミニクリプトン形4W E17・電球色2700K・312lm）。引掛シーリングにコード収納フランジ（黒）
 // 位置：芯が南の壁から300・西の壁から150（仮）。高さは全高（天井からガラスの下端）800（仮。全高507〜1307で調整できる。ショールームの写真から）
 // 寸法：ガラスはφ136・高さ142（カタログのφ130より少し膨らませて丸みを出した（ユーザーの指示）。最も太いのは上から52%、上の口と下の口φ114は写真から）。上に黒いキャップ（φ28）とパイプ（φ7。キャップと合わせて85、ガラスと合わせて高227）。フランジはφ60×H92（仮。写真の比率から）
 // 光：ガラスを通る光は、波打ったガラスで揺らいだ網目の模様になる（光源からの向きで模様が決まる。zPC・zCau）。下の口から出る光はそのまま（ライト下端より下の壁と床）
 {const lx=X0+0.15,lz=TZ1-0.3,GB=H1-0.8,GT=GB+0.142,blk=P({color:0x151515,specular:0x2a2a2a,shininess:30});
  const cyl=(r0,r1,h,y,m,seg)=>{const c=new THREE.Mesh(new THREE.CylinderGeometry(r0,r1,h,seg||28),m);c.position.set(lx,y,lz);s.add(c);return c;};
  cyl(0.03,0.03,0.092,H1-0.046,blk,40);cyl(0.0025,0.0025,(H1-0.092)-(GT+0.085),(H1-0.092+GT+0.085)/2,blk,10);cyl(0.0035,0.0035,0.065,GT+0.0525,blk,12);cyl(0.012,0.014,0.022,GT+0.009,blk);   // フランジ・コード・パイプ・キャップ
  cyl(0.012,0.012,0.063,GT-0.0315,blk,24);cyl(0.009,0.009,0.006,GT-0.066,L(0xc9c6bf),20);   // ソケット（ガラスの中）・口金
  const lathe=(pts,m,y)=>{const o=new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r,h])=>new THREE.Vector2(r,h)),48),m);o.position.set(lx,y,lz);s.add(o);return o;};
  {const pts=[],yc=-0.074;for(let i=0;i<=16;i++){const yy=yc*(1-Math.cos(i/16*Math.PI/2));pts.push([0.068*Math.sqrt(Math.max(0,1-((yy-yc)/0.0756)**2)),yy]);}   // ガラス：上半分（楕円）
   for(let i=1;i<=10;i++){const yy=yc-0.068*i/10;pts.push([0.068*Math.sqrt(Math.max(0,1-((yy-yc)/0.1248)**2)),yy]);}   // 下半分（縦長の楕円。下の口φ114）
   pts.reverse();lathe(pts,g1M.glass,GT);
   const rim=new THREE.Mesh(new THREE.TorusGeometry(0.057,0.0022,8,48),g1M.glass);rim.rotation.x=Math.PI/2;rim.position.set(lx,GB,lz);s.add(rim);}   // 下の口の縁
  lathe([[0,-0.071],[0.01,-0.069],[0.016,-0.062],[0.0175,-0.052],[0.0165,-0.04],[0.0125,-0.022],[0.009,-0.008],[0.0085,0]],g1M.bulb,GT-0.069);   // 電球（ミニクリプトン形φ35、クリア）
  cyl(0.004,0.004,0.024,GT-0.114,g1M.led,12);   // 電球の中の発光部
  g1L=new THREE.PointLight(0xffc68e,0,4.5,1.5);g1L.position.set(lx,GT-0.114,lz);g1L.userData.caustic=true;s.add(g1L);}   // 光源（発光部の中心。電球の器具のペンダント・B3と同じ距離と減衰）
 // 土間収納：西の壁に棚板（奥行410は平面図から、高さは土間から1820）、その下に南北方向のハンガーパイプ（高さは仮）
 {const sy=DY+1.82-0.01,py=DY+1.72,sd=0.41,px=X0+0.25,pipeM=P({color:0xc9c9c7,specular:0x888888,shininess:60});
  box(sd,0.02,EZ1-KZ0,X0+sd/2,sy,(KZ0+EZ1)/2,FIT);
  const pc=new THREE.Mesh(new THREE.CylinderGeometry(0.0125,0.0125,EZ1-KZ0,16),pipeM);pc.rotation.x=Math.PI/2;pc.position.set(px,py,(KZ0+EZ1)/2);s.add(pc);
  [KZ0+0.005,EZ1-0.005].forEach(z=>box(0.05,0.05,0.01,px,py,z,pipeM));}   // パイプの受け（両端の壁）
 // シューズボックス：グレイス・シリーズ GM143R（W1800、床から天井まで、面材はドレッサーと同じグレージュ）。東の壁沿い、南の壁から北へ、正面は西
 // 構成（正面に向かって左＝北から）：左は上に吊戸（扉2枚）・中央にカウンター（黒の御影石）のニッチ・下に扉2枚、右は上に吊戸（扉2枚）・下にトール扉2枚。寸法は立面図の比率から
 // 側板は右（南の壁側）だけ。左（北）は側板なし（ニッチは横が開き、吊戸・下の扉の部分は本体の端の面が木目）。鏡はなし
 {const g=new THREE.Group();g.position.set(CX1,0,sbZ0);g.rotation.y=-Math.PI/2;s.add(g);   // 子の座標：x＝北端から南へ（正面に向かって右）、y＝上（ホールの床から）、z＝壁から手前（西）へ
  const W=EZ1-sbZ0,D=sbD,H=H1-0.002,B=0.057,YU=1.911,YC=0.862,TC=0.023,XM=0.9,T=0.02,G=0.003;   // B：台輪、YU：吊戸の下端、YC：カウンターの上面、TC：カウンターの厚さ、XM：左右の境、T：側板、G：扉のすき間
  const top=tmat(nsTopC,{specular:0x3a3a3a,shininess:45});texR(top,2,1);
  const front=(x0,x1,y0,y1,zf)=>{lboxOpen(g,x1-x0,y1-y0,0.018,(x0+x1)/2,(y0+y1)/2,zf-0.009,grE,[4]);const p=new THREE.Mesh(uvPlane(x1-x0,y1-y0,R()*2,R()*2,0.7,0.7),grM);p.position.set((x0+x1)/2,(y0+y1)/2,zf);g.add(p);};   // 扉（木目は横。ドレッサーと同じ。箱の前の面は作らず、そこへ木目の面を置く）
  const side=(x0,x1,y0,y1,z0,z1)=>{lboxOpen(g,x1-x0,y1-y0,z1-z0,(x0+x1)/2,(y0+y1)/2,(z0+z1)/2,grE,[0,1]);[x0,x1].forEach((xx,k)=>{const p=new THREE.Mesh(uvPlane(z1-z0,y1-y0,R()*2,R()*2,0.7,0.7),grM);p.rotation.y=k?Math.PI/2:-Math.PI/2;p.position.set(xx,(y0+y1)/2,(z0+z1)/2);g.add(p);});};   // 木目の側板（両面。箱の左右の面は作らず、そこへ木目の面を置く）
  const knob=(x,y)=>{lbox(g,0.012,0.06,0.012,x,y,D+0.016,HC);[-1,1].forEach(k=>lbox(g,0.01,0.01,0.012,x,y+k*0.022,D+0.006,HC));};   // 縦の小さな取っ手（扉の合わせ目の両側）
  side(W-T,W,0,H,0,D);side(0,0.004,YU,H,0,D);side(0,0.004,0,YC-TC,0,D);   // 右の側板（床から天井まで）、左の端の面（吊戸・下の扉の部分。薄い木目の板）
  lbox(g,W-T-0.004,H-YU,D-0.02,(W-T+0.004)/2,(YU+H)/2,(D-0.02)/2,grE);lbox(g,XM-0.014,YC-TC-B,D-0.02,(0.004+XM-0.01)/2,(B+YC-TC)/2,(D-0.02)/2,grE);lbox(g,W-T-XM-0.01,YU-B,D-0.02,(XM+0.01+W-T)/2,(B+YU)/2,(D-0.02)/2,grE);   // 本体（扉の奥）
  lbox(g,W-T-0.004,B,D-0.006,(W-T+0.004)/2,B/2,(D-0.006)/2,grE);   // 台輪（扉の下の帯。少し奥）
  side(XM-0.01,XM+0.01,YC,YU,0,D);front(0,XM-0.01,YC,YU,0.02);   // ニッチの右の側板と奥の面（木目）
  lbox(g,XM-0.01,TC,D+0.005,(XM-0.01)/2,YC-TC/2,(D+0.005)/2,top);   // カウンター（黒の御影石。左端まで）
  lbox(g,XM-0.01,0.004,D,(XM-0.01)/2,YU-0.002,D/2,0x1c1c1c);   // 吊戸の下面（ニッチの天井）は黒
  [[0.004,XM],[XM,W-T]].forEach(([x0,x1])=>{const xm=(x0+x1)/2;front(x0+G,xm-G/2,YU+G,H-G,D);front(xm+G/2,x1-G,YU+G,H-G,D);knob(xm-0.033,YU+0.05);knob(xm+0.033,YU+0.05);});   // 吊戸（4枚、取っ手は下）
  {const xm=(0.004+XM)/2;front(0.004+G,xm-G/2,B+G,YC-TC-G,D);front(xm+G/2,XM-G,B+G,YC-TC-G,D);knob(xm-0.033,YC-TC-0.05);knob(xm+0.033,YC-TC-0.05);}   // 左下（2枚、取っ手は上）
  {const xm=(XM+W-T)/2;front(XM+G,xm-G/2,B+G,YU-G,D);front(xm+G/2,W-T-G,B+G,YU-G,D);knob(xm-0.033,0.81);knob(xm+0.033,0.81);}}   // 右のトール扉（2枚）
 // 玄関ドア（親子扉）：J20（e・エントリー２、上部採光、格子窓の北欧風デザイン）、カラーはスモークナット（JN、浮造り調）。子扉は西（吊元は西）、親扉は東（吊元は東）
 // 寸法：枠 W1235×H2330（カタログ）。扉の幅はカタログの DW885・KDW286 の比で枠の内側を分ける。窓・額縁・金物の位置は、カタログ写真（片開き。外はスモークナット、内はC2クラス）から、ガラスの中心を基準に1px＝4mmで換算
 // 外：格子窓（6枚）と窓の額縁、下部の四角い額縁、eハンドル61型、丁番。内：平らな面に窓の額縁、ドアクローザー、ドアガード、サムターン2つ、取っ手（金物は黒）。子扉は窓なしの平らな扉
 {const T=0.6,zi=EZ1,zd=EZ1+0.12,DT=0.05,y0=DY,y1=DY+drH,w=drB-drA,PX=0.004,hd=P({color:0x262422,specular:0x3a3734,shininess:30,side:THREE.DoubleSide});   // T：木目の1枚の大きさ、DT：扉の厚さ、PX：写真の1px、hd：金物（黒）
  const snC=cv((x,W,H)=>{const im=x.createImageData(W,H),D=im.data;for(let y=0;y<H;y++)for(let i=0;i<W;i++){const u=i/W,v=y/H,wp=vn(u*4,v*2,4,2),n1=vn(u*90+wp*1.5,v*3,90,3),n2=vn(u*300+wp*3,v*6,300,6),n3=vn(u*5+wp,v*2,5,2);   // スモークナットの木目（縦の細かい筋。ピクセル単位で計算。色は見本の平均）
   const k=0.8+0.16*n1+0.14*n2+0.1*n3-(n2>0.75?0.1:0)-(n1>0.8?0.06:0),o=(y*W+i)*4;D[o]=Math.min(255,122*k);D[o+1]=Math.min(255,91*k);D[o+2]=Math.min(255,82*k);D[o+3]=255;}x.putImageData(im,0,0);},512,512);
  const snM=tmat(snC,{specular:0x1c1714,shininess:12,bumpMap:tex(snC),bumpScale:0.5}),snE=P({color:0x684d44,specular:0x1c1714,shininess:12}),fb=(bw,bh,bd,x,y,z)=>wbox(bw,bh,bd,x,y,z,snM,T);   // snM：木目（浮造り調の凹凸は木目の濃淡から）、snE：小口・扉の芯、fb：木目の箱
  fb(0.04,drH,0.14,drA+0.02,(y0+y1)/2,zi+0.07);fb(0.04,drH,0.14,drB-0.02,(y0+y1)/2,zi+0.07);fb(w,0.04,0.14,(drA+drB)/2,y1-0.02,zi+0.07);fb(w,0.03,0.14,(drA+drB)/2,y0+0.015,zi+0.07);   // 枠（縦・上・下とも木目）
  const a0=drA+0.04,b0=drB-0.04,yt=y1-0.04,yb=y0+0.03,p0=drM+0.003,gx=p0+113.25*PX,gy=yt-151.5*PX;   // a0〜b0：枠の内側、p0：親扉の戸先、gx,gy：窓のガラスの中心（写真：戸先から113px、扉の上端から151px）
  const EX=px=>gx+(px-235.25)*PX,EY=py=>gy-(py-215.5)*PX,IX=px=>gx+(166.5-px)*PX,IY=py=>gy-(py-219.5)*PX;   // 写真の座標 → 家の座標（E：外の写真、I：内の写真。内は左右が逆）
  const face=(x0,x1,ya,yc,hole,z,dir)=>{const m=dir<0?-1:1,V=(u,v)=>new THREE.Vector2(m*u,v),sh=new THREE.Shape([V(x0,ya),V(x1,ya),V(x1,yc),V(x0,yc)]);if(hole)sh.holes.push(new THREE.Path([V(hole[0],hole[2]),V(hole[1],hole[2]),V(hole[1],hole[3]),V(hole[0],hole[3])]));
   const g=new THREE.ShapeGeometry(sh);if(dir<0)g.rotateY(Math.PI);g.translate(0,0,z);const p=g.attributes.position,uv=g.attributes.uv;for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/T,p.getY(i)/T);s.add(new THREE.Mesh(g,snM));};   // 扉の面（dir：+1＝外、−1＝内。木目は家の座標から取り、穴は窓）
  const ring=(o,n,z,d)=>{fb(n[0]-o[0],o[3]-o[2],d,(o[0]+n[0])/2,(o[2]+o[3])/2,z);fb(o[1]-n[1],o[3]-o[2],d,(n[1]+o[1])/2,(o[2]+o[3])/2,z);fb(n[1]-n[0],n[2]-o[2],d,(n[0]+n[1])/2,(o[2]+n[2])/2,z);fb(n[1]-n[0],o[3]-n[3],d,(n[0]+n[1])/2,(n[3]+o[3])/2,z);};   // 額縁（外の四角oと内の四角nのあいだ。[x0,x1,y0,y1]）
  const zo=zd+DT/2,zn=zd-DT/2,ym=(yb+yt)/2,hy=yt-yb;   // zo：扉の外の面、zn：内の面
  box(drM-0.003-a0,hy,DT-0.006,(a0+drM-0.003)/2,ym,zd,snE);face(a0,drM-0.003,yb,yt,null,zn,-1);face(a0,drM-0.003,yb,yt,null,zo,1);   // 子扉
  const ws=[EX(182),EX(288.5),EY(312),EY(119)],[wx0,wx1,wy0,wy1]=ws,wc=(wx0+wx1)/2;   // 窓（ガラスの範囲）
  box(wx0-p0,hy,DT-0.006,(p0+wx0)/2,ym,zd,snE);box(b0-wx1,hy,DT-0.006,(wx1+b0)/2,ym,zd,snE);box(wx1-wx0,wy0-yb,DT-0.006,wc,(yb+wy0)/2,zd,snE);box(wx1-wx0,yt-wy1,DT-0.006,wc,(wy1+yt)/2,zd,snE);   // 親扉の芯（窓の穴の周り。面から3mm内側に止める：近すぎると深さの精度が低い端末で面とちらつく）
  face(p0,b0,yb,yt,ws,zn,-1);face(p0,b0,yb,yt,ws,zo,1);   // 親扉の面
  {const gl=new THREE.Mesh(new THREE.PlaneGeometry(wx1-wx0,wy1-wy0),entGl);gl.position.set(wc,(wy0+wy1)/2,zd);s.add(gl);}   // ガラス（両面）
  box(0.018,wy1-wy0,0.014,EX(235),(wy0+wy1)/2,zd,snE);[182,247].forEach(py=>box(wx1-wx0,0.022,0.014,wc,EY(py),zd,snE));   // 格子（縦1本・横2本）
  {const o=[EX(171),EX(298.5),EY(320),EY(108)],t=0.03;ring(o,[o[0]+t,o[1]-t,o[2]+t,o[3]-t],zo+0.004,0.008);}   // 外：窓の額縁（幅30・出8）
  {const o=[EX(171),EX(298.5),EY(582),EY(351)],t=0.03;ring(o,[o[0]+t,o[1]-t,o[2]+t,o[3]-t],zo+0.004,0.008);}   // 外：下部の四角い額縁
  ring([IX(231),IX(101),IY(327),IY(115)],ws,zn-0.005,0.01);   // 内：窓の額縁（ガラスの縁まで。出10）
  box(0.012,hy,0.03,drM,ym,zd,0x2a211d);[zn-0.002,zo+0.002].forEach(z=>box(0.005,hy,0.001,drM,ym,z,0x2a211d));   // 扉どうしのすき間：芯の中に濃い板（すき間から外が見えないように）と、両面に濃い線（斜めから見てもすき間が線に見えるように）
  // 外：eハンドル61型（上下の台座と、その間の握り。握りは中ほどで細く、前へ少しふくらむ）
  {const hx=EX(143.5),hT=EY(317),hB=EY(480),tB=hT-0.116,bT=hB+0.1;box(0.045,hT-tB,0.055,hx,(hT+tB)/2,zo+0.0275,hd);box(0.045,bT-hB,0.055,hx,(bT+hB)/2,zo+0.0275,hd);
   const n=16,ps=[],ix=[];for(let i=0;i<=n;i++){const t=i/n,y=tB+0.01-t*(tB-bT+0.02),b=Math.sin(Math.PI*t),hw=(0.038-0.01*b)/2,zc=zo+0.035+0.012*b;[[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([a,c])=>ps.push(hx+a*hw,y,zc+c*0.011));}
   for(let i=0;i<n;i++)for(let k=0;k<4;k++){const a=i*4+k,b=i*4+(k+1)%4;ix.push(a,b,b+4,a,b+4,a+4);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(ps,3));g.setIndex(ix);g.computeVertexNormals();s.add(new THREE.Mesh(g,hd));}   // 握り（断面の四角を上から下へつなぐ）
  [[0.172,0.304],[0.464,0.596],[1.952,2.076]].forEach(([u,v])=>[a0+0.008,b0-0.008].forEach(x=>box(0.016,v-u,0.02,x,yt-(u+v)/2,zo+0.01,hd)));   // 外：丁番（子扉は西、親扉は東。写真の位置）
  // 内：ドアクローザー（吊元寄りの上。本体は扉に、アームは枠の上の下面へ）
  {const cx0=IX(122),cx1=IX(75),cy0=IY(91),cy1=IY(75);box(cx1-cx0,cy1-cy0,0.05,(cx0+cx1)/2,(cy0+cy1)/2,zn-0.025,hd);const ax=IX(150);box(cx1-0.015-ax,0.014,0.014,(ax+cx1-0.015)/2,yt-0.012,zi+0.045,hd);box(0.016,yt-cy1,0.016,cx1-0.015,(cy1+yt)/2,zi+0.045,hd);box(0.05,0.012,0.04,ax,yt-0.006,zi+0.03,hd);}
  {const gx0=IX(265),gx1=IX(237),gyc=IY(274.5);box(0.04,0.06,0.03,gx0+0.02,gyc,zn-0.015,hd);box(gx1-gx0,0.012,0.012,(gx0+gx1)/2,gyc,zn-0.036,hd);box(0.012,0.035,0.035,drM-0.012,gyc,zn-0.0175,hd);}   // 内：ドアガード（親扉の戸先側。受けは子扉に）
  [326,479].forEach(py=>{const x=IX(260),y=IY(py),r=new THREE.Mesh(new THREE.CylinderGeometry(0.022,0.022,0.01,28),hd);r.rotation.x=Math.PI/2;r.position.set(x,y,zn-0.005);s.add(r);box(0.012,0.034,0.014,x,y,zn-0.017,hd);});   // 内：サムターン（上下2つ。丸座とつまみ）
  {const hx=IX(248.5),bx=IX(258),hT=IY(350),hB=IY(462);box(0.045,0.1,0.045,bx,hT-0.05,zn-0.0225,hd);box(0.045,0.108,0.045,bx,hB+0.054,zn-0.0225,hd);box(0.02,hT-hB,0.02,hx,(hT+hB)/2,zn-0.035,hd);}}}   // 内：取っ手（上下の台座と握り）
// D1：洗面所のダウンライト パナソニック RMN(P1)（LEDフラットランプφ70・昼白色5000K・440lm・白枠・埋込穴φ100）。東西は電気図面の位置、南北は洗面所の南北の壁の中心
const d1Em=new THREE.MeshBasicMaterial({color:0xd9d8d4}),D1X=-1.32,D1Z=(SZ0+SZ1)/2;
{const ring=new THREE.Mesh(new THREE.CylinderGeometry(0.058,0.058,0.004,32),L(0xf7f7f5));ring.position.set(D1X,H1-0.002,D1Z);s.add(ring);
 const lamp=new THREE.Mesh(new THREE.CylinderGeometry(0.044,0.044,0.0025,32),d1Em);lamp.position.set(D1X,H1-0.00525,D1Z);s.add(lamp);}
const d1=new THREE.SpotLight(0xfff3e8,0,5,THREE.MathUtils.degToRad(62),0.8,1.3);d1.position.set(D1X,H1-0.02,D1Z);d1.target.position.set(D1X,0,D1Z);s.add(d1);s.add(d1.target);
// E1：脱衣室のシーリング サーキュライト Mega R（引掛シーリング、φ250×H150、1520lm、調光可能なので温白色で実装）。ファンは真下向き、光るのは周りのリング。東西は電気図面の位置、南北は脱衣室の南北の壁の中心
const e1Em=new THREE.MeshBasicMaterial({color:0xd9d8d4}),E1X=-1.385,E1Z=(DZ0+DZ1)/2;
{const g=new THREE.Group();g.position.set(E1X,H1,E1Z);s.add(g);const wt=L(0xf3f3f1),gy=L(0xdcdcda),dk=L(0x55575a);
 const cyl=(r0,r1,h,y,m,seg)=>{const c=new THREE.Mesh(new THREE.CylinderGeometry(r0,r1,h,seg||40),m);c.position.y=y;g.add(c);return c;};
 cyl(0.042,0.042,0.012,-0.006,wt);cyl(0.055,0.055,0.04,-0.032,wt);cyl(0.058,0.058,0.05,-0.077,wt);   // 引掛シーリングのアダプター・上の筒（約50）・本体
 lbox(g,0.022,0.012,0.004,0,-0.072,0.058,dk);   // 本体のセンサー窓
 const lathe=(pts,m)=>{const l=new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r,y])=>new THREE.Vector2(r,y)),64),m);g.add(l);return l;};
 lathe([[0.084,-0.104],[0.110,-0.104],[0.121,-0.108],[0.125,-0.116],[0.125,-0.121],[0.084,-0.121]],wt);   // リング（上の白い部分）
 lathe([[0.084,-0.121],[0.125,-0.121],[0.125,-0.134],[0.121,-0.144],[0.112,-0.150],[0.084,-0.150],[0.084,-0.121]],e1Em);   // リング（下の光る部分。周りと下面）
 cyl(0.084,0.084,0.03,-0.115,wt);   // ファンの胴（リングの内側）
 for(let i=0;i<28;i++){const a=i/28*Math.PI*2,v=new THREE.Mesh(new THREE.BoxGeometry(0.003,0.016,0.01),dk);v.position.set(Math.cos(a)*0.0845,-0.11,Math.sin(a)*0.0845);v.rotation.y=-a;g.add(v);}   // 胴の通風口
 [-1,1].forEach(k=>{const cv3=new THREE.QuadraticBezierCurve3(new THREE.Vector3(k*0.055,-0.07,0),new THREE.Vector3(k*0.135,-0.075,0),new THREE.Vector3(k*0.112,-0.106,0));g.add(new THREE.Mesh(new THREE.TubeGeometry(cv3,16,0.007,8,false),wt));});   // 本体からリングへのアーム（左右）
 const gr=new THREE.Mesh(new THREE.CircleGeometry(0.083,48),decalMat(gy.clone()));gr.rotation.x=Math.PI/2;gr.position.y=-0.1305;g.add(gr);   // ファンの奥（羽根の面）
 for(let i=0;i<36;i++){const a=i/36*Math.PI*2,rb=new THREE.Mesh(new THREE.BoxGeometry(0.052,0.003,0.0025),wt);rb.position.set(Math.cos(a)*0.056,-0.1335,Math.sin(a)*0.056);rb.rotation.y=-a;g.add(rb);}   // ガードの放射状の骨
 [0.083,0.06,0.04].forEach(r=>{const t=new THREE.Mesh(new THREE.TorusGeometry(r,0.0016,6,64),wt);t.rotation.x=Math.PI/2;t.position.y=-0.1335;g.add(t);});   // ガードの輪
 cyl(0.03,0.03,0.006,-0.134,wt);}   // 中央のハブ
const e1=new THREE.SpotLight(0xffd9b4,0,5,THREE.MathUtils.degToRad(80),1.0,1.3);e1.position.set(E1X,H1-0.15,E1Z);e1.target.position.set(E1X,0,E1Z);s.add(e1);s.add(e1.target);
// 玄関のダウンライト：B2×2（ホール）・B1（廊下）・F1（土間収納）。器具は2階廊下のJ1と同じ RML(P1)（LEDフラットランプφ70・電球色2700K・440lm・白枠・埋込穴φ100）。位置は電気図面から（B1の東西は廊下の中心）
const entEm={eh:new THREE.MeshBasicMaterial({color:0xd9d8d4}),ec:new THREE.MeshBasicMaterial({color:0xd9d8d4}),ek:new THREE.MeshBasicMaterial({color:0xd9d8d4})};   // 発光面（eh：ホール、ec：廊下、ek：収納）
const entDL=[[-0.675,5.558,'eh'],[-0.675,6.12,'eh'],[(CX0+CX1)/2,4.03,'ec'],[-1.637,6.74,'ek']].map(([x,z,k])=>{const y=H1;
 const ring=new THREE.Mesh(new THREE.CylinderGeometry(0.058,0.058,0.004,32),L(0xf7f7f5));ring.position.set(x,y-0.002,z);s.add(ring);
 const lamp=new THREE.Mesh(new THREE.CylinderGeometry(0.044,0.044,0.0025,32),entEm[k]);lamp.position.set(x,y-0.00525,z);s.add(lamp);
 const sp=new THREE.SpotLight(0xffc68e,0,5,THREE.MathUtils.degToRad(62),0.8,1.3);sp.position.set(x,y-0.02,z);sp.target.position.set(x,-1,z);s.add(sp);s.add(sp.target);return {sp,k};});   // 配光はJ1と同じ
// B3：ブラケットライト オーデリック OB255205LC（真鍮古味、LED電球フィラメント形4.2W No.271C・2400K・350lm）。玄関ホールの北の壁（アクセント面）、取付け高さ（フランジの中心）2000、東西は壁の中心
// 寸法：巾110（フランジφ110）・高238・出209。形は寸法図（斜めから見た線画）を、フランジの楕円から求めた縮尺で横から見た形に直したもの。ネジ・つまみの細部はデフォルメ
// 構成：フランジ（外周の段・ふくらみ・平らな面・中央の座）と左右の飾りビス、座から出て上へ曲がり、山なりに曲がって下へ降りるアーム（φ9）、ソケット（上のキャップ・肩・筒・ビス付きのリング）、口金、ST形のアンバーの電球（φ61）とW形のフィラメント
const b3Glass=new THREE.MeshPhongMaterial({color:0xddb07a,transparent:true,opacity:0.42,specular:0xffffff,shininess:90,emissive:0x000000,side:THREE.DoubleSide}),b3Fil=new THREE.MeshBasicMaterial({color:0x8a6a3a});   // 電球のガラス（点灯で光る）・フィラメント
let b3L;
{const g=new THREE.Group();g.position.set((EN.X1+CX0)/2,2.0,EN.Z0);s.add(g);   // 子の座標：x＝壁に沿って（器具は左右対称）、y＝フランジの中心から上、z＝壁の面から室内（南）へ
 const BR=P({color:0x5b4d41,specular:0x5a4a3a,shininess:34,side:THREE.DoubleSide}),mm=v=>v/1000;   // 真鍮古味（暗い茶色がかった金属色）
 const lathe=(pts,m,seg,toZ)=>{const geo=new THREE.LatheGeometry(pts.map(([r,y])=>new THREE.Vector2(mm(r),mm(y))),seg||48);if(toZ)geo.rotateX(Math.PI/2);const o=new THREE.Mesh(geo,m);g.add(o);return o;};   // toZ：回転軸を壁に直角（z）にする
 lathe([[0,0],[55,0],[55,3.5],[53,6],[50,6.5],[47.5,8],[46,11],[44.5,14.5],[42,16.5],[39,17.5],[27,18.5],[25,20],[24.5,23],[22.5,25],[12,25],[10.5,26],[10,31],[8.5,32.5],[0,32.5]],BR,64,true);   // フランジ（φ110。外周の段、ふくらみ、平らな面、中央の座）
 [-1,1].forEach(k=>{const c=new THREE.Mesh(new THREE.CylinderGeometry(mm(4.2),mm(4.2),mm(16),20),BR);c.rotation.x=Math.PI/2;c.position.set(k*mm(29),0,mm(26));g.add(c);const e=new THREE.Mesh(new THREE.SphereGeometry(mm(4.2),20,10,0,Math.PI*2,0,Math.PI/2),BR);e.rotation.x=Math.PI/2;e.position.set(k*mm(29),0,mm(34));g.add(e);const w=new THREE.Mesh(new THREE.CylinderGeometry(mm(5.8),mm(5.8),mm(2),20),BR);w.rotation.x=Math.PI/2;w.position.set(k*mm(29),0,mm(19));g.add(w);});   // 左右の飾りビス（座金と丸い頭）
 {const pts=[],D2=179,R=42.5,DC=D2-R,HC=57;   // アームの芯（z＝壁から、y＝高さ。mm）。D2：降りる部分の位置（電球の前端が出209になる位置）、DC・HC・R：山なりの部分の中心と半径（頂部の芯は高さ99.5、上端は103.5）
  for(let i=0;i<=14;i++){const t=i/14*Math.PI/2;pts.push([28+66*Math.sin(t),50-50*Math.cos(t)]);}   // 座から出て上へ曲がる（横66・縦50の楕円の1/4）
  pts.push([94,HC]);for(let i=1;i<=24;i++){const a=Math.PI*(1-i/24);pts.push([DC+R*Math.cos(a),HC+R*Math.sin(a)]);}pts.push([D2,50]);   // 山なりに曲がって下へ
  const cur=new THREE.CatmullRomCurve3(pts.map(([z,y])=>new THREE.Vector3(0,mm(y),mm(z))),false,'centripetal');g.add(new THREE.Mesh(new THREE.TubeGeometry(cur,120,mm(4.5),14,false),BR));}
 const sk=new THREE.Group();sk.position.z=mm(179);g.add(sk);const sl=(pts,m,seg)=>{const geo=new THREE.LatheGeometry(pts.map(([r,y])=>new THREE.Vector2(mm(r),mm(y))),seg||40);const o=new THREE.Mesh(geo,m);sk.add(o);return o;};   // ソケットまわり（縦軸の回転体）
 sl([[0,53.5],[7.5,53.5],[7.5,46],[12,45.5],[16,44.3],[19.2,42],[20.7,39.5],[21,37],[21,4]],BR);   // 上のキャップ（φ15）・肩・筒（φ42）
 sl([[21,4],[23.2,3.6],[23.7,2.5],[23.7,-8.5],[23.2,-9.8],[22.8,-10],[22.8,-13],[22,-13.5],[15.5,-13.5]],BR);   // ビス付きのリング（φ47.5）と下の縁
 [-1,1].forEach(k=>{const c=new THREE.Mesh(new THREE.CylinderGeometry(mm(3.6),mm(3.6),mm(3.5),16),BR);c.rotation.z=Math.PI/2;c.position.set(k*mm(25.2),mm(-3),0);sk.add(c);const e=new THREE.Mesh(new THREE.SphereGeometry(mm(3.6),16,8,0,Math.PI*2,0,Math.PI/2),BR);e.rotation.z=-k*Math.PI/2;e.position.set(k*mm(26.9),mm(-3),0);sk.add(e);});   // リングの左右のビス
 {const c=new THREE.Mesh(new THREE.CylinderGeometry(mm(15.5),mm(15.5),mm(4),32),L(0xd6d2ca));c.position.y=mm(-15.5);sk.add(c);}   // 口金（リングの下に少し見える）
 sl([[0,-134.2],[2.5,-134],[4.5,-133],[5.5,-131.3],[8,-129.9],[11,-128.5],[14.5,-126.7],[17,-125.5],[20.2,-123.5],[23.5,-120.5],[26,-117],[27.6,-114],[29,-110.7],[30,-106],[30.3,-103],[30.2,-100],[29.6,-95],[28.3,-88.3],[26,-75.5],[23.7,-62.7],[21.4,-49.9],[19.7,-40.3],[18.2,-30.7],[17.8,-24],[17,-20],[15,-17],[0,-17]],b3Glass,40);   // 電球（ST形φ61、アンバーのガラス）
 {const st=new THREE.Mesh(new THREE.CylinderGeometry(mm(0.8),mm(0.8),mm(28),6),L(0xe0b070));st.position.y=mm(-34);sk.add(st);const W=[[-9,-48],[-4.5,-94],[0,-48],[4.5,-94],[9,-48]];for(let i=0;i<4;i++){const [x0,y0]=W[i],[x1,y1]=W[i+1],f=new THREE.Mesh(new THREE.BoxGeometry(mm(1.0),mm(Math.hypot(x1-x0,y1-y0)),mm(1.3)),b3Fil);f.position.set(mm((x0+x1)/2),mm((y0+y1)/2),0);f.rotation.z=Math.atan2(x0-x1,y1-y0);sk.add(f);}}   // フィラメント（細いガラスの支柱と、壁と平行なW形の4本）
 b3L=new THREE.PointLight(0xffb066,0,4.5,1.5);b3L.position.set(0,mm(-80),0);sk.add(b3L);}   // 光源（電球の中。キッチンのペンダントと同じ電球の明るさ）
const S={zoneLights:[[myWins.map(w=>w.light),['wash']],[[d1],['sen','senNE']],[[e1],['datsu']],[[...entDL.filter(o=>o.k!=='ek').map(o=>o.sp),b3L],['ent','entC','entK']],[entDL.filter(o=>o.k==='ek').map(o=>o.sp),['entK','ent']],[[g1L],['toi']]],
 // 動ける範囲（壁から WM の余裕）：脱衣室・洗面所・廊下・玄関・トイレと、その間の開口。玄関は土間（−180）まで下りられる
 boxes:[[X0+WM,LW-WM,0.2,H1-0.08,DZ0+WM,DZ1-WM],                    // 脱衣室
  [X0+WM,SX1-WM,0.2,H1-0.08,SZ0+WM,SZ1-WM],                          // 洗面所
  [X0+WM,LW-WM,0.2,H1-0.08,SZ0+WM,PZ0-WM],                           // 洗面所の北東
  [CX0+WM,CX1-WM,EN.DY+0.2,H1-0.08,PZ1+WM,EN.Z1-WM],                 // 廊下・玄関ホール・土間（東側）
  [EN.X1+WM,CX1-WM,EN.DY+0.2,H1-0.08,EN.Z0+WM,EN.Z1-WM],             // 玄関ホール・土間
  [X0+WM,EN.X1+WM,EN.DY+0.2,H1-0.08,EN.KZ0+WM,EN.Z1-WM],             // 土間収納
  [X0+WM,EN.TX1-WM,0.2,H1-0.08,EN.Z0+WM,EN.TZ1-WM],                  // トイレ
  ifOpen('sg500',[EN.TX1-WM-0.01,EN.X1+WM+0.01,0.2,1.95,EN.sgA+0.08,EN.sgB-0.08]),   // トイレのSG500
  ifOpen('sg300l',[LW-WM-0.01,WM+0.01,0.2,1.95,SGZ0+0.08,SGZ1-0.08]),                 // LDKとのSG300
  ifOpen('sg300w',[sgA+0.08,sgB-0.08,0.2,1.95,DZ1-WM-0.01,SZ0+WM+0.01]),              // 脱衣室と洗面所のSG300
  ifOpen('sg33',[SX1-WM-0.01,CX0+WM+0.01,0.2,1.95,s33A+0.08,s33B-0.08])],           // SG33（SG11Hは廊下とLDKの範囲が重なっている）
 obs:[[EN.X1-EN.twD,EN.X1,H1-0.18,H1,EN.KZ0,EN.Z1],   // 土間収納の垂れ壁（1階の天井まで。2階へ届かないように）
  [X0,X0+0.53,-1,2.45,SZ0,SZ1],                      // 洗面所のドレッサー（本体。取っ手の出っ張りは含めない）
  [X0,X0+0.762,-1,2.45,DZ1-0.634,DZ1],               // 洗濯機（壁から30mm離した本体まで）
  [CX1-0.395,CX1,-1,2.45,EN.sbZ0,EN.Z1],             // シューズボックス（本体とカウンター。取っ手の出っ張りは含めない）
  [X0,X0+0.15,-1,2.45,EN.Z0,EN.TZ1]],                // トイレのカウンター収納（奥行150、南の壁から北の壁まで）
 applyEnv(night){myWins.forEach(w=>w.light.intensity=night?0:w.I);entGl.color.set(night?0x101318:0xdfe3e5);const f=night?1:0.3,off=night?0x2a2927:0xa8a6a1;
  d1.intensity=LS.d1?0.8*f:0;d1Em.color.set(LS.d1?0xf6f8ff:off);   // 洗面所：ダウンライト（D1）
  e1.intensity=LS.e1?0.8*f*(1520/440)*(3.33/5.19):0;e1Em.color.set(LS.e1?0xfff0dc:off);   // 脱衣室：シーリング（E1）。明るさはA1の440lm・62°を基準に、1520lm・80°で換算
  entDL.forEach(o=>o.sp.intensity=LS[o.k]?0.8*f:0);['eh','ec','ek'].forEach(k=>entEm[k].color.set(LS[k]?0xffe2b8:off));   // 玄関：ホール（B2）・廊下（B1）・収納（F1）
  b3L.intensity=LS.eh?0.35*f:0;b3Glass.emissive.set(LS.eh?0xffb066:0x000000);b3Glass.opacity=LS.eh?0.9:0.42;b3Fil.color.set(LS.eh?0xffe08a:0x8a6a3a);   // 玄関：ホール（B3のブラケット。B2と同じスイッチ。点灯時のガラスは光の色＝2400K）
  g1L.intensity=LS.g1?0.35*312/350*f:0;g1M.glass.emissive.set(LS.g1?0x3a2c20:0x000000);g1M.bulb.emissive.set(LS.g1?0xffd8a8:0x000000);g1M.led.color.set(LS.g1?0xfff4e0:0x8a8478);},   // トイレ：ペンダント（G1）。明るさはB3（350lm）と同じ換算で312lm
 viewWash(){look(SX1-WM,EYE,SZ1-WM,SX1-WM-2.16,0.9,SZ1-WM-2.08,85);},   // 洗面脱衣：洗面所の南東の角（入口SG33の前。移動で近づける限界＝壁から WM）から北西を見る。ドアが開いていれば、洗面所・脱衣室・浴室がすべて入る
 viewEntry(){look(-0.75,EYE,6.95,-0.6,0.85,4.0,80);},   // 玄関（仮）：土間の玄関ドアの前から北（ホール・廊下）を見る
 viewToilet(){look(-1.6,EYE,4.68,-1.95,0.5,6.1,85);}};   // トイレ（仮）：北東の角から南西（便器・カウンター収納）を見る
return S;}

// ハンドシャワー：KVK hadamo ウルトラファインバブルシャワーヘッド PZS370（メッキの本体＋濃いグレーの散水板。寸法図と製品写真から）
// 子の座標：原点＝本体の下端（ねじの付け根）の中心、+y＝握りの軸の上、+z＝散水面の側。形は寸法図の側面図の輪郭（u＝前、v＝下端からの高さ、mm）を、断面をつないで作る
// 寸法図の数字：頭の幅83・散水面の中心は軸から73・下端から156、ねじM22×2・長さ12。図の頭は幅約88.6に描かれているので、頭だけ散水面の中心を基準に83/88.6に縮める（握りは図のまま）
function buildHadamo(g,cm,opt){opt=opt||{};   // opt.raw：縮小・移動をせず図のとおりに作る（図との照合用）
const K=opt.raw?1:83/88.6,DU=opt.raw?0:1.2,mm=0.001,S4=0.6423,C4=0.7665;   // K：頭の縮小、DU：散水面の中心を73に合わせる前への移動、S4・C4：散水面の傾き40°（握りの軸から前へ）のsin・cos
const pl=a=>{const r=[];for(let i=0;i<a.length;i+=2)r.push([a[i],a[i+1]]);return r;};
const BK=pl([-15.4,0.3,-16.1,3.2,-16.4,6.2,-16.7,9.2,-17.0,12.2,-17.3,15.3,-17.5,18.3,-17.7,21.3,-17.9,24.3,-18.1,27.3,-18.3,30.3,-18.5,33.3,-18.6,36.4,-18.7,39.4,-18.8,42.4,-18.9,45.4,-18.9,48.5,-19.0,51.5,-19.0,54.5,-19.0,57.5,-19.0,60.6,-19.0,63.6,-18.9,66.6,-18.9,69.7,-18.8,72.7,-18.7,75.7,-18.5,78.7,-18.3,81.7,-18.1,84.7,-17.9,87.8,-17.7,90.8,-17.4,93.8,-17.0,96.8,-16.6,99.8,-16.2,102.8,-15.7,105.8,-15.1,108.7,-14.5,111.7,-13.7,114.6,-12.9,117.5,-12.0,120.4,-11.0,123.3,-10.0,126.1,-9.0,129.0,-7.9,131.8,-6.7,134.6,-5.5,137.3,-4.2,140.1,-2.9,142.8,-1.5,145.5,-0.1,148.1,1.4,150.7,2.9,153.3,4.5,155.9,6.2,158.4,8.0,160.9,9.7,163.4,11.5,165.8,13.4,168.1,15.3,170.5,17.3,172.8,19.3,175.0,21.4,177.2,23.5,179.4,25.7,181.5,27.9,183.5,30.2,185.5,32.5,187.5,34.8,189.4,37.2,191.3,39.6,193.2,42.0,195.0,44.5,196.7,47.0,198.4,49.6,200.0,52.2,201.5,54.9,202.9,57.7,204.0,60.6,205.0,63.5,205.7,66.5,206.0,69.5,206.0,72.6,205.9,75.5,205.4,78.5,204.8,81.3,203.8,84.1,202.6,86.7,201.0,89.2,199.3]);   // 背中の輪郭（下端から頭の上を回って散水板の裏の上端まで）
const FR=pl([13.0,0.3,13.5,2.8,13.7,5.3,13.8,7.8,13.9,10.3,14.0,12.8,14.2,15.3,14.3,17.8,14.4,20.3,14.5,22.9,14.5,25.4,14.6,27.9,14.7,30.4,14.8,32.9,14.8,35.4,14.9,37.9,14.9,40.4,14.9,43.0,15.0,45.5,15.0,48.0,15.0,50.5,15.0,53.0,15.0,55.5,15.0,58.1,15.0,60.6,15.0,63.1,15.0,65.6,15.0,68.1,14.9,70.6,14.9,73.1,14.8,75.7,14.8,78.2,14.7,80.7,14.7,83.2,14.6,85.7,14.5,88.2,14.4,90.7,14.3,93.3,14.2,95.8,14.2,98.3,14.0,100.8,13.9,103.3,13.8,105.8,13.9,108.3,14.1,110.8,14.6,113.3,15.3,115.7,16.3,118.0,17.6,120.2,19.0,122.3,20.7,124.1,22.6,125.8,24.6,127.3,26.7,128.6,29.0,129.7,31.4,130.6,33.4,131.9]);   // 握りの前の輪郭（下端から散水板の下端の裏まで）
const GW=[16.0,16.5,16.9,17.2,17.6,17.9,18.2,18.4,18.6,18.9,19.0,19.1,19.2,19.3,19.3,19.3,19.2,19.1,19.0,19.0,19.2,19.5,19.9,20.6,21.4,22.6,24.0];   // 正面図の握りの半幅（v＝0〜130、5ごと）
const BC=[61.1,165.1],RC=44.2,TP=9.95,F=[BC[0]+TP*C4,BC[1]-TP*S4];   // BC：散水板の裏の中心、RC：頭の半径（図）、TP：散水板の厚さ、F：散水面の中心
const sOf=p=>(p[0]-BC[0])*S4+(p[1]-BC[1])*C4,lerp=(a,b,t)=>a+(b-a)*t,sst=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};   // sOf：散水面にそった上向きの位置
const atV=(P,v)=>{for(let i=1;i<P.length;i++)if(P[i][1]>=v){const a=P[i-1],b=P[i],t=(v-a[1])/(b[1]-a[1]||1);return a[0]+(b[0]-a[0])*t;}return P[P.length-1][0];};
const gw=v=>v<=130?(i=>{const j=Math.min(25,Math.floor(i));return lerp(GW[j],GW[j+1],i-j);})(Math.max(0,v)/5):24+5*(1-Math.exp(-(v-130)/12));   // 握りの半幅（隠れた部分は少しずつ広げる）
const hw=(u,v)=>{const s=sOf([u,v]),gg=gw(v)*(1-sst(150,178,v)),hh=s>=0?Math.sqrt(Math.max(0,RC*RC-s*s)):RC*Math.pow(Math.max(0,1-s*s/3844),1.23),k=16,h=Math.max(0,k-Math.abs(gg-hh))/k;return Math.max(gg,hh)+h*h*k/4;};   // 横の半幅：握りと頭のなめらかな大きい方。頭の下半分は円のままだと首との境に折れ目が出るので、s＝−62で0になるなめらかな曲線にする
const hit=p=>{const d=[-C4,S4];let best=null;for(let i=1;i<BK.length;i++){const a=BK[i-1],b=BK[i],ex=b[0]-a[0],ey=b[1]-a[1],den=d[0]*ey-d[1]*ex;if(Math.abs(den)<1e-9)continue;const wx=a[0]-p[0],wy=a[1]-p[1],t=(wx*ey-wy*ex)/den,q=(wx*d[1]-wy*d[0])/den;if(t>0&&q>=0&&q<=1&&(best===null||t<best))best=t;}return best===null?null:[p[0]+d[0]*best,p[1]+d[1]*best];};   // 散水板の裏から奥へ（散水面と逆向き）の線と背中の輪郭の交点
const path=P=>{const L=[0];for(let i=1;i<P.length;i++)L.push(L[i-1]+Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]));return t=>{const x=t*L[L.length-1];let i=1;while(i<L.length-1&&L[i]<x)i++;const r=(x-L[i-1])/(L[i]-L[i-1]||1);return [lerp(P[i-1][0],P[i][0],r),lerp(P[i-1][1],P[i][1],r)];};};
// 断面（側面図での前の点f・奥の点b・tau：0＝握りの楕円、1＝頭の形）
const V1=100,S1=-22,SJ=sOf(FR[FR.length-1]),sec=[];
for(let v=0.3;v<V1;v+=2.5)sec.push({f:[atV(FR,v),v],b:[atV(BK,v),v],t:0});
{const fp=FR.filter(p=>p[1]>V1);fp.unshift([atV(FR,V1),V1]);for(let s=SJ+2;s<S1;s+=2)fp.push([BC[0]+s*S4,BC[1]+s*C4]);fp.push([BC[0]+S1*S4,BC[1]+S1*C4]);
 const bh=hit([BC[0]+S1*S4,BC[1]+S1*C4]),bp=BK.filter(p=>p[1]>V1&&sOf(p)<sOf(bh)-0.3&&p[1]<bh[1]);bp.unshift([atV(BK,V1),V1]);bp.push(bh);
 const pf=path(fp),pb=path(bp),NF=26;for(let i=0;i<NF;i++){const l=i/NF;sec.push({f:pf(l),b:pb(l),t:sst(0,1,l)});}}
{const NH=44;for(let i=0;i<NH;i++){const s=S1+(RC-S1)*Math.sin(i/NH*Math.PI/2),p=[BC[0]+s*S4,BC[1]+s*C4],b=hit(p);if(!b||Math.hypot(b[0]-p[0],b[1]-p[1])<0.2)break;sec.push({f:p,b,t:1});}}
// 断面の形：横の半幅（hw）に、前と奥の丸め（前の丸めの深さrf・奥の丸めの深さrb、指数ex）をかける。周の点は弧長で等分
const HM=24,M=2*HM,pos=[],T=(u,v,x)=>{const w=sst(-62,-40,sOf([u,v])),k=1-w*(1-K);return [x*k,F[1]+(v-F[1])*k,F[0]+(u-F[0])*k+w*DU];};   // T：頭の部分だけ散水面の中心を基準に縮める（握りへなめらかにつなぐ）
sec.forEach(o=>{const dx=o.b[0]-o.f[0],dy=o.b[1]-o.f[1],D=Math.hypot(dx,dy),rf=lerp(D/2,2.2,o.t),rb=lerp(D/2,0.88*D,o.t),ex=lerp(2.4,2,o.t),N=240,cur=[];
 for(let j=0;j<=N;j++){const q=(1-Math.cos(j/N*Math.PI))/2,d=q*D,e1=Math.min(1,d/rf),e2=Math.min(1,(D-d)/rb),E=Math.pow(Math.max(0,1-Math.pow(1-e1,ex)),1/ex)*Math.pow(Math.max(0,1-Math.pow(1-e2,ex)),1/ex);cur.push([d,hw(o.f[0]+dx*q,o.f[1]+dy*q)*E]);}
 const cl=[0];for(let j=1;j<=N;j++)cl.push(cl[j-1]+Math.hypot(cur[j][0]-cur[j-1][0],cur[j][1]-cur[j-1][1]));
 const half=[];for(let k=0,j=1;k<=HM;k++){const x=k/HM*cl[N];while(j<N&&cl[j]<x)j++;const r=(x-cl[j-1])/(cl[j]-cl[j-1]||1);half.push([lerp(cur[j-1][0],cur[j][0],r),lerp(cur[j-1][1],cur[j][1],r)]);}
 const ring=half.concat(half.slice(1,HM).reverse().map(([d,w])=>[d,-w]));ring.forEach(([d,w])=>{pos.push(...T(o.f[0]+dx/D*d,o.f[1]+dy/D*d,w));});});
const NS=sec.length,idx=[];for(let i=0;i<NS-1;i++)for(let j=0;j<M;j++){const a=i*M+j,b=i*M+(j+1)%M,c=a+M,d=b+M;idx.push(a,b,c,b,d,c);}
{const ap=sec[NS-1],cx=(ap.f[0]+ap.b[0])/2,cy=(ap.f[1]+ap.b[1])/2,top=pos.length/3;pos.push(...T(cx,cy,0));for(let j=0;j<M;j++)idx.push((NS-1)*M+j,(NS-1)*M+(j+1)%M,top);}   // 頭の上の端を閉じる
const bgeo=new THREE.BufferGeometry();bgeo.setAttribute('position',new THREE.Float32BufferAttribute(pos.map(x=>x*mm),3));bgeo.setIndex(idx);bgeo.computeVertexNormals();
const body=new THREE.Mesh(bgeo,cm);g.add(body);
{const sh=new THREE.Shape();for(let j=0;j<M;j++){const p=pos.slice(j*3,j*3+3);j?sh.lineTo(p[0]*mm,p[2]*mm):sh.moveTo(p[0]*mm,p[2]*mm);}const c=new THREE.Mesh(new THREE.ShapeGeometry(sh),cm);c.rotation.x=Math.PI/2;c.position.y=pos[1]*mm;g.add(c);}   // 下端の平らな面（ねじの付け根）
// 散水板（濃いグレー）と散水部：散水面の中心を原点にした子の座標で作る（単位は図のmm。頭と同じ縮小をかける）。+y＝散水面の向き、−z＝散水面にそって上、x＝横
const hd=new THREE.Group(),hp=T(BC[0],BC[1],0);hd.position.set(hp[0]*mm,hp[1]*mm,hp[2]*mm);hd.rotation.x=Math.PI-Math.acos(S4);hd.scale.setScalar(K*mm);g.add(hd);
const plM=L(0x3a3b3e),nzM=L(0x1c1d1f),Y0=TP,pol=(r,a)=>[r*Math.cos(a*Math.PI/180),-r*Math.sin(a*Math.PI/180)];   // pol：散水面の上の位置（a＝横から上へ測った角度）
{const pr=[[0,0],[42.6,0],[43,0.5],[43,6.8],[42.2,8],[41,8.6],[40.4,Y0]].map(([x,y])=>new THREE.Vector2(x,y));hd.add(new THREE.Mesh(new THREE.LatheGeometry(pr,96),plM));}   // 散水板の本体（外周の段は正面図の2本の円から）
const LN=[];for(let i=0;i<16;i++)LN.push(pol(22.5,i*22.5));   // 大きい散水孔×16（中央の部の周り。平らなゴムの口）
const LB=[0,90,180,270];
{const c=cv((x,W)=>{const sc=W/80.8,P=(u,v)=>[(u+40.4)*sc,(40.4+v)*sc];x.fillStyle='#3a3b3e';x.fillRect(0,0,W,W);   // 散水面の模様（平らなもの：切替の4つの部分の縁取り・大きい散水孔）。キャンバスの上＝散水面の上
  LB.forEach(a=>{x.save();x.translate(W/2,W/2);x.rotate(-(a-90)*Math.PI/180);x.beginPath();x.arc(0,-37.4*sc,7.7*sc,0,Math.PI);x.lineTo(-7.7*sc,-39.66*sc);x.arc(0,0,40.4*sc,Math.atan2(-39.66,-7.7),Math.atan2(-39.66,7.7));x.closePath();x.fillStyle='#424346';x.fill();x.lineWidth=1.2;x.strokeStyle='#262729';x.stroke();x.restore();});
  LN.forEach(([u,v])=>{const [px,py]=P(u,v);x.beginPath();x.arc(px,py,2.55*sc,0,7);x.fillStyle='#2b2c2f';x.fill();x.lineWidth=1;x.strokeStyle='#4a4b4e';x.stroke();x.beginPath();x.arc(px,py,0.75*sc,0,7);x.fillStyle='#0e0e0f';x.fill();});},512,512);
 const fc=new THREE.Mesh(new THREE.CircleGeometry(40.4,96),P({map:new THREE.CanvasTexture(c)}));fc.rotation.x=-Math.PI/2;fc.position.y=Y0;hd.add(fc);}
{const pr=[[13.4,11],[13.4,13.2],[14,14.2],[15.5,14.2],[16.7,12.2],[17.1,Y0],[17.1,Y0-0.5]].map(([x,y])=>new THREE.Vector2(x,y));hd.add(new THREE.Mesh(new THREE.LatheGeometry(pr,64),plM));   // 中央の盛り上がった輪（散水面の中心から約4出る。図の寸法の点）
 const c=cv((x,W)=>{const R=W/2,gr=x.createRadialGradient(R*0.8,R*0.7,R*0.1,R,R,R);gr.addColorStop(0,'#d6d9db');gr.addColorStop(1,'#b3b6b9');x.fillStyle=gr;x.fillRect(0,0,W,W);x.fillStyle='#8c9093';for(let rr=6;rr<R-3;rr+=8){const n=Math.round(2*Math.PI*rr/7);for(let i=0;i<n;i++){const a=i/n*Math.PI*2;x.beginPath();x.arc(R+rr*Math.cos(a),R+rr*Math.sin(a),1.1,0,7);x.fill();}}},256,256);   // ウルトラファインバブルの散水部（銀色、細かい孔が同心円に並ぶ）
 const ds=new THREE.Mesh(new THREE.CircleGeometry(13.4,64),P({map:new THREE.CanvasTexture(c),specular:0x555555,shininess:40}));ds.rotation.x=-Math.PI/2;ds.position.y=13.5;hd.add(ds);}
{const add=(x,z)=>{const n=new THREE.Mesh(new THREE.CylinderGeometry(1.3,1.5,2,14),nzM);n.position.set(x,Y0+1,z);hd.add(n);};   // 小さい散水孔（突き出たゴムの口、出は2）：4つの区画に14ずつ＋切替の4つの部分に2ずつ（正面図の位置から）
 [[29.5,[20,32.5,45,57.5,70]],[32.9,[25.5,38.5,51.5,64.5]],[36.3,[19,32,45,58,71]]].forEach(([r,as])=>as.forEach(a=>[[1,1],[-1,1],[1,-1],[-1,-1]].forEach(([sx,sz])=>{const [x,z]=pol(r,a);add(sx*x,sz*z);})));
 LB.forEach(a=>[-6.5,6.5].forEach(d=>add(...pol(36.5,a+d))));}
{const sh=new THREE.Shape();sh.moveTo(38,1.1);sh.lineTo(50.5,1.1);sh.quadraticCurveTo(53.5,1.1,53.5,4.6);sh.quadraticCurveTo(53.5,8.4,50.5,8.4);sh.lineTo(38,8.4);sh.lineTo(38,1.1);   // 切替のつまみ（散水板の下の端から出る薄い板。正面図で幅約3、側面図で先が丸い）
 const tg=new THREE.ExtrudeGeometry(sh,{depth:2.1,bevelEnabled:true,bevelThickness:0.5,bevelSize:0.5,bevelSegments:3,curveSegments:10});tg.rotateY(-Math.PI/2);tg.translate(1.05,0,0);hd.add(new THREE.Mesh(tg,plM));}
{const n=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.012,0.02,32),cm);n.position.y=-0.01;g.add(n);}   // ホースのナット（下端のねじM22にかぶさる）
}

