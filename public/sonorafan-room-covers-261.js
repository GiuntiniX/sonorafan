/* SonoraFan 261 — fonte única de capa nas listagens de salas. */
(()=>{
 'use strict';
 const themes={"geral":"/themes/final-172/indie-thumb.webp","indie":"/themes/final-164/indie-thumb.webp","metal":"/themes/final-164/metal-thumb.webp","emo":"/themes/final-164/emo-thumb.webp","mpb":"/themes/final-164/mpb-thumb.webp","eletronica":"/themes/final-164/eletronica-thumb.webp","rock":"/themes/final-164/rock-thumb.webp","pop":"/themes/final-164/pop-thumb.webp","rap":"/themes/final-171/rap-thumb.webp","funk":"/themes/final-169/funk-thumb.webp","pagode":"/themes/final-170/pagode-thumb.webp","sertanejo":"/themes/hd-175/sonorafan-sertanejo-thumb.webp","reggae":"/themes/final-170/reggae-thumb.webp","jazz":"/themes/final-170/jazz-thumb.webp","forro":"/themes/final-170/forro-thumb.webp","bts":"/themes/festival-214/bts.svg","kpop":"/themes/festival-214/kpop.svg","jpop":"/themes/festival-214/jpop.svg","trap":"/themes/festival-214/trap.svg","lofi":"/themes/festival-214/lofi.svg","cor-preto":"/themes/colors-214/cor-preto.svg","cor-vermelho":"/themes/colors-214/cor-vermelho.svg","cor-azul":"/themes/colors-214/cor-azul.svg","cor-verde":"/themes/colors-214/cor-verde.svg","cor-roxo":"/themes/colors-214/cor-roxo.svg","cor-rosa":"/themes/colors-214/cor-rosa.svg","cor-dourado":"/themes/colors-214/cor-dourado.svg","kpop-sakura-arena":"/themes/hd-220/kpop-sakura-arena.webp","bts-purple-monument":"/themes/hd-220/bts-purple-monument.webp","jpop-tokyo-night":"/themes/hd-220/jpop-tokyo-night.webp","trap-crown-stage":"/themes/hd-220/trap-crown-stage.webp","lofi-golden-listening":"/themes/hd-220/lofi-golden-listening.webp","lofi-moonlight-live":"/themes/hd-220/lofi-moonlight-live.webp","kpop-cherry-city":"/themes/hd-220/kpop-cherry-city.webp","bts-lights-festival":"/themes/hd-220/bts-lights-festival.webp","jpop-fuji-stage":"/themes/hd-220/jpop-fuji-stage.webp","trap-street-crown":"/themes/hd-220/trap-street-crown.webp","lofi-riverside":"/themes/hd-220/lofi-riverside.webp","lofi-acoustic-garden":"/themes/renovados-219/lofi-acoustic-garden.webp"};
 const defaultArt=themes.geral||'/themes/final-172/indie-thumb.webp';
 function cover(room){
  const r=room||{};
  let custom='';
  if(typeof r.coverUrl==='string'){
   try{const url=new URL(r.coverUrl);if(url.protocol==='https:'&&!url.username&&!url.password)custom=url.href;}catch(_){}
  }
  const theme=themes[String(r.roomTheme||'geral')]||defaultArt;
  return {src:custom||theme,fallback:theme,art:defaultArt,custom:!!custom};
 }
 function frame(r){
  const clamp=(value,defaultValue,min,max)=>value===null||value===undefined||value===''?defaultValue:Math.min(max,Math.max(min,Number(value)||defaultValue));
  return {x:clamp(r?.coverX,50,0,100),y:clamp(r?.coverY,50,0,100),zoom:clamp(r?.coverZoom,1,1,2)};
 }
 window.sf261RoomCover=cover;
 window.sf261RoomCoverFrame=frame;
})();
