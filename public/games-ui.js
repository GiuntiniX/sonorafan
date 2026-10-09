// games-ui.js — navegador: painel e telas dos jogos (Stop, Ligue 4). Fica em public/.
(function () {
  const $g = id => document.getElementById(id);
  let tables = [], st = null, lastKey = '';
  const css = document.createElement('style');
  css.textContent = '.g-row{display:flex;align-items:center;gap:10px;padding:10px;border:1px solid var(--border);border-radius:10px;margin:6px 0}.g-row span{flex:1}.g-btn{padding:8px 14px;border-radius:10px;border:none;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;font-weight:700;cursor:pointer;font-family:inherit}.g-btn.sec{background:var(--bg-hover);color:var(--text)}.g-btn:disabled{opacity:.4;cursor:default}.g-board{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;background:#1d4ed8;padding:8px;border-radius:12px;max-width:340px;margin:12px auto}.g-cell{aspect-ratio:1;border-radius:50%;background:var(--bg);cursor:pointer}.g-cell.p1{background:#ef4444}.g-cell.p2{background:#facc15}.g-in{width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-family:inherit;margin:4px 0 8px}.g-tbl{width:100%;font-size:12px;border-collapse:collapse}.g-tbl td,.g-tbl th{padding:4px;border-bottom:1px solid var(--border);text-align:left}';
  document.head.appendChild(css);
  const modal = document.createElement('div');
  modal.className = 'modal-overlay'; modal.id = 'gamesModal';
  modal.innerHTML = '<div class="modal" style="max-width:540px;max-height:88vh;overflow:auto;"><div id="gBody"></div></div>';
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal && !st) modal.classList.remove('active'); });

  const act = a => socket.emit('g:act', { id: st.id, a });
  Object.assign(window, {
    openGames() { modal.classList.add('active'); socket.emit('g:list'); render(); },
    gNew: type => socket.emit('g:create', { type }),
    gJoin: id => socket.emit('g:join', { id }),
    gStart: () => socket.emit('g:start', { id: st.id }),
    gLeave() { socket.emit('g:leave', { id: st.id }); st = null; render(); socket.emit('g:list'); },
    gStop: () => act({ k: 'stop' }),
    gDrop: c => act({ k: 'drop', c }),
    gAns: el => act({ k: 'ans', cat: +el.dataset.c, v: el.value })
  });
  socket.on('g:tables', l => { tables = l; if (!st) render(); });
  socket.on('g:state', s => { st = s; if (s) { s._at = Date.now(); modal.classList.add('active'); } render(); });
  socket.on('connect', () => { if (modal.classList.contains('active')) socket.emit('g:list'); });
  setInterval(() => { const el = $g('gTimer'); if (el && st && st.g) el.textContent = Math.max(0, Math.ceil((st.g.ms - (Date.now() - st._at)) / 1000)); }, 500);

  const fill = () => { const g = st.g; $g('gFill').textContent = g.by ? '🛑 ' + g.by + ' gritou STOP!' : st.players.map((p, i) => p.name + ': ' + g.filled[i] + '/' + g.cats.length).join(' · '); };

  function stopUI() {
    const g = st.g;
    if (g.phase === 'play' || g.phase === 'closing') {
      return '<div style="display:flex;justify-content:space-between;align-items:center;"><div style="font-size:42px;font-weight:800;">' + g.letter + '</div><div>Rodada ' + g.round + '/' + g.rounds + ' · <b id="gTimer"></b>s</div></div>' +
        g.cats.map((c, i) => '<label style="font-size:12px;color:var(--text-secondary);">' + escapeHtml(c) + '</label><input class="g-in" maxlength="30" data-c="' + i + '" value="' + escapeHtml(g.mine[i] || '') + '" placeholder="' + g.letter + '…" oninput="gAns(this)">').join('') +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;"><span id="gFill" style="font-size:12px;"></span><button class="g-btn" onclick="gStop()">🛑 STOP!</button></div>' +
        '<p style="font-size:11px;color:var(--text-muted);">STOP só vale com todas as categorias preenchidas com a letra certa. Resposta única = 10 pts, repetida = 5.</p>';
    }
    const L = g.last;
    return '<p>Rodada ' + g.round + '/' + g.rounds + ' · letra <b>' + L.letter + '</b></p><div style="overflow:auto"><table class="g-tbl"><tr><th></th>' + g.cats.map(c => '<th>' + escapeHtml(c) + '</th>').join('') + '<th>+</th><th>Total</th></tr>' +
      L.rows.map((r, i) => '<tr><td>' + escapeHtml(r.name) + '</td>' + r.a.map(x => '<td>' + (x.ok ? '✅' : '❌') + ' ' + escapeHtml(x.v) + '</td>').join('') + '<td>' + r.pts + '</td><td>' + g.totals[i] + '</td></tr>').join('') + '</table></div>' +
      (g.phase === 'result' ? '<p style="font-size:12px;">Próxima rodada em instantes…</p>' : '');
  }
  function c4UI() {
    const g = st.g, msg = st.status === 'over' ? '' : (g.turn === st.you ? '👉 Sua vez!' : 'Vez do adversário…');
    return '<p>' + msg + ' <span style="font-size:12px;">Você: ' + (st.you === 0 ? '🔴' : '🟡') + '</span></p><div class="g-board">' +
      g.board.map(row => row.map((v, c) => '<div class="g-cell ' + (v ? 'p' + v : '') + '" onclick="gDrop(' + c + ')"></div>').join('')).join('') + '</div>';
  }
  function render() {
    const b = $g('gBody');
    if (st && st.type === 'stop' && st.g && ['play', 'closing'].includes(st.g.phase)) {
      const key = st.id + 'p' + st.g.round;
      if (key === lastKey && $g('gFill')) return fill();
      lastKey = key;
    } else lastKey = '';
    if (!st) {
      b.innerHTML = '<h3>🎮 Salas de jogo</h3><p style="color:var(--text-secondary);font-size:13px;">Crie uma mesa ou entre numa aberta. Vencer dá +30 pontos no ranking; participar, +5.</p>' +
        '<div style="display:flex;gap:8px;margin:12px 0;"><button class="g-btn" onclick="gNew(\'stop\')">+ Stop (2–8)</button><button class="g-btn" onclick="gNew(\'c4\')">+ Ligue 4 (2)</button></div>' +
        (tables.map(t => '<div class="g-row"><span><b>' + escapeHtml(t.name) + '</b> · mesa de ' + escapeHtml(t.host) + ' · ' + t.n + '/' + t.max + '</span><button class="g-btn" onclick="gJoin(\'' + t.id + '\')">Entrar</button></div>').join('') || '<p style="color:var(--text-muted);font-size:13px;">Nenhuma mesa aberta.</p>') +
        '<div class="modal-actions"><button class="btn-secondary" onclick="document.getElementById(\'gamesModal\').classList.remove(\'active\')">Fechar</button></div>';
      return;
    }
    let h = '<h3>' + escapeHtml(st.name) + '</h3><div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">' + st.players.map(p => escapeHtml(p.avatar) + ' ' + escapeHtml(p.name) + (p.left ? ' (saiu)' : '')).join(' · ') + '</div>';
    if (st.status === 'lobby') h += '<p>Aguardando jogadores (' + st.players.length + '/' + st.max + ')…</p>' + (st.host ? '<button class="g-btn" ' + (st.players.length < st.min ? 'disabled' : '') + ' onclick="gStart()">Começar</button>' : '<p style="font-size:13px;">Aguarde o anfitrião começar.</p>');
    else h += st.type === 'stop' ? stopUI() : c4UI();
    if (st.status === 'over') h += '<p style="margin-top:10px;"><b>🏁 ' + (st.result.winners.length ? 'Vencedor: ' + st.result.winners.map(escapeHtml).join(', ') : 'Empate!') + '</b></p>';
    b.innerHTML = h + '<div class="modal-actions"><button class="g-btn sec" onclick="gLeave()">Sair da mesa</button></div>';
    if ($g('gFill')) fill();
  }
})();
