/* SonoraFan 57–63 · Evolução musical, Club e Tour */
(() => {
  'use strict';
  const $$ = (q, base=document) => [...base.querySelectorAll(q)];
  const $ = id => document.getElementById(id);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const validId = id => /^[\w-]{11}$/.test(String(id||''));
  const encode = v => encodeURIComponent(v||'');
  const styles=['Rock','Pop','Indie','Eletrônica','Funk','Rap','MPB','Pagode'];
  const state={tab:'music',me:null,searchQuery:'',searchResults:[],battle:null,challenge:null,history:null,room:null,contacts:[],inbox:[],prevFocus:null,tour:null,roomList:[]};
  const hub=$('sf63Hub'),body=$('sf63HubBody'),tour=$('sf63Tour');
  const currentSlug=()=>typeof currentRoom!=='undefined'?currentRoom:null;
  const signedIn=()=>typeof currentUser!=='undefined' && !!currentUser;
  const notify=(message,bad=false)=>{ const node=$('sf63Toast');if(!node){if(typeof toast==='function')toast(message,bad?'error':'success');return;}node.textContent=message;node.classList.add('show');clearTimeout(node._timer);node._timer=setTimeout(()=>node.classList.remove('show'),2800);};
  async function api(path,opts={}){
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),10000);
    try{
      const r=await fetch(path,{credentials:'include',...opts,signal:controller.signal,headers:{...(opts.body?{'Content-Type':'application/json'}:{}),...(opts.headers||{})}});
      const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||'Serviço temporariamente indisponível');return data;
    }catch(error){if(error?.name==='AbortError')throw new Error('A consulta demorou demais. Tente novamente.');throw error;}
    finally{clearTimeout(timeout);}
  }
  const post=(path,data)=>api(path,{method:'POST',body:JSON.stringify(data||{})});
  const requireRoom=()=>{const slug=currentSlug();if(!slug)notify('Entre em uma sala para participar.',true);return slug;};
  function btn(label,action,extra=''){return `<button type="button" data-sf63-action="${esc(action)}" ${extra}>${label}</button>`;}
  function open(tab='music'){
    if(!hub)return;
    if(!signedIn()){notify('Entre na sua conta para participar das atividades.',true);return;}
    state.prevFocus=document.activeElement;hub.hidden=false;hub.classList.add('active');document.body.classList.add('sf63-hub-active');switchTab(tab);$('sf63HubClose')?.focus();
  }
  function close(){if(!hub)return;hub.classList.remove('active');hub.hidden=true;document.body.classList.remove('sf63-hub-active');state.prevFocus?.focus?.();}
  async function switchTab(tab){
    if(!['music','passport','battle','challenge','history','social'].includes(tab))tab='music';
    state.tab=tab;
    $$('.sf63-tabs [data-sf63-tab]').forEach(el=>{const on=el.dataset.sf63Tab===tab;el.classList.toggle('is-active',on);el.setAttribute('aria-current',on?'page':'false');});
    const names={music:'Descobrir músicas',passport:'Passaporte Musical',battle:'Batalha Musical',challenge:'Missão coletiva',history:'Nossa setlist',social:'Amigos e mensagens'};
    $('sf63HubTitle').textContent=names[tab];
    body.innerHTML='<p class="sf63-muted" role="status">Carregando…</p>';
    try{
      if(tab==='music')await renderMusic();
      if(tab==='passport')await renderPassport();
      if(tab==='battle')await renderBattle();
      if(tab==='challenge')await renderChallenge();
      if(tab==='history')await renderHistory();
      if(tab==='social')await renderSocial();
    }catch(e){body.innerHTML=`<p class="sf63-empty" role="alert">${esc(e.message)}</p>${btn('Tentar novamente','refresh')}`;}
  }
  function recent(){try{return JSON.parse(localStorage.getItem('sf63_recent_music')||'[]').filter(validId).slice(0,8);}catch(e){return [];}}
  function remember(id){localStorage.setItem('sf63_recent_music',JSON.stringify([id,...recent().filter(x=>x!==id)].slice(0,8)));}
  async function renderMusic(){
    const favorites=await api('/api/favorites').catch(()=>[]);
    const entries=Array.isArray(favorites)?favorites:[];
    body.innerHTML=`<div class="sf63-intro"><strong>Busque sem sair da sala</strong><p>Pesquise no YouTube, escolha a música e adicione diretamente à fila da sala. Favoritar é opcional.</p></div>
      <form class="sf63-music-search" id="sf63MusicForm"><label for="sf63SongSearch">Música, artista ou link</label><div><input id="sf63SongSearch" value="${esc(state.searchQuery)}" placeholder="Ex.: Arctic Monkeys, rock alternativo…" autocomplete="off" maxlength="120"><button type="submit">Buscar</button></div></form>
      <div class="sf63-results" id="sf63MusicResults" role="status"></div>
      <div class="sf63-section-heading"><strong>Minhas favoritas</strong><span>${entries.length} salvas</span></div>
      <div class="sf63-track-list" id="sf63FavoritesList">${entries.length?entries.slice(0,18).map((f,i)=>trackCard(f,'fav:'+i)).join(''):'<p class="sf63-empty">Sem favoritas ainda. Favorite uma música na sala para encontrá-la aqui.</p>'}</div>
      <p class="sf63-caption">A fila bloqueia músicas duplicadas e distribui escolhas de forma mais justa nas novas salas. Todos continuam podendo adicionar.</p>`;
    state.favorites=entries;
    $('sf63MusicForm')?.addEventListener('submit',e=>{e.preventDefault();musicSearch($('sf63SongSearch').value);});
    if(state.searchQuery) await musicSearch(state.searchQuery);
  }
  function trackCard(t,action){const id=String(t.id||t.videoId||'');if(!validId(id))return '';
    return `<article class="sf63-track"><img src="https://img.youtube.com/vi/${id}/mqdefault.jpg" alt="" loading="lazy"><div><strong>${esc(t.title||'Música')}</strong><small>${esc(t.artist||'Artista')}</small></div>${btn('＋ Adicionar à fila','song:'+id,'aria-label="Adicionar música à fila da sala"')}</article>`;
  }
  async function musicSearch(q){
    const query=String(q||'').trim();if(query.length<2){$('sf63MusicResults').innerHTML='<p class="sf63-empty">Digite pelo menos duas letras ou cole o link no campo da sala.</p>';return;}
    state.searchQuery=query;const container=$('sf63MusicResults');if(!container)return;container.textContent='Buscando músicas…';
    try{
      const data=await api('/api/search-youtube?q='+encode(query));const items=(Array.isArray(data.items)?data.items:[]).filter(t=>validId(t.id));
      state.searchResults=items;container.innerHTML=`<div class="sf63-section-heading"><strong>Resultados no YouTube</strong><span>${items.length} encontrados</span></div>${items.length?items.map(t=>trackCard(t,'song:'+t.id)).join(''):'<p class="sf63-empty">Nenhuma música encontrada. Tente outro termo.</p>'}`;
    }catch(e){container.innerHTML=`<p class="sf63-empty" role="alert">${esc(e.message)}</p>`;}
  }
  async function chooseSong(id){
    if(!requireRoom() || !validId(id))return;
    if(state.songSending)return;
    if(typeof window.sf80QueueSong !== 'function'){notify('Atualize a página para adicionar músicas.',true);return;}
    const found=state.searchResults.find(t=>t.id===id) || (state.favorites||[]).find(t=>t.id===id);
    if(!found){notify('Música não encontrada. Faça uma nova busca.',true);return;}
    const form=$('sf63MusicForm');
    let message=$('sf63QueueFeedback');
    if(!message&&form){
      message=document.createElement('p');
      message.id='sf63QueueFeedback';
      message.className='sf63-queue-feedback';
      message.setAttribute('role','status');
      message.setAttribute('aria-live','polite');
      form.insertAdjacentElement('afterend',message);
    }
    const inform=(msg,isError=false)=>{
      if(message){message.textContent=msg;message.classList.toggle('is-error',isError);}
      if(isError)notify(msg,true);
    };
    const buttons=$$('#sf63HubBody [data-sf63-action^="song:"]');
    const changed=buttons.map(button=>({button,oldDisabled:button.disabled,oldText:button.textContent}));
    state.songSending=true;
    changed.forEach(({button})=>{button.disabled=true;if(button.dataset.sf63Action==='song:'+id)button.textContent='⏳ Enviando…';});
    inform('Verificando vídeo e preparando a inclusão na fila…');
    try{
      let metadata={};
      try{metadata=await api('/api/video-info?id='+encode(id));}
      catch(_){/* A sala valida a faixa mesmo sem metadados completos. */}
      if(metadata?.embeddable===false)throw new Error('Este vídeo não permite reprodução na sala.');
      const duration=Number(metadata?.duration);
      const track={
        id, title:String(metadata?.title||found.title||'Música'),
        artist:String(metadata?.artist||found.artist||'Artista'),
        duration:Number.isFinite(duration)&&duration>0?Math.floor(duration):null
      };
      inform('Enviando "'+track.title.slice(0,65)+'" para a fila…');
      const result=await window.sf80QueueSong(track);
      try{remember(id);}catch(_){}
      inform(result?.placement==='waiting'?'✓ Música adicionada à fila de espera!':'✓ Música adicionada à fila colaborativa!');
      notify('🎵 Música adicionada! Abra a fila para acompanhar.');
      // A atualização do roomState deve renderizar a fila mesmo antes de carregar o player.
    }catch(error){
      inform(error?.message||'Não foi possível adicionar a música.',true);
    }finally{
      state.songSending=false;
      changed.forEach(({button,oldDisabled,oldText})=>{
        if(button.isConnected){button.disabled=oldDisabled;button.textContent=oldText;}
      });
    }
  }
  async function mySnapshot(force=false){if(!state.me||force)state.me=await api('/api/platform63/me');return state.me;}
  async function renderPassport(){
    const d=await mySnapshot(true),stamps=d.passport?.stamps||[],catalog=d.passport?.catalog||[],owned=new Set(stamps.map(s=>s.style));
    const prefs=d.preferences?.styles||[];
    body.innerHTML=`<div class="sf63-passport-intro"><div><span class="sf63-eyebrow">SEU PASSAPORTE MUSICAL</span><h3>${stamps.length} / ${catalog.length} estilos explorados</h3><p>Entre em salas públicas dos gêneros para ganhar carimbos reais. O XP é registrado apenas pelo servidor.</p></div><span class="sf63-passport-stamp">🎟️</span></div>
      <div class="sf63-progress" role="progressbar" aria-label="Progresso do passaporte" aria-valuenow="${stamps.length}" aria-valuemin="0" aria-valuemax="${catalog.length}"><span style="width:${catalog.length?stamps.length/catalog.length*100:0}%"></span></div>
      <div class="sf63-passport-grid">${catalog.map(g=>`<div class="sf63-stamp ${owned.has(g.id)?'unlocked':''}"><span>${owned.has(g.id)?'✿':'◇'}</span><strong>${esc(g.title)}</strong><small>${owned.has(g.id)?'Conquistado':'A descobrir'}</small></div>`).join('')}</div>
      <div class="sf63-section-heading"><strong>Minha vibe</strong><span>Personalize as recomendações</span></div><div class="sf63-preferences" id="sf63Preferences">${styles.map(g=>`<button type="button" class="${prefs.includes(g.toLowerCase())?'is-on':''}" data-style="${esc(g.toLowerCase())}" aria-pressed="${prefs.includes(g.toLowerCase())}">${esc(g)}</button>`).join('')}</div>
      <div class="sf63-actions">${btn('Salvar preferências','save-prefs')}${btn('Ver SonoraFan Club','club')}</div>`;
  }
  async function savePrefs(){
    const styles=$$('#sf63Preferences [data-style].is-on').map(x=>x.dataset.style).filter(Boolean);
    await post('/api/platform63/preferences',{styles});
    // Compatibilidade com o filtro "Para minha vibe" já existente no lobby.
    try { const key='sf43_profile_'+currentUser.email;const saved=JSON.parse(localStorage.getItem(key)||'{}');localStorage.setItem(key,JSON.stringify({...saved,styles:styles.map(g=>g==='mpb'?'MPB':g.charAt(0).toUpperCase()+g.slice(1))})); } catch(e) {}
    state.me=null;notify('Preferências salvas. Suas salas serão priorizadas por estilo.');sortRooms();
  }
  async function renderBattle(){
    const slug=currentSlug();if(!slug){body.innerHTML='<p class="sf63-empty">Entre em uma sala colaborativa para começar uma Batalha Musical. A sessão precisa ter duas próximas músicas.</p>';return;}
    const d=await api('/api/platform63/battle/'+encode(slug));state.battle=d;
    const c=d.choices||[],counts=d.votes||[];
    body.innerHTML=`<div class="sf63-intro"><strong>⚡ Qual faixa conquista a sala?</strong><p>Disputa de 90 segundos entre as duas próximas músicas. Todos na sala votam; a playlist continua colaborativa, sem reordenar ou pular faixas.</p></div>
      ${!c.length?`<p class="sf63-empty">Nenhuma batalha ainda. Adicione pelo menos duas próximas músicas à fila.</p>${btn('Iniciar batalha','start-battle')}`:
      `<div class="sf63-battle-head"><span>${d.active?'● VOTAÇÃO ABERTA':'RESULTADO DA BATALHA'}</span><time id="sf63BattleCountdown" data-ends="${d.endsAt||0}"></time></div>
       <div class="sf63-battle-choices">${c.map(t=>{const total=counts.find(v=>v.id===t.id)?.count||0;return `<div class="sf63-battle-choice ${d.myVote===t.id?'selected':''}"><img src="https://img.youtube.com/vi/${t.id}/hqdefault.jpg" alt="" loading="lazy"><strong>${esc(t.title)}</strong><small>${esc(t.artist)}</small><span>${total} ${total===1?'voto':'votos'}</span>${d.active?btn('Votar nesta','vote:'+t.id):d.winner===t.id?'<b>🏆 Vencedora</b>':''}</div>`;}).join('')}</div>
       <p class="sf63-caption">${d.active?'É possível trocar seu voto enquanto a batalha estiver aberta.':'A próxima batalha pode começar após o intervalo de 2 minutos.'}</p>${!d.active?btn('Nova batalha','start-battle'):''}`}`;
    updateCountdown();
  }
  async function battleStart(){const slug=requireRoom();if(!slug)return;await post('/api/platform63/battle/'+encode(slug)+'/start',{});notify('Batalha iniciada! A sala já pode votar.');switchTab('battle');}
  async function battleVote(id){const slug=requireRoom();if(!slug)return;await post('/api/platform63/battle/'+encode(slug)+'/vote',{id});notify('Voto registrado!');switchTab('battle');}
  function updateCountdown(){const el=$('sf63BattleCountdown');if(!el)return;const ends=Number(el.dataset.ends);const secs=Math.max(0,Math.ceil((ends-Date.now())/1000));el.textContent=secs?`${secs}s restantes`:'Tempo encerrado';}
  async function renderChallenge(){
    const slug=currentSlug();if(!slug){body.innerHTML='<p class="sf63-empty">Entre em uma sala para acompanhar o desafio colaborativo. Todas as pessoas podem contribuir com músicas.</p>';return;}
    const d=await api('/api/platform63/challenge/'+encode(slug));state.challenge=d;
    const goals=[['Músicas diferentes',d.songs,d.goalSongs],['Pessoas contribuindo',d.contributors,d.goalContributors]];
    body.innerHTML=`<div class="sf63-intro"><strong>🏅 Desafio da Sala</strong><p>Uma comunidade, uma conquista: adicionem 5 músicas diferentes, escolhidas por pelo menos 3 pessoas. As recompensas só são liberadas após participação validada.</p></div>
      ${goals.map(([title,n,max])=>`<div class="sf63-goal"><div><strong>${esc(title)}</strong><span>${n} / ${max}</span></div><div class="sf63-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${Math.min(n,max)}"><span style="width:${Math.min(100,n/max*100)}%"></span></div></div>`).join('')}
      <p class="sf63-challenge-state">${d.completed?'✅ Desafio concluído! Os participantes válidos receberam XP.':'✦ Completem juntos para ganhar 25 XP e uma medalha coletiva.'}</p><small class="sf63-caption">Período: ${esc(d.week)}. O progresso fica registrado no servidor.</small>`;
  }
  async function renderHistory(){
    const slug=currentSlug();if(!slug){body.innerHTML='<p class="sf63-empty">Entre em uma sala para consultar músicas que já tocaram. O histórico registra novas faixas concluídas a partir desta atualização.</p>';return;}
    const d=await api('/api/platform63/history/'+encode(slug));state.history=d;
    const items=d.items||[];
    body.innerHTML=`<div class="sf63-intro"><strong>☰ Histórico da ${esc(d.name)}</strong><p>Relembre músicas já tocadas e compartilhe a setlist. São dados registrados pela sala, não exemplos.</p></div>
      <div class="sf63-history-actions"><a href="/api/platform63/setlist/${encode(slug)}.csv" class="sf63-download" download>⇩ Exportar setlist CSV</a><span>${items.length} ${items.length===1?'faixa registrada':'faixas registradas'}</span></div>
      ${items.length>4?'<label class="sf150-history-search-label" for="sf150HistorySearch">Localizar no histórico</label><input id="sf150HistorySearch" class="sf150-history-search" type="search" placeholder="Música, artista ou DJ" autocomplete="off" maxlength="80">':''}
      <div class="sf63-track-list" id="sf150HistoryResults">${items.length?items.map(t=>`<div class="sf150-history-item">${trackCard(t,'song:'+t.id)}<small class="sf63-history-note">${esc(t.dj||'Comunidade')} · ${new Date(t.playedAt).toLocaleString('pt-BR')}</small></div>`).join(''):'<p class="sf63-empty">O histórico começa a ser registrado conforme as próximas faixas terminarem.</p>'}</div>`;
    document.getElementById('sf150HistorySearch')?.addEventListener('input',event=>{
      const q=String(event.target.value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
      body.querySelectorAll('.sf150-history-item').forEach(item=>{
        const hay=String(item.textContent||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
        item.hidden=!!q&&!hay.includes(q);
      });
    });
  }
  async function renderSocial(){
    const [contacts,inbox,notifications]=await Promise.all([api('/api/chat53/contacts').catch(()=>[]),api('/api/chat53/inbox').catch(()=>[]),api('/api/social/notifications').catch(()=>[])]);
    state.contacts=Array.isArray(contacts)?contacts:[];state.inbox=Array.isArray(inbox)?inbox:[];
    let pins=[];try{pins=JSON.parse(localStorage.getItem('sf63_chat_pins')||'[]');}catch(e){}
    const unread=(Array.isArray(notifications)?notifications:[]).filter(n=>!n.read).length;
    const threads=state.inbox.sort((a,b)=>(pins.includes(b.id)?1:0)-(pins.includes(a.id)?1:0)||b.updatedAt-a.updatedAt);
    body.innerHTML=`<div class="sf63-intro"><strong>✉ Suas conversas e sua galera</strong><p>Mensagens privadas, amigos e notificações continuam no chat social existente.</p></div>
      <div class="sf63-actions">${btn('Abrir caixa de entrada','inbox')}${btn('Ver notificações ('+unread+')','notifications')}</div>
      <div class="sf63-section-heading"><strong>Conversas recentes</strong><span>Fixar conversa neste navegador</span></div>
      <div class="sf63-social-list">${threads.length?threads.slice(0,15).map(u=>`<div class="sf63-person"><span>${esc(u.avatar||'🎧')}</span><div><strong>${esc(u.name)}</strong><small>${esc(u.preview||'Nenhuma mensagem recente')}${u.unread?' · Não lida':''}</small></div>${btn(pins.includes(u.id)?'★ Desafixar':'☆ Fixar','pin:'+u.id)}${btn('Conversar','dm:'+u.id)}</div>`).join(''):'<p class="sf63-empty">Sem conversas recentes por enquanto.</p>'}</div>
      <div class="sf63-section-heading"><strong>Amigos</strong><span>${state.contacts.length} encontrados</span></div>
      <div class="sf63-social-list">${state.contacts.length?state.contacts.slice(0,18).map(u=>`<div class="sf63-person"><span>${esc(u.avatar||'🎧')}</span><div><strong>${esc(u.name)}</strong><small>${u.online?'● Ouvindo agora':'Fora das salas públicas'}</small></div>${btn('Mensagem','dm:'+u.id)}${currentSlug()?btn('Convidar','invite:'+u.id):''}</div>`).join(''):'<p class="sf63-empty">Você pode seguir pessoas pela Comunidade para encontrá-las aqui.</p>'}</div>`;
  }
  function pinChat(id){let a=[];try{a=JSON.parse(localStorage.getItem('sf63_chat_pins')||'[]');}catch(e){}a=a.includes(id)?a.filter(x=>x!==id):[id,...a].slice(0,20);localStorage.setItem('sf63_chat_pins',JSON.stringify(a));switchTab('social');}
  async function invite(id){const slug=requireRoom();if(!slug)return;await post('/api/social/invite-friend',{userId:id,roomSlug:slug});notify('Convite enviado para a sala!');}
  function openDirect(id){close();if(typeof window.sf53OpenInbox==='function'){window.sf53OpenInbox(id);}else notify('Abra as Mensagens na barra lateral.',true);}
  function sortRooms(){
    if(!$('roomGrid') || !signedIn())return;
    api('/api/platform63/discovery').then(data=>{
      state.roomList=data.rooms||[];const grid=$('roomGrid');const cards=$$('.room-card',grid);if(!cards.length)return;
      const rank=new Map(state.roomList.map((r,i)=>[r.slug,i]));
      const slots=cards.map(c=>({c,index:rank.get(c.dataset.slug)})).filter(x=>x.index!==undefined);
      // Only reorder when the active sort is "Para minha vibe", preserving other controls.
      const vibe=document.querySelector('.sf50-filter[data-sf50-filter="vibe"].is-active');
      if(!vibe)return;
      slots.sort((a,b)=>a.index-b.index).forEach(x=>grid.appendChild(x.c));
    }).catch(()=>{});
  }
  function lobbyActivity(){
    if(!document.getElementById('landingScreen'))return;
    fetch('/api/rooms').then(r=>r.ok?r.json():[]).then(rooms=>{
      const live=(Array.isArray(rooms)?rooms:[]).filter(r=>!r.isPrivate&&r.isPlaying&&r.currentTrack?.id);
      if(!live.length)return;
      const r=live.sort((a,b)=>(b.listenerCount||0)-(a.listenerCount||0))[0];
      $('sf63LandingHighlight').textContent=r.currentTrack.title||'Música acontecendo agora';
      $('sf63LandingActivity').textContent=`Em ${r.name} · ${r.listenerCount||0} ouvindo`;
    }).catch(()=>{});
  }
  function wire(){
    document.addEventListener('click',async e=>{
      const opener=e.target.closest('[data-sf63-open]');if(opener){if(opener.dataset.sf63CloseProfile)window.sf43CloseProfile?.();open(opener.dataset.sf63Open);return;}
      const tab=e.target.closest('[data-sf63-tab]');if(tab){switchTab(tab.dataset.sf63Tab);return;}
      const act=e.target.closest('[data-sf63-action]');if(!act)return;
      const value=act.dataset.sf63Action;try{
        if(value==='refresh')switchTab(state.tab);
        if(value.startsWith('song:'))await chooseSong(value.slice(5));
        if(value==='save-prefs')await savePrefs();
        if(value==='club'){close();window.sf45OpenClub?.();}
        if(value==='start-battle')await battleStart();
        if(value.startsWith('vote:'))await battleVote(value.slice(5));
        if(value==='inbox'){close();window.sf53OpenInbox?.();}
        if(value==='notifications'){close();document.querySelector('.sf15-bell, .sf15-lobby-bell')?.click();}
        if(value.startsWith('pin:'))pinChat(value.slice(4));
        if(value.startsWith('dm:'))openDirect(value.slice(3));
        if(value.startsWith('invite:'))await invite(value.slice(7));
      }catch(error){notify(error.message,true);}
    });
    $('sf63HubClose')?.addEventListener('click',close);$('sf63HubDismiss')?.addEventListener('click',close);
    hub?.addEventListener('click',e=>{if(e.target===hub)close();});
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape'&&!hub.hidden){e.preventDefault();close();}
      if(e.key==='Escape'&&tour&&!tour.hidden){e.preventDefault();endTour();}
      if(e.key==='Tab'&&tour&&!tour.hidden){const controls=$$('button:not([disabled])',tour);if(controls.length){const first=controls[0],last=controls[controls.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}
      if(e.key==='Tab'&&!hub.hidden){const list=$$('button:not([disabled]),a[href],input:not([disabled])',hub).filter(el=>el.getClientRects().length);if(list.length){const first=list[0],last=list[list.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}
    });
    document.querySelectorAll('#sf63Preferences [data-style]').forEach(b=>b.addEventListener('click',()=>{b.classList.toggle('is-on');b.setAttribute('aria-pressed',b.classList.contains('is-on'));}));
    body?.addEventListener('click',e=>{const b=e.target.closest('#sf63Preferences [data-style]');if(b){b.classList.toggle('is-on');b.setAttribute('aria-pressed',b.classList.contains('is-on'));}});
    if(typeof socket!=='undefined'){
      socket.on('sf63:battle',data=>{state.battle=data;if(state.tab==='battle'&&!hub.hidden)switchTab('battle');});
      socket.on('sf63:challenge',data=>{state.challenge=data;if(state.tab==='challenge'&&!hub.hidden)switchTab('challenge');});
      socket.on('sf63:xp',()=>{state.me=null;});
      socket.on('roomState',()=>{state.room=currentSlug();});
    }
    document.addEventListener('click',e=>{if(e.target.closest('.sf50-filter[data-sf50-filter="vibe"]'))setTimeout(sortRooms,300);});
    $('sf43ProfileModal')?.addEventListener('click',e=>{if(e.target.closest('[onclick*="sf43SaveProfile"]')){
      const selected=$$('#sf43StyleChips .sf43-style-chip.is-on').map(el=>String(el.dataset.style||'').toLowerCase());
      post('/api/platform63/preferences',{styles:selected}).then(()=>{state.me=null;}).catch(()=>{});
    }});
  }
  
const TOUR={
  landing:[
    ['.topnav-logo','Bem-vindo ao SonoraFan','Essa é a entrada da comunidade musical. Você pode entrar ou criar uma conta no topo.'],
    ['.hero-text','Sua vibe, sua música','O SonoraFan reúne salas colaborativas onde todo mundo escolhe músicas.'],
    ['.how-grid','Como funciona','São três passos: entrar, escolher uma sala e colaborar com a playlist.']
  ],
  lobby:[
    ['.sf33-banner','Bem-vindo ao novo lobby','A arte tem espírito de festival, mas as salas reais estão logo abaixo.'],
    ['#sf10RoomQuery','Encontre sua vibe','Busque uma sala ou filtre por gênero musical.'],
    ['.sf50-room-tools','Filtros e ordenação','Use os filtros para encontrar salas tocando agora ou mais alinhadas com a sua vibe.'],
    ['#roomGrid','Salas que estão tocando','Cada card mostra a sala, quem está ouvindo e, quando disponível, a capa da música atual.'],
    ['#sf63DiscoverTools','Descubra outras experiências','Busque músicas, consulte o Passaporte Musical e encontre amigos. A área Comunidade agora reúne Amigos, Fan Clubs e Eventos.'],
    ['.sf45-header-club','Seu SonoraFan Club','Acompanhe XP, níveis e medalhas. Você pode reabrir este guia em Ajuda / Tour.']
  ],
  room:[
    ['#sf64RoomSidebarToggle','Menu flexível da sala','Use este botão no canto superior direito para recolher ou abrir o menu lateral quando quiser ganhar mais espaço na sala.'],
    ['#playerSection','Sua sala, sua música','Vídeo com volume, Favoritar e Pular. A reprodução permanece no YouTube.'],
    ['#sf10RequestCard','Todo mundo é DJ','Busque uma música no YouTube e confirme para entrar na fila colaborativa.'],
    ['#queueList','Fila e votação','Veja quem escolheu cada faixa. Apoiar e pedir remoção são votos diferentes.'],
    ['#chatMessages','Converse com a comunidade','Clique nos nicknames, responda mensagens e use a caixa de entrada privada.'],
    ['#sf74OpenFanClubs','Fan Clubs','Explore comunidades criadas por fãs e encontre salas vinculadas a artistas.'],
    ['#sf63RoomTools','Jogos e descobertas','Abra a Batalha Musical, o desafio coletivo e o histórico da sala.'],
    ['.sf45-nav-entry','Pontos e conquistas','XP e medalhas continuam no SonoraFan Club, sem zerar seu histórico.']
  ]
};
function tourKey(mode){const user=typeof currentUser!=='undefined'?currentUser?.email:'visitante';return 'sf63_tour_v67_'+mode+'_'+user;}
  function activeMode(){return $('screen-room')?.classList.contains('active')?'room':$('screen-lobby')?.classList.contains('active')?'lobby':'landing';}
  function startTour(mode=activeMode(),force=true){
    if(!tour)return;endTour(false);if(!TOUR[mode])mode=activeMode();if(!force&&localStorage.getItem(tourKey(mode)))return;
    state.tour={mode,index:0,oldFocus:document.activeElement};tour.hidden=false;document.body.classList.add('sf63-tour-active');showTour();
  }
  function showTour(){
    const a=state.tour;if(!a)return;const list=TOUR[a.mode];if(a.index>=list.length)return endTour();
    const [selector,title,description]=list[a.index],node=document.querySelector(selector);
    $('sf63TourHeading').textContent=title;$('sf63TourDescription').textContent=description;$('sf63TourStepCount').textContent=`Etapa ${a.index+1} de ${list.length}`;
    $('sf63TourPrevious').disabled=a.index===0;$('sf63TourNext').textContent=a.index===list.length-1?'Concluir ✓':'Próximo →';
    if(node?.getClientRects().length){node.scrollIntoView({behavior:'instant',block:'center'});requestAnimationFrame(()=>{
      const r=node.getBoundingClientRect(),ring=$('sf63TourRing');
      const x=Math.max(8,r.left-6),y=Math.max(8,r.top-6),w=Math.min(innerWidth-x-8,r.width+12),h=Math.min(innerHeight-y-8,r.height+12);
      Object.assign(ring.style,{display:'block',left:x+'px',top:y+'px',width:Math.max(30,w)+'px',height:Math.max(20,h)+'px'});
      const card=$('sf63TourCard');card.style.transform='';const wantAbove=r.bottom>innerHeight*.58 && y>220;
      card.style.top=wantAbove?Math.max(12,y-card.offsetHeight-16)+'px':Math.min(innerHeight-card.offsetHeight-12,y+h+16)+'px';
      card.style.left=Math.max(12,Math.min(x,innerWidth-card.offsetWidth-12))+'px';card.focus();
    });}else{$('sf63TourRing').style.display='none';const card=$('sf63TourCard');card.style.top='50%';card.style.left='50%';card.style.transform='translate(-50%,-50%)';card.focus();}
  }
  function endTour(mark=true){if(!state.tour)return;const t=state.tour;state.tour=null;tour.hidden=true;document.body.classList.remove('sf63-tour-active');$('sf63TourCard').style.transform='';if(mark)localStorage.setItem(tourKey(t.mode),'1');t.oldFocus?.focus?.();}
  function maybeTour(mode){if(!signedIn())return;if(!localStorage.getItem(tourKey(mode)))setTimeout(()=>startTour(mode,false),650);}

  function setupRoomSidebar(){
    const screen=$('screen-room');
    const toggleBtn=$('sf64RoomSidebarToggle');
    const toggleLabel=$('sf64RoomSidebarToggleLabel');
    if(!screen||!toggleBtn)return;
    const key='sf64_room_sidebar_collapsed';
    const sync=()=>{
      const collapsed=document.body.classList.contains('sf64-room-sidebar-collapsed');
      toggleBtn.setAttribute('aria-expanded', String(!collapsed));
      toggleBtn.setAttribute('aria-label', collapsed ? 'Abrir menu lateral da sala' : 'Recolher menu lateral da sala');
      if(toggleLabel) toggleLabel.textContent = collapsed ? 'Abrir menu' : 'Fechar menu';
      toggleBtn.classList.toggle('is-collapsed', collapsed);
    };
    const set=(collapsed)=>{
      document.body.classList.toggle('sf64-room-sidebar-collapsed', !!collapsed);
      try{ localStorage.setItem(key, collapsed?'1':'0'); }catch(e){}
      sync();
    };
    toggleBtn.addEventListener('click',()=>set(!document.body.classList.contains('sf64-room-sidebar-collapsed')));
    const mq=window.matchMedia('(max-width: 1024px)');
    const restore=()=>{
      if(mq.matches){
        document.body.classList.remove('sf64-room-sidebar-collapsed');
        if(toggleLabel) toggleLabel.textContent='Menu';
        toggleBtn.classList.remove('is-collapsed');
        toggleBtn.setAttribute('aria-expanded','true');
        toggleBtn.setAttribute('aria-label', 'Menu da sala');
        return;
      }
      let collapsed=false;
      try{ collapsed=localStorage.getItem(key)==='1'; }catch(e){}
      document.body.classList.toggle('sf64-room-sidebar-collapsed', collapsed);
      sync();
    };
    if(mq.addEventListener)mq.addEventListener('change',restore);else if(mq.addListener)mq.addListener(restore);
    restore();
  }

  function setupTour(){
    window.sf63StartTour=startTour;
    window.sf29StartTour=(mode)=>startTour(mode||activeMode(),true);
    window.sf29MaybeWelcome=()=>maybeTour('lobby');
    window.sf29MaybeRoom=()=>maybeTour('room');
    $('sf63TourNext')?.addEventListener('click',()=>{if(!state.tour)return;state.tour.index++;showTour();});
    $('sf63TourPrevious')?.addEventListener('click',()=>{if(!state.tour)return;state.tour.index=Math.max(0,state.tour.index-1);showTour();});
    $('sf63TourSkip')?.addEventListener('click',()=>endTour());
  }

function enhanceLanding(){
  const landing=$('landingScreen');
  if(!landing || landing.dataset.sf67Landing==='1') return;
  const hero=landing.querySelector('.hero');
  if(!hero) return;
  const strip=document.createElement('section');
  strip.className='sf67-landing-strip';
  strip.innerHTML=`<article class="sf67-mini-card"><strong>🎧 Salas colaborativas</strong><p>Entre em uma sala pública ou privada e compartilhe o controle da playlist.</p></article>
    <article class="sf67-mini-card"><strong>🎶 Fila viva</strong><p>Todo mundo pode adicionar músicas, apoiar favoritas e decidir o que toca a seguir.</p></article>
    <article class="sf67-mini-card"><strong>💬 Comunidade + privado</strong><p>Converse na sala, responda pessoas e abra mensagens privadas quando quiser.</p></article>
    <div class="sf67-landing-actions"><button type="button" class="sf67-jump-btn" data-sf67-jump="how">Ver como funciona</button><button type="button" class="sf67-jump-btn is-ghost" data-sf67-jump="features">Ver recursos</button></div>`;
  hero.insertAdjacentElement('afterend', strip);
  strip.addEventListener('click', e=>{
    const btn=e.target.closest('[data-sf67-jump]'); if(!btn) return;
    const target = btn.dataset.sf67Jump==='features' ? landing.querySelector('.feature-grid, .feature-section, .landing-section:nth-of-type(2)') : landing.querySelector('.how-grid, .landing-section');
    target?.scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto':'smooth', block:'start'});
  });
  landing.dataset.sf67Landing='1';
}

function ensureLobbySummary(){
  const tools=document.querySelector('#screen-lobby .sf50-room-tools');
  if(!tools) return null;
  let box=$('sf67LobbySummary');
  if(!box){
    box=document.createElement('section');
    box.id='sf67LobbySummary';
    box.className='sf67-lobby-summary';
    tools.insertAdjacentElement('afterend',box);
  }
  return box;
}

function updateLobbySummary(){
  const box=ensureLobbySummary();
  const grid=$('roomGrid');
  if(!box || !grid) return;
  const cards=$$('.room-card',grid);
  const parseNum=(text)=>{ const m=String(text||'').match(/(\d+)/); return m?Number(m[1]):0; };
  const total=cards.length;
  const live=cards.filter(c=>c.classList.contains('live')).length;
  const listeners=cards.reduce((sum,card)=> sum + parseNum(card.querySelector('.listeners')?.textContent || card.querySelector('.room-listeners-badge')?.textContent),0);
  const withTrack=cards.filter(c=>c.dataset.hasTrack==='1').length;
  const vibe = total ? (live ? 'Tem salas ao vivo para entrar agora.' : 'Explore por estilo e descubra sua próxima sala.') : 'As próximas salas aparecerão aqui.';
  box.innerHTML=`<article class="sf67-summary-card"><small>Salas abertas</small><strong>${total}</strong><span>${total===1?'1 opção pronta para receber você':'Opções colaborativas para explorar'}</span></article>
    <article class="sf67-summary-card"><small>Tocando agora</small><strong>${live}</strong><span>${live===0?'Nenhuma sala ao vivo no momento':(withTrack+' com música destacada')}</span></article>
    <article class="sf67-summary-card"><small>Ouvintes conectados</small><strong>${listeners}</strong><span>${vibe}</span></article>`;
}

function watchLobbySummary(){
  const grid=$('roomGrid');
  if(!grid || grid.dataset.sf67Observed==='1') return;
  updateLobbySummary();
  const mo=new MutationObserver(()=>updateLobbySummary());
  mo.observe(grid,{childList:true,subtree:true});
  grid.dataset.sf67Observed='1';
}

function enhanceQueueSummary(){
  const list=$('queueList');
  if(!list) return;
  let box=$('sf67QueueStats');
  if(!box){
    box=document.createElement('section');
    box.id='sf67QueueStats';
    box.className='sf67-queue-stats';
    list.insertAdjacentElement('beforebegin',box);
  }
  const readTitle=(selector,fallback)=>list.querySelector(selector)?.textContent?.trim() || fallback;
  const items=$$('.queue-item',list).filter(el=>!el.classList.contains('waiting'));
  const current=readTitle('.queue-item.current .title','Aguardando faixa');
  const next=readTitle('.queue-item.sf39-next .title', items[1]?.querySelector('.title')?.textContent?.trim() || 'Escolha a próxima música');
  const total=items.length;
  const status = total>=4 ? 'Fila aquecida' : total>=2 ? 'Boa sequência em andamento' : total===1 ? 'Ainda cabe mais uma escolha' : 'Hora de começar a sessão';
  box.innerHTML=`<div class="sf67-queue-chip"><small>Tocando agora</small><strong>${esc(current)}</strong></div>
    <div class="sf67-queue-chip"><small>A seguir</small><strong>${esc(next)}</strong></div>
    <div class="sf67-queue-chip"><small>Clima da fila</small><strong>${status}</strong><span>${total} ${total===1?'faixa listada':'faixas listadas'}</span></div>`;
}

function watchQueueSummary(){
  const list=$('queueList');
  if(!list || list.dataset.sf67Observed==='1') return;
  enhanceQueueSummary();
  const mo=new MutationObserver(()=>enhanceQueueSummary());
  mo.observe(list,{childList:true,subtree:true});
  list.dataset.sf67Observed='1';
}

function enhanceChatCompanion(){
  const column=document.querySelector('#screen-room .chat-column');
  const heading=column?.querySelector('.premium-chat-heading');
  if(!column || !heading) return;
  if($('sf67ChatCompanion')) return;
  const dismissed=localStorage.getItem('sf67_chat_companion_hidden')==='1';
  const panel=document.createElement('section');
  panel.id='sf67ChatCompanion';
  panel.className='sf67-chat-companion';
  panel.hidden=dismissed;
  panel.innerHTML=`<div class="sf67-chat-companion-head"><div><small>INTERAÇÃO RÁPIDA</small><strong>Converse melhor com a galera</strong></div><button type="button" class="sf67-chat-dismiss" aria-label="Ocultar painel de ajuda">✕</button></div>
    <div class="sf67-chat-pills"><span class="sf67-chat-pill">Clique no nick para responder ou abrir ações</span><span class="sf67-chat-pill">Use @nome para chamar alguém no chat</span><span class="sf67-chat-pill">Abra o Privado para continuar a conversa fora da sala</span></div>
    <div class="sf67-chat-actions"><button type="button" data-sf67-chat="private">Abrir Privado</button><button type="button" data-sf67-chat="tour">Tour da sala</button><button type="button" data-sf67-chat="music">Adicionar música</button></div>`;
  heading.insertAdjacentElement('afterend',panel);
  panel.addEventListener('click',e=>{
    if(e.target.closest('.sf67-chat-dismiss')){ panel.hidden=true; localStorage.setItem('sf67_chat_companion_hidden','1'); return; }
    const btn=e.target.closest('[data-sf67-chat]'); if(!btn) return;
    const action=btn.dataset.sf67Chat;
    if(action==='private') window.sf53OpenInbox?.();
    if(action==='tour') window.sf29StartTour?.('room');
    if(action==='music') document.querySelector('[data-sf63-open="music"]')?.click();
  });
}

function initEnhancements(){
  // Versão 74: cartões extras antigos removidos para não duplicar a fila, o chat e a home.
  ['sf67QueueStats','sf67ChatCompanion','sf67LobbySummary'].forEach(id=>$(id)?.remove());
}

  function init(){
    if(!hub)return;wire();setupTour();setupRoomSidebar();lobbyActivity();initEnhancements();
    setTimeout(()=>{if($('screen-lobby')?.classList.contains('active'))sortRooms();},900);
    setInterval(()=>{if(state.tab==='battle'&&!hub.hidden)updateCountdown();},1000);
    window.sf63OpenHub=open;
    window.sf63RefreshRoomSort=sortRooms;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
