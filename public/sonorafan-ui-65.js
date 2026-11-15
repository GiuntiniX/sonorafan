/* SonoraFan 65.0 – menu de ordenação contrastado e teclado acessível. */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  function initSort() {
    const select = $('sf50RoomOrder');
    const trigger = $('sf65SortTrigger');
    const menu = $('sf65SortList');
    const label = $('sf65SortValue');
    if (!select || !trigger || !menu || !label) return;

    const options = Array.from(menu.querySelectorAll('[data-sort]'));
    const isOpen = () => !menu.hidden;
    const optionIndex = value => Math.max(0, options.findIndex(el => el.dataset.sort === value));

    function update() {
      const selected = select.options[select.selectedIndex];
      label.textContent = selected ? selected.textContent.trim() : 'Mais ouvintes';
      options.forEach(option => {
        const current = option.dataset.sort === select.value;
        option.classList.toggle('is-selected', current);
        option.setAttribute('aria-selected', String(current));
      });
    }

    function close(restoreFocus = false) {
      if (!isOpen()) return;
      menu.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      if (restoreFocus) trigger.focus();
    }

    function open() {
      menu.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      update();
      options[optionIndex(select.value)]?.focus();
    }

    function choose(value) {
      if (!options.some(option => option.dataset.sort === value)) return;
      if (select.value !== value) {
        select.value = value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      update();
      close(true);
    }

    trigger.addEventListener('click', () => isOpen() ? close() : open());
    trigger.addEventListener('keydown', e => {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        open();
        if (e.key === 'ArrowUp') options[options.length - 1]?.focus();
      }
    });
    menu.addEventListener('click', e => {
      const option = e.target.closest('[data-sort]');
      if (option) choose(option.dataset.sort);
    });
    menu.addEventListener('keydown', e => {
      const i = options.indexOf(document.activeElement);
      if (e.key === 'Escape') { e.preventDefault(); close(true); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); options[(i + 1) % options.length]?.focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); options[(i - 1 + options.length) % options.length]?.focus(); }
      else if (e.key === 'Home') { e.preventDefault(); options[0]?.focus(); }
      else if (e.key === 'End') { e.preventDefault(); options[options.length - 1]?.focus(); }
      else if (e.key === ' ' || e.key === 'Enter') {
        const option = e.target.closest('[data-sort]');
        if (option) { e.preventDefault(); choose(option.dataset.sort); }
      }
      else if (e.key === 'Tab') close();
    });
    document.addEventListener('pointerdown', e => {
      if (!trigger.contains(e.target) && !menu.contains(e.target)) close();
    });
    select.addEventListener('change', update);
    update();
  }

  function initRoomIcons() {
    const nav = document.querySelector('#screen-room .sf5-navigation');
    if (!nav || typeof MutationObserver === 'undefined') return;
    function normalize() {
      const notification = nav.querySelector('button.sf15-bell');
      if (!notification || notification.querySelector('.sf64-menu-icon')) return;
      const caption = notification.textContent.replace(/^\s*🔔\s*/, '').trim() || 'Notificações';
      const icon = document.createElement('span');
      icon.className = 'sf64-menu-icon sf64-icon-bell';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = '🔔';
      const label = document.createElement('span');
      label.textContent = caption;
      notification.replaceChildren(icon, label);
    }
    const observer = new MutationObserver(normalize);
    observer.observe(nav, { childList:true, subtree:true, characterData:true });
    normalize();
  }
  function init() { initSort(); initRoomIcons(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
