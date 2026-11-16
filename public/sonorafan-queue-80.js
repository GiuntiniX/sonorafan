/* SonoraFan 80 — envio unificado e confirmado à fila (desktop e mobile).
 * O comando addSong não é sucesso: aguardamos ack do servidor ou roomState.
 */
(() => {
  'use strict';
  const validId = id => /^[a-zA-Z0-9_-]{11}$/.test(String(id || ''));
  const error = message => new Error(message);
  let pending = null;

  function roomContext() {
    const active = document.getElementById('screen-room')?.classList.contains('active');
    const slug = typeof currentRoom !== 'undefined' ? currentRoom : null;
    const client = typeof socket !== 'undefined' ? socket : null;
    const data = typeof currentRoomData !== 'undefined' ? currentRoomData : null;
    if (!active || !slug) throw error('Entre em uma sala para adicionar músicas.');
    if (!client?.connected) throw error('Sem conexão com a sala. Reconecte-se e tente novamente.');
    return { slug, client, data };
  }

  async function addToQueue(track) {
    if (!validId(track?.id)) throw error('Selecione um vídeo válido do YouTube.');
    if (pending) throw error('Uma música já está sendo enviada. Aguarde a confirmação.');
    const { slug, client, data } = roomContext();
    if ([...(data?.queue || []), ...(data?.waitingQueue || [])].some(item => item.id === track.id)) {
      throw error('Esta música já está na fila da sala.');
    }
    const limit = Number(data?.maxDuration) || (typeof roomLimit === 'function' ? Number(roomLimit()) : 600);
    const duration = Number(track.duration) > 0 && Number.isFinite(Number(track.duration)) ? Math.round(Number(track.duration)) : null;
    if (!data?.allowLive && duration && duration > limit) {
      throw error('O vídeo ultrapassa o limite de duração da sala.');
    }
    const cooldown = typeof COOLDOWN !== 'undefined' ? COOLDOWN : 30000;
    const last = typeof lastAddTime !== 'undefined' ? lastAddTime : 0;
    if (Date.now() - last < cooldown) {
      throw error('Aguarde ' + Math.ceil((cooldown - (Date.now() - last)) / 1000) + 's para adicionar outra música.');
    }
    const payload = {
      id: track.id,
      title: String(track.title || 'Música').slice(0, 180),
      artist: String(track.artist || 'Artista desconhecido').slice(0, 120),
      duration
    };
    const request = new Promise((resolve, reject) => {
      let settled = false;
      let timer;
      const clean = () => {
        clearTimeout(timer);
        client.off('roomState', onState);
        client.off('error', onError);
        client.off('disconnect', onDisconnect);
      };
      const done = (err, info) => {
        if (settled) return;
        settled = true;
        clean();
        if (err) reject(err); else resolve(info);
      };
      const onState = state => {
        if (state?.slug && state.slug !== slug) return;
        if ([...(state?.queue || []), ...(state?.waitingQueue || [])].some(item => item.id === payload.id)) {
          done(null, { source: 'roomState' });
        }
      };
      const onError = message => done(error(typeof message === 'string' ? message : message?.message || 'Não foi possível adicionar a música.'));
      const onDisconnect = () => done(error('A conexão com a sala foi interrompida. Confira a fila ao reconectar.'));
      client.on('roomState', onState);
      client.on('error', onError);
      client.on('disconnect', onDisconnect);
      timer = setTimeout(() => done(error('A sala não confirmou a inclusão. Confira a fila antes de tentar novamente.')), 10000);
      try {
        client.emit('addSong', payload, response => {
          if (!response || typeof response.ok !== 'boolean') return;
          if (response.ok) done(null, { source: 'ack', placement: response.placement });
          else done(error(response.error || 'A sala não aceitou a música.'));
        });
      } catch (_) { done(error('Não foi possível enviar a música. Reconecte-se e tente novamente.')); }
    });
    pending = request;
    try {
      const result = await request;
      if (typeof lastAddTime !== 'undefined') lastAddTime = Date.now();
      if (typeof startCooldown === 'function') startCooldown();
      return result;
    } finally {
      if (pending === request) pending = null;
    }
  }

  window.sf80QueueSong = addToQueue;
})();
