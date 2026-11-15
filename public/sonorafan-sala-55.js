/* SonoraFan 55.0 — Contexto de músicas na sala, sem mexer em reprodução. */
(() => {
  'use strict';
  const byId=id=>document.getElementById(id);
  const youtubeId=id=>/^[a-zA-Z0-9_-]{11}$/.test(String(id||''))?id:null;
  const imageFor=id=>{const ok=youtubeId(id);return ok?`https://img.youtube.com/vi/${ok}/mqdefault.jpg`:null;};
  const normalizedTitle=track=>String(track?.title||'Música sem título');
  const displayDj=track=>track?.dj?`Por ${track.dj}`:String(track?.artist||'Escolhida pela comunidade');
  let lastKey='';

  function makeTrack(track,phase,now){
    const article=document.createElement('div');article.className='sf55-session-track'+(now?' is-now':'');
    const url=imageFor(track?.id);
    if(url){const img=document.createElement('img');img.src=url;img.alt='';img.loading='lazy';img.decoding='async';img.onerror=()=>img.remove();article.append(img);}
    const copy=document.createElement('div');copy.className='sf55-track-copy';
    const label=document.createElement('small');label.textContent=phase;
    const title=document.createElement('strong');title.textContent=normalizedTitle(track);title.title=normalizedTitle(track);
    const author=document.createElement('span');author.textContent=displayDj(track);
    copy.append(label,title,author);article.append(copy);
    return article;
  }
  function renderSession(state){
    const slot=byId('sf55SessionTracks');if(!slot)return;
    const queue=Array.isArray(state?.queue)?state.queue:[];
    const idx=Number.isInteger(state?.currentIndex)?state.currentIndex:0;
    const start=Math.max(0,idx);
    const upcoming=queue.slice(start,start+3);
    const key=[idx,queue.length,...upcoming.map(x=>[x?.id,x?.title,x?.dj,x?.artist].join('~'))].join('|');
    if(key===lastKey)return;lastKey=key;
    const count=byId('sf55SessionCount');if(count)count.textContent=queue.length===0?'Fila aberta':queue.length===1?'1 música na sala':`${queue.length} músicas na sala`;
    slot.replaceChildren();
    const add=byId('sf55SessionAdd');
    if(!upcoming.length){
      const p=document.createElement('p');p.className='sf55-session-placeholder';p.textContent='A playlist está esperando sua primeira música. Todo mundo pode colaborar.';
      slot.appendChild(p);if(add)add.hidden=false;return;
    }
    const labels=['Tocando agora','A seguir','Depois'];
    upcoming.forEach((track,i)=>slot.append(makeTrack(track,labels[i],i===0)));
    if(add)add.hidden=true;
  }
  function findSong(){
    const input=byId('songUrl');
    if(!input)return;
    if(typeof window.sf34FindSong==='function'){
      try{window.sf34FindSong();}catch(e){}
    }else{
      input.closest('.add-song-area')?.scrollIntoView({block:'center',behavior:'smooth'});
    }
    input.focus({preventScroll:false});
  }
  function init(){
    byId('sf55SessionAdd')?.addEventListener('click',findSong);
    if(typeof socket!=='undefined'&&socket?.on){
      socket.on('roomState',renderSession);
      socket.on('queueEmpty',()=>renderSession({queue:[],currentIndex:0}));
    }
    // Read initial state on late reloads without requiring a new room event.
    if(typeof currentRoomData!=='undefined'&&currentRoomData)renderSession(currentRoomData);
  }
  window.sf55RenderSession=renderSession;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
