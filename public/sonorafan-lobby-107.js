(function SonoraFanLobby107(){
  'use strict';
  const $=id=>document.getElementById(id);
  const app=()=>document.getElementById('screen-lobby');
  const active=()=>!!app()?.classList.contains('active');
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const count=x=>Math.max(0,Number(x)||0);
  const fmt=x=>count(x).toLocaleString('pt-BR');
  const valid=x=>typeof x==='string'&&/^[a-z0-9][a-z0-9_-]{0,100}$/i.test(x);
  const yt=x=>typeof x==='string'&&/^[a-zA-Z0-9_-]{11}$/.test(x);
  const art={crowd:'/art-44/festival-crowd.webp',stage:'/art-44/festival-stage.webp',
    festival:'/art-41/festival-noite.webp',vinyl:'/art-44/vinyl-room.webp',
    record:'/art-44/record-collage.webp',indie:'/art-33/poster-indie.webp',
    rock:'/art-33/poster-rock.webp',pop:'/art-40/poster-pop.svg',
    electro:'/art-33/poster-electro.webp',brasil:'/art-33/poster-brasil.webp'};
  const styles=[['indie','✿','Indie',art.indie],['rock','♬','Rock',art.rock],
    ['pop','✦','Pop',art.pop],['mpb','☼','MPB',art.brasil],
    ['eletronica','▥','Eletrônica',art.electro],
    ['alternativo','◇','Alternativo',art.record],['festival','♛','Festivais',art.festival],
    ['funk','♛','Funk',art.brasil],
    ['rap','🎤','Rap',art.brasil],
    ['trap','◈','Trap',art.brasil],
    ['hiphop','♫','Hip-hop',art.brasil],
    ['pagode','◉','Pagode',art.brasil],
    ['samba','☼','Samba',art.brasil],
    ['sertanejo','☆','Sertanejo',art.brasil],
    ['forro','✹','Forró',art.brasil],
    ['reggae','☀','Reggae',art.brasil],
    ['metal','⚡','Metal',art.rock],
    ['punk','✶','Punk',art.rock],
    ['jazz','♬','Jazz',art.vinyl],
    ['blues','♭','Blues',art.vinyl],
    ['kpop','✦','K-pop',art.pop],
    ['rnb','♡','R&B',art.pop],
    ['lofi','◌','Lo-fi',art.indie],
    ['house','▤','House',art.electro],
    ['techno','▥','Techno',art.electro],
    ['trance','〰','Trance',art.electro],
    ['disco','✳','Disco',art.pop],
    ['afrobeat','◈','Afrobeats',art.brasil],
    ['latina','☀','Música Latina',art.brasil],
    ['gospel','✧','Gospel',art.brasil],
    ['classica','♮','Clássica',art.vinyl],
    ['anos80','★','Anos 80',art.record]];
  const state={rooms:null,events:[],clubs:[],notices:[],pinned:[],recent:[],search:'',genre:'',
    all:false,stylesExpanded:false,styleQuery:'',sort:'popular',signature:'',lastRooms:0,lastExtras:0,
    clubState:'loading',clubError:'',clubsExpanded:false,clubGenre:'todos',clubQuery:'',clubSort:'members',lastClubs:0,clubFetching:false,clubNeedsRefresh:false};
  const allRooms=()=>Array.isArray(state.rooms)?state.rooms.filter(r=>r&&!r.isPrivate&&valid(r.slug)):[];
  const ranked=()=>allRooms().slice().sort((a,b)=>count(b.listenerCount)-count(a.listenerCount)||Number(!!b.isPlaying)-Number(!!a.isPlaying));
  const lead=()=>ranked()[0]||null;
  function imageFor(r,i=0){
    const n=norm([r.name,r.description,r.roomTheme,r.emoji].filter(Boolean).join(' '));
    if(/festival|festa|show|lolla/.test(n))return art.festival;
    if(/rock|metal|guitar/.test(n))return art.rock;
    if(/indie|alternativo/.test(n))return art.indie;
    if(/eletron|techno|house|dance/.test(n))return art.electro;
    if(/mpb|brasil|samba|pagode|funk|rap/.test(n))return art.brasil;
    if(/pop|hits|diva/.test(n))return art.pop;
    if(/vinil|classico|retro/.test(n))return art.vinyl;
    return [art.crowd,art.stage,art.vinyl,art.record][i%4];
  }
  const genreFor=r=>
    styles.find(([id])=>id===r.genre)?.[2]||'Estilo não informado';
  function renderStyles(){
    const host=$('sf107StyleList'),button=$('sf107ShowStyles'),summary=$('sf107StyleSummary');
    if(!host)return;
    const q=norm(state.styleQuery);
    const available=styles.filter(([id,,name])=>!q||norm(name+' '+id).includes(q));
    const shown=state.stylesExpanded||q?available:available.slice(0,7);
    const counts=new Map();
    for(const room of allRooms())if(room.genre)counts.set(room.genre,(counts.get(room.genre)||0)+1);
    host.innerHTML=shown.length?shown.map(([key,sym,label,img])=>
      `<button type="button" class="sf107-style sf107-style-${key}${state.genre===key?' selected':''}"
        data-sf107-genre="${key}" aria-pressed="${state.genre===key?'true':'false'}"
        style="--tile-image:url('${img}')"><b>${sym}</b><span>${esc(label)}</span>
        <small>${counts.get(key)||0} ${counts.get(key)===1?'sala':'salas'}</small></button>`).join(''):
      '<p class="sf107-empty">Nenhum estilo encontrado. Tente outro termo.</p>';
    if(summary)summary.textContent=`${styles.length} estilos disponíveis · escolha um para filtrar salas`;
    if(button){
      button.setAttribute('aria-expanded',String(state.stylesExpanded));
      button.textContent=state.stylesExpanded?'Mostrar menos estilos ↑':'Todos os estilos ('+styles.length+') ›';
    }
    const field=$('sf107StyleSearch');
    if(field){field.hidden=!state.stylesExpanded;field.value=state.styleQuery;}
  }
  function getFiltered(){
    const filtered=allRooms().filter(r=>{
      // Genre filtering relies on the actual choice saved with the room,
      // not on title, YouTube artist, description or visual theme.
      if(state.genre&&r.genre!==state.genre)return false;
      const search=norm([r.name,r.description,r.currentTrack?.artist,genreFor(r)].filter(Boolean).join(' '));
      return !state.search||search.includes(norm(state.search));
    });
    if(state.sort==='new')filtered.sort((a,b)=>{
      // New rooms receive a base36 timestamp suffix from the existing server.
      // Do not invent an age for permanent rooms without that suffix.
      const created=room=>{
        const end=String(room.slug||'').split('-').pop()||'';
        const ms=/^[0-9a-z]{7,12}$/i.test(end)?Number.parseInt(end,36):0;
        return Number.isFinite(ms)&&ms>1577836800000&&ms<Date.now()+86400000?ms:0;
      };
      return created(b)-created(a)||count(b.listenerCount)-count(a.listenerCount);
    });
    else if(state.sort==='live')filtered.sort((a,b)=>Number(!!b.isPlaying)-Number(!!a.isPlaying)||count(b.listenerCount)-count(a.listenerCount));
    else filtered.sort((a,b)=>count(b.listenerCount)-count(a.listenerCount));
    return filtered;
  }
  function remember(slug){
    if(!valid(slug))return;
    state.recent=[slug,...state.recent.filter(id=>id!==slug)].slice(0,8);
    try{localStorage.setItem('sf107Recent',JSON.stringify(state.recent));}catch(_){}
  }
  const go=slug=>{
    if(!valid(slug))return;
    remember(slug);renderRecent();
    if(typeof window.joinRoom==='function')window.joinRoom(slug);
    else window.location.assign('?sala='+encodeURIComponent(slug));
  };
  function roomCard(r,i){
    const special=r.slug===lead()?.slug&&count(r.listenerCount)>0;
    return `<button class="sf107-room-card${special?' sf107-leader':''}" type="button" data-sf107-room="${esc(r.slug)}" aria-label="Entrar na sala ${esc(r.name)}">
      <img src="${imageFor(r,i)}" alt="" loading="lazy" decoding="async">
      <span class="sf107-card-shade"></span>
      ${special?'<span class="sf107-pop-badge">♛ Mais popular</span>':''}
      ${r.isPlaying?'<span class="sf107-live-badge">● AO VIVO</span>':''}
      <span class="sf107-card-copy"><strong>${esc(r.name||'Sala musical')}</strong>
        <small>♧ ${fmt(r.listenerCount)} ${count(r.listenerCount)===1?'ouvinte':'ouvintes'} · ${esc(genreFor(r))}</small>
        ${r.currentTrack?.title?'<small class="sf150-room-nowplaying">♫ '+esc(String(r.currentTrack.title).slice(0,60))+'</small>':''}
      </span><span class="sf107-play">▶</span></button>`;
  }
  function renderRooms(){
    const host=$('sf107Rooms');if(!host)return;
    const rooms=getFiltered(),more=$('sf107More'),meta=$('sf107RoomsMeta');
    if(meta)meta.textContent=state.rooms===null?'Atualizando…':
      `${rooms.length} ${rooms.length===1?'sala encontrada':'salas encontradas'}`;
    host.innerHTML=state.rooms===null?'<p class="sf107-empty">Carregando as salas…</p>':
      rooms.length?rooms.slice(0,state.all?48:4).map(roomCard).join(''):
      `<div class="sf107-empty">Nenhuma sala encontrada. <button data-sf107="reset" type="button">Ver todas</button></div>`;
    if(more){more.hidden=rooms.length<=4;more.textContent=state.all?'Ver menos':'Ver todas ›';}
  }
  function renderFeatured(){
    const host=$('sf107Featured');if(!host)return;
    const r=lead();
    if(!r){host.innerHTML=`<section class="sf107-feature sf107-feature-empty">
      <span class="sf107-label">✦ DESTAQUE DO LOBBY</span><h2>Seu próximo som começa aqui.</h2>
      <p>Assim que houver salas públicas, a que tiver mais ouvintes aparecerá em destaque.</p>
      <button class="sf107-join" type="button" data-sf107="create">＋ Criar uma sala</button></section>`;return;}
    const top=count(r.listenerCount)>0,t=r.currentTrack||{};
    const video=yt(t.id)?'https://img.youtube.com/vi/'+encodeURIComponent(t.id)+'/mqdefault.jpg':imageFor(r);
    host.innerHTML=`<section class="sf107-feature${top?' sf107-top':''}" style="--sf107-feature-image:url('${imageFor(r)}')">
      <div class="sf107-feature-image"></div><div class="sf107-feature-content">
        <div class="sf107-feature-badges"><span class="sf107-status">${r.isPlaying?'◉ AO VIVO':'♫ SALA DISPONÍVEL'}</span>
          ${top?'<span class="sf107-top-label">♛ Maior audiência agora</span>':''}</div>
        <h2>${esc(r.name||'Sala SonoraFan')}</h2><p>Sala pública · ${esc(genreFor(r))}</p>
        <div class="sf107-audience"><span class="sf107-avatar-group" aria-hidden="true"><i>♫</i><i>✿</i><i>★</i><i>♬</i></span>
          <strong>♧ ${fmt(r.listenerCount)} ${count(r.listenerCount)===1?'ouvinte':'ouvintes'}</strong></div>
        <div class="sf107-playing">
          <img src="${video}" alt="" loading="lazy" decoding="async">
          <div><small>TOCANDO AGORA</small><strong>${esc(t.title||'Escolha a próxima música')}</strong>
            <span>${esc(t.artist||'Música colaborativa')}</span></div><b aria-hidden="true">▂▅▃▇</b></div>
        <button type="button" class="sf107-join" data-sf107-room="${esc(r.slug)}">🎧 Entrar na sala</button>
      </div></section>`;
  }
  function renderRecent(){
    const host=$('sf107Recent');if(!host)return;
    const m=new Map(allRooms().map(r=>[r.slug,r]));
    const list=[...new Set([...state.recent,...state.pinned.map(r=>r.slug)])].map(id=>m.get(id)).filter(Boolean).slice(0,3);
    host.innerHTML=list.length?list.map((r,i)=>`<button class="sf107-recent" type="button" data-sf107-room="${esc(r.slug)}">
      <img src="${imageFor(r,i)}" alt="" loading="lazy" decoding="async">
      <span><strong>${esc(r.name)}</strong><small>Sala · ${esc(genreFor(r))}</small></span>
      <i aria-hidden="true">▶</i></button>`).join(''):
      `<div class="sf107-inline-empty"><span>♫</span> As salas visitadas ou favoritas aparecerão aqui.
        <button type="button" data-sf107="scroll">Explorar salas ›</button></div>`;
  }
  function clubGenre(c){
    // Club themes are not always music genres. Do not infer genres from artwork or people's names.
    const value=norm(String(c?.genre||c?.theme||'')).replace(/[\s_/-]+/g,'');
    const aliases={
      pop:'pop',kpop:'kpop',rock:'rock',metal:'metal',punk:'punk',
      indie:'indie',alternativo:'indie',alternative:'indie',
      sertanejo:'sertanejo',funk:'funk',
      mpb:'mpb',brasil:'mpb',brasileira:'mpb',
      rap:'hiphop',hiphop:'hiphop',trap:'hiphop',
      eletrônica:'eletronica',eletronica:'eletronica',electro:'eletronica',house:'eletronica',techno:'eletronica',
      pagode:'pagode',samba:'samba',forro:'forro',gospel:'gospel',reggae:'reggae',jazz:'jazz',blues:'blues',rnb:'rnb',lofi:'lofi',latina:'latina',classica:'classica'
    };
    return aliases[value]||'outros';
  }
  function clubGenreLabel(key){
    return ({todos:'Todos os gêneros',kpop:'K-Pop',pop:'Pop',rock:'Rock',indie:'Indie',metal:'Metal',punk:'Punk',sertanejo:'Sertanejo',
      funk:'Funk',mpb:'MPB',hiphop:'Hip-Hop',eletronica:'Eletrônica',
      pagode:'Pagode',samba:'Samba',forro:'Forró',gospel:'Gospel',reggae:'Reggae',jazz:'Jazz',blues:'Blues',rnb:'R&B',lofi:'Lo-fi',latina:'Música Latina',classica:'Clássica',outros:'Outros'})[key]||'Outros';
  }
  function renderClubFilters(){
    const sidebar=$('sf191ClubFilters'),chips=$('sf191ClubChips'),search=$('sf191ClubSearch'),sort=$('sf191ClubSort');
    if(!sidebar||!chips)return;
    const counts=new Map();
    for(const club of state.clubs){
      const genre=clubGenre(club);
      counts.set(genre,(counts.get(genre)||0)+1);
    }
    const order=['kpop','pop','rock','indie','metal','punk','sertanejo','funk','mpb','hiphop','eletronica','pagode','samba','forro','gospel','reggae','jazz','blues','rnb','lofi','latina','classica','outros'];
    const categories=['todos',...order.filter(key=>counts.has(key))];
    if(state.clubGenre!=='todos'&&!counts.has(state.clubGenre))state.clubGenre='todos';
    const choice=(key,withCount=false)=>{
      const selected=state.clubGenre===key;
      const countValue=key==='todos'?state.clubs.length:counts.get(key)||0;
      return `<button type="button" class="sf191-genre${selected?' selected':''}"
        data-sf191-genre="${key}" aria-pressed="${selected?'true':'false'}">
        <span>${key==='todos'?'▦':'♫'} ${esc(clubGenreLabel(key))}</span>${withCount?`<small>${countValue}</small>`:''}
      </button>`;
    };
    sidebar.innerHTML=categories.map(key=>choice(key,true)).join('');
    chips.innerHTML=categories.map(key=>choice(key,false)).join('');
    if(search&&search.value!==state.clubQuery)search.value=state.clubQuery;
    if(sort&&sort.value!==state.clubSort)sort.value=state.clubSort;
  }
  function renderClubs(){
    const host=$('sf107Clubs'),caption=$('sf107ClubsCaption'),all=$('sf107ShowAllClubs');
    if(!host)return;
    renderClubFilters();
    const total=state.clubs.length;
    if(caption)caption.textContent=state.clubState==='ready'
      ? `${total} ${total===1?'comunidade disponível':'comunidades disponíveis'} · Conheça fãs que compartilham sua música.`:'';
    if(state.clubState==='loading'){
      host.innerHTML='<div class="sf107-club-state" role="status">Buscando Fan Clubs disponíveis…</div>';
      if(all)all.hidden=true;
      return;
    }
    if(state.clubState==='error'){
      host.innerHTML=`<div class="sf107-club-state" role="alert"><strong>Não foi possível carregar os Fan Clubs.</strong>
        <span>${esc(state.clubError||'Verifique sua conexão e tente novamente.')}</span>
        <button type="button" data-sf107="clubs-retry">↻ Tentar novamente</button></div>`;
      if(all)all.hidden=true;
      return;
    }
    if(!total){
      host.innerHTML=`<div class="sf107-club-state sf107-club-empty">
        <span class="sf107-club-empty-icon" aria-hidden="true">♫</span><div>
          <strong>Seu próximo Fan Club começa aqui</strong>
          <small>Ainda não há comunidades disponíveis. Crie uma para reunir outros fãs.</small>
        </div><button type="button" data-sf107="club-create">＋ Criar Fan Club</button></div>`;
      if(all)all.hidden=true;
      return;
    }
    const query=norm(state.clubQuery);
    const items=state.clubs.filter(c=>
      (state.clubGenre==='todos'||clubGenre(c)===state.clubGenre)&&
      (!query||norm([c.title,c.artist,c.description,c.ownerName,clubGenreLabel(clubGenre(c))].filter(Boolean).join(' ')).includes(query))
    ).sort((a,b)=>{
      if(state.clubSort==='new')return (Number(b.createdAt)||0)-(Number(a.createdAt)||0)||count(b.memberCount)-count(a.memberCount);
      if(state.clubSort==='az')return String(a.title||a.artist||'').localeCompare(String(b.title||b.artist||''),'pt-BR');
      return count(b.memberCount)-count(a.memberCount)||(Number(b.createdAt)||0)-(Number(a.createdAt)||0);
    });
    const limit=state.clubsExpanded?48:6;
    if(all){
      all.hidden=items.length<=6;
      all.textContent=state.clubsExpanded?'Ver menos ↑':`Ver todos (${items.length}) ›`;
      all.setAttribute('aria-expanded',String(state.clubsExpanded));
    }
    const status=$('sf191ClubResults');
    if(status)status.textContent=`${items.length} ${items.length===1?'Fan Club encontrado':'Fan Clubs encontrados'}`;
    if(!items.length){
      host.innerHTML=`<div class="sf107-club-state sf107-club-empty">
        <strong>Nenhum Fan Club encontrado</strong>
        <span>Experimente outro gênero ou termo de busca.</span>
        <button type="button" data-sf191-reset>Limpar filtros</button></div>`;
      return;
    }
    host.innerHTML=items.slice(0,limit).map((c,i)=>{
      const id=/^[a-f0-9-]{36}$/i.test(String(c.id||''))?c.id:'';
      const genre=clubGenre(c);
      const fallback=({kpop:'/art-132/sonorafan-room-kpop.avif',pop:art.pop,rock:art.rock,indie:art.indie,mpb:art.brasil,
        hiphop:art.brasil,funk:art.brasil,sertanejo:art.brasil,pagode:art.brasil,
        eletronica:art.electro,forro:art.brasil,gospel:art.crowd,reggae:art.festival})[genre]||[art.indie,art.rock,art.crowd,art.record][i%4];
      const gallery={stage:'/art-129/sonorafan-stage.svg',kpop:'/art-132/sonorafan-room-kpop.avif',pop:'/art-33/poster-electro.webp',rock:'/art-33/poster-rock.webp',indie:'/art-33/poster-indie.webp',brasil:'/art-33/poster-brasil.webp',electronic:'/art-33/poster-electro.webp',festival:'/art-40/poster-festival.svg'};
       let external='';try{const u=new URL(String(c.coverImageUrl||''));if(u.protocol==='https:'&&!u.username&&!u.password&&u.hostname.includes('.'))external=u.href;}catch(_){}
       const cover=c.coverType==='gallery'?(gallery[c.coverGalleryId]||fallback):c.coverType==='external'?(external||fallback):c.coverVersion&&id?`/api/fan-clubs/${id}/cover?v=${encodeURIComponent(c.coverVersion)}`:fallback;
      const name=esc(c.title||c.artist||'Fan Club');
      const description=esc(c.description||`Comunidade de fãs de ${c.artist||'música'}. Compartilhe descobertas e participe.`);
      return `<article class="sf191-club-card">
        <div class="sf191-club-visual">
          <img src="${esc(cover)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-sf107-fallback="${fallback}">
          <span class="sf191-club-tag">♫ ${esc(clubGenreLabel(genre))}</span>
        </div>
        <div class="sf191-club-copy">
          <h3>${name}</h3>
          <p>${description}</p>
          <div class="sf191-club-bottom">
            <span class="sf191-club-members">♧ ${fmt(c.memberCount)} ${count(c.memberCount)===1?'membro':'membros'}</span>
            <button type="button" class="sf191-club-join" data-sf107-club="${id}"
              aria-label="Abrir Fan Club ${name}">Entrar no clube ›</button>
          </div>
        </div>
      </article>`;
    }).join('');
  }
  async function pullClubs(force=false){
    if(!active())return;
    if(state.clubFetching){if(force)state.clubNeedsRefresh=true;return;}
    if(!force&&Date.now()-state.lastClubs<15000)return;
    state.clubFetching=true;
    if(state.clubState!=='ready')state.clubState='loading';
    renderClubs();
    const load=async(url)=>{
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),8500);
      try{
        const response=await fetch(url,{credentials:'include',cache:'no-store',signal:controller.signal});
        const body=await response.json().catch(()=>null);
        if(!response.ok)throw Error(body?.error||(
          response.status===401?'Faça login para visualizar seus Fan Clubs.':
          response.status===429?'Muitas consultas. Tente novamente em instantes.':
          'Não foi possível consultar os Fan Clubs.'));
        if(!body||!Array.isArray(body.clubs))throw Error('Formato inválido na listagem de Fan Clubs.');
        return body.clubs;
      }finally{clearTimeout(timer);}
    };
    // Display results as soon as either request succeeds. Fetching "mine"
    // separately recovers the owner's clubs if the global listing is stale.
    const successes=[];
    const fresh=new Map();
    const apply=list=>{
      successes.push(true);
      for(const c of list)if(c&&typeof c.id==='string')fresh.set(c.id,c);
      if(fresh.size){
        state.clubs=[...fresh.values()].sort((a,b)=>count(b.memberCount)-count(a.memberCount)||
          (Number(b.createdAt)||0)-(Number(a.createdAt)||0));
        state.clubState='ready';state.clubError='';renderClubs();
      }
    };
    try{
      const results=await Promise.allSettled([
        load('/api/fan-clubs').then(apply),
        load('/api/fan-clubs?mine=true').then(apply)
      ]);
      if(!successes.length){
        const failed=results.find(r=>r.status==='rejected');
        state.clubState='error';
        state.clubError=String(failed?.reason?.message||'Verifique sua conexão.').slice(0,160);
      }else{
        state.clubs=[...fresh.values()].sort((a,b)=>count(b.memberCount)-count(a.memberCount));
        state.clubState='ready';state.clubError='';
      }
      state.lastClubs=state.clubState==='error'?0:Date.now();
    }finally{
      state.clubFetching=false;renderClubs();
      if(state.clubNeedsRefresh){state.clubNeedsRefresh=false;state.lastClubs=0;pullClubs(true);}
    }
  }
  function renderEvents(){
    const host=$('sf107Events');if(!host)return;
    const e=state.events.find(x=>Number(x.startAt)>Date.now()-3600000);
    if(!e){host.innerHTML=`<div class="sf107-side-empty">Nenhum evento agendado.
      <button type="button" data-sf107="events">Ver agenda ›</button></div>`;return;}
    const d=new Date(e.startAt);
    host.innerHTML=`<button type="button" class="sf107-event" data-sf107="events">
      <span class="sf107-event-day"><small>${esc(d.toLocaleDateString('pt-BR',{weekday:'short'}).replace('.','').toUpperCase())}</small>
      <strong>${d.getDate()}</strong></span><span><strong>${esc(e.title)}</strong>
      <small>${esc(e.roomName||'Sala')} · ${esc(d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}))}</small>
      </span><b aria-hidden="true">›</b></button>`;
  }
  function renderNotices(){
    const host=$('sf107Notices');if(!host)return;
    const notices=(state.notices||[]).slice().sort((a,b)=>
      Number(!b.read)-Number(!a.read)||
      Number(b.type==='message'||b.type==='mention')-Number(a.type==='message'||a.type==='mention')||
      Number(b.createdAt||0)-Number(a.createdAt||0)
    );
    const unread=notices.filter(n=>!n.read).length;
    const countEl=$('sf107NoticesTitleCount');
    if(countEl){countEl.textContent=unread?unread+' nova'+(unread===1?'':'s'):'';countEl.hidden=!unread;}
    host.innerHTML=notices.length?notices.slice(0,4).map(n=>{
      const icon=n.type==='message'?'✉':n.type==='mention'?'@':
        n.type==='event'?'▦':n.type==='follow'?'♧':'✦';
      const label=n.type==='message'?'Mensagem privada':
        n.type==='mention'?'Menção ou resposta':'Comunidade';
      return `<div class="sf111-lobby-notice-wrap">
        <button type="button" class="sf107-notice sf111-lobby-notice" data-sf111-notice="${esc(n.id)}"
          aria-label="${esc(n.title||label)}. ${n.read?'Lida':'Não lida'}. Abrir">
          <span aria-hidden="true">${icon}</span>
          <span><small class="sf111-lobby-kind">${label}</small>
            <strong>${esc(n.title||label)}</strong>
            <small>${esc(n.message||'')}</small></span>
          ${n.read?'':'<i class="sf107-dot" aria-label="Não lida"></i>'}
        </button>
        <button type="button" class="sf111-lobby-dismiss" data-sf111-dismiss="${esc(n.id)}"
          aria-label="Remover notificação: ${esc(n.title||label)}" title="Remover notificação">×</button>
      </div>`;
    }).join(''):'<p class="sf107-muted">Nenhuma novidade no momento. Mensagens privadas e menções aparecerão aqui.</p>';
  }
  function renderAll(){renderFeatured();renderRecent();renderRooms();}
  function updateRooms(list){
    if(!Array.isArray(list))return;
    const signature=list.map(r=>[r.slug,r.listenerCount,r.isPlaying,r.currentTrack?.id,
      r.currentTrack?.title,r.roomTheme,r.genre,r.description,r.name].join(':')).join('|');
    if(signature===state.signature)return;
    state.signature=signature;state.rooms=list.filter(r=>r&&valid(r.slug));renderAll();renderStyles();
  }
  let sf150RoomFetch=null;
  async function pullRooms(force=false){
    if(!active()||document.hidden||sf150RoomFetch||!force&&Date.now()-state.lastRooms<13000)return;
    state.lastRooms=Date.now();
    const controller=new AbortController();
    sf150RoomFetch=controller;
    const timer=setTimeout(()=>controller.abort(),9500);
    try{
      const r=await fetch('/api/rooms',{credentials:'include',cache:'no-store',signal:controller.signal});
      if(!r.ok)throw Error('Falha na consulta');
      updateRooms(await r.json());
    }catch(_){
      if(state.rooms===null){state.rooms=[];renderAll();$('sf107Rooms').innerHTML=
        `<div class="sf107-empty">Salas indisponíveis. <button type="button" data-sf107="retry">Tentar novamente</button></div>`;}
      state.lastRooms=0;
    }finally{clearTimeout(timer);sf150RoomFetch=null;}
  }
  async function pullExtras(force=false){
    if(!active()||!force&&Date.now()-state.lastExtras<75000)return;
    state.lastExtras=Date.now();
    const jobs=[
      ['/api/social/events',data=>state.events=Array.isArray(data)?data:[]],
      ['/api/social/notifications',data=>state.notices=Array.isArray(data)?data:[]],
      ['/api/experience95/profile',data=>state.pinned=Array.isArray(data.pinnedRooms)?data.pinnedRooms:[]]
    ];
    await Promise.all(jobs.map(async([url,fn])=>{try{
      const r=await fetch(url,{credentials:'include',cache:'no-store'});if(r.ok)fn(await r.json());
    }catch(_){}}));
    renderRecent();renderEvents();renderNotices();
  }
  function scrollTo(id){
    const box=document.querySelector('#screen-lobby .sf28-lobby-content'),target=$(id);
    if(!box||!target)return;
    box.scrollTo({top:Math.max(0,box.scrollTop+target.getBoundingClientRect().top-box.getBoundingClientRect().top-15),behavior:'smooth'});
  }
  function community(tab){
    // Version 110 owns the visible community experience. Keep the old hub
    // only as a fully functional detail surface, never as a duplicate drawer.
    if(typeof window.sf110OpenCommunity==='function'){
      window.sf110OpenCommunity(tab==='friends'?'overview':tab);
      return;
    }
    const drawer=document.querySelector('#screen-lobby .sf32-community-drawer');
    if(drawer){
      drawer.classList.add('sf107-expose');
      drawer.open=true;
      const select=()=>drawer.querySelector('[data-sf-tab="'+tab+'"]')?.click();
      if(tab){select();window.sfSocialSwitchTab?.(tab);}
      drawer.scrollIntoView({behavior:'smooth',block:'start'});
    }
    // Open associated community surface when the legacy helper exists.
    if(typeof window.sf5OpenCommunity==='function')window.sf5OpenCommunity();
  }
  function openClubs(id=''){
    community('fanclubs');
    if(typeof window.sf110OpenCommunity==='function'){
      if(id&&/^[a-f0-9-]{36}$/i.test(id))window.sf71OpenFanClub?.(id);
      else window.sf71LoadFanClubs?.();
      return;
    }
    const tab=document.querySelector('#sfSocialHub [data-sf-tab="fanclubs"]');
    tab?.click();
    if(id&&/^[a-f0-9-]{36}$/i.test(id)){
      window.sf71OpenFanClub?.(id);
    }else{
      window.sf71LoadFanClubs?.();
    }
    const details=document.querySelector('#screen-lobby .sf32-community-drawer');
    if(details){
      details.classList.add('sf107-expose');details.open=true;
      requestAnimationFrame(()=>details.scrollIntoView({behavior:'smooth',block:'start'}));
    }
  }
  function action(name){
    switch(name){
      case 'create':return window.showCreateRoom?.();
      case 'random':return window.joinRandomRoom?.();
      case 'favorites':return typeof window.sf112OpenProfile==='function'?window.sf112OpenProfile('library'):window.sf95OpenHub?.('rooms');
      case 'library':return typeof window.sf112OpenProfile==='function'?window.sf112OpenProfile('library'):window.sf95OpenHub?.('dna');
      case 'clubs':return openClubs();
      case 'clubs-toggle':state.clubsExpanded=!state.clubsExpanded;renderClubs();return;
      case 'clubs-retry':state.lastClubs=0;return pullClubs(true);
      case 'club-create':{
        const create=$('sf71CreateClub');
        if(create){create.click();return;}
        openClubs();
        return;
      }
      case 'community':return community('friends');
      case 'events':return community('events');
      case 'notices':return window.sf15OpenNotifications?.();
      case 'profile':return typeof window.sf112OpenProfile==='function'?window.sf112OpenProfile('profile'):window.sf5OpenProfile?.();
      case 'account':return window.sf92OpenAccount?.();
      case 'ranking':return window.openLeaderboard?.();
      case 'journey':return document.querySelector('[data-sf63-open="passport"]')?.click();
      case 'help':return window.openTutorial?.(0);
      case 'admin':return $('adminBtn')?.click();
      case 'logout':return window.doLogout?.();
      case 'scroll':return scrollTo('sf107Popular');
      case 'top':return scrollTo('sf107Dashboard');
      case 'invite':$('sf107Invite').hidden=false;$('sf107InviteCode').focus();return;
      case 'close':$('sf107Invite').hidden=true;return;
      case 'reset':state.genre='';state.search='';state.all=false;state.styleQuery='';$('sf107Search').value='';sync();return;
      case 'styles-toggle':
        state.stylesExpanded=!state.stylesExpanded;
        if(!state.stylesExpanded)state.styleQuery='';
        state.genre='';state.all=false;sync();
        if(state.stylesExpanded)$('sf107StyleSearch')?.focus({preventScroll:true});
        return;
      case 'more':state.all=!state.all;renderRooms();return;
      case 'retry':return pullRooms(true);
    }
  }
  function sync(){renderStyles();renderRooms();}
  function handleClick(e){
    const removeNotice=e.target.closest('[data-sf111-dismiss]');
    if(removeNotice){e.preventDefault();e.stopPropagation();window.sf15DismissNotification?.(removeNotice.dataset.sf111Dismiss);return;}
    const targetNotice=e.target.closest('[data-sf111-notice]');
    if(targetNotice){window.sf15OpenNotification?.(targetNotice.dataset.sf111Notice);return;}
    const clubChoice=e.target.closest('[data-sf191-genre]');
    if(clubChoice){
      state.clubGenre=clubChoice.dataset.sf191Genre||'todos';
      state.clubsExpanded=false;renderClubs();return;
    }
    if(e.target.closest('[data-sf191-reset]')){
      state.clubGenre='todos';state.clubQuery='';state.clubsExpanded=false;
      $('sf191ClubSearch').value='';renderClubs();return;
    }
    const room=e.target.closest('[data-sf107-room]');
    if(room)return go(room.dataset.sf107Room);
    const club=e.target.closest('[data-sf107-club]');
    if(club){openClubs(club.dataset.sf107Club);return;}
    const genre=e.target.closest('[data-sf107-genre]');
    if(genre){state.genre=state.genre===genre.dataset.sf107Genre?'':genre.dataset.sf107Genre;state.all=false;sync();scrollTo('sf107Popular');return;}
    const filter=e.target.closest('[data-sf107-filter]');
    if(filter){
      state.sort=filter.dataset.sf107Filter==='new'?'new':filter.dataset.sf107Filter==='live'?'live':'popular';
      state.genre='';state.all=state.sort!=='popular';
      document.querySelectorAll('#sf107Dashboard [data-sf107-filter]').forEach(b=>b.classList.toggle('active',b===filter));
      sync();scrollTo('sf107Popular');return;
    }
    const btn=e.target.closest('[data-sf107]');if(!btn)return;
    action(btn.dataset.sf107);
    if(btn.closest('details'))btn.closest('details').open=false;
  }
  function build(){
    const host=document.querySelector('#screen-lobby .sf28-lobby-content');
    const old=document.querySelector('#screen-lobby .sf28-lobby-header');
    if(!host||!old||$('sf107Dashboard'))return;
    for(const child of [...host.children])child.classList.add('sf107-legacy');
    const main=document.createElement('div');main.id='sf107Dashboard';main.className='sf107-dashboard';
    main.innerHTML=`
      <div class="sf107-quick sf109-quick-clean">
        <strong>ϟ Acesso rápido</strong>
        <button type="button" class="sf107-quick-primary" data-sf107="create">＋ Criar sala</button>
        <button type="button" data-sf107="invite">⌗ Entrar com código</button>
        <span class="sf109-quick-message">Encontre sua próxima vibe nas categorias abaixo.</span>
      </div>
      <div class="sf107-content">
        <div class="sf107-main-col">
          <section class="sf107-module">
            <header class="sf107-module-head"><h2>▷ Continuar ouvindo</h2><button type="button" data-sf107="scroll">Ver salas ›</button></header>
            <div class="sf107-recent-list" id="sf107Recent"></div>
          </section>
          <section class="sf107-module" id="sf107Popular">
            <header class="sf107-module-head"><div><h2>♨ Salas populares</h2><small id="sf107RoomsMeta">Atualizando…</small></div>
              <button type="button" id="sf107More" data-sf107="more">Ver todas ›</button></header>
            <div class="sf107-room-grid" id="sf107Rooms"></div>
          </section>
          <section class="sf107-module">
            <header class="sf107-module-head sf107-styles-head"><div><h2>♫ Explorar por estilo</h2>
              <small id="sf107StyleSummary" role="status" aria-live="polite">Encontre sua próxima vibe</small></div>
              <button type="button" id="sf107ShowStyles" data-sf107="styles-toggle" aria-expanded="false" aria-controls="sf107StyleList">Todos os estilos ›</button></header>
            <label class="sf107-style-search">⌕ <input type="search" id="sf107StyleSearch"
              placeholder="Buscar entre todos os estilos…" aria-label="Buscar estilo musical" maxlength="50" hidden autocomplete="off"></label>
            <div class="sf107-style-list" id="sf107StyleList" aria-label="Estilos disponíveis"></div>
          </section>
          <section class="sf107-module">
            <header class="sf107-module-head sf107-clubs-header">
              <div><h2>♧ Fan Clubs disponíveis</h2><small id="sf107ClubsCaption" aria-live="polite"></small></div>
              <div class="sf107-clubs-actions">
                <button type="button" class="sf107-club-create" data-sf107="club-create">＋ Criar Fan Club</button>
                <button type="button" id="sf107ShowAllClubs" data-sf107="clubs-toggle" aria-expanded="false" hidden>Ver todos ›</button>
                <button type="button" data-sf107="clubs">Explorar ›</button>
              </div>
            </header>
            <div class="sf191-club-toolbar">
              <label class="sf191-club-search">⌕ <input id="sf191ClubSearch" type="search"
                placeholder="Buscar Fan Clubs, artistas ou comunidades..." aria-label="Buscar Fan Clubs"
                autocomplete="off" maxlength="80"></label>
              <label class="sf191-sort-label">Ordenar por
                <select id="sf191ClubSort" aria-label="Ordenar Fan Clubs">
                  <option value="members">Mais membros</option>
                  <option value="new">Mais recentes</option>
                  <option value="az">Nome (A–Z)</option>
                </select>
              </label>
            </div>
            <div class="sf191-club-discovery">
              <aside class="sf191-club-filters" aria-label="Filtrar Fan Clubs por gênero">
                <h3>Filtrar por gênero</h3>
                <div id="sf191ClubFilters" class="sf191-filter-list"></div>
              </aside>
              <div class="sf191-club-main">
                <div id="sf191ClubChips" class="sf191-filter-chips" aria-label="Gêneros dos Fan Clubs"></div>
                <p id="sf191ClubResults" class="sf191-results" role="status" aria-live="polite"></p>
                <div class="sf107-club-grid" id="sf107Clubs" aria-live="polite"></div>
              </div>
            </div>
          </section>
        </div>
        <aside class="sf107-side-col">
          <div id="sf107Featured"></div>
          <section class="sf107-module sf107-aside-module"><header class="sf107-module-head"><h2>▦ Agenda musical</h2><button type="button" data-sf107="events">Ver agenda ›</button></header>
            <div id="sf107Events"></div></section>
          <section class="sf107-module sf107-aside-module"><header class="sf107-module-head"><div><h2>♢ Notificações</h2><small id="sf107NoticesTitleCount" hidden></small></div><button type="button" data-sf107="notices">Ver todas ›</button></header>
            <div id="sf107Notices"></div></section>
        </aside>
      </div>
      <nav class="sf107-mobile-nav" aria-label="Navegação rápida do Lobby no celular">
        <button type="button" data-sf107="top">⌂ <span>Início</span></button>
        <button type="button" data-sf107="scroll">♫ <span>Salas</span></button>
        <button type="button" data-sf107="create" class="sf107-mobile-create">＋ <span>Criar</span></button>
        <button type="button" data-sf107="community">♧ <span>Comunidade</span></button>
        <button type="button" data-sf107="profile">◉ <span>Perfil</span></button>
      </nav>
      <div class="sf107-invite" id="sf107Invite" hidden>
        <form id="sf107InviteForm"><label for="sf107InviteCode">Código ou link de convite</label>
          <input type="text" id="sf107InviteCode" placeholder="Cole o código da sala" required autocomplete="off">
          <div><button type="submit">Entrar na sala</button><button type="button" data-sf107="close">Cancelar</button></div>
        </form>
      </div>`;
    host.prepend(main);
    const top=document.createElement('header');top.className='sf107-top';
    top.innerHTML=`
      <img src="/brand-144/sonorafan-logo.svg" alt="SonoraFan" width="1260" height="426" class="sf107-logo">
      <nav aria-label="Navegação do lobby">
        <button type="button" class="active" data-sf107="top">⌂ Lobby</button>
        <button type="button" data-sf107="scroll">♫ Salas</button>
        <button type="button" data-sf107="community">♧ Comunidades</button>
        
      </nav>
      <div class="sf107-top-actions">
        <label class="sf107-search">⌕ <input type="search" id="sf107Search" placeholder="Buscar salas, estilos ou artistas" aria-label="Buscar salas" autocomplete="off"></label>
        <button type="button" id="sf107NoticeButton" class="sf111-lobby-bell" aria-label="Notificações" title="Notificações" data-sf107="notices">🔔 <span class="sf111-count" aria-hidden="true" hidden>0</span></button>
        <button type="button" class="sf107-profile" data-sf107="profile"><span class="sf107-profile-avatar" id="sf107ProfileAvatar">◉</span><span id="sf107ProfileLabel">Perfil</span></button>
        <details class="sf107-more"><summary>☰ <span>Mais</span></summary>
          <div class="sf107-more-list">
            <button type="button" data-sf107="ranking">♛ Ranking</button>
            <button type="button" data-sf107="journey">✦ Minha Jornada</button>
            <button type="button" data-sf107="account">⚙ Conta e segurança</button>
            <button type="button" data-sf107="help">? Ajuda / Tour</button>
            <button type="button" data-sf107="admin" id="sf107Admin" hidden>⚙ Administração</button>
            <button type="button" data-sf107="logout">⇥ Sair</button>
          </div>
        </details>
      </div>`;
    old.after(top);
    main.addEventListener('input',event=>{
      if(event.target.id==='sf191ClubSearch'){
        state.clubQuery=String(event.target.value||'').slice(0,80);
        state.clubsExpanded=false;renderClubs();
      }
    });
    main.addEventListener('change',event=>{
      if(event.target.id==='sf191ClubSort'){
        state.clubSort=['members','new','az'].includes(event.target.value)?event.target.value:'members';
        state.clubsExpanded=false;renderClubs();
      }
    });
    main.addEventListener('click',handleClick);
    top.addEventListener('click',handleClick);
    $('sf107Search').addEventListener('input',e=>{
      state.search=e.target.value.trim().slice(0,80);state.all=false;sync();
    });
    $('sf107StyleSearch').addEventListener('input',e=>{
      state.styleQuery=String(e.target.value||'').trim().slice(0,50);renderStyles();
    });
    main.addEventListener('submit',e=>{
      if(e.target.id!=='sf107InviteForm')return;
      e.preventDefault();
      let raw=$('sf107InviteCode').value.trim().slice(0,400),slug=raw;
      try{if(/^https?:\/\//i.test(raw)){const url=new URL(raw);slug=url.pathname.match(/^\/invite\/([^/]+)/)?.[1]||url.searchParams.get('sala')||'';}}catch(_){}
      try{slug=decodeURIComponent(slug.replace(/^sala=/,''));}catch(_){}
      if(!valid(slug)){
        const field=$('sf107InviteCode');field.setCustomValidity('Código de sala inválido.');field.reportValidity();field.setCustomValidity('');return;
      }
      $('sf107Invite').hidden=true;go(slug);
    });
    main.addEventListener('keydown',e=>{
      if(e.key==='Escape'&&!$('sf107Invite').hidden){$('sf107Invite').hidden=true;e.preventDefault();}
    });
    main.addEventListener('error',e=>{
      if(e.target instanceof HTMLImageElement&&e.target.dataset.sf107Fallback){
        e.target.src=e.target.dataset.sf107Fallback;delete e.target.dataset.sf107Fallback;
      }
    },true);
    try{state.recent=JSON.parse(localStorage.getItem('sf107Recent')||'[]').filter(valid).slice(0,8);}catch(_){}
    renderAll();renderStyles();renderClubs();renderEvents();renderNotices();
    app().classList.add('sf107-ready');
    const skip=app().querySelector('.sf52-skip-link');
    if(skip){skip.href='#sf107Popular';skip.textContent='Ir para salas populares';}
  }
  function syncProfile(){
    const label=$('sf107ProfileLabel'),avatar=$('sf107ProfileAvatar');
    const originalName=$('userDisplayName'),originalAvatar=$('userAvatar');
    if(label && originalName){
      const name=String(originalName.textContent||'').trim();
      label.textContent=name && name!=='Usuário'?name.slice(0,22):'Perfil';
    }
    if(avatar && originalAvatar){
      const image=originalAvatar.querySelector('img');
      if(image?.src){
        let current=avatar.querySelector('img');
        if(!current){avatar.replaceChildren();current=document.createElement('img');current.alt='';avatar.append(current);}
        if(current.src!==image.src)current.src=image.src;
      }else if(!avatar.querySelector('img')){
        avatar.textContent=String(originalAvatar.textContent||'◉').trim().slice(0,3)||'◉';
      }
    }
  }
  function init(){
    build();if(!$('sf107Dashboard'))return;
    // Keep the legacy community panel only while the user is actively using it.
    // Closing it must not leave another obsolete section below the new lobby.
    const legacyCommunity=document.querySelector('#screen-lobby .sf32-community-drawer');
    legacyCommunity?.addEventListener('toggle',()=>{
      if(!legacyCommunity.open)legacyCommunity.classList.remove('sf107-expose');
    });
    const orig=window.sf41UpdateRooms;
    if(typeof orig==='function'&&!orig.sf107){
      const wrapper=function(rooms){const result=orig.apply(this,arguments);updateRooms(rooms);return result;};
      wrapper.sf107=true;window.sf41UpdateRooms=wrapper;
    }
    syncProfile();
    for(const el of [$('userDisplayName'),$('userAvatar')]){
      if(el)new MutationObserver(syncProfile).observe(el,{childList:true,subtree:true,characterData:true});
    }
    document.addEventListener('sf111:updated',e=>{
      if(!Array.isArray(e.detail?.alerts))return;
      state.notices=e.detail.alerts;renderNotices();
    });
    const socketClient=typeof socket!=='undefined'?socket:null;
    socketClient?.on('roomState',r=>{if(r?.slug)remember(r.slug);});
    const poll=()=>{
      if(active()&&!document.hidden){pullRooms();pullExtras();pullClubs();
        const nav=$('adminBtn'),admin=$('sf107Admin');
        if(admin&&nav)admin.hidden=getComputedStyle(nav).display==='none';
      }
    };
    window.sf107RefreshFanClubs=()=>{
      state.lastClubs=0;return pullClubs(true);
    };
    // Do not wait for the 22-second polling interval after signing in.
    let previous=active();
    const lobbyRoot=app();
    if(lobbyRoot&&typeof MutationObserver!=='undefined'){
      new MutationObserver(()=>{
        const visible=active();
        if(visible&&!previous){
          state.lastRooms=0;state.lastExtras=0;state.lastClubs=0;
          pullRooms(true);pullExtras(true);pullClubs(true);
        }
        previous=visible;
      }).observe(lobbyRoot,{attributes:true,attributeFilter:['class']});
    }
    document.addEventListener('sf71:created',()=>{
      state.lastClubs=0;pullClubs(true);
    });
    window.sf107OpenFanClub=openClubs;
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll();});
    setInterval(poll,22000);poll();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();