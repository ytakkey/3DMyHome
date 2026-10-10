// ===== 寝室（2階 主寝室 6帖）：座標は家全体と同じ（OX・OY・OZ＝寝室の北西の室内角と2階の床の高さ） =====
function buildBedroom(scene){
const {X0:OX,Z0:OZ,W,D,H,doorA,doorB}=HOUSE.bed,OY=HOUSE.ldk.FL2;
s=scene;shades=[];winLights=[];const myShades=shades,myWins=winLights;
// 寝室の補助光（全部屋共通の fillLights。届く範囲を寝室に限るため、LDKとは別の光源の組にする）
const BF=fillLights(scene);
const wallM=tmat(plasterC),wovenM=tmat(wovenC),oakWallM=tmat(oakC);texR(oakWallM,D/0.6,1);
// 天井（床は廊下と一枚の「2階の床」として buildLDK で作る）
ceilRect(OX,OX+W,OZ,OZ+D,OY+H,ceilMat,0.4);
// 西：アクセント面（上部IC-2003、高さ1000の腰壁はIC-5015＋ブラックウォルナットの天板）
vplane(D,1.4,wovenM,OX,OY+1.7,OZ+D/2,Math.PI/2,0.3);
box(0.1,1.0,D,OX+0.05,OY+0.5,OZ+D/2,oakWallM);
box(0.11,0.025,D,OX+0.055,OY+1.0125,OZ+D/2,0x3f2b1f);
box(0.012,0.06,D,OX+0.106,OY+0.03,OZ+D/2,FIT);
// 北・東（ウォークイン、書斎のドア）・南（FK2442×2）
buildWall(wallGroup(OX,OY,OZ,0),W,H,[{a:doorA,b:doorB,y1:0,y2:2.0,door:'slide',open:1,T:OZ-HOUSE.ldk.PZ0,toggle:'sg311',dir:-1}],wallM,1,true);   // 北（廊下からの入口SG311：1階と同じインセットの引き戸。西へ引いて開ける。壁の厚さ115、廊下側の面はY4の壁芯-57.5）
{const WC=(HOUSE.wic.Z0+HOUSE.wic.Z1)/2-OZ;buildWall(wallGroup(OX+W,OY,OZ,-Math.PI/2),D,H,[{a:WC-0.38,b:WC+0.38,y1:0,y2:2.0,door:'outset',T:HOUSE.wic.X0-OX-W,toggle:'sg500w',noWin:1},{a:D-0.795,b:D,y1:0,y2:2.0,door:'frame'}],wallM,1,true);}   // ウォークインのSG500（アウトセットの引き戸、寝室側、小窓なし。開口の中心はウォークインの南北の中央、南へ引く）、書斎のSG33（開口は南の壁の面から795。扉は書斎側）
buildWall(wallGroup(OX+W,OY,OZ+D,Math.PI),W,H,[{a:0.9215,b:1.6645,y1:0.969,y2:2.144,win:1},{a:0.1215,b:0.8645,y1:0.969,y2:2.144,win:1}],wallM,1,true);   // FK2442×2（2枚の中心はX=-0.553、平面図から）
// コンセント（Sプレート・ブラック）
[[D-0.62-0.13,D-0.62],[0.62,0.75]].forEach(([a,b])=>box(0.008,0.075,b-a,OX+0.004,OY+1.05+0.0375,OZ+(a+b)/2,0x1f1f1f));
// ブラケットライト O2：OB255280LR（黒い樹脂の箱型、巾□75・出90、上下に光る、電球色2700K・318lm（上下に半分ずつ））。外側の端が両端の壁から620mm、下端1600
const BR_W=0.075,BR_D=0.09,BR_Y=OY+1.6+0.075/2,BRI=1.15,BRGLOW=0xffd9a8;
const brHouse=P({color:0x1a1a1a,specular:0x2a2a2a,shininess:30});
const brGlow=new THREE.MeshBasicMaterial({color:BRGLOW,side:THREE.DoubleSide});
const brs=[];
[OZ+D-0.62-BR_W/2,OZ+0.62+BR_W/2].forEach(z=>{
 box(0.006,BR_W,BR_W,OX+BR_D-0.003,BR_Y,z,brHouse);box(BR_D,BR_W,0.006,OX+BR_D/2,BR_Y,z-BR_W/2+0.003,brHouse);
 box(BR_D,BR_W,0.006,OX+BR_D/2,BR_Y,z+BR_W/2-0.003,brHouse);box(0.006,BR_W,BR_W,OX+0.003,BR_Y,z,brHouse);
 const gp=new THREE.Mesh(new THREE.PlaneGeometry(BR_D-0.02,BR_W-0.02),brGlow);gp.rotation.x=Math.PI/2;gp.position.set(OX+BR_D/2,BR_Y,z);s.add(gp);
 [1,-1].forEach(dir=>{const sp=new THREE.SpotLight(WARM,BRI,3,THREE.MathUtils.degToRad(65),0.9,1.1);sp.position.set(OX+BR_D,BR_Y+dir*0.02,z);sp.target.position.set(OX+BR_D-0.25,BR_Y+dir*2,z);s.add(sp);s.add(sp.target);brs.push(sp);});});
// ダウンライト O1×3：RML(P1)（電球色2700K。器具・配光・明るさは2階廊下のJ1・玄関のB1/B2/F1と同じ）
const DLON=0xffe2b8,DLI=0.8;
const dlMat=new THREE.MeshBasicMaterial({color:DLON});
const dls=[];
[0.99,1.8,2.6].forEach(dz=>{const x=OX+1.8,y=OY+H,z=OZ+dz;const ring=new THREE.Mesh(new THREE.CylinderGeometry(0.058,0.058,0.004,32),L(0xf7f7f5));ring.position.set(x,y-0.002,z);s.add(ring);const disc=new THREE.Mesh(new THREE.CylinderGeometry(0.044,0.044,0.0025,32),dlMat);disc.position.set(x,y-0.00525,z);s.add(disc);const sp=new THREE.SpotLight(0xffc68e,DLI,5,THREE.MathUtils.degToRad(62),0.8,1.3);sp.position.set(x,y-0.02,z);sp.target.position.set(x,OY,z);s.add(sp);s.add(sp.target);dls.push(sp);});
// エアコン（ダイキン AXシリーズ、北の壁の西寄り・天井から約7cm下）
acUnit(OX+0.6,OY+H-0.065-0.295,OZ,0);
// ベッド（幅2400×長さ2000の1台。頭は西の壁側）：x＝長さ（bx0が頭）、z＝幅。形はデフォルメ、寸法・色は仮（ダブル＋シングルを並べた合計の大きさ）
const BL=2.0,BW=2.4,bx0=OX+0.1,bz0=OZ+0.62,by0=OY,bxc=bx0+BL/2,bzc=bz0+BW/2,MT=by0+0.54;   // MT：マットレスの上面
const bedWood=P({color:0xa9835c,specular:0x1c1813,shininess:20}),bedCloth=P({color:0xf4f2ee,specular:0x111111,shininess:4}),bedDuvet=P({color:0xc9cdd2,specular:0x111111,shininess:4}),bedPillow=P({color:0xfbfbf9,specular:0x111111,shininess:4});
box(BL-0.08,0.06,BW-0.08,bxc,by0+0.03,bzc,0x5c4632);   // 台輪（床から60、周りから40内側へへこませる）
rbox(s,BL,0.24,BW,0.012,bxc,by0+0.18,bzc,bedWood);   // フレーム（木、角を少し丸める）
rbox(s,BL-0.03,0.24,BW-0.03,0.06,bxc,by0+0.42,bzc,bedCloth);   // マットレス（厚さ240、角を大きく丸める）
{const d0=bx0+BL*0.32,d1=bx0+BL+0.03,dc=(d0+d1)/2,dl=d1-d0;   // 掛け布団：足元側の約2/3を覆い、左右と足元に垂れる。頭側は折り返す
 rbox(s,dl,0.07,BW+0.07,0.032,dc,MT+0.035,bzc,bedDuvet);
 [bz0-0.04,bz0+BW+0.04].forEach(z=>rbox(s,dl,0.24,0.036,0.017,dc,MT-0.075,z+(z<bzc?0.018:-0.018),bedDuvet));   // 左右の垂れ（布団の端から2mm外へ）
 rbox(s,0.036,0.24,BW+0.08,0.017,d1+0.005-0.018,MT-0.075,bzc,bedDuvet);   // 足元の垂れ
 rbox(s,0.18,0.09,BW+0.08,0.04,d0+0.08,MT+0.045,bzc,P({color:0xd6d9dd,specular:0x111111,shininess:4}));}   // 折り返し（少し明るい裏地）
[bz0+0.6,bz0+BW-0.6].forEach(z=>rbox(s,0.43,0.15,0.63,0.07,bx0+0.05+0.215,MT+0.065,z,bedPillow));   // 枕×2（630×430、ふくらみを出す。マットレスへ1cm沈める）
// 状態・視点
const S={shadeP:0,zoneLights:[[dls,['bed','hallNearBed']],[brs,['bed','hallNearBed']],[myWins.map(w=>w.light),['bed','hallNearBed']],[[BF.hemi,BF.sun,BF.up],['bedG']]],
 setShade(p){S.shadeP=p;applyShades(myShades,p);},
 applyEnv(night){const f=night?1:0.3,dOn=LS.bdl,bOn=LS.bbr;dlMat.color.set(dOn?DLON:(night?0x2a2927:0xa8a6a1));brGlow.color.set(bOn?BRGLOW:0x3a3a3a);dls.forEach(p=>p.intensity=dOn?DLI*f:0);brs.forEach(p=>p.intensity=bOn?BRI*f:0);   // 点灯状態は LS（全体の照明の状態）から
  fillEnv(BF,night,dayRatio(myWins,S.shadeP));myWins.forEach(w=>w.light.intensity=night?0:w.I*w.t);},
 home(){look(OX+2.42,OY+EYE,OZ+3.31,OX+0.2,OY+0.85,OZ,85);}};
return S;}

function rbox(g,w,h,d,r,x,y,z,m,rx){const k=6,ns=2*k+2,hs=[w/2,h/2,d/2],geo=new THREE.BoxGeometry(1,1,1,ns,ns,ns),p=geo.attributes.position,nm=geo.attributes.normal,uv=geo.attributes.uv,nf=(ns+1)*(ns+1);   // すべての辺と角を同じ半径rで丸めた箱（辺の近くに頂点を集め、法線は丸めた面から計算）
 const mp=(t,hl)=>{const i=Math.round((t+0.5)*ns),hi=hl-r;if(i<=k)return -hi-r*Math.cos(i/k*Math.PI/2);if(i>=ns-k)return hi+r*Math.cos((ns-i)/k*Math.PI/2);return (i-k-1)*hi;};
 for(let v=0;v<p.count;v++){const a=[mp(p.getX(v),hs[0]),mp(p.getY(v),hs[1]),mp(p.getZ(v),hs[2])],c=a.map((q,j)=>Math.max(-hs[j]+r,Math.min(hs[j]-r,q))),n=a.map((q,j)=>q-c[j]),l=Math.hypot(...n)||1;
  const q=c.map((cc,j)=>cc+n[j]/l*r);p.setXYZ(v,...q);nm.setXYZ(v,n[0]/l,n[1]/l,n[2]/l);const f=Math.floor(v/nf),ax=f<2?[2,1]:f<4?[0,2]:[0,1];uv.setXY(v,q[ax[0]],q[ax[1]]);}
 const ms=new THREE.Mesh(geo,m);ms.position.set(x,y,z);if(rx)ms.rotation.x=rx;g.add(ms);return ms;}
