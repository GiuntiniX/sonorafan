/* Social stage: uses server-origin users and reactions, never changes playback state. */
(function(){
 'use strict';
 const root=document.getElementById('screen-room');
 const crowd=document.getElementById('sf18Crowd');
 if(!root||!crowd)return;
 const esc=t=>String(t??'').slice(0,80);
 function render(users){
   if(!Array.isArray(users))return;
   const unique=users.slice(0,75);
   crowd.replaceChildren();
   const host=unique.find(u=>u.role==='owner')||unique.find(u=>u.role==='admin')||null;
   const hostName=document.getElementById('sf18HostName'),hostAvatar=document.getElementById('sf18HostAvatar');
   if(hostName)hostName.textContent=host?esc(host.name||'Anfitrião'):'Aguardando anfitrião';
   if(hostAvatar)hostAvatar.textContent=host?esc(host.avatar||'🎧').slice(0,4):'🎧';
   const max=24;
   unique.slice(0,max).forEach((u,i)=>{
     const item=document.createElement('span');item.className='sf18-person';
     item.textContent=esc(u.avatar||'🎧').slice(0,4);
     item.title=esc(u.name||'Ouvinte');
     item.style.setProperty('--sf18-delay',-((i*3)%17)/10+'s');
     crowd.appendChild(item);
   });
   if(users.length>max){const more=document.createElement('span');more.className='sf18-more';more.textContent='+'+(users.length-max);crowd.appendChild(more)}
   if(!users.length){const empty=document.createElement('span');empty.className='sf18-empty-crowd';empty.textContent='A pista ganha vida quando os ouvintes entram.';crowd.appendChild(empty)}
   const count=document.getElementById('sf18CrowdCount');if(count)count.textContent=users.length;
 }
 function reaction(data){
   const emoji=data?.emoji;
   if(!['🔥','❤️','🙌','⚡','🎶'].includes(emoji))return;
   const canvas=document.getElementById('sf18ReactionStage');if(!canvas||!root.classList.contains('active'))return;
   const s=document.createElement('span');s.className='sf18-float';s.textContent=emoji;s.style.setProperty('--x',(15+Math.random()*70)+'%');canvas.appendChild(s);
   setTimeout(()=>s.remove(),1850);
 }
 root.addEventListener('click',event=>{
   const button=event.target.closest('[data-sf18-react]');
   if(!button)return;
   if(typeof window.premiumReact==='function')window.premiumReact(button.dataset.sf18React);
 });
 // Subscribe to the existing socket events, without replacing the old listeners.
 if(typeof socket!=='undefined' && socket && typeof socket.on==='function'){
   socket.on('users',render);
   socket.on('roomReaction',reaction);
 }
 const reset=()=>{render([]);document.querySelectorAll('#sf18ReactionStage .sf18-float').forEach(n=>n.remove())};
 root.addEventListener('sf18:reset',reset);
})();
