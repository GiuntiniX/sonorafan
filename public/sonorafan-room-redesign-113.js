
/* SonoraFan 113 — apresentação da sala sem substituir reprodução, fila ou chat. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const screen = $('screen-room');
  if (!screen || !$('sf113VisualStage')) return;
  const KEY = 'sonorafan:room-player-view:v113';
  const FALLBACK = '/art-44/vinyl-room.webp';
  // O vídeo é a experiência padrão; a escolha explícita anterior é respeitada.
  let mode = 'video';
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'visual' || saved === 'video') mode = saved;
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


/* SonoraFan 116 — menu acessível, artista em destaque e próxima faixa. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const room = $('screen-room');
  const trigger = $('sf116MoreButton');
  const panel = $('sf116MorePanel');
  if (!room || !trigger || !panel) return;
  const FALLBACK = '/art-44/vinyl-room.webp';

  function menuOpen(open, focusTrigger = false) {
    panel.hidden = !open;
    trigger.setAttribute('aria-expanded', String(open));
    if (focusTrigger) trigger.focus();
  }

  trigger.addEventListener('click', event => {
    event.stopPropagation();
    menuOpen(panel.hidden);
  });
  document.addEventListener('pointerdown', event => {
    if (!panel.hidden && !event.target.closest('#sf116More')) menuOpen(false);
  });
  panel.addEventListener('click', event => {
    if (event.target.closest('button')) menuOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (panel.hidden) return;
    const items = Array.from(panel.querySelectorAll('button:not([disabled])'));
    const index = items.indexOf(document.activeElement);
    if (event.key === 'Escape') {
      event.preventDefault();
      menuOpen(false, true);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const offset = event.key === 'ArrowDown' ? 1 : -1;
      items[(index + offset + items.length) % items.length]?.focus();
    }
  });

  function setText(id, value) {
    const el = $(id);
    if (el && el.textContent !== value) el.textContent = value;
  }
  function setCover(id, src) {
    const image = $(id);
    if (!image || !src || image.getAttribute('src') === src) return;
    image.src = src;
  }
  const safeYoutubeThumb = id =>
    /^[A-Za-z0-9_-]{11}$/.test(String(id || ''))
      ? 'https://img.youtube.com/vi/' + id + '/mqdefault.jpg'
      : FALLBACK;

  function syncStageAndUpcoming() {
    const artist = ($('trackArtist')?.textContent || '').trim();
    const hasTrack = artist && !/^(Adicione uma música|Escolha uma música|Desconhecido)$/i.test(artist);
    setText('sf116BandWordmark', hasTrack ? artist : 'SONORAFAN');
    setText('sf116VisualGenre', ($('sf88ThemeName')?.textContent || '').trim() || 'Arte musical');

    // Uses only the public read-only player state. Never loads, skips or pauses video.
    const state = typeof window.sf100PlayerSnapshot === 'function'
      ? window.sf100PlayerSnapshot()?.currentRoomData : null;
    const queue = Array.isArray(state?.queue) ? state.queue : [];
    const index = Number.isInteger(state?.currentIndex) ? state.currentIndex : 0;
    const next = queue[index + 1];
    const nextVisible = $('nextTrack')?.style.display !== 'none';
    const nextTitle = next?.title || (nextVisible ? $('nextTitle')?.textContent : '') || '';
    const nextArtist = next?.artist || (nextVisible ? $('nextArtist')?.textContent : '') || '';
    setText('sf116NextTitle', nextTitle && nextTitle !== '-' ? nextTitle : 'Fila aberta');
    setText('sf116NextArtist', nextArtist && nextArtist !== '-' ? nextArtist : 'Adicione a próxima música');
    setText('sf116NextDj', next?.dj ? 'Adicionada por ' + String(next.dj) : '');
    const image = next?.id ? safeYoutubeThumb(next.id)
      : (nextVisible ? $('nextThumb')?.querySelector('img')?.getAttribute('src') : null);
    setCover('sf116NextCover', image || FALLBACK);
  }

  const image = $('sf116NextCover');
  image?.addEventListener('error', () => {
    if (image.getAttribute('src') !== FALLBACK) image.src = FALLBACK;
  });

  const observer = new MutationObserver(syncStageAndUpcoming);
  for (const id of [
    'trackArtist', 'trackTitle', 'nextTrack', 'nextTitle', 'nextArtist',
    'nextThumb', 'sf88ThemeName', 'queueCount'
  ]) {
    const el = $(id);
    if (el) observer.observe(el, {childList:true, subtree:true, characterData:true});
  }
  syncStageAndUpcoming();
})();


/* SonoraFan 117 — status do áudio, progresso com tempo restante e ampliação do vídeo. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const room = $('screen-room');
  const slider = $('volumeSlider');
  const toggle = $('sf117VolumeToggle');
  const fill = $('progressFill');
  const timeline = $('sf117ProgressTrack');
  const remainingLabel = $('sf117Remaining');
  const current = $('currentTime');
  const total = $('totalTime');
  const frame = room?.querySelector('.player-frame');
  if (!room || !slider || !toggle || !fill || !timeline || !remainingLabel) return;

  const MAX_VOLUME = 100;
  const lastAudibleKey = 'sf117LastAudibleVolume';
  let lastAudible = 80;
  try {
    const stored = Number(localStorage.getItem(lastAudibleKey));
    if (Number.isFinite(stored) && stored > 0 && stored <= MAX_VOLUME) lastAudible = stored;
  } catch (_) {}

  function volumeValue() {
    const number = Number(slider.value);
    return Number.isFinite(number) ? Math.min(MAX_VOLUME, Math.max(0,number)) : 0;
  }
  function updateVolumeUI() {
    const value = volumeValue();
    if (value > 0) {
      lastAudible = value;
      try {localStorage.setItem(lastAudibleKey,String(value));} catch (_) {}
    }
    room.style.setProperty('--sf117-volume-pct', value + '%');
    const muted = value === 0;
    toggle.setAttribute('aria-pressed',String(muted));
    toggle.setAttribute('aria-label', muted ? 'Ativar áudio' : 'Silenciar áudio');
    toggle.title = muted ? 'Ativar áudio' : 'Silenciar áudio';
    const icon = $('volIcon');
    if (icon) icon.textContent = muted ? '🔇' : value < 40 ? '🔉' : '🔊';
    const output = $('volumeValue');
    if (output) output.textContent = value + '%';
  }

  toggle.addEventListener('click', () => {
    const next = volumeValue() > 0 ? 0 : lastAudible;
    slider.value = String(next);
    // Reuse the original SonoraFan audio recovery (including persistence).
    if (typeof window.setVolume === 'function') window.setVolume(next);
    else slider.dispatchEvent(new Event('input',{bubbles:true}));
    updateVolumeUI();
  });
  slider.addEventListener('input',updateVolumeUI);
  slider.addEventListener('change',updateVolumeUI);
  document.addEventListener('DOMContentLoaded',updateVolumeUI,{once:true});

  function parseClock(value) {
    const parts = String(value || '').trim().split(':');
    if (parts.length < 2 || parts.length > 3 || parts.some(part=>!/^[0-9]+$/.test(part))) return NaN;
    return parts.reduce((acc,part)=>acc*60 + Number(part),0);
  }
  function displayClock(value) {
    const seconds = Math.max(0,Math.floor(value));
    const h = Math.floor(seconds/3600);
    const m = Math.floor((seconds%3600)/60);
    const s = String(seconds%60).padStart(2,'0');
    return h > 0 ? h + ':' + String(m).padStart(2,'0') + ':' + s : m + ':' + s;
  }
  function updateProgressUI() {
    const seconds = parseClock(current?.textContent);
    const duration = parseClock(total?.textContent);
    const ready = Number.isFinite(seconds) && Number.isFinite(duration) && duration > 0;
    const pct = ready ? Math.min(100,Math.max(0,seconds/duration*100)) : 0;
    timeline.setAttribute('aria-valuenow', String(Math.round(pct)));
    timeline.setAttribute('aria-valuetext',ready
      ? displayClock(seconds)+' de '+displayClock(duration)
      : 'Aguardando música');
    const left = ready ? Math.max(0,duration-seconds) : 0;
    const ending = ready && left <= 30;
    const hasProgress = ready && seconds > 0;
    timeline.classList.toggle('sf117-ending', ending);
    timeline.classList.toggle('sf117-has-progress', hasProgress);
    remainingLabel.classList.toggle('sf117-ending', ending);
    remainingLabel.textContent = ready
      ? (left === 0 ? 'Finalizando' : 'Faltam '+displayClock(left))
      : 'Aguardando música';
    fill.style.width = pct.toFixed(2)+'%';
  }
  if (current && total) {
    const observer = new MutationObserver(updateProgressUI);
    observer.observe(current,{characterData:true,childList:true,subtree:true});
    observer.observe(total,{characterData:true,childList:true,subtree:true});
  }

  // v119: keep the real YouTube iframe AND its internal player dimensions in sync.
  // CSS-only resizing can leave YouTube rendering at its original 460 × 260.
  let sf119FrameSize = '';
  let sf119LastIframe = null;
  function fitVideoStage() {
    if (!frame) return;
    const width = frame.clientWidth;
    const height = frame.clientHeight;
    if (width < 20 || height < 20) return;
    const ratio = 16 / 9;
    const fullWidth = Math.ceil(Math.max(width, height * ratio));
    const fullHeight = Math.ceil(fullWidth / ratio);
    const widthPx = fullWidth + 'px';
    const heightPx = fullHeight + 'px';
    frame.style.setProperty('--sf118-video-width', widthPx);
    frame.style.setProperty('--sf118-video-height', heightPx);

    // The API replaces the placeholder with an iframe retaining initial dimensions.
    // Use important inline dimensions to defeat legacy 205/280px iframe rules.
    const holder = frame.querySelector('#youtube-player');
    const iframe = holder?.tagName === 'IFRAME' ? holder
      : holder?.querySelector('iframe') || frame.querySelector('iframe');
    if (iframe) {
      iframe.style.setProperty('position', 'absolute', 'important');
      iframe.style.setProperty('width', widthPx, 'important');
      iframe.style.setProperty('height', heightPx, 'important');
      iframe.style.setProperty('min-width', widthPx, 'important');
      iframe.style.setProperty('min-height', heightPx, 'important');
      iframe.style.setProperty('max-width', 'none', 'important');
      iframe.style.setProperty('max-height', 'none', 'important');
      iframe.style.setProperty('aspect-ratio', '16 / 9', 'important');
      iframe.style.setProperty('inset', 'auto', 'important');
      iframe.style.setProperty('top', '50%', 'important');
      iframe.style.setProperty('left', '50%', 'important');
      iframe.style.setProperty('transform', 'translate(-50%, -50%)', 'important');
      if (iframe.getAttribute('width') !== String(fullWidth))
        iframe.setAttribute('width', String(fullWidth));
      if (iframe.getAttribute('height') !== String(fullHeight))
        iframe.setAttribute('height', String(fullHeight));
    }
    const key = fullWidth + 'x' + fullHeight;
    const iframeChanged = Boolean(iframe && iframe !== sf119LastIframe);
    if (iframeChanged) sf119LastIframe = iframe;
    if (key !== sf119FrameSize || iframeChanged) {
      sf119FrameSize = key;
      // Dedicated bridge to the existing YouTube Player API. Does not seek or pause.
      window.sf119ResizeYoutube?.(fullWidth, fullHeight);
    }
  }
  window.sf119FitVideoStage = fitVideoStage;
  if (frame) {
    if (typeof ResizeObserver === 'function') {
      new ResizeObserver(fitVideoStage).observe(frame);
    }
    // YT.Player dynamically replaces the #youtube-player DIV with an IFRAME.
    new MutationObserver(fitVideoStage).observe(frame, { childList: true, subtree: true });
    room.querySelectorAll('.sf113-view-switch button').forEach(button =>
      button.addEventListener('click', () => requestAnimationFrame(fitVideoStage)));
  }

  updateVolumeUI();
  updateProgressUI();
  fitVideoStage();
})();
