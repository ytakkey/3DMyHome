// 画像を撮る道具（確認用）：cap(接頭辞, [[視点, 夜か, 全点灯か], …]) で bake/work/shots/接頭辞_視点_d|n on|off.jpg に保存（tools/devserver.py の /save を使う）
window.cap=async(pre,list,W=800,H=520)=>{const wait=()=>new Promise(r=>setTimeout(r,50));
 const shot=async name=>{r.setPixelRatio(1);r.setSize(W,H,false);cam.aspect=W/H;cam.updateProjectionMatrix();draw();const u=r.domElement.toDataURL('image/jpeg',0.88);const b=await (await fetch(u)).blob();await fetch('/save?path=bake/work/shots/'+name+'.jpg',{method:'POST',body:b});};
 for(const [v,n,a] of list){setNight(n);setAll(a);setView(v);await wait();await shot(pre+'_'+v+(n?'_n':'_d')+(a?'on':'off'));}return 'done';};
