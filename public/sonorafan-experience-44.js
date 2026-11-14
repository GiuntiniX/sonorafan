/* SonoraFan 44.0 — small, accessible visual enhancements. No backend or playback overrides. */
(function(){
  'use strict';
  const $ = (id) => document.getElementById(id);
  function setupBackToTop(){
    const btn = $('sf44LobbyTop');
    if(!btn) return;
    btn.addEventListener('click', () => {
      const media = matchMedia('(max-width: 1080px)').matches;
      const target = document.querySelector(media ? '#screen-lobby>.sf28-lobby-app' : '#screen-lobby .sf28-lobby-main');
      if(target?.scrollTo) target.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});
    });
  }
  function setupScrollReveal(){
    const targets = document.querySelectorAll('#landingScreen .sf44-reveal');
    if(!targets.length) return;
    if(!('IntersectionObserver' in window)) {
      targets.forEach(el=>el.classList.add('sf44-in-view'));
      return;
    }
    const io = new IntersectionObserver(entries => {
      for(const entry of entries) {
        if(entry.isIntersecting){
          entry.target.classList.add('sf44-in-view');
          io.unobserve(entry.target);
        }
      }
    },{ threshold:.16,root:$('landingScreen'),rootMargin:'0px 0px -10px 0px' });
    targets.forEach(el=>io.observe(el));
  }
  function setupRoomVisualState(){
    const room = $('screen-room');
    const title = $('trackTitle');
    const list = $('queueList');
    if(!room || !title) return;
    const check=()=> {
      // Only modify presentation. The actual queue and player continue to use existing code.
      const populated = !!list?.querySelector('.queue-item') || (title.textContent && !/^(fila vazia|nenhuma música)/i.test(title.textContent.trim()));
      room.classList.toggle('sf44-has-music', Boolean(populated));
      const idle = $('sf44QueueIdle');
      if(idle) idle.hidden = Boolean(populated);
    };
    if('MutationObserver' in window){
      const mo=new MutationObserver(check);
      mo.observe(title,{subtree:true,characterData:true,childList:true});
      if(list) mo.observe(list,{childList:true,subtree:false});
    }
    check();
  }
  function setupLandingParallax(){
    // A small decorative shift on desktop, only while the page is visible.
    const root=$('landingScreen');
    const scene=root?.querySelector('.sf44-festival-art img');
    if(!root||!scene||matchMedia('(prefers-reduced-motion:reduce)').matches||matchMedia('(max-width:900px)').matches) return;
    let ticking=false;
    root.addEventListener('scroll',()=>{
      if(ticking)return;
      ticking=true;
      requestAnimationFrame(()=>{
        const r=scene.getBoundingClientRect();
        if(r.bottom>0 && r.top<innerHeight) {
          const move=Math.max(-9,Math.min(9,(r.top/Math.max(innerHeight,1))*8));
          scene.style.translate='0 '+move.toFixed(1)+'px';
        }
        ticking=false;
      });
    },{passive:true});
  }
  function init(){ setupBackToTop(); setupScrollReveal(); setupRoomVisualState(); setupLandingParallax(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
