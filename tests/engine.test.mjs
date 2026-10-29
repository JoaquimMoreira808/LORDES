import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog, initialSetup } from '../dist/game/catalog.mjs';
import { createGame, canCreateArea, createAreaFromAction, addArea, citizenIds, citizenGroups, similarCitizenIds, moveCitizens, advanceGame, expectedRates, collectionProgress, validateCatalog } from '../dist/game/engine.mjs';
const clone = value => JSON.parse(JSON.stringify(value));
import { productionSetup } from './fixtures.mjs';
const fresh = () => createGame(catalog, productionSetup);
const roll = (...values) => { let index=0; return () => { assert.ok(index<values.length,'Sorteios extras inesperados');return values[index++]; }; };

test('partida nova: só o Norte, floresta e pedreira, sem ninguém alocado', () => {
 const game=createGame(catalog,initialSetup);
 assert.equal(Object.keys(game.citizens).length,25);
 assert.equal(citizenIds(game).length,25);
 assert.deepEqual(Object.keys(game.areas),['wood','mine']);
 assert.equal(citizenIds(game,'wood').length,0);assert.equal(citizenIds(game,'mine').length,0);
 assert.ok(Object.values(game.citizens).every(citizen=>citizen.deckId==='povo-norte'&&citizen.bundleId==='norte-commonners'&&citizen.areaId===null));
 assert.deepEqual(advanceGame(game,catalog,90),[]);
 assert.ok(Object.values(game.inventory).every(amount=>amount===0));
 assert.equal(Object.hasOwn(game,'counts'),false);
});
test('máximo e mínimo inclusivos; estoque por item', () => {
 const game=fresh();const events=advanceGame(game,catalog,4.5,roll(0,0));
 assert.equal(game.inventory.trigo,1);assert.equal(events[0].amount,1);
 advanceGame(game,catalog,4.5,()=>.999999);assert.equal(game.inventory.trigo,4);
 assert.equal(game.inventory.carvalho,0);assert.equal(game.inventory.granito,0);
 advanceGame(game,catalog,7.5,()=>0);assert.equal(game.inventory['fibra-vegetal'],1);assert.equal(game.inventory.cascalho,1);
});
test('tentativa e quantidade são sorteadas individualmente por cidadão', () => {
 const game=fresh();moveCitizens(game,catalog,5,'idle','farm',2);
 const result=advanceGame(game,catalog,4.5,roll(0,0, 0,.5, 0,.9999));
 assert.equal(game.inventory.trigo,6);assert.equal(result[0].attempts,3);assert.equal(result[0].successes,3);
});
test('um ciclo de cada cidadão sorteia exatamente um tipo de item', () => {
 const game=createGame(catalog,initialSetup);moveCitizens(game,catalog,1,'idle','wood',4);
 const events=advanceGame(game,catalog,6,roll(0,0, .799,0, .899,0, .999,0));
 assert.equal(events.length,4);assert.equal(events.reduce((sum,event)=>sum+event.attempts,0),4);
 for(const itemId of ['fibra-vegetal','frutas-silvestres','sementes-silvestres','semente-maca'])assert.equal(game.inventory[itemId],1);
 assert.equal(Object.values(game.inventory).reduce((sum,n)=>sum+n,0),4);
 assert.ok(Object.values(game.citizens).filter(c=>c.areaId==='wood').every(c=>Object.keys(c.progress).join()==='coleta'));
});
test('limites do sorteio respeitam chances e excluem resultados de chance zero', () => {
 const content=clone(catalog);const area=content.areas['campos-trigo'];
 area.gera[0].chanceDeGerar=0;area.gera.push({id:'colher-maca',itemId:'maca',quantidadeMaxima:1,chanceDeGerar:1});
 const game=createGame(content,{areas:[{id:'farm',definitionId:'campos-trigo'}],populations:[{bundleId:'norte-commonners',quantidade:1}],assignments:[{citizenId:1,areaId:'farm'}]});
 const [event]=advanceGame(game,content,4.5,roll(0,0));assert.equal(event.itemId,'maca');assert.equal(game.inventory.trigo,0);
});
test('pedreira também sorteia somente um resultado por coleta', () => {
 const game=createGame(catalog,initialSetup);moveCitizens(game,catalog,1,'idle','mine',1);
 advanceGame(game,catalog,7.5,roll(.999,0));assert.equal(game.inventory['minerio-ferro'],1);
 assert.equal(game.inventory.granito,0);assert.equal(game.inventory.cascalho,0);
});
test('duas instâncias da mesma definição têm progresso separado e estoque compartilhado', () => {
 const game=fresh();addArea(game,catalog,{id:'outra-floresta',definitionId:'floresta-carvalho',nome:'Bosque Velho'});
 advanceGame(game,catalog,3,()=>0);moveCitizens(game,catalog,5,'idle','outra-floresta',1);
 advanceGame(game,catalog,3,()=>0);assert.equal(game.inventory['fibra-vegetal'],1);
 assert.equal(collectionProgress(game,catalog,'outra-floresta'),.5);
 advanceGame(game,catalog,3,()=>0);assert.equal(game.inventory['fibra-vegetal'],2);
});
test('retirar cidadão preserva progresso dos demais; recém-chegado começa do zero', () => {
 const game=fresh();moveCitizens(game,catalog,5,'idle','farm',1);advanceGame(game,catalog,3,()=>0);
 moveCitizens(game,catalog,1,'farm','idle',1);assert.equal(game.citizens[5].progress.coleta,3);
 moveCitizens(game,catalog,6,'idle','farm',1);assert.equal(game.citizens[6].progress.coleta,0);
 advanceGame(game,catalog,1.5,()=>0);assert.equal(game.inventory.trigo,1);
 assert.equal(game.citizens[6].progress.coleta,1.5);
});
test('devolução mantém deck/bundle e movimentações inválidas não alteram estado', () => {
 const game=fresh();assert.ok(moveCitizens(game,catalog,5,'idle','wood',10));
 assert.ok(moveCitizens(game,catalog,5,'wood','idle',10));assert.equal(game.citizens[5].bundleId,'norte-commonners');
 const before=JSON.stringify(game);
 for(const args of [[5,'wood','idle',1],[5,'idle','inexistente',1],[5,'idle','farm',1000],[5,'idle','farm',1.5],[5,'idle','idle',1]])assert.equal(moveCitizens(game,catalog,...args),false);
 assert.equal(JSON.stringify(game),before);
});
test('mesma mão só agrupa cidadãos do mesmo deck E bundle', () => {
 const content=clone(catalog);content.bundles.especialistas={id:'especialistas',deckId:'povo-norte',nome:'Especialistas'};
 content.decks.sul={id:'sul',nome:'Povo do Sul'};content.bundles['sul-commonners']={id:'sul-commonners',deckId:'sul',nome:'Commonners'};
 const game=createGame(content,{areas:productionSetup.areas,populations:[{bundleId:'norte-commonners',quantidade:2},{bundleId:'especialistas',quantidade:2},{bundleId:'sul-commonners',quantidade:2}]});
 assert.deepEqual(similarCitizenIds(game,1,'idle'),[1,2]);assert.equal(citizenGroups(game,'idle').length,3);
 assert.equal(moveCitizens(game,content,1,'idle','farm',3),false);
 assert.ok(moveCitizens(game,content,1,'idle','farm',2));assert.ok(moveCitizens(game,content,3,'idle','farm',2));
 assert.equal(citizenGroups(game,'farm').length,2);
});
test('intervalos longos preservam todos os ciclos; pausado e sem cidadãos não produzem', () => {
 const game=fresh();advanceGame(game,catalog,45,()=>0);assert.equal(game.inventory.trigo,10);assert.equal(game.inventory['fibra-vegetal'],7);
 game.paused=true;const before=JSON.stringify(game);assert.deepEqual(advanceGame(game,catalog,150),[]);assert.equal(JSON.stringify(game),before);
 game.paused=false;moveCitizens(game,catalog,1,'farm','idle',1);const wheat=game.inventory.trigo;advanceGame(game,catalog,4.5,()=>0);assert.equal(game.inventory.trigo,wheat);
});
test('taxa esperada usa chance, média da quantidade e agrega áreas por item', () => {
 const game=fresh();assert.equal(expectedRates(game,catalog).trigo,2/4.5);
 addArea(game,catalog,{id:'campo-extra',definitionId:'campos-trigo'});moveCitizens(game,catalog,5,'idle','campo-extra',1);
 assert.equal(expectedRates(game,catalog).trigo,4/4.5);assert.equal(expectedRates(game,catalog,'campo-extra').trigo,2/4.5);
});
test('dados inválidos são rejeitados antes de iniciar a partida', () => {
 for(const mutate of [c=>c.areas['campos-trigo'].gera[0].itemId='ausente',c=>c.areas['campos-trigo'].tempoPraColetar=0,c=>c.areas['campos-trigo'].gera[0].chanceDeGerar=2,c=>c.areas['campos-trigo'].gera[0].chanceDeGerar=.5,c=>c.areas['campos-trigo'].gera[0].quantidadeMaxima=0,c=>c.areas['campos-trigo'].gera.push({...c.areas['campos-trigo'].gera[0]}),c=>c.bundles['norte-commonners'].deckId='ausente',c=>c.areas['campos-trigo'].tipo='refinar']){
  const content=clone(catalog);mutate(content);assert.throws(()=>validateCatalog(content));
 }
 const game=fresh();assert.throws(()=>addArea(game,catalog,{id:'farm',definitionId:'campos-trigo'}));assert.throws(()=>advanceGame(game,catalog,-1));
});
test('milhares de cidadãos geram efeitos agregados, conservando identidades', () => {
 const game=createGame(catalog,{areas:productionSetup.areas,populations:[{bundleId:'norte-commonners',quantidade:5000}]});
 assert.ok(moveCitizens(game,catalog,1,'idle','farm',5000));const events=advanceGame(game,catalog,4.5,()=>0);
 assert.equal(events.length,1);assert.equal(events[0].attempts,5000);assert.equal(game.inventory.trigo,5000);
 assert.ok(moveCitizens(game,catalog,1,'farm','idle',5000));assert.equal(citizenIds(game).length,5000);assert.equal(Object.keys(game.citizens).length,5000);
});

test('tabelas iniciais respeitam itens, raridades e probabilidades', () => {
 const expected={
  'floresta-carvalho':[['fibra-vegetal','comum',.799],['frutas-silvestres','incomum',.1],['sementes-silvestres','incomum',.1],['semente-maca','raro',.001]],
  'pedreira-granito':[['cascalho','comum',.899],['granito','incomum',.1],['minerio-ferro','raro',.001]]
 };
 for(const [areaId,entries] of Object.entries(expected)){
  assert.deepEqual(catalog.areas[areaId].gera.map(rule=>[rule.itemId,catalog.items[rule.itemId].raridade,rule.chanceDeGerar]),entries);
 }
});
test('todos os tempos de coleta aumentaram em 50%', () => {
 for(const [id,before] of Object.entries({'campos-trigo':3,'floresta-carvalho':4,'pedreira-granito':5,'pomar-macas':4}))assert.equal(catalog.areas[id].tempoPraColetar,before*1.5);
});


test('ações cobram custos uma vez e criam instâncias independentes sem alocar cidadãos', () => {
 const game=createGame(catalog,initialSetup);
 const before=JSON.stringify(game);
 assert.equal(canCreateArea(game,catalog,'plantar-trigo'),false);
 assert.equal(createAreaFromAction(game,catalog,'plantar-trigo'),null);
 assert.equal(createAreaFromAction(game,catalog,'ausente'),null);
 assert.equal(JSON.stringify(game),before);
 for(const [actionId,action] of Object.entries(catalog.areaActions)){
  for(const [id,amount] of action.custos)game.inventory[id]=amount*2;
  const one=createAreaFromAction(game,catalog,actionId);
  const two=createAreaFromAction(game,catalog,actionId);
  assert.ok(one);assert.ok(two);assert.notEqual(one.id,two.id);
  assert.equal(one.definitionId,action.definitionId);
  for(const [id] of action.custos)assert.equal(game.inventory[id],0);
  assert.equal(createAreaFromAction(game,catalog,actionId),null);
  assert.equal(citizenIds(game,one.id).length,0);
 }
});
test('madeireira produz troncos por cidadão e valida custos de abertura', () => {
 const game=createGame(catalog,initialSetup);
 addArea(game,catalog,{id:'madeireira',definitionId:'madeireira-carvalho'});
 moveCitizens(game,catalog,1,'idle','madeireira',2);
 advanceGame(game,catalog,7.5,()=>0);
 assert.equal(game.inventory.carvalho,2);
 assert.equal(expectedRates(game,catalog,'madeireira').carvalho,4/7.5);
 const bad=clone(catalog);bad.areaActions['plantar-trigo'].custos.push(['trigo',-1]);
 assert.throws(()=>validateCatalog(bad));
});
