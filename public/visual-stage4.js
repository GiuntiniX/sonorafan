/* SonoraFan 16 — somente melhorias de apresentação/performance. Sem eventos de áudio. */
(() => {
  'use strict';
  const root = document.documentElement;
  const updateVisibility = () => root.classList.toggle('sf16-inactive', document.hidden);
  updateVisibility();
  document.addEventListener('visibilitychange', updateVisibility, { passive: true });

  // Atualiza os rótulos de ações para leitores de tela sem duplicar handlers do app.
  const enhance = () => {
    const invite = document.querySelector('#screen-room .sf9-invite-button');
    if (invite) {
      invite.setAttribute('aria-label', 'Copiar link de convite desta sala');
      invite.setAttribute('title', 'Copiar link para convidar amigos');
    }
    const theme = document.getElementById('sf11ThemeButton');
    if (theme) theme.setAttribute('aria-label', 'Escolher tema visual da sala');
    const chatInput = document.getElementById('chatInput');
    if (chatInput && !chatInput.hasAttribute('aria-label')) chatInput.setAttribute('aria-label', 'Mensagem para o chat da sala');
    const songInput = document.getElementById('songUrl');
    if (songInput && !songInput.hasAttribute('aria-label')) songInput.setAttribute('aria-label', 'Buscar música ou colar link do YouTube');
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enhance, { once: true });
  else enhance();
})();
