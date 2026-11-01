// Clareiras e tufos estáveis; vento com defasagem individual, sem fileiras sincronizadas.
function hash(x,y){let n=Math.imul(x+71,374761393)^Math.imul(y+193,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
export function grassGlyph(x,y,time,moving=true){
 const h=hash(x,y),patch=(Math.sin(x*.13+Math.sin(y*.09)*2)+Math.cos(y*.17-x*.04))*.5;
 const density=.53+patch*.21;
 if(h>density)return null;
 const variation=hash(x+350,y-80),phase=x*.075+y*.055+variation*1.8;
 const t=moving?time*.00085:0;
 const wind=Math.sin(phase-t)+.28*Math.sin(x*.04+y*.08-t*1.7);
 const tilt=(variation-.5)*24+wind*13;
 const height=1.15+hash(x-120,y+490)*1.05;
 return {
  char:variation<.16?'i':variation>.77?'/':'l',
  color:['#365c49','#42785b','#50896a','#619879','#396b57'][Math.floor(hash(x+20,y+30)*5)%5],
  transform:`translate(${((h-.25)*.3).toFixed(2)}em,${(-variation*.18).toFixed(2)}em) rotate(${tilt.toFixed(1)}deg) scaleY(${height.toFixed(2)})`
 };
}
