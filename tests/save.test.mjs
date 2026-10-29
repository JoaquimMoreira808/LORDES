import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,initialSetup} from '../dist/game/catalog.mjs';
import {createGame,addArea,moveCitizens,advanceGame} from '../dist/game/engine.mjs';
import {restoreGame} from '../dist/game/save.mjs';
import {productionSetup} from './fixtures.mjs';
const fresh=()=>createGame(catalog,initialSetup);
const copy=value=>JSON.parse(JSON.stringify(value));
test('save restaura inventário, áreas conquistadas, cartas e progresso individual',()=>{
 const game=fresh();addArea(game,catalog,{id:'bosque-conquistado',definitionId:'floresta-carvalho',nome:'Bosque Antigo'});
 moveCitizens(game,catalog,5,'idle','bosque-conquistado',8);advanceGame(game,catalog,4.5,()=>0);
 game.paused=true;const restored=restoreGame(catalog,copy(game));
 assert.deepEqual(restored,game);assert.notEqual(restored.citizens[5],game.citizens[5]);
});
test('recuperar não concede novamente as áreas ou cidadãos iniciais',()=>{
 const game=fresh();delete game.areas.mine;game.citizens[4].areaId=null;game.citizens[4].progress={};delete game.citizens[100];
 const restored=restoreGame(catalog,copy(game));assert.equal(Object.keys(restored.areas).length,1);assert.equal(Object.keys(restored.citizens).length,99);
});
test('novo item de catálogo começa zerado ao carregar save antigo',()=>{
 const content=copy(catalog);content.items.novidade={id:'novidade',nome:'Novidade'};
 const restored=restoreGame(content,fresh());assert.equal(restored.inventory.novidade,0);
});
test('dados inválidos ou referências ausentes não viram partida nova',()=>{
 for(const mutate of [s=>s.version=999,s=>s.inventory.trigo=-1,s=>s.inventory.trigo=1.5,s=>s.citizens[1].areaId='ausente',s=>s.citizens[1].deckId='ausente',s=>s.citizens[1].progress['colher-trigo']=NaN,s=>s.areas.wood.definitionId='ausente',s=>s.citizens[1].id=2]){
  const saved=fresh();mutate(saved);assert.throws(()=>restoreGame(catalog,saved));
 }
});
test('alterar duração no catálogo normaliza progresso e não produz offline',()=>{
 const game=fresh();moveCitizens(game,catalog,1,'idle','wood',1);advanceGame(game,catalog,2,()=>0);
 const content=copy(catalog);content.areas['floresta-carvalho'].tempoPraColetar=1.5;
 const restored=restoreGame(content,copy(game));assert.equal(restored.citizens[1].progress.coleta,.5);assert.equal(restored.inventory.trigo,0);
});

test('saves anteriores preservam suas quatro áreas e trabalhadores alocados',()=>{
 const existing=createGame(catalog,productionSetup);
 const restored=restoreGame(catalog,copy(existing));
 assert.deepEqual(restored,existing);
 assert.equal(Object.keys(restored.areas).length,4);
 assert.equal(Object.values(restored.citizens).filter(citizen=>citizen.areaId!==null).length,4);
});

test('save anterior conserva madeira e reinicia as novas coletas da floresta',()=>{
 const game=fresh();game.inventory.carvalho=42;moveCitizens(game,catalog,1,'idle','wood',1);
 game.citizens[1].progress={'cortar-carvalho':2};
 for(const id of Object.keys(game.inventory))if(!['carvalho','granito','maca','trigo'].includes(id))delete game.inventory[id];
 const restored=restoreGame(catalog,game);
 assert.equal(restored.inventory.carvalho,42);assert.equal(restored.inventory['fibra-vegetal'],0);
 assert.equal(restored.citizens[1].areaId,'wood');assert.equal(restored.citizens[1].progress.coleta,0);
 assert.equal(Object.hasOwn(restored.citizens[1].progress,'cortar-carvalho'),false);
});

test('migração usa um único progresso sem multiplicar a produção antiga',()=>{
 const game=fresh();moveCitizens(game,catalog,1,'idle','wood',1);
 game.citizens[1].progress={'coletar-fibra-vegetal':2,'coletar-cogumelo-silvestre':2,'coletar-trufa-negra':2,'coletar-semente-ancestral':2};
 const restored=restoreGame(catalog,game);assert.deepEqual(restored.citizens[1].progress,{coleta:2});
 const events=advanceGame(restored,catalog,4,()=>0);assert.equal(events.length,1);assert.equal(events[0].amount,1);
});
