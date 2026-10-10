// games-ui.js — navegador: painel e telas dos jogos (Stop, Dominó, Ligue 4, Forca). Fica em public/.
(function () {
  const $g = id => document.getElementById(id), E = s => escapeHtml(String(s));
  const LIST = [
    { id: 'stop', e: '🛑', n: 'Stop', p: '2–8', d: 'Preencha categorias com a letra sorteada. Rápido e divertido.', c: '#ef4444' },
    { id: 'dom', e: '🎲', n: 'Dominó', p: '2–4', d: 'Encaixe as pedras nas pontas. Zerou a mão, venceu.', c: '#10b981' },
    { id: 'c4', e: '🔴', n: 'Ligue 4', p: '2', d: 'Alinhe 4 fichas na horizontal, vertical ou diagonal.', c: '#3b82f6' },
    { id: 'forca', e: '🔤', n: 'Forca', p: '2–6', d: 'Descubram juntos a palavra antes de 6 erros.', c: '#f59e0b' }
  ], G = Object.fromEntries(LIST.map(g => [g.id, g]));
  let tables = [], st = null, lastKey = '', mini = false, authed = false, authing = false, domSel = null;
  const pending = [];
  const css = document.createElement('style');
  css.textContent = `.g-row{display:flex;align-items:center;gap:10px;padding:10px;border:1px solid var(--border);border-radius:10px;margin:6px 0}.g-row span{flex:1}
.g-btn{padding:8px 14px;border-radius:10px;border:none;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;font-weight:700;cursor:pointer;font-family:inherit}.g-btn.sec{background:var(--bg-hover);color:var(--text)}.g-btn:disabled{opacity:.45;cursor:default}
.g-board{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;background:#1d4ed8;padding:8px;border-radius:12px;max-width:340px;margin:12px auto}.g-cell{aspect-ratio:1;border-radius:50%;background:var(--bg);cursor:pointer}.g-cell.p1{background:#ef4444}.g-cell.p2{background:#facc15}
.g-in{width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-family:inherit;margin:4px 0 8px}.g-tbl{width:100%;font-size:12px;border-collapse:collapse}.g-tbl td,.g-tbl th{padding:4px;border-bottom:1px solid var(--border);text-align:left}
.g-card{--gc:#7c3aed;display:flex;flex-direction:column;gap:6px;padding:16px;border-radius:16px;border:1px solid var(--border);background:linear-gradient(160deg,color-mix(in srgb,var(--gc) 18%,transparent),transparent 60%),var(--bg-card);cursor:pointer;transition:transform .2s,border-color .2s}.g-card:hover{transform:translateY(-3px);border-color:var(--gc)}
.g-ic{font-size:34px}.g-t{font-weight:800;font-size:16px}.g-s{font-size:12px;color:var(--text-secondary)}.g-f{display:flex;justify-content:space-between;align-items:center;margin-top:6px;gap:8px}.g-chip{font-size:11px;padding:3px 8px;border-radius:999px;background:var(--bg);border:1px solid var(--border)}
.dt{display:inline-flex;align-items:center;border:2px solid var(--text-secondary);border-radius:8px;background:var(--bg-card);margin:2px;transition:transform .15s,border-color .15s}.dt i{font-style:normal;font-weight:800;font-size:14px;padding:4px 7px}.dt i+i{border-left:2px solid var(--text-secondary)}
.dchain{display:flex;flex-wrap:wrap;gap:2px;padding:10px;border:1px dashed var(--border);border-radius:12px;min-height:56px}.dt-btn{background:none;border:none;cursor:pointer;padding:0}.dt-btn:disabled{opacity:.55;cursor:default}.dt-btn:not(:disabled):hover .dt{border-color:var(--accent);transform:translateY(-3px)}
.fkeys{display:grid;grid-template-columns:repeat(9,1fr);gap:4px;margin-top:8px}.fk{padding:8px 0;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-weight:700;cursor:pointer;font-family:inherit}.fk:disabled{opacity:.3;cursor:default}`;
  document.head.appendChild(css);
  const modal = document.createElement('div');
  modal.className = 'modal-overlay'; modal.id = 'gamesModal';
  modal.innerHTML = '<div class="modal" style="max-width:560px;max-height:88vh;overflow:auto;"><div id="gBody"></div></div>';
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) { if (st) mini = true; modal.classList.remove('active'); } });

  // ----- autenticação do canal de jogos (funciona mesmo se o login foi feito depois de abrir a página) -----
  const lobbyOn = () => { const l = $g('screen-lobby'); return !!l && l.classList.contains('active'); };
  async function auth() {
    try {
      const r = await fetch('/api/socket-token', { credentials: 'include' });
      if (r.ok) socket.emit('g:auth', { token: (await r.json()).token });
      else { pending.length = 0; toast('Faça login para jogar.', 'error'); }
    } catch (e) {}
  }
  function send(ev, data) {
    if (authed) return socket.emit(ev, data);
    if (!(ev === 'g:list' && pending.some(x => x[0] === 'g:list'))) pending.push([ev, data]);
    if (!authing) { authing = true; auth().then(() => setTimeout(() => { authing = false; }, 3000)); }
  }
  socket.on('g:authed', () => { authed = true; authing = false; while (pending.length) socket.emit(...pending.shift()); socket.emit('g:list'); });
  socket.on('disconnect', () => { authed = false; });
  socket.on('connect', () => { authed = false; if (lobbyOn() || modal.classList.contains('active')) send('g:list'); });

  const act = a => send('g:act', { id: st.id, a });
  Object.assign(window, {
    openGames() { mini = false; modal.classList.add('active'); send('g:list'); render(); },
    gCreate(type, name) { mini = false; send('g:create', { type, name }); },
    gNew: type => window.gCreate(type, ''),
    gJoin(id) { mini = false; send('g:join', { id }); },
    gMin() { mini = true; modal.classList.remove('active'); },
    gStart: () => send('g:start', { id: st.id }),
    gLeave() { send('g:leave', { id: st.id }); st = null; render(); send('g:list'); },
    gStop: () => act({ k: 'stop' }), gDrop: c => act({ k: 'drop', c }),
    gAns: el => act({ k: 'ans', cat: +el.dataset.c, v: el.value }),
    gGuess: l => act({ k: 'guess', l }), gDomDraw: () => act({ k: 'draw' }), gDomPass: () => act({ k: 'pass' }),
    gDomPlay(i) {
      const g = st.g, x = g.mine[i], L = x.includes(g.ends[0]), R = x.includes(g.ends[1]);
      if (!L && !R) return toast('Essa pedra não encaixa nas pontas.', 'error');
      if (L && R && g.ends[0] !== g.ends[1]) { domSel = i; return render(); }
      domSel = null; act({ k: 'play', i, side: L ? 'l' : 'r' });
    },
    gDomSide(side) { const i = domSel; domSel = null; act({ k: 'play', i, side }); },
    gAdminLoad: () => send('g:admin'), gClose: id => send('g:close', { id }), gKick: (id, i) => send('g:kick', { id, i }),
    gRenderPicker() {
      const box = $g('gamePicker'), cur = typeof roomGame !== 'undefined' ? roomGame : 'stop'; if (!box) return;
      box.innerHTML = LIST.map(g => '<button type="button" class="gp-tile' + (cur === g.id ? ' on' : '') + '" style="--gc:' + g.c + '" onclick="pickGame(\'' + g.id + '\')"><span class="gp-e">' + g.e + '</span><b>' + g.n + '</b><small>' + g.p + ' jogadores</small><em>' + g.d + '</em></button>').join('');
    }
  });

  socket.on('g:tables', l => { tables = l; if (!st) render(); lobbyCards(); });
  socket.on('g:state', s => {
    const novo = s && (!st || st.id !== s.id); st = s;
    if (s) { s._at = Date.now(); if (novo) { mini = false; domSel = null; } if (!mini) modal.classList.add('active'); }
    render();
  });
  socket.on('g:notice', m => toast(m, 'error'));
  socket.on('g:admin', list => {
    const box = $g('adminGames'); if (!box) return;
    box.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><b style="font-size:13px;">🎮 Mesas ativas (' + list.length + ')</b><button class="g-btn sec" onclick="gAdminLoad()">Atualizar</button></div>' +
      (list.map(t => '<div class="g-row"><span><b>' + E(t.title) + '</b> · ' + E(t.type) + ' · ' + E(t.status) + ' · ' + t.age + ' min<br><small>' + t.players.map((p, i) => E(p) + ' <a href="#" onclick="gKick(\'' + t.id + '\',' + i + ');return false;" title="Expulsar">👢</a>').join(' · ') + '</small></span><button class="g-btn" style="background:var(--danger)" onclick="if(confirm(\'Encerrar esta mesa?\'))gClose(\'' + t.id + '\')">Encerrar</button></div>').join('') || '<p style="color:var(--text-muted);font-size:13px;">Nenhuma mesa ativa.</p>');
  });

  // ----- cards das salas de jogo dentro da grade de salas do lobby -----
  function lobbyCards() {
    const grid = $g('roomGrid'); if (!grid) return;
    grid.querySelectorAll('.g-card').forEach(x => x.remove());
    tables.forEach(t => {
      const g = G[t.type] || {}, d = document.createElement('div');
      d.className = 'g-card'; d.style.setProperty('--gc', g.c || '#7c3aed');
      d.innerHTML = '<div class="g-ic">' + (g.e || '🎮') + '</div><div class="g-t">' + E(t.title) + '</div><div class="g-s">' + E(t.name) + ' · criada por ' + E(t.host) + '</div><div class="g-f"><span class="g-chip">⏳ Aguardando · ' + t.n + '/' + t.max + '</span><button class="g-btn">Entrar</button></div>';
      d.onclick = () => window.gJoin(t.id); grid.appendChild(d);
    });
  }
  const lobbyEl = $g('screen-lobby'), gridEl = $g('roomGrid');
  if (lobbyEl) new MutationObserver(() => { if (lobbyOn()) send('g:list'); }).observe(lobbyEl, { attributes: true, attributeFilter: ['class'] });
  if (gridEl) new MutationObserver(() => { if (tables.length && !gridEl.querySelector('.g-card')) lobbyCards(); }).observe(gridEl, { childList: true });
  setInterval(() => { if (lobbyOn()) send('g:list'); }, 5000);
  setInterval(() => { const el = $g('gTimer'); if (el && st && st.g) el.textContent = Math.max(0, Math.ceil((st.g.ms - (Date.now() - st._at)) / 1000)); }, 500);

  // ----- telas -----
  const fill = () => { const g = st.g; $g('gFill').textContent = g.by ? '🛑 ' + g.by + ' gritou STOP!' : st.players.map((p, i) => p.name + ': ' + g.filled[i] + '/' + g.cats.length).join(' · '); };
  function stopUI() {
    const g = st.g;
    if (g.phase === 'play' || g.phase === 'closing') {
      return '<div style="display:flex;justify-content:space-between;align-items:center;"><div style="font-size:42px;font-weight:800;">' + g.letter + '</div><div>Rodada ' + g.round + '/' + g.rounds + ' · <b id="gTimer"></b>s</div></div>' +
        g.cats.map((c, i) => '<label style="font-size:12px;color:var(--text-secondary);">' + E(c) + '</label><input class="g-in" maxlength="30" data-c="' + i + '" value="' + E(g.mine[i] || '') + '" placeholder="' + g.letter + '…" oninput="gAns(this)">').join('') +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;"><span id="gFill" style="font-size:12px;"></span><button class="g-btn" onclick="gStop()">🛑 STOP!</button></div><p style="font-size:11px;color:var(--text-muted);">STOP só vale com todas as categorias preenchidas com a letra certa. Resposta única = 10 pts, repetida = 5.</p>';
    }
    const L = g.last;
    return '<p>Rodada ' + g.round + '/' + g.rounds + ' · letra <b>' + L.letter + '</b></p><div style="overflow:auto"><table class="g-tbl"><tr><th></th>' + g.cats.map(c => '<th>' + E(c) + '</th>').join('') + '<th>+</th><th>Total</th></tr>' +
      L.rows.map((r, i) => '<tr><td>' + E(r.name) + '</td>' + r.a.map(x => '<td>' + (x.ok ? '✅' : '❌') + ' ' + E(x.v) + '</td>').join('') + '<td>' + r.pts + '</td><td>' + g.totals[i] + '</td></tr>').join('') + '</table></div>' + (g.phase === 'result' ? '<p style="font-size:12px;">Próxima rodada em instantes…</p>' : '');
  }
  function c4UI() {
    const g = st.g, msg = st.status === 'over' ? '' : (g.turn === st.you ? '👉 Sua vez!' : 'Vez do adversário…');
    return '<p>' + msg + ' <span style="font-size:12px;">Você: ' + (st.you === 0 ? '🔴' : '🟡') + '</span></p><div class="g-board">' + g.board.map(row => row.map((v, c) => '<div class="g-cell ' + (v ? 'p' + v : '') + '" onclick="gDrop(' + c + ')"></div>').join('')).join('') + '</div>';
  }
  const tile = x => '<span class="dt"><i>' + x[0] + '</i><i>' + x[1] + '</i></span>';
  function domUI() {
    const g = st.g, my = g.turn === st.you && st.status === 'playing'; if (!my) domSel = null;
    let a = '';
    if (my && !g.playable) a = g.bone > 0 ? '<button class="g-btn" onclick="gDomDraw()">Comprar do monte (' + g.bone + ')</button>' : '<button class="g-btn" onclick="gDomPass()">Passar a vez</button>';
    if (my && domSel !== null && g.mine[domSel]) a = '<span style="font-size:13px;">Jogar em qual ponta? </span><button class="g-btn" onclick="gDomSide(\'l\')">⬅ ' + g.ends[0] + '</button> <button class="g-btn" onclick="gDomSide(\'r\')">' + g.ends[1] + ' ➡</button>';
    return '<p style="font-size:13px;">' + (my ? '👉 <b>Sua vez!</b>' : 'Vez de ' + E(st.players[g.turn].name)) + ' · monte: ' + g.bone + ' · pedras: ' + st.players.map((p, i) => E(p.name) + ' ' + g.counts[i]).join(' · ') + '</p><div class="dchain">' + g.chain.map(tile).join('') + '</div><div style="margin:10px 0;">' + g.mine.map((x, i) => '<button class="dt-btn" ' + (my ? '' : 'disabled') + ' onclick="gDomPlay(' + i + ')">' + tile(x) + '</button>').join('') + '</div>' + a;
  }
  function forcaUI() {
    const g = st.g, my = g.turn === st.you && st.status === 'playing', used = g.got.concat(g.bad);
    return '<div style="font-size:32px;letter-spacing:6px;text-align:center;margin:10px 0;font-weight:800;">' + g.mask.join(' ') + '</div><p style="text-align:center;">' + ['😀', '🙂', '😐', '😟', '😨', '😵', '💀'][g.bad.length] + ' erros: ' + g.bad.length + '/6 <span style="color:var(--danger)">' + g.bad.join(' ') + '</span></p>' +
      (st.status === 'over' ? '<p style="text-align:center;">A palavra era <b>' + E(g.word) + '</b></p>' : '<p style="text-align:center;font-size:13px;">' + (my ? '👉 Sua vez de chutar uma letra' : 'Vez de ' + E(st.players[g.turn].name)) + '</p>') +
      '<div class="fkeys">' + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l => '<button class="fk" ' + (!my || used.includes(l) ? 'disabled' : '') + ' onclick="gGuess(\'' + l + '\')">' + l + '</button>').join('') + '</div>';
  }
  function render() {
    const b = $g('gBody');
    if (st && st.type === 'stop' && st.g && ['play', 'closing'].includes(st.g.phase)) {
      const key = st.id + 'p' + st.g.round;
      if (key === lastKey && $g('gFill')) return fill();
      lastKey = key;
    } else lastKey = '';
    if (!st) {
      b.innerHTML = '<h3>🎮 Salas de jogo</h3><p style="color:var(--text-secondary);font-size:13px;">Crie uma mesa rápida ou entre numa aberta. Também dá para criar em <b>Criar sala → Sala de jogos</b>. Vencer dá +30 pontos no ranking; participar, +5.</p>' +
        '<div style="display:flex;flex-wrap:wrap;gap:8px;margin:12px 0;">' + LIST.map(g => '<button class="g-btn" onclick="gNew(\'' + g.id + '\')">' + g.e + ' ' + g.n + '</button>').join('') + '</div>' +
        (tables.map(t => '<div class="g-row"><span><b>' + E(t.title) + '</b> · ' + E(t.name) + ' · ' + E(t.host) + ' · ' + t.n + '/' + t.max + '</span><button class="g-btn" onclick="gJoin(\'' + t.id + '\')">Entrar</button></div>').join('') || '<p style="color:var(--text-muted);font-size:13px;">Nenhuma mesa aberta agora.</p>') +
        '<div class="modal-actions"><button class="btn-secondary" onclick="document.getElementById(\'gamesModal\').classList.remove(\'active\')">Fechar</button></div>';
      return;
    }
    const n = st.players.length;
    let h = '<h3>' + E(st.title || st.name) + ' <small style="color:var(--text-muted);font-weight:400;">· ' + E(st.name) + '</small></h3><div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">' + st.players.map(p => E(p.avatar) + ' ' + E(p.name) + (p.left ? ' (saiu)' : '')).join(' · ') + '</div>';
    if (st.status === 'lobby') {
      h += '<p style="margin:10px 0 4px;">👥 <b>' + n + '/' + st.max + '</b> jogadores · mínimo para começar: ' + st.min + '</p><p style="font-size:12px;color:var(--text-muted);margin:0 0 10px;">A mesa aparece no lobby para todos entrarem. Quem criou decide quando começar: não precisa lotar a mesa.</p>' +
        (st.host ? '<button class="g-btn" ' + (n < st.min ? 'disabled' : '') + ' onclick="gStart()">' + (n < st.min ? '⏳ Aguardando mais ' + (st.min - n) + ' jogador(es)' : '▶ Começar com ' + n + ' jogadores') + '</button>' : '<p style="font-size:13px;">Aguarde o anfitrião começar.</p>');
    } else h += ({ stop: stopUI, c4: c4UI, dom: domUI, forca: forcaUI }[st.type] || (() => ''))();
    if (st.status === 'over') h += '<p style="margin-top:10px;"><b>🏁 ' + (st.result.winners.length ? 'Vencedor: ' + st.result.winners.map(E).join(', ') : 'Fim de jogo sem vencedor') + '</b></p>';
    b.innerHTML = h + '<div class="modal-actions"><button class="g-btn sec" onclick="gMin()">Minimizar</button><button class="g-btn sec" onclick="gLeave()">Sair da mesa</button></div>';
    if ($g('gFill')) fill();
  }
})();
