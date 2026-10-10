// game-engine.js — servidor: regras e estado dos jogos (Stop, Ligue 4). Fica na RAIZ do projeto, nunca em public/.
const crypto = require('crypto');
const LETTERS = 'ABCDEFGHIJLMNOPRSTUV';
const WORDS = ['MUSICA', 'VIOLAO', 'GUITARRA', 'BATERIA', 'CANTOR', 'REFRAO', 'MELODIA', 'HARMONIA', 'SAMBA', 'FORRO', 'SERTANEJO', 'PAGODE', 'TECLADO', 'MICROFONE', 'PALCO', 'FESTIVAL', 'ALBUM', 'PLAYLIST', 'CONCERTO', 'ORQUESTRA', 'PANDEIRO', 'CAVAQUINHO', 'SANFONA', 'CARNAVAL', 'SERESTA', 'BAIXISTA', 'VOCALISTA', 'TROMBONE', 'SAXOFONE', 'ACORDEON'];
const pips = h => h.reduce((n, x) => n + x[0] + x[1], 0);
function nextTurn(t, s) { do { s.turn = (s.turn + 1) % t.players.length; } while (t.players[s.turn].left); }
const CATS = ['Nome', 'Animal', 'Cidade/País', 'Cor', 'Comida'];
const norm = s => String(s || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const COLORS = new Set('azul vermelho verde amarelo laranja roxo rosa marrom preto branco cinza bege dourado prateado violeta lilas turquesa magenta ciano bordo vinho salmao coral ouro prata creme marfim caramelo mostarda oliva anil indigo carmim escarlate purpura ambar bronze cobre grena lavanda esmeralda rubi safira petroleo musgo terracota ocre areia chocolate cafe cereja framboesa uva limao abobora goiaba pessego menta jade fucsia'.split(' '));
const junk = n => { const L = n.replace(/[^a-z]/g, ''); return L.length < 3 || !/[aeiouy]/.test(L) || /(.)\1{2,}/.test(L); };
const valid = (l, v) => { const n = norm(v); return !!n && n[0] === l.toLowerCase() && !junk(n); };
// motivo pelo qual uma resposta não vale ('' = vale). withVotes=false ignora as contestações da mesa.
function reason(t, s, i, c, withVotes = true) {
  const n = norm(s.ans[i][c]);
  if (!n || n[0] !== s.letter.toLowerCase()) return 'letra errada';
  if (junk(n)) return 'sem sentido';
  if (s.ans[i].findIndex(x => norm(x) === n) !== c) return 'repetida em outra categoria';
  if (c === 3 && COLORS.has(n)) return '';
  if (withVotes) { const others = t.players.filter((x, j) => j !== i && !x.left).length; if ((s.votes[c + ':' + i] || []).length > others / 2) return 'contestada pela mesa'; }
  return '';
}

function next(t, api) {
  const s = t.s; s.round++; s.letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
  s.ans = t.players.map(() => []); s.phase = 'play'; s.by = null; s.endsAt = Date.now() + 60000;
  clearTimeout(t.timer); t.timer = setTimeout(() => endRound(t, api), 60000); api.push(t);
}
function endRound(t, api) {                       // fim do tempo/STOP -> revisão pela mesa
  const s = t.s; clearTimeout(t.timer);
  s.phase = 'review'; s.votes = {}; s.ready = {}; s.endsAt = Date.now() + 30000;
  t.timer = setTimeout(() => scoreRound(t, api), 30000); api.push(t);
}
function scoreRound(t, api) {
  const s = t.s; clearTimeout(t.timer);
  const rows = t.players.map(() => ({ a: [], pts: 0 }));
  CATS.forEach((_, c) => {
    const words = t.players.map((_, i) => reason(t, s, i, c) === '' ? norm(s.ans[i][c]) : null);
    t.players.forEach((_, i) => { const w = words[i]; rows[i].a[c] = { v: s.ans[i][c] || '', ok: !!w, why: w ? '' : reason(t, s, i, c) }; if (w) rows[i].pts += words.filter(x => x === w).length > 1 ? 5 : 10; });
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
      if (s.phase === 'review') {
        if (a.k === 'contest' && Number.isInteger(a.i) && a.i >= 0 && a.i < t.players.length && a.i !== i && CATS[a.c] !== undefined && !p.left) {
          const k = a.c + ':' + a.i, v = s.votes[k] = s.votes[k] || [], at = v.indexOf(i);
          if (at >= 0) v.splice(at, 1); else v.push(i);
        }
        if (a.k === 'ready') { s.ready[i] = 1; if (t.players.every((x, j) => x.left || s.ready[j])) return scoreRound(t, api); }
        return;
      }
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
        mine: live ? (s.ans[i] || []) : [], filled: s.ans.map(a => CATS.filter((_, c) => valid(s.letter, a[c])).length), totals: s.totals, last: live ? null : s.last,
        rev: s.phase === 'review' ? { ready: Object.keys(s.ready).length, cells: t.players.map((_, j) => CATS.map((_, c) => { const v = s.votes[c + ':' + j] || []; return { v: s.ans[j][c] || '', r: reason(t, s, j, c, false), n: v.length, m: v.includes(i) }; })) } : null };
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
  },
  dom: {
    name: 'Dominó', min: 2, max: 4,
    start(t) {
      const tiles = []; for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) tiles.push([a, b]);
      tiles.sort(() => Math.random() - 0.5);
      const hands = t.players.map(() => tiles.splice(0, 7)), val = x => (x[0] === x[1] ? 100 : 0) + x[0] + x[1];
      let st = 0, best = -1; hands.forEach((h, i) => h.forEach(x => { if (val(x) > best) { best = val(x); st = i; } }));
      const first = hands[st].splice(hands[st].findIndex(x => val(x) === best), 1)[0];
      const s = t.s = { hands, bone: tiles, chain: [first], ends: [first[0], first[1]], turn: st, passes: 0 };
      nextTurn(t, s);
    },
    act(t, p, a, api) {
      const s = t.s, i = t.players.indexOf(p), h = s.hands[i];
      if (s.turn !== i) return;
      const playable = h.some(x => x.includes(s.ends[0]) || x.includes(s.ends[1]));
      if (a.k === 'draw' && !playable && s.bone.length) { h.push(s.bone.pop()); return; }
      if (a.k === 'pass' && !playable && !s.bone.length) {
        s.passes++;
        if (s.passes >= t.players.filter(x => !x.left).length) { const m = Math.min(...s.hands.map(pips)); return api.finish(t, t.players.filter((x, j) => !x.left && pips(s.hands[j]) === m)); }
        return nextTurn(t, s);
      }
      if (a.k === 'play' && h[a.i]) {
        const x = h[a.i], L = a.side === 'l', e = s.ends[L ? 0 : 1];
        if (!x.includes(e)) return;
        const o = L ? (x[1] === e ? x : [x[1], x[0]]) : (x[0] === e ? x : [x[1], x[0]]);
        h.splice(a.i, 1); if (L) s.chain.unshift(o); else s.chain.push(o);
        s.ends = [s.chain[0][0], s.chain[s.chain.length - 1][1]]; s.passes = 0;
        if (!h.length) return api.finish(t, [p]);
        nextTurn(t, s);
      }
    },
    view(t, p) { const s = t.s, h = s.hands[t.players.indexOf(p)] || []; return { chain: s.chain, ends: s.ends, turn: s.turn, mine: h, counts: s.hands.map(x => x.length), bone: s.bone.length, playable: h.some(x => x.includes(s.ends[0]) || x.includes(s.ends[1])) }; }
  },
  forca: {
    name: 'Forca', min: 2, max: 6,
    start(t) { t.s = { word: WORDS[Math.floor(Math.random() * WORDS.length)], got: [], bad: [], turn: 0 }; },
    act(t, p, a, api) {
      const s = t.s, i = t.players.indexOf(p), l = String(a.l || '').toUpperCase();
      if (a.k !== 'guess' || s.turn !== i || !/^[A-Z]$/.test(l) || s.got.includes(l) || s.bad.includes(l)) return;
      if (s.word.includes(l)) { s.got.push(l); if ([...s.word].every(c => s.got.includes(c))) api.finish(t, t.players.filter(x => !x.left)); return; }
      s.bad.push(l);
      if (s.bad.length >= 6) return api.finish(t, []);
      nextTurn(t, s);
    },
    view(t) { const s = t.s, over = t.status === 'over'; return { mask: [...s.word].map(c => over || s.got.includes(c) ? c : '_'), bad: s.bad, got: s.got, turn: s.turn, word: over ? s.word : null }; }
  }
};

module.exports = function (io, { sessions, users, userPoints, setPointsInFirestore, getPointsFromFirestore, adminEmails, socketTokens }) {
  const tables = new Map();
  const me = socket => {
    const m = /(?:^|;\s*)sessionToken=([^;]+)/.exec(socket.request.headers.cookie || '');
    let email = socket.data && socket.data.gEmail;
    if (!email) email = m && sessions.get(decodeURIComponent(m[1]));
    if (!email) return null;
    const u = users.get(email) || {};
    return { email, name: u.nome || email.split('@')[0], avatar: u.avatar || '🎸' };
  };
  const award = async (email, pts) => {
    try {
      const p = userPoints.get(email) || (getPointsFromFirestore ? await getPointsFromFirestore(email) : null) || { points: 0, badges: [] };
      p.points = (p.points || 0) + pts; userPoints.set(email, p);
      await setPointsInFirestore(email, p);
    } catch (e) {}
  };
  const open = () => [...tables.values()].filter(t => t.status === 'lobby').map(t => ({ id: t.id, type: t.type, title: t.name, name: GAMES[t.type].name, host: t.players[0].name, n: t.players.length, max: GAMES[t.type].max }));
  const sendTables = () => io.to('games').emit('g:tables', open());
  const view = (t, p) => { const G = GAMES[t.type]; return { id: t.id, type: t.type, name: G.name, title: t.name, status: t.status, min: G.min, max: G.max, host: t.players[0] === p, you: t.players.indexOf(p), players: t.players.map(x => ({ name: x.name, avatar: x.avatar, left: !!x.left })), result: t.result || null, g: t.s ? G.view(t, p) : null }; };
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
    socket.on('g:auth', ({ token } = {}) => {
      const r = socketTokens.get(token); socketTokens.delete(token);
      if (r && r.exp > Date.now()) { socket.data.gEmail = r.email; socket.emit('g:authed'); }
    });
    socket.on('g:list', () => {
      const u = me(socket); if (!u) return;
      socket.join('games'); socket.emit('g:tables', open());
      const t = find(u.email); if (t) { t.players.find(x => x.email === u.email).sid = socket.id; push(t); }
    });
    socket.on('g:create', ({ type, name } = {}) => {
      const u = me(socket); if (!u) return socket.emit('g:notice', 'Faça login para criar uma sala de jogo.');
      if (!GAMES[type]) return;
      if (find(u.email)) return socket.emit('g:notice', 'Você já está numa mesa. Saia dela antes de criar outra.');
      const t = { id: crypto.randomBytes(3).toString('hex'), type, name: String(name || '').trim().slice(0, 40) || GAMES[type].name, status: 'lobby', players: [{ ...u, sid: socket.id }], s: null, at: Date.now() };
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
    // ----- controle do admin -----
    const adm = () => { const u = me(socket); return u && adminEmails.has(u.email) ? u : null; };
    const all = () => [...tables.values()].map(t => ({ id: t.id, type: GAMES[t.type].name, title: t.name, status: t.status, players: t.players.map(p => p.name + (p.left ? ' (saiu)' : '')), age: Math.round((Date.now() - t.at) / 60000) }));
    socket.on('g:admin', () => { if (adm()) socket.emit('g:admin', all()); });
    socket.on('g:close', ({ id } = {}) => {
      const t = tables.get(id); if (!adm() || !t) return;
      clearTimeout(t.timer); t.players.forEach(p => { if (p.sid) { io.to(p.sid).emit('g:state', null); io.to(p.sid).emit('g:notice', 'Mesa encerrada por um administrador.'); } });
      tables.delete(id); sendTables(); socket.emit('g:admin', all());
    });
    socket.on('g:kick', ({ id, i } = {}) => {
      const t = tables.get(id), p = t && t.players[i]; if (!adm() || !p) return;
      const sid = p.sid; leave(t, p);
      if (sid) { io.to(sid).emit('g:state', null); io.to(sid).emit('g:notice', 'Você foi removido da mesa por um administrador.'); }
      socket.emit('g:admin', all());
    });
    socket.on('disconnect', () => { for (const t of [...tables.values()]) for (const p of t.players) if (p.sid === socket.id) { p.sid = null; if (t.status === 'lobby') leave(t, p); } });
  });
};
