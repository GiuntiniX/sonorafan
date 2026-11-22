/* SonoraFan 265 — Festival Dark theme guide and collaborative queue insights. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 // Brand palette is owned by the global SonoraFan 266 design system.
 // This module only renders queue information; themes no longer compete with the brand.
 const root=document.documentElement;
 let room=null, slug='', lastAlert='', statsFrame=0;
 const duration=t=>{const n=Number(t?.duration);return Number.isFinite(n)&&n>0?n:null};
 const me=t=>!!t&&(typeof myName!=='undefined'&&t.dj===myName);
 function getContext(){
   const data=typeof currentRoomData!=='undefined'?currentRoomData:null;
   const active=typeof currentRoom!=='undefined'?currentRoom:'';
   return {data:data||room,slug:active||''};
 }
 function fmt(seconds){
   if(seconds===null)return '—';
   const m=Math.ceil(Math.max(0,seconds)/60);
   return m>=60?Math.floor(m/60)+'h '+String(m%60).padStart(2,'0')+'m':m+' min';
 }
 function estimate(tracks,index,target,data){
   let total=0;
   const now=tracks[index];
   if(!now)return null;
   const first=duration(now);
   if(first===null)return null;
   const started=Number(data?.startedAt);
   const elapsed=started>0?Math.max(0,(Date.now()-started)/1000):0;
   total+=Math.max(0,first-elapsed);
   for(let i=index+1;i<target;i++){const n=duration(tracks[i]);if(n===null)return null;total+=n}
   return total;
 }
 function btn(text,label,click){
   const b=document.createElement('button');b.type='button';b.className='sf265-queue-action';b.textContent=text;b.setAttribute('aria-label',label);b.addEventListener('click',click);return b;
 }
 function build(){
   const tracks=$('queueList');
   const host=tracks?.closest('.sf128-queue-tracks, .sf34-queue, .queue-column') || tracks?.parentElement;
   if(!host||!tracks||$('sf265QueueSummary'))return;
   const wrap=document.createElement('div');wrap.id='sf265QueueSummary';wrap.innerHTML=
    '<div class="sf265-queue-head"><span class="sf265-queue-label">♫ Seu palco colaborativo</span></div>'+
    '<div class="sf265-queue-summary" aria-label="Resumo da fila"><div class="sf265-queue-stat"><strong id="sf265TrackCount">0</strong><span>Músicas</span></div><div class="sf265-queue-stat"><strong id="sf265DjCount">0</strong><span>DJs</span></div><div class="sf265-queue-stat"><strong id="sf265QueueDuration">—</strong><span>Tempo estimado</span></div></div>'+
    '<p class="sf265-queue-note" id="sf265QueueNote">A fila é construída por todos.</p>';
   tracks.before(wrap);
 }
 function decorate(){
   build();
   const list=$('queueList'),panel=$('sf265QueueSummary');
   if(!list||!panel||!document.getElementById('screen-room')?.classList.contains('active'))return;
   const {data,slug:currentSlug}=getContext();
   if(!data||!currentSlug)return;
   if(slug!==currentSlug){slug=currentSlug;lastAlert='';}
   const tracks=Array.isArray(data.queue)?data.queue:[];
   const index=Math.max(0,Math.min(Number(data.currentIndex)||0,tracks.length));
   const ahead=tracks.slice(index),waiting=Array.isArray(data.waitingQueue)?data.waitingQueue:[];
   const djs=new Set([...ahead,...waiting].map(t=>t.dj).filter(Boolean));
   $('sf265TrackCount').textContent=String(ahead.length+waiting.length);
   $('sf265DjCount').textContent=String(djs.size);
   const total=ahead.reduce((acc,t)=>acc===null||duration(t)===null?null:acc+duration(t),0);
   $('sf265QueueDuration').textContent=fmt(total);
   const mine=ahead.findIndex((t,i)=>i>0&&me(t));
   const myWait=mine>=0?estimate(tracks,index,index+mine,data):null;
   const note=$('sf265QueueNote');
   note.textContent=mine>=0
      ?'Sua próxima escolha: '+(myWait===null?'tempo indisponível':'aproximadamente '+fmt(myWait))+'. A ordem pode mudar conforme a votação.'
      :(djs.size>1?'Participação de '+djs.size+' DJs. Use “Minhas” para gerenciar suas escolhas.':'Adicione sua música e participe do show.');
   note.classList.toggle('sf265-queue-notice',mine===1);
   const rows=[...list.querySelectorAll(':scope > .queue-item')];
   rows.forEach((row,i)=>{
     const track=tracks[i];if(!track)return;
     const info=row.querySelector('.info')||row;
     let eta=row.querySelector('.sf265-eta');
     if(i>index){
       const seconds=estimate(tracks,index,i,data);
       if(!eta){eta=document.createElement('small');eta.className='sf265-eta';info.append(eta)}
       const msg=seconds===null?'Tempo até tocar indisponível':'Toca em ~'+fmt(seconds);
       if(eta.textContent!==msg)eta.textContent=msg;
     }else eta?.remove();
     let actions=row.querySelector('.sf265-queue-actions');
     if(!actions){actions=document.createElement('div');actions.className='sf265-queue-actions';info.append(actions)}
     const valid=/^[A-Za-z0-9_-]{11}$/.test(String(track.id||''));
     const isLiked=typeof myFavorites!=='undefined'&&Array.isArray(myFavorites)&&myFavorites.some(t=>t.id===track.id);
     let favorite=actions.querySelector('[data-sf265-fav]');
     if(!favorite&&valid){
       favorite=btn('♡ Favoritar','Salvar música nos favoritos',async()=>{
         if(typeof addFavorite!=='function')return;
         favorite.disabled=true;
         try{await addFavorite(track.id,track.title||'Música',track.artist||'Artista');}finally{favorite.disabled=false;schedule()}
       });
       favorite.dataset.sf265Fav=track.id;actions.append(favorite);
     }
     if(favorite){favorite.textContent=isLiked?'♥ Favorita':'♡ Favoritar';favorite.disabled=isLiked;favorite.title=isLiked?'Já está na sua biblioteca':'Salvar nos favoritos'}
     let ownButton=actions.querySelector('[data-sf265-mine]');
     if(me(track)&&i>index&&!ownButton){
       ownButton=btn('Minhas músicas','Filtrar músicas adicionadas por mim',()=>window.sf95Queue?.openFilter?.());
       ownButton.dataset.sf265Mine='1';actions.append(ownButton);
     }else if((!me(track)||i<=index)&&ownButton)ownButton.remove();
   });
 }
 function schedule(){if(statsFrame)return;statsFrame=requestAnimationFrame(()=>{statsFrame=0;decorate()})}
 function bind(){
   build();
   const socketClient=typeof socket!=='undefined'?socket:null;
   socketClient?.on('roomState',data=>{room=data;schedule()});
   document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});
   setInterval(()=>{if(!document.hidden)schedule()},10000);
   const list=$('queueList');if(list)new MutationObserver(schedule).observe(list,{childList:true});
   schedule();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
 window.sf265Guide={update:schedule};
})();