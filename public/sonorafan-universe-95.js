(function SonoraFanUniverse95() {
  'use strict';
  const $=id=>document.getElementById(id);
  const one=sel=>document.querySelector(sel);
  const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const valid=id=>/^[A-Za-z0-9_-]{11}$/.test(String(id||''));
  const count=n=>Number(n||0).toLocaleString('pt-BR');
  const active=()=>!!$('screen-room')?.classList.contains('active');
  const client=()=>typeof socket!=='undefined'?socket:null;
  const state={room:null,profile:null,admin:false,tab:'discover',open:false,focus:null,busy:false,
    suggestions:[],seed:'',searching:false,searchError:'',recap:null,recapError:'',recapLoading:false};
  const slug=()=>state.room?.slug||(typeof currentRoom!=='undefined'?currentRoom:'')||'';
  const message=(text,bad=false)=>{
    const el=$('sf95Notice');
    if(el){el.textContent=text;el.classList.toggle('bad',bad);}
    else if(typeof toast==='function')toast(text,bad?'error':'success');
  };
  const empty=(title,detail)=>'<div class="sf95-empty"><strong>'+esc(title)+'</strong><p>'+esc(detail)+'</p></div>';
  async function api(url,options){
    const response=await fetch(url,{credentials:'include',...(options||{})});
    const body=await response.json().catch(()=>null);
    if(!response.ok)throw Error(body?.error||'Serviço temporariamente indisponível.');
    return body;
  }
  async function ack(event,data){
    if(!client()?.connected)throw Error('Conexão com a sala indisponível.');
    return new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>reject(Error('A sala não respondeu.')),8000);
      client().emit(event,data,result=>{
        clearTimeout(timeout);
        if(result?.ok)resolve(result);else reject(Error(result?.error||'Operação não autorizada.'));
      });
    });
  }
  async function profile(force=false){
    if(state.profile&&!force)return state.profile;
    const p=await api('/api/experience95/profile');
    state.profile=p;
    window.sf95Queue?.setUserId(p.userId);
    syncStar();
    return p;
  }
  function syncStar(){
    const button=$('sf95SaveRoom');
    if(!button)return;
    const current=slug(),pinned=state.profile?.pinnedRooms||[];
    const on=!!current&&pinned.some(t=>t.slug===current);
    button.hidden=!active()||!current;
    button.textContent=on?'★':'☆';
    button.setAttribute('aria-pressed',String(on));
    button.setAttribute('aria-label',on?'Remover sala dos favoritos':'Salvar sala nos favoritos');
    button.title=on?'Remover sala dos favoritos':'Salvar sala nos favoritos';
  }
  async function pinRoom(target){
    if(state.busy||!target)return;
    state.busy=true;
    try{
      const p=await profile();
      const already=p.pinnedRooms.some(r=>r.slug===target);
      await api('/api/experience95/pin',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({slug:target,pinned:!already})});
      await profile(true);
      message(already?'Sala removida dos favoritos.':'Sala salva nos favoritos.');
      if(state.open&&state.tab==='rooms')render();
    }catch(e){message(e.message,true);}
    finally{state.busy=false;syncStar();}
  }
  function build(){
    if($('sf95Overlay'))return;
    const layer=document.createElement('div');
    layer.id='sf95Overlay';layer.className='sf95-overlay';layer.hidden=true;
    layer.innerHTML=`
      <div class="sf95-backdrop" data-sf95-close></div>
      <section class="sf95-dialog" role="dialog" aria-modal="true" aria-labelledby="sf95Heading">
        <header class="sf95-head">
          <div><small>SONORAFAN · MAIS MÚSICA, MENOS RUÍDO</small><h2 id="sf95Heading">Meu universo musical</h2></div>
          <button type="button" aria-label="Fechar painel" data-sf95-close>✕</button>
        </header>
        <nav role="tablist" aria-label="Seções do universo musical" class="sf95-tabs">
          <button type="button" role="tab" data-sf95-tab="discover">✦ Descobrir</button>
          <button type="button" role="tab" data-sf95-tab="rooms">☆ Salas</button>
          <button type="button" role="tab" data-sf95-tab="recap">◷ Recap</button>
          <button type="button" role="tab" data-sf95-tab="dna">◈ Meu DNA</button>
          <button type="button" role="tab" data-sf95-tab="queue">♫ Fila</button>
          <button type="button" role="tab" data-sf95-tab="studio">✧ Estúdio</button>
        </nav>
        <div class="sf95-body" id="sf95Body" role="tabpanel"></div>
        <footer class="sf95-footer" id="sf95Notice" role="status" aria-live="polite"></footer>
      </section>`;
    document.body.append(layer);
    layer.addEventListener('click',event=>{
      if(event.target.closest('[data-sf95-close]'))return close();
      const tab=event.target.closest('[data-sf95-tab]');
      if(tab)return select(tab.dataset.sf95Tab);
      const action=event.target.closest('[data-sf95-action]');
      if(action)return handle(action);
    });
    document.addEventListener('keydown',event=>{
      if(!state.open)return;
      if(event.key==='Escape'){event.preventDefault();close();return;}
      if(event.key==='Tab'){
        const inputs=[...layer.querySelectorAll('button:not([disabled]),input:not([disabled]),a[href]')]
          .filter(el=>!el.closest('[hidden]')&&el.getClientRects().length);
        if(!inputs.length)return;
        if(event.shiftKey&&document.activeElement===inputs[0]){event.preventDefault();inputs[inputs.length-1].focus();}
        else if(!event.shiftKey&&document.activeElement===inputs[inputs.length-1]){event.preventDefault();inputs[0].focus();}
      }
    });
  }
  function open(tab='discover'){
    build();state.focus=document.activeElement;state.open=true;
    $('sf95Overlay').hidden=false;
    document.body.classList.add('sf95-modal-open');
    select(tab);
    $('sf95Overlay').querySelector('[data-sf95-tab="'+state.tab+'"]')?.focus({preventScroll:true});
  }
  function close(){
    if(!state.open)return;
    $('sf95Overlay').hidden=true;state.open=false;
    document.body.classList.remove('sf95-modal-open');
    state.focus?.focus?.({preventScroll:true});state.focus=null;
  }
  function select(tab){
    if(!['discover','rooms','recap','dna','queue','studio'].includes(tab))tab='discover';
    state.tab=tab;
    document.querySelectorAll('.sf95-tabs [data-sf95-tab]').forEach(b=>{
      const selected=b.dataset.sf95Tab===tab;
      b.classList.toggle('on',selected);b.setAttribute('aria-selected',String(selected));
    });
    if($('sf95Notice'))$('sf95Notice').textContent='';
    render();
    if(tab==='discover'&&!state.suggestions.length&&!state.searching)recommend();
    if(tab==='recap'&&!state.recap&&!state.recapLoading&&slug())refreshRecap();
    if((tab==='dna'||tab==='rooms')&&!state.profile)
      profile().then(()=>{if(state.open&&state.tab===tab)render();}).catch(e=>message(e.message,true));
  }
  function render(){
    const host=$('sf95Body');if(!host)return;
    if(state.tab==='discover')return renderDiscovery(host);
    if(state.tab==='rooms')return renderRooms(host);
    if(state.tab==='recap')return renderRecap(host);
    if(state.tab==='dna')return renderDNA(host);
    if(state.tab==='studio')return window.sf100RenderStudio?.(host,state) || (host.textContent='Estúdio não disponível.');
    return renderQueueMode(host);
  }
  function renderDiscovery(host){
    host.innerHTML=`<div class="sf95-intro"><h3>Descubra sua próxima música</h3>
      <p>Sugestões obtidas da busca do YouTube usando artistas das suas contribuições, favoritas e da sala. Você escolhe e confirma.</p></div>
      <div class="sf95-actions"><span class="sf95-seed">${state.seed?'Base: '+esc(state.seed):'Descoberta musical'}</span>
      <button type="button" data-sf95-action="recommend" ${state.searching?'disabled':''}>↻ Novas sugestões</button></div>
      <div class="sf95-track-list">${
        state.searching?empty('Buscando músicas','Consultando resultados disponíveis.') :
        state.searchError?empty('Não foi possível buscar',state.searchError) :
        state.suggestions.length?state.suggestions.map(t=>`<article class="sf95-track">
        <img src="https://img.youtube.com/vi/${encodeURIComponent(t.id)}/mqdefault.jpg" alt="" loading="lazy">
        <div><strong>${esc(t.title)}</strong><small>${esc(t.artist)}</small></div>
        <button type="button" data-sf95-action="pick" data-id="${esc(t.id)}">＋ Escolher</button>
        </article>`).join('') :
        empty('Encontre um novo som','Atualize as sugestões para buscar artistas relacionados.')
      }</div>`;
  }
  async function recommend(){
    if(state.searching)return;
    state.searching=true;state.searchError='';
    if(state.open&&state.tab==='discover')render();
    try{
      const p=state.profile||await profile().catch(()=>null);
      let fav=[];
      try {const f=await api('/api/favorites');fav=Array.isArray(f)?f:[];}catch(_){}
      const artists=[p?.topArtists?.[0]?.artist,fav.find(t=>t?.artist)?.artist,
        state.room?.queue?.[state.room?.currentIndex||0]?.artist]
        .filter(x=>typeof x==='string'&&x.trim().length>2&&!/^(desconhecido|unknown|artista)$/i.test(x));
      const seeds=[...new Set(artists)].slice(0,2);
      if(!seeds.length)seeds.push('indie rock');
      state.seed=seeds.join(' · ');
      const results=await Promise.all(seeds.map(s=>api('/api/search-youtube?q='+encodeURIComponent(s)).catch(()=>({items:[]}))));
      const ids=new Set(),queued=new Set([...(state.room?.queue||[]),...(state.room?.waitingQueue||[])].map(t=>t.id));
      state.suggestions=results.flatMap(r=>Array.isArray(r.items)?r.items:[])
        .filter(t=>valid(t?.id)&&!queued.has(t.id)&&!ids.has(t.id)&&ids.add(t.id))
        .slice(0,8).map(t=>({id:t.id,title:String(t.title||'Música').slice(0,110),artist:String(t.artist||'Artista').slice(0,75)}));
      if(!state.suggestions.length)state.searchError='Nenhuma sugestão disponível. Tente buscar outro artista.';
    }catch(e){state.searchError=e.message;}
    finally{state.searching=false;if(state.open&&state.tab==='discover')render();}
  }
  function renderRooms(host){
    const pins=state.profile?.pinnedRooms||[],current=slug();
    const on=pins.some(t=>t.slug===current);
    host.innerHTML=`<div class="sf95-intro"><h3>Salas salvas</h3><p>Volte rapidamente às suas comunidades. O acesso a salas privadas continua protegido.</p></div>
      ${active()&&current?`<div class="sf95-actions"><strong>${esc(state.room?.name||'Sala atual')}</strong>
      <button type="button" data-sf95-action="pin" data-slug="${esc(current)}">${on?'★ Remover':'☆ Salvar sala'}</button></div>`:''}
      <div class="sf95-room-list">${pins.length?pins.map(t=>`<article class="sf95-room">
        <div><strong>${esc(t.name)}</strong><small>${t.isPrivate?'🔒 Privada · ':''}${t.isPlaying?'● Tocando · ':''}${count(t.listenerCount)} ouvintes</small></div>
        <button type="button" data-sf95-action="enter" data-slug="${esc(t.slug)}">Entrar</button>
        <button type="button" title="Remover dos salvos" aria-label="Remover ${esc(t.name)}" data-sf95-action="pin" data-slug="${esc(t.slug)}">★</button>
      </article>`).join(''):empty('Nenhuma sala favorita','Salve uma sala usando a estrela ao lado de seu nome.')}</div>`;
  }
  function renderDNA(host){
    const p=state.profile;
    if(!p){host.innerHTML=empty('Carregando seu DNA musical','Consultando suas contribuições.');return;}
    host.innerHTML=`<div class="sf95-intro"><h3>Meu DNA musical</h3><p>Estatísticas de músicas que você adicionou. Não representam minutos ouvidos.</p></div>
      <div class="sf95-stat-grid">
        <div><strong>${count(p.totalAdded)}</strong><span>Contribuições</span></div>
        <div><strong>${count(p.uniqueArtistsInSample)}</strong><span>Artistas distintos*</span></div>
        <div><strong>${count(p.roomsInSample)}</strong><span>Salas diferentes*</span></div>
      </div>
      <div class="sf95-columns"><section><h4>Artistas que você mais adicionou</h4>
        ${p.topArtists?.length?p.topArtists.map((t,i)=>`<div class="sf95-rank"><b>${i+1}</b><strong>${esc(t.artist)}</strong><small>${count(t.count)} faixas</small></div>`).join(''):
          empty('Sua história começa aqui','Adicione músicas nas salas para construir seu perfil.')}
        </section><section><h4>Estilos do seu perfil</h4>
        <div class="sf95-tags">${p.genres?.length?p.genres.map(g=>'<span>'+esc(g)+'</span>').join(''):'<p>Nenhum estilo cadastrado.</p>'}</div>
        <h4>Contribuições recentes</h4>${(p.recent||[]).slice(0,5).map(t=>
          `<div class="sf95-recent"><strong>${esc(t.title)}</strong><small>${esc(t.artist)}</small></div>`).join('')||'<p>Sem contribuições registradas.</p>'}
      </section></div>
      <p class="sf95-hint">* Diversidade calculada nas últimas ${count(p.sampleSize)} contribuições registradas nesta versão. Dados históricos não registrados não são estimados.</p>`;
  }
  async function refreshRecap(){
    const current=slug();if(!current)return;
    state.recapLoading=true;state.recapError='';
    if(state.open&&state.tab==='recap')render();
    try{
      const data=await api('/api/platform63/history/'+encodeURIComponent(current));
      const items=Array.isArray(data?.items)?data.items:[];
      const artists=new Map(),djs=new Map();
      for(const t of items){
        const a=String(t.artist||'Artista não identificado').slice(0,70);
        const d=String(t.dj||'Comunidade').slice(0,60);
        artists.set(a,(artists.get(a)||0)+1);djs.set(d,(djs.get(d)||0)+1);
      }
      const mostSupported=items.filter(t=>Number(t.likes)>0).sort((a,b)=>Number(b.likes)-Number(a.likes))[0]||null;
      state.recap={
        topSong:mostSupported?{title:String(mostSupported.title||'Música').slice(0,100),votes:Number(mostSupported.likes)||0}:null,
        slug:current,name:String(data.name||state.room?.name||'Sala SonoraFan').slice(0,90),
        count:items.length,artist:[...artists].sort((a,b)=>b[1]-a[1])[0]?.[0]||null,
        dj:[...djs].sort((a,b)=>b[1]-a[1])[0]?.[0]||null
      };
    }catch(e){state.recapError=e.message;}
    finally{state.recapLoading=false;if(state.open&&state.tab==='recap')render();}
  }
  function renderRecap(host){
    if(!slug()){host.innerHTML=empty('Entre em uma sala','O Recap utiliza o histórico registrado de músicas tocadas.');return;}
    if(state.recapLoading){host.innerHTML=empty('Preparando Recap','Consultando o histórico real da sala.');return;}
    if(state.recapError){host.innerHTML=empty('Histórico indisponível',state.recapError)+
      '<button type="button" data-sf95-action="recap-refresh">Tentar novamente</button>';return;}
    const r=state.recap;
    if(!r){host.innerHTML=empty('Recap musical','Atualize para gerar seu resumo.');return;}
    host.innerHTML=`<div class="sf95-recap" id="sf95RecapCard">
      <small>✦ SONORAFAN / RECAP</small><h3>${esc(r.name)}</h3>
      <div class="sf95-recap-number">${count(r.count)}<span>músicas registradas</span></div>
      <div class="sf95-recap-data"><div><small>ARTISTA MAIS TOCADO</small><strong>${esc(r.artist||'Aguardando histórico')}</strong></div>
        <div><small>QUEM MAIS CONTRIBUIU</small><strong>${esc(r.dj||'Aguardando histórico')}</strong></div>
        <div class="sf95-supported-song"><small>FAIXA MAIS APOIADA</small><strong>${esc(r.topSong?r.topSong.title+' · '+r.topSong.votes+' apoios':'Sem apoios registrados')}</strong></div></div>
      <span class="sf95-recap-end">A trilha sonora é de todos. ♫</span>
      </div><p class="sf95-hint">Baseado em músicas já concluídas no histórico, não em estimativas ou na fila futura.</p>
      <div class="sf95-actions"><button type="button" data-sf95-action="recap-image">↓ Card PNG</button>
      <button type="button" data-sf95-action="recap-share">↗ Compartilhar</button>
      <button type="button" data-sf95-action="recap-refresh">↻ Atualizar</button></div>`;
  }
  function recapText(){
    const r=state.recap;if(!r)return '';
    return '🎧 SONORAFAN · RECAP\n'+r.name+'\n♫ '+r.count+' músicas registradas'+
      (r.artist?'\n★ Artista mais tocado: '+r.artist:'')+
      (r.dj?'\n✦ Quem mais contribuiu: '+r.dj:'')+
      (r.topSong?'\n👍 Faixa mais apoiada: '+r.topSong.title+' ('+r.topSong.votes+' votos)':'')+'\n\nFeito no SonoraFan ♫';
  }
  function saveRecapImage(){
    const r=state.recap;if(!r)return;
    const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;
    const c=canvas.getContext('2d');if(!c)return;
    const gradient=c.createLinearGradient(0,0,1080,1350);
    gradient.addColorStop(0,'#4b245a');gradient.addColorStop(.6,'#1a102a');gradient.addColorStop(1,'#080611');
    c.fillStyle=gradient;c.fillRect(0,0,1080,1350);
    const fit=(value,y,size,color,max=900)=>{
      let text=String(value||'');c.font='bold '+size+'px sans-serif';c.fillStyle=color;
      while(text.length>3&&c.measureText(text).width>max)text=text.slice(0,-2);
      c.fillText(text,80,y);
    };
    fit('✦ SONORAFAN / RECAP',160,32,'#f0bfe9');
    fit(r.name,285,64,'#ffffff');
    fit(String(r.count),560,220,'#ffb58f');
    fit('MÚSICAS REGISTRADAS',660,27,'#d4bdd9');
    fit('ARTISTA MAIS TOCADO',775,24,'#eeacd3');
    fit(r.artist||'Aguardando histórico',826,42,'#ffffff');
    fit('QUEM MAIS CONTRIBUIU',926,24,'#eeacd3');
    fit(r.dj||'Aguardando histórico',977,42,'#ffffff');
    fit('FAIXA MAIS APOIADA',1080,24,'#eeacd3');
    fit(r.topSong?r.topSong.title+' · '+r.topSong.votes+' apoios':'Sem apoios registrados',1132,35,'#ffffff');
    fit('A trilha sonora é de todos. ♫',1270,27,'#d3b6e0');
    canvas.toBlob(blob=>{
      if(!blob)return message('Não foi possível gerar a imagem.',true);
      const url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download='sonorafan-recap-'+r.slug.replace(/[^a-z0-9_-]/gi,'')+'.png';
      document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
      message('Card gerado.');
    },'image/png');
  }
  async function shareRecap(){
    const text=recapText();
    try{
      if(navigator.share)await navigator.share({title:'SonoraFan · Recap',text});
      else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);message('Resumo copiado.');}
      else message('Seu navegador não suporta compartilhamento.',true);
    }catch(e){if(e.name!=='AbortError')message('Não foi possível compartilhar.',true);}
  }
  function renderQueueMode(host){
    const hasRoom=active()&&!!slug(),enabled=!!state.room?.votePriority,mode=state.room?.musicMode||'all';
    host.innerHTML=`<div class="sf95-intro"><h3>Opções da fila</h3>
      <p>Mais controle, sem interferir na música atual. As permissões continuam no servidor.</p></div>
      <div class="sf95-setting"><div><strong>Prioridade por votos positivos</strong>
        <p>As próximas músicas com mais apoios sobem na lista. A música tocando fica na mesma posição.</p>
        <small>${enabled?'● Ativo':'○ Desativado'}${mode==='fair'?' · Fila Justa ativa':''}</small></div>
        ${state.admin&&hasRoom?`<button type="button" data-sf95-action="priority" ${mode==='fair'&&!enabled?'disabled':''}>${enabled?'Desativar':'Ativar'}</button>`:
          '<span class="sf95-muted">Somente o responsável</span>'}</div>
      <div class="sf95-setting"><div><strong>Buscar e retirar músicas próprias</strong>
        <p>Use o filtro “Minhas” na fila. A opção Retirar aparece apenas antes de sua música começar.</p></div>
        ${hasRoom?'<button type="button" data-sf95-action="filter">⌕ Filtrar fila</button>':''}</div>
      ${hasRoom?'':empty('Entre em uma sala','As configurações são específicas de cada sala.')}`;
  }
  async function handle(btn){
    const action=btn.dataset.sf95Action;
    if(action==='recommend')return recommend();
    if(action==='pin')return pinRoom(btn.dataset.slug);
    if(action==='enter'){
      const target=btn.dataset.slug;
      if(!state.profile?.pinnedRooms?.some(r=>r.slug===target))return;
      close();if(typeof joinRoom==='function')joinRoom(target);return;
    }
    if(action==='pick'){
      const track=state.suggestions.find(t=>t.id===btn.dataset.id);
      if(!track)return;
      if(!active())return message('Entre em uma sala antes de escolher uma música.',true);
      close();window.sf77PickTrack?.(track);return;
    }
    if(action==='filter'){close();window.sf95Queue?.openFilter();return;}
    if(action==='priority'){
      btn.disabled=true;
      try{
        const result=await ack('sf95:setVotePriority',{enabled:!state.room?.votePriority});
        state.room={...state.room,votePriority:result.enabled};render();message('Prioridade da fila atualizada.');
      }catch(e){message(e.message,true);btn.disabled=false;}return;
    }
    if(action==='recap-refresh')return refreshRecap();
    if(action==='recap-image')return saveRecapImage();
    if(action==='recap-share')return shareRecap();
  }
  function launchers(){
    const nav=one('#screen-room .sf5-navigation');
    if(nav&&!$('sf95RoomHub')){
      const b=document.createElement('button');b.id='sf95RoomHub';b.type='button';
      b.innerHTML='<span class="sf64-menu-icon" aria-hidden="true">✦</span><span>Meu universo</span>';
      b.addEventListener('click',()=>open('discover'));nav.append(b);
    }
    const lobby=one('#screen-lobby .sf28-sidebar-nav');
    if(lobby&&!$('sf95LobbyHub')){
      const b=document.createElement('button');b.id='sf95LobbyHub';b.type='button';
      b.innerHTML='<span class="sf64-menu-icon" aria-hidden="true">☆</span><span>Salas favoritas</span>';
      b.addEventListener('click',()=>open('rooms'));lobby.insertBefore(b,lobby.children[1]||null);
    }
    const grid=$('roomGrid');
    if(grid&&!$('sf95MobileSaved')){
      const b=document.createElement('button');b.id='sf95MobileSaved';b.type='button';
      b.textContent='☆ Salas salvas';b.addEventListener('click',()=>open('rooms'));grid.before(b);
    }
    const heading=one('#screen-room .sf5-section-title.sf34-room-title');
    if(heading&&!$('sf95SaveRoom')){
      const b=document.createElement('button');b.id='sf95SaveRoom';b.type='button';
      b.className='sf95-save-room';b.textContent='☆';
      b.addEventListener('click',()=>pinRoom(slug()));
      heading.querySelector('.sf5-live-indicator')?.after(b);syncStar();
    }
    if(heading&&!$('sf95RoomQuick')){
      const b=document.createElement('button');b.id='sf95RoomQuick';b.type='button';
      b.className='sf95-room-quick';b.textContent='✦';b.title='Abrir Meu universo musical';
      b.setAttribute('aria-label',b.title);
      b.addEventListener('click',()=>open('discover'));
      $('sf95SaveRoom')?.after(b);
    }
  }
  function init(){
    build();launchers();
    client()?.on('roomState',data=>{
      if(state.room?.slug!==data.slug){state.recap=null;state.suggestions=[];state.searchError='';}
      state.room=data;syncStar();
      if(state.open&&(state.tab==='queue'||state.tab==='rooms'))render();
    });
    client()?.on('isAdmin',value=>{state.admin=!!value;if(state.open&&state.tab==='queue')render();});
    profile().catch(()=>{});
    window.sf95OpenHub=open;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();