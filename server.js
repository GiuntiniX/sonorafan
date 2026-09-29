const express = require('express');
const http = require('http');
const https = require('https');
const { Server } = require('socket.io');
const path = require('path');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const admin = require('firebase-admin');

// ===== PROTEÇÃO GLOBAL =====
process.on('uncaughtException', (err) => { console.error('🚨 Erro não capturado:', err); });
process.on('unhandledRejection', (reason) => { console.error('🚨 Promise rejeitada:', reason); });

// ========== FIREBASE ==========
try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  console.log('🔥 Firebase conectado!');
} catch (e) { console.error('⚠️ Erro ao conectar Firebase:', e.message); }
const db = admin.firestore();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(cookieParser());

// ========== CONFIG ==========
const colors = ['#f59e0b', '#3b82f6', '#ef4444', '#22c55e', '#a855f7', '#ec4899', '#06b6d4', '#f97316', '#8b5cf6', '#14b8a6'];
const adminEmails = new Set(['admin@sonora.com']);
const settings = { maxQueue: 20, cooldown: 30, maxDuration: 600, maxListeners: 20 };
const DISLIKE_THRESHOLD = 10;
const MAX_SONGS_PER_USER = 3;
const SKIP_VOTE_THRESHOLD = 0.5;
const MIN_SKIP_VOTES = 3;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';

// ========== ESTADO ==========
const users = new Map();
const sessions = new Map();
const userFavorites = new Map();
const userPoints = new Map();
const rooms = new Map();
const roomLikes = new Map();
const roomVotes = new Map();
const waitingRooms = new Map();

// ========== HELPERS ==========
function getRoomLikes(slug) { if (!roomLikes.has(slug)) roomLikes.set(slug, {}); return roomLikes.get(slug); }
function getRoomVotes(slug) { if (!roomVotes.has(slug)) roomVotes.set(slug, {}); return roomVotes.get(slug); }

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
  };
}

// ========== FIREBASE HELPERS ==========
async function getUserFromFirestore(email) { try { const d = await db.collection('users').doc(email).get(); if (d.exists) return d.data(); } catch (e) {} return null; }
async function setUserInFirestore(email, data) { try { await db.collection('users').doc(email).set(data, { merge: true }); } catch (e) {} }
async function getFavoritesFromFirestore(email) { try { const d = await db.collection('favorites').doc(email).get(); if (d.exists) return d.data().items || []; } catch (e) {} return []; }
async function setFavoritesInFirestore(email, items) { try { await db.collection('favorites').doc(email).set({ items }); } catch (e) {} }
async function getPointsFromFirestore(email) { try { const d = await db.collection('points').doc(email).get(); if (d.exists) return d.data(); } catch (e) {} return { points: 0, badges: [] }; }
async function setPointsInFirestore(email, data) { try { await db.collection('points').doc(email).set(data); } catch (e) {} }

async function loadAllUsers() {
  try {
    const snapshot = await db.collection('users').get();
    snapshot.forEach(doc => users.set(doc.data().email, doc.data()));
    console.log(`✅ ${users.size} usuários carregados.`);
  } catch (e) {}
}
loadAllUsers();
rooms.set('lounge', createRoom('lounge', 'Lounge VibeChat', 'Sistema'));
console.log('✅ Sala inicial criada.');

// ========== AUXILIARES ==========
function getPosition(room) {
  const track = room.queue[room.currentIndex];
  if (!track) return 0;
  return Math.min((Date.now() - room.startedAt) / 1000, track.duration || 180);
}

function broadcastState(slug) {
  const room = rooms.get(slug);
  if (!room) return;
  io.to(slug).emit('roomState', {
    slug: room.slug, name: room.name, currentIndex: room.currentIndex,
    position: getPosition(room), votes: room.votes, queue: room.queue,
    waitingQueue: room.waitingQueue, admin: room.admin, isPlaying: room.isPlaying,
    history: room.history.slice(-10), radioMode: room.radioMode,
    pinnedMessage: room.pinnedMessage, listenerCount: room.listenerCount,
    maxListeners: settings.maxListeners, color: room.color,
    inviteCount: room.inviteCount, eventStartTime: room.eventStartTime,
  });
}

function broadcastUsers(slug) {
  io.in(slug).fetchSockets().then(sockets => {
    const userList = sockets.map(s => ({
      name: s.userName || 'Anônimo', color: s.userColor || '#888',
      isAdmin: s.isAdmin || false, avatar: s.userAvatar || '👤',
      points: userPoints.get(s.userEmail)?.points || 0,
      badges: userPoints.get(s.userEmail)?.badges || [],
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

function remapVotesAfterRemoval(slug, removedIdx) {
  const votes = getRoomVotes(slug);
  const newVotes = {};
  Object.keys(votes).forEach(k => {
    const oldIdx = parseInt(k, 10);
    if (oldIdx === removedIdx) return;
    if (oldIdx > removedIdx) newVotes[oldIdx - 1] = votes[k];
    else newVotes[oldIdx] = votes[k];
  });
  roomVotes.set(slug, newVotes);
  io.to(slug).emit('votesState', newVotes);
  return newVotes;
}

function advanceQueue(slug, force = false) {
  const room = rooms.get(slug);
  if (!room) return false;

  if (room.queue.length === 0 && room.waitingQueue.length === 0) {
    if (room.isPlaying) {
      room.isPlaying = false;
      addSystemMsg(slug, '🏁 Fila encerrada. Adicione músicas!');
      io.to(slug).emit('queueEmpty');
      broadcastState(slug);
    }
    return false;
  }

  if (!force && Date.now() - room.lastAdvanceAt < 2000) return false;
  room.lastAdvanceAt = Date.now();

  let removedIdx = -1;
  if (room.queue.length > 0) {
    removedIdx = room.currentIndex;
    const current = room.queue[removedIdx];
    if (current) {
      room.history.push(current);
      if (room.history.length > 50) room.history.shift();
      updateMostVoted(room, current);
    }
    room.queue.splice(removedIdx, 1);
  }

  while (room.queue.length === 0 && room.waitingQueue.length > 0) {
    const next = room.waitingQueue.shift();
    room.queue.push(next);
    addSystemMsg(slug, `📥 Entrou da espera: ${next.title} — ${next.artist}`);
  }

  room.currentIndex = 0;
  room.startedAt = Date.now();
  room.votes = { up: 0, down: 0 };
  room.skipVotes = new Set();

  if (removedIdx >= 0) remapVotesAfterRemoval(slug, removedIdx);

  if (room.queue.length > 0) {
    room.isPlaying = true;
    const next = room.queue[0];
    addSystemMsg(slug, `▶ ${next.title} — ${next.artist}`);
  } else if (room.radioMode) {
    startRadio(slug);
  } else {
    room.isPlaying = false;
    addSystemMsg(slug, '🏁 Fila encerrada. Adicione músicas!');
    io.to(slug).emit('queueEmpty');
  }

  broadcastState(slug);
  return true;
}

async function startRadio(slug) {
  const room = rooms.get(slug);
  if (!room || !room.radioMode) return;
  try {
    let query = room.radioGenre || 'pop';
    if (room.history.length > 0) { const last = room.history[room.history.length - 1]; if (last?.title) query = last.title + ' ' + (last.artist || ''); }
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Erro na busca');
    const data = await response.json();
    const items = data.items.map(item => ({ id: item.id.videoId, title: item.snippet.title, artist: item.snippet.channelTitle, duration: null, dj: '🎧 Rádio' }));
    for (const song of items) { if (room.queue.length >= settings.maxQueue) break; room.queue.push(song); }
    if (room.queue.length > 0) {
      room.isPlaying = true; room.currentIndex = 0;
      room.startedAt = Date.now(); room.lastAdvanceAt = Date.now();
      addSystemMsg(slug, `📻 Rádio: ▶ ${room.queue[0].title} — ${room.queue[0].artist}`);
      broadcastState(slug);
    }
  } catch (e) { console.error('Erro rádio:', e.message); addSystemMsg(slug, '⚠️ Erro no rádio.'); room.isPlaying = false; broadcastState(slug); }
}

setInterval(() => {
  for (const [slug, room] of rooms) {
    if (!room.isPlaying || room.queue.length === 0) continue;
    const track = room.queue[room.currentIndex];
    if (!track) continue;
    if (getPosition(room) >= (track.duration || 180) - 1) advanceQueue(slug);
  }
}, 2000);

function updateMostVoted(room, track) {
  const upVotes = room.votes?.up || 0;
  if (upVotes > 0) {
    const entry = room.mostVoted.find(t => t.id === track.id);
    if (entry) entry.votes += upVotes;
    else room.mostVoted.push({ id: track.id, title: track.title, artist: track.artist, votes: upVotes });
    room.mostVoted.sort((a, b) => b.votes - a.votes);
    if (room.mostVoted.length > 20) room.mostVoted.pop();
  }
}

async function sendDiscordWebhook(url, message) {
  if (!url) return;
  try { await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: message }) }); } catch (e) {}
}

// ========== ROTAS ==========
app.post('/api/signup', async (req, res) => {
  const { nome, email, senha, estilos } = req.body;
  if (!nome || nome.length < 2) return res.status(400).json({ error: 'Nome inválido' });
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'E-mail inválido' });
  if (!senha || senha.length < 6) return res.status(400).json({ error: 'Senha deve ter 6+ caracteres' });
  if (!estilos || estilos.length === 0) return res.status(400).json({ error: 'Escolha um estilo' });
  try {
    const existing = await db.collection('users').doc(email).get();
    if (existing.exists) return res.status(400).json({ error: 'E-mail já cadastrado' });
    const userData = { nome, email, estilos, avatar: '🎸', criadoEm: new Date(), theme: 'dark', fontSize: 16, colorblind: false, discordWebhook: null };
    await setUserInFirestore(email, userData);
    users.set(email, userData);
    await setPointsInFirestore(email, { points: 0, badges: [] });
    userPoints.set(email, { points: 0, badges: [] });
    await setFavoritesInFirestore(email, []);
    userFavorites.set(email, []);
    res.json({ success: true, nome, email });
  } catch (e) { res.status(500).json({ error: 'Erro: ' + e.message }); }
});

app.post('/api/login', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Preencha e-mail' });
  try {
    const userDoc = await db.collection('users').doc(email).get();
    if (!userDoc.exists) return res.status(401).json({ error: 'Usuário não encontrado' });
    const userData = userDoc.data();
    if (!users.has(email)) users.set(email, userData);
    const token = crypto.randomBytes(64).toString('hex');
    sessions.set(token, email);
    res.cookie('sessionToken', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'lax', path: '/' });
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

app.get('/api/rooms', (req, res) => {
  try {
    const list = Array.from(rooms.values()).map(r => ({
      slug: r.slug, name: r.name, listenerCount: r.listenerCount,
      queueLength: r.queue.length, isPlaying: r.isPlaying,
      currentTrack: r.queue[r.currentIndex] || null,
      radioMode: r.radioMode, color: r.color || '#7c3aed',
      inviteCount: r.inviteCount, eventStartTime: r.eventStartTime,
    }));
    res.json(list);
  } catch (e) { res.status(500).json({ error: 'Erro interno' }); }
});

app.post('/api/rooms', (req, res) => {
  const { name, adminName, color } = req.body;
  if (!name || name.trim().length < 2) return res.status(400).json({ error: 'Nome inválido' });
  const slug = name.trim().toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString(36);
  if (rooms.has(slug)) return res.status(400).json({ error: 'Sala já existe' });
  const room = createRoom(slug, name.trim(), adminName || 'Anônimo');
  if (color) room.color = color;
  rooms.set(slug, room);
  res.json({ slug, name: room.name });
});

app.get('/api/rooms/random', (req, res) => {
  const list = Array.from(rooms.values());
  if (list.length === 0) return res.status(404).json({ error: 'Nenhuma sala' });
  res.json({ slug: list[Math.floor(Math.random() * list.length)].slug });
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

app.post('/api/room/:slug/webhook', (req, res) => {
  const room = rooms.get(req.params.slug);
  if (!room) return res.status(404).json({ error: 'Sala não encontrada' });
  room.discordWebhook = req.body.webhookUrl || null;
  res.json({ success: true });
});

app.post('/api/room/:slug/event', (req, res) => {
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
  res.json(await getFavoritesFromFirestore(email));
});

app.post('/api/favorites', async (req, res) => {
  const token = req.cookies.sessionToken;
  if (!token) return res.status(401).json({ error: 'Não autenticado' });
  const email = sessions.get(token);
  if (!email) return res.status(401).json({ error: 'Sessão inválida' });
  const { videoId, title, artist } = req.body;
  if (!videoId) return res.status(400).json({ error: 'ID necessário' });
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
  let favs = await getFavoritesFromFirestore(email);
  favs = favs.filter(f => f.id !== req.params.id);
  await setFavoritesInFirestore(email, favs);
  userFavorites.set(email, favs);
  res.json({ success: true });
});

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

// ========== ADMIN ==========
app.get('/api/admin/stats', async (req, res) => {
  try {
    const snapshot = await db.collection('users').get();
    res.json({ totalUsers: snapshot.size, totalRooms: rooms.size, onlineUsers: (await io.fetchSockets()).length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/users', async (req, res) => {
  try {
    const snapshot = await db.collection('users').get();
    const list = [];
    snapshot.forEach(doc => list.push({ email: doc.id, nome: doc.data().nome, isAdmin: adminEmails.has(doc.id) }));
    res.json(list);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/promote', (req, res) => {
  if (!req.body.email) return res.status(400).json({ error: 'Email necessário' });
  adminEmails.add(req.body.email);
  res.json({ success: true });
});

app.post('/api/admin/delete-user', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email necessário' });
  try {
    await db.collection('users').doc(email).delete();
    await db.collection('favorites').doc(email).delete();
    await db.collection('points').doc(email).delete();
    users.delete(email); userPoints.delete(email); userFavorites.delete(email);
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
        broadcastState(roomSlug); broadcastUsers(roomSlug);
        return res.json({ success: true });
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
  io.fetchSockets().then(sockets => {
    for (const s of sockets) if (s.userEmail === email) { s.emit('banned', 'Você foi banido do VibeChat.'); s.disconnect(); }
  });
  res.json({ success: true });
});

app.post('/api/admin/remove-song', (req, res) => {
  const { roomSlug, index } = req.body;
  if (roomSlug === undefined || index === undefined) return res.status(400).json({ error: 'Dados incompletos' });
  const room = rooms.get(roomSlug);
  if (!room) return res.status(404).json({ error: 'Sala não encontrada' });
  if (index < 0 || index >= room.queue.length) return res.status(400).json({ error: 'Índice inválido' });
  const removed = room.queue.splice(index, 1)[0];
  if (index < room.currentIndex) room.currentIndex--;
  if (index === room.currentIndex) {
    room.currentIndex = 0; room.startedAt = Date.now(); room.lastAdvanceAt = 0;
    remapVotesAfterRemoval(roomSlug, index);
    advanceQueue(roomSlug, true);
  } else {
    remapVotesAfterRemoval(roomSlug, index);
    broadcastState(roomSlug);
  }
  addSystemMsg(roomSlug, `🗑️ "${removed.title}" removida pelo admin.`);
  res.json({ success: true });
});

app.post('/api/admin/clear-all-chats', (req, res) => {
  for (const [slug, room] of rooms) { room.chatHistory = []; roomLikes.set(slug, {}); io.to(slug).emit('chatCleared'); }
  res.json({ success: true });
});

app.post('/api/admin/clear-all-rooms', (req, res) => {
  for (const [slug, room] of rooms) {
    if (slug === 'lounge') continue;
    io.to(slug).emit('roomClosed', 'Sala removida pelo admin.');
    rooms.delete(slug); roomLikes.delete(slug); roomVotes.delete(slug); waitingRooms.delete(slug);
  }
  res.json({ success: true });
});

app.get('/api/admin/export-data', (req, res) => {
  res.json({
    users: Array.from(users.values()),
    rooms: Array.from(rooms.values()).map(r => ({ ...r, lastAddTime: undefined, skipVotes: undefined })),
    favorites: Array.from(userFavorites.entries()),
    points: Array.from(userPoints.entries()),
    settings,
  });
});

// ========== YOUTUBE ==========
app.get('/api/search-youtube', async (req, res) => {
  const query = req.query.q;
  if (!query || query.length < 2) return res.json({ items: [] });
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const items = data.items.map(item => ({ id: item.id.videoId, title: item.snippet.title, artist: item.snippet.channelTitle, thumb: item.snippet.thumbnails.default.url }));
    res.json({ items });
  } catch (e) { res.status(500).json({ error: 'Erro ao buscar: ' + e.message, items: [] }); }
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

app.get('/api/video-info', async (req, res) => {
  const id = String(req.query.id || '').trim();
  if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) return res.status(400).json({ error: 'ID inválido' });
  const info = { id, title: null, artist: null, duration: null };
  try {
    const raw = await fetchUrl(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
    const data = JSON.parse(raw); info.title = data.title || null; info.artist = data.author_name || null;
  } catch (e) {}
  try {
    const html = await fetchUrl(`https://www.youtube.com/watch?v=${id}`);
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (jsonLdMatch) {
      try { const j = JSON.parse(jsonLdMatch[1]); if (j.duration) { const m = j.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/); if (m) info.duration = (parseInt(m[1] || 0) * 3600) + (parseInt(m[2] || 0) * 60) + parseInt(m[3] || 0); } } catch (e) {}
    }
    if (!info.duration) {
      const pMatch = html.match(/var ytInitialPlayerResponse\s*=\s*({[\s\S]*?});/);
      if (pMatch) { try { const d = JSON.parse(pMatch[1]); if (d.videoDetails?.lengthSeconds) info.duration = parseInt(d.videoDetails.lengthSeconds, 10); } catch (e) {} }
    }
    if (!info.title) { const tMatch = html.match(/<title>([^<]+)<\/title>/); if (tMatch) info.title = tMatch[1].replace(/ - YouTube\s*$/, '').trim(); }
  } catch (e) {}
  if (!info.title) info.title = 'Vídeo do YouTube (ID: ' + id + ')';
  res.json(info);
});

// ========== SOCKET ==========
io.on('connection', (socket) => {
  let currentRoom = null;
  let userEmail = null;

  socket.on('joinRoom', ({ slug, name, avatar }) => {
    try {
      const room = rooms.get(slug);
      if (!room) { socket.emit('error', 'Sala não encontrada'); return; }
      if (room.bannedUsers.includes(name)) { socket.emit('error', 'Você foi banido'); return; }
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
      const email = tokenMatch ? sessions.get(tokenMatch[1]) : null;
      userEmail = email;
      socket.userEmail = email;
      const isGlobalAdmin = adminEmails.has(email);
      const isRoomAdmin = room.admin === name;
      socket.isAdmin = isGlobalAdmin || isRoomAdmin;
      if (isGlobalAdmin && !room.admin) room.admin = name;
      notifyNextWaiting(slug);

      socket.emit('likesState', getRoomLikes(slug));
      socket.emit('votesState', getRoomVotes(slug));
      socket.emit('roomState', {
        slug: room.slug, name: room.name, currentIndex: room.currentIndex,
        position: getPosition(room), votes: room.votes, queue: room.queue,
        waitingQueue: room.waitingQueue, admin: room.admin, isPlaying: room.isPlaying,
        history: room.history.slice(-10), radioMode: room.radioMode,
        pinnedMessage: room.pinnedMessage, listenerCount: room.listenerCount,
        maxListeners: settings.maxListeners, color: room.color,
        inviteCount: room.inviteCount, eventStartTime: room.eventStartTime,
      });
      socket.emit('chatHistory', room.chatHistory.slice(-150));
      socket.emit('isAdmin', socket.isAdmin);
      socket.emit('userPoints', userPoints.get(email) || { points: 0, badges: [] });
      broadcastUsers(slug);
    } catch (e) { console.error('Erro joinRoom:', e.message); socket.emit('error', 'Erro ao entrar.'); }
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
      if (!currentRoom || !text.trim()) return;
      const room = rooms.get(currentRoom);
      const parts = text.trim().split(' ');
      if (parts[0].startsWith('/')) { handleCommand(socket, parts[0].toLowerCase(), parts.slice(1), room); return; }
      const msg = { _id: Date.now().toString() + Math.random(), user: socket.userName, text: text.trim(), color: socket.userColor, isSystem: false, isAdmin: socket.isAdmin || false, avatar: socket.userAvatar || '👤', createdAt: new Date() };
      room.chatHistory.push(msg);
      if (room.chatHistory.length > 300) room.chatHistory.shift();
      io.to(currentRoom).emit('chat', msg);
    } catch (e) { console.error('Erro chat:', e.message); }
  });

  function handleCommand(socket, cmd, args, room) {
    const email = socket.userEmail;
    let reply = '';
    switch(cmd) {
      case '/stats': {
        let stats = '📊 Estatísticas:\n';
        const counts = {};
        room.queue.forEach(t => { const dj = t.dj || '?'; counts[dj] = (counts[dj] || 0) + 1; });
        Object.entries(counts).sort((a,b) => b[1] - a[1]).forEach(([u, c]) => { stats += `  ${u}: ${c}\n`; });
        stats += `Total: ${room.queue.length} | Histórico: ${room.history.length}`;
        socket.emit('chat', { _id: Date.now().toString() + Math.random(), user: 'Sistema', text: stats, color: '#888', isSystem: true, createdAt: new Date() });
        break;
      }
      case '/vote': {
        if (room.queue.length === 0) { reply = 'Nenhuma música na fila.'; break; }
        const votes = getRoomVotes(room.slug);
        if (!votes[room.currentIndex]) votes[room.currentIndex] = { up: [], down: [] };
        const data = votes[room.currentIndex];
        if (!data.up.includes(socket.userName)) {
          data.up.push(socket.userName);
          const di = data.down.indexOf(socket.userName); if (di > -1) data.down.splice(di, 1);
          addPoints(email, 1); reply = '👍 Votou na música atual!';
          io.to(currentRoom).emit('voteUpdate', { index: room.currentIndex, up: data.up, down: data.down });
          broadcastState(currentRoom);
        } else reply = 'Você já votou.';
        break;
      }
      case '/clear':
        if (!socket.isAdmin) { reply = 'Apenas admin.'; break; }
        room.chatHistory = []; roomLikes.set(currentRoom, {});
        io.to(currentRoom).emit('chatCleared'); addSystemMsg(currentRoom, '🧹 Chat limpo');
        reply = 'Chat limpo.';
        break;
      case '/me': {
        const p = userPoints.get(email) || { points: 0, badges: [] };
        reply = `👤 ${socket.userName} | Pontos: ${p.points} | Badges: ${p.badges.join(', ') || 'Nenhum'}`;
        break;
      }
      case '/history': {
        if (room.history.length === 0) { reply = 'Sem histórico.'; break; }
        let h = '📜 Histórico:\n';
        room.history.slice(-5).forEach((t, i) => { h += `  ${i+1}. ${t.title} — ${t.artist}\n`; });
        socket.emit('chat', { _id: Date.now().toString() + Math.random(), user: 'Sistema', text: h, color: '#888', isSystem: true, createdAt: new Date() });
        return;
      }
      default: reply = `Comando desconhecido: ${cmd}`;
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
    for (const [, s] of io.sockets.sockets) if (s.userEmail === email) s.emit('userPoints', p);
  }

  socket.on('videoEnded', () => {
    if (!currentRoom) return;
    advanceQueue(currentRoom, true);
  });

  socket.on('voteSkip', () => {
    try {
      if (!currentRoom) return;
      const room = rooms.get(currentRoom);
      if (room.queue.length === 0) return;
      if (socket.userName === room.admin || adminEmails.has(socket.userEmail)) {
        advanceQueue(currentRoom, true); addSystemMsg(currentRoom, `⏭️ ${socket.userName} pulou (admin)`); return;
      }
      if (room.skipVotes.has(socket.userName)) { socket.emit('error', 'Já votou.'); return; }
      room.skipVotes.add(socket.userName);
      const total = room.listenerCount || 1;
      const minVotes = Math.max(MIN_SKIP_VOTES, Math.ceil(total * SKIP_VOTE_THRESHOLD));
      const cur = room.skipVotes.size;
      io.to(currentRoom).emit('skipVoteUpdate', { votes: cur, needed: minVotes });
      addSystemMsg(currentRoom, `🗳️ ${socket.userName} votou pular (${cur}/${minVotes})`);
      if (cur >= minVotes) { addSystemMsg(currentRoom, `⏭️ Música pulada!`); advanceQueue(currentRoom, true); room.skipVotes = new Set(); }
    } catch (e) { console.error('Erro voteSkip:', e.message); }
  });

  socket.on('addSong', (song) => {
    try {
      if (!currentRoom) return;
      const room = rooms.get(currentRoom);
      const now = Date.now();
      const lastAdd = room.lastAddTime.get(socket.userName) || 0;
      if (now - lastAdd < 30000) { socket.emit('error', `Aguarde ${Math.ceil((30000 - (now - lastAdd)) / 1000)}s`); return; }
      const userSongs = room.queue.filter(t => t.dj === socket.userName).length + room.waitingQueue.filter(t => t.dj === socket.userName).length;
      if (userSongs >= MAX_SONGS_PER_USER) { socket.emit('error', `Máx. ${MAX_SONGS_PER_USER} músicas.`); return; }
      if (room.queue.length >= settings.maxQueue) {
        if (room.waitingQueue.length >= settings.maxQueue) { socket.emit('error', `Fila de espera cheia.`); return; }
        song.dj = socket.userName; room.waitingQueue.push(song);
        room.lastAddTime.set(socket.userName, now); addPoints(socket.userEmail, 1);
        io.to(currentRoom).emit('playSound', 'waiting');
        addSystemMsg(currentRoom, `⏳ "${song.title}" na espera (${room.waitingQueue.length})`);
        broadcastState(currentRoom);
        return;
      }
      if (song.duration && song.duration > settings.maxDuration) { socket.emit('error', `⛔ Muito longa (${Math.floor(song.duration/60)} min).`); return; }
      song.dj = socket.userName;
      room.queue.push(song);
      room.lastAddTime.set(socket.userName, now);
      addPoints(socket.userEmail, 2);
      room.totalSongsAdded = (room.totalSongsAdded || 0) + 1;
      if (!room.isPlaying && room.queue.length > 0) {
        room.isPlaying = true; room.currentIndex = 0;
        room.startedAt = Date.now(); room.lastAdvanceAt = 0;
        addSystemMsg(currentRoom, `▶ ${room.queue[0].title} — ${room.queue[0].artist}`);
      }
      broadcastState(currentRoom);
      if (room.discordWebhook) sendDiscordWebhook(room.discordWebhook, `🎵 **${song.title}** por ${socket.userName} em **${room.name}**`);
      const musicMsg = { _id: Date.now().toString() + Math.random(), user: socket.userName, color: socket.userColor, isSystem: false, isAdmin: socket.isAdmin || false, isMusic: true, musicTitle: song.title, musicArtist: song.artist, createdAt: new Date() };
      room.chatHistory.push(musicMsg);
      if (room.chatHistory.length > 300) room.chatHistory.shift();
      io.to(currentRoom).emit('chat', musicMsg);
    } catch (e) { console.error('❌ addSong:', e.message); socket.emit('error', 'Erro ao adicionar.'); }
  });

  socket.on('likeMessage', ({ messageId, room }) => {
    try {
      if (!room || !socket.userName) return;
      const likes = getRoomLikes(room);
      if (!likes[messageId]) likes[messageId] = { likes: 0, users: [] };
      const data = likes[messageId];
      const idx = data.users.indexOf(socket.userName);
      if (idx > -1) { data.users.splice(idx, 1); data.likes = Math.max(0, data.likes - 1); }
      else { data.users.push(socket.userName); data.likes++; addPoints(socket.userEmail, 1); io.to(room).emit('playSound', 'like'); }
      io.to(room).emit('likeUpdate', { messageId, likes: data.likes, users: data.users });
    } catch (e) { console.error('Erro like:', e.message); }
  });

  socket.on('videoDuration', ({ duration }) => {
    try {
      if (!currentRoom || !duration) return;
      const room = rooms.get(currentRoom);
      const track = room.queue[room.currentIndex];
      if (!track) return;
      track.duration = duration;
      if (duration > settings.maxDuration) {
        const removed = room.queue.splice(room.currentIndex, 1)[0];
        addSystemMsg(currentRoom, `⛔ "${removed.title}" removida (${Math.floor(duration/60)} min).`);
        remapVotesAfterRemoval(currentRoom, room.currentIndex);
        room.currentIndex = 0; room.startedAt = Date.now(); room.lastAdvanceAt = 0;
        advanceQueue(currentRoom, true);
        return;
      }
      broadcastState(currentRoom);
    } catch (e) { console.error('Erro videoDuration:', e.message); }
  });

  socket.on('reorderQueue', (newOrder) => {
    try {
      if (!currentRoom) return;
      const isGlobalAdmin = userEmail && adminEmails.has(userEmail);
      if (!isGlobalAdmin && !socket.isAdmin) { socket.emit('error', 'Só admin.'); return; }
      const room = rooms.get(currentRoom);
      if (!room || room.queue.length === 0) return;
      const currentId = room.queue[room.currentIndex]?.id;
      const oldQueue = [...room.queue];
      const newQueue = newOrder.map(id => oldQueue.find(t => t.id === id)).filter(Boolean);
      if (newQueue.length !== oldQueue.length) return;
      const oldVotes = getRoomVotes(currentRoom);
      const votesById = {};
      Object.keys(oldVotes).forEach(k => { const t = oldQueue[parseInt(k, 10)]; if (t) votesById[t.id] = oldVotes[k]; });
      room.queue = newQueue;
      room.currentIndex = Math.max(0, room.queue.findIndex(t => t.id === currentId));
      const nv = {};
      room.queue.forEach((t, i) => { if (votesById[t.id]) nv[i] = votesById[t.id]; });
      roomVotes.set(currentRoom, nv);
      io.to(currentRoom).emit('votesState', nv);
      broadcastState(currentRoom);
    } catch (e) { console.error('Erro reorder:', e.message); }
  });

  socket.on('voteSong', ({ index, type, room }) => {
    try {
      if (!room || !socket.userName) return;
      const roomData = rooms.get(room);
      if (!roomData) return;
      if (roomData.currentIndex === index) { socket.emit('error', 'Não pode votar na atual'); return; }
      if (index >= roomData.queue.length) { socket.emit('error', 'Música não encontrada'); return; }
      const votes = getRoomVotes(room);
      if (!votes[index]) votes[index] = { up: [], down: [] };
      const data = votes[index];
      const ui = data.up.indexOf(socket.userName); if (ui > -1) data.up.splice(ui, 1);
      const di = data.down.indexOf(socket.userName); if (di > -1) data.down.splice(di, 1);
      if (type === 'up') { data.up.push(socket.userName); addPoints(socket.userEmail, 1); roomData.totalVotesGiven = (roomData.totalVotesGiven || 0) + 1; }
      else if (type === 'down') data.down.push(socket.userName);
      if (data.down.length >= DISLIKE_THRESHOLD) {
        const removed = roomData.queue.splice(index, 1)[0];
        if (index < roomData.currentIndex) roomData.currentIndex--;
        remapVotesAfterRemoval(room, index);
        broadcastState(room);
        io.to(room).emit('voteUpdate', { index, up: data.up, down: data.down, removed: true });
        addSystemMsg(room, `👎 "${removed.title}" removida por votação!`);
        return;
      }
      io.to(room).emit('voteUpdate', { index, up: data.up, down: data.down });
      broadcastState(room);
    } catch (e) { console.error('Erro voteSong:', e.message); }
  });

  socket.on('disconnect', () => {
    if (currentRoom) {
      const room = rooms.get(currentRoom);
      if (room) {
        room.listenerCount = Math.max(0, room.listenerCount - 1);
        broadcastState(currentRoom); broadcastUsers(currentRoom); notifyNextWaiting(currentRoom);
      }
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
app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🎧 VibeChat → http://localhost:${PORT}`));
