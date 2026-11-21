/* SonoraFan 41.0 — agenda REAL, destaques de música e salas prontas. Sem eventos fictícios. */
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
  const byId=id=>document.getElementById(id);
  let lastRooms=null, agendaLast=0, agendaPending=false, loggedIn=false;
  const toastMessage=(msg,type='error')=>{if(typeof window.toast==='function')window.toast(msg,type);else console.info(msg)};
  function node(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=String(text);return el}
  function normalize(text){return String(text||'').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim()}
  function getRoomForPreset(preset){return Array.isArray(lastRooms)?lastRooms.find(room=>normalize(room.name)===normalize(preset.name)):null}
  function lobbyActive(){return byId('screen-lobby')?.classList.contains('active')||false}
  function validId(id){return typeof id==='string' && /^[A-Za-z0-9_-]{11}$/.test(id)}

  function renderPresets(){
    const container=byId('sf40PresetRooms');if(!container)return;
    container.replaceChildren();
    PRESETS.forEach(preset=>{
      const btn=node('button','sf40-preset');btn.type='button';btn.dataset.sf41Preset=preset.id;
      btn.setAttribute('aria-label',`Entrar ou criar sala ${preset.name}`);
      const img=node('img');img.src=preset.art;img.alt='';img.loading='lazy';img.decoding='async';
      const label=node('div','sf40-preset-copy');
      label.append(node('span','tag',preset.emoji+' '+preset.id),node('strong','',preset.name),node('span','',preset.desc));
      const state=node('span','sf41-preset-state','Escolher');state.dataset.statusFor=preset.id;
      btn.append(img,label,state);
      container.append(btn);
    });
    renderPresetStates();
  }
  function renderPresetStates(){
    for(const p of PRESETS){
      const btn=byId('sf40PresetRooms')?.querySelector(`[data-sf41-preset="${p.id}"]`);
      const state=btn?.querySelector('.sf41-preset-state'); if(!state)continue;
      const room=getRoomForPreset(p);
      state.classList.toggle('live',!!room?.isPlaying);
      state.textContent=btn.dataset.busy==='1'?'Abrindo…':room?(room.isPlaying?'● Tocando':'Entrar'):(Array.isArray(lastRooms)?'Criar sala':'Explorar');
    }
  }
  async function joinOrCreatePreset(preset,btn){
    if(!preset||!btn||btn.dataset.busy==='1')return;
    btn.dataset.busy='1';btn.disabled=true;renderPresetStates();
    try{
      if(!Array.isArray(lastRooms)){
        const response=await fetch('/api/rooms',{credentials:'include'});
        if(!response.ok)throw Error('Não foi possível consultar as salas');
        lastRooms=await response.json();
      }
      const existing=getRoomForPreset(preset);
      if(existing?.slug){if(typeof window.joinRoom==='function')window.joinRoom(existing.slug);return}
      const name=byId('userDisplayName')?.textContent?.trim()||'SonoraFan';
      const response=await fetch('/api/rooms',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        name:preset.name,adminName:name,emoji:preset.emoji,color:preset.color,description:preset.desc,
        welcome:'Todo mundo pode adicionar músicas. Participe da playlist e respeite a comunidade.',
        addMode:'all',isPrivate:false,slowMode:0,allowLong:false,allowLive:false
      })});
      const created=await response.json().catch(()=>({}));
      if(response.ok&&created.slug){if(typeof window.joinRoom==='function')window.joinRoom(created.slug);return}
      // If another participant created the same preset meanwhile, join the existing room.
      if(response.status===409){
        const retry=await fetch('/api/rooms',{credentials:'include'});
        if(retry.ok){lastRooms=await retry.json();const found=getRoomForPreset(preset);if(found?.slug){window.joinRoom?.(found.slug);return}}
      }
      throw Error(created.error||'Não foi possível criar essa sala');
    }catch(err){toastMessage(err.message||'Erro ao abrir a sala')}finally{btn.disabled=false;delete btn.dataset.busy;renderPresetStates()}
  }
  function showEventDrawer(){
    const drawer=document.querySelector('#screen-lobby .sf32-community-drawer');if(!drawer)return;
    drawer.open=true;drawer.scrollIntoView({behavior:'smooth',block:'start'});
    document.querySelector('#sfSocialHub [data-sf-tab="events"]')?.click();
  }
  function showCreateRoom(){if(typeof window.showCreateRoom==='function')window.showCreateRoom();else toastMessage('A criação de salas não está disponível neste momento')}
  function renderAgendaPlaceholder(kind,msg){
    const box=byId('sf40EventsCompact');if(!box)return;
    const wrapper=node('div','sf41-events-empty');
    wrapper.append(node('strong','',kind),node('span','',msg));
    const action=node('button','',kind==='Sem eventos agendados'?'Criar evento':'Tentar novamente');action.type='button';
    action.addEventListener('click',()=>{if(kind==='Sem eventos agendados'){showEventDrawer();byId('sfNewEvent')?.click()}else fetchAgenda(true)});
    wrapper.append(action);box.replaceChildren(wrapper);
  }
  function eventArt(event){
    const combined=normalize(`${event.roomName||''} ${event.title||''}`);
    if(combined.includes('indie'))return '/art-33/poster-indie.webp';
    if(combined.includes('rock'))return '/art-33/poster-rock.webp';
    if(combined.includes('pop'))return '/art-40/poster-pop.svg';
    if(combined.includes('rap')||combined.includes('hip-hop'))return '/art-40/poster-rap.svg';
    if(combined.includes('mpb')||combined.includes('brasil'))return '/art-33/poster-brasil.webp';
    if(combined.includes('eletron')||combined.includes('house'))return '/art-40/poster-electro.svg';
    return '/art-40/poster-festival.svg';
  }
  const dateFormat=new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
  function renderEventCard(event){
    const card=node('article','sf40-event sf41-event');
    const img=node('img');img.src=eventArt(event);img.alt='';img.loading='lazy';img.decoding='async';card.append(img);
    const copy=node('div','sf41-event-copy');
    copy.append(node('strong','',event.title||'Encontro musical'));
    const date=new Date(event.startAt);
    const when=Number.isNaN(date.getTime())?'Horário não informado':dateFormat.format(date);
    const meta=node('div','sf41-event-meta');
    meta.append(node('span','',`📅 ${when}`),node('span','',`🎧 ${event.roomName||'Sala'}`));
    copy.append(meta);
    if(event.description)copy.append(node('p','',event.description));
    const actions=node('div','sf41-event-actions');
    if(event.id){
      const rsvp=node('button','sf41-secondary',event.going?'✓ Confirmado':'Confirmar presença');
      rsvp.type='button';rsvp.setAttribute('aria-label',event.going?'Cancelar confirmação de presença':'Confirmar presença');
      rsvp.addEventListener('click',async()=>{
        rsvp.disabled=true;
        try{
          const response=await fetch('/api/social/events/'+encodeURIComponent(event.id)+'/rsvp',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({going:!event.going})});
          if(!response.ok){const json=await response.json().catch(()=>({}));throw Error(json.error||'Erro ao confirmar presença')}
          toastMessage(!event.going?'Presença confirmada':'Presença cancelada','success');await fetchAgenda(true);
        }catch(err){toastMessage(err.message)}finally{rsvp.disabled=false}
      });
      actions.append(rsvp);
    }
    if(event.roomSlug){const join=node('button','', 'Entrar na sala');join.type='button';join.addEventListener('click',()=>window.joinRoom?.(event.roomSlug));actions.append(join)}
    copy.append(actions);card.append(copy);return card;
  }
  async function fetchAgenda(force=false){
    const box=byId('sf40EventsCompact');if(!box||agendaPending||!lobbyActive())return;
    const now=Date.now();if(!force&&now-agendaLast<60_000)return;
    agendaPending=true;box.replaceChildren(node('div','sf41-events-empty','Carregando agenda real…'));
    try{
      const response=await fetch('/api/social/events',{credentials:'include',cache:'no-store'});
      if(!response.ok)throw Error(response.status===401?'Entre na sua conta para ver eventos':'Agenda temporariamente indisponível');
      const data=await response.json();
      if(!Array.isArray(data))throw Error('Agenda temporariamente indisponível');
      agendaLast=Date.now();
      const events=data.filter(e=>Number.isFinite(new Date(e.startAt).getTime()) && new Date(e.startAt).getTime()>=now-3_600_000)
        .sort((a,b)=>new Date(a.startAt)-new Date(b.startAt)).slice(0,2);
      if(!events.length){renderAgendaPlaceholder('Sem eventos agendados','A programação aparece aqui quando alguém marca um encontro.');return}
      box.replaceChildren(...events.map(renderEventCard));
    }catch(err){renderAgendaPlaceholder('Agenda indisponível',err.message||'Não conseguimos consultar eventos agora.')}
    finally{agendaPending=false}
  }
  function updateNowPlaying(rooms){
    const section=byId('sf41Playing'),box=byId('sf41PlayingList');if(!section||!box)return;
    box.replaceChildren();
    if(!Array.isArray(rooms)){section.hidden=true;return}
    const eligible=rooms.filter(r=>validId(r.currentTrack?.id)).sort((a,b)=>(Number(b.isPlaying)-Number(a.isPlaying))||(Number(b.listenerCount||0)-Number(a.listenerCount||0))).slice(0,3);
    if(!eligible.length){section.hidden=true;return}
    for(const room of eligible){
      const btn=node('button','sf41-live-track');btn.type='button';btn.title='Entrar na sala '+String(room.name||'');
      const img=node('img');
      const videoCover=`https://img.youtube.com/vi/${room.currentTrack.id}/mqdefault.jpg`;
      const custom=typeof room.coverUrl==='string' && /^https:\/\//i.test(room.coverUrl) ? room.coverUrl : '';
      img.src=custom||videoCover;img.alt='';img.loading='lazy';
      if(custom)img.addEventListener('error',()=>{if(img.dataset.fallback!=='1'){img.dataset.fallback='1';img.src=videoCover;}});
      img.style.objectPosition=Math.min(100,Math.max(0,Number(room.coverX??50)||0))+'% '+Math.min(100,Math.max(0,Number(room.coverY??50)||0))+'%';
      const info=node('span','sf41-live-track-body');
      info.append(node('strong','',room.currentTrack.title||'Música selecionada'),node('small','',room.name||'Sala musical'),node('em','',room.isPlaying?'● Ao vivo': 'Pronta para tocar'));
      btn.append(img,info);btn.addEventListener('click',()=>window.joinRoom?.(room.slug));box.append(btn);
    }
    section.hidden=false;
  }
  function updateRooms(rooms){
    lastRooms=Array.isArray(rooms)?rooms:null;
    renderPresetStates();updateNowPlaying(rooms);
  }
  async function shareRoom(slug){
    if(!slug||typeof slug!=='string')return;
    const url=new URL('/invite/'+encodeURIComponent(slug),location.origin).href;
    try{
      if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(url);
      else{
        const field=node('textarea');field.value=url;field.style.position='fixed';field.style.opacity='0';document.body.append(field);field.select();
        const ok=document.execCommand('copy');field.remove();if(!ok)throw Error('copy')
      }
      toastMessage('Link da sala copiado ✦','success');
    }catch(_){toastMessage('Não foi possível copiar o convite')}
  }
  window.sf41UpdateRooms=updateRooms;
  window.sf41ShareRoom=shareRoom;
  window.sf41RefreshAgenda=()=>fetchAgenda(true);
  document.addEventListener('click',event=>{
    const preset=event.target.closest?.('[data-sf41-preset]');
    if(preset){joinOrCreatePreset(PRESETS.find(p=>p.id===preset.dataset.sf41Preset),preset);return}
    if(event.target.closest?.('#sf40OpenCreate')){showCreateRoom();return}
    if(event.target.closest?.('#sf40OpenEvents')){showEventDrawer();return}
  });
  function init(){
    renderPresets();
    const screen=byId('screen-lobby');
    if(screen){new MutationObserver(()=>{if(lobbyActive())fetchAgenda()}).observe(screen,{attributes:true,attributeFilter:['class']});}
    if(lobbyActive())fetchAgenda();
    // Refresh only when lobby is visible. Event creation in the legacy panel is also observed.
    setInterval(()=>{if(lobbyActive())fetchAgenda()},60_000);
    const list=byId('sfEventsList');
    if(list){let timeout;new MutationObserver(()=>{if(lobbyActive()){clearTimeout(timeout);timeout=setTimeout(()=>fetchAgenda(true),1000)}}).observe(list,{childList:true,subtree:false})}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
