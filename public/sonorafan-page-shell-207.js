/* SonoraFan 207 — navegação de páginas, preservando módulos e dados existentes. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
let isPage=false,lastSection='lobby';
let secondaryPage='';
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
 const p=$('sf43ProfileModal');if(p){p.setAttribute('role','dialog');p.setAttribute('aria-modal','true');}
 document.body.classList.remove('sf43-modal-open');
 if(lastSection==='profile')menu(content.classList.contains('sf200-is-open')?'agenda':'lobby');
}

function endSecondary(){
 const content=$('screen-lobby')?.querySelector('.sf28-lobby-content');
 if(!content)return;
 const old=secondaryPage;
 secondaryPage='';
 const inactive=old==='clubs'?content.querySelector('.sf5-community-layer'):old==='ranking'?$('lbModal'):null;
 inactive?.querySelector('[aria-modal="false"]')?.setAttribute('aria-modal','true');
 content.classList.remove('sf207-clubs-content','sf207-ranking-content');
 $('screen-lobby')?.classList.remove('sf207-clubs-page','sf207-ranking-page');
 if(old==='clubs')content.querySelector('.sf5-community-layer .sf5-close')?.click();
 if(old==='ranking'&&$('lbModal')?.classList.contains('active'))window.sf60Ranking?.close?.();
 if(old)menu('lobby');
}
function startSecondary(type){
 const screen=$('screen-lobby'),content=screen?.querySelector('.sf28-lobby-content');
 if(!screen||!content)return;
 if(!screen.classList.contains('active')){
  if(typeof window.leaveRoom==='function')window.leaveRoom();
  else window.showScreen?.('lobby');
 }
 if(isPage)window.sf43CloseProfile?.();
 if(secondaryPage&&secondaryPage!==type)endSecondary();
 window.sf200CloseAgenda?.();
 const node=type==='clubs'?document.querySelector('.sf5-community-layer'):$('lbModal');
 if(!node)return;
 if(node.parentElement!==content)content.appendChild(node);
 content.classList.add(type==='clubs'?'sf207-clubs-content':'sf207-ranking-content');
 screen.classList.add(type==='clubs'?'sf207-clubs-page':'sf207-ranking-page');
 node.classList.add('sf207-in-page');
 node.querySelector('[aria-modal="true"]')?.setAttribute('aria-modal','false');
 secondaryPage=type;
 menu(type);
 content.scrollTo({top:0,behavior:'instant'});
}
function openProfile(tab='overview'){
 if(secondaryPage)endSecondary();
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
 modal.setAttribute('role','region');modal.setAttribute('aria-modal','false');
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
 modal.addEventListener('click',event=>{
  if(!isPage||!event.target.closest('.sf43-profile-close'))return;
  event.preventDefault();event.stopImmediatePropagation();
  window.sf112SwitchProfileTab?.('overview');
 },true);
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
 if(typeof window.sf126OpenClubs==='function'){
  const openClubs=window.sf126OpenClubs;
  window.sf126OpenClubs=(...args)=>{const value=openClubs(...args);startSecondary('clubs');return value;};
 }
 if(window.sf60Ranking&&typeof window.sf60Ranking.open==='function'){
  const openRanking=window.sf60Ranking.open;
  window.sf60Ranking.open=(...args)=>{const value=openRanking(...args);startSecondary('ranking');return value;};
 }
 // O acesso antigo a "Comunidade" deve abrir Fan Clubs, sem uma página duplicada.
 if(typeof window.sf5OpenCommunity==='function'){
  window.sf5OpenCommunity=()=>window.sf125Navigate?.('clubs');
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
   if(secondaryPage&&secondaryPage!==area)endSecondary();
   if(area==='community')area='clubs';
   const result=originalNavigate(area);
   if(area==='clubs'||area==='ranking')startSecondary(area);
   else if(['lobby','rooms','agenda'].includes(area))menu(area);
   return result;
  };
 }
 // Um modal aberto antes de montar o shell também poderá converter-se em página.
 const obs=new MutationObserver(()=>{
  if(modal.classList.contains('active')&&!isPage&&$('screen-lobby')?.classList.contains('active'))openProfile('overview');
  if(isPage&&!modal.classList.contains('active'))restore();
 });
 obs.observe(modal,{attributes:true,attributeFilter:['class']});
 const bodyContent=$('screen-lobby')?.querySelector('.sf28-lobby-content');
 if(bodyContent){
  new MutationObserver(()=>{
   if(secondaryPage==='clubs'&&!bodyContent.querySelector('.sf5-community-layer'))endSecondary();
   if(secondaryPage==='ranking'&&!$('lbModal')?.classList.contains('active'))endSecondary();
  }).observe(bodyContent,{childList:true,subtree:false});
 }
 $('lbModal')&&new MutationObserver(()=>{
  if(secondaryPage==='ranking'&&!$('lbModal')?.classList.contains('active'))endSecondary();
 }).observe($('lbModal'),{attributes:true,attributeFilter:['class']});
 document.addEventListener('click',event=>{
  if(secondaryPage==='clubs'&&event.target.closest('.sf5-close')){
   queueMicrotask(()=>{if(secondaryPage==='clubs')endSecondary();});
  }
 },true);

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