const jobs = [
 {id:'farm',name:'Agricultores',resource:'Comida',icon:'🌾',color:'#89934d',tint:'#edf0d9'},
 {id:'wood',name:'Lenhadores',resource:'Madeira',icon:'🪵',color:'#9a774e',tint:'#f0e6d8'},
 {id:'mine',name:'Mineradores',resource:'Minério',icon:'⛏️',color:'#7b8590',tint:'#e6eaed'},
 {id:'fruit',name:'Coletores',resource:'Frutas',icon:'🍎',color:'#ab705d',tint:'#f2e4dd'}
];
const groups=[{id:'idle',name:'Ociosos'},...jobs];
const state={counts:{idle:100,farm:0,wood:0,mine:0,fruit:0},resources:{farm:0,wood:0,mine:0,fruit:0},paused:false};
const format=n=>Math.floor(n).toLocaleString('pt-BR');
const $=id=>document.getElementById(id);
for(const id of ['from','to']) $(id).innerHTML=groups.map(g=>`<option value="${g.id}">${g.name}</option>`).join('');
$('to').value='farm';
function cards(id){const n=state.counts[id],limit=id==='idle'?6:3;return n?Array.from({length:Math.min(n,limit)},(_,i)=>`<div class="card" draggable="true" data-source="${id}" title="Arraste para transferir um cidadão" aria-label="Cidadão ${i+1}, arraste para outra estante"><span class="number">♧ ${String(i+1).padStart(2,'0')}</span><span class="portrait">${['👨🏻‍🌾','👩🏽‍🌾','👨🏽‍🌾','👩🏻‍🌾'][i%4]}</span><small>CIDADÃO</small></div>`).join('')+(n>limit?`<span class="more">+${format(n-limit)}</span>`:''):'<div class="empty">Solte cidadãos aqui</div>'}
function renderResources(){ $('resources').innerHTML=jobs.map(j=>`<div class="resource"><span class="icon">${j.icon}</span><div><label>${j.resource}</label><strong>${format(state.resources[j.id])}</strong><small>+${format(state.paused?0:state.counts[j.id])} / s</small></div></div>`).join(''); }
function render(){renderResources();$('shelves').innerHTML=jobs.map(j=>`<article class="shelf" data-drop="${j.id}" style="--accent:${j.color};--tint:${j.tint}"><div class="shelf-head"><span class="icon">${j.icon}</span><div><h3>${j.name}</h3><small>${j.resource.toLowerCase()} para a aldeia</small></div><span class="count">${format(state.counts[j.id])}</span></div><div class="cards">${cards(j.id)}</div><div class="shelf-foot"><span>${format(state.counts[j.id])} cidadãos</span><strong>+${format(state.paused?0:state.counts[j.id])} / s</strong></div></article>`).join('');$('idle').dataset.drop='idle';$('idle').innerHTML=`<div class="idle-text"><h3>À espera de um ofício</h3><p>Seu próximo capítulo começa aqui.</p></div><div class="cards">${cards('idle')}</div><div class="idle-count">${format(state.counts.idle)} <span style="font:11px DM Sans,sans-serif;color:var(--muted)">ociosos</span></div>`;}
function move(from,to,amount){if(from===to){$('feedback').textContent='Escolha um destino diferente da origem.';return;}const count=amount==='all'?state.counts[from]:Number(amount);if(!Number.isSafeInteger(count)||count<1){$('feedback').textContent='Informe uma quantidade inteira maior que zero.';return;}if(count>state.counts[from]){$('feedback').textContent=`Há apenas ${format(state.counts[from])} cidadãos em ${groups.find(g=>g.id===from).name}.`;return;}state.counts[from]-=count;state.counts[to]+=count;render();$('feedback').textContent=`${format(count)} ${count===1?'cidadão transferido':'cidadãos transferidos'} para ${groups.find(g=>g.id===to).name}.`;}
$('transfer').addEventListener('click',()=>move($('from').value,$('to').value,$('amount').value));
document.querySelectorAll('[data-amount]').forEach(b=>b.addEventListener('click',()=>{$('amount').value=b.dataset.amount==='all'?state.counts[$('from').value]:b.dataset.amount;}));
$('pause').addEventListener('click',()=>{state.paused=!state.paused;$('pause').textContent=state.paused?'▶':'Ⅱ';$('pause').setAttribute('aria-label',state.paused?'Retomar produção':'Pausar produção');document.querySelector('.status').firstChild.textContent='';$('feedback').textContent=state.paused?'Produção pausada.':'Produção retomada.';render();});
let source=null;
document.addEventListener('dragstart',e=>{const card=e.target.closest('[data-source]');if(!card)return;source=card.dataset.source;e.dataTransfer.setData('text/plain',source);e.dataTransfer.effectAllowed='move';});
document.addEventListener('dragover',e=>{const target=e.target.closest('[data-drop]');if(target){e.preventDefault();e.dataTransfer.dropEffect='move';target.classList.add('drag-over');}});
document.addEventListener('dragleave',e=>{const target=e.target.closest('[data-drop]');if(target&&!target.contains(e.relatedTarget))target.classList.remove('drag-over');});
document.addEventListener('dragend',()=>{source=null;document.querySelectorAll('.drag-over').forEach(e=>e.classList.remove('drag-over'));});
document.addEventListener('drop',e=>{const target=e.target.closest('[data-drop]');if(!target)return;e.preventDefault();const from=e.dataTransfer.getData('text/plain');if(source&&groups.some(g=>g.id===from))move(from,target.dataset.drop,1);target.classList.remove('drag-over');});
let previous=performance.now();setInterval(()=>{const now=performance.now(),seconds=(now-previous)/1000;previous=now;if(!state.paused){for(const j of jobs)state.resources[j.id]+=state.counts[j.id]*seconds;renderResources();}},200);
render();
