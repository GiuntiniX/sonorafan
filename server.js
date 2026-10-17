const express = require('express');
const http = require('http');
const https = require('https');
const { Server } = require('socket.io');
const path = require('path');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const { sanitize } = require('./room-settings');
const crypto = require('crypto');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

// ===== PROTEÇÃO GLOBAL PARA O SERVIDOR NUNCA CAIR =====
process.on('uncaughtException', (err) => {
  console.error('🚨 Erro não capturado (CRASH):', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Promise rejeitada não tratada:', reason);
});

// ========== INICIALIZAÇÃO DO FIREBASE ==========
try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  initializeApp({
    credential: cert(serviceAccount),
  });
  console.log('🔥 Firebase conectado!');
} catch (e) {
  console.error('⚠️ Erro ao conectar Firebase:', e.message);
}

const db = getFirestore();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CORS_ORIGIN || false, credentials: true } });

app.use(compression());
app.use((req, res, next) => {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'SAMEORIGIN', 'Referrer-Policy': 'strict-origin-when-cross-origin' });
  next();
});
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(cookieParser());

// ========== SEGURANÇA ==========
const hits = new Map();
function rateLimit(max, ms) {
  return (req, res, next) => {
    const k = req.ip + req.path, n = Date.now();
    const a = (hits.get(k) || []).filter(t => n - t < ms); a.push(n); hits.set(k, a);
    if (a.length > max) return res.status(429).json({ error: 'Muitas tentativas. Aguarde um instante.' });
    next();
  };
}
setInterval(() => hits.clear(), 10 * 60 * 1000);
function sessionEmail(req) { const t = req.cookies.sessionToken; return t ? sessions.get(t) : null; }
function requireAdmin(req, res, next) {
  const email = sessionEmail(req);
  if (!email || !adminEmails.has(email)) return res.status(403).json({ error: 'Apenas administradores' });
  req.adminEmail = email; next();
}
app.use('/api/admin', requireAdmin);
// trilha de auditoria: toda ação (POST) feita no painel admin fica registrada (quem, o quê, quando)
const adminLog = [];
function audit(who, action, detail) {
  const e = { t: Date.now(), who, action, detail: String(detail || '').slice(0, 200) };
  adminLog.unshift(e); if (adminLog.length > 200) adminLog.pop();
  db.collection('adminLog').doc(e.t + '-' + Math.random().toString(36).slice(2, 6)).set(e).catch(() => {});
}
app.use('/api/admin', (req, res, next) => {
  if (req.method === 'POST') { const b = req.body || {}; audit(req.adminEmail, req.path.replace(/^\//, ''), [b.email, b.slug, Array.isArray(b.slugs) ? b.slugs.join(',') : '', b.action, b.roomSlug].filter(Boolean).join(' ')); }
  next();
});
// salas privadas: fila/estatísticas só para o dono e admins (antes eram públicas para quem soubesse o endereço)
app.use('/api/room/:slug', (req, res, next) => {
  const r = rooms.get(req.params.slug);
  if (r && r.isPrivate) { const me = sessionEmail(req); if (!(me && (adminEmails.has(me) || r.ownerEmail === me))) return res.status(404).json({ error: 'Sala não encontrada' }); }
  next();
});

// ========== CONFIG ==========
const colors = ['#f59e0b', '#3b82f6', '#ef4444', '#22c55e', '#a855f7', '#ec4899', '#06b6d4', '#f97316', '#8b5cf6', '#14b8a6'];
const envAdmins = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
if (!envAdmins.length) console.warn('⚠️ ADMIN_EMAILS não definido: usando admin@sonora.com (garanta que essa conta exista com senha forte).');
const adminEmails = new Set(envAdmins.length ? envAdmins : ['admin@sonora.com']);
const settings = { maxQueue: 10000, cooldown: 30, maxDuration: 600, maxListeners: 20 };
const DISLIKE_THRESHOLD = 10;
const MAX_SONGS_PER_USER = 10000;
const SKIP_VOTE_THRESHOLD = 0.5;
const MIN_SKIP_VOTES = 3;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';

// ========== ESTADO EM MEMÓRIA ==========
const users = new Map();
// Sessões persistentes (Firestore) — chave guardada como hash, nunca o token puro
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const sh = t => crypto.createHash('sha256').update(String(t)).digest('hex');
const sessionMap = new Map();
const sessions = {
  get: t => sessionMap.get(sh(t)),
  set: (t, email) => { const k = sh(t); sessionMap.set(k, email); db.collection('sessions').doc(k).set({ email, exp: Date.now() + SESSION_MS }).catch(() => {}); },
  delete: t => { const k = sh(t); sessionMap.delete(k); db.collection('sessions').doc(k).delete().catch(() => {}); }
};
function dropSessions(email) { for (const [k, e] of sessionMap) if (e === email) { sessionMap.delete(k); db.collection('sessions').doc(k).delete().catch(() => {}); } }
async function loadSessions() {
  try {
    const snap = await db.collection('sessions').get(), now = Date.now();
    snap.forEach(d => { const v = d.data(); if (v.exp > now) sessionMap.set(d.id, v.email); else d.ref.delete().catch(() => {}); });
    console.log(`✅ ${sessionMap.size} sessões restauradas.`);
  } catch (e) {}
}
const searchCache = new Map();
const userFavorites = new Map();
const userPoints = new Map();
const userThemes = new Map();
const userSettings = new Map();
const rooms = new Map();
const roomLikes = new Map();
const roomVotes = new Map();
const waitingRooms = new Map();

// ========== FUNÇÕES DE APOIO ==========
function getRoomLikes(slug) {
  if (!roomLikes.has(slug)) roomLikes.set(slug, {});
  return roomLikes.get(slug);
}

function getRoomVotes(slug) {
  if (!roomVotes.has(slug)) roomVotes.set(slug, {});
  return roomVotes.get(slug);
}

// ----- salas privadas: senha (scrypt + sal) e convite aleatório -----
const hashPw = (pw, salt) => crypto.scryptSync(String(pw), salt, 32).toString('hex');
const safeEq = (a, b) => { a = Buffer.from(String(a)); b = Buffer.from(String(b)); return a.length === b.length && crypto.timingSafeEqual(a, b); };
const newInvite = () => crypto.randomBytes(8).toString('hex');
function setPassword(room, pw) {
  if (!pw) { room.passHash = null; room.passSalt = null; return; }
  room.passSalt = crypto.randomBytes(8).toString('hex'); room.passHash = hashPw(pw, room.passSalt);
}
const inviteInfo = r => ({ code: r.isPrivate ? r.invite : null, isPrivate: !!r.isPrivate, hasPassword: !!r.passHash });
function destroyRoom(slug, msg) {
  if (slug === 'lounge' || !rooms.has(slug)) return false;          // a sala do sistema não é excluída
  io.to(slug).emit('roomClosed', msg);
  io.in(slug).socketsLeave(slug);
  rooms.delete(slug); db.collection('rooms').doc(slug).delete().catch(() => {});
  roomLikes.delete(slug); roomVotes.delete(slug); waitingRooms.delete(slug);
  return true;
}
// ----- identidade, moderadores e sanções (silenciar / banir por tempo) -----
const isMod = e => !!(e && users.get(e) && users.get(e).isMod);
const roleOf = s => s.isAdmin ? (adminEmails.has(s.userEmail) ? 'admin' : 'owner') : (s.isMod ? 'mod' : '');
function uniqueName(slug, email, base) {
  const taken = new Set();
  for (const id of io.sockets.adapter.rooms.get(slug) || []) { const so = io.sockets.sockets.get(id); if (so && so.userName && so.userEmail !== email) taken.add(so.userName.toLowerCase()); }
  let n = base, i = 2; while (taken.has(n.toLowerCase())) n = base + ' (' + i++ + ')';
  return n;
}
const sanctions = new Map();   // id -> { id, email, name, type: 'mute'|'ban', scope: 'global'|'room:<slug>', until, reason, by }
const sanId = (e, t, sc) => `${sc}|${e}|${t}`;
const sanDoc = id => db.collection('sanctions').doc(encodeURIComponent(id));
function sanActive(email, type, slug) {
  for (const sc of ['global', 'room:' + slug]) {
    const s = sanctions.get(sanId(email, type, sc));
    if (s) { if (s.until && s.until < Date.now()) { sanctions.delete(s.id); sanDoc(s.id).delete().catch(() => {}); } else return s; }
  }
  return null;
}
function addSanction(s) { s.id = sanId(s.email, s.type, s.scope); sanctions.set(s.id, s); sanDoc(s.id).set(s).catch(() => {}); return s; }
function removeSanction(id) { sanctions.delete(id); sanDoc(id).delete().catch(() => {}); }
async function loadSanctions() { try { const snap = await db.collection('sanctions').get(); snap.forEach(d => { const s = d.data(); if (!s.until || s.until > Date.now()) sanctions.set(s.id, s); }); } catch (e) {} }
function persistRoom(r) {
  db.collection('rooms').doc(r.slug).set({ slug: r.slug, name: r.name, admin: r.admin, ownerEmail: r.ownerEmail || null, color: r.color || null, emoji: r.emoji, description: r.description, slowMode: r.slowMode, addMode: r.addMode, isPrivate: !!r.isPrivate, invite: r.invite || null, passHash: r.passHash || null, passSalt: r.passSalt || null, welcome: r.pinnedMessage ? r.pinnedMessage.text : '', allowLong: !!r.allowLong, allowLive: !!r.allowLive, maxDuration: r.maxDuration || null }).catch(() => {});
}
function createRoom(slug, name, adminName = null) {
  roomLikes.set(slug, {});
  roomVotes.set(slug, {});
  waitingRooms.set(slug, []);
  return {
    slug, name, admin: adminName,
    queue: [], waitingQueue: [],
    currentIndex: 0, startedAt: Date.now(),
    votes: { up: 0, down: 0 }, bannedUsers: [],
    chatHistory: [], listenerCount: 0,
    lastAddTime: new Map(), isPlaying: false, lastAdvanceAt: 0,
    history: [], skipVotes: new Set(),
    radioMode: false, radioGenre: 'pop',
    pinnedMessage: null, color: '#7c3aed',
    discordWebhook: null, inviteCount: 0, eventStartTime: null,
    totalSongsAdded: 0, totalVotesGiven: 0, mostVoted: [],
    allowLong: false, allowLive: false, maxDuration: settings.maxDuration,
    ownerEmail: null, emoji: '🎧', description: '', slowMode: 0, addMode: 'all',
    isPrivate: false, invite: null, passHash: null, passSalt: null, allowed: new Set(),
  };
}

// ========== FUNÇÕES FIREBASE ==========
async function getUserFromFirestore(email) {
  try { const doc = await db.collection('users').doc(email).get(); if (doc.exists) return doc.data(); } catch (e) {}
  return null;
}
async function setUserInFirestore(email, data) {
  try { await db.collection('users').doc(email).set(data, { merge: true }); } catch (e) {}
}
async function getFavoritesFromFirestore(email) {
  try { const doc = await db.collection('favorites').doc(email).get(); if (doc.exists) return doc.data().items || []; } catch (e) {}
  return [];
}
async function setFavoritesInFirestore(email, items) {
  try { await db.collection('favorites').doc(email).set({ items }); } catch (e) {}
}
async function getPointsFromFirestore(email) {
  try { const doc = await db.collection('points').doc(email).get(); if (doc.exists) return doc.data(); } catch (e) {}
  return { points: 0, badges: [] };
}
async function setPointsInFirestore(email, data) {
  try { await db.collection('points').doc(email).set(data); } catch (e) {}
}

async function loadAllUsers() {
  try {
    const snapshot = await db.collection('users').get();
    snapshot.forEach(doc => { users.set(doc.data().email, doc.data()); });
    console.log(`✅ ${users.size} usuários carregados do Firestore.`);
  } catch (e) {}
}
loadAllUsers();
loadSessions();
loadSanctions();

rooms.set('lounge', createRoom('lounge', 'Lounge SonoraFan', 'Sistema'));
console.log('✅ Sala inicial "lounge" criada com sucesso!');
async function loadRooms() {
  try {
    const snap = await db.collection('rooms').get();
    snap.forEach(d => {
      const v = d.data(); if (rooms.has(v.slug)) return;
      const r = createRoom(v.slug, v.name, v.admin || 'Anônimo');
      if (v.color) r.color = v.color;
      r.ownerEmail = v.ownerEmail || null; if (v.emoji) r.emoji = v.emoji; r.description = v.description || ''; r.slowMode = v.slowMode || 0; r.addMode = v.addMode === 'owner' ? 'owner' : 'all';
      if (v.welcome) r.pinnedMessage = { author: r.admin, text: v.welcome };
      r.isPrivate = !!v.isPrivate; r.invite = v.invite || null; r.passHash = v.passHash || null; r.passSalt = v.passSalt || null;
      if (v.allowLong) r.allowLong = true;
      if (v.allowLive) r.allowLive = true;
      if (v.maxDuration) r.maxDuration = v.maxDuration;
      rooms.set(v.slug, r);
    });
    console.log(`✅ ${rooms.size} salas carregadas.`);
  } catch (e) {}
}
loadRooms();

// ========== FUNÇÕES AUXILIARES ==========
function getPosition(room) {
  const track = room.queue[room.currentIndex];
  if (!track) return 0;
  return Math.min((Date.now() - room.startedAt) / 1000, track.duration || 180);
}
function broadcastState(slug) {
  const room = rooms.get(slug);
  if (!room) return;
  io.to(slug).emit('roomState', {
    slug: room.slug, name: room.name,
    currentIndex: room.currentIndex,
    position: getPosition(room),
    votes: room.votes,
    queue: room.queue,
    waitingQueue: room.waitingQueue,
    admin: room.admin,
    isPlaying: room.isPlaying,
    history: room.history.slice(-10),
    radioMode: room.radioMode,
    pinnedMessage: room.pinnedMessage,
    listenerCount: room.listenerCount,
    maxListeners: settings.maxListeners,
    color: room.color,
    inviteCount: room.inviteCount,
    eventStartTime: room.eventStartTime,
    maxDuration: room.maxDuration,
    allowLive: room.allowLive,
    emoji: room.emoji, description: room.description, slowMode: room.slowMode, addMode: room.addMode,
    isPrivate: room.isPrivate, hasPassword: !!room.passHash,
  });
}
function broadcastUsers(slug) {
  io.in(slug).fetchSockets().then(sockets => {
    const userList = sockets.map(s => ({
      name: s.userName || 'Anônimo', color: s.userColor || '#888', isAdmin: s.isAdmin || false, role: roleOf(s), muted: !!sanActive(s.userEmail, 'mute', slug), avatar: s.userAvatar || '👤',
      points: userPoints.get(s.userEmail)?.points || 0, badges: userPoints.get(s.userEmail)?.badges || [],
    }));
    io.to(slug).emit('users', userList);
  });
}
function addSystemMsg(slug, text) {
  const room = rooms.get(slug);
  if (!room) return;
  const msg = { _id: Date.now().toString() + Math.random(), user: 'Sistema', text, color: '#888', isSystem: true, createdAt: new Date() };
  room.chatHistory.push(msg);
  if (room.chatHistory.length > 300) room.chatHistory.shift();
  io.to(slug).emit('chat', msg);
}
function autoShuffle(room) {
  if (!room || room.queue.length <= 1) return;
  const current = room.queue[room.currentIndex];
  if (!current) return;
  const rest = room.queue.filter((_, i) => i !== room.currentIndex);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  room.queue = [current, ...rest];
  room.currentIndex = 0;
  const votes = getRoomVotes(room.slug);
  const newVotes = {};
  room.queue.forEach((track, idx) => {
    const oldIndex = room.queue.findIndex(t => t.id === track.id);
    if (votes[oldIndex] !== undefined) newVotes[idx] = votes[oldIndex];
  });
  roomVotes.set(room.slug, newVotes);
  broadcastState(room.slug);
}
function advanceQueue(slug) {
  const room = rooms.get(slug);
  if (!room || !room.isPlaying || room.queue.length === 0) {
    if (room && room.waitingQueue.length > 0) {
      const next = room.waitingQueue.shift();
      room.queue.push(next);
      if (!room.isPlaying) {
        room.isPlaying = true;
        room.currentIndex = 0;
        room.startedAt = Date.now();
        room.lastAdvanceAt = Date.now();
        addSystemMsg(slug, `▶ ${next.title} — ${next.artist}`);
        broadcastState(slug);
        return true;
      }
    }
    return false;
  }
  if (Date.now() - room.lastAdvanceAt < 10000) return false;
  room.lastAdvanceAt = Date.now();
  const current = room.queue[room.currentIndex];
  if (current) { room.history.push(current); if (room.history.length > 50) room.history.shift(); updateMostVoted(room, current); }
  room.queue.shift();
  room.currentIndex = 0;
  room.startedAt = Date.now();
  room.votes = { up: Math.floor(Math.random() * 8) + 1, down: 0 };
  room.skipVotes = new Set();
  if (room.queue.length === 0 && room.waitingQueue.length > 0) {
    const next = room.waitingQueue.shift();
    room.queue.push(next);
    addSystemMsg(slug, `📥 Música da fila de espera: ${next.title} — ${next.artist}`);
  }
  if (current) { try { delete getRoomVotes(slug)[current.id]; } catch (e) {} }
  broadcastState(slug);
  if (room.queue.length > 0) {
    const next = room.queue[0];
    addSystemMsg(slug, `▶ ${next.title} — ${next.artist}`);
  } else {
    if (room.radioMode) { startRadio(slug); }
    else { room.isPlaying = false; broadcastState(slug); addSystemMsg(slug, '🏁 Fila encerrada. Adicione músicas!'); io.to(slug).emit('queueEmpty'); }
  }
  return true;
}
async function startRadio(slug) {
  const room = rooms.get(slug);
  if (!room || !room.radioMode) return;
  try {
    let query = room.radioGenre || 'pop';
    if (room.history.length > 0) { const last = room.history[room.history.length - 1]; if (last && last.title) query = last.title + ' ' + (last.artist || ''); }
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Erro na busca');
    const data = await response.json();
    const items = data.items.map(item => ({ id: item.id.videoId, title: item.snippet.title, artist: item.snippet.channelTitle, duration: null }));
    for (const song of items) { if (room.queue.length >= settings.maxQueue) break; song.dj = '🎧 Rádio'; room.queue.push(song); }
    if (room.queue.length > 0) { room.isPlaying = true; room.currentIndex = 0; room.startedAt = Date.now(); room.lastAdvanceAt = Date.now(); const next = room.queue[0]; addSystemMsg(slug, `📻 Rádio automático: ▶ ${next.title} — ${next.artist}`); broadcastState(slug); }
  } catch (e) { console.error('Erro no modo rádio:', e.message); addSystemMsg(slug, '⚠️ Erro ao buscar músicas para o rádio.'); room.isPlaying = false; broadcastState(slug); }
}
setInterval(() => {
  for (const [slug, room] of rooms) {
    if (!room.isPlaying || room.queue.length === 0) continue;
    const track = room.queue[room.currentIndex];
    if (!track) continue;
    if (track.live) continue;
    const pos = getPosition(room);
    const duration = track.duration || 180;
    if (pos >= duration - 2) advanceQueue(slug);
  }
}, 2000);
function updateMostVoted(room, track) {
  const upVotes = room.votes?.up || 0;
  if (upVotes > 0) {
    const entry = room.mostVoted.find(t => t.id === track.id);
    if (entry) { entry.votes += upVotes; } else { room.mostVoted.push({ id: track.id, title: track.title, artist: track.artist, votes: upVotes }); }
    room.mostVoted.sort((a, b) => b.votes - a.votes);
    if (room.mostVoted.length > 20) room.mostVoted.pop();
  }
}
async function sendDiscordWebhook(webhookUrl, message) {
  if (!webhookUrl) return;
  try { await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: message }) }); } catch (e) {}
}

// ========== ROTAS ==========
app.post('/api/signup', rateLimit(5, 60000), async (req, res) => {
  const { nome, estilos, idToken } = req.body;
  let email;
  try { email = (await getAuth().verifyIdToken(idToken)).email; } catch (e) { return res.status(401).json({ error: 'Sessão Firebase inválida' }); }
  if (!nome || nome.length < 2 || nome.length > 60) return res.status(400).json({ error: 'Nome inválido' });
  if (!email) return res.status(400).json({ error: 'E-mail inválido' });
  if (!Array.isArray(estilos) || estilos.length === 0) return res.status(400).json({ error: 'Escolha um estilo' });
  if ([...users.values()].some(u => String(u.nome || '').trim().toLowerCase() === String(nome).trim().toLowerCase())) return res.status(400).json({ error: 'Esse nome já está em uso. Escolha outro.' });

  try {
    const existing = await db.collection('users').doc(email).get();
    if (existing.exists) return res.status(400).json({ error: 'E-mail já cadastrado' });

    const userData = { nome: String(nome).trim(), email, estilos, avatar: '🎸', criadoEm: new Date(), theme: 'dark', fontSize: 16, colorblind: false, discordWebhook: null };
    await setUserInFirestore(email, userData);
    users.set(email, userData);
    await setPointsInFirestore(email, { points: 0, badges: [] });
    userPoints.set(email, { points: 0, badges: [] });
    await setFavoritesInFirestore(email, []);
    userFavorites.set(email, []);
    res.json({ success: true, nome, email });
  } catch (e) { console.error('Erro no signup:', e.message); res.status(500).json({ error: 'Erro ao salvar dados no Firestore: ' + e.message }); }
});

app.get('/api/leaderboard', (req, res) => {
  if (!sessionEmail(req)) return res.status(401).json({ error: 'Não autenticado' });
  const items = [...userPoints.entries()].map(([em, p]) => { const u = users.get(em) || {}; return { nome: u.nome || 'Anônimo', avatar: u.avatar || '🎸', points: (p && p.points) || 0 }; })
    .filter(u => u.points > 0).sort((a, b) => b.points - a.points).slice(0, 10);
  res.json({ items });
});

app.post('/api/delete-account', rateLimit(3, 60000), async (req, res) => {
  const email = sessionEmail(req);
  if (!email) return res.status(401).json({ error: 'Não autenticado' });
  if (adminEmails.has(email)) return res.status(403).json({ error: 'Contas admin não podem ser excluídas aqui' });
  try {
    for (const c of ['users', 'favorites', 'points']) await db.collection(c).doc(email).delete();
    users.delete(email); userPoints.delete(email); userFavorites.delete(email); dropSessions(email);
    try { await getAuth().deleteUser((await getAuth().getUserByEmail(email)).uid); } catch (e) {}
    res.clearCookie('sessionToken', { path: '/' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Erro ao excluir conta' }); }
});

const socketTokens = new Map();
setInterval(() => { const n = Date.now(); for (const [k, v] of socketTokens) if (v.exp < n) socketTokens.delete(k); }, 60000).unref();
app.get('/api/socket-token', rateLimit(30, 60000), (req, res) => {
  const email = sessionEmail(req);
  if (!email) return res.status(401).json({ error: 'Não autenticado' });
  const token = crypto.randomBytes(16).toString('hex');
  socketTokens.set(token, { email, exp: Date.now() + 60000 });
  res.json({ token });
});

app.get('/healthz', (req, res) => res.json({ ok: true, uptime: Math.round(process.uptime()), rooms: rooms.size }));

app.post('/api/login', rateLimit(10, 60000), async (req, res) => {
  let email, decoded;
  try { decoded = await getAuth().verifyIdToken(req.body.idToken); email = decoded.email; } catch (e) { return res.status(401).json({ error: 'Credenciais inválidas' }); }
  if (!email) return res.status(401).json({ error: 'Credenciais inválidas' });

  try {
    let userDoc = await db.collection('users').doc(email).get();
    if (!userDoc.exists) return res.status(401).json({ error: 'Usuário não encontrado' });

    const userData = userDoc.data();
    if (userData.banned) return res.status(403).json({ error: 'Conta banida.' });
    if (!users.has(email)) users.set(email, userData);

    const token = crypto.randomBytes(64).toString('hex');
    sessions.set(token, email);
    res.cookie('sessionToken', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production' });

    const points = await getPointsFromFirestore(email);
    res.json({ success: true, user: { ...userData, points: points.points, badges: points.badges } });
  } catch (e) { res.status(401).json({ error: 'Credenciais inválidas' }); }
});

app.post('/api/logout', (req, res) => {
  const token = req.cookies.sessionToken;
  if (token) sessions.delete(token);
  res.clearCookie('sessionToken');
  res.json({ success: true });
});

app.get('/api/me', async (req, res) => {
  const token = req.cookies.sessionToken;
  if (!token) return res.status(401).json({ error: 'Não autenticado' });
  const email = sessions.get(token);
  if (!email) return res.status(401).json({ error: 'Sessão inválida' });
  const userData = users.get(email) || await getUserFromFirestore(email);
  if (!userData) { sessions.delete(token); return res.status(401).json({ error: 'Usuário não encontrado' }); }
  const points = userPoints.get(email) || await getPointsFromFirestore(email);
  res.json({ success: true, user: { ...userData, points: points.points, badges: points.badges } });
});

// ========== SALAS ==========
app.get('/api/rooms', (req, res) => {
  try {
    const me = sessionEmail(req), adm = !!me && adminEmails.has(me);
    const list = Array.from(rooms.values()).filter(r => !r.isPrivate || adm || (!!me && r.ownerEmail === me)).map(r => ({
      slug: r.slug, name: r.name, listenerCount: r.listenerCount,
      queueLength: r.queue.length, isPlaying: r.isPlaying,
      currentTrack: r.queue[r.currentIndex] || null,
      radioMode: r.radioMode, color: r.color || '#7c3aed', emoji: r.emoji, description: r.description, addMode: r.addMode, slowMode: r.slowMode, isPrivate: !!r.isPrivate,
      allowLive: !!r.allowLive, allowLong: !!r.allowLong,
      inviteCount: r.inviteCount, eventStartTime: r.eventStartTime,
    }));
    res.json(list);
  } catch (e) { console.error('Erro na rota /api/rooms:', e.message); res.status(500).json({ error: 'Erro interno ao listar salas' }); }
});

app.post('/api/rooms', rateLimit(5, 60000), (req, res) => {
  const { name, adminName, color, allowLong, allowLive } = req.body;
  const email = sessionEmail(req);
  if (!email) return res.status(401).json({ error: 'Faça login para criar uma sala' });
  if (!name || name.trim().length < 2 || name.trim().length > 40) return res.status(400).json({ error: 'Nome inválido' });
  const isGlobalAdmin = email && adminEmails.has(email);
  const slug = name.trim().toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString(36);
  if (rooms.has(slug)) return res.status(400).json({ error: 'Sala já existe' });
  const room = createRoom(slug, name.trim(), String(adminName || 'Anônimo').slice(0, 40));
  room.ownerEmail = email;
  const cfg = sanitize(req.body);
  Object.assign(room, { color: cfg.color, emoji: cfg.emoji, description: cfg.description, slowMode: cfg.slowMode, addMode: cfg.addMode });
  if (cfg.welcome) room.pinnedMessage = { author: room.admin, text: cfg.welcome };
  if (req.body.isPrivate) { room.isPrivate = true; room.invite = newInvite(); setPassword(room, String(req.body.password || '').slice(0, 30)); room.allowed.add(email); }
  if (isGlobalAdmin && allowLong) { room.allowLong = true; room.maxDuration = 21600; }
  if (isGlobalAdmin && allowLive) { room.allowLive = true; room.maxDuration = 21600; }
  rooms.set(slug, room);
  persistRoom(room);
  res.json({ slug, name: room.name, invite: room.isPrivate ? room.invite : undefined });
});

app.get('/api/rooms/random', (req, res) => {
  const roomList = Array.from(rooms.values()).filter(r => !r.isPrivate);
  if (roomList.length === 0) return res.status(404).json({ error: 'Nenhuma sala disponível' });
  const randomRoom = roomList[Math.floor(Math.random() * roomList.length)];
  res.json({ slug: randomRoom.slug });
});

app.get('/api/room/:slug/queue', (req, res) => {
  const room = rooms.get(req.params.slug);
  if (!room) return res.status(404).json({ error: 'Sala não encontrada' });
  res.json({ queue: room.queue, currentIndex: room.currentIndex });
});

app.get('/api/room/:slug/stats', (req, res) => {
  const room = rooms.get(req.params.slug);
  if (!room) return res.status(404).json({ error: 'Sala não encontrada' });
  res.json({ mostVoted: room.mostVoted.slice(0, 10) });
});

app.post('/api/room/:slug/invite', (req, res) => {
  const room = rooms.get(req.params.slug);
  if (!room) return res.status(404).json({ error: 'Sala não encontrada' });
  room.inviteCount = (room.inviteCount || 0) + 1;
  res.json({ success: true });
});

app.post('/api/room/:slug/webhook', requireAdmin, (req, res) => {
  const room = rooms.get(req.params.slug);
  if (!room) return res.status(404).json({ error: 'Sala não encontrada' });
  room.discordWebhook = req.body.webhookUrl || null;
  res.json({ success: true });
});

app.post('/api/room/:slug/event', requireAdmin, (req, res) => {
  const room = rooms.get(req.params.slug);
  if (!room) return res.status(404).json({ error: 'Sala não encontrada' });
  room.eventStartTime = req.body.startTime || null;
  broadcastState(req.params.slug);
  res.json({ success: true });
});

// ========== FAVORITOS ==========
app.get('/api/favorites', async (req, res) => {
  const token = req.cookies.sessionToken;
  if (!token) return res.status(401).json({ error: 'Não autenticado' });
  const email = sessions.get(token);
  if (!email) return res.status(401).json({ error: 'Sessão inválida' });
  const favs = await getFavoritesFromFirestore(email);
  res.json(favs);
});

app.post('/api/favorites', async (req, res) => {
  const token = req.cookies.sessionToken;
  if (!token) return res.status(401).json({ error: 'Não autenticado' });
  const email = sessions.get(token);
  if (!email) return res.status(401).json({ error: 'Sessão inválida' });
  const { videoId, title, artist } = req.body;
  if (!videoId) return res.status(400).json({ error: 'ID do vídeo necessário' });
  let favs = await getFavoritesFromFirestore(email);
  if (!favs.find(f => f.id === videoId)) {
    favs.push({ id: videoId, title: title || 'Música', artist: artist || 'Desconhecido' });
    await setFavoritesInFirestore(email, favs);
    userFavorites.set(email, favs);
  }
  res.json({ success: true });
});

app.delete('/api/favorites/:id', async (req, res) => {
  const token = req.cookies.sessionToken;
  if (!token) return res.status(401).json({ error: 'Não autenticado' });
  const email = sessions.get(token);
  if (!email) return res.status(401).json({ error: 'Sessão inválida' });
  const id = req.params.id;
  let favs = await getFavoritesFromFirestore(email);
  favs = favs.filter(f => f.id !== id);
  await setFavoritesInFirestore(email, favs);
  userFavorites.set(email, favs);
  res.json({ success: true });
});

// ========== AVATAR ==========
app.post('/api/update-avatar', async (req, res) => {
  const token = req.cookies.sessionToken;
  if (!token) return res.status(401).json({ error: 'Não autenticado' });
  const email = sessions.get(token);
  if (!email) return res.status(401).json({ error: 'Sessão inválida' });
  const { avatar } = req.body;
  if (!avatar) return res.status(400).json({ error: 'Avatar necessário' });
  const userData = users.get(email) || await getUserFromFirestore(email);
  if (!userData) return res.status(404).json({ error: 'Usuário não encontrado' });
  userData.avatar = avatar;
  await setUserInFirestore(email, userData);
  users.set(email, userData);
  res.json({ success: true });
});

app.post('/api/onboarded', async (req, res) => {
  const email = sessionEmail(req);
  if (!email) return res.status(401).json({ error: 'Não autenticado' });
  const u = users.get(email) || await getUserFromFirestore(email);
  if (!u) return res.status(404).json({ error: 'Usuário não encontrado' });
  u.onboarded = true; users.set(email, u); await setUserInFirestore(email, u);
  res.json({ success: true });
});
const THEMES = ['dark', 'ocean', 'sunset', 'forest', 'high-contrast', 'cherry', 'retro'];
app.post('/api/update-theme', async (req, res) => {
  const email = sessionEmail(req);
  if (!email) return res.status(401).json({ error: 'Não autenticado' });
  const { theme } = req.body;
  if (!THEMES.includes(theme)) return res.status(400).json({ error: 'Tema inválido' });
  const u = users.get(email) || await getUserFromFirestore(email);
  if (!u) return res.status(404).json({ error: 'Usuário não encontrado' });
  u.theme = theme; users.set(email, u); await setUserInFirestore(email, u);
  res.json({ success: true });
});

// ========== ADMIN ROTAS (protegidas por requireAdmin) ==========
app.get('/api/admin/stats', async (req, res) => {
  try {
    const snapshot = await db.collection('users').get();
    const totalUsers = snapshot.size;
    const totalRooms = rooms.size;
    const onlineUsers = (await io.fetchSockets()).length;
    res.json({ totalUsers, totalRooms, onlineUsers });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/users', async (req, res) => {
  try {
    const snapshot = await db.collection('users').get();
    const usersList = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      usersList.push({ email: doc.id, nome: data.nome, avatar: data.avatar, banned: !!data.banned, isMod: !!data.isMod, isAdmin: adminEmails.has(doc.id) });
    });
    res.json(usersList);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/promote', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email necessário' });
  adminEmails.add(email);
  res.json({ success: true });
});

app.post('/api/admin/delete-user', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email necessário' });
  try {
    await db.collection('users').doc(email).delete();
    await db.collection('favorites').doc(email).delete();
    await db.collection('points').doc(email).delete();
    users.delete(email);
    userPoints.delete(email);
    userFavorites.delete(email);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/kick-user', (req, res) => {
  const { email, roomSlug } = req.body;
  if (!email || !roomSlug) return res.status(400).json({ error: 'Dados incompletos' });
  const room = rooms.get(roomSlug);
  if (!room) return res.status(404).json({ error: 'Sala não encontrada' });
  io.in(roomSlug).fetchSockets().then(sockets => {
    for (const socket of sockets) {
      if (socket.userEmail === email) {
        socket.emit('kicked', 'Você foi expulso da sala pelo admin.');
        socket.leave(roomSlug);
        room.listenerCount = Math.max(0, room.listenerCount - 1);
        broadcastState(roomSlug);
        broadcastUsers(roomSlug);
        res.json({ success: true });
        return;
      }
    }
    res.status(404).json({ error: 'Usuário não está na sala' });
  });
});

app.post('/api/admin/ban-user', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email necessário' });
  const userData = await getUserFromFirestore(email);
  if (!userData) return res.status(404).json({ error: 'Usuário não encontrado' });
  userData.banned = true;
  await setUserInFirestore(email, userData);
  dropSessions(email);
  io.fetchSockets().then(sockets => {
    for (const socket of sockets) {
      if (socket.userEmail === email) {
        socket.emit('banned', 'Você foi banido do Sonora Fan.');
        socket.disconnect();
      }
    }
  });
  res.json({ success: true });
});

app.post('/api/admin/unban-user', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email necessário' });
  const userData = await getUserFromFirestore(email);
  if (!userData) return res.status(404).json({ error: 'Usuário não encontrado' });
  userData.banned = false; await setUserInFirestore(email, userData); users.set(email, userData);
  res.json({ success: true });
});

app.get('/api/admin/rooms', (req, res) => {
  res.json(Array.from(rooms.values()).map(r => {
    const cur = r.isPlaying && r.queue[r.currentIndex || 0];
    return { slug: r.slug, name: r.name, emoji: r.emoji, owner: r.admin, ownerEmail: r.ownerEmail || null, isPrivate: !!r.isPrivate, addMode: r.addMode, slowMode: r.slowMode, chatLocked: !!r.chatLocked, listeners: r.listenerCount || 0, queueLength: r.queue.length, now: cur ? cur.title : null, system: r.slug === 'lounge' };
  }));
});
app.post('/api/admin/delete-room', (req, res) => {
  const list = Array.isArray(req.body.slugs) ? req.body.slugs : [req.body.slug];
  const skipped = []; let deleted = 0;
  for (const slug of list.map(String)) { if (destroyRoom(slug, 'Esta sala foi encerrada por um administrador.')) deleted++; else skipped.push(slug); }
  res.json({ success: true, deleted, skipped });
});
app.post('/api/admin/room-action', (req, res) => {
  const { slug, action, text } = req.body, room = rooms.get(String(slug));
  if (!room) return res.status(404).json({ error: 'Sala não encontrada' });
  if (action === 'skip') { room.lastAdvanceAt = 0; advanceQueue(room.slug); }
  else if (action === 'clear-queue') { room.queue = []; room.waitingQueue = []; room.isPlaying = false; room.currentIndex = 0; room.skipVotes = new Set(); broadcastState(room.slug); addSystemMsg(room.slug, '🧹 A fila foi limpa por um administrador.'); }
  else if (action === 'lock' || action === 'unlock') { room.chatLocked = action === 'lock'; addSystemMsg(room.slug, room.chatLocked ? '🔒 O chat foi travado por um administrador.' : '🔓 O chat foi liberado.'); }
  else if (action === 'message' && text) addSystemMsg(room.slug, '📣 Admin: ' + String(text).slice(0, 300));
  else return res.status(400).json({ error: 'Ação inválida' });
  res.json({ success: true });
});
app.get('/api/admin/log', (req, res) => res.json(adminLog.slice(0, 100)));

app.post('/api/admin/set-mod', async (req, res) => {
  const { email, mod } = req.body;
  if (!email) return res.status(400).json({ error: 'Email necessário' });
  if (adminEmails.has(email)) return res.status(400).json({ error: 'Esse usuário já é admin' });
  const u = users.get(email) || await getUserFromFirestore(email);
  if (!u) return res.status(404).json({ error: 'Usuário não encontrado' });
  u.isMod = !!mod; users.set(email, u); await setUserInFirestore(email, u);
  res.json({ success: true });
});
app.get('/api/admin/sanctions', (req, res) => { const n = Date.now(); res.json([...sanctions.values()].filter(s => !s.until || s.until > n)); });
app.post('/api/admin/sanction-remove', (req, res) => {
  const id = String(req.body.id);
  if (!sanctions.has(id)) return res.status(404).json({ error: 'Sanção não encontrada' });
  removeSanction(id); res.json({ success: true });
});

app.post('/api/admin/remove-song', (req, res) => {
  const { roomSlug, index } = req.body;
  if (roomSlug === undefined || index === undefined) return res.status(400).json({ error: 'Dados incompletos' });
  const room = rooms.get(roomSlug);
  if (!room) return res.status(404).json({ error: 'Sala não encontrada' });
  if (index < 0 || index >= room.queue.length) return res.status(400).json({ error: 'Índice inválido' });
  const removed = room.queue.splice(index, 1)[0];
  delete getRoomVotes(roomSlug)[removed.id];
  if (index === room.currentIndex) {
    room.startedAt = Date.now();
    room.lastAdvanceAt = Date.now();
    room.votes = { up: 0, down: 0 };
    room.skipVotes = new Set();
    if (room.queue.length === 0) {
      room.isPlaying = false;
      addSystemMsg(roomSlug, `🗑️ "${removed.title}" removida pelo admin. Fila vazia!`);
      broadcastState(roomSlug);
      io.to(roomSlug).emit('queueEmpty');
      res.json({ success: true });
      return;
    }
  } else if (index < room.currentIndex) {
    room.currentIndex--;
  }
  broadcastState(roomSlug);
  addSystemMsg(roomSlug, `🗑️ "${removed.title}" removida pelo admin.`);
  res.json({ success: true });
});

app.post('/api/admin/clear-all-chats', (req, res) => {
  for (const [slug, room] of rooms) {
    room.chatHistory = [];
    roomLikes.set(slug, {});
    io.to(slug).emit('chatCleared');
  }
  res.json({ success: true });
});

app.post('/api/admin/clear-all-rooms', (req, res) => {
  let n = 0; for (const slug of [...rooms.keys()]) if (destroyRoom(slug, 'Sala removida pelo admin.')) n++;
  res.json({ success: true, deleted: n });
});

app.get('/api/admin/export-data', (req, res) => {
  const data = {
    users: Array.from(users.values()),
    rooms: Array.from(rooms.values()).map(r => ({ ...r, lastAddTime: undefined, skipVotes: undefined, passHash: undefined, passSalt: undefined, invite: undefined, allowed: undefined })),
    favorites: Array.from(userFavorites.entries()),
    points: Array.from(userPoints.entries()),
    settings,
  };
  res.json(data);
});

// ========== API DO YOUTUBE ==========
app.get('/api/search-youtube', rateLimit(30, 60000), async (req, res) => {
  const query = req.query.q;
  if (!query || query.length < 2) return res.json({ items: [] });
  const ck = String(query).trim().toLowerCase().slice(0, 100), hit = searchCache.get(ck);
  if (hit && Date.now() - hit.t < 10 * 60 * 1000) return res.json({ items: hit.items });
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&videoEmbeddable=true&safeSearch=moderate&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const items = data.items.map(item => ({ id: item.id.videoId, title: item.snippet.title, artist: item.snippet.channelTitle, thumb: item.snippet.thumbnails.default.url }));
    if (searchCache.size > 500) searchCache.delete(searchCache.keys().next().value);
    searchCache.set(ck, { t: Date.now(), items });
    res.json({ items });
  } catch (e) { console.error('Erro na busca do YouTube:', e.message); res.status(500).json({ error: 'Erro ao buscar vídeos: ' + e.message, items: [] }); }
});

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 }, (res) => {
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode)); }
      let data = ''; res.setEncoding('utf8');
      res.on('data', chunk => { data += chunk; if (data.length > 4e6) req.destroy(); });
      res.on('end', () => resolve(data));
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

app.get('/api/video-info', rateLimit(40, 60000), async (req, res) => {
  const id = String(req.query.id || '').trim();
  if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) return res.status(400).json({ error: 'ID inválido' });
  const info = { id, title: null, artist: null, duration: null };
  try {
    const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,status&id=${id}&key=${YOUTUBE_API_KEY}`);
    const d = await r.json(); const v = d.items && d.items[0];
    if (v) {
      info.title = v.snippet.title; info.embeddable = !(v.status && v.status.embeddable === false); info.artist = v.snippet.channelTitle;
      const m = (v.contentDetails.duration || '').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (m && v.snippet.liveBroadcastContent !== 'live') info.duration = (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0);
    }
  } catch (e) {}
  if (!info.title) info.title = 'Vídeo do YouTube (ID: ' + id + ')';
  res.json(info);
});

// ========== SOCKET ==========
io.on('connection', (socket) => {
  let currentRoom = null;
  let userEmail = null;

  socket.on('joinRoom', ({ slug, name, avatar, token, invite, password }) => {
    try {
      const room = rooms.get(slug);
      if (!room) { socket.emit('error', 'Sala não encontrada'); return; }
      // identidade vem da conta logada, nunca do que o navegador envia
      const ck = (socket.handshake.headers.cookie || '').match(/sessionToken=([^;]+)/);
      let who = ck ? sessions.get(ck[1]) : null;
      if (!who && token) { const rt = socketTokens.get(token); if (rt && rt.exp > Date.now()) who = rt.email; }
      if (!who) { socket.emit('error', 'Faça login para entrar na sala.'); return; }
      const prof = users.get(who) || {};
      if (prof.banned) { socket.emit('error', 'Conta banida.'); return; }
      name = uniqueName(slug, who, String(prof.nome || who.split('@')[0]).slice(0, 40));
      avatar = prof.avatar || avatar;
      const sb = sanActive(who, 'ban', slug);
      if (sb) { socket.emit('error', '⛔ Você está banido desta sala' + (sb.until ? ' por mais ' + Math.ceil((sb.until - Date.now()) / 60000) + ' min' : '') + (sb.reason ? ' — ' + sb.reason : '')); return; }
      if (room.bannedUsers.includes(name)) { socket.emit('error', 'Você foi banido'); return; }
      // ----- sala privada: só entra com convite ou senha (dono e admins sempre entram) -----
      if (room.isPrivate) {
        const gc = (socket.handshake.headers.cookie || '').match(/sessionToken=([^;]+)/);
        let ge = gc ? sessions.get(gc[1]) : null;
        if (!ge && token) { const rt = socketTokens.get(token); if (rt && rt.exp > Date.now()) ge = rt.email; }
        if (!(ge && (room.ownerEmail === ge || adminEmails.has(ge) || room.allowed.has(ge)))) {
          const okInv = !!invite && !!room.invite && safeEq(invite, room.invite);
          let okPw = false;
          if (!okInv && password && room.passHash) {
            socket._pw = (socket._pw || []).filter(t => Date.now() - t < 60000);
            if (socket._pw.length >= 6) { socket.emit('error', 'Muitas tentativas de senha. Aguarde 1 minuto.'); return; }
            socket._pw.push(Date.now());
            okPw = safeEq(hashPw(password, room.passSalt), room.passHash);
          }
          if (!okInv && !okPw) { socket.emit('joinDenied', { slug, needPassword: !!room.passHash, wrong: !!password }); return; }
          if (ge) room.allowed.add(ge);
        }
      }
      if (room.listenerCount >= settings.maxListeners) {
        if (!waitingRooms.has(slug)) waitingRooms.set(slug, []);
        waitingRooms.get(slug).push(socket);
        socket.emit('waitingRoom', { position: waitingRooms.get(slug).length, maxListeners: settings.maxListeners });
        return;
      }
      if (currentRoom) {
        socket.leave(currentRoom);
        const old = rooms.get(currentRoom);
        if (old) old.listenerCount = Math.max(0, old.listenerCount - 1);
      }
      currentRoom = slug;
      socket.join(slug);
      socket.userName = name;
      socket.userColor = colors[Math.floor(Math.random() * colors.length)];
      socket.userAvatar = avatar || '👤';
      room.listenerCount++;
      const cookie = socket.handshake.headers.cookie || '';
      const tokenMatch = cookie.match(/sessionToken=([^;]+)/);
      let email = tokenMatch ? sessions.get(tokenMatch[1]) : null;
      if (!email && token) { const rt = socketTokens.get(token); socketTokens.delete(token); if (rt && rt.exp > Date.now()) email = rt.email; }   // login feito depois de abrir a página
      userEmail = email;
      socket.userEmail = email;
      const isGlobalAdmin = adminEmails.has(email);
      // dono = quem criou (por e-mail). Só salas antigas, sem dono registrado, caem no nome de exibição.
      const isRoomAdmin = !!email && (room.ownerEmail ? room.ownerEmail === email : room.admin === name);
      socket.isAdmin = isGlobalAdmin || isRoomAdmin;
      socket.isMod = isMod(email);
      if (isGlobalAdmin && !room.admin) room.admin = name;
      notifyNextWaiting(slug);

      socket.emit('likesState', getRoomLikes(slug));
      socket.emit('votesState', getRoomVotes(slug));

      socket.emit('roomState', {
        slug: room.slug, name: room.name, currentIndex: room.currentIndex,
        position: getPosition(room), votes: room.votes, queue: room.queue, waitingQueue: room.waitingQueue,
        admin: room.admin, isPlaying: room.isPlaying, history: room.history.slice(-10), radioMode: room.radioMode,
        pinnedMessage: room.pinnedMessage, listenerCount: room.listenerCount, maxListeners: settings.maxListeners,
        color: room.color, inviteCount: room.inviteCount, eventStartTime: room.eventStartTime,
        maxDuration: room.maxDuration, allowLive: room.allowLive,
        emoji: room.emoji, description: room.description, slowMode: room.slowMode, addMode: room.addMode,
        isPrivate: room.isPrivate, hasPassword: !!room.passHash,
      });
      socket.emit('chatHistory', room.chatHistory.slice(-150));
      socket.emit('isAdmin', socket.isAdmin);
      socket.emit('isMod', !!socket.isMod);
      socket.emit('userPoints', userPoints.get(email) || { points: 0, badges: [] });
      broadcastUsers(slug);
    } catch (e) {
      console.error('Erro no joinRoom:', e.message);
      socket.emit('error', 'Erro ao entrar na sala.');
    }
  });

  function notifyNextWaiting(slug) {
    const waiting = waitingRooms.get(slug) || [];
    if (waiting.length === 0) return;
    const room = rooms.get(slug);
    if (!room) return;
    if (room.listenerCount < settings.maxListeners) {
      const nextSocket = waiting.shift();
      if (nextSocket) nextSocket.emit('waitingRoom', { position: 0, maxListeners: settings.maxListeners, canJoin: true });
    }
  }

  socket.on('chat', ({ text }) => {
    try {
      if (!currentRoom || typeof text !== 'string' || !text.trim()) return;
      text = text.slice(0, 400);
      const mu = sanActive(socket.userEmail, 'mute', currentRoom);
      if (mu) return socket.emit('chatError', '🔇 Você está silenciado' + (mu.until ? ' por mais ' + Math.ceil((mu.until - Date.now()) / 60000) + ' min' : '') + (mu.reason ? ' — ' + mu.reason : ''));
      const nowT = Date.now(); socket._chatT = (socket._chatT || []).filter(t => nowT - t < 5000);
      if (socket._chatT.length >= 6) return socket.emit('chatError', 'Calma! Muitas mensagens seguidas.');
      socket._chatT.push(nowT);
      const rmc = rooms.get(currentRoom);
      if (rmc && rmc.chatLocked && !socket.isAdmin) return socket.emit('chatError', '🔒 O chat está travado por um administrador.');
      if (rmc && rmc.slowMode && !socket.isAdmin) {
        const wait = rmc.slowMode * 1000 - (nowT - (socket._lastMsg || 0));
        if (wait > 0) return socket.emit('chatError', `🐢 Modo lento: aguarde ${Math.ceil(wait / 1000)}s`);
      }
      socket._lastMsg = nowT;
      const room = rooms.get(currentRoom);
      const parts = text.trim().split(' ');
      const command = parts[0].toLowerCase();
      if (command.startsWith('/')) { handleCommand(socket, command, parts.slice(1), room); return; }
      const msg = { _id: Date.now().toString() + Math.random(), user: socket.userName, text: text.trim(), color: socket.userColor, isSystem: false, isAdmin: socket.isAdmin || false, role: roleOf(socket), avatar: socket.userAvatar || '👤', createdAt: new Date() };
      room.chatHistory.push(msg);
      if (room.chatHistory.length > 300) room.chatHistory.shift();
      io.to(currentRoom).emit('chat', msg);
    } catch (e) { console.error('Erro no chat:', e.message); }
  });

  function handleCommand(socket, cmd, args, room) {
    const email = socket.userEmail;
    let reply = '';
    switch(cmd) {
      case '/stats':
        let stats = '📊 Estatísticas da sala:\n'; const userCounts = {};
        room.queue.forEach(t => { const dj = t.dj || 'Desconhecido'; userCounts[dj] = (userCounts[dj] || 0) + 1; });
        Object.entries(userCounts).sort((a,b) => b[1] - a[1]).forEach(([user, count]) => { stats += `  ${user}: ${count} música(s)\n`; });
        stats += `Total: ${room.queue.length} músicas | Histórico: ${room.history.length}`;
        socket.emit('chat', { _id: Date.now().toString() + Math.random(), user: 'Sistema', text: stats, color: '#888', isSystem: true, createdAt: new Date() });
        break;
      case '/vote':
        if (room.queue.length === 0) { reply = 'Nenhuma música na fila.'; break; }
        const track = room.queue[room.currentIndex]; if (!track) { reply = 'Nenhuma música tocando.'; break; }
        const votes = getRoomVotes(room.slug); if (!votes[track.id]) votes[track.id] = { up: [], down: [] };
        const data = votes[track.id];
        if (!data.up.includes(socket.userName)) {
          data.up.push(socket.userName); const downIdx = data.down.indexOf(socket.userName);
          if (downIdx > -1) data.down.splice(downIdx, 1);
          addPoints(email, 1); reply = '👍 Você votou na música atual!';
          io.to(currentRoom).emit('voteUpdate', { id: track.id, up: data.up, down: data.down });
        } else { reply = 'Você já votou nessa música.'; }
        break;
      case '/clear':
        if (!socket.isAdmin) { reply = 'Apenas admin pode limpar o chat.'; break; }
        room.chatHistory = []; roomLikes.set(currentRoom, {}); io.to(currentRoom).emit('chatCleared'); addSystemMsg(currentRoom, '🧹 Chat limpo pelo admin');
        reply = 'Chat limpo.';
        break;
      case '/me':
        const p = userPoints.get(email) || { points: 0, badges: [] };
        reply = `👤 ${socket.userName} | Pontos: ${p.points} | Badges: ${p.badges.join(', ') || 'Nenhum'}`;
        break;
      case '/history':
        if (room.history.length === 0) { reply = 'Nenhuma música no histórico.'; break; }
        let hist = '📜 Histórico:\n';
        room.history.slice(-5).forEach((t, i) => { hist += `  ${i+1}. ${t.title} — ${t.artist}\n`; });
        socket.emit('chat', { _id: Date.now().toString() + Math.random(), user: 'Sistema', text: hist, color: '#888', isSystem: true, createdAt: new Date() });
        return;
      case '/pin':
        if (!socket.isAdmin) { reply = 'Apenas admin pode fixar mensagens.'; break; }
        if (!args.length) { reply = 'Use: /pin texto da mensagem'; break; }
        room.pinnedMessage = { author: socket.userName, text: args.join(' ').slice(0, 300) }; broadcastState(room.slug); reply = '📌 Mensagem fixada.';
        break;
      default:
        reply = `Comando desconhecido: ${cmd}. Use /stats, /vote, /me, /history, /clear e /pin (admin)`;
    }
    if (reply) socket.emit('chat', { _id: Date.now().toString() + Math.random(), user: 'Sistema', text: reply, color: '#888', isSystem: true, createdAt: new Date() });
  }

  async function addPoints(email, amount) {
    if (!email) return;
    const p = userPoints.get(email) || await getPointsFromFirestore(email);
    p.points += amount;
    if (p.points >= 10 && !p.badges.includes('DJ Iniciante')) p.badges.push('DJ Iniciante');
    if (p.points >= 50 && !p.badges.includes('DJ Expert')) p.badges.push('DJ Expert');
    if (p.points >= 100 && !p.badges.includes('DJ Lendário')) p.badges.push('DJ Lendário');
    userPoints.set(email, p); await setPointsInFirestore(email, p);
    for (const [id, s] of io.sockets.sockets) { if (s.userEmail === email) s.emit('userPoints', p); }
  }

  socket.on('voteSkip', () => {
    try {
      if (!currentRoom) return;
      const room = rooms.get(currentRoom);
      if (room.queue.length === 0) return;
      if (socket.isAdmin) { advanceQueue(currentRoom); addSystemMsg(currentRoom, `⏭️ ${socket.userName} pulou a música (admin)`); return; }
      if (room.skipVotes.has(socket.userName)) { socket.emit('error', 'Você já votou para pular.'); return; }
      room.skipVotes.add(socket.userName);
      const totalListeners = room.listenerCount || 1;
      const minVotes = Math.max(MIN_SKIP_VOTES, Math.ceil(totalListeners * SKIP_VOTE_THRESHOLD));
      const currentVotes = room.skipVotes.size;
      io.to(currentRoom).emit('skipVoteUpdate', { votes: currentVotes, needed: minVotes });
      if (currentVotes >= minVotes) { addSystemMsg(currentRoom, `⏭️ Música pulada por votação! (${currentVotes} votos)`); advanceQueue(currentRoom); room.skipVotes = new Set(); }
    } catch (e) { console.error('Erro no voteSkip:', e.message); }
  });

  socket.on('addSong', (song) => {
    try {
      if (!currentRoom) return;
      const room = rooms.get(currentRoom);
      if (room.addMode === 'owner' && !socket.isAdmin) { socket.emit('error', '🎧 Nesta sala só o dono escolhe as músicas. Use o chat para sugerir!'); return; }
      const now = Date.now();
      const lastAdd = room.lastAddTime.get(socket.userEmail || socket.userName) || 0;
      if (now - lastAdd < 30000) { const wait = Math.ceil((30000 - (now - lastAdd)) / 1000); socket.emit('error', `Aguarde ${wait}s`); return; }
      const userSongs = room.queue.filter(t => t.dj === socket.userName).length + room.waitingQueue.filter(t => t.dj === socket.userName).length;
      if (userSongs >= MAX_SONGS_PER_USER) { socket.emit('error', `Você já tem ${MAX_SONGS_PER_USER} músicas na fila/espera. Aguarde outras serem tocadas.`); return; }
      const limit = room.maxDuration || settings.maxDuration;
      const liveOk = !!room.allowLive;
      if (!liveOk && song.duration && song.duration > limit) { socket.emit('error', `⛔ Vídeo muito longo! Duração: ${Math.floor(song.duration / 60)} min. Limite: ${Math.floor(limit / 60)} min.`); return; }
      if (liveOk && !song.duration) song.live = true;
      const isQueueFull = room.queue.length >= settings.maxQueue;
      if (isQueueFull) {
        if (room.waitingQueue.length >= settings.maxQueue) { socket.emit('error', `Fila de espera cheia (${settings.maxQueue})`); return; }
        song.dj = socket.userName; room.waitingQueue.push(song); room.lastAddTime.set(socket.userEmail || socket.userName, now); addPoints(socket.userEmail, 1);
        io.to(currentRoom).emit('playSound', 'waiting');
        addSystemMsg(currentRoom, `⏳ "${song.title}" entrou na fila de espera (${room.waitingQueue.length} músicas aguardando)`);
        broadcastState(currentRoom);
        return;
      }
      song.dj = socket.userName; room.queue.push(song); room.lastAddTime.set(socket.userEmail || socket.userName, now); addPoints(socket.userEmail, 2);
      room.totalSongsAdded = (room.totalSongsAdded || 0) + 1;
      if (!room.isPlaying && room.queue.length === 1) { room.isPlaying = true; room.currentIndex = 0; room.startedAt = Date.now(); room.lastAdvanceAt = Date.now(); addSystemMsg(currentRoom, `▶ ${song.title} — ${song.artist}`); }
      broadcastState(currentRoom);
      if (room.discordWebhook) { const msg = `🎵 **${song.title}** por ${song.artist} foi adicionada por ${socket.userName} na sala **${room.name}**`; sendDiscordWebhook(room.discordWebhook, msg); }
    } catch (e) {
      console.error('❌ CRASH AO ADICIONAR MÚSICA:', e.message);
      socket.emit('error', 'Erro interno ao adicionar música. Verifique os logs.');
    }
  });

  socket.on('likeMessage', ({ messageId, room }) => {
    try {
      if (!room || !socket.userName) return;
      const likes = getRoomLikes(room);
      if (!likes[messageId]) likes[messageId] = { likes: 0, users: [] };
      const data = likes[messageId];
      const userIndex = data.users.indexOf(socket.userName);
      if (userIndex > -1) { data.users.splice(userIndex, 1); data.likes = Math.max(0, data.likes - 1); }
      else { data.users.push(socket.userName); data.likes++; addPoints(socket.userEmail, 1); io.to(room).emit('playSound', 'like'); }
      io.to(room).emit('likeUpdate', { messageId, likes: data.likes, users: data.users });
    } catch (e) { console.error('Erro no like:', e.message); }
  });

  socket.on('videoDuration', ({ duration }) => {
    try {
      if (!currentRoom || !duration) return;
      const room = rooms.get(currentRoom);
      const track = room.queue[room.currentIndex];
      if (!track) return;
      track.duration = duration;
      const limit = room.maxDuration || settings.maxDuration;
      if (room.allowLive && duration > limit) track.live = true;
      if (!room.allowLive && duration > limit) {
        room.queue.splice(room.currentIndex, 1);
        delete getRoomVotes(currentRoom)[track.id];
        room.startedAt = Date.now();
        room.lastAdvanceAt = Date.now();
        room.votes = { up: 0, down: 0 };
        room.skipVotes = new Set();
        if (room.queue.length === 0) {
          room.isPlaying = false;
          addSystemMsg(currentRoom, `⛔ "${track.title}" era muito longa (${Math.floor(duration / 60)} min) e a fila acabou.`);
          broadcastState(currentRoom);
          io.to(currentRoom).emit('queueEmpty');
          return;
        }
        addSystemMsg(currentRoom, `⛔ "${track.title}" pulada: muito longa (${Math.floor(duration / 60)} min). Limite: ${Math.floor(limit / 60)} min.`);
        broadcastState(currentRoom);
        return;
      }
      broadcastState(currentRoom);
    } catch (e) { console.error('Erro no videoDuration:', e.message); }
  });

  socket.on('updateRoomSettings', (input = {}) => {
    try {
      const room = currentRoom && rooms.get(currentRoom);
      if (!room || !socket.isAdmin) return;
      const cfg = sanitize(input, room);
      Object.assign(room, { color: cfg.color, emoji: cfg.emoji, description: cfg.description, slowMode: cfg.slowMode, addMode: cfg.addMode });
      if (input.welcome !== undefined) room.pinnedMessage = cfg.welcome ? { author: socket.userName, text: cfg.welcome } : null;
      if (input.isPrivate !== undefined) {
        const was = room.isPrivate; room.isPrivate = !!input.isPrivate;
        if (room.isPrivate && !room.invite) room.invite = newInvite();
        if (!room.isPrivate) setPassword(room, '');
        if (room.isPrivate && !was) for (const id of io.sockets.adapter.rooms.get(room.slug) || []) { const so = io.sockets.sockets.get(id); if (so && so.userEmail) room.allowed.add(so.userEmail); }   // quem já está dentro continua entrando
      }
      if (room.isPrivate && input.password !== undefined) setPassword(room, String(input.password).slice(0, 30));
      persistRoom(room); broadcastState(room.slug); socket.emit('roomInvite', inviteInfo(room));
      addSystemMsg(currentRoom, `⚙️ ${socket.userName} atualizou as configurações da sala`);
    } catch (e) {}
  });

  socket.on('modAction', ({ name: target, action, minutes, reason } = {}) => {
    try {
      const room = currentRoom && rooms.get(currentRoom); if (!room || !socket.userEmail) return;
      const owner = room.ownerEmail === socket.userEmail, adm = adminEmails.has(socket.userEmail);
      if (!(adm || owner || socket.isMod)) return;
      const tid = [...(io.sockets.adapter.rooms.get(currentRoom) || [])].find(id => { const so = io.sockets.sockets.get(id); return so && so.userName === target; });
      const ts = tid && io.sockets.sockets.get(tid);
      if (!ts || !ts.userEmail || ts === socket) return;
      const rank = (e, own) => adminEmails.has(e) ? 3 : own ? 2 : isMod(e) ? 1 : 0;   // admin > dono da sala > moderador > usuário
      if (rank(ts.userEmail, room.ownerEmail === ts.userEmail) >= rank(socket.userEmail, owner)) return socket.emit('error', 'Você não pode moderar esse usuário.');
      const mins = [10, 60, 1440, 0].includes(+minutes) ? +minutes : 10, why = String(reason || '').replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, 100);
      const dur = mins ? (mins >= 60 ? mins / 60 + ' h' : mins + ' min') : 'tempo indeterminado';
      const san = { email: ts.userEmail, name: ts.userName, scope: 'room:' + currentRoom, until: mins ? Date.now() + mins * 60000 : null, reason: why, by: socket.userName };
      if (action === 'mute') { addSanction({ ...san, type: 'mute' }); ts.emit('chatError', `🔇 Você foi silenciado por ${dur}${why ? ' — ' + why : ''}`); addSystemMsg(currentRoom, `🔇 ${ts.userName} foi silenciado por ${dur} (${socket.userName})`); }
      else if (action === 'unmute') { removeSanction(sanId(ts.userEmail, 'mute', 'room:' + currentRoom)); addSystemMsg(currentRoom, `🔊 ${ts.userName} pode falar de novo`); }
      else if (action === 'ban' || action === 'kick') {
        if (action === 'ban') addSanction({ ...san, type: 'ban' });
        ts.emit('kicked', action === 'ban' ? `⛔ Você foi banido desta sala por ${dur}${why ? ' — ' + why : ''}` : 'Você foi expulso da sala.');
        ts.leave(currentRoom); room.listenerCount = Math.max(0, room.listenerCount - 1);
        addSystemMsg(currentRoom, `${action === 'ban' ? '⛔' : '👢'} ${ts.userName} foi ${action === 'ban' ? 'banido por ' + dur : 'expulso'} (${socket.userName})`);
        broadcastState(currentRoom);
      } else return;
      broadcastUsers(currentRoom);
      audit(socket.userEmail, 'room-' + action, `${currentRoom} ${ts.userEmail} ${dur} ${why}`);
    } catch (e) {}
  });
  socket.on('getSanctions', () => {
    const room = currentRoom && rooms.get(currentRoom); if (!room || !socket.isAdmin) return;
    socket.emit('sanctions', [...sanctions.values()].filter(s => s.scope === 'room:' + currentRoom && (!s.until || s.until > Date.now())));
  });
  socket.on('modLift', ({ id } = {}) => {
    const room = currentRoom && rooms.get(currentRoom), s = sanctions.get(String(id));
    if (!room || !socket.isAdmin || !s || s.scope !== 'room:' + currentRoom) return;
    removeSanction(s.id); audit(socket.userEmail, 'room-lift', `${currentRoom} ${s.email} ${s.type}`);
  });

  socket.on('getInvite', () => { const room = currentRoom && rooms.get(currentRoom); if (room && socket.isAdmin) socket.emit('roomInvite', inviteInfo(room)); });
  socket.on('regenInvite', () => {
    const room = currentRoom && rooms.get(currentRoom);
    if (!room || !socket.isAdmin || !room.isPrivate) return;
    room.invite = newInvite(); persistRoom(room); socket.emit('roomInvite', inviteInfo(room));
  });

  socket.on('adminBroadcast', ({ message }) => {
    try { if (adminEmails.has(socket.userEmail) && typeof message === 'string' && message.trim()) io.emit('adminBroadcast', { message: message.trim().slice(0, 300) }); } catch (e) {}
  });

  socket.on('removePinnedMessage', () => {
    try { const room = currentRoom && rooms.get(currentRoom); if (room && socket.isAdmin) { room.pinnedMessage = null; broadcastState(currentRoom); } } catch (e) {}
  });

  socket.on('videoEnded', () => {
    try { if (!currentRoom) return; advanceQueue(currentRoom); } catch (e) { console.error('Erro no videoEnded:', e.message); }
  });

  socket.on('reorderQueue', (newOrder) => {
    try {
      if (!currentRoom) { socket.emit('error', 'Você não está em uma sala'); return; }
      const isGlobalAdmin = userEmail && adminEmails.has(userEmail);
      if (!isGlobalAdmin && !socket.isAdmin) { socket.emit('error', 'Apenas admin pode reordenar'); return; }
      const room = rooms.get(currentRoom);
      if (!room || room.queue.length === 0) return;
      const currentTrack = room.queue[room.currentIndex]; const currentId = currentTrack ? currentTrack.id : null;
      const newQueue = [];
      for (const id of newOrder) { const track = room.queue.find(t => t.id === id); if (track) newQueue.push(track); }
      if (newQueue.length === room.queue.length) {
        room.queue = newQueue;
        const newIndex = room.queue.findIndex(t => t.id === currentId);
        room.currentIndex = newIndex !== -1 ? newIndex : 0;
        broadcastState(currentRoom);
      }
    } catch (e) { console.error('Erro no reorder:', e.message); }
  });

  socket.on('voteSong', ({ id, type, room }) => {
    try {
      if (!room || !socket.userName || !id) return;
      const roomData = rooms.get(room);
      if (!roomData) return;
      const index = roomData.queue.findIndex(t => t.id === id);
      if (index === -1) return;
      if (index === roomData.currentIndex) { socket.emit('error', 'Não é possível votar na música atual'); return; }
      const votes = getRoomVotes(room);
      if (!votes[id]) votes[id] = { up: [], down: [] };
      const data = votes[id];
      const upIndex = data.up.indexOf(socket.userName);
      if (upIndex > -1) data.up.splice(upIndex, 1);
      const downIndex = data.down.indexOf(socket.userName);
      if (downIndex > -1) data.down.splice(downIndex, 1);
      if (type === 'up') { data.up.push(socket.userName); addPoints(socket.userEmail, 1); roomData.totalVotesGiven = (roomData.totalVotesGiven || 0) + 1; }
      else if (type === 'down') data.down.push(socket.userName);
      if (data.down.length >= DISLIKE_THRESHOLD) {
        const removed = roomData.queue.splice(index, 1)[0];
        delete votes[id];
        if (index < roomData.currentIndex) roomData.currentIndex--;
        addSystemMsg(room, `👎 "${removed.title}" foi removida por votação! (${data.down.length} votos negativos)`);
        broadcastState(room);
        io.to(room).emit('voteUpdate', { id, up: data.up, down: data.down, removed: true });
        return;
      }
      io.to(room).emit('voteUpdate', { id, up: data.up, down: data.down });
    } catch (e) { console.error('Erro no voteSong:', e.message); }
  });

  socket.on('disconnect', () => {
    if (currentRoom) {
      const room = rooms.get(currentRoom);
      if (room) { room.listenerCount = Math.max(0, room.listenerCount - 1); broadcastState(currentRoom); broadcastUsers(currentRoom); notifyNextWaiting(currentRoom); }
    }
  });
});

// ========== ROTAS EXTRAS ==========
app.get('/invite/:slug', (req, res) => {
  const room = rooms.get(req.params.slug);
  if (!room) return res.status(404).send('Sala não encontrada');
  room.inviteCount = (room.inviteCount || 0) + 1;
  res.redirect('/?room=' + req.params.slug);
});
app.get('*', (req, res) => {
  if (path.extname(req.path)) return res.status(404).send('Arquivo não encontrado: ' + req.path);
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🎧 SonoraFan → http://localhost:${PORT}`));
