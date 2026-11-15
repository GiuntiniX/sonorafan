/* SonoraFan 50.0 — jornadas 46→50: descoberta real, Club no perfil e mobile (sem Modo Foco). */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const state = {filter: 'all', order: 'popular'};
  let lastRooms = null;
  let clubSnapshot = null;
  let clubFetchedAt = 0;
  let refreshTimeout = null;
  let messageTimeout = null;

  function currentAccount() {
    try { return typeof currentUser !== 'undefined' && currentUser?.email ? currentUser.email : null; }
    catch { return null; }
  }
  function readStyles() {
    const email = currentAccount();
    if (!email) return [];
    try {
      const profile = JSON.parse(localStorage.getItem('sf43_profile_' + email) || '{}');
      return Array.isArray(profile.styles) ? profile.styles.filter(x => typeof x === 'string') : [];
    } catch { return []; }
  }
  function norm(value) {
    return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  }
  function words(room) { return norm([room.name, room.description, room.slug, room.genre].filter(Boolean).join(' ')); }
  function listeners(room) { return Math.max(0, Number(room.listenerCount) || 0); }
  function matchedVibe(room, styles) {
    const roomText = words(room);
    return styles.some(s => roomText.includes(norm(s)));
  }
  function updateToolbar() {
    document.querySelectorAll('[data-sf50-filter]').forEach(button => {
      const active = button.dataset.sf50Filter === state.filter;
      button.classList.toggle('is-active',active);
      button.setAttribute('aria-pressed', String(active));
    });
    const order = $('sf50RoomOrder');
    if (order && order.value !== state.order) order.value = state.order;
  }
  function prepareRooms(rooms) {
    if (!Array.isArray(rooms)) return [];
    lastRooms = rooms;
    const styles = readStyles();
    let visible = rooms.slice();
    const hint = $('sf50RoomHint');
    if (hint) hint.textContent = '';
    if (state.filter === 'live') visible = visible.filter(r => r.isPlaying === true);
    if (state.filter === 'vibe') {
      if (styles.length) {
        visible = visible.filter(r => matchedVibe(r,styles));
        if (hint) hint.textContent = `Afinidade com seus estilos: ${styles.join(', ')}. A combinação considera o nome e a descrição das salas.`;
      } else if (hint) {
        hint.textContent = 'Escolha seus estilos no perfil para receber uma seleção por afinidade. Mostrando todas as salas por enquanto.';
      }
    }
    visible.sort((a,b) => {
      if(state.order==='name') return norm(a.name).localeCompare(norm(b.name),'pt');
      if(state.order==='active') return Number(!!b.isPlaying)-Number(!!a.isPlaying)||listeners(b)-listeners(a);
      return listeners(b)-listeners(a)||Number(!!b.isPlaying)-Number(!!a.isPlaying);
    });
    return visible;
  }
  function afterRooms(all,visible) {
    const count = $('sf10RoomsCount');
    if (count && Array.isArray(visible) && (state.filter !== 'all')) {
      count.textContent = `${visible.length} de ${all.length} ${all.length===1?'sala':'salas'}`;
    }
    const heading = $('sf10RoomsHeading');
    if (heading && state.filter === 'live') heading.textContent = 'Salas tocando agora';
    if (heading && state.filter === 'vibe') heading.textContent = 'Salas para sua vibe';
  }
  function rerenderRooms() {
    updateToolbar();
    const grid = $('roomGrid');
    if (!grid) return;
    if (typeof loadRooms === 'function') {
      if(refreshTimeout) clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => loadRooms(),100);
    }
  }
  function resetFilters() { state.filter = 'all'; rerenderRooms(); }
  window.sf50PrepareRooms = prepareRooms;
  window.sf50AfterRooms = afterRooms;
  window.sf50ResetFilters = resetFilters;

  async function loadProfileClub(force) {
    const level = $('sf50ProfileLevel');
    if(!level) return;
    const email = currentAccount();
    if(!email) { level.textContent='Entre na sua conta para acompanhar o Club'; return; }
    const now = Date.now();
    if (!force && clubSnapshot && now - clubFetchedAt < 45000) {
      renderProfileClub(clubSnapshot);
      return;
    }
    const msg = $('sf50ProfileMessage');
    if(msg) msg.textContent = 'Buscando XP e missões no SonoraFan Club...';
    try {
      const response = await fetch('/api/gamification/me',{credentials:'include',headers:{Accept:'application/json'}});
      const data = await response.json();
      if(!response.ok) throw new Error(data.error||'Não foi possível carregar o Club');
      clubSnapshot = data;
      clubFetchedAt = Date.now();
      if ($('sf43ProfileModal')?.classList.contains('active')) renderProfileClub(data);
    } catch(err) {
      if(msg) msg.textContent='Não foi possível consultar o Club agora. Seus pontos permanecem salvos no servidor.';
      const xp = $('sf50ProfileXp');
      if(xp) xp.textContent='—';
    }
  }
  function renderProfileClub(data) {
    const level = data?.level || {};
    const xp = Math.max(0,Number(data.xp ?? data.points)||0);
    const progress = Math.max(0,Math.min(100,Number(level.progress)||0));
    const missions = Array.isArray(data.missions)?data.missions:[];
    const done = missions.filter(m=>m.claimed).length;
    const text = $('sf50ProfileLevel');
    if(text) text.textContent = `${level.icon || '🎧'} ${level.name || 'Sua jornada musical'}`;
    const xpEl=$('sf50ProfileXp'); if(xpEl) xpEl.textContent=new Intl.NumberFormat('pt-BR').format(xp);
    const msg=$('sf50ProfileMessage');
    if(msg) msg.textContent=level.next==null?'Você alcançou o nível máximo atual.':`Nível ${level.number||1} · próximo marco aos ${new Intl.NumberFormat('pt-BR').format(Number(level.next)||0)} XP`;
    const bar=$('sf50ProfileBar'); if(bar) bar.style.width=progress+'%';
    const region=$('sf50ProfileBar')?.parentElement;
    if(region) region.setAttribute('aria-valuenow',String(progress));
    const missionsEl=$('sf50ProfileMissions');
    if(missionsEl) missionsEl.textContent=`${done}/${missions.length} missões concluídas · medalhas no Club`;
  }
  function shareMyVibe() {
    const email = currentAccount();
    let preferred=[];
    if(email) preferred=readStyles();
    const name=$('sf43ProfileName')?.textContent?.trim() || 'Ouvinte SonoraFan';
    const level=clubSnapshot?.level?.name || 'Minha jornada musical';
    const copy=`🎧 ${name} · SonoraFan\n🏅 ${level}\n♫ Minha vibe: ${preferred.length?preferred.join(', '):'música colaborativa'}\n✦ Toda pessoa é DJ!`;
    navigator.clipboard?.writeText(copy).then(()=>announce('Cartão musical copiado!')).catch(()=>announce('Não foi possível copiar agora.'));
  }
  function announce(message) {
    const box=$('sf50Status'); if(!box) return;
    box.textContent=message;
    box.classList.add('is-visible');
    if(messageTimeout) clearTimeout(messageTimeout);
    messageTimeout=setTimeout(()=>box.classList.remove('is-visible'),2500);
  }
  function initializeProfile() {
    const original=window.sf5OpenProfile;
    if(typeof original==='function' && !original.__sf50Wrapped) {
      const wrapper=function(...args) {
        const result=original.apply(this,args);
        Promise.resolve().then(()=>loadProfileClub(false));
        return result;
      };
      wrapper.__sf50Wrapped=true;
      window.sf5OpenProfile=wrapper;
    }
    const container=document.querySelector('#sf43ProfileModal .sf43-quick-actions');
    if(container && !container.querySelector('.sf50-share-profile')) {
      const button=document.createElement('button');
      button.type='button';
      button.className='sf50-share-profile';
      button.textContent='↗ Compartilhar minha vibe';
      button.addEventListener('click',shareMyVibe);
      container.appendChild(button);
    }
    // XP may change while a profile is open. Update when the modal becomes visible.
    const profile=$('sf43ProfileModal');
    if(profile && typeof MutationObserver!=='undefined') {
      let wasOpen=profile.classList.contains('active');
      new MutationObserver(()=>{
        const open=profile.classList.contains('active');
        if(open && !wasOpen) loadProfileClub(false);
        wasOpen=open;
      }).observe(profile,{attributes:true,attributeFilter:['class']});
    }
  }
  function init() {
    document.querySelectorAll('[data-sf50-filter]').forEach(button=>{
      button.addEventListener('click',()=>{state.filter=button.dataset.sf50Filter || 'all';rerenderRooms();});
    });
    $('sf50RoomOrder')?.addEventListener('change',e=>{state.order=e.target.value||'popular';rerenderRooms();});
    updateToolbar();
    try {localStorage.removeItem('sf50-focus');} catch {}
    initializeProfile();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
