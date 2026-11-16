/* SonoraFan 106 — room tools in the now-playing footer on notebooks/desktops.
 * Move the ORIGINAL nodes: their IDs, access controls and listeners remain intact.
 * Under 1025px restore to the header, where controls remain available in every tab.
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const ids = ['cfgBtn', 'sf88RoomThemeButton', 'sf64RoomSidebarToggle',
    'adminBtnRoom', 'adminBadge'];
  const markers = new Map();
  const desktop = window.matchMedia('(min-width: 1025px)');
  let mini = null, tools = null, room = null;

  function init() {
    room = $('screen-room');
    mini = $('premiumMiniPlayer');
    const header = room?.querySelector('.header');
    if (!room || !mini || !header) return;
    // Leave stable placeholders so mobile restoration preserves the exact order.
    for (const id of ids) {
      const node = $(id);
      if (!node?.parentNode) continue;
      const marker = document.createComment('sf106 original ' + id);
      node.parentNode.insertBefore(marker, node);
      markers.set(id, marker);
    }
    tools = document.createElement('div');
    tools.id = 'sf106RoomTools';
    tools.className = 'sf106-room-tools';
    tools.setAttribute('role', 'group');
    tools.setAttribute('aria-label', 'Configurações e administração da sala');
    const live = mini.querySelector('.premium-mini-live');
    if (live) mini.insertBefore(tools, live);
    else mini.appendChild(tools);
    const move = () => {
      // v115: the redesigned room owns its top bar; never move its controls to the old footer.
      const shouldRelocate = desktop.matches && !room.classList.contains('sf113-room');
      room.classList.toggle('sf106-footer-tools', shouldRelocate);
      for (const id of ids) {
        const node = $(id), marker = markers.get(id);
        if (!node || !marker?.parentNode) continue;
        if (shouldRelocate && node.parentNode !== tools) tools.appendChild(node);
        else if (!shouldRelocate && node.parentNode === tools)
          marker.parentNode.insertBefore(node, marker.nextSibling);
      }
      // The former header action wrapper is empty only on desktop.
      header.classList.toggle('sf106-header-clean', shouldRelocate);
      tools.hidden = !shouldRelocate;
      const compact = $('sf95CompactVideo');
      if (compact) {
        compact.title = compact.title || 'Alternar tamanho do vídeo';
        if (!compact.hasAttribute('aria-label')) compact.setAttribute('aria-label', compact.title);
      }
    };
    move();
    if (desktop.addEventListener) desktop.addEventListener('change', move);
    else desktop.addListener(move);
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
