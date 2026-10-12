// 確認の道具（確認用）：状態をそろえて、いくつもの視点を1枚の画像に並べて撮る（bake/work/shots/名前.jpg）
// vset({n:夜か, a:全点灯か, on:[点ける照明のキー]（あれば a より優先）, doors:true/false/{キー:開閉}, shade:0〜100})
// vsheet(名前, [[見出し, [位置], [見る点], 画角], …], 列の数, 1枚の幅, 1枚の高さ)
if(typeof LM!=="undefined")LM.async=false;   // 確認の道具はその場で描き込む
window.vset=(s)=>{LM.async=false;const d=s.doors===undefined?true:s.doors;Object.keys(DS).forEach(k=>{const want=typeof d==='object'?(k in d?!!d[k]:!!DS[k]):d;if(!!DS[k]!==want)toggleDoor(k);});
 if(s.shade!==undefined){const e=document.getElementById('shade');if(+e.value!==s.shade){e.value=s.shade;e.dispatchEvent(new Event('input',{bubbles:true}));}}
 setNight(s.n?1:0);if(s.on){Object.keys(LS).forEach(k=>LS[k]=s.on.includes(k));applyEnvAll();}else setAll(s.a?1:0);relight();LMU.fade.value=1;return Math.round(LM.bakeMs);};
window.vsheet=async(name,list,cols=3,W=480,H=320)=>{const rows=Math.ceil(list.length/cols),cv=document.createElement('canvas');cv.width=W*cols;cv.height=H*rows;const g=cv.getContext('2d');g.font='14px sans-serif';
 for(let i=0;i<list.length;i++){const [lb,p,t,fov]=list[i];cam.position.set(...p);const v=new THREE.Vector3(...t).sub(cam.position);yaw=Math.atan2(-v.x,-v.z);pitch=Math.atan2(v.y,Math.hypot(v.x,v.z));
  r.setPixelRatio(1);r.setSize(W,H,false);cam.fov=fov||75;cam.aspect=W/H;cam.updateProjectionMatrix();draw();const x=(i%cols)*W,y=Math.floor(i/cols)*H;g.drawImage(r.domElement,x,y);g.fillStyle='rgba(0,0,0,0.55)';g.fillRect(x,y,g.measureText(lb).width+10,20);g.fillStyle='#ff0';g.fillText(lb,x+5,y+15);}
 cam.fov=80;cam.updateProjectionMatrix();const b=await new Promise(res=>cv.toBlob(res,'image/jpeg',0.86));await fetch('/save?path=bake/work/shots/'+name+'.jpg',{method:'POST',body:b});return name;};
// 光漏れを画像で確かめる：vleak(名前, [点ける照明のキー], [[見出し,[位置],[見る点],画角],…])：夜・ドアは全部閉じて、指定の照明だけ点けた画像（上）と全消灯の画像（下）を並べる
window.vleak=async(name,keys,views,W=480,H=320)=>{const cols=views.length,cv=document.createElement('canvas');cv.width=W*cols;cv.height=H*2;const g=cv.getContext('2d');g.font='14px sans-serif';
 for(const [row,on] of [[0,keys],[1,[]]]){vset({n:1,on,doors:false});views.forEach(([lb,p,t,fov],i)=>{cam.position.set(...p);const v=new THREE.Vector3(...t).sub(cam.position);yaw=Math.atan2(-v.x,-v.z);pitch=Math.atan2(v.y,Math.hypot(v.x,v.z));r.setPixelRatio(1);r.setSize(W,H,false);cam.fov=fov||75;cam.aspect=W/H;cam.updateProjectionMatrix();draw();g.drawImage(r.domElement,i*W,row*H);g.fillStyle='#ff0';g.fillText((row?'全消灯 ':keys.join(',')+' ')+lb,i*W+5,row*H+15);});}
 cam.fov=80;cam.updateProjectionMatrix();const b=await new Promise(res=>cv.toBlob(res,'image/jpeg',0.86));await fetch('/save?path=bake/work/shots/'+name+'.jpg',{method:'POST',body:b});return name;};
