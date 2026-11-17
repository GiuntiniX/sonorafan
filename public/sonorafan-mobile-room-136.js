/* SonoraFan v136 — dimensão visual real no Android e ajuda contextual.
   Nenhum dado de sala, favoritos, chat ou reprodução é duplicado/alterado. */
(() => {
  'use strict';
  const screen=document.getElementById('screen-room');
  if(!screen)return;
  const vv=window.visualViewport;
  let scheduled=false;
  const root=document.documentElement;

  function measure(){
    scheduled=false;
    const active=screen.classList.contains('active') &&
      window.matchMedia('(max-width: 768px)').matches;
    document.body.classList.toggle('sf137-mobile-room',active);
    if(!active){
      root.style.removeProperty('--sf137-viewport-height');
      screen.style.removeProperty('--sf136-mobile-vh');
      return;
    }
    // O visualViewport desconta as barras do Chrome Android; window.innerHeight
    // pode incluir espaço NÃO visível quando a barra de endereços está expandida.
    const available=Number(vv?.height)||window.innerHeight;
    const height=Math.max(250,Math.round(Math.min(window.innerHeight||available,available)));
    if(Number.isFinite(height)){
      root.style.setProperty('--sf137-viewport-height',height+'px');
      screen.style.setProperty('--sf136-mobile-vh',height+'px');
    }
  }
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(measure);
  }
  measure();
  new MutationObserver(schedule).observe(screen,{attributes:true,attributeFilter:['class']});
  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('orientationchange',schedule,{passive:true});
  window.addEventListener('pageshow',schedule,{passive:true});
  vv?.addEventListener('resize',schedule,{passive:true});
  vv?.addEventListener('scroll',schedule,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});

  // Diagnóstico não contém dados de usuário, músicas ou conversa.
  window.sf137MobileMetrics=()=>{
    const bounds=selector=>{
      const el=document.querySelector(selector);
      if(!el)return null;
      const r=el.getBoundingClientRect();
      return {top:Math.round(r.top),bottom:Math.round(r.bottom),height:Math.round(r.height),
        visible:getComputedStyle(el).display!=='none'};
    };
    return {
      version:'139.1',width:window.innerWidth,height:window.innerHeight,
      visualHeight:Math.round(Number(vv?.height)||0),
      configuredHeight:root.style.getPropertyValue('--sf137-viewport-height'),
      root:bounds('body'),screen:bounds('#screen-room'),
      header:bounds('#screen-room .header'),content:bounds('#roomLayout'),
      tabs:bounds('#mTabs'),tab:document.body.dataset.tab,
      active:screen.classList.contains('active')
    };
  };
  // Recalcula a área útil também ao focar campos inseridos dinamicamente
  // (chat, seleção de músicas e busca). Não interfere no controle de teclado v93.
  screen.addEventListener('focusin',event=>{
    if(event.target.matches('input,textarea,[contenteditable="true"]'))schedule();
  },{passive:true});
  screen.addEventListener('focusout',event=>{
    if(event.target.matches('input,textarea,[contenteditable="true"]'))schedule();
  },{passive:true});
})();
