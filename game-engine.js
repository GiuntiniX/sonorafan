// game-engine.js — servidor: regras e estado dos jogos (Stop, Ligue 4). Fica na RAIZ do projeto, nunca em public/.
const crypto = require('crypto');
const LETTERS = 'ABCDEFGHIJLMNOPRSTUV';
const CATS = ['Nome', 'Animal', 'Cidade/País', 'Cor', 'Comida'];
const norm = s => String(s || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const valid = (l, v) => { const n = norm(v); return n.length >= 2 && n[0] === l.toLowerCase(); };

function next(t, api) {
  const s = t.s; s.round++; s.letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
  s.ans = t.players.map(() => []); s.phase = 'play'; s.by = null; s.endsAt = Date.now() + 60000;
  clearTimeout(t.timer); t.timer = setTimeout(() => endRound(t, api), 60000); api.push(t);
}
function endRound(t, api) {
  const s = t.s; clearTimeout(t.timer);
  const rows = t.players.map(() => ({ a: [], pts: 0 }));
  CATS.forEach((_, c) => {
    const words = t.players.map((_, i) => valid(s.letter, s.ans[i][c]) ? norm(s.ans[i][c]) : null);
    t.players.forEach((_, i) => { const w = words[i]; rows[i].a[c] = { v: s.ans[i][c] || '', ok: !!w }; if (w) rows[i].pts += words.filter(x => x === w).length > 1 ? 5 : 10; });
  });
  rows.forEach((r, i) => { s.totals[i] += r.pts; });
  s.last = { letter: s.letter, rows: rows.map((r, i) => ({ name: t.players[i].name, a: r.a, pts: r.pts })) };
  if (s.round >= s.rounds) {
    s.phase = 'over'; const m = Math.max(...s.totals);
    return api.finish(t, t.players.filter((p, i) => s.totals[i] === m && !p.left));
  }
  s.phase = 'result'; s.endsAt = Date.now() + 12000; t.timer = setTimeout(() => next(t, api), 12000); api.push(t);
}
function four(b, r, c) {
  const v = b[r][c];
  return [[0, 1], [1, 0], [1, 1], [1, -1]].some(([dr, dc]) => {
    let n = 1;
    for (const k of [1, -1]) for (let x = r + dr * k, y = c + dc * k; b[x] && b[x][y] === v; x += dr * k, y += dc * k) n++;
    return n >= 4;
  });
}

const GAMES = {
  stop: {
    name: 'Stop', min: 2, max: 8,
    start(t, api) { t.s = { round: 0, rounds: 3, totals: t.players.map(() => 0), ans: [], last: null }; next(t, api); },
    act(t, p, a, api) {
      const s = t.s, i = t.players.indexOf(p);
      if (!['play', 'closing'].includes(s.phase)) return;
      if (a.k === 'ans' && a.cat >= 0 && a.cat < CATS.length) s.ans[i][a.cat] = String(a.v || '').slice(0, 30);
      if (a.k === 'stop' && s.phase === 'play' && CATS.every((_, c) => valid(s.letter, s.ans[i][c]))) {
        s.phase = 'closing'; s.by = p.name; s.endsAt = Date.now() + 5000;
        clearTimeout(t.timer); t.timer = setTimeout(() => endRound(t, api), 5000);
      }
    },
    view(t, p) {
      const s = t.s, i = t.players.indexOf(p), live = ['play', 'closing'].includes(s.phase);
      return { phase: s.phase, round: s.round, rounds: s.rounds, letter: s.letter, cats: CATS, ms: Math.max(0, s.endsAt - Date.now()), by: s.by,
        mine: live ? (s.ans[i] || []) : [], filled: s.ans.map(a => CATS.filter((_, c) => valid(s.letter, a[c])).length), totals: s.totals, last: live ? null : s.last };
    }
  },
  c4: {
    name: 'Ligue 4', min: 2, max: 2,
    start(t) { t.s = { board: Array.from({ length: 6 }, () => Array(7).fill(0)), turn: 0, win: null }; },
    act(t, p, a, api) {
      const s = t.s, i = t.players.indexOf(p);
      if (a.k !== 'drop' || s.win !== null || s.turn !== i || !(a.c >= 0 && a.c < 7)) return;
      let r = 5; while (r >= 0 && s.board[r][a.c]) r--;
      if (r < 0) return;
      s.board[r][a.c] = i + 1;
      if (four(s.board, r, a.c)) { s.win = i; return api.finish(t, [p]); }
      if (s.board[0].every(Boolean)) { s.win = -1; return api.finish(t, []); }
      s.turn = 1 - i;
    },
    view(t) { return { board: t.s.board, turn: t.s.turn, win: t.s.win }; }
  }
};

module.exports = function (io, { sessions, users, userPoints, setPointsInFirestore }) {
  const tables = new Map();
  const me = socket => {
    const m = /(?:^|;\s*)sessionToken=([^;]+)/.exec(socket.request.headers.cookie || '');
    const email = m && sessions.get(decodeURIComponent(m[1])), u = email && users.get(email);
    return u ? { email, name: u.nome, avatar: u.avatar || '🎸' } : null;
  };
  const award = (email, pts) => {
    const p = userPoints.get(email) || { points: 0, badges: [] };
    p.points = (p.points || 0) + pts; userPoints.set(email, p);
    Promise.resolve(setPointsInFirestore(email, p)).catch(() => {});
  };
  const open = () => [...tables.values()].filter(t => t.status === 'lobby').map(t => ({ id: t.id, name: GAMES[t.type].name, host: t.players[0].name, n: t.players.length, max: GAMES[t.type].max }));
  const sendTables = () => io.to('games').emit('g:tables', open());
  const view = (t, p) => { const G = GAMES[t.type]; return { id: t.id, type: t.type, name: G.name, status: t.status, min: G.min, max: G.max, host: t.players[0] === p, you: t.players.indexOf(p), players: t.players.map(x => ({ name: x.name, avatar: x.avatar, left: !!x.left })), result: t.result || null, g: t.s ? G.view(t, p) : null }; };
  const push = t => t.players.forEach(p => p.sid && io.to(p.sid).emit('g:state', view(t, p)));
  const api = {
    push,
    finish(t, winners) {
      t.status = 'over'; clearTimeout(t.timer); t.result = { winners: winners.map(w => w.name) };
      t.players.forEach(p => { if (!p.left) award(p.email, winners.includes(p) ? 30 : 5); });
      push(t); sendTables(); setTimeout(() => tables.delete(t.id), 10 * 60 * 1000).unref();
    }
  };
  function leave(t, p) {
    if (t.status === 'playing') {
      p.left = true; p.sid = null; const alive = t.players.filter(x => !x.left);
      return alive.length <= 1 ? api.finish(t, alive) : push(t);
    }
    t.players.splice(t.players.indexOf(p), 1);
    if (!t.players.length) { clearTimeout(t.timer); tables.delete(t.id); } else push(t);
    sendTables();
  }
  setInterval(() => { const n = Date.now(); for (const [id, t] of tables) if (n - t.at > 3 * 3600e3) { clearTimeout(t.timer); tables.delete(id); } }, 600000).unref();

  io.on('connection', socket => {
    const find = email => [...tables.values()].find(t => t.status !== 'over' && t.players.some(p => p.email === email));
    const mine = id => { const u = me(socket), t = tables.get(id), p = t && u && t.players.find(x => x.email === u.email); return p ? { t, p } : null; };
    socket.on('g:list', () => {
      const u = me(socket); if (!u) return;
      socket.join('games'); socket.emit('g:tables', open());
      const t = find(u.email); if (t) { t.players.find(x => x.email === u.email).sid = socket.id; push(t); }
    });
    socket.on('g:create', ({ type } = {}) => {
      const u = me(socket); if (!u || !GAMES[type] || find(u.email)) return;
      const t = { id: crypto.randomBytes(3).toString('hex'), type, status: 'lobby', players: [{ ...u, sid: socket.id }], s: null, at: Date.now() };
      tables.set(t.id, t); push(t); sendTables();
    });
    socket.on('g:join', ({ id } = {}) => {
      const u = me(socket), t = tables.get(id);
      if (!u || !t || t.status !== 'lobby' || find(u.email) || t.players.length >= GAMES[t.type].max) return;
      t.players.push({ ...u, sid: socket.id }); push(t); sendTables();
    });
    socket.on('g:leave', ({ id } = {}) => { const k = mine(id); if (k) { leave(k.t, k.p); socket.emit('g:state', null); } });
    socket.on('g:start', ({ id } = {}) => {
      const k = mine(id); if (!k || k.t.status !== 'lobby' || k.t.players[0] !== k.p || k.t.players.length < GAMES[k.t.type].min) return;
      k.t.status = 'playing'; GAMES[k.t.type].start(k.t, api); push(k.t); sendTables();
    });
    socket.on('g:act', ({ id, a } = {}) => { const k = mine(id); if (k && k.t.status === 'playing' && a) { GAMES[k.t.type].act(k.t, k.p, a, api); push(k.t); } });
    socket.on('disconnect', () => { for (const t of [...tables.values()]) for (const p of t.players) if (p.sid === socket.id) { p.sid = null; if (t.status === 'lobby') leave(t, p); } });
  });
};
