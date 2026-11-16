/* SonoraFan 82 — estado da fila e descoberta por contexto musical. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 function render(state){
   const title=$('sf82QueueDetails'),button=$('sf82Explore');
   if(!title||!button)return;
   if(!state || !$('screen-room')?.classList.contains('active')){
     title.textContent='Aguardando músicas';button.disabled=true;return;
   }
   const songs=Array.isArray(state.queue)?state.queue:[];
   const waiting=Array.isArray(state.waitingQueue)?state.waitingQueue:[];
   const index=Math.max(0,Number(state.currentIndex)||0);
   const upcoming=songs.slice(index+1);
   const djs=new Set(upcoming.map(s=>s.dj).filter(Boolean));
   const seconds=upcoming.reduce((sum,s)=>sum+(Number(s.duration)>0?Number(s.duration):0),0);
   const minutes=seconds?Math.ceil(seconds/60):null;
   const meta=[upcoming.length+' próximas', djs.size?djs.size+' DJs':'fila aberta'];
   if(minutes)meta.push('~'+minutes+' min');
   if(waiting.length)meta.push(waiting.length+' em espera');
   title.textContent=meta.join(' · ');
   const now=songs[index]||songs.find(s=>s?.artist);
   const artist=String(now?.artist||'').trim().slice(0,65);
   const roomName=String(state.name||'').trim();
   const query=artist&&artist!=='Desconhecido'&&artist!=='Artista desconhecido'?artist:roomName;
   button.disabled=!query;
   button.dataset.query=query;
   button.setAttribute('aria-label',query?'Descobrir mais músicas relacionadas a '+query:'Explorar músicas');
   button.title=query?'Buscar mais de '+query:'Explore músicas';
   const fanButton=$('sf82FindFans');
   if(fanButton)fanButton.dataset.artist=artist;
 }
 function init(){
   const host=document.querySelector('#screen-room .queue-column');
   if(!host||$('sf82QueueToolbar'))return;
   const bar=document.createElement('div');bar.id='sf82QueueToolbar';bar.className='sf82-queue-toolbar';
   const details=document.createElement('span');details.id='sf82QueueDetails';details.textContent='Aguardando músicas';details.setAttribute('aria-live','polite');
   const button=document.createElement('button');button.id='sf82Explore';button.type='button';
   button.textContent='♫ Explorar similares';
   button.addEventListener('click',()=>{
      if(button.disabled)return;
      if(typeof window.sf77OpenSearch==='function')window.sf77OpenSearch(button.dataset.query||'');
   });
   const fans=document.createElement('button');
   fans.id='sf82FindFans';fans.type='button';fans.textContent='♧ Fan Clubs';
   fans.setAttribute('aria-label','Encontrar Fan Clubs do artista que está tocando');
   fans.addEventListener('click',()=>{
      window.sf74OpenFanClubs?.();
      const field=$('sf71ClubSearch');
      if(field&&fans.dataset.artist){
        field.value=fans.dataset.artist;
        field.dispatchEvent(new Event('input',{bubbles:true}));
      }
   });
   bar.append(details,button,fans);
   const target=$('sf39QueueInsight');
   if(target)target.insertAdjacentElement('afterend',bar);else host.prepend(bar);
   if(typeof socket!=='undefined'&&socket?.on)socket.on('roomState',render);
   render(typeof currentRoomData!=='undefined'?currentRoomData:null);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
