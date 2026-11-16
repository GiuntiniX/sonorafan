/* SonoraFan 95–99 — extensões de comunidade, perfil e fila.
 * Nenhum e-mail é exposto aos clientes; permissões são verificadas no servidor.
 */
'use strict';
const { FieldValue } = require('firebase-admin/firestore');
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const clean = (value, max = 90) => String(value == null ? '' : value).replace(/[<>\x00-\x1f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

module.exports = function installExperience95({ app, db, rooms, users, sessionEmail, publicUserId, rateLimit }) {
  const profileDoc = email => db.collection('sf95_music_profiles').doc(publicUserId(email));
  const guard = (req, res) => {
    const email = sessionEmail(req);
    if (!email) res.status(401).json({ error: 'Faça login para continuar.' });
    return email;
  };
  const visibleRoom = (room, email) => !!room && (!room.isPrivate ||
    room.ownerEmail === email || (room.allowed instanceof Set && room.allowed.has(email)));

  async function getProfile(email) {
    const doc = profileDoc(email);
    const [snapshot, additions] = await Promise.all([
      doc.get(), doc.collection('adds').orderBy('at', 'desc').limit(180).get()
    ]);
    const data = snapshot.exists ? snapshot.data() || {} : {};
    const events = additions.docs.map(d => d.data()).filter(v => v && typeof v === 'object');
    const artistCounts = new Map(), roomCounts = new Map();
    for (const item of events) {
      const artist = clean(item.artist || 'Artista não identificado', 80);
      artistCounts.set(artist, (artistCounts.get(artist) || 0) + 1);
      if (item.roomSlug) roomCounts.set(item.roomSlug, (roomCounts.get(item.roomSlug) || 0) + 1);
    }
    const pinned = Array.isArray(data.pinnedRooms) ? data.pinnedRooms.slice(0, 30) : [];
    return {
      userId: publicUserId(email),
      totalAdded: Number(data.totalAdded) || 0,
      sampleSize: events.length,
      uniqueArtistsInSample: artistCounts.size,
      roomsInSample: roomCounts.size,
      topArtists: [...artistCounts].sort((a,b) => b[1] - a[1]).slice(0, 8).map(([artist,count]) => ({ artist,count })),
      recent: events.slice(0, 10).map(v => ({
        id: YOUTUBE_ID.test(v.id || '') ? v.id : '',
        title: clean(v.title, 100), artist: clean(v.artist, 80), at: Number(v.at) || 0
      })),
      genres: (users.get(email)?.musicGenres || []).filter(g => typeof g === 'string').slice(0,8),
      pinnedRooms: pinned.map(slug => rooms.get(slug)).filter(r => visibleRoom(r,email))
        .map(r => ({ slug:r.slug, name:clean(r.name, 55), listenerCount:r.listenerCount, isPlaying:!!r.isPlaying, isPrivate:!!r.isPrivate }))
    };
  }

  app.get('/api/experience95/profile', rateLimit(25, 60_000), async (req, res) => {
    const email = guard(req,res); if (!email) return;
    try { res.json(await getProfile(email)); }
    catch (err) { console.error('sf95 profile:', err.message); res.status(503).json({ error:'Seu perfil musical está temporariamente indisponível.' }); }
  });

  app.post('/api/experience95/pin', rateLimit(24, 60_000), async (req, res) => {
    const email = guard(req,res); if (!email) return;
    const slug = clean(req.body?.slug, 75);
    const room = rooms.get(slug);
    if (!visibleRoom(room, email)) return res.status(404).json({ error:'Sala não encontrada ou acesso não autorizado.' });
    if (typeof req.body?.pinned !== 'boolean') return res.status(400).json({ error:'Ação inválida.' });
    try {
      const ref = profileDoc(email);
      const pinned = await db.runTransaction(async tx => {
        const snapshot = await tx.get(ref);
        const current = Array.isArray(snapshot.data()?.pinnedRooms) ? snapshot.data().pinnedRooms : [];
        const ids = current.filter(id => typeof id === 'string' && rooms.has(id) && id !== slug).slice(0, 29);
        if (req.body.pinned) ids.unshift(slug);
        tx.set(ref, { pinnedRooms:ids, updatedAt:Date.now() }, { merge:true });
        return ids;
      });
      res.json({ success:true, pinned: pinned.includes(slug) });
    } catch (err) {
      console.error('sf95 pin:',err.message);
      res.status(503).json({ error:'Não foi possível salvar a sala favorita.' });
    }
  });

  function onAddedSong(email, room, song) {
    if (!email || !room || !YOUTUBE_ID.test(song?.id || '')) return;
    const ref = profileDoc(email);
    const event = {
      id:song.id, title:clean(song.title,100), artist:clean(song.artist,80),
      roomSlug:clean(room.slug,75), at:Date.now()
    };
    Promise.all([
      ref.set({totalAdded:FieldValue.increment(1),updatedAt:Date.now()},{merge:true}),
      ref.collection('adds').doc(String(event.at)+'-'+song.id).set(event)
    ]).catch(err => console.error('sf95 music profile:',err.message));
  }

  function applyPriority(room, votes) {
    if (!room?.votePriority || room.musicMode === 'fair' || !Array.isArray(room.queue)) return false;
    const start = Math.max(0, Math.min(room.queue.length, (Number(room.currentIndex) || 0) + 1));
    const remaining = room.queue.slice(start);
    if (remaining.length < 2) return false;
    const score = track => Array.isArray(votes?.[track.id]?.up) ? votes[track.id].up.length : 0;
    const ranked = remaining.map((track,index) => ({track,index})).sort((a,b) => score(b.track)-score(a.track) || a.index-b.index);
    if (ranked.every((entry,index) => entry.index === index)) return false;
    room.queue.splice(start, remaining.length, ...ranked.map(entry=>entry.track));
    return true;
  }

  function registerSocket(socket, currentSlug, getVotes, broadcastState, persistRoom) {
    const reply = (ack, payload) => { if (typeof ack === 'function') ack(payload); };
    const authorize = (ack) => {
      const slug = currentSlug();
      const room = slug ? rooms.get(slug) : null;
      if (!room || !socket.userEmail || !socket.rooms.has(slug)) {
        reply(ack,{ok:false,error:'Entre em uma sala para continuar.'});
        return null;
      }
      return room;
    };

    socket.on('sf95:removeOwnSong', (payload = {}, ack) => {
      const room = authorize(ack); if (!room) return;
      const id = typeof payload?.id === 'string' ? payload.id : '';
      if (!YOUTUBE_ID.test(id)) return reply(ack,{ok:false,error:'Música inválida.'});
      let queue = room.queue, index = queue.findIndex(t => t.id === id);
      let waiting = false;
      if (index < 0) {
        queue = room.waitingQueue; index = queue.findIndex(t => t.id === id); waiting = true;
      }
      if (index < 0) return reply(ack,{ok:false,error:'Música não encontrada na fila.'});
      if (!waiting && index <= room.currentIndex) return reply(ack,{ok:false,error:'A música já começou ou foi reproduzida.'});
      const track = queue[index];
      const ownerId = publicUserId(socket.userEmail);
      const owned = track.addedByUserId === ownerId ||
        (!track.addedByUserId && track.dj === socket.userName);
      if (!owned) return reply(ack,{ok:false,error:'Você só pode retirar músicas que adicionou.'});
      queue.splice(index,1);
      const votes = getVotes(room.slug);
      delete votes[id];
      broadcastState(room.slug);
      socket.nsp.to(room.slug).emit('votesState',votes);
      reply(ack,{ok:true});
    });

    socket.on('sf95:setVotePriority', (payload = {}, ack) => {
      const room = authorize(ack); if (!room) return;
      if (!socket.isAdmin) return reply(ack,{ok:false,error:'Somente responsáveis pela sala podem alterar esta opção.'});
      if (typeof payload?.enabled !== 'boolean') return reply(ack,{ok:false,error:'Valor inválido.'});
      if (payload.enabled && room.musicMode === 'fair') return reply(ack,{ok:false,error:'Desative o modo Fila Justa antes de ativar a prioridade por votos.'});
      room.votePriority = payload.enabled;
      if (room.votePriority) applyPriority(room,getVotes(room.slug));
      persistRoom(room); broadcastState(room.slug);
      reply(ack,{ok:true,enabled:room.votePriority});
    });
  }

  async function deleteUserData(email) {
    if (!email) return;
    await db.recursiveDelete(profileDoc(email));
  }
  return { onAddedSong, applyPriority, registerSocket, deleteUserData };
};
