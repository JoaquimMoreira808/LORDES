import { createDenseAscii } from './dense-ascii.mjs?v=grass-tufts-6';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PRESETS, buildBuilding, disposeBuilding } from '../vendor/cheoma/lordes-bundle.mjs';
import { textmode } from '../vendor/textmode/dist/textmode.esm.js';

const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
const mode=params.get('mode')==='glyphs'?'glyphs':'house';
const font=params.get('font')==='vector'?'vector':'default';
$('mode').value=mode;$('font').value=font;
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(1);$('original').append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color(0xffffff);
scene.add(new THREE.HemisphereLight(0xffffff,0x858585,3));
const sun=new THREE.DirectionalLight(0xffffff,3);sun.position.set(-20,40,30);scene.add(sun);
const house=buildBuilding({...PRESETS.giwa,seed:7});scene.add(house);
const bounds=new THREE.Box3().setFromObject(house),center=bounds.getCenter(new THREE.Vector3()),extent=bounds.getSize(new THREE.Vector3()).length();
const camera=new THREE.PerspectiveCamera(35,1,.1,1000);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.copy(center);
camera.position.copy(center).add(new THREE.Vector3(.8,.55,1).normalize().multiplyScalar(extent*1.5));controls.update();
const box=$('original');
function resizeSource(){renderer.setSize(box.clientWidth,box.clientHeight);camera.aspect=box.clientWidth/box.clientHeight;camera.updateProjectionMatrix();renderer.render(scene,camera);}
resizeSource();renderer.render(scene,camera);
const dense=mode==='house'?createDenseAscii($('result'),renderer.domElement,{lightBackground:true}):null;
let t=null;
if(mode==='glyphs'){
 const options={canvas:$('output'),width:$('result').clientWidth,height:$('result').clientHeight,fontSize:16,pixelDensity:1};
 if(font==='vector')options.fontSource='./vendor/fonts/DejaVuSansMono.ttf';
 t=textmode.create(options);
 const reference=['ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz','0123456789 .:-=+*#%@ /\\|_'];
 t.draw(()=>{
  t.background(0);t.cellColor(0);t.charColor(230,230,230);
  const cols=t.grid.cols,rows=t.grid.rows;
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
   const line=reference[y%reference.length];
   t.push();t.translate(x-Math.floor(cols/2),y-Math.floor(rows/2));t.char(line[x%line.length]);t.point();t.pop();
  }
 });
}
$('result-label').textContent=dense?'ASCII denso · imagem completa':'Grade fixa · sem textura de entrada';
function settings(){
 const cols=Number($('columns').value),light=Number($('brightness').value),gain=Number($('contrast').value);
 $('columns-value').value=cols;$('brightness-value').value=light+'%';$('contrast-value').value=gain+'%';
 dense?.set({cols,light:light/100,gain:gain/100,preset:$('gradient').value});
 $('status').textContent=dense?`1 casa · ${cols} colunas · tamanho dos caracteres ajustado ao painel`:'Diagnóstico de glifos textmode · 16 px';
}
for(const id of ['columns','brightness','contrast','gradient'])$(id).addEventListener('input',settings);
settings();
renderer.render(scene,camera);dense?.render(performance.now()+101);
const observer=new ResizeObserver(()=>{resizeSource();if(t)t.resizeCanvas($('result').clientWidth,$('result').clientHeight);dense?.set();dense?.render(performance.now()+101);});
observer.observe(box);observer.observe($('result'));
renderer.setAnimationLoop(time=>{if(document.hidden)return;controls.update();renderer.render(scene,camera);dense?.render(time);});
window.addEventListener('pagehide',()=>{renderer.setAnimationLoop(null);observer.disconnect();controls.dispose();t?.destroy();scene.remove(house);disposeBuilding(house);renderer.dispose();},{once:true});
