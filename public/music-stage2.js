/* SonoraFan — Etapa 2: controles musicais reais; servidor autoriza cada mudança. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const html = `
    <div class="sf14-head"><span>🎛️ <strong>Modo musical</strong></span><span id="sf14-mode-label">Colaborativo</span></div>
    <div class="sf14-mode-choices" role="group" aria-label="Modo de seleção musical">
      <button type="button" data-mode="all" title="Todos podem adicionar músicas">Todos</button>
      <button type="button" data-mode="fair" title="Alterna músicas de participantes diferentes">Fila justa</button>
      <button type="button" data-mode="owner" title="Só o anfitrião adiciona músicas">DJ</button>
    </div>
    <div class="sf14-radio-row">
      <label><input id="sf14-auto" type="checkbox"> Rádio automática ao terminar a fila</label>
      <select id="sf14-genre" aria-label="Estilo da rádio"><option value="pop">Pop</option><option value="rock">Rock</option><option value="eletronica">Eletrônica</option><option value="hip hop">Hip-hop</option><option value="sertanejo">Sertanejo</option><option value="mpb">MPB</option></select>
    </div>
    <div class="sf14-hint" id="sf14-hint">Quem administra a sala escolhe como a fila funciona.</div>
    <button class="sf14-discover" type="button" id="sf14-discover">✨ Buscar artista da sessão</button>`;
  const root = document.createElement('section'); root.id='sf14-music-tools'; root.className='sf14-music-tools'; root.innerHTML=html;
  const insert = () => {
    const list = $('queueList');
    if (list && !root.isConnected) list.parentElement.insertBefore(root,list);
  };
  let admin = false, latest = null;
  const paint = () => {
    if (!latest || !root.isConnected) return;
    const mode=latest.musicMode || (latest.addMode==='owner'?'owner':'all');
    const labels={all:'Colaborativo',fair:'Fila justa',owner:'DJ anfitrião'};
    $('sf14-mode-label').textContent=labels[mode]||labels.all;
    root.querySelectorAll('[data-mode]').forEach(btn=>{btn.classList.toggle('selected',btn.dataset.mode===mode);btn.disabled=!admin;btn.setAttribute('aria-pressed',String(btn.dataset.mode===mode));});
    $('sf14-auto').checked=!!latest.radioMode;
    $('sf14-auto').disabled=!admin;
    $('sf14-genre').disabled=!admin;
    $('sf14-genre').value=[...$('sf14-genre').options].some(x=>x.value===latest.radioGenre)?latest.radioGenre:'pop';
    $('sf14-hint').textContent=admin?'Configure quem pode escolher e como a sala continua tocando.':'Apenas o anfitrião pode alterar o modo de reprodução.';
    root.classList.toggle('sf14-readonly',!admin);
  };
  root.addEventListener('click', e=>{
    const mode=e.target.closest('[data-mode]');
    if(mode && admin && latest && mode.dataset.mode!==latest.musicMode) socket.emit('setMusicMode',{mode:mode.dataset.mode});
  });
  root.addEventListener('change',e=>{
    if(admin && (e.target.id==='sf14-auto'||e.target.id==='sf14-genre')) socket.emit('setAutoRadio',{enabled:$('sf14-auto').checked,genre:$('sf14-genre').value});
  });
  root.querySelector('#sf14-discover').addEventListener('click',()=>{
    const current=latest?.queue?.[latest.currentIndex];
    const history=latest?.history || [];
    const artist=current?.artist || history[history.length-1]?.artist;
    const field=$('songUrl');
    if(!field)return;
    field.value=artist||'músicas populares';
    field.dispatchEvent(new Event('input',{bubbles:true}));
    field.scrollIntoView({behavior:'smooth',block:'center'});
    field.focus();
  });
  const ready=()=>{insert(); paint();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
  socket.on('roomState',data=>{latest=data;insert();paint();});
  socket.on('isAdmin',value=>{admin=!!value;paint();});
})();
