import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planCity,resolveCityOptions,runToEnd,buildingGeometry,roadGeometry} from '../dist/vendor/threejs-city/lordes-bundle.mjs';
function generate(size){return runToEnd(planCity(()=>({height:0,waterLevel:NaN}),resolveCityOptions({seed:7,size,architecture:'temperate',center:[0,0]})));}
test('threejs-city gera geometria finita e reproduzível nas duas escalas',()=>{
 for(const scale of ['hamlet','village']){
  const a=generate(scale),b=generate(scale);
  assert.ok(a.buildings.length>0);assert.ok(a.profiles.length>0);
  assert.deepEqual(a.buildings,b.buildings);assert.deepEqual(a.profiles,b.profiles);
  const roads=roadGeometry(a.graph,a.profiles,a.center,()=>0,{kerbHeight:.12,offset:.06,deckThickness:.5,pierSpacing:12});
  for(const data of [roads,...a.buildings.flatMap(building=>{const meshes=buildingGeometry(building,a.center,{wall:[.75,.66,.49],roof:[.35,.16,.08],overhang:.6,parapet:.3});return [meshes.walls,meshes.roofs];})]){
   assert.ok(data.count>0);assert.ok(data.attributes.position.every(Number.isFinite));assert.ok(data.index.every(index=>index<data.count));
  }
 }
});
