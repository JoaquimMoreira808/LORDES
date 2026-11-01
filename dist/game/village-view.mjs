// Apresentação apenas: desenha formas simples e converte a luminosidade em ASCII.
// Nenhuma posição ou animação é persistida no estado da partida.
export function createVillageView(output){
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 let areas=[],population=0,paused=false,last=0;
 const ramp=' .,:;irsXA253hMHGS#9B&@';
 function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
 function tree(x,y){
  rect(x-1,y,2,9,'#797979');
  ctx.fillStyle='#a0a0a0';ctx.beginPath();ctx.moveTo(x,y-13);ctx.lineTo(x-7,y+3);ctx.lineTo(x+7,y+3);ctx.fill();
 }
 function house(x,y){
  rect(x-9,y-4,18,13,'#868686');
  ctx.fillStyle='#c5c5c5';ctx.beginPath();ctx.moveTo(x-12,y-4);ctx.lineTo(x,y-15);ctx.lineTo(x+12,y-4);ctx.fill();
  rect(x-2,y+1,4,8,'#151515');rect(x+4,y-1,3,3,'#e3e3e3');
 }
 function draw(time){
  requestAnimationFrame(draw);
  if(time-last<125||document.hidden||!output.getClientRects().length)return;
  last=time;
  const width=Math.max(30,Math.min(150,Math.floor(output.parentElement.clientWidth/7)));
  const height=Math.max(24,Math.min(55,Math.floor(output.parentElement.clientHeight/12)));
  canvas.width=width*2;canvas.height=height*3;
  const w=canvas.width,h=canvas.height;
  ctx.fillStyle='#080808';ctx.fillRect(0,0,w,h);
  // Mais locais ampliam a extensão da vila; todos continuam representados.
  const cols=Math.max(2,Math.ceil(Math.sqrt(areas.length))),rows=Math.max(1,Math.ceil(areas.length/cols));
  const scale=Math.min(1,(w-28)/(cols*40),(h-28)/(rows*38));
  ctx.save();ctx.translate(w/2,h/2);ctx.scale(scale,scale);
  const left=-cols*20,top=-rows*19;
  ctx.strokeStyle='#444';ctx.lineWidth=3;ctx.beginPath();
  for(let row=0;row<rows;row++){const y=top+row*38+29;ctx.moveTo(left+10,y);ctx.lineTo(left+cols*40-10,y);}
  ctx.moveTo(0,top+29);ctx.lineTo(0,top+(rows-1)*38+29);ctx.stroke();
  areas.forEach((area,index)=>{
   const x=left+(index%cols)*40+20,y=top+Math.floor(index/cols)*38+14;
   if(area.definitionId==='floresta-carvalho'){tree(x-9,y);tree(x+8,y-4);tree(x,y+4);}
   else if(area.definitionId==='pedreira-granito'){
    ctx.fillStyle='#999';ctx.beginPath();ctx.moveTo(x-13,y+9);ctx.lineTo(x-8,y-8);ctx.lineTo(x+3,y-12);ctx.lineTo(x+13,y+8);ctx.fill();rect(x-3,y+1,7,8,'#252525');
   }else if(area.definitionId==='campos-trigo'){
    for(let a=-10;a<=10;a+=5)for(let b=-7;b<=8;b+=5){rect(x+a,y+b,1,4,'#c0c0c0');rect(x+a-1,y+b,3,1,'#888');}
   }else if(area.definitionId==='pomar-macas'){tree(x-7,y);tree(x+7,y);rect(x-9,y-3,2,2,'#fff');rect(x+8,y-4,2,2,'#fff');}
   else house(x,y);
  });
  const t=motion.matches||paused?0:time/1000;
  for(let i=0;i<Math.min(population,50);i++){
   const row=i%rows,span=cols*40-20,phase=(i*.618+t*.035)%1;
   const x=left+10+(i%2?1-phase:phase)*span,y=top+row*38+27+(i%3)*3;
   rect(x,y-4,2,2,'#eee');rect(x,y-1,2,3,'#aaa');
   const step=Math.floor(t*4+i)%2;rect(x-step,y+2,1,2,'#ddd');rect(x+1+step,y+2,1,2,'#ddd');
  }
  ctx.restore();
  const data=ctx.getImageData(0,0,w,h).data;
  let result='';
  for(let y=0;y<height;y++){
   for(let x=0;x<width;x++){
    let brightness=0;
    for(let dy=0;dy<3;dy++)for(let dx=0;dx<2;dx++)brightness+=data[((y*3+dy)*w+x*2+dx)*4];
    result+=ramp[Math.floor(brightness/(6*255)*(ramp.length-1))];
   }
   result+='\n';
  }
  if(output.textContent!==result)output.textContent=result;
 }
 requestAnimationFrame(draw);
 return {update(game){areas=Object.values(game.areas);population=Object.keys(game.citizens).length;paused=game.paused;}};
}
