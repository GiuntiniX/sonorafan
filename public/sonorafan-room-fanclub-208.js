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

async function show(slug){
 const host=$('sf208RoomClubs');if(!host)return;
 const v=++version;host.hidden=true;host.innerHTML='';
 if(!/^[a-z0-9_-]{1,100}$/i.test(String(slug||'')))return;
 try{
  const r=await fetch('/api/fan-clubs/room/'+encodeURIComponent(slug),{credentials:'include',cache:'no-store'});
  if(!r.ok)throw Error('indisponível');
  const data=await r.json();
  if(version!==v||!document.querySelector('#screen-room.active'))return;
  const list=Array.isArray(data.clubs)?data.clubs:[];
  if(!list.length)return;
  host.innerHTML='<span class="sf208-room-affiliation-label">♧ Esta sala faz parte de um Fan Club</span>'+
   list.map(c=>'<button type="button" class="sf208-room-club" data-sf208-open-club="'+esc(c.id)+'">'+
    '<img class="sf208-room-club-cover" src="'+esc(imageFor(c))+'" data-sf208-fallback="'+gallery.stage+'" alt="" loading="lazy" referrerpolicy="no-referrer"><span><strong>'+esc(c.title)+'</strong><small>Fãs de '+esc(c.artist)+(c.primary?' · Sala principal':'')+'</small></span><span class="sf208-room-club-cta">Visitar ›</span></button>').join('');
  host.hidden=false;
 }catch(_){host.hidden=true;}
}
function init(){
 const head=document.querySelector('#screen-room .premium-chat-heading');
 if(!head)return;
 const panel=document.createElement('div');panel.id='sf208RoomClubs';panel.className='sf208-room-clubs';panel.setAttribute('aria-label','Fan Clubs vinculados a esta sala');panel.hidden=true;
 head.after(panel);
 panel.addEventListener('error',e=>{
  const img=e.target;if(img?.matches?.('img[data-sf208-fallback]')){img.src=img.dataset.sf208Fallback;delete img.dataset.sf208Fallback;}
 },true);
 panel.addEventListener('click',e=>{
  const b=e.target.closest('[data-sf208-open-club]');if(!b)return;
  const id=b.dataset.sf208OpenClub;
  if(typeof window.leaveRoom==='function')window.leaveRoom();
  window.sf125Navigate?.('clubs');
  window.sf71OpenFanClub?.(id);
 });
 window.sf208RenderRoomClub=show;
 window.sf208ClearRoomClub=()=>{version++;panel.hidden=true;panel.innerHTML='';};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();