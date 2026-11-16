/* SonoraFan 93 — ouvintes compactos e teclado mobile.
   Camada progressiva: não altera fila, login, socket ou reprodução. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const isMobile = () => window.matchMedia('(max-width:768px)').matches;
  const maxVisible = 3;
  let users = [];
  let expanded = false;
  let viewportFrame = 0;
  let focusFrame = 0;

  function buildListenerToggle() {
    const heading = document.querySelector('#screen-room .sf5-listening-card .sf5-card-heading');
    if (!heading) return null;
    let button = $('sf93ListenerToggle');
    if (button) return button;
    button = document.createElement('button');
    button.id = 'sf93ListenerToggle';
    button.type = 'button';
    button.className = 'sf93-listener-toggle';
    button.hidden = true;
    button.setAttribute('aria-controls', 'sf5ListenersBody');
    button.addEventListener('click', () => setExpanded(!expanded));
    heading.appendChild(button);
    return button;
  }

  function setExpanded(value) {
    expanded = Boolean(value);
    syncListeners();
  }

  function syncListeners() {
    const body = $('sf5ListenersBody');
    const presence = $('premiumPresence');
    const toggle = buildListenerToggle();
    const count = users.length;
    const canExpand = isMobile() && count > maxVisible;

    if (!canExpand) expanded = false;
    if (body) {
      body.classList.toggle('sf93-listeners-collapsed', canExpand && !expanded);
      body.classList.toggle('sf93-listeners-expanded', canExpand && expanded);
    }
    if (toggle) {
      toggle.hidden = !canExpand;
      toggle.textContent = expanded ? 'Ver menos' : 'Ver todos (' + count + ')';
      toggle.setAttribute('aria-expanded', String(expanded));
    }
    if (presence) {
      presence.classList.toggle('sf93-presence-collapsed', canExpand && !expanded);
      presence.classList.toggle('sf93-presence-expanded', canExpand && expanded);
      presence.querySelector('.sf93-presence-more')?.remove();
      if (canExpand) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'sf93-presence-more';
        button.textContent = expanded ? 'Menos' : '+' + (count - maxVisible) + ' ouvintes';
        button.setAttribute('aria-controls', 'premiumPresence');
        button.setAttribute('aria-expanded', String(expanded));
        button.setAttribute('aria-label', expanded ? 'Mostrar menos ouvintes' : 'Mostrar todos os ' + count + ' ouvintes');
        button.addEventListener('click', () => setExpanded(!expanded));
        presence.appendChild(button);
      }
    }
  }

  function patchPresence() {
    const previous = window.premiumUsers;
    if (typeof previous !== 'function' || previous.sf93Patched) return;
    const wrapped = function(list) {
      previous.call(this, list);
      users = Array.isArray(list) ? list : [];
      if (!users.length) expanded = false;
      syncListeners();
    };
    wrapped.sf93Patched = true;
    window.premiumUsers = wrapped;
  }

  function refreshViewport() {
    if (viewportFrame) cancelAnimationFrame(viewportFrame);
    viewportFrame = requestAnimationFrame(() => {
      viewportFrame = 0;
      const view = window.visualViewport;
      const visible = Math.max(0, view ? view.height : window.innerHeight);
      document.body.style.setProperty('--sf93-visible-height', Math.round(visible) + 'px');
      const viewportBottom = view ? view.height + view.offsetTop : window.innerHeight;
      const obscured = Math.max(0, window.innerHeight - viewportBottom);
      const chatFocused = document.activeElement?.id === 'chatInput';
      const keyboardOpen = isMobile() && chatFocused && (obscured > 105 || (!view && chatFocused));
      document.body.classList.toggle('sf93-keyboard-open', keyboardOpen);
      if (keyboardOpen && focusFrame === 0) {
        focusFrame = requestAnimationFrame(() => {
          focusFrame = 0;
          $('chatInput')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        });
      }
    });
  }

  function init() {
    patchPresence();
    if (Array.isArray(window.sf53RoomUsers)) users = window.sf53RoomUsers;
    syncListeners();
    refreshViewport();
    document.addEventListener('focusin', e => {
      if (e.target?.id === 'chatInput') refreshViewport();
    });
    document.addEventListener('focusout', e => {
      if (e.target?.id === 'chatInput') {
        document.body.classList.remove('sf93-keyboard-open');
        refreshViewport();
      }
    });
    window.addEventListener('resize', () => { refreshViewport(); syncListeners(); }, { passive:true });
    window.addEventListener('orientationchange', refreshViewport, { passive:true });
    window.visualViewport?.addEventListener('resize', refreshViewport, { passive:true });
    window.visualViewport?.addEventListener('scroll', refreshViewport, { passive:true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }
})();
