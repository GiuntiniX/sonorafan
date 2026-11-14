/* SonoraFan 35 — pequenos refinamentos de UX, sem alterar autenticação,
 * sincronização da sala, fila, YouTube ou lógica de modais. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 function init(){
   const create=$('createRoomModal');
   const name=$('newRoomName');
   // Abrir criação pelo mouse/teclado posiciona o foco no nome;
   // não interfere no wizard ao trocar de etapa.
   if(create&&name){
     let active=create.classList.contains('active');
     const watch=new MutationObserver(()=>{
       const now=create.classList.contains('active');
       if(now&&!active){
         requestAnimationFrame(()=>{if(create.classList.contains('active')&&!name.closest('[hidden]'))name.focus({preventScroll:true})});
       }
       active=now;
     });
     watch.observe(create,{attributes:true,attributeFilter:['class']});
   }
   // Atalho / para busca atual; não captura teclas quando usuário já digita
   // nem impede qualquer atalho nativo do YouTube ou formulário.
   document.addEventListener('keydown',e=>{
     if(e.key!=='/'||e.ctrlKey||e.metaKey||e.altKey||e.repeat)return;
     const target=e.target;
     if(target instanceof HTMLElement && (target.isContentEditable||target.closest('input,textarea,select,[contenteditable="true"],[role="textbox"]')))return;
     if(document.querySelector('.modal-overlay.active,.sf29-tour[aria-hidden="false"]'))return;
     const room=$('screen-room');const lobby=$('screen-lobby');
     if(room?.classList.contains('active')){
       const input=$('songUrl');
       if(!input)return;
       e.preventDefault();
       if(typeof window.sf34FindSong==='function')window.sf34FindSong();else input.focus();
     } else if(lobby?.classList.contains('active')){
       const input=$('sf10RoomQuery');if(!input)return;
       e.preventDefault();input.focus({preventScroll:true});input.select();
     }
   });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
