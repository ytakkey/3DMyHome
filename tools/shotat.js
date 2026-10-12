// 任意の位置から撮る道具（確認用）：shotAt(名前, [x,y,z], [見る点x,y,z], 夜か, 全点灯か) で bake/work/shots/名前.jpg に保存
if(typeof LM!=="undefined")LM.async=false;   // 確認の道具はその場で描き込む（光をなめらかに切り替える動きを止める）
window.shotAt=async(name,p,t,n,a,W=800,H=520)=>{if(n!==undefined)setNight(n);if(a!==undefined)setAll(a);cam.position.set(...p);const v=new THREE.Vector3(...t).sub(cam.position);yaw=Math.atan2(-v.x,-v.z);pitch=Math.atan2(v.y,Math.hypot(v.x,v.z));
 r.setPixelRatio(1);r.setSize(W,H,false);cam.aspect=W/H;cam.updateProjectionMatrix();draw();const u=r.domElement.toDataURL('image/jpeg',0.9);const b=await (await fetch(u)).blob();await fetch('/save?path=bake/work/shots/'+name+'.jpg',{method:'POST',body:b});return name;};
