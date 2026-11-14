/* Dados da sala, sem dados demonstrativos nem controles falsos de playback. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const root=$('screen-room');if(!root)return;
 const text=(id,value)=>{const node=$(id);if(node)node.textContent=String(value??'');};
 const originalState=window.premiumRoomState;
 window.premiumRoomState=function(state){
  if(typeof originalState==='function')originalState(state);
  if(!state)return;
  text('sf5RoomName','Sala: '+(state.name||'SonoraFan'));
  text('sf5RoomSubtitle',state.isPrivate?'🔒 Sala privada':'Sala colaborativa • Música ao vivo');
  text('sf5AboutName',state.name||'Sala musical');
  text('sf5AboutDescription',state.description||'Aqui a música não para! Compartilhe sua vibe com a galera.');
  text('sf5StatsTracks',Array.isArray(state.queue)?state.queue.length:0);
 };
 const originalUsers=window.premiumUsers;
 window.premiumUsers=function(users){
  if(typeof originalUsers==='function')originalUsers(users);
  if(!Array.isArray(users))return;
  text('sf5ListenersCount','('+users.length+')');text('sf5StatsListeners',users.length);
  const body=$('sf5ListenersBody');if(!body)return;
  body.replaceChildren();
  users.slice(0,9).forEach(u=>{
   const s=document.createElement('span');s.className='sf5-person-avatar';
   s.textContent=String(u.avatar||'🎧').slice(0,4);
   s.title=String(u.name||'Ouvinte').slice(0,60);body.append(s);
  });
  if(users.length>9){const more=document.createElement('span');more.className='sf5-person-more';more.textContent='+'+(users.length-9);body.append(more)}
  if(users.length===0){const empty=document.createElement('span');empty.style.cssText='color:#aaa;font-size:12px';empty.textContent='Aguardando ouvintes…';body.append(empty)}
 };
 // Sidebar config: handle access from the same existing modal path.
 const setting=$('sf5SettingsBtn');if(setting){setting.addEventListener('click',()=>{if(typeof amIAdmin!=='undefined'&&!amIAdmin&&typeof toast==='function')toast('Configurações disponíveis para responsáveis pela sala.','error')})}
})();
