/* SonoraFan 206 — perfil festival, dados reais, foto em destaque e navegação unificada. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=v=>Math.max(0,Number(v)||0),num=v=>n(v).toLocaleString('pt-BR');
const date=v=>{const d=new Date(Number(v));return Number.isFinite(d.getTime())?d.toLocaleString('pt-BR',{weekday:'short',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'Data não disponível';};
const art={kpop:'/art-132/sonorafan-room-kpop.avif',pop:'/art-33/poster-electro.webp',rock:'/art-33/poster-rock.webp',indie:'/art-33/poster-indie.webp',mpb:'/art-33/poster-brasil.webp',festival:'/art-41/festival-noite.webp',stage:'/art-129/sonorafan-stage.svg'};
const state={events:[],clubs:[],notices:[],profile:null,journey:null,recent:[],section:'overview',loading:false,lastLoad:0,error:'',request:0,photo:'',photoFallback:'♫',friends:[],friendQuery:'',friendResults:[],friendsFilter:'all',friendsLoading:false,friendsSearchLoading:false,friendsError:'',friendsLoaded:0,inviteRooms:[],inviteRoom:'',invitingId:null};
const isManager=c=>!!(c?.owner||c?.canModerate);
const joined=()=>state.clubs.filter(c=>c.joined||c.owner);
const managed=()=>state.clubs.filter(isManager);
const accepted=()=>state.events.filter(e=>e.going);
const upcoming=()=>accepted().filter(e=>Number(e.startAt)+(Number(e.durationMinutes)||90)*60000>Date.now()).sort((a,b)=>a.startAt-b.startAt);
const avatarSrc=()=>{
 const img=$('sf43ProfileAvatar')?.querySelector('img');
 const raw=img?.getAttribute('src')||'';
 if(!raw)return '';
 try{const u=new URL(raw,location.href);return ['http:','https:'].includes(u.protocol)?u.href:'';}catch(_){return '';}
};
function syncPhoto(){
 const src=avatarSrc();
 const photo=$('sf206Portrait');
 if(!photo)return;
 if(src){
  if(photo.dataset.src!==src){photo.dataset.src=src;photo.src=src;}
  photo.hidden=false;
  $('sf206PortraitFallback')?.setAttribute('hidden','');
 }else{
  photo.hidden=true;
  const fallback=$('sf206PortraitFallback');
  if(fallback){fallback.hidden=false;fallback.textContent=($('sf43ProfileAvatar')?.textContent||'♫').trim().slice(0,2)||'♫';}
 }
}
const getImage=item=>{
 if(item.type==='room')return art[item.genre]||art.festival;
 if(item.coverType==='external'){
  try{const u=new URL(item.coverImageUrl);if(u.protocol==='https:'&&u.hostname.includes('.')&&!u.username&&!u.password)return u.href;}catch(_){}
 }
 if(item.coverType==='gallery'){
  const m={stage:art.stage,kpop:art.kpop,pop:art.pop,rock:art.rock,indie:art.indie,brasil:art.mpb,electronic:art.pop,festival:art.festival};
  if(m[item.coverGalleryId])return m[item.coverGalleryId];
 }
 if(item.coverVersion&&/^[a-f0-9-]{36}$/i.test(String(item.clubId||item.id||'')))
  return '/api/fan-clubs/'+encodeURIComponent(item.clubId||item.id)+'/cover?v='+encodeURIComponent(item.coverVersion);
 return art[item.genre]||art.festival;
};
const image=item=>'<img src="'+esc(getImage(item))+'" data-sf206-fallback="'+art.festival+'" loading="lazy" decoding="async" referrerpolicy="no-referrer" alt="">';
const name=()=>String(state.profile?.nome||$('sf43ProfileName')?.textContent||$('userDisplayName')?.textContent||'Meu perfil').trim()||'Meu perfil';
const handle=()=>String($('sf43ProfileHandle')?.textContent||'').trim();
const bio=()=>String(state.profile?.bio||'').trim();
const genres=()=>Array.isArray(state.profile?.musicGenres)?state.profile.musicGenres.filter(Boolean):[];
const level=()=>state.journey?.level||{};
const xp=()=>state.journey?.points;
const eventId=e=>[e.type,e.clubId||e.roomSlug,e.id].join(':');
function agenda(){window.sf43CloseProfile?.();window.sf125Navigate?.('agenda')||window.sf200OpenAgenda?.();}
function move(tab){window.sf112SwitchProfileTab?.(tab);}
const eventCard=e=>'<article class="sf206-event">'+
 image(e)+'<div class="sf206-event-text"><span class="sf206-pill">'+(e.type==='fanclub'?'♧ Fan Club':'♫ Sala')+'</span>'+
 '<h3>'+esc(e.title)+'</h3><p>▦ '+esc(date(e.startAt))+'</p><p>⌖ '+esc(e.type==='fanclub'?('Fan Club: '+(e.clubName||'Comunidade')):('Sala: '+(e.roomName||'Sala musical')))+
 (e.type==='fanclub'&&e.roomSlug?' · '+esc(e.roomName||'Sala vinculada'):'')+'</p></div>'+
 '<div class="sf206-event-buttons"><button type="button" data-sf206-event="'+esc(eventId(e))+'">Ver evento</button>'+
 (e.roomSlug?'<button type="button" class="sf206-lime" data-sf206-room="'+esc(e.roomSlug)+'">▷ Entrar na sala</button>':'')+'</div></article>';
const clubCard=(c,manage=false)=>'<button class="sf206-club" type="button" data-sf206-club="'+esc(c.id)+'">'+
 image(c)+'<strong>'+esc(c.title)+'</strong><small>'+esc(c.artist||'Comunidade musical')+'</small>'+
 (manage?'<span>⚙ Gerenciar</span>':'')+'</button>';
const miniNotice=(entry,i)=>'<button type="button" class="sf206-notice" '+(entry.roomSlug?'data-sf206-room="'+esc(entry.roomSlug)+'"':entry.fanClubId?'data-sf206-club="'+esc(entry.fanClubId)+'"':'data-sf206-notices')+'>'+
 '<span>'+(i==='invite'?'✉':'▦')+'</span><span><strong>'+esc(entry.title||'Atualização SonoraFan')+'</strong><small>'+esc(entry.message||'')+'</small></span></button>';
function hero(){
 const lv=level(),points=xp(),progress=Math.min(100,Math.max(0,n(lv.progress)));
 const isXp=Number.isFinite(Number(points));
 const chips=genres().slice(0,2);
 return '<header class="sf202-profile-hero sf206-hero">'+
 '<div class="sf202-profile-identity sf206-identity"><div class="sf206-portrait" aria-label="Minha foto de perfil">'+
 '<img id="sf206Portrait" alt="Foto do perfil" hidden><span id="sf206PortraitFallback" aria-hidden="true">♫</span></div>'+
 '<div class="sf206-person"><span class="sf202-kicker">SONORAFAN · MEU PERFIL</span>'+
 '<h1>'+esc(name())+'</h1><p class="sf206-handle">'+esc(handle())+
 (lv.name?'<span class="sf206-level">'+esc(lv.icon||'✦')+' '+esc(lv.name)+'</span>':'')+'</p>'+
 '<p class="sf206-bio">'+esc(bio()||'Sua história musical começa aqui. Edite sua bio para se apresentar à comunidade.')+'</p>'+
 '<button type="button" class="sf206-genres" data-sf206-edit>♡ '+esc(chips.length?chips.join(' · '):'Definir meus artistas e estilos favoritos')+' ✎</button></div></div>'+
 '<div class="sf206-hero-actions"><button type="button" data-sf206-edit>✎ Editar perfil</button><button type="button" data-sf206-manage>⚙ Gerenciar conteúdo</button></div>'+
 '<div class="sf202-profile-stats sf206-stats">'+
 '<div><b>▦ '+num(accepted().length)+'</b><span>Eventos confirmados</span></div>'+
 '<div><b>♧ '+num(joined().length)+'</b><span>Fan Clubs que participo</span></div>'+
 '<div><b>♕ '+num(managed().length)+'</b><span>Fan Clubs que administro</span></div>'+
 '<div><b>♫ '+num(accepted().filter(e=>e.roomSlug).length)+'</b><span>Eventos com sala</span></div>'+
 '<button class="sf206-xp" type="button" data-sf206-journey><span><b>ϟ '+(isXp?num(points):'—')+'</b><small>XP musical</small></span>'+
 '<span class="sf206-xp-caption">'+esc(lv.name||'Minha jornada')+'</span>'+
 '<span class="sf206-xp-track"><span style="width:'+progress+'%"></span></span></button>'+
 '</div></header>';
}
function clubsSection(){
 const list=joined(),own=managed();
 const panel=(title,items,manage)=>'<section class="sf202-panel sf206-panel sf206-club-panel">'+
 '<header><h2>'+title+'</h2><button type="button" data-sf206-clubs>Ver todos ('+num(items.length)+') ›</button></header>'+
 (items.length?'<div class="sf206-clubs-grid">'+items.slice(0,state.section==='clubs'?24:6).map(c=>clubCard(c,manage)).join('')+'</div>':
 '<div class="sf202-profile-empty"><strong>'+(manage?'Crie seu primeiro Fan Club':'Encontre sua comunidade')+'</strong>'+
 '<p>'+(manage?'Administre seus próprios encontros e salas.':'Descubra comunidades e participe dos próximos eventos.')+'</p>'+
 '<button type="button" '+(manage?'data-sf206-create-club':'data-sf206-clubs')+'>'+(manage?'＋ Criar Fan Club':'Explorar Fan Clubs')+'</button></div>')+
 '</section>';
 return '<div class="sf202-club-columns sf206-club-columns">'+
 panel('♧ Fan Clubs que participo',list,false)+panel('♕ Fan Clubs que administro',own,true)+'</div>';
}
function suggestions(){
 const cards=[
 ['♫','Artistas favoritos','Gerencie seus estilos e preferências.','edit'],
 ['♬','Salas frequentadas','Veja seus ambientes e músicas.','library'],
 ['🏆','Conquistas','Acompanhe XP, níveis e medalhas.','journey'],
 ['▥','Sua atividade','Explore suas contribuições musicais.','dna']
 ];
 return '<section class="sf206-suggestions"><h2>ϟ Sugestões para você</h2><div class="sf206-suggestion-grid">'+
 cards.map(([ico,title,description,act])=>'<button type="button" data-sf206-suggest="'+act+'"><span>'+ico+'</span><strong>'+title+'</strong><small>'+description+'</small><i>›</i></button>').join('')+
 '</div></section>';
}
function activity(){
 const records=Array.isArray(state.journey?.recent)?state.journey.recent:[];
 const userNotifications=state.notices.filter(x=>x.type==='event'||x.type==='fanclub').slice(0,4);
 const rows=records.slice(0,3).map(x=>'<div class="sf206-activity-row"><span>✓</span><p><strong>'+esc(x.name||x.title||'Contribuição reconhecida')+'</strong>'+
 '<small>'+ (n(x.xp)?'+'+num(x.xp)+' XP · ':'')+esc(x.time?new Date(x.time).toLocaleDateString('pt-BR'):'Minha jornada')+'</small></p></div>');
 if(!rows.length)rows.push(...userNotifications.map(x=>'<div class="sf206-activity-row"><span>♧</span><p><strong>'+esc(x.title||'Notificação')+'</strong><small>'+esc(x.message||'')+'</small></p></div>'));
 return '<section class="sf202-panel sf206-panel sf206-activity"><header><h2>ϟ Atividade recente</h2><button type="button" data-sf206-journey>Ver jornada ›</button></header>'+
 (rows.length?rows.join(''):'<p class="sf206-muted">Suas atividades reconhecidas aparecerão aqui.</p>')+'</section>';
}
const validFriendId=id=>typeof id==='string'&&/^[a-f0-9]{24}$/i.test(id);
const validRoomSlug=id=>typeof id==='string'&&/^[a-z0-9_-]{1,120}$/i.test(id);
async function friendRequest(url,init){
 const response=await fetch(url,{credentials:'include',cache:'no-store',...init});
 const data=await response.json().catch(()=>null);
 if(!response.ok)throw Error(data?.error||'Não foi possível carregar seus amigos.');
 return data;
}
async function fetchFriends(force=false) {
 if(state.friendsLoading||(!force&&Date.now()-state.friendsLoaded<30000))return;
 state.friendsLoading=true;state.friendsError='';if(state.section==='friends')render();
 try{
  const data=await friendRequest('/api/social/following');
  state.friends=Array.isArray(data)?data.filter(x=>validFriendId(x.id)):[];
  state.friendsLoaded=Date.now();
 }catch(err){state.friendsError=err.message;}
 finally{state.friendsLoading=false;if(state.section==='friends')render();}
}
function friendAvatar(person) {
 const value=String(person.avatar||'🎧').trim();
 // Avatares do serviço social são emojis, não URLs verificadas.
 return '<span class="sf220-friend-avatar" aria-hidden="true">'+esc(value.slice(0,8)||'🎧')+'</span>';
}
function roomChoices(){
 return state.inviteRooms.filter(r=>validRoomSlug(r.slug)).sort((a,b)=>Number(!!b.isMine)-Number(!!a.isMine)||String(a.name).localeCompare(String(b.name),'pt-BR'));
}
async function loadInviteRooms(){
 try{
  const rooms=await friendRequest('/api/rooms');
  state.inviteRooms=Array.isArray(rooms)?rooms.filter(r=>validRoomSlug(r.slug)&&!r.isPrivate):[];
  if(!state.inviteRooms.some(r=>r.slug===state.inviteRoom))state.inviteRoom=roomChoices()[0]?.slug||'';
  if(state.section==='friends')render();
 }catch(err){state.inviteRooms=[];if(state.section==='friends')render();}
}
async function inviteFriend(id){
 if(!validFriendId(id)||!validRoomSlug(state.inviteRoom)||state.invitingId)return;
 const friend=state.friends.find(x=>x.id===id);
 const room=state.inviteRooms.find(x=>x.slug===state.inviteRoom);
 if(!friend||!room)return;
 state.invitingId=id;render();
 try{
  await friendRequest('/api/social/invite-friend',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:id,roomSlug:room.slug})});
  if(typeof window.toast==='function')window.toast('Convite enviado para '+friend.name+'!', 'success');
 }catch(err){state.friendsError=err.message;}
 finally{state.invitingId=null;render();}
}
function friendCard(person,added=true){
 const room=person.activity&&validRoomSlug(person.activity.roomSlug)?person.activity:null;
 const online=!!person.online,joined=room?.roomName||'';
 return '<article class="sf220-friend-card">'+friendAvatar(person)+
 '<div class="sf220-friend-info"><strong>'+esc(person.name||'Participante')+'</strong>'+
 '<small class="sf220-friend-status"><i class="'+(online?'is-online':'')+'"></i> '+(online?'Online':'Offline')+
 (room?' · '+esc(joined):'')+'</small>'+
 (person.bio?'<p>'+esc(person.bio)+'</p>':'')+'</div>'+
 '<div class="sf220-friend-actions">'+
 (added?'<button type="button" data-sf220-dm="'+esc(person.id)+'" data-sf220-name="'+esc(person.name||'Participante')+'">✉ Conversar</button>':'')+
 (added&&room?'<button class="sf220-join" type="button" data-sf220-room="'+esc(room.roomSlug)+'">▶ Entrar na sala</button>':'')+
 (added&&state.inviteRoom?'<button type="button" data-sf220-invite="'+esc(person.id)+'"'+(state.invitingId===person.id?' disabled':'')+'>♬ '+(state.invitingId===person.id?'Enviando…':'Convidar')+'</button>':'')+
 '<button class="sf220-manage" type="button" data-sf220-follow="'+esc(person.id)+'" data-sf220-value="'+(added?'remove':'add')+'">'+(added?'Remover':'＋ Adicionar amigo')+'</button>'+
 '</div></article>';
}
function friendsPanel(){
 let friends=state.friends.slice();
 if(state.friendsFilter==='online')friends=friends.filter(x=>x.online);
 if(state.friendsFilter==='inroom')friends=friends.filter(x=>x.activity&&validRoomSlug(x.activity.roomSlug));
 const online=state.friends.filter(x=>x.online).length;
 return '<section class="sf202-panel sf206-panel sf220-friends">'+
 '<header><div><h2>♡ Meus amigos</h2><p>Converse em particular ou encontre quem está ouvindo música agora.</p></div>'+
 '<span class="sf220-counter">'+state.friends.length+' adicionados · '+online+' online</span></header>'+
 '<div class="sf220-friend-controls"><div class="sf220-chips" role="group" aria-label="Filtrar amigos">'+
 [['all','Todos'],['online','Online'],['inroom','Em uma sala']].map(([id,label])=>
 '<button type="button" data-sf220-filter="'+id+'" aria-pressed="'+(state.friendsFilter===id)+'">'+label+'</button>').join('')+
 '</div><button type="button" data-sf220-refresh>↻ Atualizar</button></div>'+
 '<div class="sf220-invite-select"><label for="sf220InviteRoom">Convidar para ouvir junto em</label><select id="sf220InviteRoom" aria-label="Selecionar sala pública para convidar amigo">'+
 (roomChoices().length?roomChoices().map(r=>'<option value="'+esc(r.slug)+'"'+(state.inviteRoom===r.slug?' selected':'')+'>'+esc(r.name||r.slug)+'</option>').join(''):'<option value="">Não há salas públicas disponíveis</option>')+
 '</select></div>'+
 (state.friendsError?'<p class="sf220-error" role="alert">'+esc(state.friendsError)+'</p>':'')+
 (state.friendsLoading?'<p class="sf206-muted">Atualizando seus amigos…</p>':'')+
 '<div class="sf220-friend-list">'+(friends.length?friends.map(x=>friendCard(x)).join(''):
 '<div class="sf220-empty"><strong>Nenhum amigo nesta visualização</strong><p>Adicione pessoas pelo chat ou encontre alguém abaixo.</p></div>')+'</div>'+
 '<form class="sf220-find-form" id="sf220FriendSearchForm"><label for="sf220FriendSearch">Encontrar pessoas</label>'+
 '<div><input id="sf220FriendSearch" maxlength="40" minlength="2" placeholder="Digite um nome ou nickname" value="'+esc(state.friendQuery)+'" autocomplete="off">'+
 '<button type="submit"'+(state.friendsSearchLoading?' disabled':'')+'>Buscar</button></div></form>'+
 '<div class="sf220-friend-search-results" aria-live="polite">'+
 state.friendResults.filter(x=>!state.friends.some(f=>f.id===x.id)).map(x=>friendCard(x,false)).join('')+'</div>'+
 '<p class="sf220-privacy">A localização em salas aparece apenas quando a pessoa permite compartilhar sua atividade e está em uma sala pública.</p>'+
 '</section>';
}
async function searchFriends(query){
 state.friendQuery=query.trim().slice(0,40);
 if(state.friendQuery.length<2){state.friendResults=[];state.friendsError='Digite pelo menos 2 caracteres.';render();return;}
 state.friendsSearchLoading=true;state.friendsError='';render();
 try{const data=await friendRequest('/api/social/search?q='+encodeURIComponent(state.friendQuery));state.friendResults=Array.isArray(data)?data.filter(x=>validFriendId(x.id)):[];}
 catch(err){state.friendsError=err.message;}
 finally{state.friendsSearchLoading=false;render();}
}
async function changeFriend(id,add) {
 if(!validFriendId(id))return;
 try{
  await friendRequest('/api/social/follow',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,follow:add})});
  state.friendsLoaded=0;
  await fetchFriends(true);
  state.friendResults=state.friendResults.filter(x=>add?x.id!==id:true);
  render();
 }catch(err){state.friendsError=err.message;render();}
}
function render(){
 const host=$('sf202ProfileOverview');if(!host)return;
 const upcomingEvents=upcoming(),invitations=state.notices.filter(x=>x.type==='invite'&&!x.read).slice(0,3);
 const sec=state.section;
 host.innerHTML=hero()+
 '<nav class="sf202-profile-nav sf206-nav" aria-label="Áreas do Meu Perfil">'+
 [['overview','▦ Visão geral'],['events','▦ Eventos'],['clubs','♧ Fan Clubs'],['friends','♡ Amigos'],['reminders','♧ Lembretes'],['activity','ϟ Atividade']].map(([id,label])=>
 '<button type="button" data-sf206-section="'+id+'" aria-pressed="'+(sec===id)+'" class="'+(sec===id?'active':'')+'">'+label+'</button>').join('')+
 '</nav>'+
 (state.error?'<p class="sf202-profile-error" role="alert">'+esc(state.error)+' <button type="button" data-sf206-reload>Tentar novamente</button></p>':'')+
 '<div class="sf202-profile-columns sf206-layout"><div class="sf202-profile-main">'+
 ((sec==='overview'||sec==='events')?'<section class="sf202-panel sf206-panel"><header><h2>▦ Próximos eventos confirmados</h2><button type="button" data-sf206-agenda>Ver toda a agenda ›</button></header>'+
 (upcomingEvents.length?upcomingEvents.slice(0,sec==='events'?30:3).map(eventCard).join(''):
 '<div class="sf202-profile-empty"><strong>Seu próximo evento começa aqui</strong><p>Confirme presença na Agenda Musical para encontrar seus próximos encontros.</p><button type="button" data-sf206-agenda>Explorar eventos</button></div>')+'</section>':'')+
 ((sec==='overview'||sec==='clubs')?clubsSection():'')+
 ((sec==='friends')?friendsPanel():'')+
 ((sec==='overview'||sec==='activity')?suggestions():'')+
 ((sec==='reminders')?'<section class="sf202-panel sf206-panel"><header><h2>▦ Meus próximos lembretes</h2></header>'+
 (upcomingEvents.length?upcomingEvents.map(eventCard).join(''):'<p class="sf206-muted">Nenhum evento futuro confirmado.</p>')+'</section>':'')+
 ((sec==='activity')?activity():'')+
 '</div><aside class="sf202-profile-aside">'+
 '<section class="sf202-panel sf206-panel sf206-aside"><header><h2>♧ Lembretes</h2><button type="button" data-sf206-agenda>Ver todos ›</button></header>'+
 (upcomingEvents.length?upcomingEvents.slice(0,3).map(e=>'<button class="sf206-notice" type="button" data-sf206-event="'+esc(eventId(e))+'"><span>▦</span><span><strong>'+esc(e.title)+'</strong><small>'+esc(date(e.startAt))+'</small></span></button>').join(''):'<p class="sf206-muted">Nenhum evento confirmado para os próximos dias.</p>')+'</section>'+
 '<section class="sf202-panel sf206-panel sf206-aside"><header><h2>✉ Convites</h2><button type="button" data-sf206-notices>Ver todos ›</button></header>'+
 (invitations.length?invitations.map(i=>miniNotice(i,'invite')).join(''):'<p class="sf206-muted">Novos convites aparecerão aqui.</p>')+'</section>'+
 activity()+
 '<section class="sf202-panel sf206-panel sf206-quick"><header><h2>ϟ Ações rápidas</h2></header><div>'+
 [['▦','Criar evento','create-event'],['♧','Criar Fan Club','create-club'],['♫','Criar sala','create-room']].map(([ico,name,act])=>
 '<button type="button" data-sf206-action="'+act+'"><span>'+ico+'</span><strong>'+name+'</strong></button>').join('')+
 '</div></section></aside></div>';
 syncPhoto();
}
async function load(force=false){
 if(state.loading)return;
 if(!force&&Date.now()-state.lastLoad<28000){render();return;}
 state.loading=true;state.error='';render();const request=++state.request;
 const queries=[
 ['/api/music-agenda',v=>state.events=Array.isArray(v.events)?v.events:[]],
 ['/api/fan-clubs?mine=true',v=>state.clubs=Array.isArray(v.clubs)?v.clubs:[]],
 ['/api/social/notifications',v=>state.notices=Array.isArray(v)?v:[]],
 ['/api/community/profile',v=>state.profile=v&&typeof v==='object'?v:null],
 ['/api/ranking60/me',v=>state.journey=v&&typeof v==='object'?v:null]
 ];
 const result=await Promise.allSettled(queries.map(async([url,assign])=>{
  const r=await fetch(url,{credentials:'include',cache:'no-store'});
  if(!r.ok)throw Error('Serviço indisponível');
  const value=await r.json();if(state.request===request)assign(value);
 }));
 if(state.request!==request)return;
 state.loading=false;state.lastLoad=Date.now();
 state.error=result.some(x=>x.status==='rejected')?'Alguns dados não puderam ser carregados. Os demais continuam disponíveis.':'';
 render();
}
function navigateAgenda(){window.sf43CloseProfile?.();if(typeof window.sf125Navigate==='function')window.sf125Navigate('agenda');else window.sf200OpenAgenda?.();}
function navigateClub(id){window.sf43CloseProfile?.();window.sf107OpenFanClub?.(id);}
function navigateAction(name){
 if(name==='create-event'){window.sf43CloseProfile?.();window.sf125Navigate?.('agenda');window.sf200CreateEvent?.();return;}
 if(name==='create-club'){window.sf43CloseProfile?.();window.sf125Navigate?.('create-club');return;}
 if(name==='create-room'){window.sf43CloseProfile?.();window.showCreateRoom?.();return;}
}
function init(){
 const host=$('sf202ProfileOverview');if(!host)return;
 host.addEventListener('click',e=>{
  const btn=e.target.closest('button');if(!btn)return;
  const d=btn.dataset;
  if(d.sf206Section){state.section=d.sf206Section;render();if(state.section==='friends'){fetchFriends();loadInviteRooms();}return;}
  if(d.sf220Filter){state.friendsFilter=d.sf220Filter;render();return;}
  if('sf220Refresh'in d){fetchFriends(true);return;}
  if(d.sf220Invite&&validFriendId(d.sf220Invite)){inviteFriend(d.sf220Invite);return;}
  if(d.sf220Dm&&validFriendId(d.sf220Dm)){window.sf43CloseProfile?.();window.sf53OpenInbox?.(d.sf220Dm,d.sf220Name||'Participante');return;}
  if(d.sf220Room&&validRoomSlug(d.sf220Room)){window.sf43CloseProfile?.();window.joinRoom?.(d.sf220Room);return;}
  if(d.sf220Follow&&validFriendId(d.sf220Follow)){changeFriend(d.sf220Follow,d.sf220Value==='add');return;}
  if('sf206Edit'in d){move('profile');return;}
  if('sf206Manage'in d){state.section='clubs';render();return;}
  if('sf206Clubs'in d){window.sf43CloseProfile?.();window.sf125Navigate?.('clubs');return;}
  if('sf206CreateClub'in d){navigateAction('create-club');return;}
  if('sf206Journey'in d){move('achievements');return;}
  if('sf206Agenda'in d){navigateAgenda();return;}
  if('sf206Notices'in d){window.sf43CloseProfile?.();window.sf15OpenNotifications?.();return;}
  if(d.sf206Club){navigateClub(d.sf206Club);return;}
  if(d.sf206Event){navigateAgenda();window.sf200OpenEvent?.(d.sf206Event);return;}
  if(d.sf206Room){window.sf43CloseProfile?.();window.joinRoom?.(d.sf206Room);return;}
  if(d.sf206Action){navigateAction(d.sf206Action);return;}
  if(d.sf206Suggest){const routes={edit:'profile',library:'library',journey:'achievements',dna:'dna'};move(routes[d.sf206Suggest]||'profile');return;}
  if('sf206Reload'in d){load(true);}
 });
 host.addEventListener('change',e=>{if(e.target?.id==='sf220InviteRoom')state.inviteRoom=e.target.value;});
 host.addEventListener('submit',e=>{if(e.target?.id==='sf220FriendSearchForm'){e.preventDefault();searchFriends($('sf220FriendSearch')?.value||'');}});
 host.addEventListener('error',e=>{
  const img=e.target;
  if(img?.id==='sf206Portrait'){img.hidden=true;$('sf206PortraitFallback')?.removeAttribute('hidden');return;}
  if(img?.matches?.('img[data-sf206-fallback]')){img.src=img.dataset.sf206Fallback;delete img.dataset.sf206Fallback;}
 },true);
 const photo=$('sf43ProfileAvatar');
 if(photo)new MutationObserver(()=>{if($('sf202ProfileOverview')&&!host.hidden)syncPhoto();}).observe(photo,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
 window.sf202RefreshProfile=(force=false)=>{if(force)state.lastLoad=0;load(force);};
 const modal=$('sf43ProfileModal');
 if(modal)new MutationObserver(()=>{
  if(modal.classList.contains('active')&&modal.classList.contains('sf112-tab-overview'))load();
 }).observe(modal,{attributes:true,attributeFilter:['class']});
 render();
 if(modal?.classList.contains('active'))load();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();