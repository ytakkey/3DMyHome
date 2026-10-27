// 家具の書き出し：部品ごとの呼び出し元（index.html で記録）から、建物と家具を分けて GLTF にする
// 部品の「場所」＝呼び出し元のうち、形を作るだけの関数（HELP）を除いた一番内側の行（ファイル名:行）
const HELP=new Set(['box','lbox','lboxOpen','wbox','vplane','rbox','tmat']);
function frames(st){return st.split('\n').slice(1).map(l=>{const m=l.match(/at (?:(\S+) \()?.*\/(\w+)\.js:(\d+):(\d+)/);return m?{fn:m[1]||'',file:m[2],line:+m[3],col:+m[4]}:null;}).filter(f=>f&&f.file!=='three'&&f.file!=='export');}
function site(fr){const f=fr.find(f=>!HELP.has(f.fn));return f?f.file+':'+f.line:'?';}
const room=fr=>{const f=fr.map(f=>f.file);return ['wash','bath'].find(x=>f.includes(x))||['bedroom','study','ldk'].find(x=>f.includes(x))||'common';};
function meshes(){const a=[];scene.updateMatrixWorld(true);scene.traverse(o=>{if(o.isMesh&&o.userData.src)a.push(o);});return a;}
// 一覧：場所ごとに数・範囲・色・呼び出しの関数名
function survey(){const S={};meshes().forEach(o=>{const fr=frames(o.userData.src),k=site(fr),b=new THREE.Box3().setFromObject(o);const e=S[k]||(S[k]={n:0,room:room(fr),fns:fr.map(f=>f.fn||'-').slice(0,6).join('<'),min:[1e9,1e9,1e9],max:[-1e9,-1e9,-1e9],col:new Set(),dyn:0});
 e.n++;['x','y','z'].forEach((c,i)=>{e.min[i]=Math.min(e.min[i],b.min[c]);e.max[i]=Math.max(e.max[i],b.max[c]);});if(o.material&&o.material.color)e.col.add(o.material.color.getHexString());if(o.userData.dyn)e.dyn++;});
 Object.values(S).forEach(e=>{e.col=[...e.col].slice(0,4).join(',');e.min=e.min.map(v=>+v.toFixed(3));e.max=e.max.map(v=>+v.toFixed(3));});return S;}
const save=(path,body)=>fetch('/save?path=bake/work/export/'+path,{method:'POST',body});
// 建物（書き出さない）の場所。common.js は家具（シェード 219〜221・ヘッダーボックス addHB 276〜283・エアコン acUnit 370〜379）以外すべて建物
const BLD={bedroom:[11,12,13,14],   // 西の壁のアクセント面・腰壁・天板・幅木
 wash:[118,148,158],   // 廊下の北の壁の段をふさぐ面・框・土間収納の垂れ壁
 ldk:[11,15,17,20,21,22,23,24,25,26,27,28,31,32,35,36,37,38,39,43,44,45,46,47,48,49,50,51,   // 床・壁・天井・建具・仕切り壁と幅木・押入・下がり天井・2階廊下
  61,63,64,66,67,75,76,312]};   // 階段の踏板・裏の鉄板・14段目の段鼻・タレ壁・ササラ桁と受け金物、カップボード横のうす壁
const isBld=k=>{const [f,l]=k.split(':'),n=+l;if(f==='common')return !((n>=219&&n<=221)||(n>=276&&n<=283)||(n>=370&&n<=379));return (BLD[f]||[]).includes(n);};
// 書き出し：家全体の家具（2026-10-27 から脱衣室・洗面所・玄関・トイレ・浴室も）
function pick(){return meshes().filter(o=>!isBld(site(frames(o.userData.src))));}
function exportFurniture(){const out=new THREE.Scene(),cnt={};[bedS,stS,ldkS].forEach(S=>S.setShade(0));   // シェードは全開（開度は焼き込みでは光の量で扱う）
 meshes().forEach(o=>{const m=o.material;if(m&&!Array.isArray(m)&&m.polygonOffset)m.userData.decal=1;});   // 貼り物（描画で手前に出す材質＝decalMat）の印。Blender で面を少し手前へ出す
 pick().forEach(o=>{const k=site(frames(o.userData.src)),m=new THREE.Mesh(o.geometry,o.material);o.matrixWorld.decompose(m.position,m.quaternion,m.scale);cnt[k]=(cnt[k]||0)+1;m.name=k.replace(':','_')+'_'+cnt[k];out.add(m);});
 return new Promise(res=>new THREE.GLTFExporter().parse(out,glb=>save('furniture.glb',glb).then(()=>res(out.children.length)),{binary:true}));}
// 検証ページ（stg/）用：移動範囲・通れない所（ui.js の MBA・MOA と同じ）と、視点（本番の VIEWS と同じ）→ bake/work/export/move.json
function exportMove(){const J=b=>({b:[...b],door:b.door,shut:b.shut,opn:b.opn}),V={};
 [['リビング',()=>ldkS.viewLiv()],['キッチン',()=>ldkS.viewKit()],['寝室',()=>bedS.home()],['2F廊下',()=>ldkS.viewHall()],['WIC',()=>stS.viewWic()],['書斎',()=>stS.viewStudy()],['洗面脱衣',()=>washS.viewWash()],['浴室',()=>bathS.viewBath()],['玄関',()=>washS.viewEntry()],['トイレ',()=>washS.viewToilet()]].forEach(([n,f])=>{f();V[n]=[cam.position.x,cam.position.y,cam.position.z,yaw,pitch,cam.fov];});
 return save('move.json',JSON.stringify({boxes:[...ldkS.boxes,...stS.boxes,...washS.boxes,...bathS.boxes].map(J),obs:[...ldkS.obs,...stS.obs,...washS.obs,...bathS.obs].map(J),wallMargin:HOUSE.wallMargin,DS,views:V}));}
// 建物の材質の書き出し（Blender の建物に、本番の色・柄・柄の向きと大きさを移すため）：家全体の建物の部品（BLD）を、柄の繰り返し・回転を UV に焼き込んで GLTF に → bake/work/export/building.glb
function exportBuilding(){const out=new THREE.Scene(),cnt={},mc=new Map();
 meshes().filter(o=>isBld(site(frames(o.userData.src)))).forEach(o=>{const m0=o.material,k=site(frames(o.userData.src));if(Array.isArray(m0))return;
  let g=o.geometry.clone();const mp=m0.map;
  if(mp&&g.attributes.uv){mp.updateMatrix();const uv=g.attributes.uv,v=new THREE.Vector3();for(let i=0;i<uv.count;i++){v.set(uv.getX(i),uv.getY(i),1).applyMatrix3(mp.matrix);uv.setXY(i,v.x,v.y);}}
  let m=mc.get(m0);if(!m){m=new THREE.MeshStandardMaterial({color:m0.color?m0.color.clone():new THREE.Color(1,1,1),roughness:1,metalness:0,side:m0.side});
   if(mp){const t=new THREE.Texture(mp.image);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.flipY=mp.flipY;t.needsUpdate=true;m.map=t;}m.name=(m0.name||'b')+'_'+mc.size;mc.set(m0,m);}
  const n=new THREE.Mesh(g,m);o.matrixWorld.decompose(n.position,n.quaternion,n.scale);cnt[k]=(cnt[k]||0)+1;n.name='P_'+k.replace(':','_')+'_'+cnt[k];out.add(n);});
 return new Promise(res=>new THREE.GLTFExporter().parse(out,glb=>save('building.glb',glb).then(()=>res([out.children.length,mc.size])),{binary:true}));}
