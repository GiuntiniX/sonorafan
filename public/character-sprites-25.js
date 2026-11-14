/* SonoraFan 25 — sprites de quatro quadros e fallback vetorial personalizável.
   A base de personagens 24 é preservada; o editor e os eventos do servidor não mudam. */
(function(){
  'use strict';
  const base=window.SF24CharacterArt;
  if(!base || typeof base.render!=='function')return;
  const originals=base.render;
  const faces=['🎧','🎸','🎹','🎤','🪩','🔥','💜','🦊','🐼','😎','🌙','👾'];
  const validShirts=new Set(['violet','coral','mint','gold','blue','rose']);
  const validHairs=new Set(['short','wave','side','curly','long','spiky']);
  const validAccessories=new Set(['headphones','glasses','cap','none']);
  const defaultLook={shirt:'violet',hair:'short',accessory:'headphones'};
  let next=0;
  function clean(look){return {
    shirt: validShirts.has(look?.shirt)?look.shirt:defaultLook.shirt,
    hair: validHairs.has(look?.hair)?look.hair:defaultLook.hair,
    accessory: validAccessories.has(look?.accessory)?look.accessory:defaultLook.accessory
  }};
  const poses=[
    {body:'translate(0 0)',left:0,right:0,head:0,blink:false},
    {body:'translate(-2 1) rotate(-2 60 100)',left:-12,right:9,head:3,blink:false},
    {body:'translate(0 -9)',left:-33,right:33,head:0,blink:true},
    {body:'translate(2 1) rotate(2 60 100)',left:12,right:-12,head:-3,blink:false}
  ];
  function poseSvg(svg,i){
    const p=poses[i];
    // IDs in base.render are unique; never insert user text as raw SVG/HTML.
    let s=svg.replace(/(<g class="sf24-arm-left")/,`$1 transform="rotate(${p.left} 37 110)"`)
             .replace(/(<g class="sf24-arm-right")/,`$1 transform="rotate(${p.right} 83 110)"`)
             .replace(/(<g class="sf24-head")/,`$1 transform="rotate(${p.head} 60 94)"`);
    if(p.blink)s=s.replace(/(<g class="sf24-eyes")/, '$1 transform="translate(0 62) scale(1 .18) translate(0 -62)"');
    s=s.replace('</defs>',`</defs><g transform="${p.body}">`);
    return s.replace('</svg>','</g></svg>');
  }
  function render(face,look={},index){
    const i=Number.isInteger(index)&&index>=0?index:Math.max(0,faces.indexOf(face));
    const style=clean(look),file=String(i%12).padStart(2,'0');
    const isDefault=Object.keys(defaultLook).every(k=>defaultLook[k]===style[k]);
    if(isDefault){
      return `<span class="sf21-figure sf23-chibi sf24-illustrated sf25-avatar sf25-default" role="img" aria-label="Personagem animado" style="--sf25-sprite:url('/sprites-25/avatar-${file}.png')"><span class="sf25-frame"></span></span>`;
    }
    // A frame-based vector strip retains all editor combinations on any device,
    // even when an exact PNG variant was not pre-generated.
    const frames=poses.map((_,f)=>`<span class="sf25-vector-frame">${poseSvg(originals(face,style,i),f)}</span>`).join('');
    return `<span class="sf21-figure sf23-chibi sf24-illustrated sf25-avatar sf25-custom" role="img" aria-label="Personagem animado personalizado"><span class="sf25-vector-clip"><span class="sf25-vector-strip">${frames}</span></span></span>`;
  }
  window.SF24CharacterArt=Object.freeze({render});
  window.SF25CharacterSprites=Object.freeze({version:'25.0',frames:4,art:'png atlas + vector custom'});
})();
