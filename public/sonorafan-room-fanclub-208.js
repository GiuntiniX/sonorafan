/* SonoraFan — selo de Fanclub da sala (sincronização resiliente). */
(()=>{
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 const gallery={stage:'/art-129/sonorafan-stage.svg',kpop:'/art-132/sonorafan-room-kpop.avif',rock:'/art-33/poster-rock.webp',pop:'/art-33/poster-electro.webp',indie:'/art-33/poster-indie.webp',festival:'/art-40/poster-festival.svg'};
 const validSlug=slug=>/^[a-z0-9_-]{1,100}$/i.test(String(slug||''));
 const validClubId=id=>/^[a-f0-9-]{36}$/i.test(String(id||''));
 const httpsImage=url=>{
  try{
   const u=new URL(String(url||''),location.origin);
   return (u.protocol==='https:'&& !u.username&&!u.password)?u.href:'';
  }catch(_){return '';}
 };
 function imageFor(c){
  const badge=httpsImage(c.badgeImageUrl);
  if(badge)return badge;
  if(c.coverType==='external'){
   const url=httpsImage(c.coverImageUrl);
   if(url)return url;
  }
  if(c.coverType==='gallery'&&gallery[c.coverGalleryId])return gallery[c.coverGalleryId];
  if(c.coverVersion&&validClubId(c.id))return '/api/fan-clubs/'+encodeURIComponent(c.id)+'/cover?v='+encodeURIComponent(c.coverVersion);
  return gallery[c.genre]||gallery.stage;
 }
 let panel=null,slug='',timer=0,inflight=false,revision=0,emptyChecks=0,hasBadge=false;
 const active=()=>!!document.querySelector('#screen-room.active');
 const urlSlug=()=>new URLSearchParams(location.search).get('sala')||'';
 function ensurePanel(){
  const head=document.querySelector('#screen-room .premium-chat-heading');
  if(!head)return null;
  if(!panel){
   panel=document.getElementById('sf208RoomClubs')||document.createElement('div');
   panel.id='sf208RoomClubs';
   panel.classList.add('sf208-room-clubs');
   panel.setAttribute('aria-label','Fanclubs vinculados a esta sala');
   panel.setAttribute('aria-live','polite');
   panel.hidden=true;
   panel.addEventListener('error',e=>{
    const img=e.target;
    if(img?.matches?.('img[data-sf208-fallback]')){
     const fallback=img.dataset.sf208Fallback;
     delete img.dataset.sf208Fallback;
     if(fallback&&img.getAttribute('src')!==fallback)img.src=fallback;
    }
   },true);
   panel.addEventListener('click',e=>{
    const link=e.target.closest('a[data-sf208-open-club]');
    if(!link)return;
    const id=link.dataset.sf208OpenClub;
    if(!validClubId(id))return;
    if(typeof window.sf71OpenFanClub!=='function')return; // href funciona sem JS.
    e.preventDefault();
    if(typeof window.leaveRoom==='function')window.leaveRoom();
    window.sf125Navigate?.('clubs');
    window.sf71OpenFanClub(id);
    history.replaceState(null,'',location.pathname+'#fanclub/'+encodeURIComponent(id));
   });
  }
  if(!panel.isConnected||panel.previousElementSibling!==head)head.after(panel);
  return panel;
 }
 function clearTimer(){if(timer){clearTimeout(timer);timer=0;}}
 function later(ms){
  clearTimer();
  timer=setTimeout(()=>{timer=0;if(active()&&validSlug(slug))refresh(true);},ms);
 }
 function apply(slugFromServer,clubs){
  if(!active()||slugFromServer!==slug)return;
  const host=ensurePanel();if(!host)return;
  const unique=new Map();
  for(const club of Array.isArray(clubs)?clubs:[]){
   if(!club||!validClubId(club.id))continue;
   unique.set(club.id,club);
  }
  const list=[...unique.values()];
  hasBadge=list.length>0;
  if(!list.length){
   host.hidden=true;host.replaceChildren();
   // Uma resposta vazia não confirma que o vínculo nunca existiu:
   // consultar novamente, inclusive quando se entrou antes da vinculação.
   emptyChecks++;
   later(emptyChecks<6?12000:30000);
   return;
  }
  emptyChecks=0;
  host.innerHTML='<span class="sf208-room-affiliation-label">✦ Esta sala faz parte de um Fanclub</span>'+
   list.map(c=>'<a class="sf208-room-club" href="#fanclub/'+encodeURIComponent(c.id)+'" data-sf208-open-club="'+esc(c.id)+'" aria-label="Visitar Fanclub '+esc(c.title||'')+'">'+
    '<img class="sf208-room-club-cover" src="'+esc(imageFor(c))+'" data-sf208-fallback="'+gallery.stage+'" alt="" loading="lazy" referrerpolicy="no-referrer">'+
    '<span><strong>'+esc(c.title||'Fanclub')+'</strong><small>Fãs de '+esc(c.artist||c.title||'')+(c.primary?' · Sala principal':'')+
    '</small></span><span class="sf208-room-club-cta">Visitar ›</span></a>').join('');
  host.hidden=false;
  later(30000); // reconciliação se outro usuário removeu o vínculo.
 }
 async function refresh(force=false){
  if(!active()||!validSlug(slug))return;
  ensurePanel();
  if(inflight&&!force)return;
  const requested=slug,token=++revision;
  inflight=true;
  try{
   const response=await fetch('/api/fan-clubs/room/'+encodeURIComponent(requested),{
    credentials:'include',cache:'no-store',headers:{'Accept':'application/json'}
   });
   if(!response.ok)throw Error('Falha ao consultar vínculo ('+response.status+')');
   const data=await response.json();
   if(token!==revision||requested!==slug||!active())return;
   apply(requested,data.clubs);
  }catch(e){
   if(token!==revision||requested!==slug)return;
   console.warn('[Fanclub na sala] Não foi possível consultar o vínculo:',requested,e.message);
   // Falhas de rede não apagam o último selo válido.
   later(hasBadge?15000:7000);
  }finally{if(token===revision)inflight=false;}
 }
 function show(value){
  const next=String(value||'');
  if(!validSlug(next))return;
  const changed=next!==slug;
  if(changed){
   slug=next;revision++;inflight=false;hasBadge=false;emptyChecks=0;
   clearTimer();
   const host=ensurePanel();
   if(host){host.hidden=true;host.replaceChildren();}
  }
  if(active())refresh(true);
 }
 // Eventos enviados pelo servidor ao entrar na sala ou ao alterar o vínculo.
 function receive(message){
  if(!message||!validSlug(message.slug))return;
  if(!slug&&active())slug=message.slug;
  if(message.slug!==slug||!active())return;
  revision++;inflight=false;
  apply(slug,message.clubs);
 }
 function clear(){
  slug='';revision++;inflight=false;hasBadge=false;emptyChecks=0;clearTimer();
  const host=ensurePanel();if(host){host.hidden=true;host.replaceChildren();}
 }
 function init(){
  ensurePanel();
  const root=document.getElementById('screen-room');
  if(root&&typeof MutationObserver!=='undefined'){
   const observer=new MutationObserver(()=>{
    if(!active())return;
    const attached=ensurePanel();
    if(attached&&validSlug(slug)&&!timer&&!inflight)refresh();
   });
   observer.observe(root,{subtree:true,childList:true});
  }
  document.addEventListener('sf71:rooms-updated',()=>{if(active())refresh(true);});
  window.addEventListener('focus',()=>{if(active())refresh(true);});
  window.addEventListener('pageshow',()=>{if(active()){const name=urlSlug()||slug;if(validSlug(name))show(name);}});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&active())refresh(true);});
  // Auto-recuperação: cobre entradas pela URL e navegadores que não emitiram
  // os callbacks tradicionais de joinRoom/joinedRoom.
  setInterval(()=>{
   if(!active())return;
   const current=urlSlug();
   if(validSlug(current)&&current!==slug){show(current);return;}
   if(validSlug(slug)&&!timer&&!inflight)refresh();
  },6000);
  window.sf208RenderRoomClub=show;
  window.sf208ClearRoomClub=clear;
  window.sf208RefreshRoomClub=()=>refresh(true);
  window.sf208ReceiveRoomFanclubs=receive;
  if(active()&&validSlug(urlSlug()))show(urlSlug());
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
