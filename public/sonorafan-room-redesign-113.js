
/* SonoraFan 113 — apresentação da sala sem substituir reprodução, fila ou chat. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const screen = $('screen-room');
  if (!screen || !$('sf113VisualStage')) return;
  const KEY = 'sonorafan:room-player-view:v113';
  const FALLBACK = '/art-44/vinyl-room.webp';
  let mode = 'visual';
  try {
    if (localStorage.getItem(KEY) === 'video') mode = 'video';
  } catch (_) {}

  function setView(next, persist = true) {
    mode = next === 'video' ? 'video' : 'visual';
    screen.setAttribute('data-sf113-view', mode);
    screen.querySelectorAll('.sf113-view-switch button[data-sf113-view]').forEach(button => {
      const selected = button.dataset.sf113View === mode;
      button.setAttribute('aria-pressed', String(selected));
      button.title = selected ? 'Visualização selecionada' : 'Selecionar visualização ' + button.textContent.trim();
    });
    if (persist) {
      try { localStorage.setItem(KEY, mode); } catch (_) {}
    }
    // Não modificar o iframe, nem invocar playVideo/pauseVideo/loadVideoById.
    // O vídeo do YouTube permanece carregado, com áudio e fila sincronizados.
  }

  const text = (id, fallback) => ($(id)?.textContent || '').trim() || fallback;
  function syncArtwork() {
    const title = text('trackTitle', 'Aguardando música');
    const artist = text('trackArtist', 'Escolha uma música para a fila');
    const roomName = text('sf5RoomName', text('roomTitle', 'Sala musical'));
    const count = text('sf5ListenersCount', text('userCount', '0'));
    const chosenTheme = text('sf88ThemeName', 'Geral · Original');
    for (const id of ['sf113NowTitle','sf113VisualTitle']) if ($(id)) $(id).textContent = title;
    for (const id of ['sf113NowArtist','sf113VisualArtist']) if ($(id)) $(id).textContent = artist;
    if ($('sf113NowRoom')) $('sf113NowRoom').textContent = roomName;
    if ($('sf113NowListeners')) $('sf113NowListeners').textContent = count + ' ouvindo';
    if ($('sf113NowTheme')) $('sf113NowTheme').textContent = chosenTheme;
    const img = $('trackCover')?.querySelector('img');
    const src = img?.getAttribute('src') || FALLBACK;
    for (const id of ['sf113NowImage','sf113VisualCover','sf113VisualBackdrop']) {
      const target = $(id);
      if (target && target.getAttribute('src') !== src) {
        target.dataset.fallback = '';
        target.src = src;
      }
    }
  }

  ['sf113NowImage','sf113VisualCover','sf113VisualBackdrop'].forEach(id => {
    $(id)?.addEventListener('error', event => {
      if (event.currentTarget.dataset.fallback !== '1') {
        event.currentTarget.dataset.fallback = '1';
        event.currentTarget.src = FALLBACK;
      }
    });
  });

  const isMobile = () => matchMedia('(max-width:768px)').matches;
  function navigate(destination) {
    if (!['player','queue','chat','people'].includes(destination)) return;
    screen.querySelectorAll('.sf113-nav [data-sf113-target]').forEach(button => {
      const active = button.dataset.sf113Target === destination;
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current','page');
      else button.removeAttribute('aria-current');
    });
    const tabs = { player:'player', queue:'queue', chat:'chat', people:'chat' };
    if (isMobile() && typeof window.setTab === 'function') {
      window.setTab(tabs[destination]);
      if (destination === 'people') $('userCount')?.click();
      return;
    }
    const targets = {
      player: $('playerSection'),
      queue: $('queueList'),
      chat: $('chatMessages'),
      people: $('sf5ListenersBody')
    };
    const target = targets[destination];
    if (target) target.scrollIntoView({behavior:'smooth',block:'nearest',inline:'nearest'});
  }

  const backdrop = $('sf113SearchBackdrop');
  function closeSearch() {
    screen.classList.remove('sf113-search-open');
    if (backdrop) backdrop.hidden = true;
  }
  function openSongSearch() {
    if (isMobile() && typeof window.sf76OpenMusic === 'function') {
      window.sf76OpenMusic('search');
      return;
    }
    screen.classList.add('sf113-search-open');
    if (backdrop) backdrop.hidden = false;
    window.requestAnimationFrame(() => $('songUrl')?.focus());
  }

  window.sf113SetView = setView;
  window.sf113Navigate = navigate;
  window.sf113OpenSongSearch = openSongSearch;
  window.sf113CloseSongSearch = closeSearch;

  screen.querySelectorAll('.sf113-view-switch button').forEach(button => {
    button.addEventListener('click', () => setView(button.dataset.sf113View));
  });
  screen.querySelectorAll('.sf113-nav button').forEach(button => {
    button.addEventListener('click', () => navigate(button.dataset.sf113Target));
  });
  $('sf113AddMusic')?.addEventListener('click', openSongSearch);
  backdrop?.addEventListener('click', closeSearch);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && screen.classList.contains('sf113-search-open')) {
      closeSearch(); $('sf113AddMusic')?.focus();
    }
  });

  // Sincronização com os campos que o SonoraFan já atualiza via Socket.IO.
  const mutationNodes = [
    'trackTitle','trackArtist','trackCover','sf5RoomName',
    'roomTitle','sf5ListenersCount','userCount','sf88ThemeName'
  ];
  const observer = new MutationObserver(syncArtwork);
  mutationNodes.forEach(id => {
    const element = $(id);
    if (element) observer.observe(element,{childList:true,subtree:true,characterData:true,attributes:id==='trackCover',attributeFilter:id==='trackCover'?['src']:undefined});
  });
  screen.addEventListener('click', event => {
    const menu = event.target.closest('.sf113-menu-pop button');
    if (menu) screen.querySelector('.sf113-menu')?.removeAttribute('open');
  });

  setView(mode, false);
  syncArtwork();
})();
