/* SonoraFan 129 — feedback de permissão sem substituir controles existentes.
   Segurança no servidor (addSong/getPlaylistPermission); não confiar em CSS. */
(() => {
  'use strict';
  const room = document.getElementById('screen-room');
  const $ = id => document.getElementById(id);
  if (!room || typeof socket === 'undefined' || typeof socket.on !== 'function') return;
  let requested = 0;
  let lastSlug = '';
  let currentState = null;

  function setAllowed(value, ownerOnly) {
    const locked = !!ownerOnly && !value;
    room.classList.toggle('sf129-guest-locked', locked);
    room.classList.toggle('sf129-owner-mode', !!ownerOnly);
    for (const id of ['sf113AddMusic','sf116Favorites']) {
      const button = $(id);
      if (!button) continue;
      button.disabled = locked;
      button.setAttribute('aria-disabled', String(locked));
      if (locked) button.title = 'Somente o criador da sala pode adicionar músicas';
      else button.removeAttribute('title');
    }
    const mobileAdd = room.querySelector('#mTabs .sf34-add-mobile');
    if (mobileAdd) {
      mobileAdd.disabled = locked;
      mobileAdd.setAttribute('aria-disabled', String(locked));
      mobileAdd.title = locked ? 'Playlist controlada pelo anfitrião' : 'Abrir busca de músicas';
    }
    let note = $('sf129PlaylistNotice');
    if (!note) {
      note = document.createElement('p');
      note.id = 'sf129PlaylistNotice';
      note.setAttribute('role','status');
      note.className = 'sf129-playlist-notice';
      room.querySelector('.sf128-add-panel')?.append(note);
    }
    if (note) {
      note.hidden = !ownerOnly;
      note.textContent = locked
        ? '🔒 Playlist do anfitrião · acompanhe a live e participe pelo chat.'
        : '🔒 Playlist exclusiva · você controla as músicas desta sala.';
    }
    const kicker = room.querySelector('.sf128-kicker');
    if (kicker) kicker.textContent = locked ? '● TRANSMISSÃO DO ANFITRIÃO' : '✦ SUA VEZ DE ESCOLHER';
    const title = $('sf128AddTitle');
    if (title) title.textContent = locked ? 'Playlist do anfitrião' : 'Adicione a próxima música';
  }

  function sync() {
    if (!room.classList.contains('active') || !currentState?.slug) return;
    const seq = ++requested, slug = currentState.slug;
    socket.emit('getPlaylistPermission', {}, result => {
      if (seq !== requested || !result?.joined || slug !== result.slug) return;
      if (lastSlug !== slug) return;
      setAllowed(!!result.canAdd, !!result.ownerOnly);
    });
  }

  socket.on('roomState', state => {
    if (!state?.slug) return;
    currentState = state;
    lastSlug = state.slug;
    sync();
  });
  socket.on('disconnect', () => {
    requested++;
    lastSlug = '';
    setAllowed(true, false);
  });
  // O estado da sala é emitido no join e a cada edição de permissões.
})();
