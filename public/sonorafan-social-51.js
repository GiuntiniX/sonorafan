/* SonoraFan 51.0 — nicknames clicáveis e menções no chat público.
   Não envia nem armazena mensagens privadas; nenhuma alteração em Socket.IO/Firebase. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const selectors = [
    '.sf51-user-link',
    '#premiumPresence .sf43-presence-pill b',
    '#sf5ListenersBody .sf43-listener-item strong',
    '#usersPop .up-row strong'
  ];
  const nickSelector = selectors.join(', ');
  let activeTrigger = null;
  let selectedNick = '';
  let noticeTimer;

  function isRoomVisible() {
    return !!$('screen-room')?.classList.contains('active');
  }

  function nickFrom(el) {
    if (!el) return '';
    const value = el.querySelector('.sf51-nick-label')?.textContent || el.dataset.sf51Nick || el.textContent || '';
    return value.replace(/\s+/g, ' ').trim().slice(0, 64);
  }

  function prepareNick(el) {
    if (el.matches('button')) { const nick = nickFrom(el); if (nick) el.setAttribute('aria-label', 'Ações com ' + nick); return; }
    if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
    el.setAttribute('role', 'button');
    const nick = nickFrom(el);
    if (nick) el.setAttribute('aria-label', 'Ações com ' + nick);
    el.classList.add('sf51-clickable-nick');
  }

  function decorateNicknames(root = document) {
    root.querySelectorAll(nickSelector).forEach(prepareNick);
  }

  function closeMenu(returnFocus = false) {
    const menu = $('sf51UserMenu');
    if (!menu) return;
    menu.hidden = true;
    menu.setAttribute('aria-hidden', 'true');
    if (activeTrigger) activeTrigger.setAttribute('aria-expanded', 'false');
    if (returnFocus && activeTrigger?.isConnected) activeTrigger.focus({ preventScroll: true });
    activeTrigger = null;
    selectedNick = '';
  }

  function openMenu(el) {
    const menu = $('sf51UserMenu');
    const nick = nickFrom(el);
    if (!menu || !isRoomVisible() || !nick) return;

    if (!menu.hidden && activeTrigger === el) {
      closeMenu();
      return;
    }
    closeMenu();
    selectedNick = nick;
    activeTrigger = el;
    $('sf51SelectedNickname').textContent = nick;
    menu.hidden = false;
    menu.setAttribute('aria-hidden', 'false');
    el.setAttribute('aria-expanded', 'true');

    // Keep the menu inside the visible viewport, also on narrow mobile screens.
    const r = el.getBoundingClientRect();
    const gap = 8;
    const width = Math.min(294, window.innerWidth - 24);
    menu.style.width = width + 'px';
    const height = menu.offsetHeight || 210;
    const left = Math.max(12, Math.min(r.left, window.innerWidth - width - 12));
    const below = r.bottom + height + gap <= window.innerHeight - 12;
    const top = below ? r.bottom + gap : Math.max(12, Math.min(r.top - height - gap, window.innerHeight - height - 12));
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    menu.querySelector('[data-sf51-action="mention"]')?.focus({ preventScroll: true });
  }

  function notify(message) {
    if (typeof window.toast === 'function') {
      window.toast(message, 'success');
      return;
    }
    let node = $('sf51Feedback');
    if (!node) {
      node = document.createElement('div');
      node.id = 'sf51Feedback';
      node.className = 'sf51-feedback';
      node.setAttribute('role', 'status');
      document.body.appendChild(node);
    }
    node.textContent = message;
    node.classList.add('is-visible');
    window.clearTimeout(noticeTimer);
    noticeTimer = window.setTimeout(() => node.classList.remove('is-visible'), 2600);
  }

  function mentionInChat(nick) {
    const input = $('chatInput');
    if (!input) return;
    // @{Nome Sobrenome} is recognized visually by the existing chat rendering.
    const safeNick = nick.replace(/[{}]/g, '').trim();
    const mention = /\s/.test(safeNick) ? `@{${safeNick}}` : '@' + safeNick;
    // Append to the end so clicking a nickname never splits an existing message.
    const start = input.value.length;
    const end = start;
    const before = input.value.slice(0, start);
    const after = input.value.slice(end);
    const prefix = before && !/\s$/.test(before) ? ' ' : '';
    const suffix = after && /^\s/.test(after) ? '' : ' ';
    input.value = before + prefix + mention + suffix + after;
    const pos = before.length + prefix.length + mention.length + suffix.length;
    input.focus({ preventScroll: false });
    input.setSelectionRange(pos, pos);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    notify('Menção adicionada ao chat público. Escreva sua mensagem e envie.');
  }

  async function copyNick(nick) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(nick);
      notify('Nickname copiado: ' + nick);
    } catch {
      notify('Não foi possível copiar automaticamente.');
    }
  }

  function init() {
    const menu = $('sf51UserMenu');
    const room = $('screen-room');
    if (!menu || !room) return;
    menu.hidden = true;
    decorateNicknames(room);

    const chat = $('chatMessagesInner');
    const presence = $('premiumPresence');
    const listeners = $('sf5ListenersBody');
    const users = $('usersPop');
    [chat, presence, listeners, users].filter(Boolean).forEach(region => {
      const observer = new MutationObserver(() => decorateNicknames(region));
      observer.observe(region, { childList: true, subtree: true });
    });

    document.addEventListener('click', e => {
      const action = e.target.closest?.('[data-sf51-action]');
      if (action && menu.contains(action)) {
        e.preventDefault();
        e.stopPropagation();
        const nick = selectedNick;
        const name = action.dataset.sf51Action;
        closeMenu();
        if (name === 'mention') mentionInChat(nick);
        if (name === 'copy') copyNick(nick);
        return;
      }
      const target = e.target.closest?.(nickSelector);
      if (target && isRoomVisible()) {
        e.preventDefault();
        e.stopPropagation();
        prepareNick(target);
        openMenu(target);
        return;
      }
      if (!e.target.closest?.('#sf51UserMenu') && !menu.hidden) closeMenu();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !menu.hidden) {
        e.preventDefault();
        closeMenu(true);
        return;
      }
      if ((e.key === 'Enter' || e.key === ' ') && !e.target.matches?.('button')) {
        const target = e.target.closest?.(nickSelector);
        if (target && isRoomVisible()) {
          e.preventDefault();
          openMenu(target);
        }
      }
    });

    // A menu anchored to the chat should never float after its content scrolls.
    document.addEventListener('scroll', () => { if (!menu.hidden) closeMenu(); }, true);
    window.addEventListener('resize', () => { if (!menu.hidden) closeMenu(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
