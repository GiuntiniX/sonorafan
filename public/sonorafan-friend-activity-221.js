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
// Monitoramento leve enquanto o app estiver aberto. A primeira leitura estabelece
// a referência sem alertas, e o backend só expõe salas públicas permitidas.
let previous=null,busy=false,lastCheck=0;
const appVisible=()=>!!(document.querySelector('#screen-lobby.active,#screen-room.active'));
async function poll() {
 if(busy||document.hidden||!appVisible()||Date.now()-lastCheck<45000)return;
 busy=true;lastCheck=Date.now();
 try{
  const response=await fetch('/api/social/following',{credentials:'include',cache:'no-store'});
  if(response.status===401){previous=null;return;}
  if(!response.ok)return;
  const list=await response.json();
  if(!Array.isArray(list))return;
  const next=new Map(list.filter(p=>typeof p.id==='string')
     .map(p=>[p.id,{room:p.activity&&validSlug(p.activity.roomSlug)?p.activity.roomSlug:null,name:p.name,roomName:p.activity?.roomName}]));
  if(previous){
   for(const [id,item] of next){
    const old=previous.get(id);
    if(old&&!old.room&&item.room){show({name:item.name,roomSlug:item.room,roomName:item.roomName});break;}
    if(old&&old.room&&item.room!==old.room&&item.room){show({name:item.name,roomSlug:item.room,roomName:item.roomName});break;}
   }
  }
  previous=next;
 }catch(_){/* rede temporariamente indisponível: sem mensagem de erro intrusiva */}
 finally{busy=false;}
}
function start(){
 poll();
 setInterval(poll,55000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();
document.addEventListener('visibilitychange',()=>{if(!document.hidden){lastCheck=0;poll();}});
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){active?.remove();active=null;clearTimeout(hideTimer);}
});
})();