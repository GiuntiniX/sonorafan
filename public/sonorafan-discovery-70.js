/* SonoraFan 70.0 — filtros úteis no lobby e favoritos com classificação direta na descoberta */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const $$ = (q, base=document) => Array.from(base.querySelectorAll(q));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  const normalize = value => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  const toastify = (msg, bad=false) => {
    if (typeof toast === 'function') toast(msg, bad ? 'error' : 'success');
  };

  const discoveryState = {
    roomQuery: '',
    genre: '',
    genreLabel: '',
    debounce: null,
    lastGenres: []
  };

  const pickerState = {
    open: false,
    track: null,
    genres: [],busy:false,previousFocus:null
  };

  async function api(url, options={}) {
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),12000);
    try{
      const response=await fetch(url,{
        credentials:'include',...options,signal:controller.signal,
        headers:{...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})}
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||'Não foi possível concluir a ação.');
      return data;
    }catch(error){if(error?.name==='AbortError')throw new Error('Sem resposta do servidor. Tente novamente.');throw error;}
    finally{clearTimeout(timer);}
  }

  function roomHaystack(room) {
    return normalize([
      room?.name,
      room?.description,
      room?.currentTrack?.title,
      room?.currentTrack?.artist,
      room?.allowLive ? 'live' : '',
      room?.allowLong ? 'longform podcast show' : ''
    ].join(' '));
  }

  const previousPrepareRooms = window.sf50PrepareRooms;
  window.sf50PrepareRooms = function sf70PrepareRooms(rooms) {
    let list = Array.isArray(rooms) ? rooms.slice() : [];
    if (typeof previousPrepareRooms === 'function') {
      list = previousPrepareRooms(list);
    } else {
      list.sort((a, b) => (Number(b?.listenerCount) || 0) - (Number(a?.listenerCount) || 0));
    }

    const query = normalize(discoveryState.roomQuery);
    const genre = normalize(discoveryState.genre);
    if (!query && !genre) return list;

    return list.filter(room => {
      const hay = roomHaystack(room);
      if (query && !hay.includes(query)) return false;
      if (genre && !hay.includes(genre)) return false;
      return true;
    });
  };

  function refreshLobbyResults() {
    clearTimeout(discoveryState.debounce);
    discoveryState.debounce = setTimeout(() => {
      if (typeof loadRooms === 'function') loadRooms();
    }, 120);
  }

  function syncGenreButtons() {
    $$('[data-sf32-genre]').forEach(button => {
      const active = normalize(button.dataset.sf32Genre) === normalize(discoveryState.genre);
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    const label = $('sf10RoomsHeading');
    if (label) {
      label.textContent = discoveryState.genreLabel
        ? `Salas com clima de ${discoveryState.genreLabel}`
        : 'Salas para você';
    }
    const clearButton = $('sf32SearchClear');
    if (clearButton) clearButton.hidden = !(discoveryState.roomQuery || discoveryState.genre);
  }

  function installLobbyEnhancements() {
    const queryInput = $('sf10RoomQuery');
    const clearButton = $('sf32SearchClear');
    if (!queryInput) return;

    discoveryState.roomQuery = String(queryInput.value || '').trim();
    syncGenreButtons();

    queryInput.addEventListener('input', event => {
      discoveryState.roomQuery = String(event.target.value || '').trim();
      syncGenreButtons();
      refreshLobbyResults();
    });

    clearButton?.addEventListener('click', () => {
      discoveryState.roomQuery = '';
      discoveryState.genre = '';
      discoveryState.genreLabel = '';
      queryInput.value = '';
      syncGenreButtons();
      refreshLobbyResults();
    });

    $$('[data-sf32-genre]').forEach(button => {
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => {
        const value = String(button.dataset.sf32Genre || '').trim();
        const wasActive = normalize(discoveryState.genre) === normalize(value);
        if (wasActive) {
          discoveryState.genre = '';
          discoveryState.genreLabel = '';
        } else {
          discoveryState.genre = value;
          discoveryState.genreLabel = button.textContent.trim();
        }
        syncGenreButtons();
        refreshLobbyResults();
      });
    });
  }

  function currentFavorites() {
    return (typeof myFavorites !== 'undefined' && Array.isArray(myFavorites)) ? myFavorites : [];
  }

  function findFavorite(id) {
    return currentFavorites().find(item => String(item?.id || '') === String(id || '')) || null;
  }

  function upsertFavoriteLocal(item) {
    if (!item || !item.id) return;
    const list = currentFavorites();
    const index = list.findIndex(entry => String(entry?.id || '') === String(item.id));
    if (index >= 0) list[index] = { ...list[index], ...item };
    else list.push(item);
  }

  function removeTransientPicker() {
    const overlay = $('sf70FavoritePicker');
    if (!overlay) return;
    overlay.classList.remove('active');
    overlay.hidden = true;
    pickerState.open = false;
    pickerState.track = null;
    pickerState.previousFocus?.focus?.();
    pickerState.previousFocus=null;
  }

  function ensurePicker() {
    if ($('sf70FavoritePicker')) return;
    const overlay = document.createElement('div');
    overlay.id = 'sf70FavoritePicker';
    overlay.className = 'sf70-favorite-picker';
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="sf70-favorite-dialog" role="dialog" aria-modal="true" aria-labelledby="sf70FavoriteTitle">
        <div class="sf70-favorite-head">
          <div>
            <span class="sf70-kicker">FAVORITAR E ORGANIZAR</span>
            <h3 id="sf70FavoriteTitle">Salvar música</h3>
            <p id="sf70FavoriteSubtitle">Escolha onde essa música deve ficar.</p>
          </div>
          <button type="button" class="sf70-close" aria-label="Fechar">✕</button>
        </div>
        <div class="sf70-favorite-body">
          <div class="sf70-track-preview" id="sf70TrackPreview"></div>
          <label class="sf70-field">
            <span>Categoria / gênero</span>
            <select id="sf70GenreSelect"></select>
          </label>
          <label class="sf70-field" id="sf70NewGenreField" hidden>
            <span>Criar nova categoria</span>
            <input type="text" id="sf70NewGenreName" maxlength="28" placeholder="Ex.: Rock nacional, Chill, Clássicos">
          </label>
          <small class="sf70-help">Você pode usar um gênero pronto, criar uma categoria própria ou deixar a música sem classificação.</small>
          <p id="sf70FavoriteError" class="sf70-error" role="alert" aria-live="polite"></p>
        </div>
        <div class="sf70-favorite-actions">
          <button type="button" class="sf70-secondary" id="sf70FavoriteCancel">Cancelar</button>
          <button type="button" class="sf70-primary" id="sf70FavoriteSave">Salvar favorita</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', event => {
      if (event.target === overlay) removeTransientPicker();
    });
    overlay.querySelector('.sf70-close')?.addEventListener('click', removeTransientPicker);
    $('sf70FavoriteCancel')?.addEventListener('click', removeTransientPicker);
    $('sf70GenreSelect')?.addEventListener('change', () => {
      const custom = $('sf70GenreSelect').value === '__new__';
      $('sf70NewGenreField').hidden = !custom;
      if (custom) $('sf70NewGenreName')?.focus();
    });
    $('sf70FavoriteSave')?.addEventListener('click', saveFavoriteFromPicker);
    document.addEventListener('keydown',event=>{
      if(!pickerState.open)return;
      const dialog=overlay.querySelector('.sf70-favorite-dialog');
      if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();removeTransientPicker();return;}
      if(event.key!=='Tab')return;
      const focusable=[...dialog.querySelectorAll('button:not([disabled]),input:not([disabled]):not([hidden]),select:not([disabled])')].filter(el=>el.getClientRects().length);
      if(!focusable.length)return;
      if(event.shiftKey&&document.activeElement===focusable[0]){event.preventDefault();focusable.at(-1).focus();}
      else if(!event.shiftKey&&document.activeElement===focusable.at(-1)){event.preventDefault();focusable[0].focus();}
    },true);
  }

  async function loadPickerGenres() {
    const response = await api('/api/favorite-genres').catch(() => ({ genres: [] }));
    pickerState.genres = Array.isArray(response?.genres) ? response.genres : [];
    discoveryState.lastGenres = pickerState.genres.slice();
    return pickerState.genres;
  }

  function renderPicker(track, existing) {
    ensurePicker();
    const overlay = $('sf70FavoritePicker');
    const preview = $('sf70TrackPreview');
    const select = $('sf70GenreSelect');
    const subtitle = $('sf70FavoriteSubtitle');
    const titleNode = $('sf70FavoriteTitle');
    const saveButton = $('sf70FavoriteSave');

    preview.innerHTML = `<img src="https://img.youtube.com/vi/${encodeURIComponent(track.id)}/mqdefault.jpg" alt=""><div><strong>${esc(track.title || 'Música')}</strong><small>${esc(track.artist || 'Artista')}</small></div>`;
    subtitle.textContent = existing
      ? 'Essa música já está nos seus favoritos. Aproveite para ajustar a classificação.'
      : 'Adicione a música aos favoritos e já defina onde ela deve aparecer.';
    titleNode.textContent = existing ? 'Organizar favorita' : 'Salvar música';
    saveButton.textContent = existing ? 'Salvar classificação' : 'Salvar favorita';
    saveButton.disabled=false;
    const message=$('sf70FavoriteError');if(message)message.textContent='';

    const options = [
      '<option value="">Sem classificação</option>',
      ...pickerState.genres.map(genre => `<option value="${esc(genre.id)}">${esc(genre.name)}</option>`),
      '<option value="__new__">＋ Criar nova categoria</option>'
    ];
    select.innerHTML = options.join('');
    select.value = existing?.genreId || '';
    $('sf70NewGenreField').hidden = true;
    $('sf70NewGenreName').value = '';

    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add('active'));
    pickerState.open = true;
    $('sf70FavoriteSave')?.focus();
  }

  async function openFavoritePicker(track) {
    if (!track?.id) return;
    pickerState.track = track;
    pickerState.previousFocus=document.activeElement;
    const existing = findFavorite(track.id);
    await loadPickerGenres();
    renderPicker(track, existing);
  }

  async function resolveGenreChoice() {
    const selected = $('sf70GenreSelect').value;
    if (selected !== '__new__') return selected;
    const name = String($('sf70NewGenreName').value || '').trim();
    if (!name) throw new Error('Digite o nome da nova categoria.');
    const created = await api('/api/favorite-genres', {
      method: 'POST',
      body: JSON.stringify({ name })
    });
    const genre = created?.genre || null;
    if (genre) {
      pickerState.genres.push(genre);
      discoveryState.lastGenres = pickerState.genres.slice();
      return genre.id;
    }
    return '';
  }

  async function saveFavoriteFromPicker() {
    const track=pickerState.track;
    if(!track?.id||pickerState.busy)return;
    pickerState.busy=true;
    const saveBtn=$('sf70FavoriteSave');if(saveBtn)saveBtn.disabled=true;
    const errorNode=$('sf70FavoriteError');if(errorNode)errorNode.textContent='';
    try {
      const genreId = await resolveGenreChoice();
      let favorite = findFavorite(track.id);
      if (!favorite) {
        await api('/api/favorites', {
          method: 'POST',
          body: JSON.stringify({ videoId: track.id, title: track.title, artist: track.artist })
        });
        favorite = { id: track.id, title: track.title, artist: track.artist, genreId: '' };
        upsertFavoriteLocal(favorite); // already persisted even if classifying subsequently fails
      }
      if (genreId !== (favorite?.genreId || '')) {
        await api(`/api/favorites/${encodeURIComponent(track.id)}/genre`, {
          method: 'PATCH',
          body: JSON.stringify({ genreId })
        });
      }
      const next = { ...(favorite || {}), id: track.id, title: track.title, artist: track.artist, genreId };
      upsertFavoriteLocal(next);
      removeTransientPicker();
      window.sf67RenderFavorites?.();
      refreshMusicHubCards();
      toastify(genreId ? '⭐ Música favorita e classificada.' : '⭐ Música favorita.');
    } catch (error) {
      const message=error.message||'Não foi possível salvar a favorita.';
      if(errorNode)errorNode.textContent=message;
      toastify(message,true);
    } finally {pickerState.busy=false;if(saveBtn)saveBtn.disabled=false;}
  }

  function genreName(genreId) {
    const found = discoveryState.lastGenres.find(genre => genre.id === genreId);
    return found?.name || '';
  }

  function parseTrackFromCard(card) {
    if (!card) return null;
    const button = card.querySelector('[data-sf63-action^="song:"]');
    if (!button) return null;
    const raw = String(button.dataset.sf63Action || '');
    const id = raw.startsWith('song:') ? raw.slice(5) : '';
    const title = card.querySelector('strong')?.textContent?.trim() || 'Música';
    const artist = card.querySelector('small')?.textContent?.trim() || 'Artista';
    return id ? { id, title, artist } : null;
  }

  function decorateFavoriteCard(card, favorite) {
    const info = card.querySelector('div');
    if (!info) return;
    let badge = card.querySelector('.sf70-genre-badge');
    const label = favorite?.genreId ? genreName(favorite.genreId) : '';
    if (!label) {
      badge?.remove();
      return;
    }
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'sf70-genre-badge';
      info.appendChild(badge);
    }
    if (badge.textContent !== label) badge.textContent = label;
  }

  function refreshMusicHubCards() {
    const hub = $('sf63Hub');
    const musicForm = $('sf63MusicForm');
    if (!hub || hub.hidden || !musicForm) return;

    const intro = document.querySelector('#sf63HubBody .sf63-intro p');
    const description = 'Escolha uma música para colocar na fila. Favoritar é uma ação separada e opcional.';
    if (intro && intro.textContent !== description) intro.textContent = description;

    $$('#sf63MusicResults .sf63-track').forEach(card => {
      const track = parseTrackFromCard(card);
      if (!track) return;
      const button = card.querySelector('[data-sf63-action^="song:"]');
      if (button) {
        if (!button.disabled && button.textContent !== '＋ Adicionar à fila') button.textContent = '＋ Adicionar à fila';
        button.classList.remove('sf70-favorite-trigger');
        button.classList.add('sf70-queue-trigger');
        button.setAttribute('aria-label', 'Adicionar ' + track.title + ' à fila da sala');
      }
      let save = card.querySelector('[data-sf70-favorite]');
      if (!save) {
        save = document.createElement('button');
        save.type = 'button';
        save.dataset.sf70Favorite = track.id;
        save.className = 'sf70-favorite-trigger';
        card.appendChild(save);
      }
      const favorite = findFavorite(track.id);
      const label = favorite ? '✓ Organizar' : '♡ Favoritar';
      if (save.textContent !== label) save.textContent = label;
      save.setAttribute('aria-label', favorite ? 'Organizar favorita ' + track.title : 'Favoritar ' + track.title);
    });

    $$('#sf63FavoritesList .sf63-track').forEach(card => {
      const track = parseTrackFromCard(card);
      if (!track) return;
      const button = card.querySelector('[data-sf63-action^="song:"]');
      const favorite = findFavorite(track.id);
      decorateFavoriteCard(card, favorite);
      if (button) {
        const label = (typeof currentRoom !== 'undefined' && currentRoom) ? '＋ Na fila' : '⚙ Organizar';
        if (button.textContent !== label) button.textContent = label;
        button.classList.add('sf70-queue-trigger');
      }
    });
  }

  function interceptMusicHubActions() {
    // Apenas o botão secundário de favoritos é interceptado.
    // O botão principal [data-sf63-action="song:..."] deve chegar
    // ao módulo 63, que confirma o envio para a fila compartilhada.
    document.addEventListener('click', event => {
      const trigger = event.target.closest('#sf63MusicResults [data-sf70-favorite]');
      if (!trigger) return;
      const card = trigger.closest('.sf63-track');
      const track = parseTrackFromCard(card);
      if (!track) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      openFavoritePicker(track);
    }, true);
  }

  function installMusicHubObserver() {
    const target = $('sf63HubBody');
    if (!target) return;
    let scheduled=false;
    const observer = new MutationObserver(() => {
      if(scheduled)return;
      scheduled=true;
      requestAnimationFrame(() => { scheduled=false;refreshMusicHubCards(); });
    });
    observer.observe(target, { childList: true, subtree: true });
    refreshMusicHubCards();
  }

  function init() {
    installLobbyEnhancements();
    ensurePicker();
    interceptMusicHubActions();
    installMusicHubObserver();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
