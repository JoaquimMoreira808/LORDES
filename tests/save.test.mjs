import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,initialSetup} from '../dist/game/catalog.mjs';
import {createGame,addArea,moveCitizens,advanceGame} from '../dist/game/engine.mjs';
import {restoreGame} from '../dist/game/save.mjs';
const fresh=()=>createGame(catalog,initialSetup);
const copy=value=>JSON.parse(JSON.stringify(value));
test('save restaura inventário, áreas conquistadas, cartas e progresso individual',()=>{
 const game=fresh();addArea(game,catalog,{id:'bosque-conquistado',definitionId:'floresta-carvalho',nome:'Bosque Antigo'});
 moveCitizens(game,catalog,5,'idle','bosque-conquistado',8);advanceGame(game,catalog,4.5,()=>0);
 game.paused=true;const restored=restoreGame(catalog,copy(game));
 assert.deepEqual(restored,game);assert.notEqual(restored.citizens[5],game.citizens[5]);
});
test('recuperar não concede novamente as áreas ou cidadãos iniciais',()=>{
 const game=fresh();delete game.areas.fruit;game.citizens[4].areaId=null;game.citizens[4].progress={};delete game.citizens[100];
 const restored=restoreGame(catalog,copy(game));assert.equal(Object.keys(restored.areas).length,3);assert.equal(Object.keys(restored.citizens).length,99);
});
test('novo item de catálogo começa zerado ao carregar save antigo',()=>{
 const content=copy(catalog);content.items.resina={id:'resina',nome:'Resina'};
 const restored=restoreGame(content,fresh());assert.equal(restored.inventory.resina,0);
});
test('dados inválidos ou referências ausentes não viram partida nova',()=>{
 for(const mutate of [s=>s.version=999,s=>s.inventory.trigo=-1,s=>s.inventory.trigo=1.5,s=>s.citizens[1].areaId='ausente',s=>s.citizens[1].deckId='ausente',s=>s.citizens[1].progress['colher-trigo']=NaN,s=>s.areas.wood.definitionId='ausente',s=>s.citizens[1].id=2]){
  const saved=fresh();mutate(saved);assert.throws(()=>restoreGame(catalog,saved));
 }
});
test('alterar duração no catálogo normaliza progresso e não produz offline',()=>{
 const game=fresh();advanceGame(game,catalog,2,()=>0);
 const content=copy(catalog);content.areas['campos-trigo'].gera[0].tempoPraGerar=1.5;
 const restored=restoreGame(content,copy(game));assert.equal(restored.citizens[1].progress['colher-trigo'],.5);assert.equal(restored.inventory.trigo,0);
});
