'use strict';

// SonoraFan Club 45.0 — progressão baseada em eventos VALIDADOS pelo servidor.
// Os pontos legados permanecem na coleção points/{email}; nenhuma coleção nova é necessária.
const LEVELS = Object.freeze([
  // Os 3 títulos legados permanecem nos mesmos limites: 10/50/100 XP.
  // Depois do DJ Lendário o usuário pode continuar evoluindo no Club.
  { min: 0, name: 'Ouvinte', icon: '🎧' },
  { min: 5, name: 'Descobridor', icon: '🎵' },
  { min: 10, name: 'DJ Iniciante', icon: '🎸' },
  { min: 25, name: 'DJ Explorador', icon: '💿' },
  { min: 40, name: 'DJ da Galera', icon: '⚡' },
  { min: 50, name: 'DJ Expert', icon: '🔥' },
  { min: 100, name: 'DJ Lendário', icon: '👑' },
  { min: 250, name: 'Estrela do Festival', icon: '🌟' },
  { min: 500, name: 'Ícone SonoraFan', icon: '🎤' },
  { min: 1000, name: 'Lenda da Comunidade', icon: '🏆' }
]);
const MISSIONS = Object.freeze([
  { id: 'daily_room', period: 'daily', name: 'Primeiro encontro', description: 'Entre em uma sala de música hoje', target: 1, reward: 15, icon: '🚪', field: 'rooms' },
  { id: 'daily_songs', period: 'daily', name: 'DJ colaborativo', description: 'Adicione 2 músicas diferentes hoje', target: 2, reward: 25, icon: '🎵', field: 'songs' },
  { id: 'daily_votes', period: 'daily', name: 'Sua voz na fila', description: 'Vote positivamente em 3 músicas diferentes hoje', target: 3, reward: 20, icon: '🗳️', field: 'votes' },
  { id: 'weekly_rooms', period: 'weekly', name: 'Explorador de salas', description: 'Participe de 3 salas diferentes nesta semana', target: 3, reward: 50, icon: '🧭', field: 'rooms' },
  { id: 'weekly_songs', period: 'weekly', name: 'Curador da semana', description: 'Adicione 5 músicas diferentes nesta semana', target: 5, reward: 50, icon: '💿', field: 'songs' },
  { id: 'weekly_clubs', period: 'weekly', name: 'Conexão entre fãs', description: 'Participe de 2 Fan Clubs diferentes nesta semana', target: 2, reward: 30, icon: '🤝', field: 'clubs' }
]);
const LEGACY_BADGES = Object.freeze([{ at: 10, name: 'DJ Iniciante' }, { at: 50, name: 'DJ Expert' }, { at: 100, name: 'DJ Lendário' }]);
const NEW_BADGES = Object.freeze([
  { key: 'first_song', name: 'Primeiro Play', description: 'Adicione a primeira música', icon: '🎵', at: 1, field: 'songs' },
  { key: 'room_explorer', name: 'Explorador Musical', description: 'Conheça 3 salas diferentes', icon: '🧭', at: 3, field: 'rooms' },
  { key: 'ten_songs', name: 'DJ da Galera', description: 'Adicione 10 músicas', icon: '⚡', at: 10, field: 'songs' },
  { key: 'ten_votes', name: 'Voz da Comunidade', description: 'Vote em 10 músicas', icon: '🗳️', at: 10, field: 'votes' },
  { key: 'five_likes', name: 'Boas Vibrações', description: 'Curta 5 mensagens diferentes', icon: '💜', at: 5, field: 'likes' },
  { key: 'three_clubs', name: 'Fã de Carteirinha', description: 'Participou de 3 Fan Clubs', icon: '🤝', at: 3, field: 'clubs' }
]);

function localPeriod(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now).filter(x => x.type !== 'literal').map(x => [x.type, x.value]));
  const day = `${parts.year}-${parts.month}-${parts.day}`;
  const d = new Date(day + 'T00:00:00.000Z');
  const weekday = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  const week = `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  return { day, week };
}
function validArray(x, max = 50) { return Array.isArray(x) ? x.filter(y => typeof y === 'string').slice(-max) : []; }
function positiveNumber(x) { return Number.isFinite(Number(x)) ? Math.max(0, Math.floor(Number(x))) : 0; }
function normalizeProgress(data, period = localPeriod()) {
  const g = data && typeof data === 'object' ? data : {};
  const day = g.day === period.day ? g.today || {} : {};
  const week = g.week === period.week ? g.weekly || {} : {};
  return {
    version: 45,
    day: period.day,
    week: period.week,
    today: {
      rooms: validArray(day.rooms, 30), songs: validArray(day.songs, 30),
      votes: validArray(day.votes, 30), likes: validArray(day.likes, 30), clubs: validArray(day.clubs, 15), awardedRoom: !!day.awardedRoom
    },
    weekly: { rooms: validArray(week.rooms, 50), songs: validArray(week.songs, 80), clubs: validArray(week.clubs, 30) },
    lifetime: {
      rooms: positiveNumber(g.lifetime?.rooms), songs: positiveNumber(g.lifetime?.songs),
      votes: positiveNumber(g.lifetime?.votes), likes: positiveNumber(g.lifetime?.likes), clubs: positiveNumber(g.lifetime?.clubs)
    },
    earnedDaily: g.day === period.day ? validArray(g.earnedDaily, 10) : [],
    earnedWeekly: g.week === period.week ? validArray(g.earnedWeekly, 10) : [],
    recent: Array.isArray(g.recent) ? g.recent.filter(e => e && typeof e === 'object').slice(0, 12) : []
  };
}
function levelInfo(xp) {
  const points = positiveNumber(xp);
  let index = 0;
  for (let i = 0; i < LEVELS.length; i++) if (points >= LEVELS[i].min) index = i;
  const current = LEVELS[index], next = LEVELS[index + 1];
  return {
    number: index + 1, name: current.name, icon: current.icon,
    min: current.min, next: next ? next.min : null,
    progress: next ? Math.max(0, Math.min(100, Math.round((points - current.min) / (next.min - current.min) * 100))) : 100
  };
}
function catalogMissions(g) {
  return MISSIONS.map(m => {
    const source = m.period === 'daily' ? g.today : g.weekly;
    const progress = Math.min(m.target, (source[m.field] || []).length);
    return { ...m, progress, done: progress >= m.target, claimed: (m.period === 'daily' ? g.earnedDaily : g.earnedWeekly).includes(m.id) };
  });
}
function publicSnapshot(doc, now = new Date()) {
  const points = positiveNumber(doc?.points);
  const badges = validArray(doc?.badges, 200);
  const g = normalizeProgress(doc?.gamification, localPeriod(now));
  return {
    points, xp: points, badges, level: levelInfo(points),
    day: g.day, week: g.week, missions: catalogMissions(g), lifetime: g.lifetime,
    achievements: NEW_BADGES.map(b => ({ ...b, unlocked: badges.includes(b.name) })),
    recent: g.recent.map(e => ({ name: String(e.name || '').slice(0, 75), xp: positiveNumber(e.xp), time: String(e.time || '').slice(0, 32) }))
  };
}
function applyAction(doc, action, id, now = new Date()) {
  const period = localPeriod(now);
  const g = normalizeProgress(doc?.gamification, period);
  const pointsBefore = positiveNumber(doc?.points);
  const badges = validArray(doc?.badges, 200);
  const key = String(id || '').slice(0, 150);
  if (!key || !['room', 'song', 'vote', 'like', 'club'].includes(action)) return { changed: false, data: doc, gained: 0, rewards: [] };
  let gained = 0, actionCounted = false;
  let actionName = '';
  if (action === 'room') {
    if (!g.today.rooms.includes(key) && g.today.rooms.length < 30) {
      g.today.rooms.push(key);
      if (!g.today.awardedRoom) { gained += 10; g.today.awardedRoom = true; }
      actionCounted = true;
      actionName = 'Sala visitada';
    }
    if (!g.weekly.rooms.includes(key) && g.weekly.rooms.length < 50) {
      g.weekly.rooms.push(key);
      g.lifetime.rooms += 1;
      actionCounted = true;
    }
  } else if (action === 'song') {
    if (!g.today.songs.includes(key) && g.today.songs.length < 30) {
      g.today.songs.push(key);
      // Preserva a lógica de pontos anteriores: 2 por música, acrescido de 3 XP do Club.
      if (g.today.songs.length <= 8) gained += 5;
      actionCounted = true;
      actionName = 'Música adicionada';
    }
    if (!g.weekly.songs.includes(key) && g.weekly.songs.length < 80) {
      g.weekly.songs.push(key);
      g.lifetime.songs += 1;
      actionCounted = true;
    }
  } else if (action === 'club') {
    // Uma recompensa pequena por dia; clubes distintos contam na missão semanal.
    if (!g.today.clubs.includes(key) && g.today.clubs.length < 15) {
      if (g.today.clubs.length === 0) gained += 5;
      g.today.clubs.push(key);
      actionCounted = true;
      actionName = 'Fan Club visitado';
    }
    if (!g.weekly.clubs.includes(key) && g.weekly.clubs.length < 30) {
      g.weekly.clubs.push(key);
      g.lifetime.clubs += 1;
      actionCounted = true;
    }
  } else if (action === 'vote') {
    if (!g.today.votes.includes(key) && g.today.votes.length < 30) {
      g.today.votes.push(key);
      if (g.today.votes.length <= 15) gained += 1; // mesmo valor legado, sem exploração por toggle.
      g.lifetime.votes += 1;
      actionCounted = true;
      actionName = 'Voto registrado';
    }
  } else if (action === 'like') {
    if (!g.today.likes.includes(key) && g.today.likes.length < 30) {
      g.today.likes.push(key);
      if (g.today.likes.length <= 15) gained += 1;
      g.lifetime.likes += 1;
      actionCounted = true;
      actionName = 'Curtida no chat';
    }
  }
  if (!actionCounted) return { changed: false, data: doc, gained: 0, rewards: [] };
  const rewards = [];
  for (const m of MISSIONS) {
    const source = m.period === 'daily' ? g.today : g.weekly;
    const earned = m.period === 'daily' ? g.earnedDaily : g.earnedWeekly;
    if (source[m.field].length >= m.target && !earned.includes(m.id)) {
      earned.push(m.id);
      gained += m.reward;
      rewards.push({ name: m.name, xp: m.reward });
    }
  }
  const points = pointsBefore + gained;
  for (const b of LEGACY_BADGES) if (points >= b.at && !badges.includes(b.name)) badges.push(b.name);
  for (const b of NEW_BADGES) if (g.lifetime[b.field] >= b.at && !badges.includes(b.name)) {
    badges.push(b.name);
    rewards.push({ name: `Medalha: ${b.name}`, xp: 0 });
  }
  if (gained > 0) g.recent.unshift({ name: actionName || 'Missão concluída', xp: gained, time: now.toISOString() });
  g.recent = g.recent.slice(0, 12);
  return { changed: true, data: { points, badges, gamification: g }, gained, rewards };
}

function createGamification45({ db, app, sessionEmail, users, userPoints, io }) {
  const pointsRef = email => db.collection('points').doc(email);
  async function getSnapshot(email) {
    const snap = await pointsRef(email).get();
    return publicSnapshot(snap.exists ? snap.data() : { points: 0, badges: [] });
  }
  async function award(email, action, key) {
    if (!email || !action || !key) return null;
    const ref = pointsRef(email);
    const result = await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      const current = snap.exists ? snap.data() : { points: 0, badges: [] };
      const next = applyAction(current, action, key, new Date());
      if (next.changed) tx.set(ref, next.data, { merge: true });
      return next;
    });
    if (!result.changed) return null;
    const old = userPoints.get(email);
    if (!old || positiveNumber(old.points) <= positiveNumber(result.data.points)) userPoints.set(email, { points: result.data.points, badges: result.data.badges });
    const snapshot = publicSnapshot(result.data);
    const latest = userPoints.get(email) || { points: result.data.points, badges: result.data.badges };
    // Evita que o retorno atrasado de uma transação mostre saldo inferior no cabeçalho.
    const visible = positiveNumber(latest.points) > snapshot.points
      ? { ...snapshot, points: latest.points, xp: latest.points, badges: latest.badges, level: levelInfo(latest.points) }
      : snapshot;
    for (const socket of io.sockets.sockets.values()) {
      if (socket.userEmail === email) {
        socket.emit('userPoints', { points: visible.points, badges: visible.badges });
        socket.emit('gamificationUpdate', { ...visible, gained: result.gained, rewards: result.rewards });
      }
    }
    return { ...visible, gained: result.gained, rewards: result.rewards };
  }
  async function getLeaderboard(limit = 10) {
    const size = Math.max(1, Math.min(30, Number(limit) || 10));
    const snap = await db.collection('points').orderBy('points', 'desc').limit(50).get();
    const entries = snap.docs.filter(d => d.exists && positiveNumber(d.data().points) > 0).slice(0, size);
    return await Promise.all(entries.map(async d => {
      let u = users.get(d.id);
      if (!u) {
        try { const usr = await db.collection('users').doc(d.id).get(); if (usr.exists) u = usr.data(); } catch (e) {}
      }
      const points = positiveNumber(d.data().points);
      return { nome: String(u?.nome || 'Ouvinte').slice(0, 60), avatar: String(u?.avatar || '🎧').slice(0, 8), points, level: levelInfo(points) };
    }));
  }
  app.get('/api/gamification/me', async (req, res) => {
    const email = sessionEmail(req);
    if (!email) return res.status(401).json({ error: 'Faça login para ver o SonoraFan Club.' });
    try { res.json(await getSnapshot(email)); }
    catch (e) { console.error('SonoraFan Club: erro ao ler progresso:', e.message); res.status(503).json({ error: 'Progresso temporariamente indisponível.' }); }
  });
  app.get('/api/gamification/leaderboard', async (req, res) => {
    if (!sessionEmail(req)) return res.status(401).json({ error: 'Faça login.' });
    try { res.json({ items: await getLeaderboard(15) }); }
    catch (e) { res.status(503).json({ error: 'Ranking temporariamente indisponível.' }); }
  });
  return { award, getSnapshot, getLeaderboard };
}

module.exports = { LEVELS, MISSIONS, NEW_BADGES, localPeriod, normalizeProgress, levelInfo, publicSnapshot, applyAction, createGamification45 };
