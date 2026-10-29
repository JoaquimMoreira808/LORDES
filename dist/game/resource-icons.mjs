// Iconify / Game Icons: imagens remotas, rasterizadas e guardadas só na memória.
const searchNames = {
 'fibra-vegetal':'plant roots', 'frutas-silvestres':'berries',
 'sementes-silvestres':'seeds', 'semente-maca':'apple seeds',
 'cascalho':'stone pile', granito:'rock', 'minerio-ferro':'ore',
 'folhas-secas':'leaf', bolota:'acorn', 'cogumelo-silvestre':'mushroom',
 resina:'amber', 'erva-medicinal':'herbs', 'musgo-prateado':'moss',
 'trufa-negra':'mushroom', ambar:'amber', 'semente-ancestral':'seed',
 argila:'clay', 'areia-mineral':'sand', calcario:'stone', quartzo:'crystal',
 mica:'mineral', ametista:'crystal', 'pepita-ouro':'gold nugget',
 diamante:'diamond', carvalho:'wood', maca:'apple', trigo:'wheat'
};
const cache = new Map();
const placeholder = '<span aria-hidden="true">◆</span>';
const escapeAttribute = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function resourceIcon(item) {
 return `<span class="resource-icon" data-resource-icon="${escapeAttribute(item.id)}">${item.arte?`<img class="pixel-art resource-pixel" src="${escapeAttribute(item.arte)}" alt="" draggable="false">`:placeholder}</span>`;
}

export async function loadResourceIcon(item) {
 if (!cache.has(item.id)) cache.set(item.id, fetchIcon(item).catch(() => null));
 return cache.get(item.id);
}

async function fetchIcon(item) {
 const query = searchNames[item.id] || item.nome;
 const response = await fetch(`https://api.iconify.design/search?${new URLSearchParams({query,prefix:'game-icons',limit:'1'})}`, {signal:AbortSignal.timeout(8000)});
 if (!response.ok) throw new Error('Busca de ícone indisponível');
 const result = await response.json(), icon = result.icons?.[0];
 if (!/^game-icons:[a-z0-9-]+$/.test(icon || '')) return null;
 const [prefix, name] = icon.split(':');
 const url = `https://api.iconify.design/${prefix}/${name}.svg?${new URLSearchParams({color:item.cor || '#c3cbb9',width:'64',height:'64'})}`;
 const svgResponse = await fetch(url, {signal:AbortSignal.timeout(8000)});
 if (!svgResponse.ok) throw new Error('Imagem indisponível');
 const objectUrl = URL.createObjectURL(await svgResponse.blob());
 try {
  const image = new Image();
  image.src = objectUrl;
  await image.decode();
  const canvas = document.createElement('canvas');canvas.width=canvas.height=24;
  const context = canvas.getContext('2d');
  context.imageSmoothingEnabled=false;
  context.drawImage(image,0,0,24,24);
  const pixels=context.getImageData(0,0,24,24);
  // Paleta RGB 3-3-2: no máximo 256 cores, mantendo a transparência.
  for(let i=0;i<pixels.data.length;i+=4){
   pixels.data[i]=Math.round(pixels.data[i]/255*7)*255/7;
   pixels.data[i+1]=Math.round(pixels.data[i+1]/255*7)*255/7;
   pixels.data[i+2]=Math.round(pixels.data[i+2]/255*3)*255/3;
   pixels.data[i+3]=pixels.data[i+3]>=128?255:0;
  }
  context.putImageData(pixels,0,0);
  return canvas.toDataURL('image/png');
 } finally { URL.revokeObjectURL(objectUrl); }
}

export function observeResourceIcons(catalog, root=document.body) {
 const seen = new WeakSet();
 function hydrate(container){
  const nodes=[...(container.matches?.('[data-resource-icon]')?[container]:[]),...container.querySelectorAll('[data-resource-icon]')];
  for(const node of nodes){
   if(seen.has(node))continue;seen.add(node);
   const item=catalog.items[node.dataset.resourceIcon];if(!item)continue;
   loadResourceIcon(item).then(url=>{
    if(!url||!node.isConnected)return;
    const image=new Image();image.className='pixel-art resource-pixel';image.alt='';image.draggable=false;image.src=url;
    node.replaceChildren(image);
   });
  }
 }
 hydrate(root);
 const observer=new MutationObserver(records=>{
  for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1)hydrate(node);
 });
 observer.observe(root,{childList:true,subtree:true});
 return observer;
}
