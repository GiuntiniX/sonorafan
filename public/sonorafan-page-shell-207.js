/* SonoraFan 207 — navegação de páginas, preservando módulos e dados existentes. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
let isPage=false,lastSection='lobby';
function menu(section){
 lastSection=section;
 document.querySelectorAll('#sf125Sidebar .sf125-side-nav:not(.sf125-side-secondary) [data-sf125-go],#sf125MobileBar [data-sf125-go]').forEach(button=>{
  const active=button.dataset.sf125Go===section;
  button.classList.toggle('is-active',active);
  if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
 });
 const side=$('sf125Sidebar');
 if(side)side.dataset.activeSection=section;
}
function restore(){
 const screen=$('screen-lobby'),content=screen?.querySelector('.sf28-lobby-content');
 if(!screen||!content)return;
 isPage=false;
 screen.classList.remove('sf207-profile-page');
 content.classList.remove('sf207-profile-content');
 content.querySelector('#sf43ProfileModal')?.classList.remove('sf207-in-page');
 document.body.classList.remove('sf43-modal-open');
 if(lastSection==='profile')menu(content.classList.contains('sf200-is-open')?'agenda':'lobby');
}
function openProfile(tab='overview'){
 const modal=$('sf43ProfileModal');
 const screen=$('screen-lobby');
 const content=screen?.querySelector('.sf28-lobby-content');
 if(!modal||!screen||!content){
  window.sf112OpenProfile?.(tab);return;
 }
 if(!screen.classList.contains('active')){
  if(typeof window.leaveRoom==='function')window.leaveRoom();
  else window.showScreen?.('lobby');
 }
 window.sf200CloseAgenda?.();
 if(modal.parentNode!==content)content.appendChild(modal);
 screen.classList.add('sf207-profile-page');
 content.classList.add('sf207-profile-content');
 modal.classList.add('sf207-in-page');
 isPage=true;
 // Reutiliza a abertura, autenticação, dados e carregamento das abas existentes.
 if(typeof window.sf112OpenProfile==='function')window.sf112OpenProfile(tab);
 else originalOpen?.();
 document.body.classList.remove('sf43-modal-open');
 content.scrollTo({top:0,behavior:'instant'});
 menu('profile');
}
let originalOpen=null,originalClose=null,originalNavigate=null;
function init(){
 const modal=$('sf43ProfileModal'),content=$('screen-lobby')?.querySelector('.sf28-lobby-content');
 if(!modal||!content)return;
 originalOpen=window.sf5OpenProfile;
 originalClose=window.sf43CloseProfile;
 originalNavigate=window.sf125Navigate;
 if(typeof originalOpen==='function'){
  window.sf5OpenProfile=(...args)=>{
   // Quando invocada pela rotina de abas, o modal já está na página: apenas abre.
   if(isPage&&modal.classList.contains('sf207-in-page')){
    originalOpen(...args);document.body.classList.remove('sf43-modal-open');menu('profile');return;
   }
   openProfile('overview');
  };
 }
 if(typeof originalClose==='function'){
  window.sf43CloseProfile=(...args)=>{originalClose(...args);restore();};
 }
 window.sf207OpenProfile=openProfile;
 window.sf207SetActive=menu;
 window.sf207ProfileIsPage=()=>isPage;
 if(typeof originalNavigate==='function'){
  window.sf125Navigate=(area)=>{
   if(area==='profile'){openProfile('overview');return;}
   if(area==='library'){openProfile('library');return;}
   if(area==='favorites'){openProfile('library');return;}
   if(isPage&&area!=='profile')window.sf43CloseProfile?.();
   if(area==='community')area='clubs';
   const result=originalNavigate(area);
   if(['lobby','rooms','agenda','clubs','ranking'].includes(area))menu(area);
   return result;
  };
 }
 // Um modal aberto antes de montar o shell também poderá converter-se em página.
 const obs=new MutationObserver(()=>{
  if(modal.classList.contains('active')&&!isPage&&$('screen-lobby')?.classList.contains('active'))openProfile('overview');
  if(isPage&&!modal.classList.contains('active'))restore();
 });
 obs.observe(modal,{attributes:true,attributeFilter:['class']});
 const oldEvents=['sf125:home','sf125:lobby'];
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&isPage&&modal.classList.contains('active')){
   window.sf43CloseProfile?.();
  }
 });
 // Não abrir atalhos ou formulários do usuário dentro de um modal legado.
 const home=$('sf125Sidebar');
 home?.addEventListener('click',e=>{
  const link=e.target.closest('[data-sf125-go]');
  if(link&&!['profile','library'].includes(link.dataset.sf125Go)&&isPage)window.sf43CloseProfile?.();
 },true);
 const bar=$('sf125MobileBar');
 bar?.addEventListener('click',e=>{
  const link=e.target.closest('[data-sf125-go]');
  if(link&&!['profile','library'].includes(link.dataset.sf125Go)&&isPage)window.sf43CloseProfile?.();
 },true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();