/* SonoraFan 125 — shell de produto, sem dados fictícios.
 * Preserva os controladores existentes: lobby, música, autenticação, perfil,
 * gamificação, Fan Clubs e salas. Os mockups são referência de estilo,
 * não substitutos dos componentes funcionais.
 */
(function SonoraFanUnified125(){
  'use strict';
  const $=id=>document.getElementById(id);
  const qs=(sel,base=document)=>base.querySelector(sel);
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const validRoom=x=>/^[a-z0-9_-]{1,100}$/i.test(String(x||''));
  const fmt=x=>(Number(x)||0).toLocaleString('pt-BR');
  const art={
    crowd:'/art-44/festival-crowd.webp', rock:'/art-33/poster-rock.webp',
    indie:'/art-33/poster-indie.webp',pop:'/art-40/poster-pop.svg',
    vinyl:'/art-44/vinyl-room.webp',electro:'/art-33/poster-electro.webp',
    brazil:'/art-33/poster-brasil.webp'
  };
  function go(action){
    const screen=$('screen-lobby');
    switch(action){
      case 'lobby':
        window.sf200CloseAgenda?.();
        // Voltar ao início sem scrollIntoView: ele rolava também o viewport
        // externo e desalinhava o header e a navegação fixa no Android.
        if(screen?.classList.contains('active')){
          const content=qs('.sf28-lobby-content',screen);
          if(content)content.scrollTop=0;
          const main=qs('.sf28-lobby-main',screen);
          if(main && main.scrollTop)main.scrollTop=0;
          if(window.scrollY)window.scrollTo(0,0);
        }
        break;
      case 'rooms':window.sf200CloseAgenda?.();{
        const target=qs('#sf107Popular');
        const pane=qs('.sf28-lobby-content',screen||document);
        if(target&&pane){
          pane.scrollTop=Math.max(0,target.getBoundingClientRect().top-pane.getBoundingClientRect().top+pane.scrollTop);
        }
        break;
      }
       case 'agenda':
         if(screen&&!screen.classList.contains('active')){
           if(typeof window.leaveRoom==='function')window.leaveRoom();
           else if(typeof window.showScreen==='function')window.showScreen('lobby');
         }
         window.sf200OpenAgenda?.();break;
      case 'profile':(typeof window.sf112OpenProfile==='function'?window.sf112OpenProfile('overview'):window.sf5OpenProfile?.());break;
      case 'library':(typeof window.sf112OpenProfile==='function'?window.sf112OpenProfile('library'):qs('[data-sf107="favorites"]')?.click());break;
      case 'community':if(typeof window.sf126OpenClubs==='function')window.sf126OpenClubs();else window.sf110OpenCommunity?.('fanclubs');break;
      case 'clubs':if(typeof window.sf126OpenClubs==='function')window.sf126OpenClubs();else window.sf110OpenCommunity?.('fanclubs');break;
      case 'ranking':window.openLeaderboard?.();break;
      case 'club-ranking':window.sf45OpenClub?.();break;
      case 'create':window.showCreateRoom?.();break;
      case 'create-event':window.sf200OpenAgenda?.();window.sf200CreateEvent?.();break;
      case 'create-club':if(typeof window.sf126OpenClubs==='function')window.sf126OpenClubs();else window.sf110OpenCommunity?.('fanclubs');setTimeout(()=>$('sf71CreateClub')?.click(),180);break;
      case 'invite':qs('[data-sf107="invite"]')?.click();break;
      case 'notifications':window.sf15OpenNotifications?.();break;
      case 'account':window.sf92OpenAccount?.();break;
      case 'logout':window.doLogout?.();break;
      case 'help':window.openTutorial?.(0);break;
      case 'messages':window.sf53OpenInbox?.();break;
      case 'favorites':(typeof window.sf112OpenProfile==='function'?window.sf112OpenProfile('library'):window.toggleFavorites?.());break;
    }
  }
  window.sf125Navigate=go;
  const nav=[['lobby','⌂','Início'],['rooms','♫','Salas'],
    ['clubs','♧','Fan Clubs'],['agenda','▦','Agenda Musical'],['ranking','♜','Ranking'],['profile','♙','Meu Perfil']];
  function navButton([action,icon,label],side=false){
    return '<button type="button" data-sf125-go="'+action+'"'+(action==='lobby'?' class="is-active" aria-current="page"':'')+'>'+
      '<span class="sf125-nav-icon" aria-hidden="true">'+icon+'</span><span>'+label+'</span></button>';
  }
  function buildLobby(){
    const lobby=$('screen-lobby'), app=qs('.sf28-lobby-app',lobby||document),dashboard=$('sf107Dashboard');
    const toolbar=qs('.sf107-top',lobby||document);
    if(!lobby||!app||!dashboard||!toolbar||$('sf125Sidebar'))return;
    lobby.classList.add('sf125-platform');
    app.classList.add('sf125-app');
    toolbar.classList.add('sf125-toolbar');
    const sidebar=document.createElement('aside');
    sidebar.id='sf125Sidebar';sidebar.className='sf125-sidebar';
    sidebar.setAttribute('aria-label','Navegação principal');
    sidebar.innerHTML='<div class="sf125-sidebar-brand"><img src="/brand-144/sonorafan-logo.svg" alt="SonoraFan" width="1260" height="426" decoding="async"></div>'+
      '<nav class="sf125-side-nav" aria-label="Áreas da plataforma">'+nav.map(x=>navButton(x,true)).join('')+'</nav>'+
      '<div class="sf125-sidebar-separator"></div><span class="sf125-sidebar-caption">Criar</span>'+
      '<nav class="sf125-side-nav sf125-side-secondary" aria-label="Criar salas e Fan Clubs">'+
      '<button type="button" data-sf125-go="create"><span class="sf125-nav-icon">＋</span><span>Criar Sala</span></button>'+
      '<button type="button" data-sf125-go="create-club"><span class="sf125-nav-icon">♧</span><span>Criar Fan Club</span></button>'+ 
      '<button type="button" data-sf125-go="create-event"><span class="sf125-nav-icon">▦</span><span>Criar Evento</span></button></nav>'+
      '<div class="sf125-sidebar-art" aria-hidden="true"></div>';
    app.insertBefore(sidebar,qs('.sf28-lobby-main',app));
    const main=qs('.sf28-lobby-main',app);
    main?.classList.add('sf125-main');
    const hero=document.createElement('section');hero.id='sf125LobbyHero';hero.className='sf125-lobby-hero';
    // Imagem aprovada: parte do componente, não depende de CSS de temas antigos.
    hero.innerHTML='<img class="sf268-lobby-background" src="/art-267/sonorafan-festival-hero.webp?v=268.0" alt="" aria-hidden="true" decoding="async" fetchpriority="high">' +
      '<div class="sf125-hero-copy"><span class="sf125-kicker">BEM-VINDO(A) AO SONORAFAN</span>'+
      '<h1>Descubra salas,<br>conecte-se com fãs<br>e viva <em>a música juntos.</em></h1>'+
      '<p>Ouça e compartilhe em tempo real com uma comunidade apaixonada por música.</p>'+
      '<div class="sf125-hero-actions">'+
      '<button type="button" data-sf125-go="rooms" class="sf125-cta sf271-hero-primary"><span aria-hidden="true">▶</span><span>Explorar salas</span><span aria-hidden="true">→</span></button>'+
      '<button type="button" data-sf125-go="create" class="sf125-outline sf271-hero-secondary"><span aria-hidden="true">＋</span><span>Criar uma sala</span></button>'+ 
      '<button type="button" data-sf125-go="clubs" class="sf125-outline sf271-hero-tertiary"><span aria-hidden="true">♧</span><span>Encontrar Fan Clubs</span></button></div></div>';
    dashboard.prepend(hero);
    const heroActions=hero.querySelector('.sf125-hero-actions');
    let cleanupQueued=false;
    function cleanHero(){
      cleanupQueued=false;
      if(!heroActions?.isConnected)return;
      let foundClub=false;
      Array.from(heroActions.querySelectorAll('button,a')).forEach(control=>{
        const title=String(control.textContent||'').normalize('NFD').toLowerCase();
        if(title.includes('entrar com codigo')||title.includes('acessar com codigo')){
          control.remove();return;
        }
        if(control.dataset.sf125Go==='clubs'||title.includes('encontrar fan clubs')){
          if(foundClub)control.remove();
          else foundClub=true;
        }
      });
    }
    new MutationObserver(()=>{
      if(cleanupQueued)return;
      cleanupQueued=true;requestAnimationFrame(cleanHero);
    }).observe(heroActions,{childList:true,subtree:true});
    cleanHero();
    const features=document.createElement('section');
    features.className='sf125-lobby-pillars';features.setAttribute('aria-label','Principais recursos');
    features.innerHTML=[
      ['orange','▣','Salas Colaborativas','Ouça, assista e crie junto.'],
      ['lime','♫','Fila Compartilhada','Monte playlists com a galera.'],
      ['pink','♧','Fan Clubs','Conecte-se com fãs do mesmo artista.'],
      ['yellow','ϟ','Experiências em Tempo Real','Uma sala, muitos momentos.']
    ].map(([tone,icon,title,desc])=>'<article class="sf125-mini-feature" data-tone="'+tone+'"><span aria-hidden="true">'+icon+
      '</span><div><strong>'+title+'</strong><small>'+desc+'</small></div></article>').join('');
    hero.after(features);
    const side=qs('.sf107-side-col',dashboard);
    if(side){
      const rail=document.createElement('section');rail.className='sf125-rail-live';
      rail.innerHTML='<header><h3>◉ Agora ao vivo</h3><button type="button" data-sf125-go="rooms">Ver salas →</button></header>'+
        '<div id="sf125LiveRooms" aria-live="polite"><p class="sf125-muted">Carregando salas…</p></div>';
      side.prepend(rail);
      const board=document.createElement('section');board.className='sf125-rail-ranking';
      board.innerHTML='<header><h3>♜ Ranking da comunidade</h3><button type="button" data-sf125-go="ranking">Ver completo →</button></header>'+
      '<div id="sf125Leaders" aria-live="polite"><p class="sf125-muted">Carregando ranking…</p></div>';
      side.append(board);
    }
    const bar=document.createElement('nav');bar.className='sf125-mobile-bar';
    bar.id='sf125MobileBar';bar.setAttribute('aria-label','Navegação mobile SonoraFan');
    bar.innerHTML=nav.map(x=>navButton(x)).join('');
    lobby.append(bar);
    app.addEventListener('click',onNavClick);
    bar.addEventListener('click',onNavClick);
    // Keep the existing logo and account controls. Older horizontal navigation
    // is hidden by CSS; no duplicate brand or search field is created.
    toolbar.setAttribute('aria-label','SonoraFan: busca, notificações e conta');
    // Atualizações independentes: o Ranking não bloqueia Agora ao vivo.
    const refreshVisible=(force=false)=>{
      if(!lobby.classList.contains('active')||document.hidden)return;
      refreshLive(force);refreshLeaders(force);
    };
    refreshVisible(true);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshVisible(true);});
    new MutationObserver(()=>{if(lobby.classList.contains('active'))refreshVisible(true);})
      .observe(lobby,{attributes:true,attributeFilter:['class']});
    setInterval(()=>refreshVisible(false),5000);
    const realtime=typeof socket!=='undefined'?socket:null;
    realtime?.on('roomState',()=>refreshLive(false));
    realtime?.on('roomList',()=>refreshLive(false));
    realtime?.on('gamificationUpdate',()=>refreshLeaders(true));
  }
  function onNavClick(event){
    const btn=event.target.closest('[data-sf125-go]');
    if(!btn)return;
    event.preventDefault();
    (window.sf125Navigate||go)(btn.dataset.sf125Go);
  }
  function roomArt(room){
    const consistent=window.sf261RoomCover?.(room);
    if(consistent)return consistent.src;
    const g=String(room.genre||room.name||'').toLowerCase();
    if(/rock|metal/.test(g))return art.rock;
    if(/indie/.test(g))return art.indie;
    if(/pop/.test(g))return art.pop;
    if(/eletro|dj|house|techno/.test(g))return art.electro;
    if(/mpb|brasil|sertanejo|samba/.test(g))return art.brazil;
    return art.crowd;
  }
  let liveInFlight=false,leaderInFlight=false,lastLive=0,lastLeader=0,lastLiveSuccess=false,lastLeaderSuccess=false;
  async function refreshLive(force=false){
    if(liveInFlight||!$('sf125LiveRooms')||document.hidden||!$('screen-lobby')?.classList.contains('active'))return;
    const now=Date.now();if(now-lastLive<(force?1500:10000))return;
    lastLive=now;liveInFlight=true;
    try{
      // Read-only, with the same credentials as the existing app. Never fake live users.
      try{
        const response=await fetch('/api/rooms',{credentials:'include',cache:'no-store'});
        if(!response.ok)throw Error('salas');
        const json=await response.json();
        const rooms=(Array.isArray(json)?json:Array.isArray(json.rooms)?json.rooms:[])
          .filter(x=>x&&!x.isPrivate&&validRoom(x.slug)).sort((a,b)=>(Number(b.listenerCount)||0)-(Number(a.listenerCount)||0)).slice(0,3);
        $('sf125LiveRooms').innerHTML=rooms.length?rooms.map(room=>
          '<button class="sf125-rail-room" type="button" data-sf125-slug="'+esc(room.slug)+'">'+
          '<img src="'+esc(roomArt(room))+'" data-sf261-rail-cover="'+esc(room.slug)+'" alt="" loading="lazy"><span><strong>'+esc(room.name||'Sala musical')+'</strong>'+
          '<small>'+(room.isPlaying?'● Ao vivo · ':'')+fmt(room.listenerCount)+' ouvindo</small></span><i>▷</i></button>'
        ).join(''):'<p class="sf125-muted">Ainda não há salas públicas. Que tal criar a primeira?</p>';
        lastLiveSuccess=true;
        $('sf125LiveRooms')?.querySelectorAll('img[data-sf261-rail-cover]').forEach(img=>{const room=rooms.find(r=>r.slug===img.dataset.sf261RailCover);const cv=window.sf261RoomCover?.(room);if(!cv)return;img.addEventListener('error',()=>{if(img.dataset.sf261Retry)return;img.dataset.sf261Retry='1';img.src=cv.fallback;},{once:true});});
      }catch(e){if(!lastLiveSuccess)$('sf125LiveRooms').innerHTML='<p class="sf125-muted">Não foi possível consultar salas agora.</p>';}
    }finally{liveInFlight=false;}
  }
  async function refreshLeaders(force=false){
    if(leaderInFlight||!$('sf125Leaders')||document.hidden||!$('screen-lobby')?.classList.contains('active'))return;
    const now=Date.now();if(now-lastLeader<(force?1500:20000))return;
    lastLeader=now;leaderInFlight=true;
    try{
      try{
        const response=await fetch('/api/gamification/leaderboard',{credentials:'include',cache:'no-store'});
        if(!response.ok)throw Error('ranking');
        const json=await response.json();const items=Array.isArray(json.items)?json.items.slice(0,3):[];
        lastLeaderSuccess=true;
        $('sf125Leaders').innerHTML=items.length?items.map((x,i)=>
          '<div class="sf125-rail-leader"><span class="sf125-leader-rank">'+(i+1)+'º</span>'+
          '<strong>'+esc(x.nome||'Ouvinte')+'</strong><small>'+fmt(x.points)+' XP</small></div>'
        ).join(''):'<p class="sf125-muted">O ranking aparecerá conforme os fãs participarem.</p>';
      }catch(e){if(!lastLeaderSuccess)$('sf125Leaders').innerHTML='<p class="sf125-muted">Ranking temporariamente indisponível.</p>';}
    }finally{leaderInFlight=false;}
  }
  function buildRanking(){
    const modal=$('lbModal'),list=$('lbList');
    if(!modal||!list)return;
    modal.classList.add('sf125-ranking');
    const box=qs('.modal',modal);
    if(!box)return;
    box.style.removeProperty('max-width');
    const heading=qs('h3',box);
    if(heading)heading.textContent='♜ Ranking SonoraFan';
    const header=document.createElement('div');header.className='sf125-ranking-intro';
    header.innerHTML='<span>COMUNIDADE · XP REAL</span><p>Os fãs mais participativos da comunidade. Ouça, crie, compartilhe e conquiste seu lugar no ranking.</p>';
    list.before(header);
    const podium=document.createElement('div');podium.id='sf125RankingPodium';podium.className='sf125-ranking-podium';
    podium.setAttribute('aria-label','Os três primeiros colocados');
    list.before(podium);
    function renderPodium(){
      const rows=[...list.querySelectorAll('.lb-row')].slice(0,3);
      if(!rows.length){podium.replaceChildren();return;}
      // Clone read-only rows from /api/leaderboard to avoid placeholder statistics.
      const order=[1,0,2];podium.replaceChildren(...order.filter(i=>rows[i]).map(i=>{
        const card=document.createElement('div');card.className='sf125-rank-podium sf125-rank-'+(i+1);
        const name=rows[i].querySelector('span')?.childNodes[0]?.textContent?.trim()||'Ouvinte';
        const level=rows[i].querySelector('small')?.textContent||'';
        const xp=rows[i].querySelector('em')?.textContent||'0 XP';
        const crown=document.createElement('span');crown.className='sf125-rank-crown';crown.textContent=['♛','♜','♕'][i];
        const no=document.createElement('b');no.textContent=(i+1)+'º';
        const title=document.createElement('strong');title.textContent=name;
        const small=document.createElement('small');small.textContent=level;
        const points=document.createElement('em');points.textContent=xp;
        card.append(crown,no,title,small,points);return card;
      }));
    }
    new MutationObserver(renderPodium).observe(list,{childList:true,subtree:true});
    renderPodium();
  }
  function closeActiveOverlay(){
    if($('sf43ProfileModal')?.classList.contains('active'))window.sf43CloseProfile?.();
    const layer=qs('.sf5-community-layer');
    if(layer&&getComputedStyle(layer).display!=='none')layer.querySelector('.sf5-close')?.click();
    $('lbModal')?.classList.remove('active');
    $('sf45ClubModal')?.classList.remove('active');
  }
  // v127: navegação fixa somente no lobby e na sala.
  // Diálogos (Perfil, Ranking, Fan Clubs) conservam apenas o botão de fechar.
  function addModalRail(container){
    if(!container)return;
    container.querySelectorAll(':scope > .sf125-modal-rail').forEach(rail=>rail.remove());
    container.classList.remove('sf125-has-rail');
  }
  function hookOverlay(){
    const profile=$('sf43ProfileModal');
    profile?.classList.add('sf125-profile');
    addModalRail(qs('.sf43-profile-modal',profile||document),'profile');
    $('sf45ClubModal')?.classList.add('sf125-club-xp');
    const rank=$('lbModal');
    rank?.classList.add('sf125-ranking');
    addModalRail(qs('.sf35-ranking-modal',rank||document),'ranking');
    const assign=(elem,cls)=>elem?.classList.add(cls);
    assign($('favoritesModal'),'sf125-extras');
    assign($('sf53Inbox'),'sf125-extras');
    assign($('sf92AccountOverlay'),'sf125-extras');
    function ensureCommunityRail(){
      const layer=qs('.sf5-community-layer');
      if(!layer)return false;
      layer.classList.add('sf125-community');
      addModalRail(qs('.sf110-community-shell',layer),'community');
      return Boolean(qs('.sf110-community-shell',layer));
    }
    ensureCommunityRail();
    // Native community is constructed on demand: hook its existing open handlers.
    // Avoid a permanent body-wide MutationObserver while rooms or chat update.
    for(const name of ['sf110OpenCommunity','sf5OpenCommunity']){
      const previous=window[name];
      if(typeof previous!=='function'||previous.sf125Wrapped)continue;
      const wrapped=function(){const result=previous.apply(this,arguments);ensureCommunityRail();return result;};
      wrapped.sf125Wrapped=true;
      window[name]=wrapped;
    }
  }
  function init(){
    buildLobby();buildRanking();hookOverlay();
    $('sf125LiveRooms')?.addEventListener('click',event=>{
      const slug=event.target.closest('[data-sf125-slug]')?.dataset.sf125Slug;
      if(!validRoom(slug))return;
      if(typeof window.joinRoom==='function')window.joinRoom(slug);
      else qs('[data-sf107-room="'+slug+'"]')?.click();
    });
    // For legacy sections opened through other menu entries, reapply color tokens.
    document.body.classList.add('sf125-global');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
