/* SonoraFan 54.0 — ajuste progressivo de altura da playlist, sem modificar renderQueue. */
(()=>{
  'use strict';
  let raf=0;
  function updateQueueViewport(){
    const list=document.getElementById('queueList');
    if(!list)return;
    const items=Array.from(list.querySelectorAll('.queue-item')).slice(0,3);
    const st=getComputedStyle(list);
    const pad=(parseFloat(st.paddingTop)||0)+(parseFloat(st.paddingBottom)||0);
    let needed;
    if(items.length){
      const first=items[0].getBoundingClientRect();
      const last=items[items.length-1].getBoundingClientRect();
      needed=Math.ceil(last.bottom-first.top+pad+2);
    }else{
      const empty=list.querySelector('.empty-state-mini');
      needed=Math.ceil((empty?.getBoundingClientRect().height||130)+pad+2);
    }
    // A medida mínima evita corte por arredondamento do navegador.
    const pixels=Math.max(68,Math.min(1200,needed));
    list.style.setProperty('--sf54-queue-height',`${pixels}px`);
  }
  function schedule(){
    cancelAnimationFrame(raf);
    raf=requestAnimationFrame(()=>{raf=0;updateQueueViewport()});
  }
  function init(){
    const list=document.getElementById('queueList');
    if(!list)return;
    const observer=new MutationObserver(schedule);
    observer.observe(list,{childList:true,subtree:true,characterData:true});
    window.addEventListener('resize',schedule,{passive:true});
    if(typeof ResizeObserver!=='undefined'){
      const rows=new ResizeObserver(schedule);
      // Observa somente o painel: a lista recebe seu tamanho calculado sem loop.
      const queueHeader=list.closest('.queue-column')?.querySelector('.queue-header');
      if(queueHeader)rows.observe(queueHeader);
    }
    // O feedback da votação tem aria-live; após leitura, não precisa ocupar altura para sempre.
    const status=document.getElementById('sf52VoteStatus');
    if(status){
      let timeout;
      new MutationObserver(()=>{
        if(!status.textContent.trim())return;
        clearTimeout(timeout);
        timeout=setTimeout(()=>{status.textContent='';schedule()},5000);
      }).observe(status,{childList:true,characterData:true,subtree:true});
    }
    schedule();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
