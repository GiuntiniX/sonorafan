const express = require('express');
const http = require('http');
const https = require('https');
const { Server } = require('socket.io');
const path = require('path');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');

// ========== FIREBASE ADMIN ==========
const admin = require('firebase-admin');

let firestore = null;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    firestore = admin.firestore();
    console.log('✅ Firebase inicializado com sucesso');
  } catch (e) {
    console.error('❌ Erro ao inicializar Firebase:', e.message);
  }
} else {
  console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT não definida. Dados em memória serão perdidos ao reiniciar.');
}

// ========== APP SETUP ==========
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
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || 'AIzaSyB--8a_0tAr9Mf2mxy0oWq7rB0qyacci3I';

// ========== MAPAS EM MEMÓRIA (CACHE) ==========
const users = new Map();
const sessions = new Map();
const userFavorites = new Map();
const userPoints = new Map();
const userThemes = new Map();
const userSettings = new Map();

const rooms = new Map();
const roomLikes = new Map();
const roomVotes = new Map();
const waitingRooms = new Map();

// ========== TEMAS DE SALA ==========
const ROOM_THEMES = {
  default: { bg: '#050508', card: '#0f0f18', border: '#1e1e2e', accent: '#ff6b35', accent2: '#7c3aed' },
  '80s': { bg: '#1a0a2e', card: '#2d1b4e', border: '#6c2bd9', accent: '#ff00ff', accent2: '#00ffff' },
  mpb: { bg: '#0a1a0a', card: '#1a2a1a', border: '#2a5a2a', accent: '#f5a623', accent2: '#7cb342' },
  rock: { bg: '#0a0a0a', card: '#1a1a1a', border: '#3a3a3a', accent: '#e53935', accent2: '#ff6f00' },
  eletronica: { bg: '#050510', card: '#0a0a20', border: '#1a2a5a', accent: '#00e5ff', accent2: '#aa00ff' },
  sertanejo: { bg: '#1a0a05', card: '#2a150a', border: '#4a2a15', accent: '#ff8f00', accent2: '#bf360c' },
};

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
    history: [],
    skipVotes: new Set(),
    radioMode: false,
    radioGenre: 'pop',
    pinnedMessage: null,
    color: '#7c3aed',
    theme: 'default',
    discordWebhook: null,
    inviteCount: 0,
    eventStartTime: null,
    totalSongsAdded: 0,
    totalVotesGiven: 0,
    mostVoted: [],
  };
}

function getRoomLikes(slug) {
  if (!roomLikes.has(slug)) roomLikes.set(slug, {});
  return roomLikes.get(slug);
}

function getRoomVotes(slug) {
  if (!roomVotes.has(slug)) roomVotes.set(slug, {});
  return roomVotes.get(slug);
}

// ========== FUNÇÕES DE PERSISTÊNCIA FIREBASE ==========
async function loadUsersFromFirestore() {
  if (!firestore) return;
  try {
    const snapshot = await firestore.collection('users').get();
    snapshot.forEach(doc => {
      const data = doc.data();
      users.set(doc.id, data);
    });
    console.log(`✅ ${users.size} usuários carregados do Firestore`);
  } catch (e) {
    console.error('Erro ao carregar usuários:', e.message);
  }
}

async function loadRoomsFromFirestore() {
  if (!firestore) return;
  try {
    const snapshot = await firestore.collection('rooms').get();
    snapshot.forEach(doc => {
      const data = doc.data();
      const room = {
        slug: doc.id,
        name: data.name,
        admin: data.admin,
        queue: data.queue || [],
        waitingQueue: data.waitingQueue || [],
        currentIndex: data.currentIndex || 0,
        startedAt: data.startedAt || Date.now(),
        votes: data.votes || { up: 0, down: 0 },
        bannedUsers: data.bannedUsers || [],
        chatHistory: data.chatHistory || [],
        listenerCount: data.listenerCount || 0,
        lastAddTime: new Map(),
        isPlaying: data.isPlaying || false,
        lastAdvanceAt: data.lastAdvanceAt || 0,
        history: data.history || [],
        skipVotes: new Set(),
        radioMode: data.radioMode || false,
        radioGenre: data.radioGenre || 'pop',
        pinnedMessage: data.pinnedMessage || null,
        color: data.color || '#7c3aed',
        theme: data.theme || 'default',
        discordWebhook: data.discordWebhook || null,
        inviteCount: data.inviteCount || 0,
        eventStartTime: data.eventStartTime || null,
        totalSongsAdded: data.totalSongsAdded || 0,
        totalVotesGiven: data.totalVotesGiven || 0,
        mostVoted: data.mostVoted || [],
      };
      rooms.set(doc.id, room);
      if (data.likes) roomLikes.set(doc.id, data.likes);
      if (data.votesMap) roomVotes.set(doc.id, data.votesMap);
    });
    console.log(`✅ ${rooms.size} salas carregadas do Firestore`);
  } catch (e) {
    console.error('Erro ao carregar salas:', e.message);
  }
}

async function saveUserToFirestore(email) {
  if (!firestore) return;
  const user = users.get(email);
  if (!user) return;
  try {
    await firestore.collection('users').doc(email).set(user);
  } catch (e) {
    console.error('Erro ao salvar usuário:', e.message);
  }
}

async function saveRoomToFirestore(slug) {
  if (!firestore) return;
  const room = rooms.get(slug);
  if (!room) return;
  const data = {
    name: room.name,
    admin: room.admin,
    queue: room.queue,
    waitingQueue: room.waitingQueue,
    currentIndex: room.currentIndex,
    startedAt: room.startedAt,
    votes: room.votes,
    bannedUsers: room.bannedUsers,
    chatHistory: room.chatHistory,
    listenerCount: room.listenerCount,
    isPlaying: room.isPlaying,
    lastAdvanceAt: room.lastAdvanceAt,
    history: room.history,
    radioMode: room.radioMode,
    radioGenre: room.radioGenre,
    pinnedMessage: room.pinnedMessage,
    color: room.color,
    theme: room.theme,
    discordWebhook: room.discordWebhook,
    inviteCount: room.inviteCount,
    eventStartTime: room.eventStartTime,
    totalSongsAdded: room.totalSongsAdded,
    totalVotesGiven: room.totalVotesGiven,
    mostVoted: room.mostVoted,
    likes: roomLikes.get(slug) || {},
    votesMap: roomVotes.get(slug) || {},
  };
  try {
    await firestore.collection('rooms').doc(slug).set(data);
  } catch (e) {
    console.error('Erro ao salvar sala:', e.message);
  }
}

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
    theme: room.theme,
    inviteCount: room.inviteCount,
    eventStartTime: room.eventStartTime,
  });
}

function broadcastUsers(slug) {
  io.in(slug).fetchSockets().then(sockets => {
    const usersList = sockets.map(s => ({
      name: s.userName || 'Anônimo',
      color: s.userColor || '#888',
      isAdmin: s.isAdmin || false,
      avatar: s.userAvatar || '👤',
      points: userPoints.get(s.userEmail)?.points || 0,
      badges: userPoints.get(s.userEmail)?.badges || [],
    }));
    io.to(slug).emit('users', usersList);
  });
}

function addSystemMsg(slug, text) {
  const room = rooms.get(slug);
  if (!room) return;
  const msg = {
    _id: Date.now().toString() + Math.random(),
    user: 'Sistema', text, color: '#888',
    isSystem: true, createdAt: new Date()
  };
  room.chatHistory.push(msg);
  if (room.chatHistory.length > 300) room.chatHistory.shift();
  io.to(slug).emit('chat', msg);
  saveRoomToFirestore(slug);
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
  saveRoomToFirestore(room.slug);
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
        saveRoomToFirestore(slug);
        return true;
      }
    }
    return false;
  }
  if (Date.now() - room.lastAdvanceAt < 10000) return false;
  room.lastAdvanceAt = Date.now();

  const current = room.queue[room.currentIndex];
  if (current) {
    room.history.push(current);
    if (room.history.length > 50) room.history.shift();
    updateMostVoted(room, current);
  }

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

  const votes = getRoomVotes(slug);
  const newVotes = {};
  room.queue.forEach((_, i) => {
    if (votes[i + 1]) newVotes[i] = votes[i + 1];
  });
  roomVotes.set(slug, newVotes);

  autoShuffle(room);
  broadcastState(slug);
  saveRoomToFirestore(slug);

  if (room.queue.length > 0) {
    const next = room.queue[0];
    addSystemMsg(slug, `▶ ${next.title} — ${next.artist}`);
  } else {
    if (room.radioMode) {
      startRadio(slug);
    } else {
      room.isPlaying = false;
      broadcastState(slug);
      addSystemMsg(slug, '🏁 Fila encerrada. Adicione músicas!');
      io.to(slug).emit('queueEmpty');
      saveRoomToFirestore(slug);
    }
  }
  return true;
}

async function startRadio(slug) {
  const room = rooms.get(slug);
  if (!room || !room.radioMode) return;
  try {
    let query = room.radioGenre || 'pop';
    if (room.history.length > 0) {
      const last = room.history[room.history.length - 1];
      if (last && last.title) query = last.title + ' ' + (last.artist || '');
    }
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Erro na busca');
    const data = await response.json();
    const items = data.items.map(item => ({
      id: item.id.videoId,
      title: item.snippet.title,
      artist: item.snippet.channelTitle,
      duration: null,
    }));
    for (const song of items) {
      if (room.queue.length >= settings.maxQueue) break;
      song.dj = '🎧 Rádio';
      room.queue.push(song);
    }
    if (room.queue.length > 0) {
      room.isPlaying = true;
      room.currentIndex = 0;
      room.startedAt = Date.now();
      room.lastAdvanceAt = Date.now();
      const next = room.queue[0];
      addSystemMsg(slug, `📻 Rádio automático: ▶ ${next.title} — ${next.artist}`);
      broadcastState(slug);
      saveRoomToFirestore(slug);
    } else {
      addSystemMsg(slug, '⚠️ Não foi possível buscar músicas para o modo rádio.');
    }
  } catch (e) {
    console.error('Erro no modo rádio:', e.message);
    addSystemMsg(slug, '⚠️ Erro ao buscar músicas para o rádio.');
    room.isPlaying = false;
    broadcastState(slug);
    saveRoomToFirestore(slug);
  }
}

setInterval(() => {
  for (const [slug, room] of rooms) {
    if (!room.isPlaying || room.queue.length === 0) continue;
    const track = room.queue[room.currentIndex];
    if (!track) continue;
    const pos = getPosition(room);
    const duration = track.duration || 180;
    if (pos >= duration - 2) advanceQueue(slug);
  }
}, 2000);

function updateMostVoted(room, track) {
  const votes = getRoomVotes(room.slug);
  const upVotes = room.votes?.up || 0;
  const total = upVotes;
  if (total > 0) {
    const entry = room.mostVoted.find(t => t.id === track.id);
    if (entry) {
      entry.votes += total;
    } else {
      room.mostVoted.push({ id: track.id, title: track.title, artist: track.artist, votes: total });
    }
    room.mostVoted.sort((a, b) => b.votes - a.votes);
    if (room.mostVoted.length > 20) room.mostVoted.pop();
  }
}

async function sendDiscordWebhook(webhookUrl, message) {
  if (!webhookUrl) return;
  try {
    const payload = { content: message };
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) console.error('Erro ao enviar webhook Discord:', response.status);
  } catch (e) {
    console.error('Erro ao enviar webhook Discord:', e.message);
  }
}

// ========== API ==========
app.post('/api/signup', async (req, res) => {
  const { nome, email, senha, estilos } = req.body;
  if (!nome || nome.length < 2) return res.status(400).json({ error: 'Nome inválido' });
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'E-mail inválido' });
  if (!senha || senha.length < 6) return res.status(400).json({ error: 'Senha deve ter 6+ caracteres' });
  if (!estilos || estilos.length === 0) return res.status(400).json({ error: 'Escolha um estilo' });
  if (users.has(email)) return res.status(400).json({ error: 'E-mail já cadastrado' });

  const user = { nome, email, senha, estilos, avatar: '🎸', criadoEm: new Date() };
  users.set(email, user);
  userPoints.set(email, { points: 0, badges: [] });
  userThemes.set(email, 'dark');
  userSettings.set(email, { fontSize: 16, colorblind: false, discordWebhook: null });
  await saveUserToFirestore(email);

  res.json({ success: true, nome, email });
});

app.post('/api/login', (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ error: 'Preencha e-mail e senha' });
  const user = users.get(email);
  if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });
  if (user.senha !== senha) return res.status(401).json({ error: 'Senha incorreta' });

  const token = crypto.randomBytes(64).toString('hex');
  sessions.set(token, email);
  res.cookie('sessionToken', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'lax', path: '/' });
  const { senha: _, ...userData } = user;
  const points = userPoints.get(email) || { points: 0, badges: [] };
  const theme = userThemes.get(email) || 'dark';
  const settings = userSettings.get(email) || { fontSize: 16, colorblind: false, discordWebhook: null };
  res.json({ success: true, user: { ...userData, points: points.points, badges: points.badges, theme, ...settings } });
});

app.post('/api/logout', (req, res) => {
  const token = req.cookies.sessionToken;
  if (token) sessions.delete(token);
  res.clearCookie('sessionToken');
  res.json({ success: true });
});

app.get('/api/me', (req, res) => {
  const token = req.cookies.sessionToken;
  if (!token) return res.status(401).json({ error: 'Não autenticado' });
  const email = sessions.get(token);
  if (!email) return res.status(401).json({ error: 'Sessão inválida' });
  const user = users.get(email);
  if (!user) { sessions.delete(token); return res.status(401).json({ error: 'Usuário não encontrado' }); }
  const { senha: _, ...userData } = user;
  const points = userPoints.get(email) || { points: 0, badges: [] };
  const theme = userThemes.get(email) || 'dark';
  const settings = userSettings.get(email) || { fontSize: 16, colorblind: false, discordWebhook: null };
  res.json({ success: true, user: { ...userData, points: points.points, badges: points.badges, theme, ...settings } });
});

app.post('/api/update-avatar', async (req, res) => {
  const token = req.cookies.sessionToken;
  if (!token) return res.status(401).json({ error: 'Não autenticado' });
  const email = sessions.get(token);
  if (!email) return res.status(401).json({ error: 'Sessão inválida' });
  const { avatar } = req.body;
  if (!avatar) return res.status(400).json({ error: 'Avatar obrigatório' });
  const user = users.get(email);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  user.avatar = avatar;
  await saveUserToFirestore(email);
  res.json({ success: true, avatar });
});

app.post('/api/update-theme', async (req, res) => {
  const token = req.cookies.sessionToken;
  if (!token) return res.status(401).json({ error: 'Não autenticado' });
  const email = sessions.get(token);
  if (!email) return res.status(401).json({ error: 'Sessão inválida' });
  const { theme } = req.body;
  if (!theme) return res.status(400).json({ error: 'Tema obrigatório' });
  userThemes.set(email, theme);
  res.json({ success: true });
});

app.post('/api/update-settings', async (req, res) => {
  const token = req.cookies.sessionToken;
  if (!token) return res.status(401).json({ error: 'Não autenticado' });
  const email = sessions.get(token);
  if (!email) return res.status(401).json({ error: 'Sessão inválida' });
  const { fontSize, colorblind, discordWebhook } = req.body;
  const settings = userSettings.get(email) || {};
  if (fontSize) settings.fontSize = fontSize;
  if (colorblind !== undefined) settings.colorblind = colorblind;
  if (discordWebhook !== undefined) settings.discordWebhook = discordWebhook;
  userSettings.set(email, settings);
  res.json({ success: true });
});

function getUserFavorites(email) {
  if (!userFavorites.has(email)) userFavorites.set(email, []);
  return userFavorites.get(email);
}

app.get('/api/favorites', (req, res) => {
  const token = req.cookies.sessionToken;
  if (!token) return res.status(401).json({ error: 'Não autenticado' });
  const email = sessions.get(token);
  if (!email) return res.status(401).json({ error: 'Sessão inválida' });
  res.json(getUserFavorites(email));
});

app.post('/api/favorites', async (req, res) => {
  const token = req.cookies.sessionToken;
  if (!token) return res.status(401).json({ error: 'Não autenticado' });
  const email = sessions.get(token);
  if (!email) return res.status(401).json({ error: 'Sessão inválida' });
  const { videoId, title, artist } = req.body;
  if (!videoId) return res.status(400).json({ error: 'ID do vídeo obrigatório' });
  const favs = getUserFavorites(email);
  if (!favs.find(f => f.id === videoId)) favs.push({ id: videoId, title, artist });
  const user = users.get(email);
  if (user) {
    user.favorites = favs;
    await saveUserToFirestore(email);
  }
  res.json({ success: true, favorites: favs });
});

app.delete('/api/favorites/:videoId', async (req, res) => {
  const token = req.cookies.sessionToken;
  if (!token) return res.status(401).json({ error: 'Não autenticado' });
  const email = sessions.get(token);
  if (!email) return res.status(401).json({ error: 'Sessão inválida' });
  const videoId = req.params.videoId;
  const favs = getUserFavorites(email);
  const idx = favs.findIndex(f => f.id === videoId);
  if (idx !== -1) favs.splice(idx, 1);
  const user = users.get(email);
  if (user) {
    user.favorites = favs;
    await saveUserToFirestore(email);
  }
  res.json({ success: true, favorites: favs });
});

app.get('/api/rooms', (req, res) => {
  const list = Array.from(rooms.values()).map(r => ({
    slug: r.slug, name: r.name, listenerCount: r.listenerCount,
    queueLength: r.queue.length, isPlaying: r.isPlaying,
    currentTrack: r.queue[r.currentIndex] || null,
    radioMode: r.radioMode,
    color: r.color || '#7c3aed',
    theme: r.theme || 'default',
    inviteCount: r.inviteCount,
    eventStartTime: r.eventStartTime,
  }));
  res.json(list);
});

app.get('/api/room/:slug/queue', (req, res) => {
  const room = rooms.get(req.params.slug);
  if (!room) return res.status(404).json({ error: 'Sala não encontrada' });
  res.json({ queue: room.queue, waitingQueue: room.waitingQueue, currentIndex: room.currentIndex });
});

app.get('/api/rooms/random', (req, res) => {
  const list = Array.from(rooms.values());
  if (list.length === 0) return res.json({ slug: null });
  const sorted = list.sort((a, b) => b.listenerCount - a.listenerCount);
  res.json({ slug: sorted[0].slug });
});

app.post('/api/rooms', async (req, res) => {
  const { name, adminName, color, theme } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome obrigatório' });
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36).slice(-4);
  const room = createRoom(slug, name, adminName || null);
  if (color) room.color = color;
  if (theme && ROOM_THEMES[theme]) room.theme = theme;
  rooms.set(slug, room);
  await saveRoomToFirestore(slug);
  res.json({ slug, name });
});

app.post('/api/room/:slug/invite', (req, res) => {
  const room = rooms.get(req.params.slug);
  if (!room) return res.status(404).json({ error: 'Sala não encontrada' });
  room.inviteCount = (room.inviteCount || 0) + 1;
  saveRoomToFirestore(req.params.slug);
  res.json({ inviteCount: room.inviteCount });
});

app.post('/api/room/:slug/webhook', async (req, res) => {
  const room = rooms.get(req.params.slug);
  if (!room) return res.status(404).json({ error: 'Sala não encontrada' });
  const { webhookUrl } = req.body;
  room.discordWebhook = webhookUrl;
  await saveRoomToFirestore(req.params.slug);
  res.json({ success: true });
});

app.post('/api/room/:slug/event', async (req, res) => {
  const room = rooms.get(req.params.slug);
  if (!room) return res.status(404).json({ error: 'Sala não encontrada' });
  const { startTime } = req.body;
  room.eventStartTime = startTime ? parseInt(startTime) : null;
  broadcastState(req.params.slug);
  await saveRoomToFirestore(req.params.slug);
  res.json({ success: true });
});

app.get('/api/room/:slug/stats', (req, res) => {
  const room = rooms.get(req.params.slug);
  if (!room) return res.status(404).json({ error: 'Sala não encontrada' });
  const stats = {
    totalSongsAdded: room.totalSongsAdded || 0,
    totalVotesGiven: room.totalVotesGiven || 0,
    mostVoted: room.mostVoted.slice(0, 10),
    queueLength: room.queue.length,
    waitingQueueLength: room.waitingQueue.length,
    listenerCount: room.listenerCount,
    historyCount: room.history.length,
  };
  res.json(stats);
});

app.get('/api/search-youtube', async (req, res) => {
  const query = req.query.q;
  if (!query || query.length < 2) return res.json({ items: [] });
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }
    const data = await response.json();
    const items = data.items.map(item => ({
      id: item.id.videoId,
      title: item.snippet.title,
      artist: item.snippet.channelTitle,
      thumb: item.snippet.thumbnails.default.url,
    }));
    res.json({ items });
  } catch (e) {
    console.error('Erro na busca do YouTube:', e.message);
    res.status(500).json({ error: 'Erro ao buscar vídeos: ' + e.message, items: [] });
  }
});

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 8000,
    }, (res) => {
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode)); }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { data += chunk; if (data.length > 4e6) req.destroy(); });
      res.on('end', () => resolve(data));
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

app.get('/api/video-info', async (req, res) => {
  const id = String(req.query.id || '').trim();
  if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) {
    return res.status(400).json({ error: 'ID inválido' });
  }
  const info = { id, title: null, artist: null, duration: null };
  try {
    const raw = await fetchUrl(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
    const data = JSON.parse(raw);
    info.title = data.title || null;
    info.artist = data.author_name || null;
  } catch (e) {}
  try {
    const html = await fetchUrl(`https://www.youtube.com/watch?v=${id}`);
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (jsonLdMatch) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]);
        if (jsonLd.duration) {
          const durStr = jsonLd.duration;
          const match = durStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
          if (match) {
            const hours = parseInt(match[1] || 0);
            const minutes = parseInt(match[2] || 0);
            const seconds = parseInt(match[3] || 0);
            info.duration = hours * 3600 + minutes * 60 + seconds;
          }
        }
      } catch (e) {}
    }
    if (!info.duration) {
      const playerResponseMatch = html.match(/var ytInitialPlayerResponse\s*=\s*({[\s\S]*?});/);
      if (playerResponseMatch) {
        try {
          const data = JSON.parse(playerResponseMatch[1]);
          if (data.videoDetails && data.videoDetails.lengthSeconds) {
            info.duration = parseInt(data.videoDetails.lengthSeconds, 10);
          }
        } catch (e) {}
      }
    }
    if (!info.duration) {
      const regexMatch = html.match(/"lengthSeconds":"?(\d+)"?/);
      if (regexMatch) {
        info.duration = parseInt(regexMatch[1], 10);
      }
    }
    if (!info.title) {
      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      if (titleMatch) {
        info.title = titleMatch[1].replace(/ - YouTube\s*$/, '').trim();
      }
    }
  } catch (e) {}
  if (!info.title) info.title = 'Vídeo do YouTube (ID: ' + id + ')';
  res.json(info);
});

function isAdmin(req, res, next) {
  const token = req.cookies.sessionToken;
  if (!token) return res.status(401).json({ error: 'Não autenticado' });
  const email = sessions.get(token);
  if (!email) return res.status(401).json({ error: 'Sessão inválida' });
  if (!adminEmails.has(email)) return res.status(403).json({ error: 'Acesso negado' });
  req.adminEmail = email;
  next();
}

app.get('/api/admin/stats', isAdmin, (req, res) => {
  let totalSongs = 0, totalRooms = rooms.size, totalUsers = users.size;
  let onlineUsers = io.sockets.sockets.size;
  for (const [slug, room] of rooms) totalSongs += room.queue.length;
  res.json({ totalUsers, totalRooms, onlineUsers, totalSongs });
});

app.get('/api/admin/users', isAdmin, (req, res) => {
  const list = Array.from(users.values()).map(u => ({ ...u, senha: undefined, isAdmin: adminEmails.has(u.email) }));
  res.json(list);
});

app.post('/api/admin/promote', isAdmin, async (req, res) => {
  const { email } = req.body;
  if (!email || !users.has(email)) return res.status(404).json({ error: 'Usuário não encontrado' });
  adminEmails.add(email);
  res.json({ success: true });
});

app.post('/api/admin/delete-user', isAdmin, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'E-mail obrigatório' });
  if (email === 'admin@sonora.com') return res.status(400).json({ error: 'Não pode deletar o super admin' });
  if (!users.has(email)) return res.status(404).json({ error: 'Usuário não encontrado' });
  users.delete(email);
  adminEmails.delete(email);
  userPoints.delete(email);
  userThemes.delete(email);
  userSettings.delete(email);
  for (const [token, storedEmail] of sessions) {
    if (storedEmail === email) sessions.delete(token);
  }
  for (const [socketId, socket] of io.sockets.sockets) {
    if (socket.userEmail === email) {
      socket.emit('kicked', 'Sua conta foi removida pelo administrador.');
      socket.disconnect(true);
    }
  }
  io.emit('adminUsersUpdated');
  if (firestore) {
    await firestore.collection('users').doc(email).delete();
  }
  res.json({ success: true });
});

app.post('/api/admin/kick-user', isAdmin, (req, res) => {
  const { email, roomSlug } = req.body;
  if (!email) return res.status(400).json({ error: 'E-mail obrigatório' });
  const room = rooms.get(roomSlug);
  if (!room) return res.status(404).json({ error: 'Sala não encontrada' });
  let kicked = false;
  for (const [socketId, socket] of io.sockets.sockets) {
    if (socket.userEmail === email && socket.currentRoom === roomSlug) {
      socket.emit('kicked', `Você foi expulso da sala ${room.name} pelo administrador.`);
      socket.leave(roomSlug);
      socket.currentRoom = null;
      kicked = true;
    }
  }
  if (kicked) {
    broadcastUsers(roomSlug);
    addSystemMsg(roomSlug, `👢 ${email} foi expulso da sala pelo admin.`);
    io.emit('adminUsersUpdated');
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Usuário não encontrado na sala' });
  }
});

app.post('/api/admin/ban-user', isAdmin, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'E-mail obrigatório' });
  const user = users.get(email);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  const userName = user.nome;
  for (const [slug, room] of rooms) {
    if (!room.bannedUsers.includes(userName)) {
      room.bannedUsers.push(userName);
      await saveRoomToFirestore(slug);
    }
  }
  for (const [socketId, socket] of io.sockets.sockets) {
    if (socket.userEmail === email) {
      socket.emit('banned', 'Você foi banido globalmente pelo administrador.');
      socket.disconnect(true);
    }
  }
  io.emit('adminUsersUpdated');
  res.json({ success: true });
});

app.post('/api/admin/clear-all-chats', isAdmin, async (req, res) => {
  for (const [slug, room] of rooms) { 
    room.chatHistory = [];
    roomLikes.set(slug, {});
    roomVotes.set(slug, {});
    io.to(slug).emit('chatCleared');
    await saveRoomToFirestore(slug);
  }
  res.json({ success: true });
});

app.post('/api/admin/clear-all-rooms', isAdmin, async (req, res) => {
  for (const [slug, room] of rooms) {
    room.queue = [];
    room.waitingQueue = [];
    room.currentIndex = 0;
    room.isPlaying = false;
    room.history = [];
    room.skipVotes = new Set();
    roomLikes.set(slug, {});
    roomVotes.set(slug, {});
    broadcastState(slug);
    io.to(slug).emit('queueEmpty');
    await saveRoomToFirestore(slug);
  }
  res.json({ success: true });
});

app.get('/api/admin/export-data', isAdmin, (req, res) => {
  const data = {
    exportedAt: new Date().toISOString(),
    users: Array.from(users.values()).map(u => ({ ...u, senha: undefined })),
    admins: Array.from(adminEmails),
    rooms: Array.from(rooms.values()).map(r => ({
      slug: r.slug, name: r.name, admin: r.admin,
      queue: r.queue, waitingQueue: r.waitingQueue,
      chatHistory: r.chatHistory.slice(-50),
      history: r.history.slice(-20),
      listenerCount: r.listenerCount, isPlaying: r.isPlaying,
      radioMode: r.radioMode, pinnedMessage: r.pinnedMessage,
      theme: r.theme, inviteCount: r.inviteCount,
      eventStartTime: r.eventStartTime,
      mostVoted: r.mostVoted,
    })),
    settings
  };
  res.json(data);
});

app.post('/api/admin/remove-song', isAdmin, async (req, res) => {
  const { roomSlug, index } = req.body;
  if (!roomSlug || index === undefined) return res.status(400).json({ error: 'Parâmetros inválidos' });
  const room = rooms.get(roomSlug);
  if (!room) return res.status(404).json({ error: 'Sala não encontrada' });
  if (index < 0 || index >= room.queue.length) return res.status(400).json({ error: 'Índice inválido' });
  if (index === room.currentIndex) return res.status(400).json({ error: 'Não é possível remover a música atual' });
  const track = room.queue[index];
  room.queue.splice(index, 1);
  if (index < room.currentIndex) room.currentIndex--;
  const votes = getRoomVotes(roomSlug);
  const newVotes = {};
  room.queue.forEach((_, i) => {
    if (votes[i + 1]) newVotes[i] = votes[i + 1];
  });
  roomVotes.set(roomSlug, newVotes);
  autoShuffle(room);
  broadcastState(roomSlug);
  addSystemMsg(roomSlug, `🗑️ Admin removeu "${track.title}"`);
  await saveRoomToFirestore(roomSlug);
  res.json({ success: true });
});

app.get('/invite/:slug', (req, res) => {
  const room = rooms.get(req.params.slug);
  if (!room) return res.status(404).send('Sala não encontrada');
  room.inviteCount = (room.inviteCount || 0) + 1;
  saveRoomToFirestore(req.params.slug);
  res.redirect('/?room=' + req.params.slug);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ========== SOCKET.IO ==========
io.on('connection', (socket) => {
  let currentRoom = null;
  let userEmail = null;

  socket.on('joinRoom', ({ slug, name, avatar }) => {
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

    const likes = getRoomLikes(slug);
    socket.emit('likesState', likes);
    const votes = getRoomVotes(slug);
    socket.emit('votesState', votes);

    socket.emit('roomState', {
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
      theme: room.theme,
      inviteCount: room.inviteCount,
      eventStartTime: room.eventStartTime,
    });
    socket.emit('chatHistory', room.chatHistory.slice(-150));
    socket.emit('isAdmin', socket.isAdmin);
    const points = userPoints.get(email) || { points: 0, badges: [] };
    socket.emit('userPoints', points);
    broadcastUsers(slug);
  });

  function notifyNextWaiting(slug) {
    const waiting = waitingRooms.get(slug) || [];
    if (waiting.length === 0) return;
    const room = rooms.get(slug);
    if (!room) return;
    if (room.listenerCount < settings.maxListeners) {
      const nextSocket = waiting.shift();
      if (nextSocket) {
        nextSocket.emit('waitingRoom', { position: 0, maxListeners: settings.maxListeners, canJoin: true });
      }
    }
  }

  socket.on('chat', ({ text }) => {
    if (!currentRoom || !text.trim()) return;
    const room = rooms.get(currentRoom);
    const parts = text.trim().split(' ');
    const command = parts[0].toLowerCase();
    if (command.startsWith('/')) {
      handleCommand(socket, command, parts.slice(1), room);
      return;
    }
    const msg = {
      _id: Date.now().toString() + Math.random(),
      user: socket.userName, text: text.trim(),
      color: socket.userColor, isSystem: false,
      isAdmin: socket.isAdmin || false,
      avatar: socket.userAvatar || '👤',
      createdAt: new Date()
    };
    room.chatHistory.push(msg);
    if (room.chatHistory.length > 300) room.chatHistory.shift();
    io.to(currentRoom).emit('chat', msg);
    saveRoomToFirestore(currentRoom);
  });

  function handleCommand(socket, cmd, args, room) {
    const email = socket.userEmail;
    let reply = '';
    switch(cmd) {
      case '/stats':
        let stats = '📊 Estatísticas da sala:\n';
        const userCounts = {};
        room.queue.forEach(t => {
          const dj = t.dj || 'Desconhecido';
          userCounts[dj] = (userCounts[dj] || 0) + 1;
        });
        const sorted = Object.entries(userCounts).sort((a,b) => b[1] - a[1]);
        sorted.forEach(([user, count]) => {
          stats += `  ${user}: ${count} música(s)\n`;
        });
        stats += `Total: ${room.queue.length} músicas | Histórico: ${room.history.length}`;
        socket.emit('chat', { 
          _id: Date.now().toString() + Math.random(),
          user: 'Sistema', text: stats, color: '#888', isSystem: true, createdAt: new Date() 
        });
        break;
      case '/vote':
        if (room.queue.length === 0) { reply = 'Nenhuma música na fila.'; break; }
        const track = room.queue[room.currentIndex];
        if (!track) { reply = 'Nenhuma música tocando.'; break; }
        const votes = getRoomVotes(room.slug);
        if (!votes[room.currentIndex]) votes[room.currentIndex] = { up: [], down: [] };
        const data = votes[room.currentIndex];
        if (!data.up.includes(socket.userName)) {
          data.up.push(socket.userName);
          const downIdx = data.down.indexOf(socket.userName);
          if (downIdx > -1) data.down.splice(downIdx, 1);
          addPoints(email, 1);
          reply = '👍 Você votou na música atual!';
          io.to(currentRoom).emit('voteUpdate', { index: room.currentIndex, up: data.up, down: data.down });
          broadcastState(currentRoom);
          saveRoomToFirestore(currentRoom);
        } else {
          reply = 'Você já votou nessa música.';
        }
        break;
      case '/clear':
        if (!socket.isAdmin) { reply = 'Apenas admin pode limpar o chat.'; break; }
        room.chatHistory = [];
        roomLikes.set(currentRoom, {});
        io.to(currentRoom).emit('chatCleared');
        addSystemMsg(currentRoom, '🧹 Chat limpo pelo admin');
        saveRoomToFirestore(currentRoom);
        reply = 'Chat limpo.';
        break;
      case '/me':
        const p = userPoints.get(email) || { points: 0, badges: [] };
        reply = `👤 ${socket.userName} | Pontos: ${p.points} | Badges: ${p.badges.join(', ') || 'Nenhum'}`;
        break;
      case '/history':
        if (room.history.length === 0) { reply = 'Nenhuma música no histórico.'; break; }
        let hist = '📜 Histórico:\n';
        room.history.slice(-5).forEach((t, i) => {
          hist += `  ${i+1}. ${t.title} — ${t.artist}\n`;
        });
        socket.emit('chat', { 
          _id: Date.now().toString() + Math.random(),
          user: 'Sistema', text: hist, color: '#888', isSystem: true, createdAt: new Date() 
        });
        return;
      default:
        reply = `Comando desconhecido: ${cmd}. Use /stats, /vote, /clear (admin), /me, /history`;
    }
    if (reply) {
      socket.emit('chat', { 
        _id: Date.now().toString() + Math.random(),
        user: 'Sistema', text: reply, color: '#888', isSystem: true, createdAt: new Date() 
      });
    }
  }

  function addPoints(email, amount) {
    if (!email) return;
    const p = userPoints.get(email);
    if (!p) return;
    p.points += amount;
    if (p.points >= 10 && !p.badges.includes('DJ Iniciante')) p.badges.push('DJ Iniciante');
    if (p.points >= 50 && !p.badges.includes('DJ Expert')) p.badges.push('DJ Expert');
    if (p.points >= 100 && !p.badges.includes('DJ Lendário')) p.badges.push('DJ Lendário');
    userPoints.set(email, p);
    for (const [id, s] of io.sockets.sockets) {
      if (s.userEmail === email) s.emit('userPoints', p);
    }
    const user = users.get(email);
    if (user) {
      user.points = p.points;
      user.badges = p.badges;
      saveUserToFirestore(email);
    }
  }

  socket.on('voteSkip', () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (room.queue.length === 0) return;

    if (socket.userName === room.admin || adminEmails.has(socket.userEmail)) {
      advanceQueue(currentRoom);
      addSystemMsg(currentRoom, `⏭️ ${socket.userName} pulou a música (admin)`);
      saveRoomToFirestore(currentRoom);
      return;
    }

    if (room.skipVotes.has(socket.userName)) {
      socket.emit('error', 'Você já votou para pular.');
      return;
    }

    room.skipVotes.add(socket.userName);

    const totalListeners = room.listenerCount || 1;
    const minVotes = Math.max(MIN_SKIP_VOTES, Math.ceil(totalListeners * SKIP_VOTE_THRESHOLD));
    const currentVotes = room.skipVotes.size;

    io.to(currentRoom).emit('skipVoteUpdate', { votes: currentVotes, needed: minVotes });
    addSystemMsg(currentRoom, `🗳️ ${socket.userName} votou para pular (${currentVotes}/${minVotes})`);

    if (currentVotes >= minVotes) {
      addSystemMsg(currentRoom, `⏭️ Música pulada por votação! (${currentVotes} votos)`);
      advanceQueue(currentRoom);
      room.skipVotes = new Set();
      saveRoomToFirestore(currentRoom);
    }
  });

  socket.on('toggleRadio', (enabled) => {
    if (!currentRoom || !socket.isAdmin) {
      socket.emit('error', 'Apenas admin pode controlar o modo rádio');
      return;
    }
    const room = rooms.get(currentRoom);
    room.radioMode = enabled;
    if (enabled && room.queue.length === 0 && !room.isPlaying) {
      startRadio(currentRoom);
    }
    broadcastState(currentRoom);
    addSystemMsg(currentRoom, `${enabled ? '📻 Modo rádio ATIVADO' : '📻 Modo rádio DESATIVADO'} por ${socket.userName}`);
    saveRoomToFirestore(currentRoom);
  });

  socket.on('setRadioGenre', (genre) => {
    if (!currentRoom || !socket.isAdmin) {
      socket.emit('error', 'Apenas admin');
      return;
    }
    const room = rooms.get(currentRoom);
    room.radioGenre = genre;
    addSystemMsg(currentRoom, `🎵 Gênero do rádio alterado para "${genre}" por ${socket.userName}`);
    saveRoomToFirestore(currentRoom);
  });

  socket.on('setPinnedMessage', ({ text }) => {
    if (!currentRoom || !socket.isAdmin) {
      socket.emit('error', 'Apenas admin pode fixar mensagem');
      return;
    }
    const room = rooms.get(currentRoom);
    room.pinnedMessage = {
      text: text.trim(),
      author: socket.userName,
      createdAt: new Date()
    };
    broadcastState(currentRoom);
    addSystemMsg(currentRoom, `📌 Mensagem fixada por ${socket.userName}: "${text}"`);
    saveRoomToFirestore(currentRoom);
  });

  socket.on('removePinnedMessage', () => {
    if (!currentRoom || !socket.isAdmin) {
      socket.emit('error', 'Apenas admin pode remover mensagem fixada');
      return;
    }
    const room = rooms.get(currentRoom);
    room.pinnedMessage = null;
    broadcastState(currentRoom);
    addSystemMsg(currentRoom, `📌 Mensagem fixada removida por ${socket.userName}`);
    saveRoomToFirestore(currentRoom);
  });

  socket.on('addSong', (song) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    const now = Date.now();
    const lastAdd = room.lastAddTime.get(socket.userName) || 0;
    if (now - lastAdd < 30000) {
      const wait = Math.ceil((30000 - (now - lastAdd)) / 1000);
      socket.emit('error', `Aguarde ${wait}s`);
      return;
    }
    const userSongs = room.queue.filter(t => t.dj === socket.userName).length +
                      room.waitingQueue.filter(t => t.dj === socket.userName).length;
    if (userSongs >= MAX_SONGS_PER_USER) {
      socket.emit('error', `Você já tem ${MAX_SONGS_PER_USER} músicas na fila/espera. Aguarde outras serem tocadas.`);
      return;
    }

    const isQueueFull = room.queue.length >= settings.maxQueue;
    if (isQueueFull) {
      if (room.waitingQueue.length >= settings.maxQueue) {
        socket.emit('error', `Fila de espera cheia (${settings.maxQueue})`);
        return;
      }
      song.dj = socket.userName;
      room.waitingQueue.push(song);
      room.lastAddTime.set(socket.userName, now);
      addPoints(socket.userEmail, 1);
      io.to(currentRoom).emit('playSound', 'waiting');
      addSystemMsg(currentRoom, `⏳ "${song.title}" entrou na fila de espera (${room.waitingQueue.length} músicas aguardando)`);
      broadcastState(currentRoom);
      saveRoomToFirestore(currentRoom);
      return;
    }

    if (song.duration && song.duration > settings.maxDuration) {
      socket.emit('error', `⛔ Vídeo muito longo! Duração: ${Math.floor(song.duration / 60)} min. Limite: ${settings.maxDuration / 60} min.`);
      return;
    }

    song.dj = socket.userName;
    room.queue.push(song);
    room.lastAddTime.set(socket.userName, now);
    addPoints(socket.userEmail, 2);
    room.totalSongsAdded = (room.totalSongsAdded || 0) + 1;

    if (!room.isPlaying && room.queue.length === 1) {
      room.isPlaying = true;
      room.currentIndex = 0;
      room.startedAt = Date.now();
      room.lastAdvanceAt = Date.now();
      addSystemMsg(currentRoom, `▶ ${song.title} — ${song.artist}`);
    } else {
      autoShuffle(room);
    }
    broadcastState(currentRoom);
    saveRoomToFirestore(currentRoom);

    if (room.discordWebhook) {
      const msg = `🎵 **${song.title}** por ${song.artist} foi adicionada por ${socket.userName} na sala **${room.name}**`;
      sendDiscordWebhook(room.discordWebhook, msg);
    }

    const musicMsg = {
      _id: Date.now().toString() + Math.random(),
      user: socket.userName, color: socket.userColor,
      isSystem: false, isAdmin: socket.isAdmin || false,
      isMusic: true, musicTitle: song.title,
      musicArtist: song.artist, createdAt: new Date()
    };
    room.chatHistory.push(musicMsg);
    if (room.chatHistory.length > 300) room.chatHistory.shift();
    io.to(currentRoom).emit('chat', musicMsg);
  });

  socket.on('likeMessage', ({ messageId, room }) => {
    if (!room || !socket.userName) return;
    const likes = getRoomLikes(room);
    if (!likes[messageId]) likes[messageId] = { likes: 0, users: [] };
    const data = likes[messageId];
    const userIndex = data.users.indexOf(socket.userName);
    if (userIndex > -1) {
      data.users.splice(userIndex, 1);
      data.likes = Math.max(0, data.likes - 1);
    } else {
      data.users.push(socket.userName);
      data.likes++;
      addPoints(socket.userEmail, 1);
      io.to(room).emit('playSound', 'like');
    }
    io.to(room).emit('likeUpdate', { messageId, likes: data.likes, users: data.users });
    saveRoomToFirestore(room);
  });

  socket.on('videoDuration', ({ duration }) => {
    if (!currentRoom || !duration) return;
    const room = rooms.get(currentRoom);
    const track = room.queue[room.currentIndex];
    if (!track) return;
    track.duration = duration;
    if (duration > settings.maxDuration) {
      room.queue.shift();
      room.currentIndex = 0;
      room.isPlaying = false;
      room.startedAt = Date.now();
      addSystemMsg(currentRoom, `⛔ A música "${track.title}" foi removida automaticamente por ser muito longa (${Math.floor(duration / 60)} min). Limite: ${settings.maxDuration / 60} min.`);
      const votes = getRoomVotes(currentRoom);
      const newVotes = {};
      room.queue.forEach((_, i) => {
        if (votes[i + 1]) newVotes[i] = votes[i + 1];
      });
      roomVotes.set(currentRoom, newVotes);
      broadcastState(currentRoom);
      io.to(currentRoom).emit('queueEmpty');
      saveRoomToFirestore(currentRoom);
      return;
    }
    broadcastState(currentRoom);
    saveRoomToFirestore(currentRoom);
  });

  socket.on('skipTo', (index) => {
    if (!currentRoom || !socket.isAdmin) {
      socket.emit('error', 'Apenas admin');
      return;
    }
    const room = rooms.get(currentRoom);
    if (index < 0 || index >= room.queue.length) return;
    room.lastAdvanceAt = Date.now();
    if (index > 0) room.queue.splice(0, index);
    room.currentIndex = 0;
    room.startedAt = Date.now();
    room.isPlaying = true;
    room.skipVotes = new Set();
    const votes = getRoomVotes(currentRoom);
    const newVotes = {};
    room.queue.forEach((_, i) => {
      if (votes[i]) newVotes[i] = votes[i];
    });
    roomVotes.set(currentRoom, newVotes);
    autoShuffle(room);
    broadcastState(currentRoom);
    addSystemMsg(currentRoom, `⏭ ${socket.userName} pulou para: ${room.queue[0]?.title || 'fila vazia'}`);
    saveRoomToFirestore(currentRoom);
  });

  socket.on('removeFromQueue', (index) => {
    if (!currentRoom) {
      socket.emit('error', 'Você não está em uma sala');
      return;
    }
    const isGlobalAdmin = userEmail && adminEmails.has(userEmail);
    const room = rooms.get(currentRoom);
    if (!room) return;
    if (!isGlobalAdmin && !socket.isAdmin) {
      socket.emit('error', 'Apenas admin pode remover músicas');
      return;
    }
    const track = room.queue[index];
    if (!track || index === room.currentIndex) {
      socket.emit('error', 'Não é possível remover a música atual');
      return;
    }
    room.queue.splice(index, 1);
    if (index < room.currentIndex) room.currentIndex--;
    const votes = getRoomVotes(currentRoom);
    const newVotes = {};
    room.queue.forEach((_, i) => {
      if (votes[i + 1]) newVotes[i] = votes[i + 1];
    });
    roomVotes.set(currentRoom, newVotes);
    autoShuffle(room);
    broadcastState(currentRoom);
    addSystemMsg(currentRoom, `🗑️ ${socket.userName} removeu "${track.title}"`);
    saveRoomToFirestore(currentRoom);
  });

  socket.on('reorderQueue', (newOrder) => {
    if (!currentRoom) {
      socket.emit('error', 'Você não está em uma sala');
      return;
    }
    const isGlobalAdmin = userEmail && adminEmails.has(userEmail);
    if (!isGlobalAdmin && !socket.isAdmin) {
      socket.emit('error', 'Apenas admin pode reordenar');
      return;
    }
    const room = rooms.get(currentRoom);
    if (!room || room.queue.length === 0) return;
    const currentTrack = room.queue[room.currentIndex];
    const currentId = currentTrack ? currentTrack.id : null;
    const newQueue = [];
    for (const id of newOrder) {
      const track = room.queue.find(t => t.id === id);
      if (track) newQueue.push(track);
    }
    if (newQueue.length === room.queue.length) {
      room.queue = newQueue;
      const newIndex = room.queue.findIndex(t => t.id === currentId);
      room.currentIndex = newIndex !== -1 ? newIndex : 0;
      const votes = getRoomVotes(currentRoom);
      const newVotes = {};
      room.queue.forEach((track, i) => {
        const oldIndex = room.queue.indexOf(track);
        if (votes[oldIndex]) newVotes[i] = votes[oldIndex];
      });
      roomVotes.set(currentRoom, newVotes);
      broadcastState(currentRoom);
      saveRoomToFirestore(currentRoom);
    }
  });

  socket.on('voteSong', ({ index, type, room }) => {
    if (!room || !socket.userName) return;
    const roomData = rooms.get(room);
    if (!roomData) return;
    if (roomData.currentIndex === index) {
      socket.emit('error', 'Não é possível votar na música atual');
      return;
    }
    if (index >= roomData.queue.length) {
      socket.emit('error', 'Música não encontrada');
      return;
    }
    const votes = getRoomVotes(room);
    if (!votes[index]) votes[index] = { up: [], down: [] };
    const data = votes[index];
    const upIndex = data.up.indexOf(socket.userName);
    if (upIndex > -1) data.up.splice(upIndex, 1);
    const downIndex = data.down.indexOf(socket.userName);
    if (downIndex > -1) data.down.splice(downIndex, 1);
    if (type === 'up') {
      data.up.push(socket.userName);
      addPoints(socket.userEmail, 1);
      roomData.totalVotesGiven = (roomData.totalVotesGiven || 0) + 1;
    } else if (type === 'down') data.down.push(socket.userName);
    if (data.down.length >= DISLIKE_THRESHOLD) {
      const removed = roomData.queue.splice(index, 1)[0];
      if (index < roomData.currentIndex) roomData.currentIndex--;
      delete votes[index];
      const newVotes = {};
      roomData.queue.forEach((_, i) => {
        if (votes[i + 1]) newVotes[i] = votes[i + 1];
      });
      roomVotes.set(room, newVotes);
      autoShuffle(roomData);
      broadcastState(room);
      io.to(room).emit('voteUpdate', { index, up: data.up, down: data.down, removed: true });
      addSystemMsg(room, `👎 "${removed.title}" foi removida por votação! (${data.down.length} votos negativos)`);
      saveRoomToFirestore(room);
      return;
    }
    if (type === 'up') autoShuffle(roomData);
    io.to(room).emit('voteUpdate', { index, up: data.up, down: data.down });
    broadcastState(room);
    saveRoomToFirestore(room);
  });

  socket.on('disconnect', () => {
    if (currentRoom) {
      const room = rooms.get(currentRoom);
      if (room) {
        room.listenerCount = Math.max(0, room.listenerCount - 1);
        broadcastState(currentRoom);
        broadcastUsers(currentRoom);
        notifyNextWaiting(currentRoom);
        saveRoomToFirestore(currentRoom);
      }
    }
  });
});

// ========== INICIALIZAÇÃO ==========
async function init() {
  await loadUsersFromFirestore();
  await loadRoomsFromFirestore();
  
  if (!rooms.has('lounge')) {
    const room = createRoom('lounge', 'Lounge Sonora', 'Sistema');
    rooms.set('lounge', room);
    await saveRoomToFirestore('lounge');
    console.log('🆕 Sala lounge criada');
  }

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => console.log(`🎧 Sonora Fan → http://localhost:${PORT}`));
}

init();
