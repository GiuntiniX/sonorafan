// Firestore/Auth de mentira em memória: permite testar o server.js real sem tocar no código dele.
const crypto = require('crypto'), h = t => crypto.createHash('sha256').update(t).digest('hex');
const store = { users: {}, sessions: {}, points: {}, favorites: {}, rooms: {}, sanctions: {}, adminLog: {} };
const U = [['TOKB', 'beto@x', 'Beto'], ['TOKC', 'cris@x', 'Cris'], ['TOKADM', 'admin@x', 'Admin'], ['TOKD', 'dani@x', 'Dani'], ['TOKE', 'eli@x', 'Eli'], ['TOKF', 'fabi@x', 'Fabi'], ['TOKG', 'gabi@x', 'Gabi'],
  ['TOKV', 'vic@x', 'Vic'], ['TOKM', 'mia@x', 'Mia'], ['TOKZ1', 'ze1@x', 'Zé'], ['TOKZ2', 'ze2@x', 'Zé']];
for (const [t, email, nome] of U) { store.users[email] = { nome, email, avatar: '🎸', estilos: ['rock'], theme: 'dark' }; store.sessions[h(t)] = { email, exp: Date.now() + 1e9 }; }
const doc = (c, id) => ({ get: async () => ({ exists: id in store[c], data: () => store[c][id], id, ref: doc(c, id) }), set: async d => { store[c][id] = d; }, delete: async () => { delete store[c][id]; } });
const db = { collection: c => { store[c] = store[c] || {}; return { doc: id => doc(c, id), get: async () => ({ forEach: fn => Object.entries(store[c]).forEach(([id, d]) => fn({ id, data: () => d, ref: doc(c, id) })) }) }; } };
const mock = (id, ex) => { const f = require.resolve(id); require.cache[f] = { id: f, filename: f, loaded: true, exports: ex }; };
mock('firebase-admin/app', { initializeApp() {}, cert: x => x });
mock('firebase-admin/firestore', { getFirestore: () => db });
mock('firebase-admin/auth', { getAuth: () => ({ verifyIdToken: async t => { if (String(t).startsWith('fake:')) return { email: String(t).slice(5), firebase: {} }; throw new Error('x'); }, deleteUser: async () => {}, getUserByEmail: async () => ({}) }) });
