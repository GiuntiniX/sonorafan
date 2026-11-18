(function SonoraFanProfile108(){
 'use strict';
 const $=id=>document.getElementById(id);
 const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let avatars=[
  ['indie','Indie'],['pop','Pop'],['eletronico','Eletrônico'],['rock','Rock'],
  ['festival','Festival'],['rapper','Rap'],['jazz','Jazz'],['mpb','MPB']
 ];
 const styles=['Rock','Pop','Indie','Eletrônica','Funk','MPB','Hip-hop','Jazz','Reggae','K-pop','Clássica','Sertanejo'];
 const state={profile:null,avatar:null,selectedTab:'rooms',rooms:[],mixtapes:[],clubs:[],busy:false,
   avatarExpanded:false,avatarCategory:'all',avatarQuery:'',avatarItems:[],lastOpen:0,requestId:0,photoBusy:false};
 const modal=()=>$('sf43ProfileModal');
 const active=()=>modal()?.classList.contains('active');
 const codeAllowed=id=>/^[a-z0-9_-]{1,75}$/i.test(String(id||''));
 const imgUrl=(value)=>typeof value==='string'&&
   (/^\/avatars-108\/[a-z0-9_-]+\.svg$/.test(value)||
   /^\/api\/profile108\/photo\/[a-f0-9]{24}\?v=\d+$/.test(value));
 const greeting=()=>typeof currentUser!=='undefined'&&currentUser?.nome?currentUser.nome:'Sua vibe';
 async function api(url,init){
  const resp=await fetch(url,{credentials:'include',cache:'no-store',...(init||{})});
  const data=await resp.json().catch(()=>null);
  if(!resp.ok)throw Error(data?.error||'Não foi possível concluir a solicitação.');
  return data;
 }
 const message=(text,bad=false)=>{
  const el=$('sf108Status');
  if(el){el.textContent=text;el.dataset.error=String(!!bad);}
  else if(typeof toast==='function')toast(text,bad?'error':'success');
 };
 function move(node,to){if(node&&to)to.append(node);}
 function card(title,subtitle,id,extraClass=''){
  const el=document.createElement('section');el.className='sf108-card '+extraClass;
  if(id)el.id=id;
  el.innerHTML='<header class="sf108-card-head"><div><h3>'+title+'</h3>'+(subtitle?'<p>'+subtitle+'</p>':'')+'</div></header>';
  return el;
 }
 function build(){
  const m=modal(),body=m?.querySelector('.sf43-profile-body');
  if(!body||body.classList.contains('sf108-ready'))return;
  body.classList.add('sf108-ready');
  m.classList.add('sf108-profile');
  const hero=body.querySelector('.sf43-profile-hero');
  hero?.classList.add('sf108-hero');
  const main=body.querySelector('.sf43-profile-main'),meta=main?.querySelector('.sf43-profile-meta');
  main?.classList.add('sf108-identity');
  meta?.classList.add('sf108-identity-meta');
  main?.querySelector('.sf43-avatar-edit')?.removeAttribute('onclick');
  main?.querySelector('.sf43-avatar-edit')?.addEventListener('click',focusStudio);
  const formItems=[...(meta?.querySelectorAll('.sf43-field')||[])];
  const bioCard=card('▣ Bio musical','Um pouco sobre você e sua trilha sonora.','sf108Bio','sf108-bio');
  const edit=document.createElement('div');edit.className='sf108-bio-fields';bioCard.append(edit);
  for(const item of formItems)move(item,edit);
  const genres=document.createElement('div');genres.className='sf108-genre-area';
  genres.innerHTML='<strong>Minha vibe musical</strong><span id="sf150MusicIdentity">Selecione até 6 estilos</span>';
  move($('sf43StyleChips'),genres);bioCard.append(genres);
  const moment=card('♫ Meu momento','O que está na sua trilha sonora agora.','sf108Moment','sf108-moment');
  const track=document.createElement('div');track.id='sf108NowPlaying';moment.append(track);
  const studio=card('✧ Estúdio de avatar','Crie ou escolha um visual que represente sua vibe musical.','sf108Studio','sf108-avatar-studio');
  const content=document.createElement('div');content.className='sf108-studio-content';
  const left=document.createElement('div');left.className='sf108-studio-left';
  left.innerHTML=`<div class="sf108-avatar-summary">
       <div id="sf108AvatarPreview" class="sf108-avatar-preview" aria-label="Seu avatar atual"><span>🎧</span></div>
       <div class="sf108-avatar-summary-copy"><strong>Sua imagem atual</strong>
         <small>Esta imagem aparece no perfil, nas salas e nas comunidades.</small>
         <button type="button" id="sf108DefaultAvatar" class="sf108-text-button">Usar avatar padrão</button>
       </div>
     </div>
     <div class="sf108-avatar-choices" aria-label="Alterar imagem do perfil">
       <button type="button" id="sf108UploadButton"><b aria-hidden="true">☁</b><span><strong>Enviar minha foto</strong><small>Escolha uma imagem do seu dispositivo.</small></span><span aria-hidden="true">›</span></button>
       <button type="button" id="sf108ChooseCharacter"><b aria-hidden="true">◉</b><span><strong>Escolher personagem</strong><small>Explore os 40 avatares ilustrados.</small></span><span aria-hidden="true">›</span></button>
     </div>
     <input type="file" accept="image/jpeg,image/png,image/webp" id="sf108FileInput" hidden aria-label="Selecionar foto de avatar">`;
  const right=document.createElement('div');right.className='sf108-studio-right';
  right.innerHTML=`<div class="sf108-studio-subhead" id="sf108GalleryHeading"><strong>✦ Galeria de personagens</strong><small>Escolha livremente um visual que combine com você.</small></div>
      <div class="sf600-avatar-controls">
        <label for="sf600AvatarCategory">Estilo<select id="sf600AvatarCategory">
          <option value="all">Todos os personagens</option><option value="identity">Identidade e expressão</option>
          <option value="music">Música</option><option value="brazil">Brasil e culturas urbanas</option>
          <option value="future">Robôs e cyberpunk</option><option value="fantasy">Fantasia</option>
          <option value="creative">Criativos e tropicais</option></select></label>
        <label for="sf600AvatarSearch">Buscar personagem<input type="search" id="sf600AvatarSearch" placeholder="Robô, funk, indie, tropical…"></label>
      </div>
      <p class="sf600-avatar-count" id="sf600AvatarCount" role="status" aria-live="polite">40 personagens originais disponíveis</p>
      <div class="sf108-avatar-grid" id="sf108AvatarGrid"></div>
      <button type="button" class="sf108-gallery-more" id="sf108MoreAvatars">＋ Ver todos os personagens</button>`;
  content.append(left,right);studio.append(content);
  const mid=document.createElement('div');mid.className='sf108-duo';mid.append(bioCard,moment);
  const xp=body.querySelector('.sf50-profile-club');
  const originalStats=body.querySelector('.sf43-profile-grid');
  const accolades=card('♕ Conquistas','Seus marcos reais no SonoraFan.','sf108Achievements','sf108-achievements');
  const stats=originalStats?.querySelector('.sf43-stats'),note=$('sf43SummaryNote');
  if(stats)accolades.append(stats);
  if(note)accolades.append(note);
  const badgeBox=document.createElement('div');badgeBox.id='sf108Badges';badgeBox.className='sf108-badge-list';accolades.append(badgeBox);
  const milestones=document.createElement('div');milestones.className='sf108-duo sf108-milestones';milestones.append(accolades,xp);
  const recent=card('▱ Salas recentes & playlists','Onde você esteve e o que vale ouvir de novo.','sf108Recent','sf108-recent');
  const tabs=document.createElement('div');tabs.className='sf108-tabs';tabs.innerHTML=`<button type="button" data-sf108-tab="rooms" aria-selected="true">◷ Salas recentes</button>
   <button type="button" data-sf108-tab="mixes" aria-selected="false">♫ Playlists</button>`;
  const recentList=document.createElement('div');recentList.id='sf108RecentList';recentList.className='sf108-recent-list';
  recent.append(tabs,recentList);
  const clubs=card('♧ Meus Fan Clubs','Suas comunidades musicais em um só lugar.','sf108Clubs','sf108-clubs');
  clubs.querySelector('header').insertAdjacentHTML('beforeend','<button type="button" id="sf108CreateClub">＋ Criar Fan Club</button>');
  const clubList=document.createElement('div');clubList.id='sf108MyClubs';clubs.append(clubList);
  const quick=body.querySelector('.sf43-profile-card:has(.sf43-quick-actions)');
  if(quick){
   const details=document.createElement('details');details.className='sf108-more-actions';
   details.innerHTML='<summary>Mais atalhos e recursos da comunidade</summary>';
   move(quick,details);quick.classList.add('sf108-quick-wrapper');
   body.append(details);
  }
  const actions=body.querySelector('.sf43-profile-actions');
  const controls=document.createElement('div');controls.className='sf108-footer';controls.innerHTML=
    '<span id="sf108Status" role="status" aria-live="polite"></span>';
  if(actions)controls.append(actions);
  // Use existing dynamic XP, stats, ids and save controls; never duplicate them.
  hero?.after(main,studio,mid,milestones,recent,clubs,controls);
  originalStats?.remove();
  if(studio)renderAvatarCatalog();
  const genreList=$('sf43StyleChips');
  genreList?.addEventListener('click',event=>{
   const btn=event.target.closest('.sf43-style-chip');if(!btn)return;
   const selected=btn.classList.contains('is-on');
   if(!selected&&selectedGenres().length>=6){message('Escolha no máximo seis estilos.',true);return;}
   btn.classList.toggle('is-on',!selected);btn.setAttribute('aria-pressed',String(!selected));
  });
  document.querySelector('#sf43ProfileAvatar')?.setAttribute('aria-label','Seu avatar');
  $('sf108MoreAvatars')?.addEventListener('click',()=>{state.avatarExpanded=!state.avatarExpanded;renderAvatarCatalog();});
  $('sf600AvatarCategory')?.addEventListener('change',e=>{state.avatarCategory=e.target.value;renderAvatarCatalog();});
  $('sf600AvatarSearch')?.addEventListener('input',e=>{state.avatarQuery=String(e.target.value||'').trim().slice(0,50);renderAvatarCatalog();});
  $('sf108ChooseCharacter')?.addEventListener('click',()=>{
    window.sf112SwitchProfileTab?.('avatars');
    $('sf108GalleryHeading')?.scrollIntoView({behavior:'smooth',block:'start'});
    $('sf600AvatarSearch')?.focus({preventScroll:true});
  });
  $('sf108UploadButton')?.addEventListener('click',()=>{$('sf108FileInput')?.click();});
  $('sf108FileInput')?.addEventListener('change',onPhoto);
  $('sf108DefaultAvatar')?.addEventListener('click',()=>chooseAvatar('default'));
  $('sf108AvatarGrid')?.addEventListener('click',ev=>{
   const button=ev.target.closest('[data-sf108-avatar]');
   if(button)chooseAvatar('character',button.dataset.sf108Avatar);
  });
  $('sf108Recent')?.addEventListener('click',ev=>{
   const tab=ev.target.closest('[data-sf108-tab]');
   if(tab){state.selectedTab=tab.dataset.sf108Tab;renderRecent();return;}
   const openRoom=ev.target.closest('[data-sf108-room]');
   if(openRoom&&codeAllowed(openRoom.dataset.sf108Room)){
    window.sf43CloseProfile?.();if(typeof joinRoom==='function')joinRoom(openRoom.dataset.sf108Room);
   }
   const mix=ev.target.closest('[data-sf108-mix]');
   if(mix){window.sf43CloseProfile?.();window.sf100OpenMixtape?.(mix.dataset.sf108Mix);}
  });
  $('sf108Clubs')?.addEventListener('click',ev=>{
   if(ev.target.closest('#sf108CreateClub'))return $('sf71CreateClub')?.click();
   const b=ev.target.closest('[data-sf108-club]');
   if(b){window.sf43CloseProfile?.();window.sf107OpenFanClub?.(b.dataset.sf108Club);}
  });
  const save=actions?.querySelector('.btn-primary');
  if(save){
   save.removeAttribute('onclick');
   save.addEventListener('click',saveProfile);
  }
  // Prevent the original local-only save button from hiding server failures.
 }
 function renderAvatarCatalog(){
   const grid=$('sf108AvatarGrid');if(!grid)return;
   const entries=state.avatarItems.length?state.avatarItems:avatars.map(([id,label])=>({id,label,category:'music',description:'Personagem ilustrado original'}));
   const query=state.avatarQuery.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
   const filtered=entries.filter(a=>{
     const plain=String(a.label+' '+a.description).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
     return (state.avatarCategory==='all'||a.category===state.avatarCategory)&&(!query||plain.includes(query));
   });
   const visible=state.avatarExpanded||state.avatarCategory!=='all'||query?filtered:filtered.slice(0,8);
   grid.innerHTML=visible.map(a=>`<button type="button" data-sf108-avatar="${esc(a.id)}" class="sf108-avatar-tile"
       aria-pressed="${state.avatar?.id===a.id}" title="${esc(a.description)}">
       <img src="/avatars-108/${encodeURIComponent(a.id)}.svg" alt="${esc(a.description)}" loading="lazy">
       <span>${esc(a.label)}</span></button>`).join('')||'<p class="sf108-empty">Nenhum personagem encontrado para este filtro.</p>';
   const count=$('sf600AvatarCount');if(count)count.textContent=`${filtered.length} personagens encontrados · ${entries.length} disponíveis · qualquer pessoa pode escolher qualquer visual`;
   const more=$('sf108MoreAvatars');if(more){
     more.hidden=state.avatarCategory!=='all'||!!query||filtered.length<=8;
     more.textContent=state.avatarExpanded?'Ver menos personagens':'＋ Ver todos os personagens';
   }
 }
 async function loadAvatarCatalog(){
   try{
     const result=await api('/api/profile108/characters');
     if(!Array.isArray(result.items))throw Error('Catálogo indisponível.');
     state.avatarItems=result.items.filter(a=>a&&codeAllowed(a.id)&&typeof a.label==='string'&&typeof a.category==='string').slice(0,40);
     renderAvatarCatalog();
   }catch(e){renderAvatarCatalog();message('Usando personagens existentes. A galeria completa está temporariamente indisponível.',true);}
 }
 function focusStudio(){
  if(typeof window.sf112OpenProfile==='function'){
    window.sf112OpenProfile('avatars');
  }else if(!active()&&typeof window.sf5OpenProfile==='function'){
    window.sf5OpenProfile();
  }
  requestAnimationFrame(()=>{
    $('sf108Studio')?.scrollIntoView({behavior:'smooth',block:'start'});
    $('sf108UploadButton')?.focus({preventScroll:true});
  });
 }
 function portrait(container,avatar,fallback='🎸'){
  if(!container)return;
  if(avatar?.url && imgUrl(avatar.url)){
   const exists=container.querySelector('img');
   if(exists?.getAttribute('src')===avatar.url)return;
   const image=document.createElement('img');image.src=avatar.url;image.alt='';
   image.loading='lazy';image.decoding='async';image.referrerPolicy='no-referrer';
   image.addEventListener('error',()=>{container.textContent=fallback;},{once:true});
   container.replaceChildren(image);
  }else if(container.textContent!==fallback||container.querySelector('img'))container.textContent=fallback;
 }
 function syncAvatar(){
  const fallback=(typeof currentUser!=='undefined'&&currentUser?.avatar)||'🎸';
  portrait($('sf43ProfileAvatar'),state.avatar,fallback);
  portrait($('sf108AvatarPreview'),state.avatar,fallback);
  portrait($('userAvatar'),state.avatar,fallback);
  portrait($('sf107ProfileAvatar'),state.avatar,fallback);
  $('sf108AvatarGrid')?.querySelectorAll('[data-sf108-avatar]').forEach(b=>{
   const selected=state.avatar?.kind==='character'&&state.avatar.id===b.dataset.sf108Avatar;
   b.classList.toggle('is-on',selected);b.setAttribute('aria-pressed',String(selected));
  });
 }
 async function chooseAvatar(kind,id){
  if(state.photoBusy)return;
  state.photoBusy=true;message('Salvando seu avatar…');
  try{
   const response=await api('/api/profile108/avatar',{method:'POST',headers:{'Content-Type':'application/json'},
     body:JSON.stringify({kind,id})});
   state.avatar=response.avatar;syncAvatar();message('Avatar atualizado com sucesso!');
  }catch(err){message(err.message,true);}finally{state.photoBusy=false;}
 }
 async function compress(file){
  if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Escolha uma foto JPG, PNG ou WebP.');
  if(file.size>5*1024*1024)throw Error('A foto deve ter até 5 MB.');
  const url=URL.createObjectURL(file);
  try{
   const image=new Image();image.decoding='async';image.src=url;await image.decode();
   if(image.naturalWidth<48||image.naturalHeight<48)throw Error('Imagem muito pequena.');
   const canvas=document.createElement('canvas');canvas.width=canvas.height=320;
   const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw Error('Não foi possível processar a imagem.');
   const side=Math.min(image.naturalWidth,image.naturalHeight);
   ctx.drawImage(image,(image.naturalWidth-side)/2,(image.naturalHeight-side)/2,side,side,0,0,320,320);
   let encoded='';
   for(const quality of [.84,.74,.62,.5,.4]){
    encoded=canvas.toDataURL('image/jpeg',quality).split(',')[1]||'';
    if(encoded.length<150000)break;
   }
   if(!encoded||encoded.length>=150000)throw Error('A foto ficou muito grande. Tente outra imagem.');
   return encoded;
  }finally{URL.revokeObjectURL(url);}
 }
 async function onPhoto(ev){
  const file=ev.target.files?.[0];ev.target.value='';if(!file||state.photoBusy)return;
  state.photoBusy=true;message('Preparando e enviando sua foto…');
  try{
   const data=await compress(file);
   const res=await api('/api/profile108/avatar',{method:'POST',headers:{'Content-Type':'application/json'},
     body:JSON.stringify({kind:'photo',data})});
   state.avatar=res.avatar;syncAvatar();message('Sua foto foi salva no perfil!');
  }catch(e){message(e.message,true);}finally{state.photoBusy=false;}
 }
 function selectedGenres(){
  return [...$('sf43StyleChips')?.querySelectorAll('.sf43-style-chip.is-on')||[]].map(x=>x.dataset.style);
 }
 async function saveProfile(){
  if(state.busy)return;state.busy=true;
  const button=modal()?.querySelector('.sf43-profile-actions .btn-primary');if(button)button.disabled=true;
  const name=String($('sf43DisplayNameInput')?.value||'').trim().slice(0,40);
  const bio=String($('sf43BioInput')?.value||'').trim().slice(0,240);
  const genres=selectedGenres();
  if(name.length<2||genres.length>6){message('Use um nome com pelo menos 2 caracteres e até 6 estilos.',true);state.busy=false;if(button)button.disabled=false;return;}
  try{
   const before=state.profile||{};
   const result=await api('/api/community/profile',{method:'PATCH',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({nome:name,bio,musicGenres:genres,profileColor:before.profileColor||'#7c3aed',
       showListeningActivity:before.showListeningActivity!==false})});
   const p=result.profile;
   state.profile=p;
   if(typeof currentUser!=='undefined'&&currentUser){
    currentUser.nome=p.nome;currentUser.bio=p.bio;currentUser.musicGenres=p.musicGenres;
   }
   if(typeof myName!=='undefined')myName=p.nome;
   $('sf43ProfileName').textContent=p.nome;
   $('userDisplayName').textContent=p.nome;
   try{
    const key=typeof currentUser!=='undefined'&&currentUser?.email?'sf43_profile_'+currentUser.email:null;
    if(key)localStorage.setItem(key,JSON.stringify({displayName:p.nome,bio:p.bio,styles:p.musicGenres}));
   }catch(_){}
   message('Perfil salvo na sua conta!');window.sf43CloseProfile?.();
   if(typeof toast==='function')toast('Perfil salvo na sua conta.','success');
  }catch(e){message(e.message,true);}
  finally{state.busy=false;if(button)button.disabled=false;}
 }
 function populateProfile(p){
  if(!p)return;state.profile=p;
  if($('sf43DisplayNameInput'))$('sf43DisplayNameInput').value=p.nome||'';
  if($('sf43BioInput'))$('sf43BioInput').value=p.bio||'';
  if($('sf43ProfileName'))$('sf43ProfileName').textContent=p.nome||greeting();
  const chips=$('sf43StyleChips');
  if(chips){
   chips.innerHTML=styles.map(name=>`<button type="button" data-style="${esc(name)}"
     class="sf43-style-chip${p.musicGenres?.includes(name)?' is-on':''}" aria-pressed="${!!p.musicGenres?.includes(name)}">${esc(name)}</button>`).join('');
  }

 }
 function renderBadges(){
  const host=$('sf108Badges');if(!host)return;
  const badges=typeof myBadges!=='undefined'&&Array.isArray(myBadges)?myBadges:[];
  const identity=$('sf150MusicIdentity');
  if(identity){
    const genres=Array.isArray(state.profile?.musicGenres)?state.profile.musicGenres:[];
    identity.textContent=genres.length?genres.slice(0,3).join(' · ')+(genres.length>3?' +'+(genres.length-3)+' estilos':''):'Escolha até 6 estilos para sua identidade musical';
  }
  if(!badges.length){
   host.innerHTML='<div class="sf108-empty">Suas medalhas oficiais aparecerão aqui quando forem conquistadas. Acompanhe as missões em Minha Jornada.</div>';
   return;
  }
  const icons=['♬','♨','♧','★'];
  host.innerHTML=badges.slice(0,6).map((b,i)=>{
   const name=typeof b==='string'?b:String(b?.name||b?.title||b?.label||'Medalha');
   return `<div class="sf108-badge earned"><b>${icons[i%4]}</b><span>${esc(name)}</span></div>`;
  }).join('')+'<small class="sf108-fineprint">'+badges.length+' '+(badges.length===1?'medalha oficial':'medalhas oficiais')+' conquistadas.</small>';
 }
 function renderMoment(){
  const host=$('sf108NowPlaying');if(!host)return;
  const data=(typeof currentRoomData!=='undefined'?currentRoomData:null);
  const t=data?.queue?.[data.currentIndex||0];
  if(!t){host.innerHTML='<div class="sf108-empty"><strong>Seu próximo som está esperando</strong><p>Entre numa sala para acompanhar o que está tocando.</p></div>';return;}
  const src=/^[\w-]{11}$/.test(String(t.id||''))?'https://img.youtube.com/vi/'+encodeURIComponent(t.id)+'/mqdefault.jpg':'/art-44/vinyl-room.webp';
  host.innerHTML=`<div class="sf108-now-card"><img src="${src}" alt="" loading="lazy">
    <div><small>TOCANDO NA SALA</small><strong>${esc(t.title||'Música')}</strong><span>${esc(t.artist||'Artista')}</span>
      <span>♫ ${esc(data.name||'Sua sala')}</span></div></div>`;
 }
 function renderRecent(){
  const list=$('sf108RecentList');if(!list)return;
  $('sf108Recent')?.querySelectorAll('[data-sf108-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.sf108Tab===state.selectedTab)));
  if(state.selectedTab==='mixes'){
   list.innerHTML=state.mixtapes.length?state.mixtapes.slice(0,6).map(m=>`
     <button type="button" class="sf108-recent-card" data-sf108-mix="${esc(m.id)}">
       <img src="${/^[\w-]{11}$/.test(m.cover||'')?'https://img.youtube.com/vi/'+encodeURIComponent(m.cover)+'/mqdefault.jpg':'/art-44/vinyl-room.webp'}" loading="lazy" alt="">
       <span><strong>${esc(m.title)}</strong><small>${Number(m.trackCount)||0} músicas · Mixtape</small></span>›
     </button>`).join(''):'<div class="sf108-empty">Você ainda não salvou mixtapes. Abra o Estúdio na sala para criar uma.</div>';
   return;
  }
  const recent=(()=>{try{const v=JSON.parse(localStorage.getItem('sf107Recent')||'[]');return Array.isArray(v)?v:[];}catch(_){return [];}})();
  const byId=new Map(state.rooms.map(r=>[r.slug,r]));
  const visits=[...new Set(recent)].map(id=>byId.get(id)).filter(x=>x&&!x.isPrivate).slice(0,6);
  list.innerHTML=visits.length?visits.map((r,i)=>`<button type="button" class="sf108-recent-card" data-sf108-room="${esc(r.slug)}">
   <img src="${['/art-44/festival-crowd.webp','/art-33/poster-indie.webp','/art-44/vinyl-room.webp'][i%3]}" alt="" loading="lazy">
   <span><strong>${esc(r.name)}</strong><small>${Number(r.listenerCount)||0} ouvintes agora</small></span>›</button>`).join(''):
   '<div class="sf108-empty">Suas salas visitadas aparecerão aqui. Explore o Lobby e descubra a próxima.</div>';
 }
 function renderClubs(){
  const list=$('sf108MyClubs');if(!list)return;
  list.innerHTML=state.clubs.length?state.clubs.slice(0,6).map(c=>`
    <button type="button" class="sf108-recent-card" data-sf108-club="${esc(c.id)}">
      <span class="sf108-club-icon">♧</span>
      <span><strong>${esc(c.title)}</strong><small>${esc(c.artist)} · ${Number(c.memberCount)||0} membros</small></span>›
    </button>`).join(''):'<div class="sf108-empty">Você ainda não participa de Fan Clubs. Crie uma comunidade ou conheça as disponíveis no Lobby.</div>';
 }
 async function load(){
  const req=++state.requestId;
  message('Carregando seu perfil musical…');
  const tasks=[
   api('/api/community/profile').then(v=>{if(req===state.requestId)populateProfile(v);}),
   api('/api/profile108/avatar').then(v=>{if(req===state.requestId){state.avatar=v;syncAvatar();}}),
   loadAvatarCatalog(),
   api('/api/rooms').then(v=>{if(req===state.requestId){state.rooms=Array.isArray(v)?v:[];renderRecent();}}),
   api('/api/studio100/mixtapes').then(v=>{if(req===state.requestId){state.mixtapes=v.items||[];renderRecent();}}),
   api('/api/fan-clubs?mine=true').then(v=>{if(req===state.requestId){state.clubs=v.clubs||[];renderClubs();}})
  ];
  const results=await Promise.allSettled(tasks);
  if(req!==state.requestId)return;
  const fails=results.filter(r=>r.status==='rejected');
  if(fails.length){message(fails.length+' recurso(s) não carregaram. Seu perfil continua disponível.',true);}
  else message('');
  renderMoment();renderBadges();renderRecent();renderClubs();
 }
 function init(){
  build();
  const m=modal();if(!m)return;
  let wasOpen=m.classList.contains('active');
  new MutationObserver(()=>{
   const open=active();
   if(open&&!wasOpen){state.lastOpen=Date.now();load();}
   wasOpen=open;
  }).observe(m,{attributes:true,attributeFilter:['class']});
  // When opening from the profile icon, use the approved full-screen profile, not legacy mini form.
  const headerAvatar=$('userAvatar');
  if(headerAvatar){
   headerAvatar.addEventListener('click',event=>{
    if(!active()){event.stopImmediatePropagation();event.preventDefault();window.sf5OpenProfile?.();focusStudio();}
   },true);
  }
  window.sf108AvatarRefresh=()=>api('/api/profile108/avatar').then(v=>{state.avatar=v;syncAvatar();});
  // Refresh signed-in avatar when the login header becomes available.
  const displayName=$('userDisplayName');
  if(displayName&&typeof MutationObserver!=='undefined'){
   let last='';
   new MutationObserver(()=>{
     const name=String(displayName.textContent||'').trim();
     if(name&&name!=='Usuário'&&name!==last){
       last=name;window.sf108AvatarRefresh?.().catch(()=>{});
     }
   }).observe(displayName,{childList:true,characterData:true,subtree:true});
  }
  document.addEventListener('sf71:created',()=>{if(active())api('/api/fan-clubs?mine=true').then(v=>{state.clubs=v.clubs||[];renderClubs();}).catch(()=>{});});
  if(active())load();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();