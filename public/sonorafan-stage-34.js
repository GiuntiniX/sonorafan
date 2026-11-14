/* SonoraFan 34 · atalhos mobile e decoração não invasiva.
   Não modifica as regras da fila, autenticação nem controle do player. */
(()=>{
 'use strict';
 window.sf34LobbyJump=function(which){
   const scroll=document.querySelector('#screen-lobby .sf28-lobby-content');
   if(!scroll)return;
   const target=which==='rooms'?document.getElementById('roomGrid'):document.querySelector('#screen-lobby .sf33-banner');
   if(which==='rooms'&&target){
     const top=target.getBoundingClientRect().top-scroll.getBoundingClientRect().top+scroll.scrollTop-10;
     scroll.scrollTo({top:Math.max(0,top),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
   }else scroll.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 };
 window.sf34FindSong=function(){
   const input=document.getElementById('songUrl');
   if(!input)return;
   if(typeof setTab==='function')setTab('queue');
   requestAnimationFrame(()=>{
     const room=document.querySelector('#screen-room .room-layout');
     const box=document.getElementById('sf10RequestCard');
     if(room&&box){
       const pos=box.getBoundingClientRect().top-room.getBoundingClientRect().top+room.scrollTop-12;
       room.scrollTo({top:Math.max(0,pos),behavior:'smooth'});
     }
     setTimeout(()=>input.focus({preventScroll:true}),160);
   });
 };
})();
