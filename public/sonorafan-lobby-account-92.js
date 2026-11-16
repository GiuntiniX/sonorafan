/* SonoraFan 92 — conta, termos, privacidade e exclusão num único painel. */
(()=>{
 'use strict';
 const overlay=()=>document.getElementById('sf92AccountOverlay');
 let lastFocus=null;
 const focusables=()=>[...overlay().querySelectorAll('button:not([disabled]):not([hidden])')].filter(el=>el.offsetParent!==null);
 function open(){
   const dialog=overlay();
   if(!dialog)return;
   lastFocus=document.activeElement;
   dialog.hidden=false;
   document.body.classList.add('sf92-account-open');
   dialog.querySelector('#sf92AccountClose')?.focus({preventScroll:true});
 }
 function close(){
   const dialog=overlay();
   if(!dialog||dialog.hidden)return;
   dialog.hidden=true;
   document.body.classList.remove('sf92-account-open');
   if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});
 }
 function showLegal(which){
   close();
   if(typeof window.openLegal==='function')window.openLegal(which);
 }
 function deleteAccount(){
   close();
   // A exclusão continua protegida pela confirmação já existente.
   if(typeof window.deleteMyAccount==='function')window.deleteMyAccount();
 }
 function init(){
   const dialog=overlay();
   if(!dialog)return;
   document.querySelectorAll('[data-sf92-account-open]').forEach(button=>{
     button.addEventListener('click',open);
   });
   dialog.querySelector('#sf92AccountClose')?.addEventListener('click',close);
   dialog.querySelector('#sf92AccountTerms')?.addEventListener('click',()=>showLegal('terms'));
   dialog.querySelector('#sf92AccountPrivacy')?.addEventListener('click',()=>showLegal('priv'));
   dialog.querySelector('#sf92AccountDelete')?.addEventListener('click',deleteAccount);
   dialog.addEventListener('click',event=>{if(event.target===dialog)close();});
   document.addEventListener('keydown',event=>{
     if(dialog.hidden)return;
     if(event.key==='Escape'){event.preventDefault();close();return;}
     if(event.key!=='Tab')return;
     const controls=focusables();
     if(!controls.length)return;
     const first=controls[0],last=controls[controls.length-1];
     if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
     else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
   });
 }
 window.sf92OpenAccount=open;
 window.sf92CloseAccount=close;
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();