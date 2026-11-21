(function SonoraFanLibrary112() {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fold = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const num = value => Math.max(0, Number(value) || 0);
  const fmt = value => num(value).toLocaleString('pt-BR');
  const yt = id => /^[a-zA-Z0-9_-]{11}$/.test(String(id || ''));
  const mixId = id => /^[a-f0-9-]{36}$/i.test(String(id || ''));
  const slug = id => /^[a-z0-9_-]{1,100}$/i.test(String(id || ''));
  const panel = () => $('sf43ProfileModal');
  const profileOpen = () => panel()?.classList.contains('active');
  const genres = [
    ['rock','Rock','/art-33/poster-rock.webp'],
    ['pop','Pop','/art-40/poster-pop.svg'],
    ['indie','Indie','/art-33/poster-indie.webp'],
    ['eletron','Eletrônica','/art-33/poster-electro.webp'],
    ['mpb','MPB','/art-33/poster-brasil.webp'],
    ['festival','Festivais','/art-41/festival-noite.webp'],
    ['alternativ','Alternativo','/art-44/vinyl-room.webp']
  ];
  const art = ['/art-44/festival-crowd.webp','/art-44/vinyl-room.webp',
               '/art-44/festival-stage.webp','/art-33/poster-indie.webp',
               '/art-33/poster-rock.webp','/art-41/festival-noite.webp'];
  const image = id => yt(id) ? 'https://img.youtube.com/vi/'+encodeURIComponent(id)+'/mqdefault.jpg' : '';
  const state = {
    tab:'profile',request:0,loading:false,loaded:false,query:'',genre:'',
    data:{mixtapes:[],favorites:[],genres:[],profile:null}, errors:[],
    expanded:{mixtapes:false,favorites:false,genres:false,recent:false,rooms:false},opening:null,
    journey:null,journeyBusy:false,journeyError:'',journeyRequest:0,forumClubs:[]
  };
  const api = async path => {
    const res = await fetch(path,{credentials:'include',cache:'no-store'});
    const data = await res.json().catch(()=>null);
    if(!res.ok)throw Error(data?.error||'Não foi possível carregar o acervo.');
    return data;
  };
  const say = (msg,bad=false) => {
    const e=$('sf112Status');if(e){e.textContent=msg||'';e.dataset.error=String(!!bad);}
  };
  const empty=(title,detail,action='',label='')=>
    '<div class="sf112-empty"><strong>'+esc(title)+'</strong><p>'+esc(detail)+'</p>'+
    (action?'<button type="button" data-sf112="'+esc(action)+'">'+esc(label)+'</button>':'')+'</div>';
  function build() {
    const root=panel()?.querySelector('.sf43-profile-body.sf108-ready');
    if(!root||$('sf112Library'))return;
    const nav=document.createElement('nav');
    nav.className='sf112-tabs';nav.id='sf112Tabs';
    nav.setAttribute('aria-label','Áreas do perfil musical');
    nav.innerHTML=[
      ['overview','▦ Visão geral'],['profile','◉ Editar perfil'],['achievements','✦ Minha Jornada'],
      ['library','▣ Minha Biblioteca'],['dna','◈ Meu DNA'],
      ['avatars','◉ Avatares']
    ].map(([id,label])=>'<button type="button" data-sf112-tab="'+id+'" aria-pressed="false">'+label+'</button>').join('');
    const overview=document.createElement('section');overview.id='sf202ProfileOverview';overview.className='sf202-profile-overview';overview.hidden=true;
     const lib=document.createElement('section');lib.id='sf112Library';lib.className='sf112-library';lib.hidden=true;
    lib.setAttribute('aria-label','Minha biblioteca musical');
    lib.innerHTML=`<div class="sf112-heading">
       <div><span>SONORAFAN · BIBLIOTECA</span><h2>Seu acervo musical</h2>
         <p>As músicas, mixtapes e salas que fazem parte da sua história.</p></div>
       <label class="sf112-search">⌕ <input id="sf112Search" type="search"
         placeholder="Buscar no seu acervo…" autocomplete="off" aria-label="Buscar no acervo"></label>
     </div>
     <div class="sf112-utility"><span id="sf112Loading" role="status" aria-live="polite"></span><button type="button" data-sf112="retry">↻ Atualizar acervo</button></div>
     <div class="sf112-stats" id="sf112Stats" aria-label="Seus números"></div>
     <div id="sf112Hero" class="sf112-hero"></div>
     <section class="sf112-section" aria-labelledby="sf112MixHeading">
       <header><div><h3 id="sf112MixHeading">♫ Suas mixtapes</h3>
         <p>As seleções colaborativas que você salvou nas salas.</p></div>
         <button data-sf112="expand" data-part="mixtapes" type="button">Ver todas ›</button></header>
       <div class="sf112-mix-grid" id="sf112Mixtapes"></div>
     </section>
     <section class="sf112-section" id="sf112FavArea" aria-labelledby="sf112FavoritesHeading">
       <header><div><h3 id="sf112FavoritesHeading">♡ Músicas favoritas</h3>
         <p>Suas curtidas, com capas das faixas originais.</p></div>
         <button type="button" data-sf112="manage-favorites">Organizar ›</button></header>
       <div class="sf112-songs" id="sf112Favorites"></div>
       <div class="sf112-more"><button type="button" data-sf112="expand" data-part="favorites">Ver mais músicas ›</button></div>
     </section>
     <section class="sf112-section" aria-labelledby="sf112GenresHeading">
       <header><div><h3 id="sf112GenresHeading">◇ Coleções por estilo</h3>
         <p>Suas categorias pessoais, sem estilos inventados.</p></div>
         <button type="button" data-sf112="manage-favorites">Gerenciar coleções ›</button></header>
       <div class="sf112-genre-grid" id="sf112Genres"></div>
     </section>
     <div class="sf112-bottom">
       <section class="sf112-section"><header><div><h3>◷ Redescubra</h3>
         <p>Músicas que você adicionou às salas recentemente.</p></div></header>
         <div class="sf112-recent-grid" id="sf112Rediscover"></div>
       </section>
       <section class="sf112-section"><header><div><h3>☆ Guardado para depois</h3>
         <p>Suas salas favoritas, prontas para voltar.</p></div></header>
         <div class="sf112-saved-grid" id="sf112Saved"></div>
       </section>
     </div>
     <div class="sf112-status" id="sf112Status" aria-live="polite" role="status"></div>`;
    const dna=document.createElement('section');dna.id='sf112DNA';dna.hidden=true;dna.className='sf112-dna';
    dna.innerHTML='<header><span>SONORAFAN · IDENTIDADE MUSICAL</span><h2>Meu DNA musical</h2><p>Uma visão real das suas contribuições, não de minutos ouvidos.</p></header><div id="sf112DNAContent"></div>';
    const achievements=document.createElement('section');achievements.id='sf112AchievementsHeader';achievements.hidden=true;
    achievements.className='sf112-achievements-intro';
    achievements.innerHTML='<span>SONORAFAN · CONQUISTAS</span><h2>✦ Minha Jornada</h2><p>XP, medalhas, missões, especializações, reputação e histórico — tudo em uma só aba.</p><div id="sf600Journey" aria-live="polite"></div>';
    const hero=root.querySelector('.sf43-profile-hero');
    if(hero)hero.after(nav,overview,lib,dna,achievements);
    else root.prepend(nav,overview,lib,dna,achievements);
    nav.addEventListener('click',e=>{const b=e.target.closest('[data-sf112-tab]');if(b)select(b.dataset.sf112Tab);});
    lib.addEventListener('click',onClick);
    achievements.addEventListener('click',onJourneyClick);
    $('sf112Search').addEventListener('input',e=>{
      state.query=String(e.target.value||'').trim().slice(0,100);render();
    });
    lib.addEventListener('error',e=>{
      const img=e.target;
      if(img instanceof HTMLImageElement && img.dataset.sf112Fallback){
        const fallback=img.dataset.sf112Fallback;delete img.dataset.sf112Fallback;
        img.src=fallback;
      }
    },true);
    panel().classList.add('sf112-ready');
    select('overview',false);
  }
  function select(tab,fetchData=true){
    if(tab==='community')tab='overview';
    if(!['overview','profile','library','dna','achievements','avatars'].includes(tab))tab='overview';
    state.tab=tab;
    const m=panel();if(!m)return;
    m.classList.remove('sf112-tab-overview','sf112-tab-profile','sf112-tab-library','sf112-tab-dna','sf112-tab-achievements','sf112-tab-avatars');
    m.classList.add('sf112-tab-'+tab);
    for(const [id,selected] of [['sf202ProfileOverview',tab==='overview'],['sf112Library',tab==='library'],['sf112DNA',tab==='dna'],
                               ['sf112AchievementsHeader',tab==='achievements']]){
      if($(id))$(id).hidden=!selected;
    }
    m.querySelectorAll('#sf112Tabs [data-sf112-tab]').forEach(b=>{
      const on=b.dataset.sf112Tab===tab;
      b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));
    });
    m.querySelector('.sf43-profile-body')?.scrollTo({top:0,behavior:'instant'});
    if(tab==='library'||tab==='dna'){
      render();
      if(fetchData&&(!state.loaded||Date.now()-(state.lastFetch||0)>30000))load();
    }
    if(tab==='achievements'){
      renderJourney();
      if(fetchData&&(!state.journey||Date.now()-(state.journeyFetched||0)>25000))loadJourney();
    }
    if(tab==='overview')window.sf202RefreshProfile?.();
    if(tab==='avatars'){
      window.sf108AvatarRefresh?.();
      document.getElementById('sf600AvatarSearch')?.focus({preventScroll:true});
    }
  }
  function open(tab='overview'){
    build();
    state.opening=tab;
    if(!profileOpen()) {
      if(typeof window.sf5OpenProfile==='function')window.sf5OpenProfile();
      else {state.opening=null;return;}
    }else{
      select(tab);state.opening=null;
    }
  }
  const journeyFmt=value=>Math.max(0,Number(value)||0).toLocaleString('pt-BR');
  const journeyDate=value=>{
    const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleDateString('pt-BR'):'Data indisponível';
  };
  function journeyMission(m){
    const target=Math.max(1,Number(m.target)||1),progress=Math.min(target,Math.max(0,Number(m.progress)||0));
    return `<article class="sf600-mission"><div class="sf600-mission-head"><strong>${esc(m.icon||'🎯')} ${esc(m.name)}</strong>
      <small>${journeyFmt(progress)}/${journeyFmt(target)} · ${m.claimed?'✓ Concluída':'+'+journeyFmt(m.reward)+' XP'}</small></div>
      <p>${esc(m.description||'')}</p><div class="sf600-bar"><span style="width:${Math.round(progress/target*100)}%"></span></div></article>`;
  }
  function renderJourney(){
    const host=$('sf600Journey');
    const data=state.journey;
    if(host&&state.tab==='achievements'){
      if(!data){host.innerHTML='<div class="sf112-empty"><strong>Carregando Minha Jornada…</strong><p>'+esc(state.journeyError||'Consultando XP, medalhas e missões oficiais.')+'</p><button type="button" data-sf600="refresh">Tentar novamente</button></div>';return;}
      const level=data.level||{},missions=Array.isArray(data.missions)?data.missions:[],
        achievements=Array.isArray(data.achievements)?data.achievements:[],
        badges=Array.isArray(data.badges)?data.badges:[],
        selected=data.preferences?.showcase||[],lifetime=data.lifetime||{},
        reputation=data.reputation||{},recent=Array.isArray(data.recent)?data.recent:[],
        next=data.nextLevel;
      const specializations=[
        ['🎧 DJ',lifetime.songs||0,50,'músicas adicionadas'],
        ['🧭 Explorador',lifetime.rooms||0,20,'salas diferentes'],
        ['🧠 Especialista',reputation.acceptedAnswers||0,10,'respostas aceitas'],
        ['🤝 Comunidade',lifetime.clubs||0,10,'Fan Clubs conhecidos']
      ];
      const catalog=[...achievements].sort((a,b)=>Number(!!b.unlocked)-Number(!!a.unlocked));
      const extra=badges.filter(b=>!achievements.some(x=>x.name===b));
      const pending=missions.filter(m=>!m.claimed).sort((a,b)=>(a.target-a.progress)-(b.target-b.progress));
      host.innerHTML=`<section class="sf600-journey-hero"><div class="sf600-journey-kicker">SUA EVOLUÇÃO É REAL</div>
        <h3>${esc(level.icon||'🎧')} ${esc(level.name||'Ouvinte')}</h3>
        <div class="sf600-journey-stats"><div><strong>${journeyFmt(data.points)}</strong><span>XP acumulado</span></div>
          <div><strong>${journeyFmt(reputation.score)}</strong><span>Reputação no Fórum</span></div>
          <div><strong>${journeyFmt(badges.length)}</strong><span>Medalhas conquistadas</span></div></div>
        <div class="sf600-bar" role="progressbar" aria-label="Progresso para o próximo nível" aria-valuenow="${Math.min(100,Number(level.progress)||0)}" aria-valuemin="0" aria-valuemax="100">
          <span style="width:${Math.min(100,Number(level.progress)||0)}%"></span></div>
        <small>${next?'Faltam '+journeyFmt(Math.max(0,next.min-data.points))+' XP para '+esc(next.name):'Nível máximo atual alcançado.'} · XP histórico preservado</small>
        <div class="sf600-j-actions"><button type="button" data-sf600="ranking">🏆 Ver minha posição no Ranking</button>
          <button type="button" data-sf600="refresh">↻ Atualizar jornada</button></div></section>
        ${pending.length?`<section class="sf600-j-section sf600-next"><h3>✨ Próximo desafio</h3><p>${esc(pending[0].name)} · ${journeyFmt(Math.max(0,pending[0].target-pending[0].progress))} etapas restantes</p></section>`:''}
        <section class="sf600-j-section"><h3>🎯 Missões diárias e semanais</h3>
          <div class="sf600-missions">${missions.map(journeyMission).join('')||'<p>Novas missões serão exibidas aqui.</p>'}</div></section>
        <section class="sf600-j-section"><h3>🏅 Minhas medalhas</h3><p>Escolha até três medalhas conquistadas para destacar no seu perfil e ranking.</p>
          <div class="sf600-medals">${catalog.map(b=>{
            const earned=!!b.unlocked,current=Number(lifetime[b.field])||0,target=Math.max(1,Number(b.at)||1);
            return `<button type="button" data-sf600="medal" data-name="${esc(b.name)}" ${earned?'':'disabled'} aria-pressed="${selected.includes(b.name)}">
              <strong>${esc(earned?b.icon||'🏅':'🔒')} ${esc(b.name)}</strong><small>${esc(b.description||'')}${earned?' · Conquistada':' · '+journeyFmt(Math.min(current,target))+'/'+journeyFmt(target)}</small></button>`;
          }).join('')}${extra.map(b=>`<button type="button" data-sf600="medal" data-name="${esc(b)}" aria-pressed="${selected.includes(b)}"><strong>🏅 ${esc(b)}</strong><small>Medalha histórica preservada</small></button>`).join('')}</div>
          <small>${selected.length}/3 medalhas em destaque. As conquistas permanecem salvas no servidor.</small></section>
        <section class="sf600-j-section"><h3>🌟 Trilhas de especialização</h3><p>Indicadores de participação, sem criação automática de XP extra.</p>
          <div class="sf600-specializations">${specializations.map(([name,value,target,unit])=>`
            <article><strong>${name}</strong><small>${journeyFmt(value)} ${unit}</small>
             <div class="sf600-bar"><span style="width:${Math.min(100,value/target*100)}%"></span></div></article>`).join('')}</div></section>
        <section class="sf600-j-section"><h3>📜 Histórico de recompensas</h3>
          ${recent.length?recent.slice(0,12).map(x=>`<div class="sf600-recent"><strong>${esc(x.name)}</strong><span>+${journeyFmt(x.xp)} XP · ${journeyDate(x.time)}</span></div>`).join(''):'<p>Suas próximas conquistas registradas aparecerão aqui.</p>'}
          <div class="sf600-milestones">${(data.milestones||[]).map(m=>`<span>${m.unlocked?'✓':'🔒'} ${journeyFmt(m.days)} dias</span>`).join('')}</div></section>`;
    }

  }
  async function loadJourney(force=false){
    if(state.journeyBusy&&!force)return;
    const token=++state.journeyRequest;state.journeyBusy=true;state.journeyError='';
    try{
      const result=await Promise.allSettled([api('/api/ranking60/me'),api('/api/fan-clubs?mine=true')]);
      if(token!==state.journeyRequest)return;
      if(result[0].status!=='fulfilled')throw result[0].reason;
      state.journey=result[0].value;
      if(result[1].status==='fulfilled')state.forumClubs=Array.isArray(result[1].value?.clubs)?result[1].value.clubs:[];
      state.journeyFetched=Date.now();
    }catch(err){if(token===state.journeyRequest)state.journeyError=err.message||'Progresso indisponível.';}
    finally{if(token===state.journeyRequest){state.journeyBusy=false;renderJourney();}}
  }
  async function onJourneyClick(e){
    const btn=e.target.closest('[data-sf600]');if(!btn)return;
    const action=btn.dataset.sf600;
    if(action==='refresh'){await loadJourney(true);return;}
    if(action==='ranking'){
      window.sf43CloseProfile?.();window.sf60Ranking?.open?.();return;
    }
    if(action==='club'){
      if(!/^[a-f0-9-]{36}$/i.test(btn.dataset.id||''))return;
      window.sf43CloseProfile?.();window.sf107OpenFanClub?.(btn.dataset.id);return;
    }
    if(action==='medal'){
      const data=state.journey;if(!data)return;
      const earned=new Set(data.badges||[]),name=btn.dataset.name;
      if(!earned.has(name))return;
      const selected=[...(data.preferences?.showcase||[])],index=selected.indexOf(name);
      if(index>=0)selected.splice(index,1);
      else if(selected.length<3)selected.push(name);
      else {say('Escolha até três medalhas.',true);return;}
      btn.disabled=true;
      try{
        const response=await fetch('/api/ranking60/preferences',{
          method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({showcase:selected})
        });
        const saved=await response.json();
        if(!response.ok)throw Error(saved.error||'Não foi possível salvar.');
        state.journey.preferences=saved.preferences;renderJourney();
      }catch(err){say(err.message,true);btn.disabled=false;}
    }
  }
  function stats(){
    const p=state.data.profile||{};
    const cards=[
      ['list-music','♫',state.data.mixtapes.length,'Mixtapes salvas'],
      ['heart','♡',state.data.favorites.length,'Músicas curtidas'],
      ['star','☆',(p.pinnedRooms||[]).length,'Salas salvas'],
      ['history','◷',p.totalAdded||0,'Contribuições']
    ];
    $('sf112Stats').innerHTML=cards.map(([type,icon,value,label])=>
      '<div class="sf112-stat"><span aria-hidden="true">'+icon+'</span><div><strong>'+fmt(value)+'</strong><small>'+esc(label)+'</small></div></div>').join('');
  }
  function matches(...fields){
    const q=fold(state.query);
    return !q || fold(fields.filter(Boolean).join(' ')).includes(q);
  }
  function hero(){
    const first=state.data.mixtapes[0];
    const imageUrl=first&&yt(first.cover)?image(first.cover):'';
    const host=$('sf112Hero');
    host.style.setProperty('--sf112-feature-cover',imageUrl?'url("'+imageUrl+'")':'none');
    const title=first?.title||'Trilhas da minha história';
    const subtitle=first?'Sua mixtape salva em destaque · '+fmt(first.trackCount)+' faixas':
      'Uma coleção pessoal nasce das músicas que você escolhe e salva.';
    host.innerHTML=`<div class="sf112-hero-copy">
      <small>✦ COLEÇÃO EM DESTAQUE</small><h3>${esc(title)}</h3><p>${esc(subtitle)}</p>
      <div class="sf112-hero-actions">
        <button type="button" data-sf112="${first?'open-mixtape':'studio'}" ${first?'data-id="'+esc(first.id)+'"':''}>
          ${first?'▷ Abrir mixtape':'＋ Criar mixtape'}</button>
        <button type="button" data-sf112="scroll-mixtapes">Ver minhas coleções</button>
      </div></div>`;
  }
  function mixCard(m,i){
    const cover=yt(m.cover)?image(m.cover):art[(i+1)%art.length];
    return `<button type="button" class="sf112-mix" data-sf112="open-mixtape" data-id="${esc(m.id)}">
      <span class="sf112-mix-cover"><img src="${cover}" data-sf112-fallback="${art[i%art.length]}"
        alt="" loading="lazy" decoding="async"><i aria-hidden="true">▷</i></span>
      <strong>${esc(m.title||'Mixtape')}</strong><small>${fmt(m.trackCount)} faixas · ${m.shared?'Compartilhada':'Privada'}</small>
    </button>`;
  }
  function mixList(){
    const host=$('sf112Mixtapes');if(!host)return;
    const filtered=state.data.mixtapes.filter(m=>matches(m.title,m.description));
    const show=filtered.slice(0,state.expanded.mixtapes?40:6);
    host.innerHTML=`<button class="sf112-create-mix" type="button" data-sf112="studio">
      <span>＋</span><strong>Nova mixtape</strong><small>Salve a fila de uma sala pública</small></button>`+
      (show.length?show.map(mixCard).join(''):
       empty(state.query?'Nenhuma mixtape encontrada':'Suas mixtapes aparecerão aqui',
         state.query?'Tente outra busca.':'Crie uma na sala para construir seu acervo.'));
    const btn=host.closest('.sf112-section')?.querySelector('[data-part="mixtapes"]');
    if(btn){btn.hidden=filtered.length<=6;btn.textContent=state.expanded.mixtapes?'Ver menos':'Ver todas ›';}
  }
  function songCard(t,i){
    if(!yt(t.id))return '';
    return `<article class="sf112-song">
       <img src="${image(t.id)}" data-sf112-fallback="${art[i%art.length]}"
         loading="lazy" decoding="async" alt="">
       <div><strong title="${esc(t.title)}">${esc(t.title||'Música')}</strong>
         <small>${esc(t.artist||'Artista')}</small></div>
       <button type="button" class="sf112-song-add" data-sf112="queue-track" data-id="${esc(t.id)}"
         title="Adicionar à fila da sala" aria-label="Adicionar ${esc(t.title||'música')} à fila">＋</button>
     </article>`;
  }
  function favList(){
    const host=$('sf112Favorites');if(!host)return;
    const filtered=state.data.favorites.filter(t=>yt(t.id) &&
      (!state.genre|| (state.genre==='__none__'?!state.data.genres.some(g=>g.id===t.genreId):t.genreId===state.genre))&&
      matches(t.title,t.artist));
    const limit=state.expanded.favorites?filtered.length:6;
    host.innerHTML=filtered.length?filtered.slice(0,limit).map(songCard).join(''):
      empty(state.genre||state.query?'Nenhuma música neste filtro':'Ainda não há músicas curtidas',
      state.genre||state.query?'Experimente outro estilo ou termo de busca.':'Favorite músicas nas salas para encontrá-las aqui.',
      state.genre||state.query?'clear-filter':'manage-favorites',
      state.genre||state.query?'Limpar filtro':'Organizar favoritos');
    const area=$('sf112FavArea');
    const more=area?.querySelector('[data-part="favorites"]');
    if(more){more.hidden=filtered.length<=6;more.textContent=state.expanded.favorites?'Ver menos':'Ver mais músicas ›';}
    const heading=$('sf112FavoritesHeading');
    const selected=state.data.genres.find(g=>g.id===state.genre);
    if(heading)heading.textContent=selected?'♡ Músicas favoritas · '+String(selected.name).slice(0,35):
      state.genre==='__none__'?'♡ Músicas sem categoria':'♡ Músicas favoritas';
  }
  function genreTile(g,i){
    const fallback=genres.find(([key])=>fold(g.name).includes(key))?.[2] || art[i%art.length];
    const known=new Set(state.data.genres.map(x=>x.id));
    const count=state.data.favorites.filter(t=>g.id==='__none__'?!known.has(t.genreId):t.genreId===g.id).length;
    const selected=state.genre===g.id;
    return `<button type="button" class="sf112-genre${selected?' on':''}" data-sf112="genre" data-id="${esc(g.id)}"
      aria-pressed="${selected}" style="--sf112-genre-image:url('${fallback}')">
      <strong>${esc(g.name)}</strong><small>${fmt(count)} músicas</small><i aria-hidden="true">›</i></button>`;
  }
  function genreList(){
    const host=$('sf112Genres');if(!host)return;
    const filtered=state.data.genres.filter(g=>matches(g.name));
    const known=new Set(state.data.genres.map(g=>g.id));
    const missing=state.data.favorites.filter(t=>!known.has(t.genreId)).length;
    const tiles=filtered.slice(0,8).map(genreTile);
    if(missing&&!state.query)tiles.push(genreTile({id:'__none__',name:'Sem categoria'},8));
    host.innerHTML=tiles.length?tiles.join(''):
      empty(state.query?'Sem coleções para a busca':'Organize suas favoritas por estilo',
        'Crie categorias musicais para encontrar suas músicas mais rapidamente.',
        'manage-favorites','Criar coleção');
  }
  function recentList(){
    const host=$('sf112Rediscover');if(!host)return;
    const p=state.data.profile||{},items=(p.recent||[]).filter(t=>yt(t.id)&&matches(t.title,t.artist));
    host.innerHTML=items.length?items.slice(0,4).map(songCard).join(''):
      empty('Seu histórico musical começa aqui',
        'As músicas que você adiciona às salas aparecerão nesta seção.');
  }
  function savedRooms(){
    const host=$('sf112Saved');if(!host)return;
    const rooms=(state.data.profile?.pinnedRooms||[]).filter(r=>slug(r.slug)&&matches(r.name));
    host.innerHTML=rooms.length?rooms.slice(0,state.expanded.rooms?30:4).map((r,i)=>
      `<button type="button" class="sf112-saved-room" data-sf112="enter-room" data-id="${esc(r.slug)}">
        <img src="${art[(i+3)%art.length]}" alt="" loading="lazy">
        <span><strong>${esc(r.name||'Sala musical')}</strong>
          <small>${r.isPrivate?'🔒 Privada · ':''}${fmt(r.listenerCount)} ouvintes</small></span><i aria-hidden="true">›</i>
      </button>`).join(''):
      empty('Nenhuma sala guardada','Salve salas pela estrela do player para voltar depois.',
        'goto-lobby','Explorar salas');
  }
  function dna(){
    const host=$('sf112DNAContent');if(!host)return;
    const p=state.data.profile;
    if(state.loading&&!state.loaded){host.innerHTML=empty('Carregando seu DNA','Consultando suas contribuições.');return;}
    if(!p){host.innerHTML=empty('DNA indisponível','Não foi possível consultar seus dados.','retry','Tentar novamente');return;}
    host.innerHTML=`<div class="sf112-dna-stats">
       <div><strong>${fmt(p.totalAdded)}</strong><span>Contribuições registradas</span></div>
       <div><strong>${fmt(p.uniqueArtistsInSample)}</strong><span>Artistas distintos na amostra</span></div>
       <div><strong>${fmt(p.roomsInSample)}</strong><span>Salas diferentes na amostra</span></div></div>
       <div class="sf112-dna-cols">
        <section class="sf112-section"><header><h3>✦ Artistas que você mais adicionou</h3></header>
        ${(p.topArtists||[]).length?p.topArtists.slice(0,8).map((t,i)=>
          `<div class="sf112-rank"><span>${i+1}</span><strong>${esc(t.artist)}</strong><small>${fmt(t.count)} faixas</small></div>`).join(''):
          empty('Ainda sem artistas','Adicione músicas para formar seu histórico.')}</section>
        <section class="sf112-section"><header><h3>♫ Seus estilos e contribuições</h3></header>
          <div class="sf112-dna-tags">${(p.genres||[]).length?p.genres.map(x=>`<span>${esc(x)}</span>`).join(''):
          '<span>Escolha seus estilos no Perfil</span>'}</div>
          ${(p.recent||[]).slice(0,5).map(t=>`<div class="sf112-rank">
            <strong>${esc(t.title)}</strong><small>${esc(t.artist)}</small></div>`).join('')}
        </section>
       </div>
       <p class="sf112-source-note">Baseado nas suas contribuições registradas. A diversidade considera uma amostra de ${fmt(p.sampleSize)} músicas; não representa tempo de audição.</p>`;
  }
  function render(){
    if(!$('sf112Library'))return;
    const loading=$('sf112Loading');
    if(loading)loading.textContent=state.loading?'Atualizando suas coleções…':'';
    if(state.loading&&!state.loaded){
      $('sf112Stats').innerHTML='<p class="sf112-loading" role="status">Carregando seu acervo musical…</p>';
      say('Consultando suas músicas, mixtapes e salas…');return;
    }
    if(state.tab==='dna')dna();
    stats();hero();mixList();favList();genreList();recentList();savedRooms();
    say(state.errors.length?state.errors.length+' área(s) não puderam ser carregadas. Use Atualizar para tentar novamente.':'',
      state.errors.length>0);
  }
  async function load(){
    const token=++state.request;state.loading=true;state.errors=[];
    render();
    const resources=[
      ['/api/favorites','favorites',v=>Array.isArray(v)?v:[]],
      ['/api/favorite-genres','genres',v=>Array.isArray(v?.genres)?v.genres:[]],
      ['/api/studio100/mixtapes','mixtapes',v=>Array.isArray(v?.items)?v.items:[]],
      ['/api/experience95/profile','profile',v=>v&&typeof v==='object'?v:null]
    ];
    const results=await Promise.allSettled(resources.map(async([url,key,parse])=>{
      const data=await api(url);
      if(state.request===token){
        state.data[key]=parse(data);
        state.loaded=true; // Show the first real results immediately.
        render();
      }
    }));
    if(state.request!==token)return;
    state.errors=results.map((v,i)=>v.status==='rejected'?resources[i][1]:null).filter(Boolean);
    state.loading=false;state.loaded=true;state.lastFetch=Date.now();render();
  }
  function close(){
    if(profileOpen())window.sf43CloseProfile?.();
  }
  function studio(){
    close();
    window.sf95OpenHub?.('studio');
  }
  function favoritesModal(){
    close();
    if(typeof toggleFavorites==='function')toggleFavorites();
    else document.querySelector('button[onclick*="toggleFavorites"]')?.click();
  }
  function addTrack(id){
    const t=[...state.data.favorites,...(state.data.profile?.recent||[])].find(x=>x.id===id);
    if(!t||!yt(t.id))return;
    if(typeof currentRoom==='undefined'||!currentRoom){
      say('Entre em uma sala primeiro para adicionar esta música à fila.',true);return;
    }
    if(typeof socket==='undefined'||!socket?.connected){
      say('A conexão com a sala está indisponível.',true);return;
    }
    socket.emit('addSong',{id:t.id,title:String(t.title||'Música').slice(0,160),
      artist:String(t.artist||'Artista').slice(0,100),duration:null});
    say('Solicitação enviada à fila da sala.'); // Do not claim acknowledgement.
  }
  function onClick(e){
    const b=e.target.closest('[data-sf112]');if(!b)return;
    const cmd=b.dataset.sf112,id=b.dataset.id;
    if(cmd==='studio')return studio();
    if(cmd==='open-mixtape'){
      if(!mixId(id)){say('Mixtape indisponível.',true);return;}
      close();window.sf100OpenMixtape?.(id);return;
    }
    if(cmd==='manage-favorites')return favoritesModal();
    if(cmd==='queue-track')return addTrack(id);
    if(cmd==='clear-filter'){state.genre='';state.query='';$('sf112Search').value='';render();return;}
    if(cmd==='genre'){state.genre=state.genre===id?'':id;state.expanded.favorites=false;
      render();$('sf112FavArea')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
    if(cmd==='expand'){const k=b.dataset.part;if(k in state.expanded){state.expanded[k]=!state.expanded[k];render();}return;}
    if(cmd==='retry'){load();return;}
    if(cmd==='scroll-mixtapes')return $('sf112Mixtapes')?.scrollIntoView({behavior:'smooth',block:'center'});
    if(cmd==='enter-room'){
      if(!slug(id)){say('Sala indisponível.',true);return;}
      close();if(typeof joinRoom==='function')joinRoom(id);return;
    }
    if(cmd==='goto-lobby'){
      close();
      if(typeof currentRoom!=='undefined'&&currentRoom&&typeof leaveRoom==='function')leaveRoom();
      else if(typeof showScreen==='function')showScreen('lobby');
      return;
    }
  }
  function init(){
    build();
    const modal=panel();if(!modal)return;
    let wasOpen=profileOpen();
    new MutationObserver(()=>{
      const now=profileOpen();
      if(now&&!wasOpen){
        state.request++;state.loaded=false;state.loading=false;state.lastFetch=0;
        state.data={mixtapes:[],favorites:[],genres:[],profile:null};
        state.errors=[];state.query='';state.genre='';
        state.journey=null;state.journeyFetched=0;state.forumClubs=[];state.journeyRequest++;
        if($('sf112Search'))$('sf112Search').value='';
        const target=state.opening||'overview';state.opening=null;
        select(target);
      }
      if(!now&&wasOpen)state.request++;
      wasOpen=now;
    }).observe(modal,{attributes:true,attributeFilter:['class']});
    window.sf112OpenProfile=open;
    window.sf112SwitchProfileTab=select;
    document.addEventListener('sf112:refresh-library',()=>{if(profileOpen()&&state.tab==='library')load();});
    if(profileOpen())select('overview',false);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();