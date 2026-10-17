// 新旧の比べ方（確認用）：_test/scmp.html（左の枠 so＝前の版、右の枠 sn＝今の stg）で読み込む。
// await cmpInit() のあと、await cmpSheet(名前, 状態, [[見出し,[位置],[見る点],画角],…]) で、上の段に前の版・下の段に今の版を並べて bake/work/shots/名前.jpg に保存する。状態は vset と同じ
window.cmpInit=async()=>{const W=[document.getElementById('a').contentWindow,document.getElementById('b').contentWindow];
 await new Promise(res=>{const t=setInterval(()=>{if(W.every(w=>{try{return w.eval('typeof LM!=="undefined"&&!!LM.loaded');}catch(e){return false;}})){clearInterval(t);res();}},200);});
 const src=(await Promise.all(['/tools/verify.js','/tools/leaktest.js','/tools/probe.js'].map(async f=>(await fetch(f)).text()))).join(';\n');W.forEach(w=>{w.eval(src);w.eval('window.__rv=(p,t,fov,W,H)=>{cam.position.set(...p);const v=new THREE.Vector3(...t).sub(cam.position);yaw=Math.atan2(-v.x,-v.z);pitch=Math.atan2(v.y,Math.hypot(v.x,v.z));r.setPixelRatio(1);r.setSize(W,H,false);cam.fov=fov||75;cam.aspect=W/H;cam.updateProjectionMatrix();draw();return r.domElement;}');});
 window.CW=W;return W.map(w=>Math.round(w.eval('LM.tm.all')));};
window.cmpSheet=async(name,st,views,W=480,H=320)=>{const cv=document.createElement('canvas');cv.width=W*views.length;cv.height=H*2;const g=cv.getContext('2d');g.font='14px sans-serif';
 CW.forEach((w,row)=>{w.vset(st);views.forEach(([lb,p,t,fov],i)=>{g.drawImage(w.__rv(p,t,fov,W,H),i*W,row*H);g.fillStyle='rgba(0,0,0,0.55)';const s=(row?'今 ':'前 ')+lb;g.fillRect(i*W,row*H,g.measureText(s).width+10,20);g.fillStyle='#ff0';g.fillText(s,i*W+5,row*H+15);});});
 const b=await new Promise(res=>cv.toBlob(res,'image/jpeg',0.86));await fetch('/save?path=bake/work/shots/'+name+'.jpg',{method:'POST',body:b});return name;};
// 違いの画像：cmpDiff(名前, 状態, 視点の一覧) で、前・今・違い（差を4倍）の3段を保存し、視点ごとの [違う画素の数(差>8), 最大の差] を返す
window.cmpDiff=async(name,st,views,W=480,H=320)=>{const cv=document.createElement('canvas');cv.width=W*views.length;cv.height=H*3;const g=cv.getContext('2d');g.font='14px sans-serif';const px=[[],[]],res=[];
 CW.forEach((w,row)=>{w.vset(st);views.forEach(([lb,p,t,fov],i)=>{const el=w.__rv(p,t,fov,W,H);g.drawImage(el,i*W,row*H);px[row][i]=g.getImageData(i*W,row*H,W,H);});});
 views.forEach(([lb],i)=>{const a=px[0][i].data,b=px[1][i].data,o=g.createImageData(W,H);let n=0,mx=0;for(let k=0;k<a.length;k+=4){const d=Math.max(Math.abs(a[k]-b[k]),Math.abs(a[k+1]-b[k+1]),Math.abs(a[k+2]-b[k+2]));if(d>8)n++;if(d>mx)mx=d;o.data[k]=Math.min(255,d*4);o.data[k+1]=Math.min(255,d*4);o.data[k+2]=Math.min(255,d*4);o.data[k+3]=255;}g.putImageData(o,i*W,2*H);res.push([lb,n,mx]);
  for(let row=0;row<3;row++){const s=['前 ','今 ','差 '][row]+lb;g.fillStyle='rgba(0,0,0,0.55)';g.fillRect(i*W,row*H,g.measureText(s).width+10,20);g.fillStyle='#ff0';g.fillText(s,i*W+5,row*H+15);}});
 const b=await new Promise(res2=>cv.toBlob(res2,'image/jpeg',0.86));await fetch('/save?path=bake/work/shots/'+name+'.jpg',{method:'POST',body:b});return res;};
// 視点ごとに状態を変える版：cmpSheetS(名前, [[見出し,[位置],[見る点],画角,状態],…])
window.cmpSheetS=async(name,views,W=400,H=280)=>{const cv=document.createElement('canvas');cv.width=W*views.length;cv.height=H*2;const g=cv.getContext('2d');g.font='13px sans-serif';
 CW.forEach((w,row)=>{views.forEach(([lb,p,t,fov,st],i)=>{w.vset(st);g.drawImage(w.__rv(p,t,fov,W,H),i*W,row*H);g.fillStyle='rgba(0,0,0,0.55)';const s=(row?'今 ':'前 ')+lb;g.fillRect(i*W,row*H,g.measureText(s).width+10,19);g.fillStyle='#ff0';g.fillText(s,i*W+5,row*H+14);});});
 const b=await new Promise(res=>cv.toBlob(res,'image/jpeg',0.86));await fetch('/save?path=bake/work/shots/'+name+'.jpg',{method:'POST',body:b});return name;};
