import { resourceIcon, observeResourceIcons } from './game/resource-icons.mjs';
import { catalog, initialSetup } from './game/catalog.mjs';
import { createGame, canCreateArea, createAreaFromAction, citizenIds, similarCitizenIds, citizenGroups, moveCitizens as moveEntities, advanceGame, expectedRates, collectionProgress } from './game/engine.mjs';

import { restoreGame, saveRequest } from './game/save.mjs';

observeResourceIcons(catalog);
let game=createGame(catalog,initialSetup);
let activePlayer=null,saveRevision=0,saveBlocked=false,saveQueue=Promise.resolve();
const escapeHtml=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
let jobs=[];
function workerCount(source){return citizenIds(game,source).length;}
function availableCitizens(){return citizenIds(game,'idle');}
function availableForHand(){return activeDrag?similarCitizenIds(game,activeDrag.id,activeDrag.source):availableCitizens();}
function areaViews(){return Object.values(game.areas).map(area=>{
 const definition=catalog.areas[area.definitionId],item=catalog.items[definition.gera[0].itemId];
 return {id:area.id,definition,location:escapeHtml(area.nome||definition.nome),name:definition.oficio||definition.nome,scene:definition.arte,color:item.cor||'#c3cbb9',tint:'#3a3c37',primaryItem:item};
});}
const decimal=n=>n.toLocaleString('pt-BR',{maximumFractionDigits:2});
const progressId=(areaId,ruleId)=>`${areaId}-${ruleId}`;
const format=n=>Math.floor(n).toLocaleString('pt-BR');
const $=id=>document.getElementById(id);
let activeDrag=null,selectedCitizen=null,suppressCitizenClick=false,handSize=1;

function citizenPortrait(citizenId){
 const citizen=game.citizens[citizenId],bundle=catalog.bundles[citizen.bundleId],deck=catalog.decks[citizen.deckId];
 const art=bundle.arte||deck.arte;
 return art?`<img class="pixel-art northern-pixel" src="${art}" alt="" draggable="false">`:'<span class="rune-glyph" aria-hidden="true">ᛟ</span>';
}
function cards(id){
 const groups=citizenGroups(game,id);
 return groups.length?groups.map(group=>{
  const first=group.ids[0],bundle=catalog.bundles[group.bundleId],deck=catalog.decks[group.deckId];
  return `<button class="card commonner-card assigned-card" data-citizen="${first}" data-source="${id}" aria-label="${bundle.nome}, ${deck.nome}, segure para retirar cidadãos"><span class="commonner-id"><span class="rune-glyph">${deck.runa||'ᛟ'}</span><span class="bundle-card-count">×${format(group.ids.length)}</span></span><span class="portrait">${citizenPortrait(first)}</span><small>${bundle.cartaNome||bundle.nome}</small></button>`;
 }).join(''):'';
}
const normalizeSearch=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
function filterResources(){
 const query=normalizeSearch($('resource-search').value);
 const rows=[...$('resources').querySelectorAll('.resource-row')];
 for(const row of rows)row.hidden=!normalizeSearch(catalog.items[row.id.slice(6)].nome).includes(query);
 $('resource-search-empty').hidden=!rows.length||rows.some(row=>!row.hidden);
}
$('resource-search').addEventListener('input',filterResources);
function renderResources(){
 const rates=expectedRates(game,catalog);
 $('resources').innerHTML=Object.values(catalog.items).filter(item=>game.inventory[item.id]>0).map(item=>`<div class="resource-row" id="stock-${item.id}" role="group" aria-label="${item.nome}" title="${item.nome}" style="--accent:${item.cor||'#c3cbb9'}"><span class="resource-art" aria-hidden="true">${resourceIcon(item)}</span><div class="resource-info"><span class="resource-name">${item.nome}</span><small>≈ ${decimal(game.paused?0:rates[item.id]||0)} / s</small></div><strong id="total-${item.id}">${format(game.inventory[item.id])}</strong></div>`).join('')||'<p class="resources-empty">Você ainda não tem recursos. Aloque cidadãos nas áreas para começar a coletar.</p>';
 $('resources').insertAdjacentHTML('beforeend','<p id="resource-search-empty" class="resources-empty" role="status" hidden>Nenhum recurso encontrado.</p>');
 filterResources();
}
function renderActions(){
 $('actions-panel').innerHTML=Object.entries(catalog.areaActions).map(([id,action])=>`<section class="area-action"><h3>${escapeHtml(action.nome)}</h3><ul>${action.custos.map(([itemId,amount])=>`<li data-cost-item="${itemId}" data-cost-amount="${amount}"><span>${escapeHtml(catalog.items[itemId].nome)}</span> <span data-cost-stock></span> / ${format(amount)}</li>`).join('')}</ul><button type="button" data-create-area="${id}">${action.verbo}</button></section>`).join('')+'<section class="area-action"><h3>Refinaria de Pedra</h3><p>Em planejamento</p><p>Sugestão: transformar 2 granitos em 1 Laje de Pedra por cidadão a cada 12 s.</p></section><p id="area-action-status" role="status" aria-live="polite"></p>';
 updateActions();
}
function updateActions(){
 for(const button of $('actions-panel').querySelectorAll('[data-create-area]'))button.disabled=!activePlayer||!canCreateArea(game,catalog,button.dataset.createArea);
 for(const row of $('actions-panel').querySelectorAll('[data-cost-item]')){
  const stock=game.inventory[row.dataset.costItem]||0;
  row.querySelector('[data-cost-stock]').textContent=format(stock);
  row.classList.toggle('cost-missing',stock<Number(row.dataset.costAmount));
 }
}
$('actions-panel').addEventListener('click',event=>{
 const button=event.target.closest('[data-create-area]');
 if(!button||!activePlayer)return;
 const area=createAreaFromAction(game,catalog,button.dataset.createArea);
 if(!area)return;
 render();
 $('area-action-status').textContent=catalog.areas[area.definitionId].nome+' criada. Aloque cidadãos para produzir.';
 persistGame();
});
function generationDetails(j){
 const id=progressId(j.id,'coleta');
 return `<div class="generation-rule"><div class="work-cycle"><div class="work-label"><span id="activity-${id}">${j.definition.atividade||'Coletando'}</span><span>${decimal(j.definition.tempoPraColetar)} s / cidadão</span></div><div class="work-track" role="progressbar" aria-label="Próxima coleta" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="progress-${id}"><div class="work-fill" id="fill-${id}"></div></div></div><div class="rule-amount">Cada cidadão encontra um tipo de recurso por coleta.</div></div>`;
}
function fitLocationTitles(){
 document.querySelectorAll('.location-title').forEach(title=>{
  const available=title.clientWidth-8;
  if(available<=0)return;
  title.style.fontSize='32px';
  const range=document.createRange();
  range.selectNodeContents(title);
  const measured=range.getBoundingClientRect().width;
  if(measured>0)title.style.fontSize=Math.min(32,32*available/measured)+'px';
 });
}
const locationTitlesObserver=new ResizeObserver(fitLocationTitles);
locationTitlesObserver.observe($('shelves'));
document.fonts.ready.then(fitLocationTitles);
document.fonts.addEventListener('loadingdone',fitLocationTitles);
function render(){
 jobs=areaViews();renderResources();renderActions();
 $('shelves').innerHTML=jobs.map(j=>`<article class="shelf location" id="job-${j.id}" data-job="${j.id}" tabindex="0" role="group" aria-label="${j.location}, ${j.name}, receber cidadão" style="--accent:${j.color};--tint:${j.tint}">
 <div class="location-frame"><h3 class="location-title">${j.location}</h3><div class="location-window">${j.scene||j.primaryItem.arte?`<img class="location-art pixel-art ${j.scene?'location-scenery':'location-resource'}" src="${j.scene||j.primaryItem.arte}" alt="${j.location}" draggable="false">`:'<span class="location-placeholder rune-glyph" aria-hidden="true">ᛟ</span>'}<div class="location-caption"><span class="icon">${resourceIcon(j.primaryItem)}</span><span>${j.name}</span><span class="count">${format(workerCount(j.id))}</span></div><div class="cards">${cards(j.id)}</div></div></div>
 <section class="location-details" id="details-${j.id}" role="dialog" aria-label="Produção de ${j.location}"><div class="details-heading"><h4>${j.name}</h4><span>${j.definition.tipo}</span></div><p class="area-description">${j.definition.descricao}</p>
 ${generationDetails(j)}
 <div class="shelf-foot"><span>${format(workerCount(j.id))} cidadãos</span><strong>1 coleta por cidadão / ciclo</strong></div></section>
 </article>`).join('');
 fitLocationTitles();
}

const displays=Object.fromEntries(Object.keys(catalog.items).map(id=>[id,0]));
const activityTimers=new Map();
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
function flash(element,cls){element.classList.remove(cls);void element.offsetWidth;element.classList.add(cls);}
function floatText(parent,text,className){
 const node=document.createElement('span');node.className=className;node.textContent=text;node.setAttribute('aria-hidden','true');
 // Varia apenas a origem; a animação de subida mantém seu percurso habitual.
 if(className==='yield-label'){
  node.style.left=(35+Math.random()*30)+'%';
  node.style.top=(35+Math.random()*30)+'%';
 }else if(className==='stock-gain'){
  node.style.right=(Math.random()*24)+'px';
  node.style.top=(9+Math.random()*12)+'px';
 }
 parent.appendChild(node);setTimeout(()=>node.remove(),1400);
}
function proc(job,event){
 const item=catalog.items[event.itemId],amount=event.amount;
 const shelf=$('job-'+job.id),stock=$('stock-'+item.id);
 const id=progressId(job.id,'coleta');
 flash(shelf,'proc');
 $('activity-'+id).textContent=amount?'Coleta concluída':'Sem resultado';
 clearTimeout(activityTimers.get(id));
 activityTimers.set(id,setTimeout(()=>{$('activity-'+id).textContent=job.definition.atividade||'Gerando';activityTimers.delete(id);},850));
 if(!amount)return;
 floatText(shelf,'+'+format(amount)+' '+item.nome,'yield-label');
 if(!stock||stock.hidden||$('resources').hidden)return;
 const arrive=()=>{if(!stock.isConnected)return;flash(stock,'received');floatText(stock,'+'+format(amount),'stock-gain');};
 if(reducedMotion.matches){arrive();return;}
 const from=shelf.querySelector('.icon').getBoundingClientRect(),to=stock.querySelector('.resource-art').getBoundingClientRect();
 for(let i=0;i<4;i++){
  const particle=document.createElement('span');particle.className='resource-flight';if(i===0)particle.innerHTML=resourceIcon(item);else particle.textContent='◆';particle.setAttribute('aria-hidden','true');document.body.appendChild(particle);
  const x=from.left+from.width/2,y=from.top+from.height/2,dx=to.left+to.width/2-x,dy=to.top+to.height/2-y;
  particle.style.left=x+'px';particle.style.top=y+'px';
  const animation=particle.animate([{transform:'translate(-50%,-50%) scale(.4)',opacity:0},{transform:`translate(${dx*.25-20}px,${dy*.25-55}px) scale(1.1)`,opacity:1,offset:.35},{transform:`translate(${dx}px,${dy}px) scale(.35)`,opacity:.9}],{duration:650,delay:i*65,easing:'cubic-bezier(.25,.6,.35,1)',fill:'both'});
  animation.onfinish=()=>{particle.remove();if(i===0)arrive();};
 }
}
render();
let previous=performance.now();
function tick(now){
 const seconds=Math.max(0,(now-previous)/1000);previous=now;
 if(!activePlayer){requestAnimationFrame(tick);return;}
 const events=advanceGame(game,catalog,seconds);
 updateActions();
 if(Object.values(catalog.items).some(item=>(game.inventory[item.id]>0)!==!!$('stock-'+item.id)))renderResources();
 for(const event of events){
  const area=jobs.find(job=>job.id===event.areaId);if(area)proc(area,event);
 }
 for(const job of jobs){
   const id=progressId(job.id,'coleta'),fraction=collectionProgress(game,catalog,job.id);
   $('fill-'+id).style.transform=`scaleX(${fraction})`;
   $('progress-'+id).setAttribute('aria-valuenow',Math.round(fraction*100));
 }
 for(const item of Object.values(catalog.items)){
  const id=item.id;
  displays[id]+=(game.inventory[id]-displays[id])*Math.min(1,seconds*7);
  if(game.inventory[id]-displays[id]<.05)displays[id]=game.inventory[id];
  const total=$('total-'+id);if(total)total.textContent=format(displays[id]);
 }
 requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

// Barra de decks controlada por clique; permanece aberta durante a interação.
const drawer=$('population-drawer'),drawerToggle=$('drawer-toggle'),drawerContent=$('drawer-content');
let drawerOpen=false;
function setDrawer(open){
 drawerOpen=open;
 drawer.classList.toggle('is-open',open);
 document.body.classList.toggle('decks-open',open);
 drawerToggle.setAttribute('aria-expanded',String(open));
 const label=open?'Recolher decks e ações':'Abrir decks e ações';
 drawerToggle.setAttribute('aria-label',label);drawerToggle.title=label;
 drawerContent.inert=!open;
}
drawerToggle.addEventListener('click',()=>setDrawer(!drawerOpen));
const drawerTabs=[$('actions-tab'),$('decks-tab')];
function selectDrawerTab(tab){
 for(const entry of drawerTabs){
  const selected=entry===tab;
  entry.setAttribute('aria-selected',String(selected));entry.tabIndex=selected?0:-1;
  $(entry.getAttribute('aria-controls')).hidden=!selected;
 }
 drawer.querySelector('.drawer-heading h2').textContent=tab===$('actions-tab')?'Ações':'Seus decks';
}
for(const tab of drawerTabs){
 tab.addEventListener('click',()=>selectDrawerTab(tab));
 tab.addEventListener('keydown',event=>{
  let next;
  if(event.key==='ArrowRight'||event.key==='ArrowLeft')next=drawerTabs[1-drawerTabs.indexOf(tab)];
  if(event.key==='Home')next=drawerTabs[0];
  if(event.key==='End')next=drawerTabs[drawerTabs.length-1];
  if(next){event.preventDefault();selectDrawerTab(next);next.focus();}
 });
}

document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&drawerOpen){drawerToggle.focus();setDrawer(false);}
});

function openBundle(deck,open){
 deck.classList.toggle('bundle-open',open);
 deck.querySelector('[data-deck-toggle]').setAttribute('aria-expanded',String(open));
 deck.querySelector('[data-deck-bundles]').inert=!open;
}
document.addEventListener('pointerover',event=>{
 const deck=event.target.closest('[data-deck]');if(deck&&event.pointerType==='mouse'&&!deck.contains(event.relatedTarget))openBundle(deck,true);
});
document.addEventListener('pointerout',event=>{
 const deck=event.target.closest('[data-deck]');if(deck&&event.pointerType==='mouse'&&!activeDrag&&!deck.contains(event.relatedTarget)&&!deck.contains(document.activeElement))openBundle(deck,false);
});
document.addEventListener('focusout',event=>{
 const deck=event.target.closest('[data-deck]');if(deck&&!activeDrag&&!deck.contains(event.relatedTarget))openBundle(deck,false);
});
document.addEventListener('click',event=>{
 const toggle=event.target.closest('[data-deck-toggle]');if(toggle)openBundle(toggle.closest('[data-deck]'),toggle.getAttribute('aria-expanded')!=='true');
});
function renderBundle(){
 const openDecks=new Set([...document.querySelectorAll('[data-deck].bundle-open')].map(node=>node.dataset.deck));
 $('deck-count').textContent=`${Object.keys(catalog.decks).length} DECK(S)`;
 $('deck-list').innerHTML=Object.values(catalog.decks).map(deck=>{
  const open=openDecks.has(deck.id),bundles=Object.values(catalog.bundles).filter(bundle=>bundle.deckId===deck.id);
  return `<article class="population-deck ${open?'bundle-open':''}" data-deck="${deck.id}" aria-label="${deck.nome}"><button class="deck-preview" data-deck-toggle aria-expanded="${open}" aria-controls="bundles-${deck.id}"><span class="deck-stack" aria-hidden="true"><span class="deck-back back-two"></span><span class="deck-back back-one"></span><span class="deck-face"><span class="deck-corner rune-glyph">${deck.runa||'ᛟ'}</span>${deck.arte?`<img class="pixel-art deck-portrait" src="${deck.arte}" alt="" draggable="false">`:''}<span class="deck-bottom-rune rune-glyph">${deck.runa||'ᛟ'}</span></span></span><span class="deck-description"><span class="deck-type">DECK DE POPULAÇÃO</span><span class="deck-name">${deck.nome}</span></span></button><div class="deck-bundles" data-deck-bundles id="bundles-${deck.id}" ${open?'':'inert'}>${bundles.map(bundle=>{
   const ids=availableCitizens().filter(id=>game.citizens[id].bundleId===bundle.id&&game.citizens[id].deckId===deck.id),first=ids[0];
   return `<section class="population-bundle" aria-label="${bundle.nome}"><div class="bundle-heading"><h3>${bundle.nome}</h3><span>${ids.length} disponíveis</span></div><div class="bundle-cards">${ids.length?`<button class="commonner-card" data-citizen="${first}" data-source="idle" aria-label="${bundle.nome}, ${deck.nome}, selecionar para alocar" aria-pressed="${selectedCitizen===first}"><span class="commonner-id"><span class="rune-glyph">${deck.runa||'ᛟ'}</span><span class="bundle-card-count">×${format(ids.length)}</span></span><span class="commonner-portrait" aria-hidden="true">${citizenPortrait(first)}</span><span class="commonner-name">${bundle.cartaNome||bundle.nome}</span><span class="commonner-origin">${deck.nome}</span></button>`:'<span class="bundle-empty">Todos receberam uma área.</span>'}</div><small class="hand-hint">Arraste um<br><strong>Segure sobre o bundle</strong></small></section>`;
  }).join('')}</div></article>`;
 }).join('');
 updateHand();
}
function moveCitizens(id,source,destination,amount){
 if(!activePlayer||!moveEntities(game,catalog,id,source,destination,amount))return false;
 handSize=1;selectedCitizen=null;render();renderBundle();
 if(destination!=='idle')flash($('job-'+destination),'proc');
 $('assignment-status').textContent=destination==='idle'?`${format(amount)} cidadãos devolvidos aos seus bundles.`:`${format(amount)} cidadãos alocados em ${jobs.find(job=>job.id===destination).location}.`;
 persistGame();
 return true;
}
function assignCitizen(id,jobId,amount=handSize){return moveCitizens(id,'idle',jobId,amount);}
function clearDropTargets(){document.querySelectorAll('.drop-ready').forEach(node=>node.classList.remove('drop-ready'));}
function finishDrag(cancel=false){
 if(!activeDrag)return;const drag=activeDrag;clearTimeout(drag.holdTimer);activeDrag=null;
 drag.card.classList.remove('holding-citizens','hand-stack');
 drag.card.querySelectorAll('.hand-layer,.joining-card').forEach(node=>node.remove());
 drag.card.querySelector('.bundle-card-count').textContent='×'+format(similarCitizenIds(game,drag.id,drag.source).length);
 drag.ghost?.remove();drag.card.classList.remove('is-dragging');
 document.body.classList.remove('dragging-citizen','drawer-away');drawer.classList.remove('return-mode');$('return-zone').inert=true;clearDropTargets();
 if(drag.moved){
  suppressCitizenClick=true;setTimeout(()=>{suppressCitizenClick=false;},0);
  const destination=drag.returnTarget?'idle':drag.jobId;
  const moved=!cancel&&destination&&moveCitizens(drag.id,drag.source,destination,drag.amount);
  if(!moved){handSize=1;$('assignment-status').textContent='Cartas mantidas na origem.';}
  setDrawer(drag.drawerWasOpen);
 }else if(drag.longHold||cancel){
  handSize=1;selectedCitizen=null;suppressCitizenClick=true;setTimeout(()=>{suppressCitizenClick=false;},0);
  $('assignment-status').textContent='Cartas mantidas na origem.';
 }
}
document.addEventListener('pointerdown',event=>{
 const card=event.target.closest('[data-citizen]');if(!card||event.button!==0||activeDrag)return;
 handSize=1;
 activeDrag={id:Number(card.dataset.citizen),source:card.dataset.source||'idle',card,x:event.clientX,y:event.clientY,pointerId:event.pointerId,moved:false,amount:1,startedAt:performance.now(),drawerWasOpen:drawerOpen,pointerX:event.clientX,pointerY:event.clientY,pickupRect:card.getBoundingClientRect(),overSource:false};
 card.setPointerCapture(event.pointerId);
 if(activeDrag.source!=='idle'){drawer.classList.add('return-mode');$('return-zone').inert=false;const citizen=game.citizens[activeDrag.id];$('return-description').textContent='Solte as cartas aqui para voltarem a '+catalog.decks[citizen.deckId].nome;}
 syncGathering();
});
document.addEventListener('pointermove',event=>{
 const drag=activeDrag;if(!drag||drag.pointerId!==event.pointerId)return;
 drag.pointerX=event.clientX;drag.pointerY=event.clientY;syncGathering();
 if(!drag.moved&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>7){
  drag.card.classList.remove('holding-citizens');
  drag.moved=true;selectedCitizen=null;
  drag.ghost=drag.card.cloneNode(true);drag.ghost.removeAttribute('data-citizen');drag.ghost.removeAttribute('data-source');drag.ghost.className='commonner-card drag-ghost';drag.ghost.setAttribute('aria-hidden','true');drag.ghost.tabIndex=-1;
  document.body.appendChild(drag.ghost);drag.card.classList.add('is-dragging');document.body.classList.add('dragging-citizen');updateHand();
 }
 if(!drag.moved)return;
 drag.ghost.style.left=event.clientX+'px';drag.ghost.style.top=event.clientY+'px';
 clearDropTargets();const hit=document.elementFromPoint(event.clientX,event.clientY);
 const target=hit?.closest('[data-job]');
 drag.jobId=target?.dataset.job!==drag.source?target?.dataset.job||null:null;
 drag.returnTarget=drag.source!=='idle'&&!!hit?.closest('#return-zone');
 if(drag.jobId)target.classList.add('drop-ready');
 if(drag.returnTarget)$('return-zone').classList.add('drop-ready');
});
document.addEventListener('pointerup',event=>{if(activeDrag?.pointerId===event.pointerId)finishDrag();});
document.addEventListener('pointercancel',()=>finishDrag(true));
document.addEventListener('keydown',event=>{if(event.key==='Escape'){finishDrag(true);selectedCitizen=null;clearDropTargets();}});
document.addEventListener('click',event=>{
 if(suppressCitizenClick)return;
 const card=event.target.closest('[data-citizen]');
 if(card){
 if(card.dataset.source&&card.dataset.source!=='idle')return;
 selectedCitizen=Number(card.dataset.citizen);card.setAttribute('aria-pressed','true');$('assignment-status').textContent=`Escolha um ofício para ${handSize} ${handSize===1?'cidadão':'cidadãos'}.`;return;}
 const target=event.target.closest('[data-job]');if(target&&selectedCitizen!==null)assignCitizen(selectedCitizen,target.dataset.job);
});
document.addEventListener('keydown',event=>{
 const target=event.target.closest('[data-job]');
 if(target&&selectedCitizen!==null&&(event.key==='Enter'||event.key===' ')){event.preventDefault();assignCitizen(selectedCitizen,target.dataset.job);}
});
renderBundle();

function updateHand(){
 const available=availableForHand().length;
 handSize=available?Math.max(1,Math.min(handSize,available)):0;
 if(!activeDrag)return;
 activeDrag.amount=handSize;
 const card=activeDrag.ghost||activeDrag.card;
 card.querySelector('.bundle-card-count').textContent='×'+format(handSize);
 card.classList.toggle('hand-stack',handSize>1);
 card.dataset.handLabel=handSize+' '+(handSize===1?'cidadão':'cidadãos')+(activeDrag.overSource?' · juntando cartas…':activeDrag.source==='idle'?' · solte no ofício':' · solte em Devolver ou num ofício');
}
function syncGathering(){
 const drag=activeDrag;if(!drag)return;
 const rect=drag.pickupRect,padding=24;
 const over=drag.pointerX>=rect.left-padding&&drag.pointerX<=rect.right+padding&&drag.pointerY>=rect.top-padding&&drag.pointerY<=rect.bottom+padding;
 if(over===drag.overSource)return;
 drag.overSource=over;clearTimeout(drag.holdTimer);drag.holdTimer=null;
 if(over){drag.startedAt=performance.now();drag.holdTimer=setTimeout(gatherCitizens,300);}
 else{drag.card.classList.remove('holding-citizens');}
 updateHand();
}
function popGatheredCard(card){
 const layers=Math.min(handSize-1,5);
 let existing=card.querySelectorAll('.hand-layer').length;
 while(existing<layers){
  const layer=document.createElement('span');layer.className='hand-layer';layer.setAttribute('aria-hidden','true');existing++;
  layer.style.transform=`translate(${existing*3}px,${existing*2}px) rotate(${existing*1.3}deg)`;
  card.appendChild(layer);
 }
 if(reducedMotion.matches)return;
 const joining=document.createElement('span');joining.className='joining-card';joining.setAttribute('aria-hidden','true');card.appendChild(joining);
 const depth=Math.max(1,layers);
 const animation=joining.animate([
  {transform:'translate(-22px,22px) rotate(-14deg)',opacity:0},
  {transform:'translate(-9px,-7px) rotate(-5deg)',opacity:1,offset:.45},
  {transform:`translate(${depth*3}px,${depth*2}px) rotate(${depth*1.3}deg)`,opacity:1}
 ],{duration:260,easing:'cubic-bezier(.2,.8,.3,1)'});
 animation.onfinish=()=>joining.remove();
 card.animate([{scale:'1'},{scale:'1.075',offset:.4},{scale:'1'}],{duration:220,easing:'ease-out'});
}
function gatherCitizens(){
 const drag=activeDrag;if(!drag)return;drag.holdTimer=null;
 if(!drag.overSource||handSize>=availableForHand().length)return;
 drag.longHold=true;
 if(!drag.moved)drag.card.classList.add('holding-citizens');
 const heldFor=performance.now()-drag.startedAt;
 handSize+=heldFor>3500?10:heldFor>2200?5:heldFor>1200?2:1;
 updateHand();popGatheredCard(drag.ghost||drag.card);
 if(handSize<availableForHand().length)drag.holdTimer=setTimeout(gatherCitizens,180);
}
document.addEventListener('contextmenu',event=>{if(event.target.closest('[data-citizen]'))event.preventDefault();});

const sidebarToggle=$('sidebar-toggle');
sidebarToggle.addEventListener('click',()=>{
 const collapsed=sidebarToggle.getAttribute('aria-expanded')==='true';
 document.querySelector('main').classList.toggle('resources-collapsed',collapsed);
 $('resources').hidden=collapsed;
 sidebarToggle.setAttribute('aria-expanded',String(!collapsed));
 const label=collapsed?'Expandir recursos':'Recolher recursos';
 sidebarToggle.setAttribute('aria-label',label);sidebarToggle.title=label;
});

const detailsCloseTimers=new WeakMap();
function positionLocationDetails(location,point){
 const panel=location.querySelector('.location-details');
 const anchor=location.querySelector('.location-frame').getBoundingClientRect();
 const x=point?.clientX??anchor.right,y=point?.clientY??anchor.bottom;
 const margin=12,gap=16,width=panel.offsetWidth,height=panel.offsetHeight;
 const left=x+gap+width<=innerWidth-margin?x+gap:x-width-gap;
 const top=y+gap+height<=innerHeight-margin?y+gap:y-height-gap;
 panel.style.left=Math.max(margin,Math.min(left,innerWidth-width-margin))+'px';
 panel.style.top=Math.max(margin,Math.min(top,innerHeight-height-margin))+'px';
}
function showLocationDetails(location,open,point){
 clearTimeout(detailsCloseTimers.get(location));
 if(open){
  document.querySelectorAll('.location.details-open').forEach(other=>{
   if(other!==location)showLocationDetails(other,false);
  });
  positionLocationDetails(location,point);
 }
 location.classList.toggle('details-open',open);
 location.setAttribute('aria-expanded',String(open));
}
document.addEventListener('pointerover',event=>{
 if(event.pointerType!=='mouse'||activeDrag)return;
 const location=event.target.closest('.location');
 if(location){
  clearTimeout(detailsCloseTimers.get(location));
  if(!location.contains(event.relatedTarget))showLocationDetails(location,true,event);
 }
});
document.addEventListener('pointermove',event=>{
 if(event.pointerType!=='mouse'||activeDrag||event.target.closest('.location-details'))return;
 const location=event.target.closest('.location.details-open');
 if(location)positionLocationDetails(location,event);
});
document.addEventListener('pointerout',event=>{
 if(event.pointerType!=='mouse')return;
 const location=event.target.closest('.location');
 if(location&&!location.contains(event.relatedTarget)&&!location.contains(document.activeElement))detailsCloseTimers.set(location,setTimeout(()=>showLocationDetails(location,false),160));
});
document.addEventListener('focusin',event=>{const location=event.target.closest('.location');if(location&&!activeDrag&&event.target.matches(':focus-visible'))showLocationDetails(location,true);});
document.addEventListener('focusout',event=>{const location=event.target.closest('.location');if(location&&!location.contains(event.relatedTarget)&&!location.matches(':hover'))showLocationDetails(location,false);});
document.addEventListener('pointerdown',event=>{document.querySelectorAll('.location.details-open').forEach(location=>{if(!location.contains(event.target))showLocationDetails(location,false);});});
document.addEventListener('keydown',event=>{if(event.key==='Escape')document.querySelectorAll('.location.details-open').forEach(location=>showLocationDetails(location,false));});

window.addEventListener('resize',()=>document.querySelectorAll('.location.details-open').forEach(location=>positionLocationDetails(location)));
window.addEventListener('scroll',event=>{
 if(event.target instanceof Element&&event.target.closest('.location-details'))return;
 document.querySelectorAll('.location.details-open').forEach(location=>showLocationDetails(location,false));
},true);

function saveMessage(message,error=false){$('save-status').textContent=message;$('save-status').classList.toggle('save-error',error);}
function persistGame({keepalive=false}={}){
 if(!activePlayer||saveBlocked)return Promise.resolve(false);
 const player=activePlayer,snapshot=JSON.parse(JSON.stringify(game));
 saveQueue=saveQueue.catch(()=>false).then(async()=>{
  if(activePlayer!==player||saveBlocked)return false;
  saveMessage('Salvando…');
  try{
   const saved=await saveRequest('save',{name:player,state:snapshot,revision:saveRevision},{keepalive});
   saveRevision=saved.revision;
   saveMessage('Salvo às '+new Date(saved.savedAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}));
   return true;
  }catch(error){
   if(error.status===409)saveBlocked=true;
   saveMessage(error.message,true);return false;
  }
 });
 return saveQueue;
}
$('login-form').addEventListener('submit',async event=>{
 event.preventDefault();$('login-submit').disabled=true;$('login-error').textContent='';
 try{
  const result=await saveRequest('load',{name:$('player-name').value});
  const restored=result.state?restoreGame(catalog,result.state):createGame(catalog,initialSetup);
  // Uma partida nova só entra no jogo depois que o primeiro JSON foi gravado.
  const saved=result.state?result:await saveRequest('save',{name:result.name,state:restored,revision:0});
  for(const timer of activityTimers.values())clearTimeout(timer);activityTimers.clear();
  game=restored;activePlayer=saved.name;saveRevision=saved.revision;saveBlocked=false;saveQueue=Promise.resolve();
  selectedCitizen=null;handSize=1;$('resource-search').value='';
  for(const id of Object.keys(catalog.items))displays[id]=game.inventory[id];
  render();renderBundle();setDrawer(false);previous=performance.now();
  $('player-label').textContent=activePlayer;
  saveMessage(result.state?'Partida recuperada':'Nova história salva');
  $('login-screen').hidden=true;$('game-shell').hidden=false;$('game-shell').inert=false;document.body.dataset.session='playing';
  $('save-button').focus();
 }catch(error){$('login-error').textContent=error.message;}
 finally{$('login-submit').disabled=false;}
});
$('save-button').addEventListener('click',()=>persistGame());
$('logout-button').addEventListener('click',async()=>{
 if(!activePlayer)return;
 $('logout-button').disabled=true;
 if(activeDrag)finishDrag(true);
 const blocked=saveBlocked;
 if(!blocked&&!await persistGame()){$('logout-button').disabled=false;return;}
 activePlayer=null;
 for(const timer of activityTimers.values())clearTimeout(timer);activityTimers.clear();
 document.querySelectorAll('.resource-flight').forEach(node=>node.remove());
 $('game-shell').inert=true;$('game-shell').hidden=true;$('login-screen').hidden=false;document.body.dataset.session='login';
 $('login-error').textContent=blocked?'A partida mudou em outra aba. Entre novamente para recuperar a versão salva.':'';
 $('player-name').value='';$('player-name').focus();$('logout-button').disabled=false;
});
setInterval(()=>{if(activePlayer&&!saveBlocked)persistGame();},5000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')persistGame({keepalive:true});});
window.addEventListener('pagehide',()=>persistGame({keepalive:true}));
