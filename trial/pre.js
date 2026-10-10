// 試作：焼き込む範囲（寝室）にかかる動かない部品を、ほかと分けて素材ごとにまとめる。まとめた形には「範囲:素材の番号」の名前を付ける（焼き込みの結果を形ごとに対応させるため。素材の番号は作られた順なので毎回同じ）
const BAKE_ROOM=(()=>{const b=HOUSE.bed,y=HOUSE.ldk.FL2,e=0.03;return new THREE.Box3(new THREE.Vector3(b.X0-e,y-e,b.Z0-e),new THREE.Vector3(b.X0+b.W+e,y+b.H+e,b.Z0+b.D+e));})();
const BAKE_DOORS=['sg311','sg500w','sg33s'];   // 焼き込む範囲に面したドア（開いた形・閉じた形の両方を焼く）
function mergeStatic(scene){scene.updateMatrixWorld(true);const buckets=new Map(),olds=[],mi=new Map(),bb=new THREE.Box3();
 scene.traverse(o=>{if(!o.isMesh||o.userData.dyn)return;if(!mi.has(o.material))mi.set(o.material,mi.size);bb.setFromObject(o);const rg=bb.intersectsBox(BAKE_ROOM)?'bed':'etc';
  const keys=Object.keys(o.geometry.attributes).sort(),k=rg+':'+mi.get(o.material)+'|'+keys.join(',');
  let b=buckets.get(k);if(!b){b={m:o.material,keys,gs:[],name:rg+':'+mi.get(o.material)+(keys.length>3?'+'+keys.length:'')};buckets.set(k,b);}
  const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);b.gs.push(g);olds.push(o);});
 olds.forEach(o=>{o.parent.remove(o);o.geometry.dispose();});
 buckets.forEach(b=>{const out=new THREE.BufferGeometry();
  b.keys.forEach(k=>{let n=0;b.gs.forEach(g=>n+=g.attributes[k].array.length);const arr=new Float32Array(n);let off=0;b.gs.forEach(g=>{arr.set(g.attributes[k].array,off);off+=g.attributes[k].array.length;});out.setAttribute(k,new THREE.BufferAttribute(arr,b.gs[0].attributes[k].itemSize));});
  b.gs.forEach(g=>g.dispose());const m=new THREE.Mesh(out,b.m);m.name=b.name;scene.add(m);});}
