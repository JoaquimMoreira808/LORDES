import {grassGlyph} from './ascii-grass.mjs?v=3';
// Saída textual: colunas controlam resolução; a fonte se ajusta ao painel.
export function createDenseAscii(container,source,{lightBackground=false,colorSource=null,imageSource=null,grassSource=null,grassMotion=()=>true}={}){
 const pre=document.createElement('pre');
 Object.assign(pre.style,{margin:'0',fontFamily:'monospace',fontWeight:'400',whiteSpace:'pre',letterSpacing:'0',lineHeight:'1',color:'#dce4e9',background:'#14171b',userSelect:'text'});
 container.replaceChildren(pre);
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
 let columns=100,brightness=1,contrast=1.4,last=0;
 let gradient='arrow',colorMode=colorSource?'people':'mono',saturation=1,colorGain=1.5;
 const arrow=' .›»→⇒➜';
 const ramp=' .`^",:;Il!i~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$';
 function render(time=performance.now()){
  if(time-last<100)return;last=time;
  const width=container.clientWidth,height=container.clientHeight;
  if(!width||!height||!source.width||!source.height)return;
  // Monospace advance measure avoids assumptions about browser/font metrics.
  ctx.font='100px monospace';const ratio=ctx.measureText('M').width/100;
  const fontSize=width/(columns*ratio),rows=Math.max(1,Math.floor(height/fontSize));
  pre.style.fontSize=fontSize+'px';
  canvas.width=columns*2;canvas.height=rows*4;
  ctx.drawImage(source,0,0,canvas.width,canvas.height);
  const {data}=ctx.getImageData(0,0,canvas.width,canvas.height);
  let text='';
  let mask=null,imageColors=null,grass=null;
  if(grassSource?.width&&grassSource?.height){ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(grassSource,0,0,canvas.width,canvas.height);grass=ctx.getImageData(0,0,canvas.width,canvas.height).data;}
  if(colorMode==='image'&&imageSource?.width&&imageSource?.height){ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(imageSource,0,0,canvas.width,canvas.height);imageColors=ctx.getImageData(0,0,canvas.width,canvas.height).data;}
  if(colorMode==='people'&&colorSource?.width&&colorSource?.height){ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(colorSource,0,0,canvas.width,canvas.height);mask=ctx.getImageData(0,0,canvas.width,canvas.height).data;}
  const segments=[];let run='',runColor='',runTransform='';
  function append(value,color='',transform=''){if(color!==runColor||transform||runTransform){if(run)segments.push([run,runColor,runTransform]);run='';runColor=color;runTransform=transform;}run+=value;}

  for(let y=0;y<rows;y++){
   for(let x=0;x<columns;x++){
    let luma=0;
    for(let dy=0;dy<4;dy++)for(let dx=0;dx<2;dx++){
     const p=((y*4+dy)*canvas.width+x*2+dx)*4;
     luma+=(.2126*data[p]+.7152*data[p+1]+.0722*data[p+2])/255;
    }
    luma/=8;
    let level=Math.max(0,Math.min(1,(luma*brightness-.5)*contrast+.5));
    if(lightBackground)level=1-level;
    const characters=gradient==='arrow'?arrow:ramp;
    let char=characters[Math.min(characters.length-1,Math.floor(level*(characters.length-1)))],color='',transform='';
    if(mask){
     let strongest=0;
     for(let dy=0;dy<4;dy++)for(let dx=0;dx<2;dx++){
      const p=((y*4+dy)*canvas.width+x*2+dx)*4;
      const intensity=Math.max(mask[p],mask[p+1],mask[p+2]);
      if(intensity>strongest&&intensity>60){strongest=intensity;color=`rgb(${mask[p]},${mask[p+1]},${mask[p+2]})`;}
     }
     if(color&&char===' ')char='›';
    }
    if(imageColors&&char!==' '){
     const rgb=[0,0,0];
     for(let dy=0;dy<4;dy++)for(let dx=0;dx<2;dx++){
      const p=((y*4+dy)*canvas.width+x*2+dx)*4;
      for(let channel=0;channel<3;channel++)rgb[channel]+=imageColors[p+channel]/8;
     }
     const gray=.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
     // Saturação muda apenas a cor; a escolha dos caracteres fica intacta.
     const saturated=rgb.map(value=>Math.max(0,gray+(value-gray)*saturation));
     // Ganho nas cores, independente do brilho/contraste da seleção de glifos.
     const peak=Math.max(...saturated,1);
     const scale=Math.min(255/peak,colorGain*Math.pow(255/peak,.25));
     color=`rgb(${saturated.map(value=>Math.round(Math.min(255,value*scale))).join(',')})`;
    }
    if(grass){
     let coverage=0;
     for(let dy=0;dy<4;dy++)for(let dx=0;dx<2;dx++){
      const p=((y*4+dy)*canvas.width+x*2+dx)*4;
      if(grass[p]>200&&grass[p+1]>200&&grass[p+2]>200)coverage++;
     }
     // Uma célula inteira de solo: preservar caminhos e silhuetas nas bordas.
     if(coverage===8){const blade=grassGlyph(x,y,time,grassMotion());char=blade?.char||' ';color=blade?.color||'';transform=blade?.transform||'';}
    }
    text+=char;append(char,color,transform);
   }
   text+='\n';append('\n');
  }
  if(run)segments.push([run,runColor,runTransform]);
  if(!mask&&!imageColors&&!grass){if(pre.textContent!==text||pre.childElementCount)pre.textContent=text;}
  else{
   const fragment=document.createDocumentFragment();
   for(const [value,color,transform] of segments){if(!color)fragment.append(document.createTextNode(value));else{const span=document.createElement('span');span.style.color=color;if(transform){span.style.display='inline-block';span.style.width='1ch';span.style.transformOrigin='50% 100%';span.style.transform=transform;span.style.pointerEvents='none';}span.textContent=value;fragment.append(span);}}
   pre.replaceChildren(fragment);
  }
 }
 return {render,set({cols,light,gain,preset,colors,sat,colorLight}={}){if(colorLight!==undefined)colorGain=colorLight;if(colors)colorMode=colors;if(sat!==undefined)saturation=sat;if(preset)gradient=preset;if(cols)columns=cols;if(light!==undefined)brightness=light;if(gain!==undefined)contrast=gain;last=0;},pre};
}
