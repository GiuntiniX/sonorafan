/* SonoraFan v136 — dimensão visual real no Android e ajuda contextual.
   Nenhum dado de sala, favoritos, chat ou reprodução é duplicado/alterado. */
(() => {
  'use strict';
  const screen=document.getElementById('screen-room');
  if(!screen)return;
  const vv=window.visualViewport;
  let scheduled=false;

  function measure(){
    scheduled=false;
    if(!window.matchMedia('(max-width: 768px)').matches){
      screen.style.removeProperty('--sf136-mobile-vh');
      return;
    }
    const visual=Number(vv?.height)||window.innerHeight;
    const height=Math.max(280,Math.round(Math.min(window.innerHeight||visual,visual)));
    if(Number.isFinite(height))screen.style.setProperty('--sf136-mobile-vh',height+'px');
  }
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(measure);
  }
  measure();
  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('orientationchange',schedule,{passive:true});
  window.addEventListener('pageshow',schedule,{passive:true});
  vv?.addEventListener('resize',schedule,{passive:true});
  vv?.addEventListener('scroll',schedule,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});

  const welcome=document.getElementById('sf136MobileWelcome');
  const count=document.getElementById('queueCount');
  const title=document.getElementById('premiumMiniTitle');
  if(!welcome||!count)return;
  function syncWelcome(){
    const numeric=Number.parseInt(count.textContent?.trim()||'0',10);
    const songTitle=String(title?.textContent||'').trim();
    const empty=(Number.isNaN(numeric)||numeric===0) &&
      (!songTitle||/nenhuma m[uú]sica|aguardando|escolha uma/i.test(songTitle));
    welcome.hidden=!empty;
  }
  new MutationObserver(syncWelcome).observe(count,{childList:true,subtree:true,characterData:true});
  if(title)new MutationObserver(syncWelcome).observe(title,{childList:true,subtree:true,characterData:true});
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
  // Em aparelhos reais, o teclado pode alterar visualViewport depois do focus.
  document.getElementById('chatInput')?.addEventListener('focus',schedule,{passive:true});
  document.getElementById('chatInput')?.addEventListener('blur',schedule,{passive:true});
})();
