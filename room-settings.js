// room-settings.js — validação das opções de personalização de uma sala (usada na criação e na edição)
const COLORS = ['#7c3aed', '#ff6b35', '#10b981', '#3b82f6', '#ec4899', '#f59e0b', '#ef4444', '#14b8a6'];
const EMOJIS = ['🎧', '🎸', '🎹', '🥁', '🎤', '🔥', '🌙', '🌴', '🪩', '🎷', '🎻', '🚀'];
const SLOW = [0, 5, 10, 30, 60];
const DEF = { color: '#7c3aed', emoji: '🎧', description: '', welcome: '', slowMode: 0, addMode: 'all' };
const clean = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);

// Aplica só o que veio em `i`; o resto vem de `base`. Valores inválidos são ignorados.
function sanitize(i = {}, base = DEF) {
  const b = { ...DEF, ...base }, has = k => i[k] !== undefined;
  return {
    color: has('color') && COLORS.includes(i.color) ? i.color : b.color,
    emoji: has('emoji') && EMOJIS.includes(i.emoji) ? i.emoji : b.emoji,
    description: clean(has('description') ? i.description : b.description, 80),
    welcome: clean(has('welcome') ? i.welcome : b.welcome, 200),
    slowMode: has('slowMode') && SLOW.includes(+i.slowMode) ? +i.slowMode : (SLOW.includes(+b.slowMode) ? +b.slowMode : 0),
    addMode: (has('addMode') ? i.addMode : b.addMode) === 'owner' ? 'owner' : 'all'
  };
}
module.exports = { sanitize, COLORS, EMOJIS, SLOW };
