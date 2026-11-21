/* SonoraFan 208 — vínculo claro entre salas públicas e Fan Clubs. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let version=0;
const gallery={stage:'/art-129/sonorafan-stage.svg',kpop:'/art-132/sonorafan-room-kpop.avif',rock:'/art-33/poster-rock.webp',pop:'/art-33/poster-electro.webp',indie:'/art-33/poster-indie.webp',festival:'/art-40/poster-festival.svg'};
function imageFor(c){
 if(c.coverType==='gallery'&&gallery[c.coverGalleryId])return gallery[c.coverGalleryId];
 if(c.coverType==='external'){
  try{const u=new URL(c.coverImageUrl);if(u.protocol==='https:'&&!u.username&&!u.password)return u.href;}catch(_){}
 }
 if(c.coverVersion&&/^[a-f0-9-]{36}$/i.test(c.id))return '/api/fan-clubs/'+c.id+'/cover?v='+encodeURIComponent(c.coverVersion);
 return gallery[c.genre]||gallery.stage;
}

let activeSlug='';
let lastRefresh=0;
let retryTimer=0;
let refreshTimer=0;
let observing=false;
let panel=null;
function ensurePanel(){
 const head=document.querySelector('#screen-room .premium-chat-heading');
 if(!head)return null;
 if(!panel){
  panel=$('sf208RoomClubs') || document.createElement('div');
  panel.id='sf208RoomClubs';panel.className='sf208-room-clubs';
  panel.setAttribute('aria-label','Fanclubs vinculados a esta sala');
  panel.hidden=true;
  panel.addEventListener('error',e=>{
   const img=e.target;
   if(img?.matches?.('img[data-sf208-fallback]')){
    img.src=img.dataset.sf208Fallback;
    delete img.dataset.sf208Fallback;
   }
  },true);
  panel.addEventListener('click',e=>{
   const b=e.target.closest('[data-sf208-open-club]');if(!b)return;
   e.preventDefault();
   const id=b.dataset.sf208OpenClub;
   if(typeof window.leaveRoom==='function')window.leaveRoom();
   window.sf125Navigate?.('clubs');
   window.sf71OpenFanClub?.(id);
  });
 }
 if(panel.previousElementSibling!==head || !panel.isConnected)head.after(panel);
 return panel;
}
function isRoomActive(){return !!document.querySelector('#screen-room.active');}
function clearRetry(){clearTimeout(retryTimer);retryTimer=0;}
async function show(slug,{force=false}={}){
 const normalized=String(slug||'');
 if(!/^[a-z0-9_-]{1,100}$/i.test(normalized))return;
 const changed=activeSlug!==normalized;
 activeSlug=normalized;
 const host=ensurePanel();
 if(!host)return;
 if(changed){host.hidden=true;host.innerHTML='';}
 if(!isRoomActive())return;
 const now=Date.now();
 if(!changed&&!force&&now-lastRefresh<2500)return;
 lastRefresh=now;
 const v=++version;
 clearRetry();
 try{
  const response=await fetch('/api/fan-clubs/room/'+encodeURIComponent(normalized),{credentials:'include',cache:'no-store'});
  if(!response.ok)throw Error('Não foi possível consultar o Fanclub');
  const data=await response.json();
  if(version!==v||activeSlug!==normalized||!isRoomActive())return;
  const list=Array.isArray(data.clubs)?data.clubs:[];
  const target=ensurePanel();
  if(!target)return;
  if(!list.length){target.hidden=true;target.innerHTML='';return;}
  target.innerHTML='<span class="sf208-room-affiliation-label">♧ Esta sala faz parte de um Fan Club</span>'+
   list.map(c=>'<a class="sf208-room-club" href="#fanclub/'+encodeURIComponent(c.id)+'" data-sf208-open-club="'+esc(c.id)+'" aria-label="Visitar Fanclub '+esc(c.title)+'">'+
    '<img class="sf208-room-club-cover" src="'+esc(imageFor(c))+'" data-sf208-fallback="'+gallery.stage+'" alt="" loading="lazy" referrerpolicy="no-referrer"><span><strong>'+esc(c.title)+'</strong><small>Fãs de '+esc(c.artist)+(c.primary?' · Sala principal':'')+'</small></span><span class="sf208-room-club-cta">Visitar ›</span></button>').join('');
  target.hidden=false;
 }catch(err){
  if(version!==v||activeSlug!==normalized||!isRoomActive())return;
  // Manter o selo anterior durante uma falha temporária na consulta.
  clearRetry();
  retryTimer=setTimeout(()=>show(normalized,{force:true}),5000);
 }
}
function refresh(){
 if(activeSlug&&isRoomActive())show(activeSlug,{force:true});
}
function init(){
 ensurePanel();
 // O cabeçalho da sala pode ser remontado por outros módulos após a entrada.
 if(!observing){
  observing=true;
  const root=document.getElementById('screen-room');
  if(root){
   const observer=new MutationObserver(()=>{
    if(!isRoomActive()||!panel||panel.isConnected)return;
    if(ensurePanel()&&activeSlug)refresh();
   });
   observer.observe(root,{childList:true,subtree:true});
  }
 }
 document.addEventListener('sf71:rooms-updated',refresh);
 window.addEventListener('pageshow',refresh);
 window.addEventListener('focus',refresh);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
 // Sincroniza vínculos criados em outras abas ou por outros moderadores.
 refreshTimer=setInterval(()=>{if(!document.hidden)refresh();},30000);
 window.sf208RenderRoomClub=slug=>show(slug,{force:true});
 window.sf208RefreshRoomClub=refresh;
 window.sf208ClearRoomClub=()=>{
  version++;activeSlug='';lastRefresh=0;clearRetry();
  if(panel){panel.hidden=true;panel.innerHTML='';}
 };
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();