/* Minha Jornada 45.0 — exibe apenas dados reais das APIs de gamificação. */
(function () {
  'use strict';
  const el = id => document.getElementById(id);
  const clean = input => String(input == null ? '' : input)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const fmt = n => new Intl.NumberFormat('pt-BR').format(Number(n) || 0);
  const isOpen = () => !!el('sf45ClubModal')?.classList.contains('active');
  let requestVersion = 0;
  let liveSnapshot = null;
  let leaderboardItems = [];

  async function jsonGet(url) {
    const response = await fetch(url, { credentials: 'include', headers: { Accept: 'application/json' } });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Não foi possível carregar os dados.');
    return result;
  }
  function close() {
    el('sf45ClubModal')?.classList.remove('active');
    requestVersion++;
  }
  function showError(message) {
    const content = el('sf45ClubContent');
    if (!content) return;
    content.innerHTML = `<div class="sf45-error">${clean(message)}<button type="button" id="sf45TryAgain">Tentar novamente</button></div>`;
    el('sf45TryAgain')?.addEventListener('click', load);
  }
  function renderMission(m) {
    const target = Math.max(1, Number(m.target) || 1);
    const progress = Math.max(0, Math.min(target, Number(m.progress) || 0));
    const done = !!m.claimed;
    return `<article class="sf45-mission ${done ? 'sf45-done' : ''}">
      <div class="sf45-mission-top"><span class="sf45-mission-icon">${clean(m.icon || '♫')}</span>
        <div class="sf45-mission-copy"><strong>${clean(m.name)}</strong><small>${clean(m.description)}</small></div>
        <span class="sf45-mission-xp">${done ? '✓' : '+'}${done ? ' Concluída' : `${fmt(m.reward)} XP`}</span>
      </div>
      <div class="sf45-progress" role="progressbar" aria-label="Progresso de ${clean(m.name)}" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="${target}"><span style="width:${Math.round(progress / target * 100)}%"></span></div>
      <div class="sf45-mission-state"><span>${done ? 'Recompensa resgatada automaticamente' : 'Missão em andamento'}</span><span>${progress}/${target}</span></div>
    </article>`;
  }
  function renderAchievement(a,lifetime) {
    const current=Math.max(0,Number(lifetime?.[a.field])||0);
    const target=Math.max(0,Number(a.at)||0);
    const remaining=Math.max(0,target-current);
    const detail=a.unlocked?'Conquistada · '+a.description:
      (target&&remaining?'Faltam '+remaining+' '+(remaining===1?'ação':'ações')+' · ':'')+a.description;
    return `<article class="sf45-achievement ${a.unlocked ? '' : 'sf45-locked'}">
      <span class="sf45-achievement-emoji">${clean(a.unlocked ? (a.icon || '🏅') : '🔒')}</span>
      <strong>${clean(a.name)}</strong><small>${clean(detail)}</small>
    </article>`;
  }
  function renderLeaderboard(items) {
    return items.length ? items.map((u, i) => `<div class="sf45-ranking-row">
      <span class="sf45-rank-number">${['🥇','🥈','🥉'][i] || (i+1)+'.'}</span>
      <span class="sf45-ranking-user"><strong>${clean(u.avatar || '🎧')} ${clean(u.nome || 'Ouvinte')}</strong>
        <small>${clean(u.level?.name || 'Ouvinte')}</small></span>
      <span class="sf45-rank-xp">${fmt(u.points)} XP</span>
    </div>`).join('') : '<div class="sf45-empty">O ranking aparece conforme a comunidade participa.</div>';
  }
  function renderRecent(items) {
    return items.length ? items.slice(0, 7).map(r => `<div class="sf45-recent-row">
      <span class="sf45-recent-name"><strong>${clean(r.name)}</strong><small>${r.time ? clean(new Date(r.time).toLocaleDateString('pt-BR', {day:'2-digit',month:'2-digit'})) : 'Atividade musical'}</small></span>
      <span class="sf45-recent-xp">+${fmt(r.xp)} XP</span>
    </div>`).join('') : '<div class="sf45-empty">Suas atividades com XP aparecerão aqui. Os pontos antigos já foram preservados!</div>';
  }
  function render() {
    if (!liveSnapshot || !isOpen()) return;
    const data = liveSnapshot, level = data.level || { number: 1, name:'Ouvinte', icon:'🎧', progress:0 };
    const missions = Array.isArray(data.missions) ? data.missions : [];
    const badges = Array.isArray(data.badges) ? data.badges : [];
    const achievements = Array.isArray(data.achievements) ? data.achievements : [];
    const rankedAchievements=achievements.slice().sort((a,b)=>Number(b.unlocked)-Number(a.unlocked) ||
      String(a.name||'').localeCompare(String(b.name||''),'pt-BR'));
    const newBadges = new Set(achievements.map(x => x.name));
    const legacyBadges = badges.filter(x => !newBadges.has(x));
    const content = el('sf45ClubContent');
    if (!content) return;
    content.innerHTML = `
      <section class="sf45-hero">
        <div><span class="sf45-label">NÍVEL ${fmt(level.number)} · SUA IDENTIDADE MUSICAL</span>
          <div class="sf45-level">${clean(level.icon)} ${clean(level.name)}</div>
          <div class="sf45-sub">${level.next === null ? 'Você chegou ao nível mais alto!' : `Próximo nível aos ${fmt(level.next)} XP`}</div>
          <div class="sf45-progress" role="progressbar" aria-label="Progresso para o próximo nível" aria-valuenow="${Number(level.progress)||0}" aria-valuemin="0" aria-valuemax="100"><span style="width:${Number(level.progress)||0}%"></span></div>
          <div class="sf45-progress-caption"><span>Desde ${fmt(level.min)} XP</span><span>${fmt(level.progress)}% concluído</span></div>
        </div>
        <div class="sf45-xp"><strong>${fmt(data.xp)}</strong><span>XP acumulado</span></div>
      </section>
      <div class="sf45-sections">
        <section class="sf45-section">
          <div class="sf45-section-title"><h4>🎯 Missões ativas</h4><small>Diárias e semanais · automáticas</small></div>
          <div class="sf45-mission-list">${missions.map(renderMission).join('')}</div>
        </section>
        <section class="sf45-section">
          <div class="sf45-section-title"><h4>🏅 Medalhas</h4><small>${achievements.filter(a=>a.unlocked).length} de ${achievements.length} novas</small></div>
          <div class="sf45-achievements">${rankedAchievements.map(a=>renderAchievement(a,data.lifetime)).join('')}</div>
          <p class="sf45-legacy"><strong>Medalhas históricas preservadas:</strong> ${legacyBadges.length ? legacyBadges.map(clean).join(' · ') : 'Você está começando sua coleção.'}</p>
        </section>
      </div>
      <div class="sf45-bottom">
        <section class="sf45-section"><div class="sf45-section-title"><h4>🏆 Ranking musical</h4><small>XP total · contas reais</small></div><div class="sf45-ranking-list">${renderLeaderboard(leaderboardItems)}</div></section>
        <section class="sf45-section"><div class="sf45-section-title"><h4>✨ Últimas conquistas</h4><small>Atividades recentes</small></div><div class="sf45-recent-list">${renderRecent(data.recent || [])}</div></section>
      </div>
    `;
  }
  async function load() {
    if (!isOpen()) return;
    const token = ++requestVersion;
    const content = el('sf45ClubContent');
    if (content && !liveSnapshot) content.innerHTML = '<p class="sf45-loading">Carregando seu progresso musical…</p>';
    try {
      const result = await Promise.allSettled([
        jsonGet('/api/gamification/me'),
        jsonGet('/api/gamification/leaderboard')
      ]);
      if (token !== requestVersion || !isOpen()) return;
      if (result[0].status !== 'fulfilled') throw result[0].reason;
      liveSnapshot = result[0].value;
      leaderboardItems = result[1].status === 'fulfilled' ? result[1].value.items || [] : [];
      render();
    } catch (e) { if (token === requestVersion) showError(e.message || 'Não foi possível carregar o Minha Jornada.'); }
  }
  function open() {
    // Compatibilidade: todos os atalhos antigos abrem Minha Jornada dentro do perfil,
    // sem uma segunda janela nem perder a API de gamificação histórica.
    if(typeof window.sf112OpenProfile==='function'){
      el('sf45ClubModal')?.classList.remove('active');
      window.sf112OpenProfile('achievements');
      return;
    }
    const modal = el('sf45ClubModal');
    if (!modal) return;
    modal.classList.add('active');
    el('sf45ClubScroll')?.scrollTo({ top:0, behavior:'instant' });
    load();
  }
  window.sf45OpenClub = open;
  window.sf45CloseClub = close;
  document.addEventListener('DOMContentLoaded', () => {
    el('sf45ClubRefresh')?.addEventListener('click', load);
    el('sf45ClubModal')?.addEventListener('click', e => { if (e.target.id === 'sf45ClubModal') close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen()) { e.stopPropagation(); close(); } });
    // Socket.IO já está presente na plataforma; eventos de XP vêm exclusivamente do servidor.
    if (typeof socket !== 'undefined') socket.on('gamificationUpdate', update => {
      liveSnapshot = update;
      render();
      const rewards = (update.rewards || []).filter(r => r.name).slice(0, 2);
      if (rewards.length && typeof toast === 'function') {
        toast(rewards.map(r => `${r.name}${r.xp ? ` (+${r.xp} XP)` : ''}`).join(' · '), 'success');
      }
    });
  });
})();
