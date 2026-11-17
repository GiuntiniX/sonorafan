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
      case 'lobby':screen?.classList.contains('active')&&qs('#sf125LobbyHero')?.scrollIntoView({block:'start',behavior:'smooth'});break;
      case 'rooms':qs('#sf107Popular')?.scrollIntoView({block:'start',behavior:'smooth'});break;
      case 'profile':(typeof window.sf112OpenProfile==='function'?window.sf112OpenProfile('profile'):window.sf5OpenProfile?.());break;
      case 'library':(typeof window.sf112OpenProfile==='function'?window.sf112OpenProfile('library'):qs('[data-sf107="favorites"]')?.click());break;
      case 'community':if(typeof window.sf126OpenClubs==='function')window.sf126OpenClubs();else window.sf110OpenCommunity?.('fanclubs');break;
      case 'clubs':if(typeof window.sf126OpenClubs==='function')window.sf126OpenClubs();else window.sf110OpenCommunity?.('fanclubs');break;
      case 'ranking':window.openLeaderboard?.();break;
      case 'club-ranking':window.sf45OpenClub?.();break;
      case 'create':window.showCreateRoom?.();break;
      case 'create-club':window.sf107OpenFanClub?.();setTimeout(()=>$('sf71CreateClub')?.click(),180);break;
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
    ['clubs','♧','Fan Clubs'],['ranking','♜','Ranking'],['profile','♙','Meu Perfil']];
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
    sidebar.innerHTML='<div class="sf125-sidebar-brand"><img src="/brand-64/sonorafan-logo-transparent.png" alt="SonoraFan" width="214" height="66" decoding="async"></div>'+
      '<nav class="sf125-side-nav" aria-label="Áreas da plataforma">'+nav.map(x=>navButton(x,true)).join('')+'</nav>'+
      '<div class="sf125-sidebar-separator"></div><span class="sf125-sidebar-caption">Criar</span>'+
      '<nav class="sf125-side-nav sf125-side-secondary" aria-label="Criação e biblioteca">'+
      '<button type="button" data-sf125-go="create"><span class="sf125-nav-icon">＋</span><span>Criar Sala</span></button>'+
      '<button type="button" data-sf125-go="create-club"><span class="sf125-nav-icon">♧</span><span>Criar Fan Club</span></button>'+
      '<button type="button" data-sf125-go="library"><span class="sf125-nav-icon">♫</span><span>Minha Biblioteca</span></button>'+
      '<button type="button" data-sf125-go="favorites"><span class="sf125-nav-icon">♡</span><span>Favoritos</span></button></nav>'+
      '<div class="sf125-sidebar-art" aria-hidden="true"></div>';
    app.insertBefore(sidebar,qs('.sf28-lobby-main',app));
    const main=qs('.sf28-lobby-main',app);
    main?.classList.add('sf125-main');
    const hero=document.createElement('section');hero.id='sf125LobbyHero';hero.className='sf125-lobby-hero';
    hero.innerHTML='<div class="sf125-hero-copy"><span class="sf125-kicker">BEM-VINDO(A) AO SONORAFAN</span>'+
      '<h1>Descubra salas,<br>conecte-se com fãs<br>e viva <em>a música juntos.</em></h1>'+
      '<p>Ouça e compartilhe em tempo real com uma comunidade apaixonada por música.</p>'+
      '<div class="sf125-hero-actions">'+
      '<button type="button" data-sf125-go="rooms" class="sf125-cta">▷ Explorar salas →</button>'+
      '<button type="button" data-sf125-go="create" class="sf125-outline">♧ Criar uma sala</button></div></div>';
    dashboard.prepend(hero);
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
    let last=0;
    const poll=()=>{if(!lobby.classList.contains('active')||document.hidden)return;
      if(Date.now()-last<55000)return;last=Date.now();refreshData();};
    poll();document.addEventListener('visibilitychange',poll);
    setInterval(poll,60000);
  }
  function onNavClick(event){
    const btn=event.target.closest('[data-sf125-go]');
    if(!btn)return;
    event.preventDefault();
    go(btn.dataset.sf125Go);
  }
  function roomArt(room){
    const g=String(room.genre||room.name||'').toLowerCase();
    if(/rock|metal/.test(g))return art.rock;
    if(/indie/.test(g))return art.indie;
    if(/pop/.test(g))return art.pop;
    if(/eletro|dj|house|techno/.test(g))return art.electro;
    if(/mpb|brasil|sertanejo|samba/.test(g))return art.brazil;
    return art.crowd;
  }
  async function refreshData(){
    if(!$('sf125LiveRooms'))return;
    // Read-only, with the same credentials as the existing app. Never fake live users.
    try{
      const response=await fetch('/api/rooms',{credentials:'include',cache:'no-store'});
      if(!response.ok)throw Error('salas');
      const json=await response.json();
      const rooms=(Array.isArray(json)?json:Array.isArray(json.rooms)?json.rooms:[])
        .filter(x=>x&&!x.isPrivate&&validRoom(x.slug)).sort((a,b)=>(Number(b.listenerCount)||0)-(Number(a.listenerCount)||0)).slice(0,3);
      $('sf125LiveRooms').innerHTML=rooms.length?rooms.map(room=>
        '<button class="sf125-rail-room" type="button" data-sf125-slug="'+esc(room.slug)+'">'+
        '<img src="'+roomArt(room)+'" alt="" loading="lazy"><span><strong>'+esc(room.name||'Sala musical')+'</strong>'+
        '<small>'+(room.isPlaying?'● Ao vivo · ':'')+fmt(room.listenerCount)+' ouvindo</small></span><i>▷</i></button>'
      ).join(''):'<p class="sf125-muted">Ainda não há salas públicas. Que tal criar a primeira?</p>';
    }catch(e){$('sf125LiveRooms').innerHTML='<p class="sf125-muted">Não foi possível consultar salas agora.</p>';}
    try{
      const response=await fetch('/api/gamification/leaderboard',{credentials:'include',cache:'no-store'});
      if(!response.ok)throw Error('ranking');
      const json=await response.json();const items=Array.isArray(json.items)?json.items.slice(0,3):[];
      $('sf125Leaders').innerHTML=items.length?items.map((x,i)=>
        '<div class="sf125-rail-leader"><span class="sf125-leader-rank">'+(i+1)+'º</span>'+
        '<strong>'+esc(x.nome||'Ouvinte')+'</strong><small>'+fmt(x.points)+' XP</small></div>'
      ).join(''):'<p class="sf125-muted">O ranking aparecerá conforme os fãs participarem.</p>';
    }catch(e){$('sf125Leaders').innerHTML='<p class="sf125-muted">Ranking temporariamente indisponível.</p>';}
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
  function addModalRail(container,activeArea){
    if(!container||container.querySelector(':scope > .sf125-modal-rail'))return;
    container.classList.add('sf125-has-rail');
    const rail=document.createElement('aside');
    rail.className='sf125-modal-rail';rail.setAttribute('aria-label','Navegação da plataforma');
    rail.innerHTML='<div class="sf125-modal-brand"><img src="/brand-64/sonorafan-logo-transparent.png" alt="SonoraFan" width="180" height="60"></div>'+
      '<nav class="sf125-modal-menu">'+nav.map(item=>'<button type="button" data-sf125-modal-go="'+item[0]+'"'+
        (item[0]===activeArea?' class="is-active" aria-current="page"':'')+'>'+
        '<span aria-hidden="true">'+item[1]+'</span>'+item[2]+'</button>').join('')+'</nav>'+
      '<div class="sf125-modal-waves" aria-hidden="true"></div>';
    container.prepend(rail);
    rail.addEventListener('click',event=>{
      const button=event.target.closest('[data-sf125-modal-go]');
      if(!button)return;
      closeActiveOverlay();go(button.dataset.sf125ModalGo);
    });
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
