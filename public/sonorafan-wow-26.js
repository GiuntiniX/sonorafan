
/* SonoraFan 26.0 — polimento visual da landing/login e limpeza da sala */
(function(){
  'use strict';
  const songs=[
    {title:'Blinding Lights', artist:'The Weeknd · Sala do Gui'},
    {title:'Levitating', artist:'Dua Lipa · Pop Party'},
    {title:'In The End', artist:'Linkin Park · Rock Arena'},
    {title:'Starboy', artist:'The Weeknd · Midnight Pulse'}
  ];
  let idx=0;
  function swapHeroTrack(){
    const title=document.querySelector('.np-title');
    const artist=document.querySelector('.np-artist');
    const fill=document.querySelector('.np-progress-fill');
    if(!title||!artist||!fill)return;
    idx=(idx+1)%songs.length;
    title.textContent=songs[idx].title;
    artist.textContent=songs[idx].artist;
    fill.style.width=(35+(idx*17))+'%';
  }
  function countUp(){
    document.querySelectorAll('.stats-band .stat strong').forEach((el)=>{
      if(el.dataset.sf26Done) return;
      const text=(el.textContent||'').trim();
      const numeric=parseFloat(text.replace(/[^
\d.]/g,''));
      if(!numeric) return;
      const suffix=text.replace(/[\d.]/g,'');
      const max=16;
      let step=0;
      el.dataset.sf26Done='1';
      const target=numeric;
      const timer=setInterval(()=>{
        step++;
        const value=target*(step/max);
        if(step>=max){clearInterval(timer); el.textContent=text; return;}
        const pretty = target>=1000 ? Math.round(value*10)/10 : Math.round(value);
        el.textContent=String(pretty).replace('.0','')+suffix;
      },55);
    });
  }
  function addParallax(){
    const hero=document.querySelector('.hero-visual');
    if(!hero) return;
    hero.addEventListener('mousemove',(e)=>{
      const r=hero.getBoundingClientRect();
      const x=(e.clientX-r.left)/r.width-.5;
      const y=(e.clientY-r.top)/r.height-.5;
      hero.style.transform=`rotateX(${(-y*6).toFixed(2)}deg) rotateY(${(x*8).toFixed(2)}deg)`;
    });
    hero.addEventListener('mouseleave',()=>{hero.style.transform='rotateX(0deg) rotateY(0deg)';});
  }
  function duplicateMarquee(){
    const track=document.querySelector('.sf26-marquee-track');
    if(track && !track.dataset.cloned){ track.innerHTML += track.innerHTML; track.dataset.cloned='1'; }
  }
  document.addEventListener('DOMContentLoaded',()=>{
    duplicateMarquee();
    countUp();
    addParallax();
    setInterval(swapHeroTrack, 3800);
  });
})();
