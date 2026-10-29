import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog, initialSetup } from '../dist/game/catalog.mjs';
import { createGame, addArea, citizenIds, citizenGroups, similarCitizenIds, moveCitizens, advanceGame, expectedRates, ruleProgress, validateCatalog } from '../dist/game/engine.mjs';
const clone = value => JSON.parse(JSON.stringify(value));
import { productionSetup } from './fixtures.mjs';
const fresh = () => createGame(catalog, productionSetup);
const roll = (...values) => { let index=0; return () => { assert.ok(index<values.length,'Sorteios extras inesperados');return values[index++]; }; };

test('partida nova: só o Norte, floresta e pedreira, sem ninguém alocado', () => {
 const game=createGame(catalog,initialSetup);
 assert.equal(Object.keys(game.citizens).length,100);
 assert.equal(citizenIds(game).length,100);
 assert.deepEqual(Object.keys(game.areas),['wood','mine']);
 assert.equal(citizenIds(game,'wood').length,0);assert.equal(citizenIds(game,'mine').length,0);
 assert.ok(Object.values(game.citizens).every(citizen=>citizen.deckId==='povo-norte'&&citizen.bundleId==='norte-commonners'&&citizen.areaId===null));
 assert.deepEqual(advanceGame(game,catalog,60),[]);
 assert.ok(Object.values(game.inventory).every(amount=>amount===0));
 assert.equal(Object.hasOwn(game,'counts'),false);
});
test('máximo e mínimo inclusivos; estoque por item', () => {
 const game=fresh();const events=advanceGame(game,catalog,3,roll(0,0));
 assert.equal(game.inventory.trigo,1);assert.equal(events[0].amount,1);
 advanceGame(game,catalog,3,()=>.999999);assert.equal(game.inventory.trigo,4);
 assert.equal(game.inventory.carvalho,4);assert.equal(game.inventory.granito,5);
});
test('tentativa e quantidade são sorteadas individualmente por cidadão', () => {
 const game=fresh();moveCitizens(game,catalog,5,'idle','farm',2);
 const result=advanceGame(game,catalog,3,roll(0,0, 0,.5, 0,.9999));
 assert.equal(game.inventory.trigo,6);assert.equal(result[0].attempts,3);assert.equal(result[0].successes,3);
});
test('chance zero falha; chance um sempre gera', () => {
 const content=clone(catalog);content.areas['campos-trigo'].gera[0].chanceDeGerar=0;
 const game=createGame(content,productionSetup);const [event]=advanceGame(game,content,3,()=>0);
 assert.equal(event.attempts,1);assert.equal(event.successes,0);assert.equal(event.amount,0);assert.equal(game.inventory.trigo,0);
});
test('chance intermediária é por tentativa, sem multiplicar um sorteio coletivo', () => {
 const content=clone(catalog);content.areas['campos-trigo'].gera[0].chanceDeGerar=.5;
 const game=createGame(content,productionSetup);moveCitizens(game,content,5,'idle','farm',1);
 const [event]=advanceGame(game,content,3,roll(.49,.99,.5));
 assert.equal(event.attempts,2);assert.equal(event.successes,1);assert.equal(event.amount,3);
});
test('itens de uma área têm relógios independentes e podem sair juntos', () => {
 const content=clone(catalog);content.areas['campos-trigo'].gera.push({id:'colher-maca',itemId:'maca',quantidadeMaxima:1,tempoPraGerar:2,chanceDeGerar:1});
 const game=createGame(content,productionSetup);
 assert.equal(advanceGame(game,content,2,()=>0)[0].itemId,'maca');assert.equal(game.inventory.trigo,0);
 advanceGame(game,content,1,()=>0);assert.equal(game.inventory.trigo,1);assert.equal(game.inventory.maca,1);
 const events=advanceGame(game,content,3,()=>0).filter(event=>event.areaId==='farm');
 assert.equal(events.length,2);assert.equal(game.inventory.trigo,2);assert.equal(game.inventory.maca,4); // inclui o pomar
});
test('duas instâncias da mesma definição têm progresso separado e estoque compartilhado', () => {
 const game=fresh();addArea(game,catalog,{id:'outra-floresta',definitionId:'floresta-carvalho',nome:'Bosque Velho'});
 advanceGame(game,catalog,2,()=>0);moveCitizens(game,catalog,5,'idle','outra-floresta',1);
 advanceGame(game,catalog,2,()=>0);assert.equal(game.inventory.carvalho,1);
 assert.equal(ruleProgress(game,catalog,'outra-floresta','cortar-carvalho'),.5);
 advanceGame(game,catalog,2,()=>0);assert.equal(game.inventory.carvalho,2);
});
test('retirar cidadão preserva progresso dos demais; recém-chegado começa do zero', () => {
 const game=fresh();moveCitizens(game,catalog,5,'idle','farm',1);advanceGame(game,catalog,2,()=>0);
 moveCitizens(game,catalog,1,'farm','idle',1);assert.equal(game.citizens[5].progress['colher-trigo'],2);
 moveCitizens(game,catalog,6,'idle','farm',1);assert.equal(game.citizens[6].progress['colher-trigo'],0);
 advanceGame(game,catalog,1,()=>0);assert.equal(game.inventory.trigo,1);
 assert.equal(game.citizens[6].progress['colher-trigo'],1);
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
 const game=fresh();advanceGame(game,catalog,30,()=>0);assert.equal(game.inventory.trigo,10);assert.equal(game.inventory.carvalho,7);
 game.paused=true;const before=JSON.stringify(game);assert.deepEqual(advanceGame(game,catalog,100),[]);assert.equal(JSON.stringify(game),before);
 game.paused=false;moveCitizens(game,catalog,1,'farm','idle',1);const wheat=game.inventory.trigo;advanceGame(game,catalog,3,()=>0);assert.equal(game.inventory.trigo,wheat);
});
test('taxa esperada usa chance, média da quantidade e agrega áreas por item', () => {
 const game=fresh();assert.equal(expectedRates(game,catalog).trigo,2/3);
 addArea(game,catalog,{id:'campo-extra',definitionId:'campos-trigo'});moveCitizens(game,catalog,5,'idle','campo-extra',1);
 assert.equal(expectedRates(game,catalog).trigo,4/3);assert.equal(expectedRates(game,catalog,'campo-extra').trigo,2/3);
});
test('dados inválidos são rejeitados antes de iniciar a partida', () => {
 for(const mutate of [c=>c.areas['campos-trigo'].gera[0].itemId='ausente',c=>c.areas['campos-trigo'].gera[0].tempoPraGerar=0,c=>c.areas['campos-trigo'].gera[0].chanceDeGerar=2,c=>c.areas['campos-trigo'].gera[0].quantidadeMaxima=0,c=>c.areas['campos-trigo'].gera.push({...c.areas['campos-trigo'].gera[0]}),c=>c.bundles['norte-commonners'].deckId='ausente',c=>c.areas['campos-trigo'].tipo='refinar']){
  const content=clone(catalog);mutate(content);assert.throws(()=>validateCatalog(content));
 }
 const game=fresh();assert.throws(()=>addArea(game,catalog,{id:'farm',definitionId:'campos-trigo'}));assert.throws(()=>advanceGame(game,catalog,-1));
});
test('milhares de cidadãos geram efeitos agregados, conservando identidades', () => {
 const game=createGame(catalog,{areas:productionSetup.areas,populations:[{bundleId:'norte-commonners',quantidade:5000}]});
 assert.ok(moveCitizens(game,catalog,1,'idle','farm',5000));const events=advanceGame(game,catalog,3,()=>0);
 assert.equal(events.length,1);assert.equal(events[0].attempts,5000);assert.equal(game.inventory.trigo,5000);
 assert.ok(moveCitizens(game,catalog,1,'farm','idle',5000));assert.equal(citizenIds(game).length,5000);assert.equal(Object.keys(game.citizens).length,5000);
});
