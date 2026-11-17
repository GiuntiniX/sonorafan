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

  const welcome=document.getElementById('sf136MobileWelcome');
  const count=document.getElementById('queueCount');
  if(!welcome||!count)return;
  function syncWelcome(){
    const numeric=Number.parseInt(count.textContent?.trim()||'0',10);
    // 0 músicas na fila é suficiente para oferecer uma ação de descoberta;
    // o título do mini-player pode continuar mostrando a faixa anterior.
    const empty=!Number.isNaN(numeric)&&numeric===0;
    welcome.hidden=!empty;
  }
  new MutationObserver(syncWelcome).observe(count,{childList:true,subtree:true,characterData:true});
  syncWelcome();
  welcome.querySelector('[data-sf136="music"]')?.addEventListener('click',()=>{
    if(typeof window.sf76OpenMusic==='function')window.sf76OpenMusic('search');
    else window.sf34FindSong?.();
  });
  welcome.querySelector('[data-sf136="chat"]')?.addEventListener('click',()=>{
    if(typeof window.setTab==='function')window.setTab('chat');
    else document.querySelector('#mTabs [data-t="chat"]')?.click();
    document.getElementById('roomLayout')?.scrollTo({top:0,behavior:'instant'});
  });
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
      version:'137.1',width:window.innerWidth,height:window.innerHeight,
      visualHeight:Math.round(Number(vv?.height)||0),
      configuredHeight:root.style.getPropertyValue('--sf137-viewport-height'),
      root:bounds('body'),screen:bounds('#screen-room'),
      header:bounds('#screen-room .header'),content:bounds('#roomLayout'),
      tabs:bounds('#mTabs'),tab:document.body.dataset.tab,
      active:screen.classList.contains('active')
    };
  };
  // Em aparelhos reais, o teclado pode alterar visualViewport depois do focus.
  document.getElementById('chatInput')?.addEventListener('focus',schedule,{passive:true});
  document.getElementById('chatInput')?.addEventListener('blur',schedule,{passive:true});
})();
