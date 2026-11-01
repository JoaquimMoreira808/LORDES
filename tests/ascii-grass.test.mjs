import {test} from 'node:test';
import assert from 'node:assert/strict';
import {grassGlyph} from '../dist/game/ascii-grass.mjs';
test('vento muda apenas inclinação: posições dos tufos permanecem estáveis',()=>{
 let count=0,changed=0;
 for(let y=0;y<40;y++)for(let x=0;x<80;x++){
  const a=grassGlyph(x,y,0),b=grassGlyph(x,y,2000);
  assert.equal(Boolean(a),Boolean(b));
  if(a){count++;assert.ok(['i','l','/'].includes(a.char));assert.equal(a.color,b.color);if(a.transform!==b.transform)changed++;}
 }
 assert.ok(count>1300&&count<2100);assert.ok(changed>0);
});
test('movimento reduzido congela os tufos',()=>{
 for(let x=0;x<100;x++)assert.deepEqual(grassGlyph(x,7,0,false),grassGlyph(x,7,999999,false));
});
