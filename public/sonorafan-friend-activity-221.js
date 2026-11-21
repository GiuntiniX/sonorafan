/* SonoraFan 221 — aviso discreto de transição para sala pública de um amigo.
   Somente dados filtrados pelo servidor e depois de carregar o estado inicial. */
(()=>{
'use strict';
let lastToastAt=0,active=null,hideTimer=null;
const validSlug=s=>typeof s==='string'&&/^[a-z0-9_-]{1,120}$/i.test(s);
const safeName=s=>String(s||'Um amigo').replace(/[<>\u0000-\u001f]/g,'').trim().slice(0,42);
function show({name,roomSlug,roomName}={}){
 if(!validSlug(roomSlug)||document.hidden||Date.now()-lastToastAt<120000)return;
 lastToastAt=Date.now();
 active?.remove();clearTimeout(hideTimer);
 const card=document.createElement('aside');
 card.className='sf221-friend-toast';
 card.setAttribute('role','status');
 card.setAttribute('aria-label','Atividade de amigo');
 const marker=document.createElement('span');marker.className='sf221-marker';marker.textContent='♫';
 const msg=document.createElement('div');msg.className='sf221-text';
 const strong=document.createElement('strong');strong.textContent=safeName(name)+' entrou em uma sala';
 const small=document.createElement('small');small.textContent=safeName(roomName||'Sala pública');
 msg.append(strong,small);
 const go=document.createElement('button');go.type='button';go.className='sf221-go';go.textContent='Entrar';
 go.setAttribute('aria-label','Entrar na sala pública do amigo');
 go.addEventListener('click',()=>{
   card.remove();active=null;
   if(typeof window.joinRoom==='function')window.joinRoom(roomSlug);
 });
 const close=document.createElement('button');close.type='button';close.className='sf221-dismiss';
 close.setAttribute('aria-label','Dispensar aviso');close.textContent='×';
 close.addEventListener('click',()=>{card.remove();active=null;clearTimeout(hideTimer);});
 card.append(marker,msg,go,close);document.body.appendChild(card);active=card;
 hideTimer=setTimeout(()=>{card.remove();if(active===card)active=null;},9500);
}
window.sf220FriendJoined=show;
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){active?.remove();active=null;clearTimeout(hideTimer);}
});
})();