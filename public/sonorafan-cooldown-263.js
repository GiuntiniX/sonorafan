/* SonoraFan 263 — cooldown sincronizado, acessível e pré-seleção manual. */
(() => {
  'use strict';
  const DURATION = 30000;
  const $ = id => document.getElementById(id);
  const ctx = () => typeof currentRoom !== 'undefined' ? String(currentRoom || '') : '';
  const sock = () => typeof socket !== 'undefined' ? socket : null;
  let room = '', deadline = 0, pendingTrack = null, submitting = false, lastSync = 0;
  const cacheKey = slug => 'sf263:cooldown:' + (typeof currentUser !== 'undefined' ? (currentUser?.uid || currentUser?.email || '') : '') + ':' + slug;
  const remainingMs = () => Math.max(0, deadline - Date.now());
  const fmt = ms => '00:' + String(Math.ceil(ms / 1000)).padStart(2, '0');
  function save() {
    try { if(room) localStorage.setItem(cacheKey(room), String(deadline)); } catch (_) {}
  }
  function setRemaining(ms, durationMs = DURATION) {
    const amount = Math.max(0, Math.min(Number(ms) || 0, Number(durationMs) || DURATION));
    deadline = Date.now() + amount;
    save(); render();
  }
  function pull() {
    const client = sock();
    if (!room || !client?.connected || Date.now() - lastSync < 700) return;
    lastSync = Date.now();
    const requestedRoom = room;
    client.timeout(4000).emit('songCooldownStatus', (err, response) => {
      if (err || !response || ctx() !== requestedRoom || response.room !== requestedRoom) return;
      setRemaining(response.remainingMs, response.durationMs);
    });
  }
  function prepare(track) {
    if (!track || !/^[A-Za-z0-9_-]{11}$/.test(String(track.id || ''))) return false;
    if (!ctx()) return false;
    pendingTrack = { id: track.id, title: String(track.title || 'Música'), artist: String(track.artist || 'Artista'), duration: track.duration || null };
    render();
    return true;
  }
  function clearPrepared() { pendingTrack = null; render(); }
  function html() {
    const el = document.createElement('section');
    el.className = 'sf263-cooldown';
    el.setAttribute('aria-label', 'Intervalo entre músicas');
    el.innerHTML = `<div class="sf263-row"><span class="sf263-status"><span class="sf263-dot"></span><span data-sf263-label>Pronto para adicionar</span></span><strong data-sf263-clock>00:00</strong></div>
    <div class="sf263-bar" role="progressbar" aria-label="Liberação da próxima música" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><span data-sf263-progress></span></div>
    <p class="sf263-help" data-sf263-help>Pesquise músicas e salve favoritas enquanto aguarda.</p>
    <div class="sf263-prepared" hidden><div class="sf263-prepared-title"><span>♫</span><span data-sf263-title></span></div><div class="sf263-actions"><button type="button" data-sf263-confirm>Confirmar adição</button><button type="button" data-sf263-cancel aria-label="Remover música preparada">Remover</button></div></div>`;
    el.querySelector('[data-sf263-confirm]').addEventListener('click', confirmPrepared);
    el.querySelector('[data-sf263-cancel]').addEventListener('click', clearPrepared);
    return el;
  }
  function mount() {
    const host = $('sf10RequestCard') || $('sf128AddTitle')?.parentElement;
    if (host && !host.querySelector('.sf263-cooldown')) host.appendChild(html());
    const foot = document.querySelector('#sf76MusicSheet .sf76-foot');
    if (foot && !foot.querySelector('.sf263-cooldown')) foot.prepend(html());
  }
  function render() {
    mount();
    const rem = remainingMs();
    const active = rem > 0;
    const ready = !active && !!pendingTrack;
    document.querySelectorAll('.sf263-cooldown').forEach(el => {
      el.classList.toggle('sf263-active', active);
      el.classList.toggle('sf263-ready', ready);
      el.querySelector('[data-sf263-label]').textContent = active ? 'Próxima música em' : (ready ? 'Sua próxima música está pronta!' : 'Pronto para adicionar');
      el.querySelector('[data-sf263-clock]').textContent = fmt(rem);
      el.querySelector('[data-sf263-progress]').style.width = (active ? (1 - rem / DURATION) * 100 : 100) + '%';
      el.querySelector('[role="progressbar"]').setAttribute('aria-valuenow', String(Math.round(active ? (1 - rem / DURATION) * 100 : 100)));
      el.querySelector('[data-sf263-help]').textContent = active ? 'Você pode buscar e favoritar músicas normalmente. Prepare a próxima para agilizar.' : (ready ? 'Confirme para enviar à fila colaborativa. Não adicionamos automaticamente.' : 'Escolha uma música para colaborar com a fila.');
      const prepared = el.querySelector('.sf263-prepared');
      prepared.hidden = !pendingTrack;
      if (pendingTrack) el.querySelector('[data-sf263-title]').textContent = pendingTrack.title + ' · ' + pendingTrack.artist;
      const confirm = el.querySelector('[data-sf263-confirm]');
      confirm.disabled = active || submitting || !sock()?.connected;
      confirm.textContent = submitting ? 'Enviando…' : active ? 'Disponível em ' + fmt(rem) : '✓ Confirmar adição';
    });
  }
  async function confirmPrepared() {
    if (!pendingTrack || remainingMs() > 0 || submitting) return;
    if (typeof window.sf80QueueSong !== 'function') return;
    const track = { ...pendingTrack };
    submitting = true;
    render();
    try {
      if (!track.duration) {
        const res = await fetch('/api/video-info?id=' + encodeURIComponent(track.id), { credentials: 'include' });
        if (!res.ok) throw new Error('Não foi possível validar esta música.');
        const info = await res.json();
        if (info.embeddable === false) throw new Error('Esta música não permite reprodução na sala.');
        track.duration = Number(info.duration) || null;
      }
      await window.sf80QueueSong(track);
      pendingTrack = null;
      if (typeof toast === 'function') toast('🎵 Música adicionada à fila!', 'success');
    } catch (e) {
      if (typeof toast === 'function') toast(e.message || 'Não foi possível adicionar.', 'error');
    } finally { submitting = false; render(); }
  }
  function show() { mount(); render(); document.querySelector('.sf263-cooldown')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  function onRoom() {
    const next = ctx();
    if (next !== room) {
      room = next; pendingTrack = null; lastSync = 0; deadline = 0;
      try { deadline = Math.max(Date.now(), Number(localStorage.getItem(cacheKey(room))) || 0); } catch (_) {}
      if (room) pull();
    }
    render();
  }
  window.sfCooldown = { remainingMs, setRemaining, prepare, clearPrepared, show, refresh: pull };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { lastSync = 0; pull(); render(); } });
  window.addEventListener('storage', e => { if (room && e.key === cacheKey(room)) { deadline = Number(e.newValue) || 0; render(); } });
  window.addEventListener('focus', () => { lastSync = 0; pull(); });
  setInterval(onRoom, 1000);
  setTimeout(() => {
    onRoom();
    const client = sock();
    client?.on('connect', () => { lastSync = 0; pull(); });
    client?.on('disconnect', render);
  }, 200);
})();