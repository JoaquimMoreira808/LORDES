import { addArea, validateCatalog } from './engine.mjs';
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const ensure=(condition,message)=>{if(!condition)throw new Error(message);};

// Reconstroi apenas os campos do contrato. Referências inválidas não viram partida nova silenciosamente.
export function restoreGame(catalog, saved) {
 validateCatalog(catalog);
 ensure(object(saved)&&saved.version===1,'Versão de save não suportada.');
 ensure(typeof saved.paused==='boolean'&&object(saved.inventory)&&object(saved.areas)&&object(saved.citizens),'Save incompleto.');
 const game={version:1,paused:saved.paused,inventory:{},areas:{},citizens:{}};
 for(const [id,amount] of Object.entries(saved.inventory)){
  ensure(Object.hasOwn(catalog.items,id),`Item do save não encontrado: ${id}.`);
  ensure(Number.isSafeInteger(amount)&&amount>=0,`Quantidade inválida: ${id}.`);
 }
 for(const id of Object.keys(catalog.items))game.inventory[id]=saved.inventory[id]??0;
 for(const [id,area] of Object.entries(saved.areas)){
  ensure(object(area)&&area.id===id,'Área inválida no save.');
  ensure(area.nome===undefined||(typeof area.nome==='string'&&area.nome.length>0&&area.nome.length<=120),'Nome de área inválido.');
  addArea(game,catalog,area);
 }
 for(const [key,citizen] of Object.entries(saved.citizens)){
  ensure(object(citizen)&&Number.isSafeInteger(citizen.id)&&citizen.id>0&&String(citizen.id)===key,'Cidadão inválido no save.');
  const bundle=catalog.bundles[citizen.bundleId];
  ensure(bundle&&Object.hasOwn(catalog.bundles,citizen.bundleId)&&bundle.deckId===citizen.deckId&&Object.hasOwn(catalog.decks,citizen.deckId),'Deck ou bundle do save não encontrado.');
  ensure(citizen.areaId===null||Object.hasOwn(game.areas,citizen.areaId),'Área do cidadão não encontrada.');
  ensure(object(citizen.progress)&&Object.values(citizen.progress).every(value=>Number.isFinite(value)&&value>=0),'Progresso inválido.');
  const definition=citizen.areaId===null?null:catalog.areas[game.areas[citizen.areaId].definitionId];
  // Saves antigos tinham um relógio por item: aproveita o maior progresso conhecido.
  const elapsed=definition?(citizen.progress.coleta??Math.max(0,...definition.gera.map(rule=>citizen.progress[rule.id]??0))):0;
  const progress=definition?{coleta:elapsed%definition.tempoPraColetar}:{};
  game.citizens[key]={id:citizen.id,deckId:citizen.deckId,bundleId:citizen.bundleId,areaId:citizen.areaId,progress};
 }
 return game;
}

export async function saveRequest(route, data, {keepalive=false}={}) {
 let response;
 try {response=await fetch('/api/'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),keepalive});}
 catch {throw new Error('Sem conexão com o servidor. Sua partida continua aberta; tente salvar novamente.');}
 let result;
 try {result=await response.json();}
 catch {throw new Error('O servidor de saves não está disponível. Inicie o jogo com ./deploy.sh ou python3 server.py.');}
 if(!response.ok){const error=new Error(result.error||'Não foi possível salvar.');error.status=response.status;throw error;}
 return result;
}
