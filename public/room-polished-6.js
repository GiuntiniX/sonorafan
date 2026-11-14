/* SonoraFan · Layout profissional 6; visual-only bindings over existing state. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const room=$('screen-room');if(!room)return;
 const energy=room.querySelector('.sf6-energy-card');
 const text=(id,v)=>{const el=$(id);if(el)el.textContent=String(v)};
 const oldRoom=window.premiumRoomState;
 window.premiumRoomState=function(state){
   if(typeof oldRoom==='function')oldRoom(state);
   if(!state)return;
   const q=Array.isArray(state.queue)?state.queue:[];
   const active=q.length>0;
   energy?.classList.toggle('is-playing',active);
   text('sf6EnergyHeadline',active?'A música conecta a galera':'A vibe começa aqui');
   text('sf6EnergyDetail',active?`${q.length} ${q.length===1?'música na fila':'músicas na fila'}`:'Adicione uma música para começar');
 };
 const oldUsers=window.premiumUsers;
 window.premiumUsers=function(users){
   if(typeof oldUsers==='function')oldUsers(users);
   if(!Array.isArray(users))return;
   text('sf6EnergyPeople',`${users.length} ${users.length===1?'ouvinte':'ouvintes'}`);
 };
 // Avoid suggesting the ambient equalizer is measuring real audio: it is only visual motion.
})();
