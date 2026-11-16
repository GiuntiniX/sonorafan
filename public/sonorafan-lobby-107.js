(function SonoraFanLobby107(){
  'use strict';
  const $=id=>document.getElementById(id);
  const app=()=>document.getElementById('screen-lobby');
  const active=()=>!!app()?.classList.contains('active');
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const count=x=>Math.max(0,Number(x)||0);
  const fmt=x=>count(x).toLocaleString('pt-BR');
  const valid=x=>typeof x==='string'&&/^[a-z0-9][a-z0-9_-]{0,100}$/i.test(x);
  const yt=x=>typeof x==='string'&&/^[a-zA-Z0-9_-]{11}$/.test(x);
  const art={crowd:'/art-44/festival-crowd.webp',stage:'/art-44/festival-stage.webp',
    festival:'/art-41/festival-noite.webp',vinyl:'/art-44/vinyl-room.webp',
    record:'/art-44/record-collage.webp',indie:'/art-33/poster-indie.webp',
    rock:'/art-33/poster-rock.webp',pop:'/art-40/poster-pop.svg',
    electro:'/art-33/poster-electro.webp',brasil:'/art-33/poster-brasil.webp'};
  const styles=[['indie','✿','Indie',art.indie],['rock','♬','Rock',art.rock],
    ['pop','✦','Pop',art.pop],['mpb','☼','MPB',art.brasil],
    ['eletronica','▥','Eletrônica',art.electro],
    ['alternativo','◇','Alternativo',art.record],['festival','♛','Festivais',art.festival]];
  const state={rooms:null,events:[],clubs:[],notices:[],pinned:[],recent:[],search:'',genre:'',
    all:false,sort:'popular',signature:'',lastRooms:0,lastExtras:0};
  const allRooms=()=>Array.isArray(state.rooms)?state.rooms.filter(r=>r&&!r.isPrivate&&valid(r.slug)):[];
  const ranked=()=>allRooms().slice().sort((a,b)=>count(b.listenerCount)-count(a.listenerCount)||Number(!!b.isPlaying)-Number(!!a.isPlaying));
  const lead=()=>ranked()[0]||null;
  function imageFor(r,i=0){
    const n=norm([r.name,r.description,r.roomTheme,r.emoji].filter(Boolean).join(' '));
    if(/festival|festa|show|lolla/.test(n))return art.festival;
    if(/rock|metal|guitar/.test(n))return art.rock;
    if(/indie|alternativo/.test(n))return art.indie;
    if(/eletron|techno|house|dance/.test(n))return art.electro;
    if(/mpb|brasil|samba|pagode|funk|rap/.test(n))return art.brasil;
    if(/pop|hits|diva/.test(n))return art.pop;
    if(/vinil|classico|retro/.test(n))return art.vinyl;
    return [art.crowd,art.stage,art.vinyl,art.record][i%4];
  }
  const genreFor=r=>{
    const n=norm([r.name,r.description,r.roomTheme].join(' '));
    return styles.find(([k,,label])=>n.includes(k)||n.includes(norm(label)))?.[2]||'Sala colaborativa';
  };
  function getFiltered(){
    const filtered=allRooms().filter(r=>{
      const n=norm([r.name,r.description,r.roomTheme,r.currentTrack?.artist].filter(Boolean).join(' '));
      const genre=state.genre;
      return (!genre||n.includes(genre)||genre==='eletronica'&&/eletr|techno|house/.test(n)||
        genre==='festival'&&/festa|show|festival/.test(n)||
        genre==='alternativo'&&/indie|rock|alternativ/.test(n))&&
        (!state.search||n.includes(norm(state.search)));
    });
    if(state.sort==='new')filtered.reverse();
    else if(state.sort==='live')filtered.sort((a,b)=>Number(!!b.isPlaying)-Number(!!a.isPlaying)||count(b.listenerCount)-count(a.listenerCount));
    else filtered.sort((a,b)=>count(b.listenerCount)-count(a.listenerCount));
    return filtered;
  }
  function remember(slug){
    if(!valid(slug))return;
    state.recent=[slug,...state.recent.filter(id=>id!==slug)].slice(0,8);
    try{localStorage.setItem('sf107Recent',JSON.stringify(state.recent));}catch(_){}
  }
  const go=slug=>{
    if(!valid(slug))return;
    remember(slug);renderRecent();
    if(typeof window.joinRoom==='function')window.joinRoom(slug);
    else window.location.assign('?sala='+encodeURIComponent(slug));
  };
  function roomCard(r,i){
    const special=r.slug===lead()?.slug&&count(r.listenerCount)>0;
    return `<button class="sf107-room-card${special?' sf107-leader':''}" type="button" data-sf107-room="${esc(r.slug)}" aria-label="Entrar na sala ${esc(r.name)}">
      <img src="${imageFor(r,i)}" alt="" loading="lazy" decoding="async">
      <span class="sf107-card-shade"></span>
      ${special?'<span class="sf107-pop-badge">♛ Mais popular</span>':''}
      ${r.isPlaying?'<span class="sf107-live-badge">● AO VIVO</span>':''}
      <span class="sf107-card-copy"><strong>${esc(r.name||'Sala musical')}</strong>
        <small>♧ ${fmt(r.listenerCount)} ${count(r.listenerCount)===1?'ouvinte':'ouvintes'}</small>
      </span><span class="sf107-play">▶</span></button>`;
  }
  function renderRooms(){
    const host=$('sf107Rooms');if(!host)return;
    const rooms=getFiltered(),more=$('sf107More'),meta=$('sf107RoomsMeta');
    if(meta)meta.textContent=state.rooms===null?'Atualizando…':
      `${rooms.length} ${rooms.length===1?'sala encontrada':'salas encontradas'}`;
    host.innerHTML=state.rooms===null?'<p class="sf107-empty">Carregando as salas…</p>':
      rooms.length?rooms.slice(0,state.all?48:4).map(roomCard).join(''):
      `<div class="sf107-empty">Nenhuma sala encontrada. <button data-sf107="reset" type="button">Ver todas</button></div>`;
    if(more){more.hidden=rooms.length<=4;more.textContent=state.all?'Ver menos':'Ver todas ›';}
  }
  function renderFeatured(){
    const host=$('sf107Featured');if(!host)return;
    const r=lead();
    if(!r){host.innerHTML=`<section class="sf107-feature sf107-feature-empty">
      <span class="sf107-label">✦ DESTAQUE DO LOBBY</span><h2>Seu próximo som começa aqui.</h2>
      <p>Assim que houver salas públicas, a que tiver mais ouvintes aparecerá em destaque.</p>
      <button class="sf107-join" type="button" data-sf107="create">＋ Criar uma sala</button></section>`;return;}
    const top=count(r.listenerCount)>0,t=r.currentTrack||{};
    const video=yt(t.id)?'https://img.youtube.com/vi/'+encodeURIComponent(t.id)+'/mqdefault.jpg':imageFor(r);
    host.innerHTML=`<section class="sf107-feature${top?' sf107-top':''}" style="--sf107-feature-image:url('${imageFor(r)}')">
      <div class="sf107-feature-image"></div><div class="sf107-feature-content">
        <div class="sf107-feature-badges"><span class="sf107-status">${r.isPlaying?'◉ AO VIVO':'♫ SALA DISPONÍVEL'}</span>
          ${top?'<span class="sf107-top-label">♛ Maior audiência agora</span>':''}</div>
        <h2>${esc(r.name||'Sala SonoraFan')}</h2><p>Sala pública · ${esc(genreFor(r))}</p>
        <div class="sf107-audience"><span class="sf107-avatar-group" aria-hidden="true"><i>♫</i><i>✿</i><i>★</i><i>♬</i></span>
          <strong>♧ ${fmt(r.listenerCount)} ${count(r.listenerCount)===1?'ouvinte':'ouvintes'}</strong></div>
        <div class="sf107-playing">
          <img src="${video}" alt="" loading="lazy" decoding="async">
          <div><small>TOCANDO AGORA</small><strong>${esc(t.title||'Escolha a próxima música')}</strong>
            <span>${esc(t.artist||'Música colaborativa')}</span></div><b aria-hidden="true">▂▅▃▇</b></div>
        <button type="button" class="sf107-join" data-sf107-room="${esc(r.slug)}">🎧 Entrar na sala</button>
      </div></section>`;
  }
  function renderRecent(){
    const host=$('sf107Recent');if(!host)return;
    const m=new Map(allRooms().map(r=>[r.slug,r]));
    const list=[...new Set([...state.recent,...state.pinned.map(r=>r.slug)])].map(id=>m.get(id)).filter(Boolean).slice(0,3);
    host.innerHTML=list.length?list.map((r,i)=>`<button class="sf107-recent" type="button" data-sf107-room="${esc(r.slug)}">
      <img src="${imageFor(r,i)}" alt="" loading="lazy" decoding="async">
      <span><strong>${esc(r.name)}</strong><small>Sala · ${esc(genreFor(r))}</small></span>
      <i aria-hidden="true">▶</i></button>`).join(''):
      `<div class="sf107-inline-empty"><span>♫</span> As salas visitadas ou favoritas aparecerão aqui.
        <button type="button" data-sf107="scroll">Explorar salas ›</button></div>`;
  }
  function renderClubs(){
    const host=$('sf107Clubs');if(!host)return;
    host.innerHTML=state.clubs.length?state.clubs.slice(0,4).map((c,i)=>{
      const id=/^[a-f0-9-]{36}$/i.test(c.id||'')?c.id:'';
      const fallback=[art.indie,art.rock,art.crowd,art.record][i];
      const cover=c.coverVersion&&id?`/api/fan-clubs/${id}/cover?v=${encodeURIComponent(c.coverVersion)}`:fallback;
      return `<button type="button" class="sf107-club" data-sf107-club="${id}">
        <img src="${cover}" data-sf107-fallback="${fallback}" alt="" loading="lazy">
        <span><strong>${esc(c.title||c.artist||'Fan Club')}</strong><small>${fmt(c.memberCount)} membros</small></span>
        <b aria-hidden="true">›</b></button>`;
    }).join(''):`<div class="sf107-inline-empty">Descubra comunidades musicais.
      <button type="button" data-sf107="clubs">Explorar Fan Clubs ›</button></div>`;
  }
  function renderEvents(){
    const host=$('sf107Events');if(!host)return;
    const e=state.events.find(x=>Number(x.startAt)>Date.now()-3600000);
    if(!e){host.innerHTML=`<div class="sf107-side-empty">Nenhum evento agendado.
      <button type="button" data-sf107="events">Ver agenda ›</button></div>`;return;}
    const d=new Date(e.startAt);
    host.innerHTML=`<button type="button" class="sf107-event" data-sf107="events">
      <span class="sf107-event-day"><small>${esc(d.toLocaleDateString('pt-BR',{weekday:'short'}).replace('.','').toUpperCase())}</small>
      <strong>${d.getDate()}</strong></span><span><strong>${esc(e.title)}</strong>
      <small>${esc(e.roomName||'Sala')} · ${esc(d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}))}</small>
      </span><b aria-hidden="true">›</b></button>`;
  }
  function renderNotices(){
    const host=$('sf107Notices');if(!host)return;
    host.innerHTML=state.notices.length?state.notices.slice(0,3).map(n=>`<button type="button" class="sf107-notice" data-sf107="notices">
      <span aria-hidden="true">${n.type==='event'?'▦':n.type==='follow'?'♧':'★'}</span>
      <span><strong>${esc(n.title||'Novidade na comunidade')}</strong><small>${esc(n.message||'')}</small></span>
      ${n.read?'':'<i class="sf107-dot" aria-label="Não lida"></i>'}
      </button>`).join(''):'<p class="sf107-muted">Suas novidades aparecerão aqui.</p>';
  }
  function renderAll(){renderFeatured();renderRecent();renderRooms();}
  function updateRooms(list){
    if(!Array.isArray(list))return;
    const signature=list.map(r=>`${r.slug}:${r.listenerCount}:${r.isPlaying}:${r.currentTrack?.id}`).join('|');
    if(signature===state.signature)return;
    state.signature=signature;state.rooms=list.filter(r=>r&&valid(r.slug));renderAll();
  }
  async function pullRooms(force=false){
    if(!active()||!force&&Date.now()-state.lastRooms<13000)return;
    state.lastRooms=Date.now();
    try{
      const r=await fetch('/api/rooms',{credentials:'include',cache:'no-store'});
      if(!r.ok)throw Error('Falha na consulta');
      updateRooms(await r.json());
    }catch(_){
      if(state.rooms===null){state.rooms=[];renderAll();$('sf107Rooms').innerHTML=
        `<div class="sf107-empty">Salas indisponíveis. <button type="button" data-sf107="retry">Tentar novamente</button></div>`;}
    }
  }
  async function pullExtras(force=false){
    if(!active()||!force&&Date.now()-state.lastExtras<75000)return;
    state.lastExtras=Date.now();
    const jobs=[
      ['/api/social/events',data=>state.events=Array.isArray(data)?data:[]],
      ['/api/fan-clubs',data=>state.clubs=(Array.isArray(data.clubs)?data.clubs:[]).sort((a,b)=>count(b.memberCount)-count(a.memberCount))],
      ['/api/social/notifications',data=>state.notices=Array.isArray(data)?data:[]],
      ['/api/experience95/profile',data=>state.pinned=Array.isArray(data.pinnedRooms)?data.pinnedRooms:[]]
    ];
    await Promise.all(jobs.map(async([url,fn])=>{try{
      const r=await fetch(url,{credentials:'include',cache:'no-store'});if(r.ok)fn(await r.json());
    }catch(_){}}));
    renderRecent();renderClubs();renderEvents();renderNotices();
  }
  function scrollTo(id){
    const box=document.querySelector('#screen-lobby .sf28-lobby-content'),target=$(id);
    if(!box||!target)return;
    box.scrollTo({top:Math.max(0,box.scrollTop+target.getBoundingClientRect().top-box.getBoundingClientRect().top-15),behavior:'smooth'});
  }
  function community(tab){
    // Keep the original friends/events/Fan Club hub accessible even though its
    // old lobby presentation is hidden. Never duplicate the feature content.
    const drawer=document.querySelector('#screen-lobby .sf32-community-drawer');
    if(drawer){
      drawer.classList.add('sf107-expose');
      drawer.open=true;
      const select=()=>drawer.querySelector('[data-sf-tab="'+tab+'"]')?.click();
      if(tab){select();window.sfSocialSwitchTab?.(tab);}
      drawer.scrollIntoView({behavior:'smooth',block:'start'});
    }
    // Open associated community surface when the legacy helper exists.
    if(typeof window.sf5OpenCommunity==='function')window.sf5OpenCommunity();
  }
  function action(name){
    switch(name){
      case 'create':return window.showCreateRoom?.();
      case 'random':return window.joinRandomRoom?.();
      case 'favorites':return window.sf95OpenHub?.('rooms');
      case 'library':return window.sf95OpenHub?.('dna');
      case 'clubs':return community('fanclubs');
      case 'community':return community('friends');
      case 'events':return community('events');
      case 'notices':return document.querySelector('.sf15-lobby-bell')?.click();
      case 'profile':return window.sf5OpenProfile?.();
      case 'account':return window.sf92OpenAccount?.();
      case 'ranking':return window.openLeaderboard?.();
      case 'journey':return document.querySelector('[data-sf63-open="passport"]')?.click();
      case 'help':return window.openTutorial?.(0);
      case 'admin':return $('adminBtn')?.click();
      case 'logout':return window.doLogout?.();
      case 'scroll':return scrollTo('sf107Popular');
      case 'top':return scrollTo('sf107Dashboard');
      case 'invite':$('sf107Invite').hidden=false;$('sf107InviteCode').focus();return;
      case 'close':$('sf107Invite').hidden=true;return;
      case 'reset':state.genre='';state.search='';state.all=false;$('sf107Search').value='';sync();return;
      case 'more':state.all=!state.all;renderRooms();return;
      case 'retry':return pullRooms(true);
    }
  }
  function sync(){
    document.querySelectorAll('#sf107Dashboard [data-sf107-genre]').forEach(b=>{
      const chosen=state.genre===b.dataset.sf107Genre;
      b.classList.toggle('selected',chosen);b.setAttribute('aria-pressed',String(chosen));
    });
    renderRooms();
  }
  function handleClick(e){
    const room=e.target.closest('[data-sf107-room]');
    if(room)return go(room.dataset.sf107Room);
    const club=e.target.closest('[data-sf107-club]');
    if(club){community('fanclubs');if(club.dataset.sf107Club)setTimeout(()=>window.sf71OpenFanClub?.(club.dataset.sf107Club),100);return;}
    const genre=e.target.closest('[data-sf107-genre]');
    if(genre){state.genre=state.genre===genre.dataset.sf107Genre?'':genre.dataset.sf107Genre;state.all=false;sync();scrollTo('sf107Popular');return;}
    const filter=e.target.closest('[data-sf107-filter]');
    if(filter){
      state.sort=filter.dataset.sf107Filter==='new'?'new':filter.dataset.sf107Filter==='live'?'live':'popular';
      state.genre='';state.all=state.sort!=='popular';
      document.querySelectorAll('#sf107Dashboard [data-sf107-filter]').forEach(b=>b.classList.toggle('active',b===filter));
      sync();scrollTo('sf107Popular');return;
    }
    const btn=e.target.closest('[data-sf107]');if(!btn)return;
    action(btn.dataset.sf107);
    if(btn.closest('details'))btn.closest('details').open=false;
  }
  function build(){
    const host=document.querySelector('#screen-lobby .sf28-lobby-content');
    const old=document.querySelector('#screen-lobby .sf28-lobby-header');
    if(!host||!old||$('sf107Dashboard'))return;
    for(const child of [...host.children])child.classList.add('sf107-legacy');
    const main=document.createElement('div');main.id='sf107Dashboard';main.className='sf107-dashboard';
    main.innerHTML=`
      <div class="sf107-quick">
        <strong>ϟ Acesso rápido</strong>
        <button type="button" class="sf107-quick-primary" data-sf107="create">＋ Criar sala</button>
        <button type="button" data-sf107="invite">⌗ Entrar com código</button>
        <span>Explorar salas:</span>
        <div class="sf107-chips">
          <button type="button" class="active" data-sf107-filter="popular">🔥 Em alta</button>
          <button type="button" data-sf107-filter="new">✦ Novas</button>
          <button type="button" data-sf107-filter="live">◉ Ao vivo</button>
          <button type="button" data-sf107-genre="indie">✿ Indie</button>
          <button type="button" data-sf107-genre="rock">♬ Rock</button>
          <button type="button" data-sf107-genre="pop">✦ Pop</button>
          <button type="button" data-sf107-genre="festival">♛ Festivais</button>
        </div>
      </div>
      <div class="sf107-content">
        <div class="sf107-main-col">
          <section class="sf107-module">
            <header class="sf107-module-head"><h2>▷ Continuar ouvindo</h2><button type="button" data-sf107="favorites">Ver favoritas ›</button></header>
            <div class="sf107-recent-list" id="sf107Recent"></div>
          </section>
          <section class="sf107-module" id="sf107Popular">
            <header class="sf107-module-head"><div><h2>♨ Salas populares</h2><small id="sf107RoomsMeta">Atualizando…</small></div>
              <button type="button" id="sf107More" data-sf107="more">Ver todas ›</button></header>
            <div class="sf107-room-grid" id="sf107Rooms"></div>
          </section>
          <section class="sf107-module">
            <header class="sf107-module-head"><h2>♫ Explorar por estilo</h2><button type="button" data-sf107="reset">Todos os estilos ›</button></header>
            <div class="sf107-style-list">
              ${styles.map(([key,sym,label,img])=>`<button type="button" class="sf107-style sf107-style-${key}" data-sf107-genre="${key}" aria-pressed="false" style="--tile-image:url('${img}')"><b>${sym}</b><span>${label}</span></button>`).join('')}
            </div>
          </section>
          <section class="sf107-module">
            <header class="sf107-module-head"><h2>♧ Fan Clubs em alta</h2><button type="button" data-sf107="clubs">Ver todos ›</button></header>
            <div class="sf107-club-grid" id="sf107Clubs"></div>
          </section>
        </div>
        <aside class="sf107-side-col">
          <div id="sf107Featured"></div>
          <section class="sf107-module sf107-aside-module"><header class="sf107-module-head"><h2>▦ Agenda musical</h2><button type="button" data-sf107="events">Ver agenda ›</button></header>
            <div id="sf107Events"></div></section>
          <section class="sf107-module sf107-aside-module"><header class="sf107-module-head"><h2>♢ Notificações</h2><button type="button" data-sf107="notices">Ver todas ›</button></header>
            <div id="sf107Notices"></div></section>
        </aside>
      </div>
      <nav class="sf107-mobile-nav" aria-label="Navegação rápida do Lobby no celular">
        <button type="button" data-sf107="top">⌂ <span>Início</span></button>
        <button type="button" data-sf107="scroll">♫ <span>Salas</span></button>
        <button type="button" data-sf107="create" class="sf107-mobile-create">＋ <span>Criar</span></button>
        <button type="button" data-sf107="community">♧ <span>Comunidade</span></button>
        <button type="button" data-sf107="profile">◉ <span>Perfil</span></button>
      </nav>
      <div class="sf107-invite" id="sf107Invite" hidden>
        <form id="sf107InviteForm"><label for="sf107InviteCode">Código ou link de convite</label>
          <input type="text" id="sf107InviteCode" placeholder="Cole o código da sala" required autocomplete="off">
          <div><button type="submit">Entrar na sala</button><button type="button" data-sf107="close">Cancelar</button></div>
        </form>
      </div>`;
    host.prepend(main);
    const top=document.createElement('header');top.className='sf107-top';
    top.innerHTML=`
      <img src="/brand-64/sonorafan-logo-transparent.png" alt="SonoraFan" width="205" height="63" class="sf107-logo">
      <nav aria-label="Navegação do lobby">
        <button type="button" class="active" data-sf107="top">⌂ Lobby</button>
        <button type="button" data-sf107="scroll">♫ Salas</button>
        <button type="button" data-sf107="community">♧ Comunidades</button>
        <button type="button" data-sf107="library">▣ Biblioteca</button>
      </nav>
      <div class="sf107-top-actions">
        <label class="sf107-search">⌕ <input type="search" id="sf107Search" placeholder="Buscar salas, estilos ou artistas" aria-label="Buscar salas" autocomplete="off"></label>
        <button type="button" aria-label="Notificações" title="Notificações" data-sf107="notices">♢</button>
        <button type="button" class="sf107-profile" data-sf107="profile"><span class="sf107-profile-avatar" id="sf107ProfileAvatar">◉</span><span id="sf107ProfileLabel">Perfil</span></button>
        <details class="sf107-more"><summary>☰ <span>Mais</span></summary>
          <div class="sf107-more-list">
            <button type="button" data-sf107="ranking">♛ Ranking</button>
            <button type="button" data-sf107="journey">✦ Minha Jornada</button>
            <button type="button" data-sf107="favorites">♡ Favoritas</button>
            <button type="button" data-sf107="account">⚙ Conta e segurança</button>
            <button type="button" data-sf107="help">? Ajuda / Tour</button>
            <button type="button" data-sf107="admin" id="sf107Admin" hidden>⚙ Administração</button>
            <button type="button" data-sf107="logout">⇥ Sair</button>
          </div>
        </details>
      </div>`;
    old.after(top);
    main.addEventListener('click',handleClick);
    top.addEventListener('click',handleClick);
    $('sf107Search').addEventListener('input',e=>{
      state.search=e.target.value.trim().slice(0,80);state.all=false;sync();
    });
    main.addEventListener('submit',e=>{
      if(e.target.id!=='sf107InviteForm')return;
      e.preventDefault();
      let raw=$('sf107InviteCode').value.trim().slice(0,400),slug=raw;
      try{if(/^https?:\/\//i.test(raw)){const url=new URL(raw);slug=url.pathname.match(/^\/invite\/([^/]+)/)?.[1]||url.searchParams.get('sala')||'';}}catch(_){}
      try{slug=decodeURIComponent(slug.replace(/^sala=/,''));}catch(_){}
      if(!valid(slug)){
        const field=$('sf107InviteCode');field.setCustomValidity('Código de sala inválido.');field.reportValidity();field.setCustomValidity('');return;
      }
      $('sf107Invite').hidden=true;go(slug);
    });
    main.addEventListener('keydown',e=>{
      if(e.key==='Escape'&&!$('sf107Invite').hidden){$('sf107Invite').hidden=true;e.preventDefault();}
    });
    main.addEventListener('error',e=>{
      if(e.target instanceof HTMLImageElement&&e.target.dataset.sf107Fallback){
        e.target.src=e.target.dataset.sf107Fallback;delete e.target.dataset.sf107Fallback;
      }
    },true);
    try{state.recent=JSON.parse(localStorage.getItem('sf107Recent')||'[]').filter(valid).slice(0,8);}catch(_){}
    renderAll();renderClubs();renderEvents();renderNotices();
    app().classList.add('sf107-ready');
    const skip=app().querySelector('.sf52-skip-link');
    if(skip){skip.href='#sf107Popular';skip.textContent='Ir para salas populares';}
  }
  function syncProfile(){
    const label=$('sf107ProfileLabel'),avatar=$('sf107ProfileAvatar');
    const originalName=$('userDisplayName'),originalAvatar=$('userAvatar');
    if(label && originalName){
      const name=String(originalName.textContent||'').trim();
      label.textContent=name && name!=='Usuário'?name.slice(0,22):'Perfil';
    }
    if(avatar && originalAvatar){
      const image=originalAvatar.querySelector('img');
      if(image?.src){
        let current=avatar.querySelector('img');
        if(!current){avatar.replaceChildren();current=document.createElement('img');current.alt='';avatar.append(current);}
        if(current.src!==image.src)current.src=image.src;
      }else if(!avatar.querySelector('img')){
        avatar.textContent=String(originalAvatar.textContent||'◉').trim().slice(0,3)||'◉';
      }
    }
  }
  function init(){
    build();if(!$('sf107Dashboard'))return;
    const orig=window.sf41UpdateRooms;
    if(typeof orig==='function'&&!orig.sf107){
      const wrapper=function(rooms){const result=orig.apply(this,arguments);updateRooms(rooms);return result;};
      wrapper.sf107=true;window.sf41UpdateRooms=wrapper;
    }
    syncProfile();
    for(const el of [$('userDisplayName'),$('userAvatar')]){
      if(el)new MutationObserver(syncProfile).observe(el,{childList:true,subtree:true,characterData:true});
    }
    const socketClient=typeof socket!=='undefined'?socket:null;
    socketClient?.on('roomState',r=>{if(r?.slug)remember(r.slug);});
    const poll=()=>{
      if(active()&&!document.hidden){pullRooms();pullExtras();
        const nav=$('adminBtn'),admin=$('sf107Admin');
        if(admin&&nav)admin.hidden=getComputedStyle(nav).display==='none';
      }
    };
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll();});
    setInterval(poll,22000);poll();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();