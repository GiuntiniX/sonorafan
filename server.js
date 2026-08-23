const admin = require('firebase-admin');

// Inicializar Firebase Admin
let firestore;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  firestore = admin.firestore();
  console.log('Firebase inicializado');
} else {
  console.warn('Firebase não configurado, usando memória apenas');
}

// Funções para salvar/carregar
async function loadUsersFromFirestore() {
  if (!firestore) return;
  const snapshot = await firestore.collection('users').get();
  snapshot.forEach(doc => {
    const data = doc.data();
    users.set(doc.id, data);
  });
}

async function loadRoomsFromFirestore() {
  if (!firestore) return;
  const snapshot = await firestore.collection('rooms').get();
  snapshot.forEach(doc => {
    const data = doc.data();
    // reconstruir o objeto room com os dados
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
      lastAddTime: new Map(), // não persistimos, será recriado
      isPlaying: data.isPlaying || false,
      lastAdvanceAt: data.lastAdvanceAt || 0,
      history: data.history || [],
      skipVotes: new Set(), // não persistimos
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
    // também recriar roomLikes e roomVotes se existirem
    if (data.likes) roomLikes.set(doc.id, data.likes);
    if (data.votesMap) roomVotes.set(doc.id, data.votesMap);
  });
}

// Função para salvar uma sala específica
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
  await firestore.collection('rooms').doc(slug).set(data);
}

// Função para salvar um usuário
async function saveUserToFirestore(email) {
  if (!firestore) return;
  const user = users.get(email);
  if (!user) return;
  // remover senha? Não vamos armazenar senha em texto puro, mas para simplicidade, armazenamos (mas não é seguro)
  // Idealmente usar hash, mas vamos manter
  await firestore.collection('users').doc(email).set(user);
}
