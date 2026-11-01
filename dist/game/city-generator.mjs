import * as THREE from 'three';
import {planCity,resolveCityOptions,runToEnd,buildingGeometry,roadGeometry} from '../vendor/threejs-city/lordes-bundle.mjs';

// Usa planejamento e geometrias reais da biblioteca; materiais WebGL simples.
export function generateCityVillage(seed,scale){
 const options=resolveCityOptions({seed,size:scale==='hamlet'?'hamlet':'village',architecture:'temperate',center:[0,0]});
 const plan=runToEnd(planCity(()=>({height:0,waterLevel:NaN}),options));
 const root=new THREE.Group();
 function addMesh(data,color){
  if(!data.count)return;
  const geometry=new THREE.BufferGeometry();
  for(const [name,array] of Object.entries(data.attributes))geometry.setAttribute(name,new THREE.BufferAttribute(array,data.itemSizes[name]));
  geometry.setIndex(new THREE.BufferAttribute(data.index,1));
  const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:1,side:THREE.DoubleSide}));root.add(mesh);
 }
 for(const building of plan.buildings){
  const data=buildingGeometry(building,plan.center,{wall:[.75,.66,.49],roof:[.35,.16,.08],overhang:.6,parapet:.3});
  addMesh(data.walls,0xd6c39d);addMesh(data.roofs,building.id%2?0x985536:0x605c54);
 }
 addMesh(roadGeometry(plan.graph,plan.profiles,plan.center,()=>0,{kerbHeight:.12,offset:.06,deckThickness:.5,pierSpacing:12}),0xb8aa8b);
 return {root,count:plan.buildings.length,roads:plan.profiles.map(profile=>({pts:profile.points.map(([x,y,z])=>({x:x-plan.center[0],z:z-plan.center[1]}))}))};
}
