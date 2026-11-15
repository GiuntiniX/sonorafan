/* SonoraFan 56.0 — convite leve e responsivo no espaço livre da playlist. */
(function () {
  'use strict';
  function getItems(list) {
    return Array.from(list.children).filter(el => el.classList.contains('queue-item'));
  }
  function openMusicSearch() {
    const input = document.getElementById('songUrl');
    if (!input) return;
    if (typeof window.sf34FindSong === 'function') {
      try { window.sf34FindSong(); } catch (_) { /* manter foco abaixo */ }
    } else if (window.innerWidth <= 768 && typeof window.setTab === 'function') {
      try { window.setTab('player'); } catch (_) { /* manter foco abaixo */ }
    }
    window.setTimeout(() => {
      try { input.scrollIntoView({block:'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}); }
      catch (_) { input.scrollIntoView(); }
      input.focus({preventScroll:true});
    }, 80);
  }
  function init() {
    const list = document.getElementById('queueList');
    if (!list) return;
    let filler = null;
    function update() {
      const n = getItems(list).length;
      const state = !n ? 'empty' : n < 3 ? 'open' : 'full';
      if (list.dataset.sf56State !== state) list.dataset.sf56State = state;
      // renderQueue() recria o conteúdo após cada mudança de fila ou votação.
      filler = Array.from(list.children).find(el => el.classList.contains('sf56-next-space')) || null;
      if (state !== 'open') {
        filler?.remove();
        filler = null;
        return;
      }
      if (!filler) {
        filler = document.createElement('div');
        filler.className = 'sf56-next-space';
        filler.setAttribute('role', 'group');
        filler.setAttribute('aria-label', 'Adicionar a próxima música');
        const note = document.createElement('span');
        note.className = 'sf56-note';
        note.setAttribute('aria-hidden','true');
        note.textContent = '♫';
        const title = document.createElement('strong');
        title.className = 'sf56-next-title';
        const desc = document.createElement('p');
        desc.className = 'sf56-next-description';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = '+ Adicionar música';
        btn.addEventListener('click', openMusicSearch);
        filler.append(note,title,desc,btn);
        list.appendChild(filler);
      }
      const title = n === 1 ? 'A próxima escolha pode ser sua' : 'Mais uma música para continuar';
      const desc = n === 1 ? 'Todos podem colaborar com a sequência.' : 'Que tal completar a fila com sua vibe?';
      const titleNode = filler.querySelector('.sf56-next-title');
      const descNode = filler.querySelector('.sf56-next-description');
      if (titleNode && titleNode.textContent !== title) titleNode.textContent = title;
      if (descNode && descNode.textContent !== desc) descNode.textContent = desc;
    }
    const observer = new MutationObserver(update);
    observer.observe(list, {childList:true});
    update();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
