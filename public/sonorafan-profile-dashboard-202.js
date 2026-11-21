/* SonoraFan 202 — unified, real-data profile and fan-club membership dashboard */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const state={events:[],clubs:[],notifications:[],error:'',loading:false,section:'overview',last:0,request:0};
 const genreArt={kpop:'/art-132/sonorafan-room-kpop.avif',pop:'/art-33/poster-electro.webp',rock:'/art-33/poster-rock.webp',indie:'/art-33/poster-indie.webp',mpb:'/art-33/poster-brasil.webp'};
 const getImage=item=>{
   if(item.type==='room')return genreArt[item.genre]||'/art-44/festival-crowd.webp';
   if(item.coverType==='external'){
     try{const u=new URL(item.coverImageUrl);if(u.protocol==='https:'&&u.hostname.includes('.'))return u.href;}catch(_){}
   }
   if(item.coverType==='gallery'){
     const gallery={stage:'/art-129/sonorafan-stage.svg',kpop:genreArt.kpop,pop:genreArt.pop,rock:genreArt.rock,indie:genreArt.indie,
      brasil:genreArt.mpb,electronic:genreArt.pop,festival:'/art-40/poster-festival.svg'};
     if(gallery[item.coverGalleryId])return gallery[item.coverGalleryId];
   }
   if(item.coverVersion&&/^[a-f0-9-]{36}$/i.test(String(item.clubId||item.id)))return '/api/fan-clubs/'+encodeURIComponent(item.clubId||item.id)+'/cover?v='+encodeURIComponent(item.coverVersion);
   return genreArt[item.genre]||'/art-44/festival-crowd.webp';
 };
 const image=item=>'<img src="'+esc(getImage(item))+'" alt="" loading="lazy" referrerpolicy="no-referrer" data-sf202-fallback="/art-44/festival-crowd.webp">';
 const when=ms=>new Intl.DateTimeFormat('pt-BR',{weekday:'short',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(ms));
 const upcoming=()=>state.events.filter(e=>e.going&&Number(e.startAt)+Math.max(30,Number(e.durationMinutes)||90)*60000>Date.now()).sort((a,b)=>a.startAt-b.startAt);
 const accepted=()=>state.events.filter(e=>e.going);
 const managed=()=>state.clubs.filter(c=>c.canModerate||c.owner);
 const member=()=>state.clubs.filter(c=>c.joined||c.owner);
 const name=()=>String($('sf43ProfileName')?.textContent||$('userDisplayName')?.textContent||'Meu perfil').trim()||'Meu perfil';
 const goAgenda=()=>{window.sf43CloseProfile?.();if(typeof window.sf125Navigate==='function')window.sf125Navigate('agenda');else window.sf200OpenAgenda?.();};
 const clubBtn=(c,manage=false)=>'<button type="button" class="sf202-club-tile" data-sf202-club="'+esc(c.id)+'">'+image(c)+
  '<strong>'+esc(c.title)+'</strong><small>'+esc(c.artist||'Artista')+'</small><span>'+ (manage?'⚙ Gerenciar':'♧ Ver comunidade')+'</span></button>';
 const eventBtn=e=>'<article class="sf202-personal-event">'+image(e)+'<div class="sf202-personal-info"><span class="sf202-mini-badge">'+(e.type==='fanclub'?'♧ Fan Club':'♫ Sala')+'</span><h3>'+esc(e.title)+'</h3>'+
  '<p>▦ '+esc(when(Number(e.startAt)))+'</p><p>'+esc(e.type==='fanclub'?('Fan Club: '+e.clubName):('Sala: '+e.roomName))+
  (e.roomSlug?' · '+esc(e.roomName||'Sala vinculada'):'')+'</p></div>'+
  '<div class="sf202-personal-actions"><button type="button" data-sf202-event="'+esc(e.type+':'+(e.clubId||e.roomSlug)+':'+e.id)+'">Ver evento</button>'+
  (e.roomSlug?'<button type="button" class="sf202-bright" data-sf202-room="'+esc(e.roomSlug)+'">♫ Entrar na sala</button>':'<button type="button" class="sf202-bright" data-sf202-agenda>Ver agenda</button>')+'</div></article>';
 function render(){
   const host=$('sf202ProfileOverview');if(!host)return;
   const events=upcoming(),joined=member(),admin=managed(),section=state.section,all=state.clubs;
   const invites=state.notifications.filter(n=>n.type==='invite'&&!n.read).slice(0,3),updates=state.notifications.filter(n=>n.type==='event'||n.type==='fanclub').slice(0,4);
   host.innerHTML='<div class="sf202-profile-hero"><div class="sf202-profile-identity">'+
     '<div><span class="sf202-kicker">SONORAFAN · MEU PERFIL</span><h1>'+esc(name())+'</h1>'+
     '<p>Minha agenda, meus Fan Clubs e minhas salas em um só lugar.</p></div></div>'+
     '<button type="button" data-sf202-edit>✎ Editar perfil</button>'+
     '<div class="sf202-profile-stats">'+
     '<div><b>▦ '+accepted().length+'</b><span>Eventos confirmados</span></div>'+
     '<div><b>♧ '+all.filter(c=>c.joined||c.owner).length+'</b><span>Fan Clubs que participo</span></div>'+
     '<div><b>♕ '+admin.length+'</b><span>Fan Clubs que administro</span></div>'+
     '<div><b>♫ '+events.filter(e=>e.roomSlug).length+'</b><span>Eventos com sala</span></div></div></div>'+
     '<nav class="sf202-profile-nav" aria-label="Filtros da visão geral">'+
     (section!=='overview'?'<button type="button" class="sf202-return-all" data-sf202-section="overview">← Mostrar tudo</button>':'')+
     [['events','▦ Eventos confirmados'],['clubs','♧ Meus Fan Clubs'],['reminders','♧ Lembretes']].map(([id,title])=>
      '<button type="button" data-sf202-section="'+id+'" aria-pressed="'+(section===id)+'" class="'+(section===id?'active':'')+'">'+title+'</button>').join('')+'</nav>'+
     (state.error?'<p class="sf202-profile-error" role="alert">'+esc(state.error)+' <button type="button" data-sf202-refresh>Atualizar</button></p>':'')+
     (state.loading?'<p class="sf202-profile-loading" role="status">Atualizando suas comunidades e eventos...</p>':'')+
     '<div class="sf202-profile-columns"><div class="sf202-profile-main">'+
     (section==='overview'||section==='events'?'<section class="sf202-panel"><header><h2>▦ Próximos eventos confirmados</h2><button type="button" data-sf202-agenda>Ver toda a agenda ›</button></header>'+
       (events.length?events.slice(0,section==='events'?40:5).map(eventBtn).join(''):'<div class="sf202-profile-empty"><strong>Seu próximo encontro começa aqui</strong><p>Confirme presença em algum evento da Agenda Musical para encontrá-lo nesta seção.</p><button type="button" data-sf202-agenda>Explorar eventos</button></div>')+'</section>':'')+
     (section==='overview'||section==='clubs'?'<div class="sf202-club-columns"><section class="sf202-panel"><header><h2>♧ Fan Clubs de que faço parte</h2><span>'+joined.length+' comunidades</span></header>'+
      '<div class="sf202-club-grid">'+(joined.length?joined.map(c=>clubBtn(c)).join(''):'<div class="sf202-profile-empty"><strong>Encontre sua comunidade</strong><p>As comunidades em que você participa aparecerão aqui, incluindo as que administra.</p><button type="button" data-sf202-discover>Descobrir Fan Clubs</button></div>')+'</div></section>'+
      '<section class="sf202-panel"><header><h2>♕ Fan Clubs que administro</h2><span>'+admin.length+' comunidades</span></header>'+
      '<div class="sf202-club-grid">'+(admin.length?admin.map(c=>clubBtn(c,true)).join(''):'<div class="sf202-profile-empty"><strong>Crie sua comunidade</strong><p>Você ainda não administra Fan Clubs.</p><button type="button" data-sf202-create-club>＋ Criar Fan Club</button></div>')+'</div></section></div>':'')+
     (section==='reminders'?'<section class="sf202-panel"><header><h2>♧ Seus próximos lembretes</h2></header><div class="sf202-profile-empty">Os eventos confirmados com horário futuro ficam disponíveis aqui, com acesso à sala vinculada.</div></section>':'')+
     '</div><aside class="sf202-profile-aside">'+
     '<section class="sf202-panel sf202-reminder"><header><h2>♧ Lembretes</h2><button type="button" data-sf202-agenda>Ver todos ›</button></header>'+
     (events.length?events.slice(0,5).map(e=>'<button type="button" data-sf202-agenda><span>▦</span><strong>'+esc(e.title)+'</strong><small>'+esc(when(e.startAt))+'</small></button>').join(''):'<p>Confirme presença em um evento para vê-lo aqui.</p>')+'</section>'+
     '<section class="sf202-panel sf202-reminder"><header><h2>✉ Convites</h2><button type="button" data-sf202-notices>Ver todos ›</button></header>'+
     (invites.length?invites.map(n=>'<button type="button" '+(n.roomSlug?'data-sf202-room="'+esc(n.roomSlug)+'"':'data-sf202-notices')+'><span>✉</span><strong>'+esc(n.title||'Convite SonoraFan')+'</strong><small>'+esc(n.message||'Você recebeu um convite.')+'</small></button>').join(''):'<p>Novos convites aparecerão aqui.</p>')+'</section>'+
     '<section class="sf202-panel sf202-reminder"><header><h2>♧ Próximas notificações</h2><button type="button" data-sf202-notices>Ver todas ›</button></header>'+
     (updates.length?updates.map(n=>'<button type="button" '+(n.roomSlug?'data-sf202-room="'+esc(n.roomSlug)+'"':n.fanClubId?'data-sf202-club="'+esc(n.fanClubId)+'"':'data-sf202-notices')+'><span>▦</span><strong>'+esc(n.title||'Atualização')+'</strong><small>'+esc(n.message||'')+'</small></button>').join(''):'<p>Você está em dia com suas notificações.</p>')+'</section>'+
     '<section class="sf202-panel sf202-profile-shortcuts"><header><h2>✦ Acesso rápido</h2></header><button type="button" data-sf202-agenda>▦ Abrir Agenda Musical</button>'+
     '<button type="button" data-sf202-discover>♧ Descobrir Fan Clubs</button><button type="button" data-sf202-create-club>＋ Criar Fan Club</button></section>'+
     '</aside></div>';

 }
 async function load(){
   const current=++state.request,host=$('sf202ProfileOverview');if(!host)return;
   if(state.loading)return;
   state.loading=true;render();
   const tasks=await Promise.allSettled([
    fetch('/api/music-agenda',{credentials:'include',cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('Agenda indisponível');return r.json();}),
    fetch('/api/fan-clubs?mine=true',{credentials:'include',cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('Fan Clubs indisponíveis');return r.json();}),
     fetch('/api/social/notifications',{credentials:'include',cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('Notificações indisponíveis');return r.json();})
   ]);
   if(current!==state.request)return;
   if(tasks[0].status==='fulfilled')state.events=Array.isArray(tasks[0].value.events)?tasks[0].value.events:[];
   if(tasks[1].status==='fulfilled')state.clubs=Array.isArray(tasks[1].value.clubs)?tasks[1].value.clubs:[];
   if(tasks[2].status==='fulfilled')state.notifications=Array.isArray(tasks[2].value)?tasks[2].value:[];
   state.error=tasks.some(t=>t.status==='rejected')?'Algumas informações não foram carregadas.':'';
   state.loading=false;state.last=Date.now();render();
 }
 function init(){
  const root=$('sf202ProfileOverview');if(!root)return;
  root.addEventListener('click',e=>{
   const btn=e.target.closest('button');if(!btn)return;
   if(btn.dataset.sf202Section){state.section=btn.dataset.sf202Section;render();return;}
   if(btn.hasAttribute('data-sf202-refresh')){load();return;}
   if(btn.hasAttribute('data-sf202-notices')){window.sf43CloseProfile?.();window.sf15OpenNotifications?.();return;}
   if(btn.hasAttribute('data-sf202-edit')){window.sf112SwitchProfileTab?.('profile');return;}
   if(btn.hasAttribute('data-sf202-event')){goAgenda();window.sf200OpenEvent?.(btn.dataset.sf202Event);return;}
   if(btn.hasAttribute('data-sf202-agenda')){goAgenda();return;}
   if(btn.hasAttribute('data-sf202-room')){const slug=btn.dataset.sf202Room;window.sf43CloseProfile?.();window.joinRoom?.(slug);return;}
   if(btn.hasAttribute('data-sf202-club')){const id=btn.dataset.sf202Club;window.sf43CloseProfile?.();window.sf107OpenFanClub?.(id);return;}
   if(btn.hasAttribute('data-sf202-discover')){window.sf43CloseProfile?.();window.sf107OpenFanClub?.();return;}
   if(btn.hasAttribute('data-sf202-create-club')){window.sf43CloseProfile?.();window.sf125Navigate?.('create-club');}
  });
  root.addEventListener('error',e=>{const img=e.target;if(img?.matches?.('img[data-sf202-fallback]')){img.src=img.dataset.sf202Fallback;delete img.dataset.sf202Fallback;}},true);
  window.sf202RefreshProfile=(force=false)=>{if(state.loading)return;if(force||Date.now()-state.last>25000)load();else render();};
  const modal=$('sf43ProfileModal');
  modal&&new MutationObserver(()=>{if(modal.classList.contains('active')&&modal.classList.contains('sf112-tab-overview'))window.sf202RefreshProfile();}).observe(modal,{attributes:true,attributeFilter:['class']});
  render();if(modal?.classList.contains('active'))load();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
