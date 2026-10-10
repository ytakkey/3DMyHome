// ===== ウォークイン・書斎（2階。座標は家全体と同じ） =====
// クロス：ウォークインの壁 IC-6039・天井 IC-5011、書斎の壁と天井 IC-6035。床は寝室・廊下と同じ一枚の「2階の床」（floor2F）。天井高は寝室と同じ（仮）
function buildStudy(sc){s=sc;shades=[];winLights=[];const myShades=shades,myWins=winLights;
const {X0:WX0,X1:WX1,Z0:WZ0,Z1:WZ1}=HOUSE.wic,{X0:SX0,X1:SX1,Z0:SZ0,Z1:SZ1,winC}=HOUSE.study,OY=HOUSE.ldk.FL2,H=HOUSE.bed.H,WM=HOUSE.wallMargin,T=WX0-HOUSE.bed.X0-HOUSE.bed.W;   // T：寝室との壁の厚さ
const hs=(x,y)=>{let h=Math.imul(x|0,374761393)+Math.imul(y|0,668265263)|0;h=Math.imul(h^h>>>13,1274126177);return((h^h>>>16)>>>0)/4294967296;};
const vn=(x,y,px,py)=>{const xi=Math.floor(x),yi=Math.floor(y),fx=x-xi,fy=y-yi,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy),m=(a,b)=>hs(((a%px)+px)%px,((b%py)+py)%py),a=m(xi,yi),b=m(xi+1,yi),c=m(xi,yi+1),d=m(xi+1,yi+1);return a+(b-a)*sx+(c-a)*sy+(a-b-c+d)*sx*sy;};   // 周期つきのなめらかなノイズ（タイルの端でつながる）
const pix=(N,f)=>cv((x,W)=>{const im=x.createImageData(W,W),d=im.data;for(let y=0;y<W;y++)for(let i=0;i<W;i++){const c=f(i,y),o=(y*W+i)*4;d[o]=clamp8(c[0]);d[o+1]=clamp8(c[1]);d[o+2]=clamp8(c[2]);d[o+3]=255;}x.putImageData(im,0,0);},N,N);
const ic6039C=noiseCanvas(512,[212,207,201],4,128,3);   // IC-6039：ごく淡い暖かみのあるグレー、ほとんど無地（1m四方）
const ic5011C=pix(512,(i,y)=>{const k=12*(vn(i/32,y/2,16,256)-0.5)+12*(vn(i/2,y/32,256,16)-0.5)+4*(vn(i/64,y/64,8,8)-0.5)+(hs(i+3,y+7)-0.5)*6;return [161+k,171+k,183+k];});   // IC-5011：青みのグレーの織物調（縦横の糸のむら。0.5m四方、1px≒1mm）
const ic6035C=pix(512,(i,y)=>{const u=i/512,v=y/512,c=vn(u*4,v*4,4,4),k=18*(c-0.5)+22*Math.max(0,vn(u*7+3,v*7,7,7)-0.58)+7*(vn(u*16,v*16,16,16)-0.5)+4*(vn(u*48,v*48,48,48)-0.5)+(hs(i,y)-0.5)*7-(hs(y+11,i)<0.004?12:0);return [145+k,148+k,148+k];});   // IC-6035：グレーのコンクリート調（雲のような明るいムラ、細かいざらつき、ときどき小さな穴。1m四方）
const wicW=tmat(ic6039C,{specular:0x111111,shininess:6}),wicC=tmat(ic5011C),stW=tmat(ic6035C,{specular:0x141414,shininess:8}),stC=tmat(ic6035C);   // wicC・stC：天井（照り返しの代わりの明るさは applyEnv で、ほかの天井と同じ割合に）
// ウォークイン：壁・天井
buildWall(wallGroup(WX0,OY,WZ1,Math.PI/2),WZ1-WZ0,H,[{a:(WZ1-WZ0)/2-0.38,b:(WZ1-WZ0)/2+0.38,y1:0,y2:2.0,door:'frame'}],wicW,1,true);   // 西（SG500の開口。扉は寝室側）
buildWall(wallGroup(WX0,OY,WZ0,0),WX1-WX0,H,[],wicW,1,true);buildWall(wallGroup(WX1,OY,WZ0,-Math.PI/2),WZ1-WZ0,H,[],wicW,1,true);buildWall(wallGroup(WX1,OY,WZ1,Math.PI),WX1-WX0,H,[],wicW,1,true);   // 北・東・南
ceilRect(WX0,WX1,WZ0,WZ1,OY+H,wicC,0.5);
// ウォークインの棚（建具と同じ白、奥行450・厚さ30）とハンガーパイプ（ステンレスφ25、芯は壁から300・棚の下端から50下）。高さは棚の上端（床から）
{const SD=0.45,ST=0.03,PR=0.0125,sus=P({color:0xc4c6c7,specular:0x9a9a9a,shininess:90}),shelf=(x0,x1,z0,z1,t)=>lbox(s,x1-x0,ST,z1-z0,(x0+x1)/2,OY+t-ST/2,(z0+z1)/2,0xf6f5f2),
 pipe=(L,x,y,z,alongZ)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(PR,PR,L,20),sus);m.rotation[alongZ?'x':'z']=Math.PI/2;m.position.set(x,OY+y,z);s.add(m);},py=t=>t-ST-0.05;
 shelf(WX0,WX1,WZ0,WZ0+SD,1.8);pipe(WX1-WX0,(WX0+WX1)/2,py(1.8),WZ0+0.3,false);   // 北：1800（西の壁から東の壁まで。北東の角で東の棚と高さ違いで重なる）
 [2.0,1.0].forEach(t=>{shelf(WX1-SD,WX1,WZ0,WZ1,t);pipe(WZ1-WZ0,WX1-0.3,py(t),(WZ0+WZ1)/2,true);});   // 東：2000・1000（北の壁から南の壁まで）
 shelf(WX0,WX1-SD,WZ1-SD,WZ1,2.0);pipe(WX1-SD-WX0,(WX0+WX1-SD)/2,py(2.0),WZ1-0.3,false);}   // 南：2000（西の壁から東の棚の手前まで。東の棚と同じ高さなので突き付け）
// 書斎：壁・天井
buildWall(wallGroup(SX0,OY,SZ1,Math.PI/2),SZ1-SZ0,H,[{a:0,b:0.795,y1:0,y2:2.0,door:'swing',T,hingeA:1,toggle:'sg33s'}],stW,1,true);   // 西（SG33：洗面所のSG33を左右反転。開口は南の壁の面から795、南側吊元で書斎側へ開く）
buildWall(wallGroup(SX0,OY,SZ0,0),SX1-SX0,H,[],stW,1,true);buildWall(wallGroup(SX1,OY,SZ0,-Math.PI/2),SZ1-SZ0,H,[],stW,1,true);   // 北・東
buildWall(wallGroup(SX1,OY,SZ1,Math.PI),SX1-SX0,H,[{a:SX1-winC-0.3715,b:SX1-winC+0.3715,y1:0.969,y2:2.144,win:1}],stW,1,true);   // 南（FK2442、+969）
ceilRect(SX0,SX1,SZ0,SZ1,OY+H,stC,1);
// ===== 書斎の家具（仕様はおまかせ。北の壁に向けたデスク、チェア、24インチのモニター、キーボード、マウス） =====
// デスク：W（東西の壁から5mmずつあけた幅）×D600×H720。天板はオーク調の集成材（厚さ25）、脚は黒いスチールの角パイプ（40角）を四角い枠に組んだ形。北の壁から10
{const DW=SX1-SX0-0.01,DD=0.6,DH=0.72,TT=0.025,cx=(SX0+SX1)/2,z0=SZ0+0.01,zc=z0+DD/2,BK=0x1d1d1f,top=tmat(oakC,{specular:0x2a2a2a,shininess:24},Math.PI/2);
 lbox(s,DW,TT,DD,cx,OY+DH-TT/2,zc,top);   // 天板
 [-1,1].forEach(k=>{const x=cx+k*(DW/2-0.06);   // 左右の脚の枠（前後の柱・床の足・天板の下の横桟）
  [z0+0.04,z0+DD-0.04].forEach(z=>lbox(s,0.04,DH-TT-0.012,0.04,x,OY+0.006+(DH-TT-0.012)/2,z,BK));
  lbox(s,0.04,0.03,DD-0.02,x,OY+0.021,zc,BK);lbox(s,0.04,0.03,DD-0.12,x,OY+DH-TT-0.015,zc,BK);
  [z0+0.05,z0+DD-0.05].forEach(z=>{const f=new THREE.Mesh(new THREE.CylinderGeometry(0.014,0.016,0.006,16),L(0x2a2a2a));f.position.set(x,OY+0.003,z);s.add(f);});});   // アジャスター
 lbox(s,DW-0.16,0.04,0.02,cx,OY+DH-TT-0.11,z0+0.05,BK);lbox(s,DW-0.16,0.03,0.04,cx,OY+DH-TT-0.015,z0+0.05,BK);   // 奥の補強（幕板の代わりの横桟）
// モニター：24インチ（16:9、画面 531×299）。細い縁、下だけ少し太い。黒い背面のふくらみ、四角い支柱、薄い台座。画面の下端は天板から105
 {const g=new THREE.Group();g.position.set(cx,OY+DH,z0+0.2);s.add(g);   // 子の座標：+Z＝画面の正面（南）
  const MW=0.541,MH=0.317,CH=0.012,GY=0.105+MH/2,GR=0x232325,dk=P({color:0x0b0c0e,specular:0x555555,shininess:90});
  rbox(g,0.23,0.014,0.17,0.006,0,0.007,0.0,L(GR));   // 台座
  lbox(g,0.05,0.24,0.022,0,0.13,-0.045,GR);lbox(g,0.07,0.06,0.03,0,GY-0.02,-0.04,GR);   // 支柱と、背面への取り付け部
  rbox(g,MW,MH,CH,0.004,0,GY,0,L(0x1a1a1c));rbox(g,0.36,0.2,0.03,0.012,0,GY-0.01,-0.018,L(GR));   // 画面の枠と背面のふくらみ
  const sc=new THREE.Mesh(new THREE.PlaneGeometry(0.531,0.299),dk);sc.position.set(0,GY+0.0035,CH/2+0.0006);g.add(sc);   // 画面（消えた状態の黒）
  lbox(g,0.004,0.002,0.001,0.24,GY-MH/2+0.004,CH/2+0.0006,0xe8e8e8);}   // 電源ランプ
// キーボード：フルサイズ（440×135）、濃いグレー、奥が少し高い。キーの並びはデフォルメ（文字は描かない）
 {const g=new THREE.Group();g.position.set(cx-0.05,OY+DH,z0+DD-0.16);g.rotation.x=0.05;s.add(g);
  const KB=0x2b2c2e,KC=0x3a3b3e,u=0.0188,gp=0.0024,kw=0.44,kd=0.135;rbox(g,kw,0.018,kd,0.004,0,0.012,0,L(KB));
  const key=(x,z,w,d)=>lbox(g,w*u-gp,0.008,(d||1)*u-gp,-kw/2+0.012+x*u+(w*u)/2,0.024,-kd/2+0.012+z*u+((d||1)*u)/2,KC);
  [[0,1],[2,1],[3,1],[4,1],[5,1],[6.5,1],[7.5,1],[8.5,1],[9.5,1],[11,1],[12,1],[13,1],[14,1]].forEach(([x,w])=>key(x,0,w));   // ファンクションキーの列
  const rows=[[[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[2,1]],[[1.5],[1],[1],[1],[1],[1],[1],[1],[1],[1],[1],[1],[1],[1.5]],[[1.75],[1],[1],[1],[1],[1],[1],[1],[1],[1],[1],[1],[2.25]],[[2.25],[1],[1],[1],[1],[1],[1],[1],[1],[1],[1],[2.75]],[[1.25],[1.25],[1.25],[6.25],[1.25],[1.25],[1.25],[1.25]]];
  rows.forEach((r,ri)=>{let x=0;r.forEach(([w])=>{key(x,1.25+ri,w);x+=w;});});
  [[0,1.25],[1,1.25],[2,1.25],[0,2.25],[1,2.25],[2,2.25],[1,4.25],[0,5.25],[1,5.25],[2,5.25]].forEach(([x,z])=>key(15.25+x,z,1));[0,1,2].forEach(x=>key(15.25+x,0,1));   // 矢印・編集キー
  [[0,1.25],[1,1.25],[2,1.25],[3,1.25],[0,2.25],[1,2.25],[2,2.25],[0,3.25],[1,3.25],[2,3.25],[0,4.25],[1,4.25],[2,4.25]].forEach(([x,z])=>key(18.5+x,z,1));key(21.5,2.25,1,2);key(21.5,4.25,1,2);key(18.5,5.25,2);key(20.5,5.25,1);}   // テンキー
// マウス：W64×L108×H38の左右対称の形。平面は角の丸い長方形に近い形（前も後ろも幅がほぼ同じ、前の端は丸く切りそろえた形）、断面はなだらかな山で、一番高い所は中央より少し後ろ。底は平らで天板の上に置く（はみ出さない）
// 面は高さの式 my(x,z) で作り、ボタンの溝・ホイールの溝も同じ式の上に貼る。子の座標：+Z＝前（モニター側）、+X＝右手側の反対（左）
 {const g=new THREE.Group();g.position.set(cx+0.3,OY+DH,z0+DD-0.16);g.rotation.y=Math.PI-0.06;s.add(g);
  const A=0.054,E=0.006,B0=0.0015,SN=2.6,mw=z=>0.032*(1-0.03*z/A),mh=z=>E+0.0305*Math.exp(-(((z+0.016)/0.072)**2)),   // A：長さの半分、E：縁の高さ、B0：底の高さ、SN：平面の形（超楕円の指数。大きいほど四角い）、mw：幅の半分（前がわずかに細い）、mh：中央の高さ（前後でなだらかに低くなる）
   md=(x,z)=>Math.min(1,(Math.abs(x/mw(z))**SN+Math.abs(z/A)**SN)**(1/SN)),my=(x,z)=>B0+E+(mh(z)-E)*Math.sqrt(Math.max(0,1-md(x,z)**2));   // md：縁までの割合（0＝中心、1＝縁）、my：上面の高さ
  {const NT=72,NR=14,pos=[],idx=[],ring=(r,yf)=>{for(let k=0;k<NT;k++){const t=k/NT*Math.PI*2,c=Math.cos(t),sn=Math.sin(t),z=A*r*Math.sign(c)*Math.abs(c)**(2/SN),x=mw(z)*r*Math.sign(sn)*Math.abs(sn)**(2/SN);pos.push(x,yf===undefined?my(x,z):yf,z);}};
   for(let i=1;i<=NR;i++){const r=Math.sin(i/NR*Math.PI/2);ring(r);}   // 上面（縁に近いほど細かく）
   ring(1.0,B0+E*0.45);ring(0.985,B0+0.0008);ring(0,B0);   // 縁の丸み（下へ回り込む）と底
   const nr=NR+3;pos.unshift(0,my(0,0),0);   // 頂点0：上面の中心
   for(let k=0;k<NT;k++)idx.push(0,1+k,1+(k+1)%NT);
   for(let i=0;i<nr-2;i++)for(let k=0;k<NT;k++){const a=1+i*NT+k,b=1+i*NT+(k+1)%NT,c=a+NT,d=b+NT;idx.push(a,c,b,b,c,d);}
   const bc=1+(nr-1)*NT,bl=1+(nr-2)*NT;for(let k=0;k<NT;k++)idx.push(bc,bl+(k+1)%NT,bl+k);   // 底（平ら）
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();
   g.add(new THREE.Mesh(geo,P({color:0x232426,specular:0x2a2a2a,shininess:22})));}
  const strip=(x0,x1,za,zb,c,n,fx)=>{const pos=[],idx=[];for(let i=0;i<=n;i++){const z=za+(zb-za)*i/n,xc=fx?fx(z):0;[x0,x1].forEach(x=>pos.push(xc+x,my(xc+x,z)+0.0004,z));if(i<n){const a=i*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();g.add(new THREE.Mesh(geo,L(c)));};   // 上面に沿った細い帯
  strip(-0.0007,0.0007,0.004,0.0175,0x0d0d0f,12);strip(-0.0007,0.0007,0.0425,A*0.985,0x0d0d0f,8);   // 左右ボタンの境目の溝（ホイールの前後）
  strip(-0.0065,0.0065,0.0175,0.0425,0x0d0d0f,10);   // ホイールの溝
  {const ze=A*0.97*(1-0.6**SN)**(1/SN);[-1,1].forEach(k=>strip(-0.0006,0.0006,0.004,ze,0x2e2f32,16,z=>k*0.6*mw(z)));}   // ボタンと本体の境目（左右の細い線。幅の60%の所を前の縁までまっすぐ）
  {const zw=0.03,w=new THREE.Mesh(new THREE.CylinderGeometry(0.0095,0.0095,0.0075,28),L(0x45464a));w.rotation.z=Math.PI/2;w.position.set(0,my(0,zw)-0.0045,zw);g.add(w);}}   // ホイール（溝から少し出る）
// チェア：ユーザーの写真と寸法図の事務用チェア（黒、デフォルメ）。全幅560（肘掛けの外）、背もたれの幅470、脚の径680、座面の高さ470（440〜550の間）、全高約1030、肘掛けの上面670、背もたれは座面に対して97°
// 形：座面と背もたれは黒いレザー調。背もたれの上の帯（約13cm）はなめらかなレザー、その下と座面の奥はダイヤ柄のキルティング（細かい穴のメッシュ生地）、背もたれの裏の下側はメッシュ生地。肘掛けは角の丸い四角い輪（幅40）、座面の横にねじ止め
// 脚は平らな5本の鉄の棒＋キャスター、ガスシリンダーの上にギザギザのつまみ、座面の下の右側にレバー、前に張りのつまみ。座面の前がデスクの手前から8cm中に入る位置
 {const g=new THREE.Group();g.position.set(cx,OY,z0+DD+0.145);g.rotation.y=Math.PI;s.add(g);   // 子の座標：原点は座面の中心の真下、+Z＝座る人の正面（北）、+X＝座る人の左
  const ST=0.47,SD=0.45,SW=0.47,BK=0x19191b,
   lthC=noiseCanvas(512,[31,31,33],4,48,3),lth=P({map:tex(lthC),bumpMap:tex(lthC),bumpScale:0.03,specular:0x4a4a4c,shininess:34}),   // レザー調（なめらか、ごく細かいしぼと弱いむら）
   qC=cv((x,W,H)=>{x.fillStyle='#262628';x.fillRect(0,0,W,H);for(let yy=1;yy<H;yy+=4)for(let xx=(yy%8<4?1:3);xx<W;xx+=4){x.fillStyle='#161617';x.fillRect(xx,yy,2,2);}   // 細かい穴のメッシュ生地
    x.lineWidth=3;x.strokeStyle='#0c0c0d';[[0,0,W,H],[W,0,0,H],[-W/2,H/2,W/2,-H/2],[W/2,H*1.5,W*1.5,H/2],[W/2,-H/2,W*1.5,H/2],[-W/2,H/2,W/2,H*1.5]].forEach(([a,b,c,d])=>{x.beginPath();x.moveTo(a,b);x.lineTo(c,d);x.stroke();});   // ダイヤ柄の縫い目（へこみ）
    x.lineWidth=1.5;x.strokeStyle='rgba(92,92,98,0.9)';[[3,0,W+3,H],[W+3,0,3,H],[-W/2+3,H/2,W/2+3,-H/2],[W/2+3,H*1.5,W*1.5+3,H/2],[W/2+3,-H/2,W*1.5+3,H/2],[-W/2+3,H/2,W/2+3,H*1.5]].forEach(([a,b,c,d])=>{x.beginPath();x.moveTo(a,b);x.lineTo(c,d);x.stroke();});},128,128),   // 縫い目の脇のふくらみの光
   QT=0.06,qm=(w,h)=>{const m=P({map:tex(qC),specular:0x151515,shininess:10});texR(m,w/QT,h/QT);return m;},   // QT：ダイヤ柄1つの幅
   mC=cv((x,W,H)=>{x.fillStyle='#202022';x.fillRect(0,0,W,H);for(let yy=0;yy<H;yy+=3)for(let xx=(yy%6?1:0);xx<W;xx+=3){x.fillStyle='#141415';x.fillRect(xx,yy,2,2);}},96,96),
   rib=(r,h,n)=>{const geo=new THREE.CylinderGeometry(r,r,h,n*2,1);const p=geo.attributes.position;for(let v=0;v<p.count;v++){const X=p.getX(v),Z=p.getZ(v),a=Math.atan2(Z,X),d=Math.hypot(X,Z);if(d<1e-6)continue;const k=Math.round(a/(Math.PI/n))%2?0.88:1;p.setX(v,Math.cos(a)*d*k);p.setZ(v,Math.sin(a)*d*k);}geo.computeVertexNormals();return new THREE.Mesh(geo,L(0x1e1e20));};   // ギザギザのつまみ
  // 脚：平らな鉄の棒5本（幅36・厚さ18、先へ少し下がる）、中央のハブ、キャスター（フード付きの単輪）
  {const h=new THREE.Mesh(new THREE.CylinderGeometry(0.034,0.04,0.05,24),L(BK));h.position.y=0.085;g.add(h);}
  for(let i=0;i<5;i++){const lg=new THREE.Group();lg.rotation.y=i*Math.PI*2/5;g.add(lg);
   const b=lbox(lg,0.036,0.018,0.28,0,0.083,0.175,BK);b.rotation.x=0.06;lbox(lg,0.036,0.02,0.03,0,0.068,0.31,BK);   // 棒と先の受け
   const w=new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.025,0.018,22),L(0x111113));w.rotation.z=Math.PI/2;w.position.set(0,0.025,0.322);lg.add(w);
   const hd=new THREE.Mesh(new THREE.CylinderGeometry(0.029,0.029,0.026,22,1,false,0,Math.PI),L(BK));hd.rotation.z=Math.PI/2;hd.rotation.y=Math.PI/2;hd.position.set(0,0.03,0.322);lg.add(hd);}   // 車輪と上半分のフード
  {const c=new THREE.Mesh(new THREE.CylinderGeometry(0.024,0.026,0.2,22),L(BK));c.position.y=0.2;g.add(c);const c2=new THREE.Mesh(new THREE.CylinderGeometry(0.015,0.015,0.06,16),L(0x232325));c2.position.y=0.33;g.add(c2);   // ガスシリンダー
   const k=rib(0.03,0.036,14);k.position.y=0.36;g.add(k);}   // シリンダーの上のギザギザのつまみ
  lbox(g,0.2,0.03,0.22,0,0.395,-0.01,BK);   // 座面の下の金具
  {const lv=new THREE.Group();lv.position.set(-0.09,0.39,0.02);lv.rotation.y=-0.25;g.add(lv);lbox(lv,0.16,0.008,0.018,-0.08,0,0,BK);lbox(lv,0.04,0.012,0.03,-0.16,-0.002,0.005,BK);}   // レバー（座る人の右へ出る）
  {const k=rib(0.022,0.03,12);k.position.set(0,0.38,0.14);g.add(k);}   // 座面の前の下の張りのつまみ
  // 座面：レザー調のクッション（W470×D450×厚さ80、上面は床から470）。奥はキルティング、前はレザー
  rbox(g,SW,0.08,SD,0.03,0,ST-0.04,0,lth);
  {const q=new THREE.Mesh(new THREE.PlaneGeometry(SW-0.07,0.27),qm(SW-0.07,0.27));q.rotation.x=-Math.PI/2;q.position.set(0,ST+0.0008,-0.07);g.add(q);lbox(g,SW-0.07,0.002,0.004,0,ST+0.0005,0.065,0x2c2c2e);}   // キルティングとレザーの境の縫い目
  // 背もたれ：幅470・高さ550・厚さ55、上の角を大きく丸めた板。座面の後ろに、座面に対して97°（少し後ろへ倒す）
  {const bk=new THREE.Group();bk.position.set(0,ST-0.06,-SD/2-0.03);bk.rotation.x=-0.12;g.add(bk);   // 子の座標：y＝背もたれの下端から上、+Z＝前
   const BW=SW,BH=0.55,R1=0.07,R0=0.02,TH=0.045,BV=0.005,sh=new THREE.Shape();sh.moveTo(-BW/2+R0,0);sh.lineTo(BW/2-R0,0);sh.absarc(BW/2-R0,R0,R0,-Math.PI/2,0);sh.lineTo(BW/2,BH-R1);sh.absarc(BW/2-R1,BH-R1,R1,0,Math.PI/2);sh.lineTo(-BW/2+R1,BH);sh.absarc(-BW/2+R1,BH-R1,R1,Math.PI/2,Math.PI);sh.lineTo(-BW/2,R0);sh.absarc(-BW/2+R0,R0,R0,Math.PI,Math.PI*1.5);
   const geo=new THREE.ExtrudeGeometry(sh,{depth:TH,bevelEnabled:true,bevelThickness:BV,bevelSize:BV,bevelSegments:3,curveSegments:12});geo.translate(0,0,-TH/2);const bm=lth.clone();bm.map=lth.map.clone();bm.map.repeat.set(4,4);bm.map.needsUpdate=true;bk.add(new THREE.Mesh(geo,bm));   // 本体（レザー調）
   const Q0=0.03,Q1=BH-0.14,fz=TH/2+BV+0.0008,q=new THREE.Mesh(new THREE.PlaneGeometry(BW-0.03,Q1-Q0),qm(BW-0.03,Q1-Q0));q.position.set(0,(Q0+Q1)/2,fz);bk.add(q);   // 前：キルティング（上の約14cmはレザーのまま）
   lbox(bk,BW-0.03,0.003,0.002,0,Q1,fz,0x2c2c2e);   // レザーとキルティングの境の縫い目
   const mm=P({map:tex(mC),specular:0x111111,shininess:8});texR(mm,BW/0.03,(Q1-0.02)/0.03);const rq=new THREE.Mesh(new THREE.PlaneGeometry(BW-0.05,Q1-0.04),mm);rq.rotation.y=Math.PI;rq.position.set(0,Q1/2+0.0,-fz);bk.add(rq);   // 裏：下側はメッシュ生地
   lbox(bk,0.16,0.12,0.03,0,0.02,-TH/2-0.012,BK);}   // 裏の下：座面の下の金具とつなぐ部分
  // 肘掛け：角の丸い四角い輪（長さ320・高さ260・太さ30・幅40）。前の端は座面の前にそろえ、下の辺は座面の横（座面の上面から60下）
  {const AL=0.32,AH=0.26,AT=0.03,ro=0.035,ri=0.008,rr=(p,u0,v0,u1,v1,r,hole)=>{p.moveTo(u0+r,v0);p.lineTo(u1-r,v0);p.absarc(u1-r,v0+r,r,-Math.PI/2,0);p.lineTo(u1,v1-r);p.absarc(u1-r,v1-r,r,0,Math.PI/2);p.lineTo(u0+r,v1);p.absarc(u0+r,v1-r,r,Math.PI/2,Math.PI);p.lineTo(u0,v0+r);p.absarc(u0+r,v0+r,r,Math.PI,Math.PI*1.5);};
   const sh=new THREE.Shape();rr(sh,-SD/2,0,-SD/2+AL,AH,ro);const hl=new THREE.Path();rr(hl,-SD/2+AT,AT,-SD/2+AL-AT,AH-AT,ri);sh.holes.push(hl);   // u＝−z（前が負）、v＝高さ
   const geo=new THREE.ExtrudeGeometry(sh,{depth:0.034,bevelEnabled:true,bevelThickness:0.003,bevelSize:0.003,bevelSegments:2,curveSegments:10});geo.rotateY(Math.PI/2);   // 押し出しの向きを +X に（u は −z へ）
   [-1,1].forEach(k=>{const m=new THREE.Mesh(geo,P({color:0x1a1a1c,specular:0x2a2a2a,shininess:24}));m.position.set(k>0?SW/2+0.008:-SW/2-0.045,ST-0.06,0);g.add(m);
    [-0.11,0.05].forEach(z=>{const sc=new THREE.Mesh(new THREE.CylinderGeometry(0.005,0.005,0.004,12),L(0x0c0c0d));sc.rotation.z=Math.PI/2;sc.position.set(k*(SW/2+0.046),ST-0.045,z);g.add(sc);});});}}   // 下の辺のねじ（外側）
}
// ダウンライト：L1（ウォークイン）RMN(P1) 昼白色5000K、K1（書斎）RMW(P1) 温白色3500K。器具・配光は洗面所のD1・キッチンのA1と同じ
const dl=(x,z,c)=>{const y=OY+H,em=new THREE.MeshBasicMaterial({color:0xd9d8d4}),ring=new THREE.Mesh(new THREE.CylinderGeometry(0.058,0.058,0.004,32),L(0xf7f7f5));ring.position.set(x,y-0.002,z);s.add(ring);
 const lamp=new THREE.Mesh(new THREE.CylinderGeometry(0.044,0.044,0.005,32),em);lamp.position.set(x,y-0.003,z);s.add(lamp);
 const sp=new THREE.SpotLight(c,0,5,THREE.MathUtils.degToRad(62),0.8,1.3);sp.position.set(x,y-0.02,z);sp.target.position.set(x,OY,z);s.add(sp);s.add(sp.target);return {sp,em};};
const l1=dl((WX0+WX1)/2+0.12,(WZ0+WZ1)/2,0xfff3e8),k1=dl((SX0+SX1)/2,(SZ0+SZ1)/2,0xffd9b4);   // L1：南北は中央、東西は中央から東へ120。K1：天井の中心
const S={shadeP:0,zoneLights:[[[l1.sp],['wic']],[[k1.sp],['study']],[myWins.map(w=>w.light),['study']]],
 boxes:[[WX0+WM,WX1-WM,OY+0.2,OY+H-0.08,WZ0+WM,WZ1-WM],[SX0+WM,SX1-WM,OY+0.2,OY+H-0.08,SZ0+WM,SZ1-WM],   // ウォークイン・書斎
  ifOpen('sg500w',[WX0-T-WM-0.01,WX0+WM+0.01,OY+0.2,OY+1.95,(WZ0+WZ1)/2-0.3,(WZ0+WZ1)/2+0.3]),ifOpen('sg33s',[WX0-T-WM-0.01,WX0+WM+0.01,OY+0.2,OY+1.95,SZ1-0.795+0.08,SZ1-0.08])],   // 入口（開いたドア）
 obs:[[WX0,WX1,OY,OY+H+0.1,WZ0,WZ0+0.45],[WX1-0.45,WX1,OY,OY+H+0.1,WZ0,WZ1],[WX0,WX1,OY,OY+H+0.1,WZ1-0.45,WZ1]],   // ウォークインの棚（北・東・南。奥行450、床から天井まで）
 setShade(p){S.shadeP=p;applyShades(myShades,p);},
 applyEnv(night){const f=night?1:0.3,off=night?0x2a2927:0xa8a6a1;l1.sp.intensity=LS.l1?0.8*f:0;l1.em.color.set(LS.l1?0xf6f8ff:off);k1.sp.intensity=LS.k1?0.8*f:0;k1.em.color.set(LS.k1?0xfff1e0:off);
  dayRatio(myWins,S.shadeP);myWins.forEach(w=>w.light.intensity=night?0:w.I*w.t);const e=ceilMat.emissive.r/0.98;wicC.emissive.setRGB(161/255*e,171/255*e,183/255*e);stC.emissive.setRGB(145/255*e,148/255*e,148/255*e);}};   // 天井の明るさは寝室・LDKの天井（ceilMat）と同じ割合（LDKの applyEnv の後に呼ぶ）
return S;}

