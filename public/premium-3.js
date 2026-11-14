/* SonoraFan Premium 3.0 — camada visual, sem controlar a reprodução do YouTube. */
(function(){
 'use strict';
 const $ = id => document.getElementById(id);
 const room = $('screen-room');
 if (!room) return;
 let lastTrack = '', lastReaction = 0;
 const palette = ['#9259f2','#ff7658','#18b6a2','#4999ef','#e55aab','#e8a453','#8abc52','#d86af0'];
 const safeId = value => /^[a-zA-Z0-9_-]{11}$/.test(String(value || '')) ? value : null;
 const thumb = id => `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
 function reset(){
  lastTrack='';room.style.setProperty('--sf-cover','none');room.style.setProperty('--sf-neon','var(--room-accent,#7c3aed)');room.style.setProperty('--sf-ambient-color','rgba(124,58,237,.15)');
  if($('premiumMiniCover')) $('premiumMiniCover').textContent='♫';
  if($('premiumMiniTitle')) $('premiumMiniTitle').textContent='Nenhuma música';
  if($('premiumMiniArtist')) $('premiumMiniArtist').textContent='Escolha uma música';
  if($('premiumMiniFill')) $('premiumMiniFill').style.width='0%';
  if($('premiumRoomMood')) $('premiumRoomMood').textContent='Ambiente compartilhado';
  if($('premiumPresence')) $('premiumPresence').replaceChildren();
 }
 window.premiumReset=reset;
 window.premiumRoomState=function(state){
  if(!state || !Array.isArray(state.queue))return;
  const track=state.queue[state.currentIndex];
  const count=Math.max(0,state.queue.length-state.currentIndex-1);
  if($('premiumQueueDuration'))$('premiumQueueDuration').textContent=state.queue.length+' faixas na seleção';
  if($('premiumQueueNext'))$('premiumQueueNext').textContent=count?count+' a seguir':'Você escolhe a próxima';
  if($('premiumRoomMood'))$('premiumRoomMood').textContent=state.description||state.name||'Ambiente compartilhado';
  if(!track){if(lastTrack)reset();return;}
  if($('premiumMiniTitle'))$('premiumMiniTitle').textContent=track.title||'Música';
  if($('premiumMiniArtist'))$('premiumMiniArtist').textContent=track.artist||'Desconhecido';
  const id=safeId(track.id);
  if(!id || id===lastTrack) return;
  lastTrack=id;
  const col=palette[[...id].reduce((sum,ch)=>sum+ch.charCodeAt(0),0)%palette.length];
  room.style.setProperty('--sf-neon',col);
  room.style.setProperty('--sf-ambient-color',col+'44');
  room.style.setProperty('--sf-cover',`url("${thumb(id)}")`);
  const cover=$('premiumMiniCover');
  if(cover){const img=document.createElement('img');img.src=thumb(id);img.alt='';img.loading='lazy';cover.replaceChildren(img);}
 };
 window.premiumUsers=function(users){
  if(!Array.isArray(users))return;
  const box=$('premiumPresence');if(!box)return;
  box.replaceChildren();
  users.slice(0,8).forEach(user=>{
   const span=document.createElement('span');span.className='premium-presence-avatar';
   span.textContent=String(user.avatar||'🎧').slice(0,4);span.title=String(user.name||'Ouvinte').slice(0,60);
   box.appendChild(span);
  });
  if(users.length>8){const more=document.createElement('span');more.className='premium-presence-more';more.textContent='+'+(users.length-8);box.appendChild(more);}
  if(!users.length){const empty=document.createElement('span');empty.className='premium-presence-empty';empty.textContent='Entre na vibe com a galera';box.appendChild(empty);}
  if($('premiumRoomListeners'))$('premiumRoomListeners').textContent=users.length+' '+(users.length===1?'ouvinte conectado':'ouvintes conectados');
 };
 window.premiumProgress=function(percent){const fill=$('premiumMiniFill');if(fill&&Number.isFinite(percent))fill.style.width=Math.min(100,Math.max(0,percent))+'%';};
 function floatReaction(emoji){
  const stage=$('premiumReactionStage');if(!stage)return;
  const span=document.createElement('span');span.className='premium-floating-react';span.textContent=emoji;
  span.style.left=(20+Math.random()*55)+'%';span.style.animationDelay='0s';stage.appendChild(span);
  setTimeout(()=>span.remove(),2700);
 }
 window.premiumReact=function(emoji){
  const allowed=['🔥','❤️','🎶','🙌','⚡'];
  if(!allowed.includes(emoji))return;
  if(typeof currentRoom==='undefined'||!currentRoom)return;
  const now=Date.now();if(now-lastReaction<1000)return;
  lastReaction=now;
  // O servidor replica inclusive para quem enviou.
  if(typeof socket!=='undefined'&&socket&&socket.connected) socket.emit('roomReaction',{emoji});
 };
 // A reação é apenas um overlay visual; nunca altera a fila, o vídeo ou o chat.
 if(typeof socket!=='undefined'&&socket)socket.on('roomReaction',data=>{if(data&&['🔥','❤️','🎶','🙌','⚡'].includes(data.emoji))floatReaction(data.emoji);});
})();
