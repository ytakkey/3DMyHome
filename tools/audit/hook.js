// 点検用：部品（Mesh）を作ったコードの場所（呼び出し元を3段まで：ファイル:行:列）を記録する
(()=>{const Orig=THREE.Mesh;const loc=()=>{const out=[];for(const l of (new Error().stack||'').split('\n')){const m=l.match(/\/js\/([a-z_]+\.js):(\d+):(\d+)/);if(m&&!/three/.test(l))out.push(m[1]+':'+m[2]+':'+m[3]);if(out.length>=3)break;}return out.join(' < ');};
 class M extends Orig{constructor(g,m){super(g,m);this.userData._src=loc();}}THREE.Mesh=M;})();
