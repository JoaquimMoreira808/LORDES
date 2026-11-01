import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PRESETS, buildBuilding, disposeBuilding, planVillage } from '../vendor/cheoma/lordes-bundle.mjs';
import { createDenseAscii } from './dense-ascii.mjs?v=grass-tufts-6';

const $=id=>document.getElementById(id),status=$('status');
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
$('original').append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#182019');
const hemisphere=new THREE.HemisphereLight(0xfff5db,0x58674e,2.6);scene.add(hemisphere);
const sun=new THREE.DirectionalLight(0xffe1ac,3);sun.position.set(-80,120,60);scene.add(sun);
const camera=new THREE.PerspectiveCamera(40,1,.1,3000);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.48;
let world=new THREE.Group(),houses=[],walkers=[],plan,ground;
const asciiBackground=new THREE.Color(0xffffff);
const asciiGround=new THREE.MeshBasicMaterial({color:0xffffff});
let lastAscii=-Infinity;
scene.add(world);
const colorMask=document.createElement('canvas'),maskContext=colorMask.getContext('2d');
const originalColors=document.createElement('canvas'),originalContext=originalColors.getContext('2d');
const grassMask=document.createElement('canvas'),grassContext=grassMask.getContext('2d');
const maskBlack=new THREE.MeshBasicMaterial({color:0x000000});
const maskColors=[new THREE.MeshBasicMaterial({color:0x70d9ff}),new THREE.MeshBasicMaterial({color:0xffb866})];
const maskBackground=new THREE.Color(0x000000);
const dense=createDenseAscii($('ascii'),renderer.domElement,{lightBackground:true,colorSource:colorMask,imageSource:originalColors,grassSource:grassMask,grassMotion:()=>!reduced.matches&&$('animate').checked});
function capturePeopleMask(){
 const previousBackground=scene.background,materials=[];
 try{
  scene.background=maskBackground;
  world.traverse(object=>{if(object.isMesh){materials.push([object,object.material]);object.material=maskBlack;}});
  walkers.forEach(({person},index)=>person.traverse(object=>{if(object.isMesh)object.material=maskColors[index%maskColors.length];}));
  renderer.render(scene,camera);
  colorMask.width=renderer.domElement.width;colorMask.height=renderer.domElement.height;
  maskContext.drawImage(renderer.domElement,0,0);
 }finally{for(const [object,material] of materials)object.material=material;scene.background=previousBackground;}
}

function captureGrassMask(){
 const background=scene.background,materials=[];
 try{
  scene.background=maskBackground;
  world.traverse(object=>{if(object.isMesh){materials.push([object,object.material]);object.material=object===ground?asciiGround:maskBlack;}});
  renderer.render(scene,camera);
  grassMask.width=renderer.domElement.width;grassMask.height=renderer.domElement.height;
  grassContext.drawImage(renderer.domElement,0,0);
 }finally{for(const [object,material] of materials)object.material=material;scene.background=background;}
}

function renderViews(time=performance.now()){
 if(ground&&time-lastAscii>=100){
  const background=scene.background,material=ground.material,ambientIntensity=hemisphere.intensity,sunIntensity=sun.intensity;
  try{
   captureGrassMask();
   if($('color-mode').value==='image'){
    renderer.render(scene,camera);
    originalColors.width=renderer.domElement.width;originalColors.height=renderer.domElement.height;
    originalContext.drawImage(renderer.domElement,0,0);
   }else if($('color-mode').value==='people')capturePeopleMask();
   scene.background=asciiBackground;ground.material=asciiGround;hemisphere.intensity*=.35;sun.intensity*=.35;
   renderer.render(scene,camera);dense.render(time);lastAscii=time;
  }finally{scene.background=background;ground.material=material;hemisphere.intensity=ambientIntensity;sun.intensity=sunIntensity;}
 }
 renderer.render(scene,camera);
}
function densitySettings(){
 const cols=Number($('columns').value),light=Number($('brightness').value),gain=Number($('contrast').value);
 $('color-light-value').value=$('color-light').value+'%';$('color-light').disabled=$('color-mode').value!=='image';
 $('saturation-value').value=$('saturation').value+'%';$('saturation').disabled=$('color-mode').value!=='image';
 $('columns-value').value=cols;$('brightness-value').value=light+'%';$('contrast-value').value=gain+'%';
 dense.set({cols,light:light/100,gain:gain/100,preset:$('gradient').value,colors:$('color-mode').value,sat:Number($('saturation').value)/100,colorLight:Number($('color-light').value)/100});
 lastAscii=-Infinity;
}
for(const id of ['columns','brightness','contrast','gradient','color-mode','saturation','color-light'])$(id).addEventListener('input',densitySettings);
densitySettings();
function resize(){
 const box=$('original').getBoundingClientRect();renderer.setSize(box.width,box.height);camera.aspect=box.width/box.height;camera.updateProjectionMatrix();
 dense.set();lastAscii=-Infinity;renderViews(performance.now()+101);
}
new ResizeObserver(resize).observe($('original'));new ResizeObserver(resize).observe($('ascii'));
function mesh(geometry,color){return new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:1}));}
async function regenerate(){
 status.textContent='Gerando vila…';
 const generator=$('generator').value;
 const seed=Number($('seed').value),scale=$('scale').value;
 let city=null;
 if(generator==='threejs-city'){
  const {generateCityVillage}=await import('./city-generator.mjs?v=1');
  city=generateCityVillage(seed,scale);
 }

 const old=world;scene.remove(old);
 for(const house of houses){old.remove(house);disposeBuilding(house);}
 old.traverse(object=>{object.geometry?.dispose();if(object.material){for(const material of Array.isArray(object.material)?object.material:[object.material])material.dispose();}});
 world=new THREE.Group();scene.add(world);houses=[];walkers=[];
 if(city){world.add(city.root);plan={roads:city.roads};}
 else{
 plan=planVillage({seed:Number($('seed').value),scale:$('scale').value,includeTemple:false,includePalace:false});
 for(const parcel of plan.parcels){
  const house=buildBuilding({...PRESETS[parcel.kind==='choga'?'choga':'giwa'],seed:parcel.seed});
  house.position.set(parcel.center.x,0,parcel.center.z);house.rotation.y=parcel.yaw||0;
  house.scale.setScalar(1);world.add(house);houses.push(house);
 }
 // Cheoma fornece o traçado. Este adaptador desenha as vias num terreno plano de teste.
 for(const road of plan.roads){for(let i=1;i<road.pts.length;i++){
  const a=road.pts[i-1],b=road.pts[i],length=Math.hypot(b.x-a.x,b.z-a.z);
  const segment=mesh(new THREE.BoxGeometry(road.width,.08,length+.2),0xb9a17c);
  segment.position.set((a.x+b.x)/2,.06,(a.z+b.z)/2);segment.rotation.y=Math.atan2(b.x-a.x,b.z-a.z);world.add(segment);
 }}

 }
 const bounds=new THREE.Box3().setFromObject(world),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
 const extent=Math.max(size.x,size.z,60);
 ground=mesh(new THREE.PlaneGeometry(extent*1.5,extent*1.5),0x253322);ground.rotation.x=-Math.PI/2;ground.position.set(center.x,-.05,center.z);world.add(ground);
 for(let i=0;i<18&&plan.roads.length;i++){
  const person=new THREE.Group();
  const body=mesh(new THREE.CylinderGeometry(.28,.4,1.15,5),i%2?0xd9c298:0x849fbb);body.position.y=.85;person.add(body);
  const head=mesh(new THREE.SphereGeometry(.28,6,5),0xe9c9a4);head.position.y=1.65;person.add(head);
  world.add(person);walkers.push({person,road:plan.roads[i%plan.roads.length],offset:i*.173});
 }
 controls.target.set(center.x,0,center.z);camera.position.set(center.x+extent*.65,extent*.85,center.z+extent*.85);camera.far=extent*12;camera.updateProjectionMatrix();controls.update();
 status.textContent=`${city?'threejs-city 0.1.0':'Cheoma 0.1.0'} · ASCII denso · ${city?city.count:houses.length} casas · ${plan.roads.length} caminhos. Cena experimental, sem vínculo com o save.`;
 resize();
}
let generating=false;
async function generateSelected(){
 if(generating)return;
 generating=true;$('generator').disabled=true;$('settings').querySelector('button[type=submit]').disabled=true;
 try{await regenerate();}catch(error){status.textContent='Falha ao gerar: '+error.message;console.error(error);}
 finally{generating=false;$('generator').disabled=false;$('settings').querySelector('button[type=submit]').disabled=false;}
}
$('settings').addEventListener('submit',event=>{event.preventDefault();generateSelected();});
$('generator').addEventListener('change',generateSelected);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');$('animate').checked=!reduced.matches;
generateSelected();
renderer.setAnimationLoop(time=>{
 if(document.hidden)return;
 if($('animate').checked&&!reduced.matches)for(const {person,road,offset} of walkers){
  const phase=(time*.000035+offset)%1,position=phase*(road.pts.length-1),index=Math.floor(position),a=road.pts[index],b=road.pts[Math.min(index+1,road.pts.length-1)];
  person.position.set(THREE.MathUtils.lerp(a.x,b.x,position-index),Math.sin(time*.008+offset)*.06,THREE.MathUtils.lerp(a.z,b.z,position-index));
 }
 controls.update();renderViews(time);
});
