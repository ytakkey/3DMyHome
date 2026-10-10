// 試作：three.js 0.186 で今のコードを動かすための読み替え。Phong の材質を物理ベースの材質（MeshStandardMaterial）として作る（光沢 shininess → 粗さ roughness）。色のテクスチャは sRGB として扱う
(()=>{const Std=THREE.MeshStandardMaterial,Tex=THREE.Texture,CTex=THREE.CanvasTexture;
 const rough=n=>Math.min(1,Math.pow(2/((n===undefined?30:n)+2),0.25));   // Blinn-Phong の指数 n と GGX の粗さの対応（α²=2/(n+2)、粗さ=√α）
 class PhongAsStandard extends Std{constructor(p){const q=Object.assign({},p||{}),n=q.shininess;['shininess','specular','combine','reflectivity','refractionRatio'].forEach(k=>delete q[k]);super(q);this.roughness=rough(n);if(q.envMap)this.metalness=1;}}
 class SRGBTexture extends Tex{constructor(...a){super(...a);this.colorSpace=THREE.SRGBColorSpace;}}
 class SRGBCanvasTexture extends CTex{constructor(...a){super(...a);this.colorSpace=THREE.SRGBColorSpace;}}
 THREE.MeshPhongMaterial=PhongAsStandard;THREE.Texture=SRGBTexture;THREE.CanvasTexture=SRGBCanvasTexture;})();
