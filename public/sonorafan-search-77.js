/* SonoraFan 77 — seleção de músicas em primeiro plano (desktop + mobile).
 * Reutiliza /api/search-youtube, /api/video-info, showPreview e confirmAdd.
 * Não modifica player, regras de fila ou autenticação.
 */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const validId = (value) => /^[A-Za-z0-9_-]{11}$/.test(String(value || ''));
  const roomActive = () => Boolean($('screen-room')?.classList.contains('active'));
  const looksLikeLink = (value) => /^(?:https?:\/\/|https?:?$|https?:?\/|www\.|(?:m\.)?youtube(?:\.com)?(?:\/|\.)|youtu(?:\.be)?(?:\/|\.))/i.test(String(value || '').trim());
  const state = { open: false, sequence: 0, controller: null, timer: null, selected: null, loading: false, lastFocus: null, currentQuery: '', items: [] };

  function build() {
    if ($('sf77MusicModal')) return;
    const layer = document.createElement('div');
    layer.id = 'sf77MusicModal';
    layer.className = 'sf77-overlay';
    layer.hidden = true;
    layer.innerHTML = `
      <div class="sf77-backdrop" data-sf77-close="true"></div>
      <section class="sf77-dialog" role="dialog" aria-modal="true" aria-labelledby="sf77Heading" aria-describedby="sf77Description">
        <header class="sf77-header">
          <div class="sf77-heading-copy">
            <span class="sf77-eyebrow">✳ TODO MUNDO É DJ</span>
            <h2 id="sf77Heading">Escolha a próxima música</h2>
            <p id="sf77Description">Busque por banda ou música e adicione à fila colaborativa.</p>
          </div>
          <button type="button" class="sf77-close" id="sf77Close" aria-label="Fechar busca de músicas">✕</button>
        </header>
        <div class="sf77-search-area">
          <label for="sf77Query">Buscar no YouTube</label>
          <div class="sf77-search-field">
            <span aria-hidden="true">⌕</span>
            <input id="sf77Query" type="search" placeholder="Digite banda ou música, ex.: Iron Maiden" autocomplete="off" spellcheck="false" aria-controls="sf77Results" aria-describedby="sf77SearchStatus">
            <span id="sf77Spinner" class="sf77-spinner" hidden aria-hidden="true"></span>
          </div>
          <div class="sf77-toolbar">
            <span id="sf77SearchStatus" role="status" aria-live="polite">Comece digitando para encontrar sua música.</span>
            <button type="button" id="sf77OpenFavorites" class="sf77-favorites">♡ Minhas favoritas</button>
          </div>
        </div>
        <div class="sf77-main">
          <div id="sf77Results" class="sf77-results" aria-label="Resultados de músicas"></div>
          <div id="sf77Selection" class="sf77-selection" hidden>
            <button type="button" class="sf77-back" id="sf77Back">‹ Voltar aos resultados</button>
            <div class="sf77-picked-card">
              <img id="sf77PickedImage" src="" alt="" loading="lazy">
              <div class="sf77-picked-copy"><span class="sf77-picked-label">MÚSICA SELECIONADA</span><strong id="sf77PickedTitle"></strong><small id="sf77PickedArtist"></small></div>
            </div>
            <p class="sf77-picked-note" id="sf77PickedNote" role="status" aria-live="polite"></p>
            <div class="sf77-actions">
              <button type="button" id="sf77Add" class="sf77-add">＋ Adicionar à fila</button>
              <button type="button" id="sf77Favorite" class="sf77-favorite">♡ Favoritar</button>
            </div>
            <p class="sf77-footnote">Sua escolha entra na fila compartilhada da sala.</p>
          </div>
        </div>
        <footer class="sf77-footer"><span>♫ SonoraFan · fila colaborativa</span><span>Escolha a música que combina com a sua vibe ✦</span></footer>
      </section>`;
    document.body.appendChild(layer);
    $('sf77Close').addEventListener('click', close);
    layer.querySelector('.sf77-backdrop').addEventListener('click', close);
    $('sf77Query').addEventListener('input', (event) => search(event.target.value));
    $('sf77Query').addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown') {
        const first = $('sf77Results').querySelector('.sf77-result');
        if (first && !$('sf77Selection').hidden) return;
        if (first) { event.preventDefault(); first.focus(); }
      }
      if (event.key === 'Enter' && state.currentQuery.trim().length >= 2) {
        event.preventDefault();
        if (state.items.length === 1) choose(state.items[0]);
        else if (!state.items.length && !state.loading) search(state.currentQuery, true);
      }
    });
    $('sf77Results').addEventListener('keydown', (event) => {
      if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
      const buttons = [...$('sf77Results').querySelectorAll('.sf77-result')];
      const pos = buttons.indexOf(document.activeElement);
      if (pos < 0) return;
      event.preventDefault();
      const next = pos + (event.key === 'ArrowDown' ? 1 : -1);
      if (next < 0) $('sf77Query').focus();
      else buttons[Math.min(next, buttons.length - 1)].focus();
    });
    $('sf77Back').addEventListener('click', backToResults);
    $('sf77Add').addEventListener('click', addSelected);
    $('sf77Favorite').addEventListener('click', favoriteSelected);
    $('sf77OpenFavorites').addEventListener('click', () => {
      close();
      if (typeof window.sf76OpenMusic === 'function') window.sf76OpenMusic('favorites');
      else if (typeof window.sf34FindSong === 'function') window.sf34FindSong();
    });
    document.addEventListener('keydown', (event) => {
      if (!state.open) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return; }
      if (event.key !== 'Tab') return;
      const focusable = [...layer.querySelectorAll('button:not([disabled]), input:not([disabled])')]
        .filter(el => !el.closest('[hidden]') && el.getClientRects().length);
      if (!focusable.length) return;
      if (event.shiftKey && document.activeElement === focusable[0]) {
        event.preventDefault(); focusable[focusable.length - 1].focus();
      } else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) {
        event.preventDefault(); focusable[0].focus();
      }
    }, true);
  }

  function status(text, isError = false) {
    const el = $('sf77SearchStatus');
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('sf77-error', Boolean(isError));
  }
  function stopRequest() {
    clearTimeout(state.timer);
    state.timer = null;
    if (state.controller) state.controller.abort();
    state.controller = null;
    state.loading = false;
    state.sequence++;
    if ($('sf77Spinner')) $('sf77Spinner').hidden = true;
  }
  function emptyMessage(text, icon = '♫') {
    $('sf77Results').replaceChildren();
    const el = document.createElement('div');
    el.className = 'sf77-empty';
    const mark = document.createElement('span');
    mark.textContent = icon;
    const label = document.createElement('p');
    label.textContent = text;
    el.append(mark, label);
    $('sf77Results').append(el);
  }
  function renderResults(items) {
    const host = $('sf77Results');
    host.replaceChildren();
    for (const track of items) {
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'sf77-result';
      btn.setAttribute('aria-label', `Selecionar ${track.title || 'música'} de ${track.artist || 'artista'}`);
      const img = document.createElement('img');
      img.src = `https://img.youtube.com/vi/${encodeURIComponent(track.id)}/mqdefault.jpg`;
      img.alt = ''; img.loading = 'lazy';
      const copy = document.createElement('span'); copy.className = 'sf77-result-copy';
      const name = document.createElement('strong'); name.textContent = track.title || 'Música';
      const artist = document.createElement('small'); artist.textContent = track.artist || 'Artista desconhecido';
      copy.append(name, artist);
      const action = document.createElement('span'); action.className = 'sf77-result-action'; action.textContent = '＋ Escolher';
      btn.append(img, copy, action);
      btn.addEventListener('click', () => choose(track));
      host.appendChild(btn);
    }
  }

  function search(value, immediate = false) {
    stopRequest();
    const query = String(value || '');
    state.currentQuery = query;
    $('sf77Query').value = query;
    state.items = [];
    $('sf77Selection').hidden = true;
    $('sf77Results').hidden = false;
    if (query.trim().length < 2) {
      emptyMessage('Digite pelo menos duas letras do artista ou da música para pesquisar.');
      status('Busque uma banda, um artista ou uma faixa.');
      return;
    }
    emptyMessage('Pesquisando músicas no YouTube…', '⌕');
    status('Buscando músicas…');
    const seq = state.sequence;
    state.loading = true;
    $('sf77Spinner').hidden = false;
    state.timer = setTimeout(async () => {
      const controller = new AbortController();
      state.controller = controller;
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch(`/api/search-youtube?q=${encodeURIComponent(query.trim())}`, { credentials: 'include', signal: controller.signal });
        if (!response.ok) throw new Error('A busca está indisponível. Tente novamente.');
        const data = await response.json();
        if (seq !== state.sequence || !state.open) return;
        const tracks = (Array.isArray(data?.items) ? data.items : []).filter(item => validId(item?.id))
          .map(item => ({ id: item.id, title: String(item.title || 'Música'), artist: String(item.artist || 'Artista desconhecido') }));
        state.items = tracks;
        if (!tracks.length) {
          emptyMessage('Nenhuma faixa encontrada. Experimente outro nome.', '⌕');
          status('Nenhum resultado para essa busca.');
        } else {
          renderResults(tracks);
          status(`${tracks.length} ${tracks.length === 1 ? 'resultado encontrado' : 'resultados encontrados'} · selecione uma música`);
        }
      } catch (error) {
        if (seq !== state.sequence || !state.open) return;
        emptyMessage('Não foi possível buscar agora. Confira sua conexão e tente novamente.', '⚠');
        status(error?.name === 'AbortError' ? 'A pesquisa demorou demais. Tente novamente.' : 'Erro ao pesquisar músicas.', true);
      } finally {
        clearTimeout(timeout);
        if (seq === state.sequence && state.open) {
          state.loading = false;
          $('sf77Spinner').hidden = true;
          state.controller = null;
        }
      }
    }, immediate ? 0 : 300);
  }

  async function choose(item) {
    if (!state.open || !validId(item.id)) return;
    stopRequest();
    const seq = state.sequence;
    state.selected = null;
    $('sf77Results').hidden = true;
    $('sf77Selection').hidden = false;
    $('sf77PickedImage').src = `https://img.youtube.com/vi/${encodeURIComponent(item.id)}/mqdefault.jpg`;
    $('sf77PickedTitle').textContent = item.title || 'Música';
    $('sf77PickedArtist').textContent = item.artist || 'Artista desconhecido';
    $('sf77PickedNote').textContent = 'Verificando a duração e a disponibilidade do vídeo…';
    $('sf77Add').disabled = true;
    $('sf77Favorite').disabled = true;
    $('sf77Back').focus();
    let data = {};
    try {
      const controller = new AbortController();
      state.controller = controller;
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch(`/api/video-info?id=${encodeURIComponent(item.id)}`, { credentials: 'include', signal: controller.signal });
        if (response.ok) data = await response.json();
      } finally { clearTimeout(timeout); }
    } catch (_) {
      // Informações indisponíveis não bloqueiam automaticamente a seleção;
      // a validação final permanece com as regras da sala/servidor.
    }
    if (seq !== state.sequence || !state.open) return;
    if (data?.embeddable === false) {
      $('sf77PickedNote').textContent = 'Este vídeo não permite reprodução na sala. Escolha outro resultado.';
      $('sf77PickedNote').classList.add('sf77-error');
      $('sf77Add').disabled = true;
      return;
    }
    const duration = Number(data?.duration) > 0 ? Number(data.duration) : null;
    const selected = { id: item.id, title: String(data?.title || item.title || 'Música'), artist: String(data?.artist || item.artist || 'Artista desconhecido'), duration };
    state.selected = selected;
    $('sf77PickedTitle').textContent = selected.title;
    $('sf77PickedArtist').textContent = selected.artist;
    $('sf77PickedNote').classList.remove('sf77-error');
    const limit = typeof roomLimit === 'function' ? roomLimit() : 600;
    const allowLive = Boolean(typeof currentRoomData !== 'undefined' && currentRoomData?.allowLive);
    const tooLong = Boolean(duration && !allowLive && duration > limit);
    if (tooLong) {
      $('sf77PickedNote').textContent = `⛔ Vídeo acima do limite de ${Math.floor(limit / 60)} minutos da sala.`;
      $('sf77PickedNote').classList.add('sf77-error');
    } else if (duration) {
      const mm = Math.floor(duration / 60), ss = String(duration % 60).padStart(2, '0');
      $('sf77PickedNote').textContent = `✓ Duração ${mm}:${ss} · pronta para entrar na fila.`;
    } else {
      $('sf77PickedNote').textContent = 'Duração não verificada. A sala validará a música ao adicionar.';
    }
    $('sf77Add').disabled = tooLong;
    $('sf77Favorite').disabled = false;
    // A prévia da busca tem ação própria de fila; não acionamos o legado de favoritos.
  }

  function backToResults() {
    state.selected = null;
    stopRequest();
    $('sf77Selection').hidden = true;
    $('sf77Results').hidden = false;
    if (state.items.length) renderResults(state.items);
    else search(state.currentQuery, true);
    if (typeof clearPreview === 'function') clearPreview();
    $('sf77Query').focus();
  }
  async function addSelected() {
    const selected = state.selected;
    const button = $('sf77Add');
    if (!selected || button.disabled) return;
    button.disabled = true;
    button.textContent = '⏳ Enviando à fila…';
    $('sf77PickedNote').classList.remove('sf77-error');
    $('sf77PickedNote').textContent = 'Aguardando confirmação da sala…';
    try {
      if (typeof window.sf80QueueSong !== 'function') throw new Error('A fila está indisponível. Atualize a página.');
      await window.sf80QueueSong(selected);
      $('sf77PickedNote').textContent = '✓ Música adicionada à fila colaborativa!';
      if (typeof toast === 'function') toast('🎵 Música adicionada à fila!', 'success');
      close(false);
      if (typeof clearPreview === 'function') clearPreview();
    } catch (err) {
      $('sf77PickedNote').textContent = err?.message || 'Não foi possível adicionar a música.';
      $('sf77PickedNote').classList.add('sf77-error');
    } finally {
      button.textContent = '＋ Adicionar à fila';
      button.disabled = false;
    }
  }
  async function favoriteSelected() {
    if (!state.selected || typeof favPreview !== 'function') return;
    const btn = $('sf77Favorite'); btn.disabled = true;
    try {
      songData = state.selected;
      await favPreview();
    } finally { btn.disabled = false; }
  }

  function pickTrack(track) {
    if (!validId(track?.id)) return false;
    if (!open(state.open ? state.currentQuery : '')) return false;
    choose(track);
    return true;
  }

  function open(query = '') {
    if (!roomActive()) return false;
    // v138: no celular sf76 é a única janela. Atalhos legados não podem
    // abrir sf77 atrás dela nem disparar outro modal em seguida.
    if (window.matchMedia('(max-width:768px)').matches && typeof window.sf76OpenMusic==='function') {
      window.sf76OpenMusic('search');
      const field=$('sf138SearchQuery');
      const text=String(query||'').trim();
      if(field&&text){
        field.value=text;
        field.dispatchEvent(new Event('input',{bubbles:true}));
      }
      return true;
    }
    build();
    const currentlyOpen = state.open;
    if (!currentlyOpen) {
      if ($('sf76MusicSheet') && !$('sf76MusicSheet').hidden) window.sf76CloseMusic?.();
      state.lastFocus = document.activeElement;
      state.open = true;
      $('sf77MusicModal').hidden = false;
      document.body.classList.add('sf77-search-active');
    }
    if (!currentlyOpen || query !== state.currentQuery) search(query);
    requestAnimationFrame(() => { if (state.open) $('sf77Query').focus({ preventScroll: true }); });
    return true;
  }
  function close(resetSelection = true) {
    if (!state.open) return;
    stopRequest();
    state.open = false;
    $('sf77MusicModal').hidden = true;
    document.body.classList.remove('sf77-search-active');
    if (resetSelection && typeof clearPreview === 'function') clearPreview();
    state.selected = null;
    if (resetSelection && $('songUrl') && !looksLikeLink($('songUrl').value)) $('songUrl').value = '';
    $('searchResults')?.classList.remove('show');
    const previous = state.lastFocus;
    state.lastFocus = null;
    previous?.focus?.({ preventScroll: true });
  }

  function fromField(value) {
    if (!roomActive()) return false;
    const text = String(value || '').trim();
    if (text.length < 2 || looksLikeLink(text)) return false;
    return open(text);
  }
  function init() {
    build();
    window.sf77OpenSearch = open;
    window.sf77PickTrack = pickTrack;
    window.sf77CloseSearch = close;
    window.sf77SearchFromField = fromField;
    const input = $('songUrl'), button = $('addBtn');
    if (input) {
      input.addEventListener('keydown', (event) => {
        // Com a busca rápida presente, Enter pertence ao pop-up compacto.
        if (typeof window.sf78SearchFromField === 'function') return;
        if (event.key === 'Enter' && fromField(input.value)) {
          event.preventDefault(); event.stopImmediatePropagation();
        }
      }, true);
    }
    if (button) {
      button.addEventListener('click', (event) => {
        // Apenas o botão “Busca completa” abre o modo ampliado.
        if (typeof window.sf78SearchFromField === 'function') return;
        if (fromField(input?.value)) {
          event.preventDefault(); event.stopImmediatePropagation();
        }
      }, true);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
