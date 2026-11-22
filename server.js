const express = require('express');
const http = require('http');
const https = require('https');
const { Server } = require('socket.io');
const path = require('path');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const { sanitize } = require('./room-settings');
const { MAX_ROOMS, MAX_PEOPLE_PER_ROOM, canCreateRoom, activeRoomCount, canJoinRoom } = require('./room-limits-230');
const {normalizeRoomGenre109,legacyRoomGenre109} = require('./room-genres-109');
const ROOM_THEMES_88 = require('./public/themes/catalog-88.json');
const ROOM_THEME_IDS_88 = new Set(ROOM_THEMES_88.map(theme => theme.id));
const normalizeRoomTheme88 = id => ROOM_THEME_IDS_88.has(id) ? id : 'geral';
// Preferências de enquadramento são normalizadas no servidor.
const roomCoverFrame = (value, fallback, low, high) => {
  const number = Number(value);
  return Number.isFinite(number) && value !== null && value !== '' ? Math.min(high,Math.max(low,number)) : fallback;
};
function publicRoomCover(room) {
  return {
    coverUrl: normalizeRoomCover(room.coverUrl),
    coverX: roomCoverFrame(room.coverX,50,0,100),
    coverY: roomCoverFrame(room.coverY,50,0,100),
    coverZoom: roomCoverFrame(room.coverZoom,1,1,2)
  };
}
function normalizeRoomCover(url) {
  if (url === null || url === undefined || url === '') return null;
  if (typeof url !== 'string' || url.length > 1600) return null;
  try { const u = new URL(url); return u.protocol === 'https:' && u.hostname && !u.username && !u.password ? u.href : null; }
  catch (_) { return null; }
}
const { decodeYouTubeEntities } = require('./youtube-utils-81');
const crypto = require('crypto');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { getStorage } = require('firebase-admin/storage');
const { createGamification45 } = require('./gamification-45');
const { createRanking60 } = require('./ranking-60');
const { installChat53 } = require('./chat-social-53');
const { installPlatform63 } = require('./sonorafan-platform-63');
const { installFavoriteGenres67 } = require('./favorite-genres-67');
const { installFanClubs71 } = require('./fan-clubs-71');
const { createStudio100 } = require('./sonorafan-studio-100');
const { installProfile108 } = require('./sonorafan-profile-108');
const installExperience95 = require('./sonorafan-experience-95');

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
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'sonorafan-777.firebasestorage.app',
  });
  console.log('🔥 Firebase conectado!');
} catch (e) {
  console.error('⚠️ Erro ao conectar Firebase:', e.message);
}

const db = getFirestore();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CORS_ORIGIN?.trim().replace(/\/$/, '') || false, credentials: true } });

app.use(compression());
app.use((req, res, next) => {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'SAMEORIGIN', 'Referrer-Policy': 'strict-origin-when-cross-origin' });
  next();
});
// HTML deve sempre revalidar: no Android, a index.html antiga pode continuar
// apontando para os estilos mobile antigos após a publicação do Render.
app.use((req,res,next)=>{
  if(req.method==='GET' && (req.path==='/' || req.path.endsWith('.html'))){
    res.set('Cache-Control','no-store, no-cache, must-revalidate');
    res.set('Pragma','no-cache');
  }
  next();
});
app.get('/api/client-version',(req,res)=>{
  res.set('Cache-Control','no-store');
  res.json({mobile:'186.3',commit:process.env.RENDER_GIT_COMMIT||null});
});
// Compatibilidade com páginas/atalhos ainda em cache das marcas v54/v64.
// Os binários obsoletos podem ser retirados sem quebrar URLs legadas.
const legacyBrandImages = Object.freeze({
  '/brand-54/sonorafan-icon-192.png': '/brand-144/sonorafan-icon-192.png',
  '/brand-54/sonorafan-icon-512.png': '/brand-144/sonorafan-icon-512.png',
  '/brand-64/sonorafan-favicon-64.png': '/brand-144/sonorafan-icon-192.png',
  '/brand-64/sonorafan-icon-192.png': '/brand-144/sonorafan-icon-192.png',
  '/brand-64/sonorafan-icon-512.png': '/brand-144/sonorafan-icon-512.png',
  '/brand-64/sonorafan-logo-transparent.png': '/brand-144/sonorafan-logo.svg'
});
app.get(Object.keys(legacyBrandImages), (req, res) => {
  res.redirect(301, legacyBrandImages[req.path]);
});
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/profile108/avatar', express.json({limit:'240kb'}));
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
// Admin 169: verificação de acesso sem expor informações pessoais ou carregar o dashboard.
app.get('/api/admin/access', (req,res) => { res.set('Cache-Control','no-store'); res.json({authorized:true}); });
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
// Painel global exclusivo: permissões validadas no servidor, nunca por botão ou variável ambiente.
const adminEmails = new Set(['admin@sonora.com']);
const settings = { maxQueue: 10000, cooldown: 30, maxDuration: 600, maxListeners: MAX_PEOPLE_PER_ROOM };
const DISLIKE_THRESHOLD = 10;
const MAX_SONGS_PER_USER = 10000;
const SKIP_VOTE_THRESHOLD = 0.5;
const MIN_SKIP_VOTES = 3;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';
// Contadores agregados em memória; nenhuma consulta ou identidade é armazenada.
const musicOps = { startedAt: Date.now(), searchRequests: 0, searchFailures: 0, queueAccepted: 0, queueRejected: 0 };

// ========== ESTADO EM MEMÓRIA ==========
const users = new Map();
// Sessões persistentes (Firestore) — chave guardada como hash, nunca o token puro
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const sh = t => crypto.createHash('sha256').update(String(t)).digest('hex');
const sessionMap = new Map();
const sessionExpirations = new Map();
const sessions = {
  get: t => {
    if (!t) return null;
    const key = sh(t), email = sessionMap.get(key), expiry = sessionExpirations.get(key);
    if (!email) return null;
    if (expiry !== undefined && expiry <= Date.now()) {
      sessionMap.delete(key);
      sessionExpirations.delete(key);
      db.collection('sessions').doc(key).delete().catch(() => {});
      return null;
    }
    return email;
  },
  set: (t, email) => {
    const key = sh(t), exp = Date.now() + SESSION_MS;
    sessionMap.set(key, email);
    sessionExpirations.set(key, exp);
    db.collection('sessions').doc(key).set({ email, exp }).catch(e => console.error('Erro ao persistir sessão:', e.message));
  },
  delete: t => {
    if (!t) return;
    const key = sh(t);
    sessionMap.delete(key);
    sessionExpirations.delete(key);
    db.collection('sessions').doc(key).delete().catch(() => {});
  }
};
function dropSessions(email) {
  for (const [key, currentEmail] of sessionMap)
    if (currentEmail === email) {
      sessionMap.delete(key);
      sessionExpirations.delete(key);
      db.collection('sessions').doc(key).delete().catch(() => {});
    }
}
async function loadSessions() {
  try {
    const snap = await db.collection('sessions').get(), now = Date.now();
    snap.forEach(d => { const v = d.data(); if (v.exp > now) { sessionMap.set(d.id, v.email); sessionExpirations.set(d.id, v.exp); } else d.ref.delete().catch(() => {}); });
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
let roomCatalogReady = false;
// Socket.IO adapter é a fonte da capacidade, não um contador histórico.
function syncRoomOccupancy(slug) {
  const room=rooms.get(slug);
  if (!room) return 0;
  room.listenerCount=activeRoomCount(io,slug);
  return room.listenerCount;
}
function clearWaitingSocket(socket) {
  for (const [slug,queue] of waitingRooms) waitingRooms.set(slug,queue.filter(s=>s!==socket&&s.connected));
}

// 45.0 — mesma coleção `points`, com progressão transacional e ranking persistente.
const gamification45 = createGamification45({ db, app, sessionEmail, users, userPoints, io });
const ranking60 = createRanking60({ app, db, sessionEmail, users, gamification45, rateLimit });
// 57–63: preserve XP, chats and queue; register server-validated new experiences.
const platform63 = installPlatform63({ app, io, db, rooms, users, sessionEmail, userPoints, gamification45 });
installFavoriteGenres67({ app, db, sessionEmail });


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
  db.collection('rooms').doc(r.slug).set({ slug: r.slug, name: r.name, admin: r.admin, ownerEmail: r.ownerEmail || null, color: r.color || null, roomTheme: normalizeRoomTheme88(r.roomTheme), ...publicRoomCover(r), genre: normalizeRoomGenre109(r.genre), emoji: r.emoji, description: r.description, slowMode: r.slowMode, addMode: r.addMode, isPrivate: !!r.isPrivate, invite: r.invite || null, passHash: r.passHash || null, passSalt: r.passSalt || null, welcome: r.pinnedMessage ? r.pinnedMessage.text : '', allowLong: !!r.allowLong, allowLive: !!r.allowLive, maxDuration: r.maxDuration || null, musicMode: r.musicMode || 'all', votePriority: !!r.votePriority, radioMode: !!r.radioMode, radioGenre: r.radioGenre || 'pop' }).catch(() => {});
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
    radioMode: false, radioGenre: 'pop', musicMode: 'all', votePriority: false,
    pinnedMessage: null, color: '#7c3aed', roomTheme: 'geral', coverUrl: null, coverX: 50, coverY: 50, coverZoom: 1, genre: null,
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
  try { await db.collection('favorites').doc(email).set({ items }, { merge: true }); } catch (e) {}
}
async function getPointsFromFirestore(email) {
  try { const doc = await db.collection('points').doc(email).get(); if (doc.exists) return doc.data(); } catch (e) {}
  return { points: 0, badges: [] };
}
async function setPointsInFirestore(email, data) {
  try { await db.collection('points').doc(email).set(data, { merge: true }); } catch (e) {}
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
       r.roomTheme = normalizeRoomTheme88(v.roomTheme);
      r.coverUrl = normalizeRoomCover(v.coverUrl);
      r.coverX = roomCoverFrame(v.coverX,50,0,100);
      r.coverY = roomCoverFrame(v.coverY,50,0,100);
      r.coverZoom = roomCoverFrame(v.coverZoom,1,1,2);
      r.genre = normalizeRoomGenre109(v.genre) || legacyRoomGenre109(v.name, v.description);
      r.ownerEmail = v.ownerEmail || null; if (v.emoji) r.emoji = v.emoji; r.description = v.description || ''; r.slowMode = v.slowMode || 0; r.addMode = v.addMode === 'owner' ? 'owner' : 'all'; r.musicMode = ['all', 'owner', 'fair'].includes(v.musicMode) ? v.musicMode : (r.addMode === 'owner' ? 'owner' : 'all'); r.radioMode = !!v.radioMode; r.votePriority = !!v.votePriority && r.musicMode !== 'fair'; r.radioGenre = typeof v.radioGenre === 'string' ? v.radioGenre.slice(0, 40) : 'pop';
      if (v.welcome) r.pinnedMessage = { author: r.admin, text: v.welcome };
      r.isPrivate = !!v.isPrivate; r.invite = v.invite || null; r.passHash = v.passHash || null; r.passSalt = v.passSalt || null;
      if (v.allowLong) r.allowLong = true;
      if (v.allowLive) r.allowLive = true;
      if (v.maxDuration) r.maxDuration = v.maxDuration;
      rooms.set(v.slug, r);
    });
    roomCatalogReady = true;
    console.log(`✅ ${rooms.size} salas carregadas.`);
    if (rooms.size > MAX_ROOMS) console.warn(`⚠️ Existem ${rooms.size} salas antigas (limite atual: ${MAX_ROOMS}); nenhuma sala será removida automaticamente.`);
  } catch (e) { console.error('Falha ao carregar salas; criação temporariamente bloqueada:',e.message); }
}
loadRooms();

// ========== FUNÇÕES AUXILIARES ==========
function getPosition(room) {
  const track = room.queue[room.currentIndex];
  if (!track) return 0;
  return Math.min((Date.now() - room.startedAt) / 1000, track.duration || 180);
}
function fairMusicQueue(queue, currentIndex = 0) {
  if (!Array.isArray(queue) || queue.length < 3) return queue;
  const current = queue[currentIndex] || queue[0];
  const remaining = queue.filter((_, i) => i !== currentIndex);
  const groups = new Map();
  for (const track of remaining) {
    const key = String(track.dj || 'participante').toLocaleLowerCase('pt-BR');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(track);
  }
  // A pessoa da música atual entra por último na primeira rodada, evitando repetição consecutiva.
  const lastDJ = String(current.dj || 'participante').toLocaleLowerCase('pt-BR');
  const keys = [...groups.keys()].filter(k => k !== lastDJ);
  if (groups.has(lastDJ)) keys.push(lastDJ);
  const result = [current];
  while (result.length < queue.length) for (const key of keys) {
    const next = groups.get(key).shift();
    if (next) result.push(next);
  }
  return result;
}

// Rodadas temporárias no contexto da sala: nunca modificam fila, pontos ou reprodução.
const sf141PartyRounds=new Map();
const sf141PartyChoices=Object.freeze([
  ['Indie','Rock'],['Pop','Eletrônica'],['Clássicos','Descobertas'],
  ['Anos 2000','Atualidades'],['Brasil','Internacional']
]);
function sf141PartyPublic(slug){
  const p=sf141PartyRounds.get(slug);
  if(!p)return {active:false,round:0,choices:[],votes:[0,0],endsAt:0};
  if(p.endsAt<=Date.now()){
    sf141PartyRounds.delete(slug);
    return {active:false,round:p.round,choices:[],votes:[0,0],endsAt:0};
  }
  return {active:true,round:p.round,choices:p.choices,votes:[p.counts[0],p.counts[1]],endsAt:p.endsAt};
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
    radioMode: room.radioMode, musicMode: room.musicMode || 'all', votePriority: !!room.votePriority, radioGenre: room.radioGenre || 'pop',
    pinnedMessage: room.pinnedMessage,
    listenerCount: syncRoomOccupancy(slug),
    maxListeners: settings.maxListeners,
    color: room.color, roomTheme: normalizeRoomTheme88(room.roomTheme), ...publicRoomCover(room), genre: room.genre || null,
    inviteCount: room.inviteCount,
    eventStartTime: room.eventStartTime,
    maxDuration: room.maxDuration,
    allowLive: room.allowLive,
    emoji: room.emoji, description: room.description, slowMode: room.slowMode, addMode: room.addMode,
    isPrivate: room.isPrivate, hasPassword: !!room.passHash,
    sf141Party:sf141PartyPublic(slug),
  });
}
function broadcastUsers(slug) {
  io.in(slug).fetchSockets().then(sockets => {
    const userList = sockets.map(s => ({
      id: s.userEmail ? publicUserId(s.userEmail) : null, name: s.userName || 'Anônimo', color: s.userColor || '#888', isAdmin: s.isAdmin || false, role: roleOf(s), muted: !!sanActive(s.userEmail, 'mute', slug), avatar: s.userAvatar || '👤',
      points: userPoints.get(s.userEmail)?.points || 0, badges: userPoints.get(s.userEmail)?.badges || [],
    }));
    io.to(slug).emit('users', userList);
  });
}
// Eventos rotineiros da fila são refletidos no player e na própria fila,
// não no chat público. Avisos administrativos e de moderação continuam visíveis.
function isRoutineMusicChatNotice(text) {
  return typeof text === 'string' &&
    /^(?:▶ |📥 Música da fila de espera:|🏁 Fila encerrada\.|📻 Rádio automático:|🧹 A fila foi limpa por um administrador\.|🗑️ "|⏭️ |⏳ "|⛔ "|👎 ")/u.test(text);
}
function addSystemMsg(slug, text) {
  if (isRoutineMusicChatNotice(text)) return;
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
  if (current) { const tracked = getRoomVotes(slug)[current.id] || {};
    current.votes = { up: Array.isArray(tracked.up) ? tracked.up.slice() : [], down: Array.isArray(tracked.down) ? tracked.down.slice() : [] };
    room.history.push(current); if (room.history.length > 50) room.history.shift(); updateMostVoted(room, current); platform63.onAdvance(room, current).catch(e => console.error('History63:',e.message)); }
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
    const recent = new Set([...room.queue, ...room.history.slice(-25)].map(t => t.id));
    const items = (Array.isArray(data.items) ? data.items : []).filter(item => /^[a-zA-Z0-9_-]{11}$/.test(item.id?.videoId) && !recent.has(item.id.videoId)).slice(0, 3).map(item => ({ id: item.id.videoId, title: item.snippet.title, artist: item.snippet.channelTitle, duration: null }));
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
  const upVotes = Array.isArray(track.votes?.up) ? track.votes.up.length : 0;
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
  const { nome, username, estilos, idToken } = req.body;
  const publicUsername = typeof username === 'string' ? username.trim().toLowerCase() : null;
  let email;
  try { email = (await getAuth().verifyIdToken(idToken)).email; } catch (e) { return res.status(401).json({ error: 'Sessão Firebase inválida' }); }
  if (!nome || nome.length < 2 || nome.length > 60) return res.status(400).json({ error: 'Nome inválido' });
  if (!email) return res.status(400).json({ error: 'E-mail inválido' });
  if (!Array.isArray(estilos) || estilos.length === 0) return res.status(400).json({ error: 'Escolha um estilo' });
  // Backwards compatible: older app versions do not submit a username.
  if (publicUsername !== null && !/^[a-z0-9._-]{3,24}$/.test(publicUsername))
    return res.status(400).json({ error: 'Username inválido' });
  if ([...users.values()].some(u => String(u.nome || '').trim().toLowerCase() === String(nome).trim().toLowerCase())) return res.status(400).json({ error: 'Esse nome já está em uso. Escolha outro.' });
  if (publicUsername && [...users.values()].some(u => String(u.username || '').toLowerCase() === publicUsername))
    return res.status(400).json({ error: 'Esse username já está em uso.' });

  try {
    const existing = await db.collection('users').doc(email).get();
    if (existing.exists) return res.status(400).json({ error: 'E-mail já cadastrado' });
    // Use a DB lookup as well as the memory cache to keep handles unique across instances.
    if (publicUsername) {
      const used = await db.collection('users').where('username', '==', publicUsername).limit(1).get();
      if (!used.empty) return res.status(400).json({ error: 'Esse username já está em uso.' });
    }

    const userData = { nome: String(nome).trim(), username: publicUsername || null, email, estilos, avatar: '🎸', criadoEm: new Date(), theme: 'dark', fontSize: 16, colorblind: false, discordWebhook: null };
    await setUserInFirestore(email, userData);
    users.set(email, userData);
    await setPointsInFirestore(email, { points: 0, badges: [] });
    userPoints.set(email, { points: 0, badges: [] });
    await setFavoritesInFirestore(email, []);
    userFavorites.set(email, []);
    res.json({ success: true, nome, username: publicUsername, email });
  } catch (e) { console.error('Erro no signup:', e.message); res.status(500).json({ error: 'Erro ao salvar dados no Firestore: ' + e.message }); }
});

app.get('/api/leaderboard', async (req, res) => {
  if (!sessionEmail(req)) return res.status(401).json({ error: 'Não autenticado' });
  try { res.json({ items: await gamification45.getLeaderboard(10) }); }
  catch (e) {
    console.error('Erro ao carregar ranking persistente:', e.message);
    return res.status(503).json({ error: 'Ranking temporariamente indisponível', items: [] });
  }
});

app.post('/api/delete-account', rateLimit(3, 60000), async (req, res) => {
  const email = sessionEmail(req);
  if (!email) return res.status(401).json({ error: 'Não autenticado' });
  if (adminEmails.has(email)) return res.status(403).json({ error: 'Contas admin não podem ser excluídas aqui' });
  try {
    await profile108.deleteUserData(email);
    await studio100.deleteUserData(email);
    await sf95.deleteUserData(email);
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
    userPoints.set(email, { points: points.points || 0, badges: points.badges || [] });
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
  const points = await getPointsFromFirestore(email);
  userPoints.set(email, { points: points.points || 0, badges: points.badges || [] });
  res.json({ success: true, user: { ...userData, points: points.points, badges: points.badges } });
});

// ========== SONORAFAN 5 — PERFIL E PRIVACIDADE ==========
const sf5Clean = (value, max) => String(value ?? '').replace(/[<>\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const sf5ProfileView = u => ({
  nome: String(u.nome || 'Ouvinte'), avatar: String(u.avatar || '🎧'),
  bio: String(u.bio || ''), musicGenres: Array.isArray(u.musicGenres) ? u.musicGenres : [],
  profileColor: /^#[0-9a-fA-F]{6}$/.test(u.profileColor || '') ? u.profileColor : '#7c3aed',
  showListeningActivity: u.showListeningActivity !== false,
  criadoEm: u.criadoEm || null
});
app.get('/api/community/profile', async (req, res) => {
  const email = sessionEmail(req);
  if (!email) return res.status(401).json({error:'Faça login'});
  const u = users.get(email) || await getUserFromFirestore(email);
  if (!u) return res.status(404).json({error:'Perfil indisponível'});
  res.json(sf5ProfileView(u));
});
app.patch('/api/community/profile', rateLimit(15, 60000), async (req, res) => {
  const email = sessionEmail(req);
  if (!email) return res.status(401).json({error:'Faça login'});
  const user = users.get(email) || await getUserFromFirestore(email);
  if (!user) return res.status(404).json({error:'Perfil indisponível'});
  const body = req.body || {};
  if (typeof body.nome !== 'string' || typeof body.bio !== 'string' || !Array.isArray(body.musicGenres)) return res.status(400).json({error:'Dados incompletos'});
  const nome = sf5Clean(body.nome,40);
  if (nome.length < 2) return res.status(400).json({error:'Seu nome precisa ter entre 2 e 40 caracteres'});
  if (body.bio.length > 320 || body.musicGenres.length > 6) return res.status(400).json({error:'Bio ou estilos ultrapassaram o limite'});
  const allowedGenres = new Set(['Pop','Rock','Hip-hop','Eletrônica','Indie','Sertanejo','Funk','MPB','Jazz','Reggae','K-pop','Clássica']);
  const genres = [...new Set(body.musicGenres)].filter(x => typeof x==='string' && allowedGenres.has(x));
  if (genres.length !== body.musicGenres.length) return res.status(400).json({error:'Estilo musical inválido ou repetido'});
  const color = String(body.profileColor || '#7c3aed');
  if (!['#7c3aed','#ec4899','#ff6b35','#0ea5e9','#10b981','#f59e0b'].includes(color) || typeof body.showListeningActivity !== 'boolean') return res.status(400).json({error:'Preferência inválida'});
  const next = {...user,nome,bio:sf5Clean(body.bio,240),musicGenres:genres,profileColor:color,showListeningActivity:body.showListeningActivity};
  try {
    await db.collection('users').doc(email).set({nome:next.nome,bio:next.bio,musicGenres:next.musicGenres,profileColor:next.profileColor,showListeningActivity:next.showListeningActivity},{merge:true});
    users.set(email,next);
    res.json({success:true,profile:sf5ProfileView(next)});
  } catch(e) {console.error('Profile update',e);res.status(503).json({error:'Não foi possível salvar seu perfil'});}
});

// ========== SONORAFAN SOCIAL 4 — AMIGOS E EVENTOS ==========
// IDs públicos não revelam email; sessões e permissões permanecem no servidor.
const publicUserId = email => crypto.createHash('sha256').update('sf-public-v1:' + String(email).toLowerCase()).digest('hex').slice(0, 24);
const profile108=installProfile108({app,db,users,sessionEmail,publicUserId,rateLimit,getUserFromFirestore});
const studio100=createStudio100({app,db,io,rooms,users,sessionEmail,publicUserId,rateLimit,adminEmails,getPosition,getFollowing,publicActivity,youtubeApiKey:YOUTUBE_API_KEY});
const sf95 = installExperience95({ app, db, rooms, users, sessionEmail, publicUserId, rateLimit });
const findSocialUser = id => [...users.entries()].find(([email]) => publicUserId(email) === id);
const profileSafe = ([email, u]) => ({ id: publicUserId(email), name: String(u.nome || 'Ouvinte').slice(0, 40), avatar: String(u.avatar || '🎧').slice(0, 8), bio: String(u.bio || '').slice(0, 120), musicGenres: Array.isArray(u.musicGenres) ? u.musicGenres.slice(0, 6) : [] });
const socialFollowing = new Map();
const socialEvents = new Map();
async function getFollowing(email) {
  if (socialFollowing.has(email)) return socialFollowing.get(email);
  try { const d = await db.collection('socialFollowing').doc(publicUserId(email)).get();
    const result = Array.isArray(d.data()?.ids) ? d.data().ids.filter(x => typeof x === 'string').slice(0, 100) : [];
    socialFollowing.set(email, result); return result;
  } catch(e) { console.error('social following read',e.message); throw e; }
}
async function saveFollowing(email, ids) {
  await db.collection('socialFollowing').doc(publicUserId(email)).set({ ids, updatedAt: Date.now() });
  socialFollowing.set(email, ids);
}
function publicActivity(email) {
  // Somente sessões em salas PÚBLICAS. Não expõe informações de salas privadas.
  for (const client of io.sockets.sockets.values()) {
    if (client.sfSocialEmail !== email || !client.sfSocialRoom) continue;
    const room = rooms.get(client.sfSocialRoom);
    if (users.get(email)?.showListeningActivity === false) return null;
    if (room && !room.isPrivate) return { roomSlug: room.slug, roomName: room.name, playing: !!room.isPlaying };
  }
  return null;
}
app.get('/api/social/search', rateLimit(30,60000), (req,res) => {
  const me = sessionEmail(req); if(!me) return res.status(401).json({error:'Faça login'});
  const q=String(req.query.q||'').trim().toLocaleLowerCase('pt-BR');
  if(q.length<2 || q.length>40) return res.json([]);
  res.json([...users.entries()].filter(([e,u])=>e!==me && !u.banned && String(u.nome||'').toLocaleLowerCase('pt-BR').includes(q)).slice(0,15).map(profileSafe));
});
function socialOnline(email) {
  // Identidade vinculada à sessão pelo servidor, nunca ao nickname enviado pelo navegador.
  const account = users.get(email);
  if (!account || account.banned || account.showListeningActivity === false) return false;
  for (const client of io.sockets.sockets.values()) {
    if (client.connected && (client.sf53Email === email || client.sfSocialEmail === email)) return true;
  }
  return false;
}
// Solicitações de amizade: seguir alguém não estabelece amizade até a aceitação.
// Contatos anteriores unilaterais são recuperados como solicitações pendentes.
const sfFriendRequests=db.collection('socialFriendRequests');
const sfFriendId=id=>typeof id==='string'&&/^[a-f0-9]{24}$/.test(id);
const sfFriendKey=(from,to)=>from+'_'+to;
const sfFriendInfo=id=>{
  const user=sfFriendId(id)?findSocialUser(id):null;
  return user&&!user[1].banned?{...profileSafe(user),online:socialOnline(user[0]),activity:publicActivity(user[0])}:null;
};
async function sfFriendState(email){
  const mine=publicUserId(email);
  const [out,incoming,following,followerDocs]=await Promise.all([
    sfFriendRequests.where('from','==',mine).limit(100).get(),
    sfFriendRequests.where('to','==',mine).limit(100).get(),
    getFollowing(email),
    db.collection('socialFollowing').where('ids','array-contains',mine).limit(100).get()
  ]);
  const accepted=new Set(),incomingMap=new Map(),outgoingMap=new Map(),decisions=new Map();
  for(const d of [...out.docs,...incoming.docs]){
    const x=d.data()||{},other=x.from===mine?x.to:x.from;
    if(!sfFriendId(other)||other===mine)continue;
    decisions.set(sfFriendKey(x.from,x.to),x.status);
    if(x.status==='accepted')accepted.add(other);
    else if(x.status==='pending'){
      const record={...sfFriendInfo(other),requestedAt:Number(x.createdAt)||0};
      if(!record.id)continue;
      if(x.to===mine)incomingMap.set(other,record);
      else outgoingMap.set(other,record);
    }
  }
  // Legado: seguem ambos => amizade confirmada anteriormente; seguem só um
  // => solicitação pendente até que o destinatário escolha aceitar/recusar.
  const previousFollowers=followerDocs.docs.map(d=>d.id).filter(sfFriendId);
  const followerSet=new Set(previousFollowers);
  for(const id of following){
    if(!sfFriendId(id)||!sfFriendInfo(id))continue;
    if(followerSet.has(id))accepted.add(id);
    else if(!decisions.has(sfFriendKey(mine,id))&&!accepted.has(id))
      outgoingMap.set(id,{...sfFriendInfo(id),requestedAt:0,legacy:true});
  }
  for(const id of previousFollowers){
    if(id===mine||!sfFriendInfo(id))continue;
    if(following.includes(id))accepted.add(id);
    else if(!decisions.has(sfFriendKey(id,mine))&&!accepted.has(id))
      incomingMap.set(id,{...sfFriendInfo(id),requestedAt:0,legacy:true});
  }
  for(const id of accepted){incomingMap.delete(id);outgoingMap.delete(id);}
  return {
    accepted:[...accepted].map(sfFriendInfo).filter(Boolean),
    incoming:[...incomingMap.values()].sort((a,b)=>b.requestedAt-a.requestedAt),
    outgoing:[...outgoingMap.values()].sort((a,b)=>b.requestedAt-a.requestedAt)
  };
}
async function sfFriendMutual(me,otherId){
  const mine=publicUserId(me),other=findSocialUser(otherId);
  if(!other||other[0]===me)throw Error('Participante inválido');
  const first=db.collection('socialFollowing').doc(mine);
  const second=db.collection('socialFollowing').doc(otherId);
  await db.runTransaction(async tx=>{
    const [mineSnap,otherSnap]=await Promise.all([tx.get(first),tx.get(second)]);
    const mineIds=Array.isArray(mineSnap.data()?.ids)?mineSnap.data().ids.filter(sfFriendId):[];
    const otherIds=Array.isArray(otherSnap.data()?.ids)?otherSnap.data().ids.filter(sfFriendId):[];
    if(mineIds.length>=100&&!mineIds.includes(otherId)||otherIds.length>=100&&!otherIds.includes(mine))
      throw Error('Limite de 100 amigos alcançado');
    tx.set(first,{ids:[...new Set([...mineIds,otherId])],updatedAt:Date.now()},{merge:true});
    tx.set(second,{ids:[...new Set([...otherIds,mine])],updatedAt:Date.now()},{merge:true});
  });
  socialFollowing.delete(me);socialFollowing.delete(other[0]);
}
async function sfFriendDisconnect(me,otherId){
  const mine=publicUserId(me),other=findSocialUser(otherId);
  if(!other)throw Error('Participante inválido');
  const first=db.collection('socialFollowing').doc(mine);
  const second=db.collection('socialFollowing').doc(otherId);
  await db.runTransaction(async tx=>{
    const [a,b]=await Promise.all([tx.get(first),tx.get(second)]);
    const aIds=Array.isArray(a.data()?.ids)?a.data().ids:[];
    const bIds=Array.isArray(b.data()?.ids)?b.data().ids:[];
    tx.set(first,{ids:aIds.filter(x=>x!==otherId),updatedAt:Date.now()},{merge:true});
    tx.set(second,{ids:bIds.filter(x=>x!==mine),updatedAt:Date.now()},{merge:true});
  });
  socialFollowing.delete(me);socialFollowing.delete(other[0]);
}
async function sfFriendSend(me,target){
  const sender=publicUserId(me),targetId=publicUserId(target[0]);
  const current=await sfFriendState(me);
  if(current.accepted.some(x=>x.id===targetId))return 'accepted';
  if(current.incoming.some(x=>x.id===targetId))return 'incoming';
  if(current.outgoing.some(x=>x.id===targetId))return 'pending';
  const ref=sfFriendRequests.doc(sfFriendKey(sender,targetId)),snap=await ref.get();
  if(snap.exists&&snap.data()?.status==='declined'&&Date.now()-Number(snap.data()?.updatedAt||0)<7*86400000)
    throw Error('Aguarde alguns dias antes de enviar outro pedido a esta pessoa.');
  await ref.set({from:sender,to:targetId,status:'pending',createdAt:Date.now(),updatedAt:Date.now()});
  await sf15Notify(target[0],{
    type:'follow',title:'Nova solicitação de amizade',
    message:(users.get(me)?.nome||'Um participante')+' quer adicionar você como amigo.',
    peerId:sender
  }).catch(e=>console.error('friend request notification',e.message));
  return 'pending';
}
app.get('/api/social/friend-requests',rateLimit(30,60000),async(req,res)=>{
  const me=sessionEmail(req);if(!me)return res.status(401).json({error:'Faça login'});
  try{res.set('Cache-Control','no-store').json(await sfFriendState(me));}
  catch(e){console.error('friend requests',e.message);res.status(503).json({error:'Não foi possível carregar suas solicitações.'});}
});
app.post('/api/social/friend-requests',rateLimit(24,60000),async(req,res)=>{
  const me=sessionEmail(req);if(!me)return res.status(401).json({error:'Faça login'});
  const otherId=req.body?.id,action=req.body?.action;
  if(!sfFriendId(otherId)||!['accept','decline','cancel','remove'].includes(action))
    return res.status(400).json({error:'Ação inválida'});
  const target=findSocialUser(otherId),mine=publicUserId(me);
  if(!target||target[0]===me||target[1].banned)return res.status(404).json({error:'Participante indisponível'});
  try{
    const state=await sfFriendState(me);
    const incoming=state.incoming.some(x=>x.id===otherId),outgoing=state.outgoing.some(x=>x.id===otherId);
    const accepted=state.accepted.some(x=>x.id===otherId);
    if(action==='accept'||action==='decline'){
      if(!incoming)return res.status(409).json({error:'Solicitação não está pendente.'});
      const ref=sfFriendRequests.doc(sfFriendKey(otherId,mine));
      if(action==='accept'){
        // Conclui o vínculo recíproco antes de marcar a solicitação como aceita.
        await sfFriendMutual(me,otherId);
      }
      await ref.set({from:otherId,to:mine,status:action==='accept'?'accepted':'declined',
        updatedAt:Date.now(),resolvedAt:Date.now()},{merge:true});
      if(action==='accept'){
        sf15Notify(target[0],{type:'follow',title:'Solicitação aceita',
          message:(users.get(me)?.nome||'Um participante')+' aceitou sua amizade.',peerId:mine})
          .catch(e=>console.error('friend accepted notification',e.message));
      }else if(outgoing||accepted||state.incoming.some(x=>x.id===otherId&&x.legacy))await sfFriendDisconnect(me,otherId);
    }else if(action==='cancel'){
      if(!outgoing)return res.status(409).json({error:'Não há pedido enviado para cancelar.'});
      await sfFriendRequests.doc(sfFriendKey(mine,otherId)).set({
        from:mine,to:otherId,status:'cancelled',updatedAt:Date.now()
      },{merge:true});
    }else{
      if(!accepted)return res.status(409).json({error:'Esta pessoa não está na sua lista de amigos.'});
      await sfFriendDisconnect(me,otherId);
      await Promise.all([
        sfFriendRequests.doc(sfFriendKey(mine,otherId)).set({from:mine,to:otherId,status:'removed',updatedAt:Date.now()},{merge:true}),
        sfFriendRequests.doc(sfFriendKey(otherId,mine)).set({from:otherId,to:mine,status:'removed',updatedAt:Date.now()},{merge:true})
      ]);
    }
    res.json({success:true,action});
  }catch(e){console.error('friend action',e.message);res.status(503).json({error:e.message==='Limite de 100 amigos alcançado'?e.message:'Não foi possível atualizar amizade.'});}
});
app.get('/api/social/following',async(req,res)=>{
  const me=sessionEmail(req);if(!me)return res.status(401).json({error:'Faça login'});
  try{res.set('Cache-Control','no-store').json((await sfFriendState(me)).accepted);}
  catch(e){res.status(503).json({error:'Amigos indisponíveis'});}
});
app.get('/api/social/followers',rateLimit(25,60000),async(req,res)=>{
  const me=sessionEmail(req);if(!me)return res.status(401).json({error:'Faça login'});
  try{res.set('Cache-Control','no-store').json((await sfFriendState(me)).incoming);}
  catch(e){res.status(503).json({error:'Solicitações indisponíveis'});}
});
app.post('/api/social/follow',rateLimit(24,60000),async(req,res)=>{
  const me=sessionEmail(req);if(!me)return res.status(401).json({error:'Faça login'});
  const id=req.body?.id,person=sfFriendId(id)?findSocialUser(id):null;
  if(!person||person[0]===me||person[1].banned)return res.status(400).json({error:'Participante inválido'});
  try{
    if(req.body?.follow===true){
      const status=await sfFriendSend(me,person);
      res.json({success:true,status,following:status==='accepted'});
    }else if(req.body?.follow===false){
      const state=await sfFriendState(me),action=state.accepted.some(x=>x.id===id)?'remove':
        state.outgoing.some(x=>x.id===id)?'cancel':null;
      if(!action)return res.status(409).json({error:'Não há vínculo para remover.'});
      if(action==='remove')await sfFriendDisconnect(me,id);
      await sfFriendRequests.doc(sfFriendKey(publicUserId(me),id)).set({
        from:publicUserId(me),to:id,status:action==='remove'?'removed':'cancelled',updatedAt:Date.now()
      },{merge:true});
      res.json({success:true,following:false});
    }else res.status(400).json({error:'Informe uma ação válida.'});
  }catch(e){res.status(String(e.message||'').startsWith('Aguarde alguns dias')?409:503).json({error:e.message||'Não foi possível enviar solicitação.'});}
});
const eventClean=(v,n)=>String(v??'').replace(/[<>\u0000-\u001f]/g,' ').trim().slice(0,n);
const publicEvent = e => ({ id:e.id,roomSlug:e.roomSlug,roomName:e.roomName,title:e.title,description:e.description,startAt:e.startAt,hostName:e.hostName,attendees:e.attendees.length,theme:e.theme||'indie',durationMinutes:e.durationMinutes||90 });
async function initSocialEvents(){try{const snap=await db.collection('socialEvents').get();snap.forEach(d=>{const e=d.data();if(e&&e.id&&Array.isArray(e.attendees))socialEvents.set(e.id,e);});}catch(e){console.error('social events load',e.message);}}
initSocialEvents();
app.get('/api/social/my-rooms', (req,res)=>{const me=sessionEmail(req);if(!me)return res.status(401).json({error:'Faça login'});res.json([...rooms.values()].filter(r=>!r.isPrivate&&r.ownerEmail===me&&r.slug.toLowerCase()!=='lobby').map(r=>({slug:r.slug,name:r.name})));});
app.get('/api/social/events', (req,res)=>{
  const now=Date.now();const list=[...socialEvents.values()].filter(e=>e.startAt>=now-3600000&&e.startAt<now+90*86400000&&rooms.has(e.roomSlug)&&!rooms.get(e.roomSlug).isPrivate).sort((a,b)=>a.startAt-b.startAt).slice(0,60);
  res.json(list.map(e=>({...publicEvent(e),going:!!sessionEmail(req)&&e.attendees.includes(publicUserId(sessionEmail(req)))})));
});
app.post('/api/social/events',rateLimit(8,60000),async(req,res)=>{
  const me=sessionEmail(req);if(!me)return res.status(401).json({error:'Faça login'});
  const slug=String(req.body?.roomSlug||'');const room=rooms.get(slug);
  if(!room||room.isPrivate)return res.status(404).json({error:'Sala pública não encontrada'});
  if(room.ownerEmail!==me&&!adminEmails.has(me))return res.status(403).json({error:'Somente o dono da sala pode criar eventos'});
  const title=eventClean(req.body?.title,70),description=eventClean(req.body?.description,240),startAt=Date.parse(req.body?.startAt);
  if(title.length<3||!Number.isFinite(startAt)||startAt<Date.now()+5*60000||startAt>Date.now()+90*86400000)return res.status(400).json({error:'Informe título e data futura (5 min a 90 dias)'});
  if([...socialEvents.values()].filter(e=>e.roomSlug===slug&&e.startAt>Date.now()).length>=10)return res.status(400).json({error:'Limite de 10 eventos futuros por sala'});
  const theme=['indie','rock2000','discoveries','pop','electronic'].includes(req.body?.theme)?req.body.theme:'indie';
   const durationMinutes=[45,60,90,120,180].includes(Number(req.body?.durationMinutes))?Number(req.body.durationMinutes):90;
   const e={id:crypto.randomUUID(),roomSlug:slug,roomName:room.name,title,description,startAt,theme,durationMinutes,hostId:publicUserId(me),hostName:users.get(me)?.nome||room.admin,attendees:[],createdAt:Date.now()};
  try{await db.collection('socialEvents').doc(e.id).set(e);socialEvents.set(e.id,e);res.json(publicEvent(e));}
  catch(err){res.status(503).json({error:'Falha ao agendar evento'});}
});
app.post('/api/social/events/:id/rsvp',rateLimit(20,60000),async(req,res)=>{
  const me=sessionEmail(req);if(!me)return res.status(401).json({error:'Faça login'});
  const e=socialEvents.get(req.params.id);const room=e&&rooms.get(e.roomSlug);
  if(!e||!room||room.isPrivate||e.startAt<Date.now()-3600000)return res.status(404).json({error:'Evento indisponível'});
  const id=publicUserId(me);const attendees=e.attendees.filter(x=>x!==id);
  if(req.body?.going===true){if(attendees.length>=500)return res.status(400).json({error:'Lista de presença lotada'});attendees.push(id);}
  try{await db.collection('socialEvents').doc(e.id).set({...e,attendees});e.attendees=attendees;res.json({going:attendees.includes(id),attendees:attendees.length});}
  catch(err){res.status(503).json({error:'Não foi possível confirmar presença'});}
});
app.patch('/api/social/events/:id',rateLimit(12,60000),async(req,res)=>{
 const me=sessionEmail(req);if(!me)return res.status(401).json({error:'Faça login'});
 const original=socialEvents.get(req.params.id);
 if(!original)return res.status(404).json({error:'Evento não encontrado'});
 const room=rooms.get(original.roomSlug);
 if(original.hostId!==publicUserId(me)&&room?.ownerEmail!==me&&!adminEmails.has(me))
   return res.status(403).json({error:'Somente quem criou ou administra este evento pode editar'});
 if(!room||room.isPrivate)return res.status(409).json({error:'A sala associada não está disponível'});
 if(original.startAt<Date.now()-3600000)return res.status(409).json({error:'Evento encerrado não pode ser editado'});
 const title=eventClean(req.body?.title,70),description=eventClean(req.body?.description,240),
   startAt=Date.parse(req.body?.startAt),durationMinutes=Number(req.body?.durationMinutes);
 if(title.length<3||!Number.isFinite(startAt)||startAt<Date.now()+300000||startAt>Date.now()+90*86400000||
   ![45,60,90,120,180].includes(durationMinutes))
   return res.status(400).json({error:'Título, data futura (5 minutos a 90 dias) ou duração inválidos'});
 const theme=['indie','rock2000','discoveries','pop','electronic'].includes(req.body?.theme)?req.body.theme:(original.theme||'indie');
 // Mover para outra sala só é permitido a quem administra ambas.
 const slug=String(req.body?.roomSlug||original.roomSlug);
 const target=rooms.get(slug);
 if(!target||target.isPrivate)return res.status(400).json({error:'Selecione uma sala pública'});
 if(slug!==original.roomSlug&&target.ownerEmail!==me&&!adminEmails.has(me))
   return res.status(403).json({error:'Você precisa administrar a sala selecionada'});
 if(slug!==original.roomSlug&&[...socialEvents.values()].filter(e=>e.id!==original.id&&e.roomSlug===slug&&e.startAt>Date.now()).length>=10)
   return res.status(409).json({error:'Limite de eventos futuros na sala selecionada'});
 const updated={...original,title,description,startAt,durationMinutes,theme,roomSlug:slug,roomName:target.name,updatedAt:Date.now()};
 try{
   await db.collection('socialEvents').doc(original.id).set(updated);
   socialEvents.set(original.id,updated);
   res.json({success:true,event:publicEvent(updated)});
 }catch(err){res.status(503).json({error:'Não foi possível atualizar o evento'});}
});
app.delete('/api/social/events/:id',rateLimit(10,60000),async(req,res)=>{
  const me=sessionEmail(req);if(!me)return res.status(401).json({error:'Faça login'});
  const e=socialEvents.get(req.params.id);if(!e)return res.status(404).json({error:'Evento inexistente'});
  const r=rooms.get(e.roomSlug);if(e.hostId!==publicUserId(me)&&r?.ownerEmail!==me&&!adminEmails.has(me))return res.status(403).json({error:'Sem permissão'});
  try{await db.collection('socialEvents').doc(e.id).delete();socialEvents.delete(e.id);res.json({success:true});}catch(err){res.status(503).json({error:'Não foi possível excluir'});}
});
// SONORAFAN 15 — notificações e convites pessoais (somente salas públicas).
const sf15Alerts = new Map();
const sf15UserKey = email => publicUserId(email);
async function sf15GetAlerts(email) {
  if (sf15Alerts.has(email)) return sf15Alerts.get(email);
  const snap = await db.collection('socialNotifications').doc(sf15UserKey(email)).get();
  const data = snap.exists ? snap.data() : {};
  const list = Array.isArray(data.items) ? data.items.filter(x => x && typeof x.id === 'string').slice(0,70) : [];
  sf15Alerts.set(email,list);
  return list;
}
async function sf15WriteAlerts(email,list) {
  await db.collection('socialNotifications').doc(sf15UserKey(email)).set({items:list.slice(0,70),updatedAt:Date.now()});
  sf15Alerts.set(email,list.slice(0,70));
}
async function sf15Notify(email,data) {
  const items = await sf15GetAlerts(email);
  const item={id:crypto.randomUUID(),type:data.type,title:eventClean(data.title,90),message:eventClean(data.message,200),
    roomSlug:typeof data.roomSlug==='string'&&rooms.has(data.roomSlug)?data.roomSlug:null,
    fanClubId:/^[a-f0-9-]{36}$/.test(data.fanClubId||'')?data.fanClubId:null,
    // Only trusted server paths can set these IDs. They never expose an email.
    peerId:typeof data.peerId==='string'&&/^[a-f0-9]{24}$/.test(data.peerId)?data.peerId:null,
    messageId:typeof data.messageId==='string'&&/^[a-zA-Z0-9.-]{1,100}$/.test(data.messageId)?data.messageId:null,
    createdAt:Date.now(),read:false};
  const next=[item,...items].slice(0,70);
  await sf15WriteAlerts(email,next);
  // Authenticate membership in sf53-user-* before delivery; clients receive
  // only a refresh signal, not private message content over a broad room.
  io.to('sf53-user-'+sf15UserKey(email)).emit('sf111Notification',{id:item.id,type:item.type});
}
app.get('/api/social/notifications',rateLimit(50,60000),async(req,res)=>{
  const email=sessionEmail(req);if(!email)return res.status(401).json({error:'Faça login'});
  try {
    const stored=await sf15GetAlerts(email);
    // Lembretes calculados sob demanda, sem execução em background.
    const now=Date.now(),me=sf15UserKey(email);
    const reminders=[...socialEvents.values()].filter(e=>e&&e.startAt>=now&&e.startAt<now+24*3600000&&Array.isArray(e.attendees)&&e.attendees.includes(me)&&rooms.get(e.roomSlug)&&!rooms.get(e.roomSlug).isPrivate)
      .map(e=>({id:'event-'+e.id,type:'event',title:'Evento chegando',message:eventClean(e.title,70)+' · '+new Date(e.startAt).toLocaleString('pt-BR'),roomSlug:e.roomSlug,createdAt:e.startAt,read:false}));
    const fanClubReminders=typeof app.locals.sf202ClubEventReminders==='function'
      ? await app.locals.sf202ClubEventReminders(email).catch(err=>{console.warn('Fan Club event reminders:',err.message);return [];})
      : [];
    const allReminders=[...reminders,...fanClubReminders];
    const readIds=new Set(stored.filter(x=>x.type==='event_seen').map(x=>x.id));
    const dismissedIds=new Set(stored.filter(x=>x.type==='event_hidden').map(x=>x.id));
    const normal=stored.filter(x=>x.type!=='event_seen' && x.type!=='event_hidden' && (x.type!=='invite' || (rooms.has(x.roomSlug)&&!rooms.get(x.roomSlug).isPrivate)));
    res.json([...allReminders.filter(x=>!dismissedIds.has('hidden-'+x.id)).map(x=>({...x,read:readIds.has('seen-'+x.id)})),...normal].sort((a,b)=>b.createdAt-a.createdAt).slice(0,70));
  }catch(e){console.error('notifications read:',e.message);res.status(503).json({error:'Notificações indisponíveis'});}
});
app.post('/api/social/notifications/read',rateLimit(30,60000),async(req,res)=>{
  const email=sessionEmail(req);if(!email)return res.status(401).json({error:'Faça login'});
  const ids=Array.isArray(req.body?.ids)?req.body.ids.filter(x=>typeof x==='string'&&x.length<100).slice(0,70):[];
  if(!ids.length)return res.status(400).json({error:'Selecione uma notificação'});
  try{
    const before=await sf15GetAlerts(email);const idSet=new Set(ids);
    const current=before.map(x=>idSet.has(x.id)?{...x,read:true}:x);
    for(const id of ids.filter(x=>x.startsWith('event-'))){const mark='seen-'+id;if(!current.some(x=>x.id===mark))current.unshift({id:mark,type:'event_seen',read:true,createdAt:Date.now()});}
    await sf15WriteAlerts(email,current);res.json({success:true});
  }catch(e){res.status(503).json({error:'Não foi possível atualizar'});}
});
// Arquivar notificações não apaga mensagens, eventos nem o conteúdo de Fan Clubs.
// Os lembretes calculados recebem um registro de ocultação para não reaparecerem.
app.post('/api/social/notifications/dismiss',rateLimit(30,60000),async(req,res)=>{
  const email=sessionEmail(req);if(!email)return res.status(401).json({error:'Faça login'});
  const all=req.body?.all===true;
  const ids=Array.isArray(req.body?.ids)?req.body.ids.filter(x=>typeof x==='string'&&x.length<100).slice(0,70):[];
  if(!all&&!ids.length)return res.status(400).json({error:'Selecione uma notificação'});
  try{
    const stored=await sf15GetAlerts(email);
    const eventPrefix='event-';
    const activeEvents=[...socialEvents.values()].filter(e=>e&&e.startAt>=Date.now()&&e.startAt<Date.now()+24*3600000&&Array.isArray(e.attendees)&&e.attendees.includes(sf15UserKey(email))&&rooms.get(e.roomSlug)&&!rooms.get(e.roomSlug).isPrivate).map(e=>eventPrefix+e.id);
    const eventIds=all?activeEvents:ids.filter(id=>id.startsWith(eventPrefix)&&activeEvents.includes(id));
    const removeIds=new Set(ids);
    const remaining=all?stored.filter(x=>x.type==='event_hidden'):stored.filter(x=>!removeIds.has(x.id));
    // Registramos somente identificadores de eventos realmente acessíveis ao usuário.
    for(const id of eventIds){
      const marker='hidden-'+id;
      if(!remaining.some(x=>x.id===marker))remaining.unshift({id:marker,type:'event_hidden',createdAt:Date.now(),read:true});
    }
    await sf15WriteAlerts(email,remaining);
    io.to('sf53-user-'+sf15UserKey(email)).emit('sf111Notification',{type:'dismiss'});
    res.json({success:true,removed:all?stored.filter(x=>x.type!=='event_hidden').length+eventIds.length:ids.length});
  }catch(err){console.error('notifications dismiss:',err.message);res.status(503).json({error:'Não foi possível limpar notificações'});}
});
app.post('/api/social/invite-friend',rateLimit(8,60000),async(req,res)=>{
  const email=sessionEmail(req);if(!email)return res.status(401).json({error:'Faça login'});
  const id=String(req.body?.userId||''),slug=String(req.body?.roomSlug||'');
  const dest=findSocialUser(id),room=rooms.get(slug);
  if(!dest||dest[0]===email||dest[1].banned)return res.status(400).json({error:'Amigo indisponível'});
  if(!room||room.isPrivate)return res.status(404).json({error:'Sala pública indisponível'});
  try{
    const following=await getFollowing(email);
    if(!following.includes(id))return res.status(403).json({error:'Você só pode convidar pessoas que segue'});
    await sf15Notify(dest[0],{type:'invite',title:'Convite para ouvir junto',message:(users.get(email)?.nome||'Um amigo')+' convidou você para '+room.name,roomSlug:slug});
    res.json({success:true});
  }catch(e){console.error('social invite:',e.message);res.status(503).json({error:'Convite não enviado'});}
});

// 53.0 — mensagens privadas, caixa de entrada e privacidade persistidos no Firestore.
installChat53({ app, io, db, sessionEmail, users, rooms, publicUserId, findSocialUser, getFollowing, sf15Notify, socketTokens, sessions, rateLimit });
// Comunidades permanentes de fãs: membros e mural protegidos pela sessão.
const fanclubRoomModule=installFanClubs71({ app, db, sessionEmail, users, rooms, socialEvents, publicUserId, adminEmails, rateLimit, sf15Notify, gamification45,
  ranking60, io, rawCoverParser: express.raw({type:['image/webp','image/jpeg','image/png'],limit:'256kb'}) });

// Administração de denúncias 53.0 — protegida por requireAdmin já aplicado em /api/admin.
app.get('/api/admin/chat-reports', async(req,res)=>{
  try { const snap=await db.collection('chatReports53').orderBy('createdAt','desc').limit(100).get();
    const items=[];snap.forEach(d=>{
      const entry=d.data();
      if(entry.status==='removed')return;
      // Somente administradores recebem identificadores públicos para contato;
      // nunca expor email, número de sessão ou acesso à conversa original.
      const reporterId=typeof entry.reporterId==='string'&&/^[a-f0-9]{24}$/.test(entry.reporterId)?entry.reporterId:null;
      const reportedId=typeof entry.reportedId==='string'&&/^[a-f0-9]{24}$/.test(entry.reportedId)?entry.reportedId:
        entry.type==='dm'&&typeof entry.otherId==='string'&&/^[a-f0-9]{24}$/.test(entry.otherId)?entry.otherId:null;
      const reporter=reporterId?findSocialUser(reporterId):null;
      const reported=reportedId?findSocialUser(reportedId):null;
      items.push({
        ...entry,id:d.id,reporterId,reportedId,
        reporterName:reporter?String(reporter[1].nome||'Participante').slice(0,40):null,
        reportedName:reported?String(reported[1].nome||'Participante').slice(0,40):null
      });
    });
    res.set('Cache-Control','no-store').json(items);
  } catch(e) { console.error('chat reports admin',e.message);res.status(503).json({error:'Denúncias indisponíveis'}); }
});
app.post('/api/admin/chat-reports/:id/resolve',rateLimit(40,60000),async(req,res)=>{
  if(!/^[a-f0-9-]{36}$/i.test(req.params.id)||!['open','resolved'].includes(req.body?.status))return res.status(400).json({error:'Dados inválidos'});
  try{ const ref=db.collection('chatReports53').doc(req.params.id),snap=await ref.get();if(!snap.exists)return res.status(404).json({error:'Denúncia não encontrada'});
    await ref.set({status:req.body.status,reviewedAt:Date.now(),reviewedBy:req.adminEmail},{merge:true});
    audit(req.adminEmail,'chat-report',req.params.id+' '+req.body.status);
    res.json({success:true});
  }catch(e){res.status(503).json({error:'Não foi possível atualizar denúncia'});}
});

// Retirada lógica: a denúncia desaparece do painel, mas permanece auditável.
app.post('/api/admin/chat-reports/:id/remove',rateLimit(30,60000),async(req,res)=>{
  if(!/^[a-f0-9-]{36}$/i.test(req.params.id))return res.status(400).json({error:'Identificador inválido'});
  try {
    const ref=db.collection('chatReports53').doc(req.params.id);
    const snap=await ref.get();
    if(!snap.exists||snap.data()?.status==='removed')return res.status(404).json({error:'Denúncia não encontrada'});
    await ref.set({status:'removed',removedAt:Date.now(),removedBy:req.adminEmail},{merge:true});
    audit(req.adminEmail,'chat-report-remove',req.params.id);
    res.set('Cache-Control','no-store').json({success:true});
  } catch(e) {
    console.error('chat report remove',e.message);
    res.status(503).json({error:'Não foi possível remover a denúncia'});
  }
});

// Fim das APIs sociais; nenhum dado pessoal é retornado ao cliente.

// Upload persistente: arquivos não dependem do filesystem temporário do Render.
app.post('/api/room-cover-upload', rateLimit(12, 60000), express.raw({type:['image/jpeg','image/png','image/webp','image/gif'],limit:'2mb'}), async (req,res) => {
  if (!sessionEmail(req)) return res.status(401).json({error:'Faça login para enviar uma capa.'});
  const mime=String(req.headers['content-type']||'').split(';')[0].trim().toLowerCase();
  const types={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'};
  if (!types[mime] || !Buffer.isBuffer(req.body) || req.body.length<100 || req.body.length>2097152) return res.status(400).json({error:'Envie JPEG, PNG, WebP ou GIF de até 2 MB.'});
  const b=req.body;
  const valid=mime==='image/jpeg' ? b[0]===255&&b[1]===216&&b[2]===255 : mime==='image/png' ? b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : mime==='image/webp' ? b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP' : ['GIF87a','GIF89a'].includes(b.toString('ascii',0,6));
  if (!valid) return res.status(400).json({error:'Formato de imagem inválido.'});
  try {
    const bucket=getStorage().bucket(),name='room-covers/'+crypto.randomUUID()+'.'+types[mime],token=crypto.randomUUID();
    await bucket.file(name).save(b,{resumable:false,contentType:mime,metadata:{metadata:{firebaseStorageDownloadTokens:token},cacheControl:'public,max-age=31536000,immutable'}});
    res.json({url:'https://firebasestorage.googleapis.com/v0/b/'+encodeURIComponent(bucket.name)+'/o/'+encodeURIComponent(name)+'?alt=media&token='+token});
  }catch(e){console.error('Erro upload de capa:',e.message);res.status(503).json({error:'Falha no upload. Verifique o Firebase Storage.'});}
});

// ========== SALAS ==========
app.get('/api/rooms', (req, res) => {
  try {
    const me = sessionEmail(req), adm = !!me && adminEmails.has(me);
    const list = Array.from(rooms.values()).filter(r => !r.isPrivate || adm || (!!me && r.ownerEmail === me)).map(r => ({
      slug: r.slug, name: r.name, isMine: !!me && r.ownerEmail === me, listenerCount: syncRoomOccupancy(r.slug), maxListeners: MAX_PEOPLE_PER_ROOM,
      queueLength: r.queue.length, isPlaying: r.isPlaying,
      currentTrack: r.queue[r.currentIndex] || null,
      radioMode: r.radioMode, color: r.color || '#7c3aed', roomTheme: normalizeRoomTheme88(r.roomTheme), ...publicRoomCover(r), genre: r.genre || null, emoji: r.emoji, description: r.description, addMode: r.addMode, slowMode: r.slowMode, isPrivate: !!r.isPrivate,
      allowLive: !!r.allowLive, allowLong: !!r.allowLong,
      inviteCount: r.inviteCount, eventStartTime: r.eventStartTime,
    }));
    res.json(list);
  } catch (e) { console.error('Erro na rota /api/rooms:', e.message); res.status(500).json({ error: 'Erro interno ao listar salas' }); }
});

app.get('/api/rooms/limits', (req,res)=>{
  res.set('Cache-Control','no-store');
  res.json({maxRooms:MAX_ROOMS,currentRooms:rooms.size,maxPeoplePerRoom:MAX_PEOPLE_PER_ROOM,ready:roomCatalogReady});
});

app.post('/api/rooms', rateLimit(5, 60000), (req, res) => {
  const { name, adminName, color, allowLong, allowLive } = req.body;
  const email = sessionEmail(req);
  if (!email) return res.status(401).json({ error: 'Faça login para criar uma sala' });
  if (!roomCatalogReady) return res.status(503).json({error:'As salas estão sendo carregadas. Tente novamente em instantes.'});
  if (!canCreateRoom(rooms)) return res.status(409).json({error:`Limite de ${MAX_ROOMS} salas atingido. Exclua uma sala antiga antes de criar outra.`,maxRooms:MAX_ROOMS,currentRooms:rooms.size});
  if (!name || name.trim().length < 2 || name.trim().length > 40) return res.status(400).json({ error: 'Nome inválido' });
  const genre=normalizeRoomGenre109(req.body?.genre);
  if (!genre) return res.status(400).json({error:'Selecione o gênero musical da sala.'});
  const baseSlug=name.trim().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,55)||'sala';
   const slug=baseSlug+'-'+Date.now().toString(36);
  if (rooms.has(slug)) return res.status(400).json({ error: 'Sala já existe' });
  const room = createRoom(slug, name.trim(), String(adminName || 'Anônimo').slice(0, 40));
  room.ownerEmail = email;
  room.roomTheme = req.body.roomTheme == null ? 'geral' : normalizeRoomTheme88(req.body.roomTheme);
  if (req.body.coverUrl && !normalizeRoomCover(req.body.coverUrl)) return res.status(400).json({error:'A capa precisa usar HTTPS.'});
  room.coverUrl = normalizeRoomCover(req.body.coverUrl);
  room.coverX = roomCoverFrame(req.body.coverX,50,0,100);
  room.coverY = roomCoverFrame(req.body.coverY,50,0,100);
  room.coverZoom = roomCoverFrame(req.body.coverZoom,1,1,2);
  room.genre = genre;
  const cfg = sanitize(req.body);
  // A escolha feita na criação precisa persistir e ser aplicada no servidor.
  room.musicMode = cfg.addMode === 'owner' ? 'owner' : 'fair';
  Object.assign(room, { color: cfg.color, emoji: cfg.emoji, description: cfg.description, slowMode: cfg.slowMode, addMode: cfg.addMode });
  if (cfg.welcome) room.pinnedMessage = { author: room.admin, text: cfg.welcome };
  if (req.body.isPrivate) { room.isPrivate = true; room.invite = newInvite(); setPassword(room, String(req.body.password || '').slice(0, 30)); room.allowed.add(email); }
  // Os formatos apresentados no formulário são válidos para qualquer criador autenticado.
  if (allowLong === true || allowLive === true) { room.allowLong = true; room.maxDuration = 21600; }
  if (allowLive === true) room.allowLive = true;
  rooms.set(slug, room);
  persistRoom(room);
  res.json({ slug, name: room.name, genre: room.genre, addMode:room.addMode, musicMode:room.musicMode, invite: room.isPrivate ? room.invite : undefined });
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

// Favoritos de salas: persistidos por conta, separados das músicas favoritas.
app.get('/api/room-bookmarks', async(req,res)=>{
  const email=sessionEmail(req);
  if(!email)return res.status(401).json({error:'Faça login para acessar suas salas favoritas.'});
  try{
    const doc=await db.collection('roomBookmarks').doc(email).get();
    const saved=Array.isArray(doc.data()?.slugs)?doc.data().slugs:[];
    const visible=saved.filter(slug=>{
      const room=rooms.get(slug);
      return room && (!room.isPrivate || room.ownerEmail===email || adminEmails.has(email));
    });
    res.set('Cache-Control','no-store').json({slugs:visible});
  }catch(e){console.error('Falha ao ler salas favoritas:',e.message);res.status(503).json({error:'Não foi possível carregar suas salas favoritas.'});}
});
app.post('/api/room-bookmarks',rateLimit(40,60000),async(req,res)=>{
  const email=sessionEmail(req);
  if(!email)return res.status(401).json({error:'Faça login para favoritar salas.'});
  const slug=req.body?.slug;
  if(typeof slug!=='string'||slug.length>120||!/^[a-z0-9_-]+$/.test(slug))return res.status(400).json({error:'Sala inválida.'});
  const room=rooms.get(slug);
  if(!room||room.isPrivate&&room.ownerEmail!==email&&!adminEmails.has(email))return res.status(404).json({error:'Sala não encontrada.'});
  const favorite=req.body?.favorite;
  if(typeof favorite!=='boolean')return res.status(400).json({error:'Escolha favoritar ou desfavoritar.'});
  try{
    const ref=db.collection('roomBookmarks').doc(email);
    const slugs=await db.runTransaction(async tx=>{
      const doc=await tx.get(ref),old=Array.isArray(doc.data()?.slugs)?doc.data().slugs.filter(s=>typeof s==='string'):[];
      const next=favorite?[...new Set([...old,slug])].slice(-200):old.filter(s=>s!==slug);
      tx.set(ref,{slugs:next,updatedAt:Date.now()},{merge:true});
      return next;
    });
    res.json({slugs});
  }catch(e){console.error('Falha ao salvar sala favorita:',e.message);res.status(503).json({error:'Não foi possível salvar o favorito.'});}
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
  const email = sessionEmail(req);
  if (!email) return res.status(401).json({ error: 'Não autenticado' });
  const { videoId, title, artist } = req.body || {};
  if (typeof videoId !== 'string' || !/^[\w-]{11}$/.test(videoId)) return res.status(400).json({ error: 'ID do vídeo inválido' });
  try {
    const ref=db.collection('favorites').doc(email);
    const favs=await db.runTransaction(async tx=>{
      const doc=await tx.get(ref);
      const list=Array.isArray(doc.data()?.items)?doc.data().items:[];
      if (list.some(f=>f.id===videoId)) return list;
      const next=[...list,{id:videoId,title:String(title||'Música').slice(0,160),artist:String(artist||'Desconhecido').slice(0,100),genreId:''}];
      tx.set(ref,{items:next},{merge:true});return next;
    });
    userFavorites.set(email,favs);res.json({success:true});
  } catch(e) { console.error('Salvar favorito:',e.message);res.status(500).json({error:'Não foi possível salvar o favorito.'}); }
});

app.delete('/api/favorites/:id', async (req, res) => {
  const email = sessionEmail(req);
  if (!email) return res.status(401).json({ error: 'Não autenticado' });
  const id=req.params.id;
  try {
    const ref=db.collection('favorites').doc(email);
    const favs=await db.runTransaction(async tx=>{
      const doc=await tx.get(ref);
      const list=Array.isArray(doc.data()?.items)?doc.data().items:[];
      const next=list.filter(f=>f.id!==id);
      tx.set(ref,{items:next},{merge:true});return next;
    });
    userFavorites.set(email,favs);res.json({success:true});
  } catch(e) { console.error('Remover favorito:',e.message);res.status(500).json({error:'Não foi possível remover o favorito.'}); }
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
    const roomList = [...rooms.values()];
    const onlineListeners = roomList.reduce((n, r) => n + (r.listenerCount || 0), 0);
    const queuedSongs = roomList.reduce((n, r) => n + (r.queue?.length || 0), 0);
    res.set('Cache-Control', 'no-store');
    res.json({ totalUsers, totalRooms, onlineUsers, onlineListeners, queuedSongs,
      occupiedRooms: roomList.filter(r => (r.listenerCount || 0) > 0).length,
      privateRooms: roomList.filter(r => r.isPrivate).length,
      lockedChats: roomList.filter(r => r.chatLocked).length,
      activeSanctions: [...sanctions.values()].filter(s => !s.until || s.until > Date.now()).length,
      checkedAt: Date.now(), musicOps: { ...musicOps } });
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
  return res.status(403).json({ error: 'Promoção a administrador global desativada. Acesso exclusivo de admin@sonora.com.' });
});

app.post('/api/admin/delete-user', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email necessário' });
  if (adminEmails.has(String(email).toLowerCase())) return res.status(403).json({ error: 'A conta administradora é protegida.' });
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
  if (adminEmails.has(String(email).toLowerCase())) return res.status(403).json({ error: 'A conta administradora é protegida.' });
  const room = rooms.get(roomSlug);
  if (!room) return res.status(404).json({ error: 'Sala não encontrada' });
  io.in(roomSlug).fetchSockets().then(sockets => {
    for (const socket of sockets) {
      if (socket.userEmail === email) {
        socket.emit('kicked', 'Você foi expulso da sala pelo admin.');
        socket.leave(roomSlug);
        syncRoomOccupancy(roomSlug);
        notifyNextWaiting(roomSlug);
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
  if (adminEmails.has(String(email).toLowerCase())) return res.status(403).json({ error: 'A conta administradora é protegida.' });
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
  if (adminEmails.has(String(email).toLowerCase())) return res.status(403).json({ error: 'A conta administradora é protegida.' });
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
app.get('/api/admin/log', async (req, res) => {
  try {
    // Merge current instance data with persisted records so audit survives restart.
    const snap = await db.collection('adminLog').get();
    const items = new Map();
    const add = e => { if (e && Number.isFinite(Number(e.t))) items.set(`${e.t}|${e.who}|${e.action}|${e.detail}`, {t:Number(e.t),who:String(e.who||''),action:String(e.action||''),detail:String(e.detail||'')}); };
    snap.forEach(d => add(d.data()));
    adminLog.forEach(add);
    res.set('Cache-Control', 'no-store');
    res.json([...items.values()].sort((a,b)=>b.t-a.t).slice(0,100));
  } catch (e) {
    res.json(adminLog.slice(0,100));
  }
});

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

// Queue details are intentionally available to the authenticated global admin only.
app.get('/api/admin/room/:slug/queue', (req, res) => {
  const room = rooms.get(String(req.params.slug));
  if (!room) return res.status(404).json({error:'Sala não encontrada'});
  res.set('Cache-Control','no-store');
  res.json({slug:room.slug,currentIndex:room.currentIndex || 0,queue:room.queue.map((song,index)=>({index,id:String(song.id||''),title:String(song.title||'Música sem título').slice(0,200),artist:String(song.artist||'').slice(0,100)}))});
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
  if (req.body?.confirmation !== 'LIMPAR CHATS') return res.status(400).json({error:'Confirmação obrigatória: LIMPAR CHATS'});
  for (const [slug, room] of rooms) {
    room.chatHistory = [];
    roomLikes.set(slug, {});
    io.to(slug).emit('chatCleared');
  }
  res.json({ success: true });
});

app.post('/api/admin/clear-all-rooms', (req, res) => {
  if (req.body?.confirmation !== 'ENCERRAR SALAS') return res.status(400).json({error:'Confirmação obrigatória: ENCERRAR SALAS'});
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
  musicOps.searchRequests++;
  const query = req.query.q;
  if (!query || query.length < 2) return res.json({ items: [] });
  const ck = String(query).trim().toLowerCase().slice(0, 100), hit = searchCache.get(ck);
  if (hit && Date.now() - hit.t < 10 * 60 * 1000) return res.json({ items: hit.items });
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&videoEmbeddable=true&safeSearch=moderate&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const items = (Array.isArray(data.items) ? data.items : []).filter(item => /^[a-zA-Z0-9_-]{11}$/.test(item?.id?.videoId || '')).map(item => ({ id: item.id.videoId, title: decodeYouTubeEntities(item.snippet?.title || 'Música'), artist: decodeYouTubeEntities(item.snippet?.channelTitle || 'Artista'), thumb: item.snippet?.thumbnails?.default?.url || '' }));
    if (searchCache.size > 500) searchCache.delete(searchCache.keys().next().value);
    searchCache.set(ck, { t: Date.now(), items });
    res.json({ items });
  } catch (e) { musicOps.searchFailures++; studio100.record('search-failed','unknown'); console.error('Erro na busca do YouTube:', e.message); res.status(500).json({ error: 'Erro ao buscar vídeos.', items: [] }); }
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
      info.title = decodeYouTubeEntities(v.snippet.title); info.embeddable = !(v.status && v.status.embeddable === false); info.artist = decodeYouTubeEntities(v.snippet.channelTitle);
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
  studio100.attachSocket(socket,()=>currentRoom,advanceQueue);
  sf95.registerSocket(socket, () => currentRoom, getRoomVotes, broadcastState, persistRoom);

  socket.on('joinRoom', ({ slug, name, avatar, token, invite, password }) => {
    try {
      const room = rooms.get(slug);
      if (!room) { socket.emit('joinError', {slug,message:'Sala não encontrada.'}); return; }
      // identidade vem da conta logada, nunca do que o navegador envia
      const ck = (socket.handshake.headers.cookie || '').match(/sessionToken=([^;]+)/);
      let who = ck ? sessions.get(ck[1]) : null;
      if (!who && token) { const rt = socketTokens.get(token); if (rt && rt.exp > Date.now()) who = rt.email; }
      if (!who) { socket.emit('joinError', {slug,message:'Faça login para entrar na sala.'}); return; }
      const prof = users.get(who) || {};
      if (prof.banned) { socket.emit('joinError', {slug,message:'Conta banida.'}); return; }
      name = uniqueName(slug, who, String(prof.nome || who.split('@')[0]).slice(0, 40));
      avatar = prof.avatar || avatar;
      const sb = sanActive(who, 'ban', slug);
      if (sb) { socket.emit('joinError', {slug,message:'⛔ Você está banido desta sala' + (sb.until ? ' por mais ' + Math.ceil((sb.until - Date.now()) / 60000) + ' min' : '') + (sb.reason ? ' — ' + sb.reason : '')}); return; }
      if (room.bannedUsers.includes(name)) { socket.emit('joinError', {slug,message:'Você foi banido'}); return; }
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
      // A contagem vem dos sockets efetivamente presentes; reentradas não ocupam outra vaga.
      if (!canJoinRoom(io,slug,socket.id)) {
        if (!waitingRooms.has(slug)) waitingRooms.set(slug, []);
        const queue=waitingRooms.get(slug);
        if (!queue.includes(socket)) queue.push(socket);
        socket.emit('waitingRoom', { slug, position: queue.indexOf(socket)+1, maxListeners: MAX_PEOPLE_PER_ROOM });
        return;
      }
      clearWaitingSocket(socket);
      // ✅ FIX: ao trocar de sala direto, propaga a saída da sala antiga
      if (currentRoom && currentRoom !== slug) {
        const oldSlug = currentRoom;
        socket.leave(oldSlug);
        const old = rooms.get(oldSlug);
        if (old) {
          syncRoomOccupancy(oldSlug);
          broadcastState(oldSlug);
          broadcastUsers(oldSlug);
          notifyNextWaiting(oldSlug);
        }
      }
      currentRoom = slug;
      socket.sfSocialEmail = who;
      socket.sfSocialRoom = slug;
      socket.join(slug);
      socket.userName = name;
      socket.userColor = colors[Math.floor(Math.random() * colors.length)];
      socket.userAvatar = avatar || '👤';
      syncRoomOccupancy(slug);
      const cookie = socket.handshake.headers.cookie || '';
      const tokenMatch = cookie.match(/sessionToken=([^;]+)/);
      let email = tokenMatch ? sessions.get(tokenMatch[1]) : null;
      if (!email && token) { const rt = socketTokens.get(token); socketTokens.delete(token); if (rt && rt.exp > Date.now()) email = rt.email; }   // login feito depois de abrir a página
      userEmail = email;
      socket.userEmail = email;
      if (email) platform63.onJoin(room,email).catch(e => console.error('Passport63:',e.message));
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
        admin: room.admin, isPlaying: room.isPlaying, history: room.history.slice(-10), radioMode: room.radioMode, musicMode: room.musicMode || 'all', votePriority: !!room.votePriority, radioGenre: room.radioGenre || 'pop',
        pinnedMessage: room.pinnedMessage, listenerCount: syncRoomOccupancy(slug), maxListeners: settings.maxListeners,
        color: room.color, roomTheme: normalizeRoomTheme88(room.roomTheme), ...publicRoomCover(room), genre: room.genre || null, inviteCount: room.inviteCount, eventStartTime: room.eventStartTime,
        maxDuration: room.maxDuration, allowLive: room.allowLive,
        emoji: room.emoji, description: room.description, slowMode: room.slowMode, addMode: room.addMode,
        isPrivate: room.isPrivate, hasPassword: !!room.passHash,
        sf141Party:sf141PartyPublic(room.slug),
      });
      socket.emit('joinedRoom',{slug,listenerCount:syncRoomOccupancy(slug),maxListeners:MAX_PEOPLE_PER_ROOM});
      // Entrega o selo também pelo canal da sala, independente do fetch inicial.
      // Uma busca que falhe não pode impedir o ingresso no chat.
      fanclubRoomModule.findRoomFanclubs(slug)
        .then(clubs=>{
          if(socket.sfSocialRoom===slug && socket.connected)
            socket.emit('sf208RoomFanclubs',{slug,clubs,updatedAt:Date.now()});
        })
        .catch(e=>console.warn('[Fanclubs] Falha ao sincronizar selo no ingresso:',e.message));

      socket.emit('chatHistory', room.chatHistory.filter(m=>!m.isSystem||!/^⚙️ .* atualizou as configurações da sala$/.test(String(m.text||''))).slice(-150));
      socket.emit('isAdmin', socket.isAdmin);
      socket.emit('isMod', !!socket.isMod);
      socket.emit('userPoints', userPoints.get(email) || { points: 0, badges: [] });
      broadcastUsers(slug);
      // Primeira entrada diária e missões de descoberta (idempotentes por sala/período).
      if (email) gamification45.award(email, 'room', slug).catch(e => {
        console.error('SonoraFan Club: erro ao registrar visita:', e.message);
      });
    } catch (e) {
      console.error('Erro no joinRoom:', e.message);
      socket.emit('joinError', {slug,message:'Erro ao entrar na sala.'});
    }
  });

  function notifyNextWaiting(slug) {
    const waiting = (waitingRooms.get(slug)||[]).filter(s=>s.connected);
    waitingRooms.set(slug,waiting);
    if (!waiting.length||!rooms.has(slug)) return;
    if (syncRoomOccupancy(slug) < MAX_PEOPLE_PER_ROOM) {
      const nextSocket=waiting.shift();
      nextSocket.emit('waitingRoom',{slug,position:0,maxListeners:MAX_PEOPLE_PER_ROOM,canJoin:true});
    }
  }

  // Reações efêmeras autenticadas, restritas à sala atual e com limite por socket.
  socket.on('roomReaction', (data) => {
    if (!currentRoom || !socket.userEmail || !rooms.has(currentRoom)) return;
    const allowed = ['🔥', '❤️', '🎶', '🙌', '⚡'];
    if (!data || !allowed.includes(data.emoji)) return;
    const now = Date.now();
    if (now - (socket._lastReaction || 0) < 1000) return;
    socket._lastReaction = now;
    io.to(currentRoom).emit('roomReaction', { emoji: data.emoji, name: String(socket.userName || '').slice(0,40) });
  });

  socket.on('chat', ({ text, replyTo }) => {
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
      // Respostas só referenciam mensagens válidas da própria sala; nada é aceito por confiança no cliente.
      const refMsg = typeof replyTo==='string' && replyTo.length < 100 ? room.chatHistory.find(m=>m._id===replyTo&&!m.isSystem&&!m.isMusic) : null;
      // URLs de avatar derivadas apenas de metadados confiáveis salvos pelo servidor.
      // Não permite URLs arbitrárias do cliente, mantendo compatibilidade com o emoji legado.
      const userAvatar108=users.get(socket.userEmail)?.avatar108;
      const avatarUrl=userAvatar108?.kind==='photo'
        ?'/api/profile108/photo/'+publicUserId(socket.userEmail)+'?v='+Number(userAvatar108.updatedAt||0)
        :userAvatar108?.kind==='character'&&/^[a-z0-9-]{1,40}$/.test(String(userAvatar108.id||''))
          ?'/avatars-108/'+userAvatar108.id+'.svg':null;
      const msg = { _id: Date.now().toString() + Math.random(), user: socket.userName, userId: publicUserId(socket.userEmail), text: text.trim(), color: socket.userColor, isSystem: false, isAdmin: socket.isAdmin || false, role: roleOf(socket), avatar: socket.userAvatar || '👤', ...(avatarUrl?{avatarUrl}:{}), createdAt: new Date(), ...(refMsg ? { replyTo: { id:refMsg._id, user:refMsg.user, text:String(refMsg.text).slice(0,110) } } : {}) };
      room.chatHistory.push(msg);
      if (room.chatHistory.length > 300) room.chatHistory.shift();
      io.to(currentRoom).emit('chat', msg);
      // Menções/repostas geram notificações para participantes da sala, não por mera coincidência de nickname fora dela.
      const mentioned = new Set();
      const mentionMatches = [...msg.text.matchAll(/@\{([^{}]{1,40})\}|@([\wÀ-ÿ]{1,40})/g)].slice(0,5);
      for (const match of mentionMatches) mentioned.add(String(match[1]||match[2]).toLocaleLowerCase('pt-BR'));
      if(refMsg) mentioned.add(String(refMsg.user||'').toLocaleLowerCase('pt-BR'));
      let notices=0;
      for(const so of io.sockets.sockets.values()){
        if(notices>=3)break;
        if(so.sfSocialRoom!==currentRoom || !so.userEmail || so.userEmail===socket.userEmail)continue;
        if(!mentioned.has(String(so.userName||'').toLocaleLowerCase('pt-BR')))continue;
        notices++;mentioned.delete(String(so.userName).toLocaleLowerCase('pt-BR'));
        so.emit('sf53Mention',{from:socket.userName,text:msg.text.slice(0,140),messageId:msg._id,roomSlug:currentRoom});
        const isReply=!!refMsg && String(refMsg.user||'').toLocaleLowerCase('pt-BR')===String(so.userName||'').toLocaleLowerCase('pt-BR');
        sf15Notify(so.userEmail,{
          type:'mention',title:(isReply?'Resposta de ':'Menção de ')+socket.userName,
          message:msg.text.slice(0,120),roomSlug:currentRoom,messageId:msg._id
        }).catch(e=>console.error('chat53 mention notify:',e.message));
      }
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
          addPoints(email, 1, 'vote', currentRoom + ':' + track.id); reply = '👍 Você votou na música atual!';
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

  // Cada evento passa por transação no Firestore: nunca sobrescreve pontos antigos.
  function addPoints(email, amount, action, key) {
    if (!email || !action || !key) return;
    gamification45.award(email, action, key).catch(e => {
      console.error('SonoraFan Club: não foi possível pontuar:', e.message);
    });
  }

  socket.on('voteSkip', () => {
    try {
      clearWaitingSocket(socket);
      if (!currentRoom) return;
      const room = rooms.get(currentRoom);
      if (room.queue.length === 0) return;
      if ((room.addMode === 'owner' || room.musicMode === 'owner') &&
          (room.ownerEmail ? socket.userEmail !== room.ownerEmail : !socket.isAdmin)) {
        socket.emit('error','🔒 Somente o criador controla a reprodução nesta sala.');return;
      }
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

  // Modo Festa — votação efêmera de clima musical, separada dos votos da fila.
  socket.on('sf141:partyAction', (data={},ack)=>{
    const respond=(ok,error)=>{if(typeof ack==='function')ack(ok?{ok:true}:{ok:false,error});};
    const room=currentRoom&&rooms.get(currentRoom);
    if(!room||!socket.userEmail)return respond(false,'Entre em uma sala para participar.');
    const isOwner=room.ownerEmail?room.ownerEmail===socket.userEmail:!!socket.isAdmin;
    const command=String(data?.action||'');
    const current=sf141PartyRounds.get(currentRoom);
    if(command==='start'||command==='next'||command==='stop'){
      if(!isOwner&&!adminEmails.has(socket.userEmail))return respond(false,'Somente o responsável pela sala pode conduzir a festa.');
      if(command==='stop'){
        sf141PartyRounds.delete(currentRoom);
      }else{
        const round=command==='next'&&current?current.round+1:1;
        const choices=sf141PartyChoices[(round-1)%sf141PartyChoices.length];
        sf141PartyRounds.set(currentRoom,{round,choices,counts:[0,0],voters:new Set(),endsAt:Date.now()+5*60000});
      }
    }else if(command==='vote'){
      const selected=Number(data?.option);
      if(!current||current.endsAt<=Date.now())return respond(false,'A rodada já terminou.');
      if(selected!==0&&selected!==1)return respond(false,'Escolha inválida.');
      const key=socket.userEmail;
      if(current.voters.has(key))return respond(false,'Você já votou nesta rodada.');
      current.voters.add(key);current.counts[selected]++;
    }else return respond(false,'Ação inválida.');
    io.to(currentRoom).emit('sf141:partyState',sf141PartyPublic(currentRoom));
    respond(true);
  });

  // Etapa 2 — modos musicais por sala. Nenhum cliente pode alterar salas fora da sua sessão.
  socket.on('setMusicMode', (data = {}) => {
    try {
      const room = currentRoom && rooms.get(currentRoom);
      if (!room || !socket.isAdmin) return socket.emit('error', 'Somente o responsável pela sala pode alterar o modo musical.');
      const mode = typeof data.mode === 'string' ? data.mode : '';
      if (!['all', 'owner', 'fair'].includes(mode)) return socket.emit('error', 'Modo musical inválido.');
      room.musicMode = mode;
      room.addMode = mode === 'owner' ? 'owner' : 'all';
      if (mode === 'owner') { room.votePriority = false; room.radioMode = false; }
      if (mode === 'fair') { room.votePriority = false; room.queue = fairMusicQueue(room.queue, room.currentIndex); room.currentIndex = 0; }
      persistRoom(room); broadcastState(room.slug);
      addSystemMsg(room.slug, `🎛️ Modo musical: ${{all:'Colaborativo', owner:'DJ anfitrião', fair:'Fila justa'}[mode]}`);
    } catch (e) { console.error('Erro ao alterar modo musical:', e.message); }
  });

  socket.on('setAutoRadio', (data = {}) => {
    try {
      const room = currentRoom && rooms.get(currentRoom);
      if (!room || !socket.isAdmin) return socket.emit('error', 'Apenas o responsável pode configurar o rádio.');
      if (typeof data.enabled !== 'boolean') return;
      if (data.enabled && !YOUTUBE_API_KEY) return socket.emit('error', 'Rádio indisponível: chave da API do YouTube não configurada.');
      const genre = String(data.genre || room.radioGenre || 'pop').replace(/[<>\x00-\x1f]/g,'').trim().slice(0,40);
      room.radioMode = data.enabled;
      room.radioGenre = genre || 'pop';
      persistRoom(room); broadcastState(room.slug);
      if (room.radioMode && !room.isPlaying && room.queue.length === 0) startRadio(room.slug);
    } catch (e) { console.error('Erro ao configurar rádio:', e.message); }
  });

  // Permissões individualizadas: o navegador só recebe o estado de acesso da sessão.
  // A validação real continua no handler addSong; não confiamos no botão desativado.
  socket.on('getPlaylistPermission', (_input = {}, acknowledge) => {
    if (typeof acknowledge !== 'function') return;
    const room = currentRoom && rooms.get(currentRoom);
    if (!room) return acknowledge({ joined: false, canAdd: false, ownerOnly: false });
    const ownerOnly = room.addMode === 'owner' || room.musicMode === 'owner';
    const isOwner = room.ownerEmail
      ? !!socket.userEmail && room.ownerEmail === socket.userEmail
      : !!socket.isAdmin;
    acknowledge({
      joined: true, slug: room.slug, ownerOnly,
      canAdd: !ownerOnly || isOwner,
      mode: ownerOnly ? 'owner' : 'collaborative'
    });
  });

  socket.on('addSong', (song, acknowledge) => {
    const reply = (ok, details = {}) => {
      if(ok)musicOps.queueAccepted++;else musicOps.queueRejected++;
      if (typeof acknowledge === 'function') {
        try { acknowledge({ ok, ...details }); } catch (_) {}
      }
    };
    const refuse = message => {
      socket.emit('error', message);
      reply(false, { error: message });
    };
    try {
      if (!currentRoom) { refuse('Entre em uma sala para adicionar música.'); return; }
      const room = rooms.get(currentRoom);
      if (!room) { refuse('Sala indisponível. Entre novamente.'); return; }
      if (room.addMode === 'owner' || room.musicMode === 'owner') {
        const authorized = room.ownerEmail ? socket.userEmail === room.ownerEmail : !!socket.isAdmin;
        if (!authorized) { refuse('🔒 Playlist exclusiva: somente o criador desta sala pode adicionar músicas.'); return; }
      }
      if (!song || typeof song !== 'object' || typeof song.id !== 'string' || !/^[a-zA-Z0-9_-]{11}$/.test(song.id)) {
        refuse('Link ou vídeo do YouTube inválido.'); return;
      }
      if (room.queue.concat(room.waitingQueue).some(track => track.id === song.id)) {
        refuse('Esta música já está na fila. Escolha outra!'); return;
      }
      const now = Date.now();
      const lastAdd = room.lastAddTime.get(socket.userEmail || socket.userName) || 0;
      if (now - lastAdd < 30000) { const wait = Math.ceil((30000 - (now - lastAdd)) / 1000); refuse(`Aguarde ${wait}s`); return; }
      const userSongs = room.queue.filter(t => t.dj === socket.userName).length + room.waitingQueue.filter(t => t.dj === socket.userName).length;
      if (room.listenerCount > 1 && userSongs >= 5) { refuse('Para manter a fila colaborativa, aguarde uma de suas 5 músicas pendentes tocar.'); return; }
      if (userSongs >= MAX_SONGS_PER_USER) { refuse(`Você já tem ${MAX_SONGS_PER_USER} músicas na fila/espera. Aguarde outras serem tocadas.`); return; }
      const limit = room.maxDuration || settings.maxDuration;
      const liveOk = !!room.allowLive;
      if (!liveOk && song.duration && song.duration > limit) { refuse(`⛔ Vídeo muito longo! Duração: ${Math.floor(song.duration / 60)} min. Limite: ${Math.floor(limit / 60)} min.`); return; }
      if (liveOk && !song.duration) song.live = true;
      const isQueueFull = room.queue.length >= settings.maxQueue;
      if (isQueueFull) {
        if (room.waitingQueue.length >= settings.maxQueue) { refuse(`Fila de espera cheia (${settings.maxQueue})`); return; }
        song.dj = socket.userName; song.addedByUserId = publicUserId(socket.userEmail); room.waitingQueue.push(song); sf95.onAddedSong(socket.userEmail,room,song); room.lastAddTime.set(socket.userEmail || socket.userName, now); platform63.onSong(room,song,socket).catch(e=>console.error('Challenge63:',e.message)); addPoints(socket.userEmail, 1, 'song', currentRoom + ':' + song.id);
        io.to(currentRoom).emit('playSound', 'waiting');
        addSystemMsg(currentRoom, `⏳ "${song.title}" entrou na fila de espera (${room.waitingQueue.length} músicas aguardando)`);
        broadcastState(currentRoom);
        reply(true, { placement: 'waiting' });
        return;
      }
      song.dj = socket.userName; song.addedByUserId = publicUserId(socket.userEmail); room.queue.push(song); sf95.onAddedSong(socket.userEmail,room,song); platform63.onSong(room,song,socket).catch(e=>console.error('Challenge63:',e.message)); if (room.musicMode === 'fair') { room.queue = fairMusicQueue(room.queue, room.currentIndex); room.currentIndex = 0; } room.lastAddTime.set(socket.userEmail || socket.userName, now); addPoints(socket.userEmail, 2, 'song', currentRoom + ':' + song.id);
      room.totalSongsAdded = (room.totalSongsAdded || 0) + 1;
      if (room.votePriority) sf95.applyPriority(room,getRoomVotes(currentRoom));
      if (!room.isPlaying && room.queue.length === 1) { room.isPlaying = true; room.currentIndex = 0; room.startedAt = Date.now(); room.lastAdvanceAt = Date.now(); addSystemMsg(currentRoom, `▶ ${song.title} — ${song.artist}`); }
      broadcastState(currentRoom);
      reply(true, { placement: 'queue' });
      if (room.discordWebhook) { const msg = `🎵 **${song.title}** por ${song.artist} foi adicionada por ${socket.userName} na sala **${room.name}**`; sendDiscordWebhook(room.discordWebhook, msg); }
    } catch (e) {
      console.error('❌ CRASH AO ADICIONAR MÚSICA:', e.message);
      refuse('Erro interno ao adicionar música. Verifique os logs.');
    }
  });

  socket.on('likeMessage', ({ messageId, room }) => {
    try {
      if (!room || room !== currentRoom || !socket.userEmail || !socket.userName || typeof messageId !== 'string' || messageId.length > 100) return;
      const validMessage = rooms.get(room)?.chatHistory.find(msg => msg._id === messageId && !msg.isSystem && !msg.isMusic);
      if (!validMessage) return;
      const likes = getRoomLikes(room);
      if (!likes[messageId]) likes[messageId] = { likes: 0, users: [] };
      const data = likes[messageId];
      const userIndex = data.users.indexOf(socket.userName);
      if (userIndex > -1) { data.users.splice(userIndex, 1); data.likes = Math.max(0, data.likes - 1); }
      else { data.users.push(socket.userName); data.likes++; if (validMessage.user !== socket.userName) addPoints(socket.userEmail, 1, 'like', room + ':' + messageId); io.to(room).emit('playSound', 'like'); }
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
      // Renomear não altera o identificador, convites ou vínculos do Fanclub.
      if (input.name !== undefined) {
        if (typeof input.name !== 'string') return socket.emit('error', 'Nome da sala inválido.');
        const name = input.name.normalize('NFC').trim();
        if (name.length < 2 || name.length > 40 || /[<>\u0000-\u001f\u007f]/.test(name))
          return socket.emit('error', 'O nome da sala deve ter entre 2 e 40 caracteres válidos.');
        room.name = name;
      }
      Object.assign(room, { color: cfg.color, emoji: cfg.emoji, description: cfg.description, slowMode: cfg.slowMode, addMode: cfg.addMode });
      if (input.addMode !== undefined) {
        room.musicMode = cfg.addMode === 'owner' ? 'owner' : 'fair';
        if (cfg.addMode === 'owner') { room.votePriority = false; room.radioMode = false; }
      }
      if (input.coverUrl !== undefined) {
        if (input.coverUrl && !normalizeRoomCover(input.coverUrl)) return socket.emit('error','A capa precisa usar HTTPS.');
        room.coverUrl = normalizeRoomCover(input.coverUrl);
      }
      if (input.coverX !== undefined) room.coverX = roomCoverFrame(input.coverX,50,0,100);
      if (input.coverY !== undefined) room.coverY = roomCoverFrame(input.coverY,50,0,100);
      if (input.coverZoom !== undefined) room.coverZoom = roomCoverFrame(input.coverZoom,1,1,2);
      if (input.roomTheme !== undefined) {
        if (!ROOM_THEME_IDS_88.has(input.roomTheme)) return socket.emit('error', 'Tema visual inválido.');
        room.roomTheme = input.roomTheme;
      }
      if (input.welcome !== undefined) room.pinnedMessage = cfg.welcome ? { author: socket.userName, text: cfg.welcome } : null;
      if (input.isPrivate !== undefined) {
        const was = room.isPrivate; room.isPrivate = !!input.isPrivate;
        if (room.isPrivate && !room.invite) room.invite = newInvite();
        if (!room.isPrivate) setPassword(room, '');
        if (room.isPrivate && !was) for (const id of io.sockets.adapter.rooms.get(room.slug) || []) { const so = io.sockets.sockets.get(id); if (so && so.userEmail) room.allowed.add(so.userEmail); }   // quem já está dentro continua entrando
      }
      if (room.isPrivate && input.password !== undefined) setPassword(room, String(input.password).slice(0, 30));
      persistRoom(room); broadcastState(room.slug); socket.emit('roomInvite', inviteInfo(room));
      // Alterações administrativas são refletidas no estado da sala, sem mensagens repetitivas no chat.
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
        ts.leave(currentRoom); syncRoomOccupancy(currentRoom); notifyNextWaiting(currentRoom);
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

  socket.on('videoEnded', (payload = {}) => {
    try {
      if (!currentRoom) return;
      const room = rooms.get(currentRoom);
      if (!room || !room.isPlaying) return;
      // Numa transmissão exclusiva, eventos de jogadores convidados não podem avançar a live.
      if ((room.addMode === 'owner' || room.musicMode === 'owner') &&
          (room.ownerEmail ? socket.userEmail !== room.ownerEmail : !socket.isAdmin)) return;
      const activeId = room.queue[room.currentIndex]?.id;
      const reportedId = payload && typeof payload.videoId === 'string' ? payload.videoId : null;
      // Não aceite pedidos sem identificação da faixa nem eventos de músicas anteriores.
      if (!reportedId || reportedId !== activeId) return;
      // O fim em UM player com erro não deve pular a faixa para todos os outros ouvintes.
      // O timer do servidor ainda avança naturalmente ao alcançar a duração.
      const duration = Number(room.queue[room.currentIndex]?.duration) || 180;
      if (room.listenerCount > 1 && !socket.isAdmin && getPosition(room) < duration - 7) return;
      advanceQueue(currentRoom);
    } catch (e) { console.error('Erro no videoEnded:', e.message); }
  });

  socket.on('reorderQueue', (newOrder) => {
    try {
      if (!currentRoom) { socket.emit('error', 'Você não está em uma sala'); return; }
      const isGlobalAdmin = userEmail && adminEmails.has(userEmail);
      if (!isGlobalAdmin && !socket.isAdmin) { socket.emit('error', 'Apenas admin pode reordenar'); return; }
      const room = rooms.get(currentRoom);
      if (!room || room.queue.length === 0) return;
      if ((room.addMode === 'owner' || room.musicMode === 'owner') &&
          (room.ownerEmail ? socket.userEmail !== room.ownerEmail : !socket.isAdmin)) return;
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
      if (!room || room !== currentRoom || !socket.userEmail || !socket.userName || !id || typeof id !== 'string') return;
      const roomData = rooms.get(room);
      if (!roomData) return;
      // Votações não podem retirar/reordenar uma playlist sob controle do criador.
      if (roomData.addMode === 'owner' || roomData.musicMode === 'owner') return;
      const index = roomData.queue.findIndex(t => t.id === id);
      if (index === -1) return;
      if (index === roomData.currentIndex) { socket.emit('error', 'Não é possível votar na música atual'); return; }
      const votes = getRoomVotes(room);
      if (!votes[id]) votes[id] = { up: [], down: [] };
      if (type !== 'up' && type !== 'down') return;
      const data = votes[id];
      const alreadySelected = (type === 'up' ? data.up : data.down).includes(socket.userName);
      const upIndex = data.up.indexOf(socket.userName);
      if (upIndex > -1) data.up.splice(upIndex, 1);
      const downIndex = data.down.indexOf(socket.userName);
      if (downIndex > -1) data.down.splice(downIndex, 1);
      // Clicking the currently selected option removes the vote; switching options is supported.
      if (!alreadySelected && type === 'up') {
        data.up.push(socket.userName);
        addPoints(socket.userEmail, 1, 'vote', room + ':' + id);
        roomData.totalVotesGiven = (roomData.totalVotesGiven || 0) + 1;
      } else if (!alreadySelected && type === 'down') {
        data.down.push(socket.userName);
      }
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
      if (roomData.votePriority && sf95.applyPriority(roomData,votes)) broadcastState(room);
    } catch (e) { console.error('Erro no voteSong:', e.message); }
  });

  // ===== TYPING INDICATOR =====
  // Cliente emite { room: <slug> } mas o servidor IGNORA por segurança
  // e usa o currentRoom do socket (evita spoofing de sala).
  socket.on('typing', () => {
    try {
      if (!currentRoom) return;
      // Não mostra "digitando" se o usuário está silenciado (evita ruído).
      const mu = sanActive(socket.userEmail, 'mute', currentRoom);
      if (mu) return;
      socket.to(currentRoom).emit('typing', { name: socket.userName });
    } catch (e) {}
  });

  socket.on('typingStop', () => {
    try {
      if (!currentRoom) return;
      socket.to(currentRoom).emit('typingStop', { name: socket.userName });
    } catch (e) {}
  });

  // ===== LEAVE ROOM (bug fix) =====
  // O cliente chama socket.emit('leaveRoom') ao clicar "Voltar" — mas o
  // servidor nunca escutava isso. Resultado: o listenerCount subia ao entrar
  // e NUNCA descia ao sair, só no disconnect (fechar aba). Isso quebrava:
  //   1. contagem de "ouvintes" no card da sala
  //   2. limite de maxListeners (usuários ficavam "presos" na contagem)
  //   3. notifyNextWaiting (fila de espera não era liberada)
  // Este handler corrige os três.
  socket.on('leaveRoom', () => {
    try {
      clearWaitingSocket(socket);
      if (!currentRoom) { socket.sfSocialRoom=null; return; }
      const room = rooms.get(currentRoom);
      const oldSlug = currentRoom;

      // 1) Sai do "canal" do Socket.IO
      socket.leave(oldSlug);

      // 2) Decrementa e propaga
      if (room) {
        syncRoomOccupancy(oldSlug);
        broadcastState(oldSlug);
        broadcastUsers(oldSlug);
        notifyNextWaiting(oldSlug);
      }

      // 3) Limpa estado do socket (mantém socket.userEmail para o admin seguir logado)
      currentRoom = null;
      socket.sfSocialRoom = null;
      socket.userName = null;
      socket.isAdmin = false;
      socket.isMod = false;
    } catch (e) {
      console.error('Erro no leaveRoom:', e.message);
    }
  });

  socket.on('disconnect', () => {
    clearWaitingSocket(socket);
    if (currentRoom&&rooms.has(currentRoom)) {
      syncRoomOccupancy(currentRoom);
      broadcastState(currentRoom);
      broadcastUsers(currentRoom);
      notifyNextWaiting(currentRoom);
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
