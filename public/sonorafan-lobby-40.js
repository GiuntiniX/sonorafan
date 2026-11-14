/* SonoraFan 40.0 — lobby compacto, salas preset e agenda visual */
(()=>{
  'use strict';
  const PRESETS = [
    {id:'rock', name:'Rock Sessions', emoji:'⚡', color:'#ef4444', desc:'Guitarras, clássicos e refrões gigantes.', art:'/art-40/poster-rock.svg'},
    {id:'pop', name:'Pop Party', emoji:'★', color:'#ec4899', desc:'Hits para cantar junto o tempo todo.', art:'/art-40/poster-pop.svg'},
    {id:'indie', name:'Indie Vibes', emoji:'✿', color:'#a855f7', desc:'Descobertas, texturas e boas vibrações.', art:'/art-33/poster-indie.webp'},
    {id:'eletronica', name:'Electro Dreams', emoji:'〰', color:'#3b82f6', desc:'House, synths e pistas noturnas.', art:'/art-40/poster-electro.svg'},
    {id:'funk', name:'Baile Funk', emoji:'♛', color:'#f97316', desc:'Batida alta e energia de pista.', art:'/art-40/poster-funk.svg'},
    {id:'rap', name:'Rap Session', emoji:'🎤', color:'#f59e0b', desc:'Flow, barras e cypher colaborativa.', art:'/art-40/poster-rap.svg'},
    {id:'mpb', name:'MPB & Brasilidades', emoji:'♫', color:'#10b981', desc:'Canção brasileira, samba e afeto.', art:'/art-40/poster-mpb.svg'},
    {id:'pagode', name:'Pagode de Domingo', emoji:'◉', color:'#fb7185', desc:'Sofrência boa e muita resenha.', art:'/art-40/poster-pagode.svg'}
  ];
  const EVENTS = [
    {title:'Noite Indie', note:'Encontro para descobrir novas bandas e trocar favoritos.', meta:['21:00','Indie','colaborativa'], art:'/art-40/poster-festival.svg', preset:'indie'},
    {title:'Warm Up de Sexta', note:'Sala pronta para esquentar a noite com pop, rap e funk.', meta:['19:30','Mix','ao vivo'], art:'/art-40/poster-pop.svg', preset:'pop'},
    {title:'Sessão Brasilidades', note:'MPB, pagode e sons brasileiros em clima de varanda.', meta:['20:00','MPB','comunidade'], art:'/art-40/poster-mpb.svg', preset:'mpb'}
  ];
  function esc(v){return String(v||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function byId(id){return document.getElementById(id)}
  function renderPresets(){
    const box = byId('sf40PresetRooms'); if(!box) return;
    box.innerHTML = PRESETS.map(p=>`<button type="button" class="sf40-preset" data-sf40-preset="${p.id}" aria-label="Entrar ou criar sala ${esc(p.name)}"><img src="${p.art}" alt="" loading="lazy" decoding="async"><div class="sf40-preset-copy"><span class="tag">${esc(p.emoji)} ${esc(p.id)}</span><strong>${esc(p.name)}</strong><span>${esc(p.desc)}</span></div></button>`).join('');
  }
  function renderEvents(){
    const box = byId('sf40EventsCompact'); if(!box) return;
    box.innerHTML = EVENTS.map((e,i)=>`<article class="sf40-event"><img src="${e.art}" alt="" loading="lazy" decoding="async"><div><strong>${esc(e.title)}</strong><p>${esc(e.note)}</p><div class="meta">${e.meta.map(m=>`<span>${esc(m)}</span>`).join('')}</div><button type="button" data-sf40-event="${i}">Abrir sala</button></div></article>`).join('');
  }
  async function joinOrCreatePreset(preset){
    if(!preset) return;
    try {
      const r = await fetch('/api/rooms', {credentials:'include'});
      const rooms = r.ok ? await r.json() : [];
      const normalize = s => String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
      const found = rooms.find(room => normalize(room.name) === normalize(preset.name));
      if(found){ window.joinRoom?.(found.slug); return; }
      const adminName = window.myName || (window.currentUser && (window.currentUser.nome || window.currentUser.name)) || 'SonoraFan';
      const create = await fetch('/api/rooms', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          name:preset.name, adminName,
          emoji:preset.emoji, color:preset.color, description:preset.desc,
          welcome:'Todo mundo é DJ nesta sala. Adicione músicas e curta com a comunidade.',
          addMode:'all', isPrivate:false, slowMode:0, allowLong:false, allowLive:false
        })
      });
      const data = await create.json();
      if(data && data.slug){ window.joinRoom?.(data.slug); return; }
      if(typeof window.toast==='function') window.toast(data.error || 'Não foi possível abrir a sala','error');
    } catch(err){ if(typeof window.toast==='function') window.toast('Erro ao abrir a sala','error'); }
  }
  function openEventsDrawer(){
    const details = document.querySelector('#screen-lobby .sf32-community-drawer');
    if(!details) return;
    details.open = true;
    details.scrollIntoView({behavior:'smooth', block:'start'});
    document.querySelector('[data-sf-tab="events"]')?.click();
  }
  document.addEventListener('click', e=>{
    const presetBtn = e.target.closest?.('[data-sf40-preset]');
    if(presetBtn){ const preset = PRESETS.find(p=>p.id===presetBtn.dataset.sf40Preset); joinOrCreatePreset(preset); return; }
    const eventBtn = e.target.closest?.('[data-sf40-event]');
    if(eventBtn){ const event = EVENTS[Number(eventBtn.dataset.sf40Event)]; const preset = PRESETS.find(p=>p.id===event.preset); joinOrCreatePreset(preset); return; }
    if(e.target.closest?.('#sf40OpenCreate')){ window.showCreateRoom?.(); return; }
    if(e.target.closest?.('#sf40OpenEvents')){ openEventsDrawer(); return; }
  });
  function removeThemeFromSettings(){
    document.querySelectorAll('#screen-lobby [onclick*="toggleTheme"], #screen-room [onclick*="ToggleThemes"], .sf29-side-theme, #themeBtn, #sf11ThemeButton').forEach(el=>el.remove());
  }
  document.addEventListener('DOMContentLoaded', ()=>{ renderPresets(); renderEvents(); removeThemeFromSettings(); });
})();
