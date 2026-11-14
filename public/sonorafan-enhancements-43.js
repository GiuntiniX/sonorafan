(function () {
  const STYLE_OPTIONS = ['Rock', 'Pop', 'Indie', 'Eletrônica', 'Funk', 'Rap', 'MPB', 'Pagode'];
  const TOUR = {
    lobby: [
      { sel: '.sf33-banner', text: 'Esse é o destaque principal da descoberta: uma entrada mais visual e direta para o universo SonoraFan.' },
      { sel: '.sf32-search-wrap', text: 'Use a busca para encontrar salas e estilos. Agora ela está mais simples e com um único botão para limpar.' },
      { sel: '.sf32-genres', text: 'Aqui você filtra por estilo musical com um clique.' },
      { sel: '.sf32-rooms-title', text: 'As salas disponíveis vêm primeiro para você entrar rápido sem precisar rolar demais.' },
      { sel: '#roomGrid', text: 'Esses cards mostram as salas em tempo real com o que está tocando no momento.' },
      { sel: '.sf42-explore-more', text: 'Mais abaixo ficam as salas prontas e os eventos da comunidade, como descoberta complementar.' }
    ],
    room: [
      { sel: '.player-section', tab: 'player', text: 'Aqui fica o player principal com o vídeo maior e mais espaço útil.' },
      { sel: '.sf30-player-actions', tab: 'player', text: 'Favoritar, pular e volume continuam próximos do vídeo para uma experiência mais prática.' },
      { sel: '.add-song-area', tab: 'player', text: 'Todo mundo é DJ: procure no YouTube ou cole um link para entrar na fila colaborativa.' },
      { sel: '.queue-column', tab: 'queue', text: 'Nesta coluna você acompanha a fila e as próximas faixas da sala.' },
      { sel: '.premium-presence', tab: 'chat', text: 'Agora a presença mostra os nicknames de quem está ouvindo, deixando a sala mais humana.' },
      { sel: '.chat-column', tab: 'chat', text: 'O chat continua sendo o centro da interação da comunidade enquanto a música rola.' }
    ]
  };

  const esc = (v) => String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const $ = (id) => document.getElementById(id);

  function profileKey() {
    return currentUser?.email || 'guest';
  }

  function readProfileStore() {
    try {
      return JSON.parse(localStorage.getItem('sf43_profile_' + profileKey()) || '{}');
    } catch (e) {
      return {};
    }
  }

  function writeProfileStore(data) {
    localStorage.setItem('sf43_profile_' + profileKey(), JSON.stringify(data || {}));
  }

  function getDisplayName() {
    const store = readProfileStore();
    return store.displayName || currentUser?.nome || myName || 'Convidado';
  }

  function getSelectedStyles() {
    const store = readProfileStore();
    return Array.isArray(store.styles) && store.styles.length ? store.styles : ['Indie', 'MPB'];
  }

  function updateSearchClear() {
    const input = $('sf10RoomQuery');
    const clear = $('sf32SearchClear');
    if (!input || !clear) return;
    clear.hidden = !input.value;
    clear.textContent = '✕';
  }

  function setupSearchClear() {
    const input = $('sf10RoomQuery');
    const clear = $('sf32SearchClear');
    if (!input || !clear) return;
    const sync = () => updateSearchClear();
    input.addEventListener('input', sync);
    clear.addEventListener('click', function () {
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus();
      sync();
    });
    sync();
  }

  function renderProfile() {
    const modal = $('sf43ProfileModal');
    if (!modal) return;
    const store = readProfileStore();
    const displayName = getDisplayName();
    const initialsHandle = '@' + displayName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '').replace(/^$/, 'sonorafan');
    const bio = store.bio || 'Curto descobrir salas novas, ouvir gente boa e colaborar com a próxima música da fila.';
    const styles = getSelectedStyles();
    const avatar = currentUser?.avatar || myAvatar || '♫';
    const favorites = Array.isArray(myFavorites) ? myFavorites.length : 0;
    const badges = Array.isArray(myBadges) ? myBadges.length : 0;
    const visits = (() => {
      try {
        return JSON.parse(localStorage.getItem('sf43_room_visits_' + profileKey()) || '[]').length;
      } catch (e) {
        return 0;
      }
    })();

    $('sf43ProfileAvatar').textContent = avatar;
    $('sf43ProfileName').textContent = displayName;
    $('sf43ProfileHandle').textContent = initialsHandle;
    $('sf43ProfilePoints').textContent = `${myPoints || 0} pts`;
    $('sf43ProfileRole').textContent = currentUser?.email === 'admin@sonora.com' ? 'Admin da plataforma' : 'Membro da comunidade';
    $('sf43ProfileStatus').textContent = currentRoom ? 'Ao vivo em uma sala' : 'Pronto para entrar na vibe';
    $('sf43DisplayNameInput').value = displayName;
    $('sf43BioInput').value = bio;
    $('sf43StatFavorites').textContent = favorites;
    $('sf43StatRooms').textContent = visits;
    $('sf43StatBadges').textContent = badges;
    $('sf43SummaryNote').textContent = styles.length ? `Sua vibe atual passa por ${styles.slice(0, 2).join(' e ')}.` : 'Escolha estilos para personalizar sua presença.';

    const stylesWrap = $('sf43StyleChips');
    stylesWrap.innerHTML = STYLE_OPTIONS.map(style => `
      <button type="button" class="sf43-style-chip ${styles.includes(style) ? 'is-on' : ''}" data-style="${esc(style)}">${esc(style)}</button>
    `).join('');
    stylesWrap.querySelectorAll('.sf43-style-chip').forEach(btn => {
      btn.addEventListener('click', () => btn.classList.toggle('is-on'));
    });
  }

  function openProfile() {
    renderProfile();
    $('sf43ProfileModal')?.classList.add('active');
    document.body.classList.add('sf43-modal-open');
  }

  function closeProfile() {
    $('sf43ProfileModal')?.classList.remove('active');
    document.body.classList.remove('sf43-modal-open');
  }

  function saveProfile() {
    const displayName = ($('sf43DisplayNameInput')?.value || '').trim() || currentUser?.nome || myName || 'Usuário';
    const bio = ($('sf43BioInput')?.value || '').trim();
    const styles = [...document.querySelectorAll('#sf43StyleChips .sf43-style-chip.is-on')].map(btn => btn.dataset.style).filter(Boolean);
    const data = readProfileStore();
    data.displayName = displayName;
    data.bio = bio;
    data.styles = styles;
    writeProfileStore(data);

    if (currentUser) currentUser.nome = displayName;
    myName = displayName;
    const userDisplay = $('userDisplayName');
    if (userDisplay) userDisplay.textContent = displayName;
    const userDisplayMobile = $('userDisplayNameMobile');
    if (userDisplayMobile) userDisplayMobile.textContent = displayName;
    if (typeof updateUserInfo === 'function') {
      try { updateUserInfo(); } catch (e) {}
    }
    renderProfile();
    if (typeof toast === 'function') toast('Perfil atualizado!', 'success');
    closeProfile();
  }

  function trackRoomVisit() {
    if (!currentRoom) return;
    const key = 'sf43_room_visits_' + profileKey();
    let visits = [];
    try { visits = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) {}
    if (!visits.includes(currentRoom)) {
      visits.push(currentRoom);
      localStorage.setItem(key, JSON.stringify(visits.slice(-40)));
    }
  }

  function roleBadge(role) {
    if (role === 'owner') return '👑';
    if (role === 'admin') return '🛡️';
    if (role === 'mod') return '🔧';
    return '';
  }

  function renderPresence(users) {
    const list = Array.isArray(users) ? users : [];
    const presence = $('premiumPresence');
    const listenersBody = $('sf5ListenersBody');
    const count = $('sf5ListenersCount');
    if (count) count.textContent = String(list.length);

    if (presence) {
      presence.innerHTML = list.length
        ? list.map(u => `<span class="sf43-presence-pill ${u.name === myName ? 'is-me' : ''}"><b>${esc(u.name)}</b>${u.role ? `<small>${roleBadge(u.role)}</small>` : ''}</span>`).join('')
        : '<span class="premium-presence-empty">Entre na vibe com a galera</span>';
    }

    if (listenersBody) {
      listenersBody.innerHTML = list.length
        ? list.map(u => `<div class="sf43-listener-item"><strong>${esc(u.name)}</strong><span>${u.name === myName ? 'Você está ouvindo agora' : 'Na sala agora'} ${u.role ? `<em>${roleBadge(u.role)}</em>` : ''}</span></div>`).join('')
        : '<div class="sf43-listener-empty">Ninguém por aqui ainda. Chame a galera para ouvir junto.</div>';
    }
  }

  function patchUserPopup() {
    if (typeof window.renderUsersPop !== 'function' && typeof renderUsersPop !== 'function') return;
    const fn = function () {
      const me = roomUsers.find(u => u.name === myName);
      const mine = me ? (ROLE_RANK[me.role] || 0) : (amIAdmin ? 2 : amIMod ? 1 : 0);
      $('usersPop').innerHTML = `<div class="cfg-lbl" style="margin-top:0">👥 ${roomUsers.length} na sala</div>` + roomUsers.map(u => {
        const can = mine >= 1 && u.name !== myName && (ROLE_RANK[u.role] || 0) < mine;
        const b = (a, m, t, l) => `<button type="button" data-name="${esc(u.name)}" title="${t}" onclick="modAct(this.dataset.name,'${a}',${m})">${l}</button>`;
        return `<div class="up-row"><span><strong>${esc(u.name)}</strong> ${ROLE_ICON[u.role] || ''}${u.muted ? ' 🔇' : ''}</span>${can ? `<span class="up-act">${u.muted ? b('unmute', 0, 'Liberar', '🔊') : b('mute', 10, 'Silenciar', '🔇')}${b('kick', 0, 'Expulsar', '👢')}</span>` : ''}</div>`;
      }).join('');
    };
    window.renderUsersPop = fn;
    try { renderUsersPop = fn; } catch (e) {}
  }

  let tourMode = 'lobby';
  let tourIndex = -1;
  let tourSteps = TOUR.lobby;

  function activeTourMode() {
    return document.getElementById('screen-room')?.classList.contains('active') ? 'room' : 'lobby';
  }

  function endTour43() {
    const spot = $('tourSpot');
    const tip = $('tourTip');
    if (spot) spot.style.display = 'none';
    if (tip) tip.style.display = 'none';
    tourIndex = -1;
  }

  function showTourStep() {
    const st = tourSteps[tourIndex];
    if (!st) return endTour43();
    if (st.tab && typeof setTab === 'function') setTab(st.tab);
    setTimeout(() => {
      const el = document.querySelector(st.sel);
      if (!el) return endTour43();
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      const r = el.getBoundingClientRect();
      const spot = $('tourSpot');
      const tip = $('tourTip');
      Object.assign(spot.style, {
        display: 'block',
        left: Math.max(8, r.left - 8) + 'px',
        top: Math.max(8, r.top - 8) + 'px',
        width: Math.min(innerWidth - 16, r.width + 16) + 'px',
        height: Math.min(innerHeight - 16, r.height + 16) + 'px'
      });
      $('tourText').textContent = st.text;
      $('tourBtn').textContent = tourIndex === tourSteps.length - 1 ? 'Entendi!' : 'Próximo';
      $('tourSkip').textContent = 'Pular';
      tip.style.display = 'block';
      requestAnimationFrame(() => {
        const tw = Math.min(320, innerWidth - 24);
        const th = tip.offsetHeight || 120;
        const prefersBottom = r.bottom + th + 24 < innerHeight;
        const top = prefersBottom ? r.bottom + 14 : Math.max(12, r.top - th - 14);
        const left = Math.max(12, Math.min(r.left, innerWidth - tw - 12));
        tip.style.top = top + 'px';
        tip.style.left = left + 'px';
      });
    }, 140);
  }

  function startTour43(mode, force) {
    tourMode = mode || activeTourMode();
    tourSteps = TOUR[tourMode] || TOUR.lobby;
    tourIndex = 0;
    showTourStep();
    if (!force && currentUser?.email) {
      localStorage.setItem('sf43_tour_seen_' + tourMode + '_' + currentUser.email, '1');
    }
  }

  function nextTour43() {
    tourIndex += 1;
    if (tourIndex >= tourSteps.length) return endTour43();
    showTourStep();
  }

  function maybeTour(mode) {
    if (!currentUser?.email) return;
    const key = 'sf43_tour_seen_' + mode + '_' + currentUser.email;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
    startTour43(mode, false);
  }

  function hookEvents() {
    window.sf43CloseProfile = closeProfile;
    window.sf43SaveProfile = saveProfile;
    window.sf5OpenProfile = openProfile;
    window.openTutorial = function () { startTour43(activeTourMode(), true); };
    window.sf29StartTour = function (mode) { startTour43(mode || activeTourMode(), true); };
    window.sf29MaybeRoom = function () { maybeTour('room'); };
    window.sf29MaybeWelcome = function () { maybeTour('lobby'); };
    window.tourNext = nextTour43;
    window.endTour = endTour43;
    window.premiumUsers = function (users) { renderPresence(users); };

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeProfile();
    });
    $('sf43ProfileModal')?.addEventListener('click', function (e) {
      if (e.target === this) closeProfile();
    });
  }

  function init() {
    setupSearchClear();
    patchUserPopup();
    hookEvents();
    renderPresence([]);
    setInterval(trackRoomVisit, 2500);
    const query = $('sf10RoomQuery');
    if (query) query.setAttribute('spellcheck', 'false');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
