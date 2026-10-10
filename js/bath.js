// ===== 浴室（1階。グレイスバス 1.25坪、カラー：ジャポネ。座標はLDKと同じ） =====
// 公式画像（奥＝北）から：北の壁はベージュの木目調パネル（中央に継ぎ目）、ほかの壁は明るいグレーのパネル、天井は木目調（中央に継ぎ目）、床はグレーがかった茶色の石目調
// 浴槽は西の壁ぞい（平面図から。幅800・北の壁から南の壁まで）、北の壁にカウンター（壁から壁まで）・水栓・ハンドシャワーとマグネット式のフック2つ・鏡、東の壁にタオル掛け2本。寸法・位置は写真の比率から（仮置き）
// 入口は脱衣室の北の壁の浴室のドア（東側吊元で浴室側へ95°開く。扉と枠は脱衣室の部分で作る）
function buildBath(sc,M){s=sc;shades=[];winLights=[];
const {X0,X1,Z0,Z1,H:BH}=HOUSE.bath,{bathA,bathB,DZ0}=HOUSE.wash,WM=HOUSE.wallMargin,BW=X1-X0;
const hs=(x,y)=>{let h=Math.imul(x|0,374761393)+Math.imul(y|0,668265263)|0;h=Math.imul(h^h>>>13,1274126177);return((h^h>>>16)>>>0)/4294967296;};
const vn=(x,y,px,py)=>{const xi=Math.floor(x),yi=Math.floor(y),fx=x-xi,fy=y-yi,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy),m=(a,b)=>hs(((a%px)+px)%px,((b%py)+py)%py),a=m(xi,yi),b=m(xi+1,yi),c=m(xi,yi+1),d=m(xi+1,yi+1);return a+(b-a)*sx+(c-a)*sy+(a-b-c+d)*sx*sy;};   // 周期つきのなめらかなノイズ（タイルの端で継ぎ目が出ない）
const pix=(N,f)=>cv((x,W,H)=>{const im=x.createImageData(W,H),D=im.data;for(let y=0;y<H;y++)for(let i=0;i<W;i++){const c=f(i/W,y/H,i,y),o=(y*W+i)*4;D[o]=clamp8(c[0]);D[o+1]=clamp8(c[1]);D[o+2]=clamp8(c[2]);D[o+3]=255;}x.putImageData(im,0,0);},N,N);   // ピクセル単位で計算したテクスチャ
// 北の壁：ベージュの木目調（横方向の細かい筋。1枚＝1m四方）
const wdN=pix(512,(u,v)=>{const w=vn(u*2,v*3,2,3),n1=vn(u*3,v*140+w*1.5,3,140),n2=vn(u*14,v*420+w*3,14,420),k=0.95+0.04*n1+0.045*n2-(n2>0.78?0.025:0);return [222*k,214*k,200*k];});
// 天井：木目調（筋は南北。色は写真から）
const wdC=pix(512,(u,v)=>{const w=vn(u*5,v*2,5,2),n1=vn(u*90+w*6,v*3,90,3),n2=vn(u*260+w*14,v*12,260,12),n3=vn(u*7,v*2,7,2),k=0.88+0.12*n1+0.07*n2+0.06*n3-(n2>0.72?0.07:0);return [151*k,120*k,90*k];});
// 床：ベージュの地に茶色の粒がまばらに散る砂利調（写真から。0.6m四方）。周期つきのボロノイ2段（大きめの粒約5〜9mm・小さい粒約2〜4mm）でセルごとに色を決め、ベージュどうしはつながって地になる。境はノイズで不規則にゆがめる
const vor=(x,y,C,sd)=>{const cx=Math.floor(x),cy=Math.floor(y);let bd=9,id=0;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const gx=cx+a,gy=cy+b,mx=((gx%C)+C)%C,my=((gy%C)+C)%C,px=gx+0.1+0.8*hs(mx+sd,my),py=gy+0.1+0.8*hs(my+911,mx+sd),d=(px-x)**2+(py-y)**2;if(d<bd){bd=d;id=hs(mx+313+sd,my+7171);}}return id;};   // vor：セル（周期C）ごとの乱数
const flC=pix(1024,(u,v,i,y)=>{const w1=vn(u*20,v*20,20,20)-0.5,w2=vn(u*20+5.7,v*20+2.3,20,20)-0.5,f1=vn(u*90,v*90,90,90)-0.5,f2=vn(u*90+3.3,v*90+8.1,90,90)-0.5,
 A=vor(u*80+w1*1.4+f1*0.5,v*80+w2*1.4+f2*0.5,80,0),B=vor(u*190+w1*2+f1*1.2,v*190+w2*2+f2*1.2,190,57),
 c=A<0.13?[146,122,98]:A<0.17?[110,90,72]:B<0.2?[152,128,104]:B<0.25?[118,97,78]:B<0.31?[226,216,201]:[212,197,175],k=0.97+0.05*vn(u*6,v*6,6,6)+(hs(i,y)-0.5)*0.05;return [c[0]*k,c[1]*k,c[2]*k];});
const grayM=P({color:0xe2e3e4,specular:0x2a2a2a,shininess:30}),woodNM=tmat(wdN,{specular:0x1e1c1a,shininess:20}),ceilBM=tmat(wdC,{specular:0x141210,shininess:14}),floorBM=tmat(flC,{specular:0x141414,shininess:12}),ctrM=tmat(nsTopC,{specular:0x3a3a3a,shininess:45});   // ctrM：カウンター（キッチンの天板と同じ黒のみかげ調 nsTopC）
// メッキの映り込み：浴室の中を大まかに描いた周りの景色（天井・壁・カウンター・床の明暗と、明るい窓のような面）を映す。映り込みは照明に関係なく見えるので、明るさ（reflectivity）は昼夜と照明で変える（applyEnv）
const envT=(()=>{const f=(side)=>cv((x,W,H)=>{if(side==='py'){x.fillStyle='#f4f2ee';x.fillRect(0,0,W,H);const gr=x.createRadialGradient(W/2,H/2,0,W/2,H/2,W*0.3);gr.addColorStop(0,'#ffffff');gr.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=gr;x.fillRect(0,0,W,H);return;}
  if(side==='ny'){x.fillStyle='#a39684';x.fillRect(0,0,W,H);return;}
  const gr=x.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#fbfaf8');gr.addColorStop(0.4,'#e6e6e4');gr.addColorStop(0.52,'#c9c8c4');gr.addColorStop(0.55,'#2c2c2e');gr.addColorStop(0.6,'#2c2c2e');gr.addColorStop(0.63,'#a9a7a2');gr.addColorStop(1,'#9c8f7e');x.fillStyle=gr;x.fillRect(0,0,W,H);   // 上から：明るい天井側・壁・濃いカウンター・床
  if(side==='pz'||side==='px'){const g2=x.createLinearGradient(W*0.3,0,W*0.7,0);g2.addColorStop(0,'rgba(255,255,255,0)');g2.addColorStop(0.5,'rgba(255,255,255,0.95)');g2.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g2;x.fillRect(W*0.3,H*0.08,W*0.4,H*0.4);}   // 明るい面（照りの筋）
  if(side==='nx'||side==='nz'){x.fillStyle='rgba(60,60,62,0.55)';x.fillRect(W*0.62,H*0.1,W*0.06,H*0.45);}},128,128);   // 暗い縦の筋
 const t=new THREE.CubeTexture(['px','nx','py','ny','pz','nz'].map(f));t.needsUpdate=true;return t;})();
const tubM=P({color:0xf6f6f4,specular:0x666666,shininess:60}),cm=new THREE.MeshPhongMaterial({color:0x8e9194,specular:0xffffff,shininess:140,envMap:envT,combine:THREE.MixOperation,reflectivity:0.75}),hoseM=P({color:0xb8babc,specular:0xffffff,shininess:80}),wtM=P({color:0xf5f5f3,specular:0x444444,shininess:40});   // cm：メッキ（ハンドシャワー・フック・ハンドル・ハンガーなど。周りの景色を映す）
// 壁・床・天井（壁の室内面。床と天井は浴室の内寸）
buildWall(wallGroup(X0,0,Z0,0),BW,BH,[],woodNM,1,false);                                       // 北（木目調）
buildWall(wallGroup(X0,0,Z1,Math.PI/2),Z1-Z0,BH,[],grayM,1,false);                              // 西
buildWall(wallGroup(X1,0,Z0,-Math.PI/2),Z1-Z0,BH,[],grayM,1,false);                             // 東
buildWall(wallGroup(X1,0,Z1,Math.PI),BW,BH,[{a:X1-bathB,b:X1-bathA,y1:0,y2:2.0}],grayM,1,false);   // 南（浴室のドアの開口）
box(0.002,BH,0.001,X0+BW/2,BH/2,Z0+0.0006,0xb6ab98);                                           // 北の壁の継ぎ目（中央）
const TX1=X0+0.8,TY=0.41;let waterM;   // 浴槽の東の面（エプロン）・上面の高さ
floorRect(TX1,X1,Z0,Z1,0.002,floorBM,0.6);
ceilRect(X0,X1,Z0,Z1,BH,ceilBM,1.0);box(0.002,0.001,Z1-Z0,X0+BW/2,BH-0.0006,(Z0+Z1)/2,0x6a5240);   // 天井と中央の継ぎ目
// 浴槽（白）：外形は幅800×長さ1600（壁から壁まで）、上面の高さ410。内側は角を大きく丸めた長円形で、上の口から底へ丸く下がる（底は床から−140）。南の縁が広い（仮）
{const top=[X0+0.10,Z0+0.10,TX1-0.08,Z1-0.17],bot=[X0+0.19,Z0+0.22,TX1-0.16,Z1-0.40],YB=-0.14,NC=10,NL=14;   // 口・底（西,北,東,南）
 const rr=(c,r)=>{const [a,b,cc,d]=c,p=[];[[cc-r,b+r,-Math.PI/2],[cc-r,d-r,0],[a+r,d-r,Math.PI/2],[a+r,b+r,Math.PI]].forEach(([x,z,a0])=>{for(let k=0;k<=NC;k++){const t=a0+k/NC*Math.PI/2;p.push([x+r*Math.cos(t),z+r*Math.sin(t)]);}});return p;};   // 角を丸めた四角形の周（どの段も同じ点の数）
 const pos=[],idx=[],col=[];let N=0;
 for(let l=0;l<=NL;l++){const t=l/NL,eh=1-Math.cos(t*Math.PI/2),ev=Math.sin(t*Math.PI/2),c=top.map((q,i)=>q+(bot[i]-q)*eh),pts=rr(c,0.24-0.08*eh);N=pts.length;pts.forEach(([x,z])=>{pos.push(x,TY-(TY-YB)*ev,z);const k=1-0.1*ev;col.push(k,k,k*0.995);});}   // 上で立ち、下で丸く底へつながる
 for(let l=0;l<NL;l++)for(let k=0;k<N;k++){const a=l*N+k,b=l*N+(k+1)%N;idx.push(a,b,a+N,b,b+N,a+N);}
 {const c0=pos.length/3;pos.push((bot[0]+bot[2])/2,YB,(bot[1]+bot[3])/2);col.push(0.9,0.9,0.895);for(let k=0;k<N;k++)idx.push(c0,NL*N+k,NL*N+(k+1)%N);}   // 底
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));geo.setIndex(idx);geo.computeVertexNormals();s.add(new THREE.Mesh(geo,P({color:0xf6f6f4,specular:0x666666,shininess:60,side:THREE.DoubleSide,vertexColors:true})));
 const sh=new THREE.Shape([[X0,-Z0],[TX1-0.012,-Z0],[TX1-0.012,-Z1],[X0,-Z1]].map(([x,y])=>new THREE.Vector2(x,y)));sh.holes.push(new THREE.Path(rr(top,0.24).map(([x,z])=>new THREE.Vector2(x,-z))));   // 上面（口の穴あき）
 const tg=new THREE.ShapeGeometry(sh);tg.rotateX(-Math.PI/2);const tp=new THREE.Mesh(tg,tubM);tp.position.y=TY;s.add(tp);
 {const WY=TY-0.12,ev=(TY-WY)/(TY-YB),eh=1-Math.cos(Math.asin(ev)),c=top.map((q,i)=>q+(bot[i]-q)*eh),wg=new THREE.ShapeGeometry(new THREE.Shape(rr(c,0.24-0.08*eh).map(([x,z])=>new THREE.Vector2(x,-z))));wg.rotateX(-Math.PI/2);   // お湯：縁から120下の水面（浴槽の内側の形をその高さで切った形）
  const rpC=cv((x,W,H)=>{const im=x.createImageData(W,H),D=im.data,T=Math.PI*2,h=(i,j)=>0.5*Math.sin(T*(2*i/W+0.3*Math.sin(T*j/H)))+0.4*Math.sin(T*(3*j/H+0.25*Math.sin(T*2*i/W)))+0.2*Math.sin(T*(5*i/W+4*j/H));for(let j=0;j<H;j++)for(let i=0;i<W;i++){const nx=-(h(i+1,j)-h(i-1,j))*6,ny=-(h(i,j+1)-h(i,j-1))*6,l=Math.hypot(nx,ny,1),o=(j*W+i)*4;D[o]=(nx/l*0.5+0.5)*255;D[o+1]=(ny/l*0.5+0.5)*255;D[o+2]=(1/l*0.5+0.5)*255;D[o+3]=255;}x.putImageData(im,0,0);},128,128),rpT=tex(rpC);rpT.repeat.set(2,2);   // 水面のゆるい波（向きのテクスチャ）
  waterM=new THREE.MeshPhongMaterial({color:0x8adcec,transparent:true,opacity:0.48,specular:0xffffff,shininess:120,envMap:envT,combine:THREE.MixOperation,reflectivity:0.12,normalMap:rpT,normalScale:new THREE.Vector2(0.08,0.08),depthWrite:false});   // 澄んだ水色（下の浴槽が透けて見える）
  const w=new THREE.Mesh(wg,waterM);w.position.y=WY;s.add(w);}
 box(0.02,TY-0.012,Z1-Z0,TX1-0.01,(TY-0.012)/2,(Z0+Z1)/2,tubM);   // エプロン（東の面）
 {const c=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.012,Z1-Z0,16),tubM);c.rotation.x=Math.PI/2;c.position.set(TX1-0.012,TY-0.012,(Z0+Z1)/2);s.add(c);}   // 上面とエプロンの角（丸い）
 box(0.001,0.004,Z1-Z0,TX1+0.0005,TY-0.045,(Z0+Z1)/2,0xd2d2d0);   // エプロン上部の細い溝
 const cyl=(r,h,x,y,z,m,seg)=>{const c=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,seg||28),m);c.position.set(x,y,z);s.add(c);return c;};
 const bx=(bot[0]+bot[2])/2;   // 浴槽の底の2つの部品の東西（浴槽の内側の中心）
 {const y0=YB+0.15,zN=y=>{const ev=(TY-y)/(TY-YB),eh=1-Math.cos(Math.asin(ev));return top[1]+(bot[1]-top[1])*eh;},dz=(zN(y0+0.005)-zN(y0-0.005))/0.01,n=new THREE.Vector3(0,-dz,1).normalize(),g=new THREE.Group();   // お湯の出る部品（循環口）：底ではなく北の内壁、底から150（仮）。壁の傾きに合わせて南・少し上向き
  g.position.set(bx,y0,zN(y0));g.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),n);s.add(g);
  const c1=new THREE.Mesh(new THREE.CylinderGeometry(0.032,0.032,0.006,28),P({color:0x6e7073,specular:0x888888,shininess:60}));c1.position.y=0.003;g.add(c1);const c2=new THREE.Mesh(new THREE.CylinderGeometry(0.022,0.022,0.012,28),P({color:0x8a8c8f,specular:0x999999,shininess:70}));c2.position.y=0.008;g.add(c2);}
 cyl(0.034,0.006,bx,YB+0.003,Z0+0.6,P({color:0x7b7d80,specular:0x777777,shininess:50}));[-1,0,1].forEach(k=>box(0.04,0.002,0.004,bx,YB+0.0065,Z0+0.6+k*0.012,0x55575a));   // 排水口（底。仮）
 cyl(0.015,0.006,TX1-0.045,TY+0.003,Z0+0.05,cm);   // 縁の小さなボタン（北東）
 cyl(0.034,0.012,TX1-0.07,TY+0.006,Z1-0.085,wtM,40);{const t=new THREE.Mesh(new THREE.TorusGeometry(0.034,0.0015,6,48),L(0xc9c9c7));t.rotation.x=Math.PI/2;t.position.set(TX1-0.07,TY+0.0105,Z1-0.085);s.add(t);}}   // 縁の白い丸いボタン（南東。表示は描かない）
// カウンター（黒のみかげ調。キッチンの天板と同じ柄）：北の壁いっぱい、上面700・厚さ100・奥行130（写真の比率から、仮）
const CT=0.69,CD=0.13,CZ=Z0+CD;wbox(BW,0.1,CD,X0+BW/2,CT-0.05,Z0+CD/2,ctrM,0.5);
// 水栓（カウンターの前面）：メッキの丸いつまみ2つ（左は左へ、右は右へレバー）、両端に小さな留めネジ
{const ky=CT-0.055,knob=(x,dir)=>{const c=(r,l,xx,z,m)=>{const k=new THREE.Mesh(new THREE.CylinderGeometry(r,r,l,32),m);k.rotation.x=Math.PI/2;k.position.set(xx,ky,z);s.add(k);};
  c(0.024,0.006,x,CZ+0.003,cm);c(0.021,0.026,x,CZ+0.019,cm);const lv=new THREE.Mesh(new THREE.BoxGeometry(0.045,0.008,0.008),cm);lv.position.set(x+dir*0.0225,ky,CZ+0.012);s.add(lv);};
 knob(X0+1.348,-1);knob(X0+1.464,1);
 [X0+1.265,X0+1.54].forEach(x=>[ky+0.02,ky-0.02].forEach(y=>{const k=new THREE.Mesh(new THREE.CylinderGeometry(0.004,0.004,0.003,12),cm);k.rotation.x=Math.PI/2;k.position.set(x,y,CZ+0.0015);s.add(k);}));}
// ハンドシャワーとマグネット式のフック×2（メッキ、上下同じ形）：北の壁、西の壁から966。上のフックにハンドシャワー、下のフックにホースを掛ける。ホースの口はカウンターの下（実物の写真から。高さは公式画像の比率から、仮）
{const XS=X0+0.966,RZ=Z0+0.05,tube=(pts,r,m)=>{const cur=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)),false,'centripetal');s.add(new THREE.Mesh(new THREE.TubeGeometry(cur,200,r,10,false),m));};   // RZ：フックの受けの輪の中心（壁から50）
 const hook=yb=>{box(0.035,0.12,0.01,XS,yb+0.045,Z0+0.005,cm);   // フック：縦長の平らな板（W35×H120、壁に付く）と、下端から手前へ出る受け（yb：受けの高さ）
  const sh=new THREE.Shape();sh.moveTo(-0.0185,RZ-Z0-0.01);sh.lineTo(-0.0185,-0.012);sh.lineTo(-0.0135,-0.012);sh.lineTo(-0.0135,0);sh.absarc(0,0,0.0135,Math.PI,0,true);sh.lineTo(0.0135,-0.012);sh.lineTo(0.0185,-0.012);sh.lineTo(0.0185,RZ-Z0-0.01);sh.lineTo(-0.0185,RZ-Z0-0.01);   // 上から見た形（y＝壁の向き。受けの中心が原点）
  const fg=new THREE.ExtrudeGeometry(sh,{depth:0.016,bevelEnabled:true,bevelThickness:0.002,bevelSize:0.0015,bevelSegments:2,curveSegments:16});fg.rotateX(-Math.PI/2);const t=new THREE.Mesh(fg,cm);t.position.set(XS,yb-0.008,RZ);s.add(t);};   // 受け：板から出た台に、手前が開いたU字の切り欠き（握り・ホースを手前から差し込んで掛け外しできる）
 hook(1.48);hook(1.055);   // 上（ハンドシャワー）・下（ホース）
  {const g=new THREE.Group();g.position.set(XS,1.48,RZ);g.rotation.x=0.18;s.add(g);const gi=new THREE.Group();gi.position.y=0.013;g.add(gi);buildHadamo(gi,cm);}   // ハンドシャワー（KVK hadamo PZS370、形は buildHadamo）。原点＝上のフックの受け、頭を少し手前へ倒す。握りの下端（幅約32）は受けのU字より太いので、下端を受けの上に載せ、ホースのナットがU字を通る（傾けても下端が受けに食い込まない高さ）
 {const k=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.012,0.06,16),cm);k.rotation.x=Math.PI/2;k.position.set(X0+1.165,0.55,Z0+0.03);s.add(k);   // ホースの口（壁から出て西へ曲がる）
  const f=new THREE.Mesh(new THREE.CylinderGeometry(0.011,0.011,0.075,16),cm);f.rotation.z=Math.PI/2;f.position.set(X0+1.13,0.55,Z0+0.06);s.add(f);const n=new THREE.Mesh(new THREE.CylinderGeometry(0.015,0.015,0.02,6),cm);n.rotation.z=Math.PI/2;n.position.set(X0+1.1,0.55,Z0+0.06);s.add(n);}
 const hy=1.48-0.007*Math.cos(0.18),hz=RZ-0.007*Math.sin(0.18);   // ホースの始まり（握りの下のナットの下端）
 tube([[XS,hy,hz],[XS,1.23,RZ-0.004],[XS,1.055,RZ],[X0+0.955,0.9,Z0+0.09],[X0+0.925,0.75,Z0+0.145],[X0+0.885,0.6,Z0+0.17],[X0+0.85,0.46,Z0+0.18],[X0+0.84,0.34,Z0+0.175],[X0+0.86,0.26,Z0+0.16],[X0+0.91,0.23,Z0+0.14],[X0+0.97,0.255,Z0+0.115],[X0+1.01,0.33,Z0+0.09],[X0+1.035,0.42,Z0+0.072],[X0+1.05,0.495,Z0+0.064],[X0+1.066,0.538,Z0+0.0605],[X0+1.09,0.55,Z0+0.06]],0.006,hoseM);}   // ホース（銀色。下のフックの受けを通り、カウンターの前を通って下で大きくゆるくたるみ、口へ戻る。口の金具からは西へ少しまっすぐ出て、やわらかく曲がって下へ）
// 鏡（枠なし）：北の壁、西の壁から1048〜1759、床から783〜1083（写真の比率から）
{const mc=cv((x,W,H)=>{const gr=x.createLinearGradient(0,0,W,H*0.4);gr.addColorStop(0,'#f2f5f6');gr.addColorStop(0.6,'#dfe5e8');gr.addColorStop(1,'#cfd6da');x.fillStyle=gr;x.fillRect(0,0,W,H);},256,64);   // 映り込みは計算しないので、明るいグラデーションで代用
 box(0.711,0.3,0.005,X0+1.4035,0.933,Z0+0.0025,tmat(mc,{specular:0xffffff,shininess:120}));}
// タオル掛け×2（東の壁、メッキ）：長さ以外は同じ形（丸棒φ19、壁から50。両端に角い座と縦長の台座）。上は床から980・北の壁から240〜850、下は床から510・北の壁から420〜850（南端をそろえる。仮）
{const hanger=(y,za,zb)=>{const c=new THREE.Mesh(new THREE.CylinderGeometry(0.0095,0.0095,zb-za,20),cm);c.rotation.x=Math.PI/2;c.position.set(X1-0.05,y,(za+zb)/2);s.add(c);
  [za,zb].forEach(z=>{box(0.05,0.025,0.025,X1-0.025,y,z,cm);box(0.008,0.075,0.035,X1-0.004,y+0.005,z,cm);});};
 hanger(0.98,Z0+0.24,Z0+0.85);hanger(0.51,Z0+0.42,Z0+0.85);}
// 照明：ダウンライト×2（照明仕様書に記載がないので、洗面所のD1と同じ昼白色の RMN(P1) を流用）。東西は浴室の西から500・1500、南北は北の壁から450
const blEm=new THREE.MeshBasicMaterial({color:0xd9d8d4});
const bls=[X0+0.5,X0+1.5].map(x=>{const z=Z0+0.45,ring=new THREE.Mesh(new THREE.CylinderGeometry(0.058,0.058,0.004,32),L(0xf7f7f5));ring.position.set(x,BH-0.002,z);s.add(ring);
 const lamp=new THREE.Mesh(new THREE.CylinderGeometry(0.044,0.044,0.005,32),blEm);lamp.position.set(x,BH-0.003,z);s.add(lamp);
 const sp=new THREE.SpotLight(0xfff3e8,0,5,THREE.MathUtils.degToRad(62),0.8,1.3);sp.position.set(x,BH-0.02,z);sp.target.position.set(x,0,z);s.add(sp);s.add(sp.target);return sp;});   // 配光はD1と同じ
return {zoneLights:[[bls,['bath']]],
 boxes:[[X0+WM,X1-WM,0.2,BH-0.08,Z0+WM,Z1-WM],                                            // 浴室（浴槽はすり抜ける）
  ifOpen('bath',[bathA+0.08,bathB-0.08,0.2,1.95,Z1-WM-0.01,DZ0+WM+0.01])],                 // 浴室のドア
 obs:[[X0,X1,0,HOUSE.ldk.H1,Z0,Z0+CD],                                                                 // カウンター（壁から壁まで、床から天井まで）
  ifOpenObs('bath',[bathB-0.095,bathB+0.065,0,HOUSE.ldk.H1,DZ0-0.0475-0.77,DZ0-0.0475])],              // 浴室のドア（開）：吊元（東）の軸から浴室側へ95°開いた扉（長さ約0.77、タオル掛けを含む厚さ）
 applyEnv(night){const f=night?1:0.3,off=night?0x2a2927:0xa8a6a1;bls.forEach(l=>l.intensity=LS.bath?0.8*f:0);blEm.color.set(LS.bath?0xf6f8ff:off);   // ダウンライト（D1と同じ明るさ）
  const k=night?(LS.bath?0.8:0.06):1;cm.reflectivity=0.75*k;waterM.reflectivity=0.12*k;},
 viewBath(){look(X0+1.15,EYE,Z1-WM,X0+0.55,1.05,Z0+0.15,85);}};}   // 浴室（仮）：南の壁ぎわ、浴槽とドアの間（開いたドアにかからない位置）から北西（浴槽・カウンター）を見る   // 映り込みの明るさ：昼・夜の点灯・夜の消灯

