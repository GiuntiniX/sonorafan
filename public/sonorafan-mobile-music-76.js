/* SonoraFan 76 · Acesso mobile a músicas e favoritas sem alterar o player/servidor. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const validId = id => /^[A-Za-z0-9_-]{11}$/.test(String(id || ''));
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  const smallScreen = () => window.matchMedia('(max-width: 768px)').matches;
  const status = (message, isError=false) => {
    const node=$('sf76MusicStatus');
    if(!node) return;
    node.textContent=message;
    node.classList.toggle('is-error',Boolean(isError));
  };
  const state={tab:'search',genres:[],favorites:[],filter:'all',search:'',busy:false,lastFocus:null,originalHolder:null,pending:null,searchRequest:0};
  const originalFindSong=window.sf34FindSong;
  const roomName=()=>typeof currentRoom!=='undefined'&&currentRoom ? currentRoom : '';
  const socketClient=()=>typeof socket!=='undefined' ? socket : null;
  const currentRoomState=()=>typeof currentRoomData!=='undefined' ? currentRoomData : null;
  const cachedFavorites=()=>typeof myFavorites!=='undefined' ? myFavorites : null;

  function buildSheet(){
    if($('sf76MusicSheet'))return;
    const layer=document.createElement('div');
    layer.id='sf76MusicSheet';layer.className='sf76-sheet';layer.hidden=true;
    layer.innerHTML=`
      <div class="sf76-backdrop" data-sf76-close="1"></div>
      <section class="sf76-panel" role="dialog" aria-modal="true" aria-labelledby="sf76MusicTitle">
        <header class="sf76-head">
          <div><small>TODO MUNDO É DJ</small><h2 id="sf76MusicTitle">Escolha a próxima música</h2></div>
          <button class="sf76-close" type="button" data-sf76-close="1" aria-label="Fechar músicas">✕</button>
        </header>
        <div class="sf76-switch" role="tablist" aria-label="Escolher origem da música">
          <button type="button" data-sf76-tab="search" role="tab" aria-selected="true" aria-controls="sf76SearchPane">⌕ Buscar música</button>
          <button type="button" data-sf76-tab="favorites" role="tab" aria-selected="false" aria-controls="sf76FavoritesPane">♡ Minhas favoritas</button>
        </div>
        <div class="sf76-content" id="sf76MusicContent">
          <section id="sf76SearchPane" role="tabpanel" aria-label="Buscar música">
            <div class="sf138-mobile-search" id="sf138MobileSearch" role="search">
              <label for="sf138SearchQuery">Busque pelo nome da música ou artista</label>
              <div class="sf138-search-row">
                <input type="search" id="sf138SearchQuery" placeholder="Ex.: Metallica, K-pop, sua música..." autocomplete="off" enterkeyhint="search" spellcheck="false" aria-controls="sf78InlineResults">
                <button type="button" id="sf138SearchSubmit">Buscar</button>
              </div>
            </div>
            <div id="sf76RequestHost"></div>
            <p class="sf76-tip">Encontre sua música e escolha um resultado para adicionar à fila colaborativa.</p>
            <div id="sf76InlineResultsHost" class="sf134-inline-results" aria-label="Músicas encontradas na busca"></div>
          </section>
          <section id="sf76FavoritesPane" role="tabpanel" aria-label="Músicas favoritas" hidden>
            <label class="sf76-search-label" for="sf76FavoriteSearch">Encontre uma favorita</label>
            <input type="search" id="sf76FavoriteSearch" placeholder="Música ou artista..." autocomplete="off">
            <div class="sf76-genres" id="sf76FavoriteGenres" role="group" aria-label="Filtrar favoritas por gênero"></div>
            <div class="sf76-list" id="sf76FavoritesList" aria-live="polite"></div>
          </section>
        </div>
        <footer class="sf76-foot">
          <span id="sf76MusicStatus" role="status" aria-live="polite">Pronto para colaborar com a sala.</span>
          <button type="button" id="sf76ViewQueue">Ver fila ↗</button>
        </footer>
      </section>`;
    document.body.appendChild(layer);
    layer.addEventListener('click',e=>{if(e.target.closest('[data-sf76-close]'))close();});
    layer.querySelectorAll('[data-sf76-tab]').forEach(button=>button.addEventListener('click',()=>switchTab(button.dataset.sf76Tab)));
    $('sf76ViewQueue').addEventListener('click',()=>{close();if(typeof setTab==='function')setTab('queue');document.querySelector('#screen-room .room-layout')?.scrollTo({top:0,behavior:'instant'});});
    $('sf76FavoriteSearch').addEventListener('input',e=>{state.search=e.target.value;drawFavorites();});
    $('sf76FavoriteGenres').addEventListener('click',e=>{const btn=e.target.closest('[data-sf76-genre]');if(!btn)return;state.filter=btn.dataset.sf76Genre;drawFavorites();});
    $('sf76FavoritesList').addEventListener('click',e=>{const button=e.target.closest('[data-sf76-add]');if(!button)return;const entry=state.favorites.find(x=>x.id===button.dataset.sf76Add);if(entry)submitFavorite(entry);});
    const runMobileSearch=(immediate=false)=>{
      const query=String($('sf138SearchQuery')?.value||'').trim();
      if(query.length<2){status('Digite pelo menos duas letras para buscar.',true);return;}
      // A busca rápida oficial já exibe os resultados no sf76InlineResultsHost.
      // Não abre o modal antigo sf77 nem move o formulário do desktop.
      if($('songUrl'))$('songUrl').value=query;
      if(typeof window.sf78SearchFromField==='function')window.sf78SearchFromField(query,immediate);
      else status('A busca está indisponível. Atualize a página.',true);
    };
    $('sf138SearchQuery').addEventListener('input',()=>runMobileSearch(false));
    $('sf138SearchQuery').addEventListener('keydown',e=>{
      if(e.key==='Enter'){e.preventDefault();e.stopPropagation();runMobileSearch(true);}
    });
    $('sf138SearchSubmit').addEventListener('click',()=>runMobileSearch(true));
    document.addEventListener('keydown',e=>{
      if(layer.hidden)return;
      if(e.key==='Escape'){e.preventDefault();close();return;}
      if(e.key==='Tab'){
        const focusable=Array.from(layer.querySelectorAll('button:not([disabled]),input:not([disabled]),[tabindex="0"]'))
          .filter(el=>!el.closest('[hidden]')&&el.getClientRects().length);
        if(!focusable.length)return;
        const first=focusable[0],last=focusable[focusable.length-1];
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
      }
    });
    // A mesma janela serve ao desktop e mobile; mudar o tamanho não deve fechá-la.
    window.addEventListener('resize',()=>{if(!layer.hidden && !$('screen-room')?.classList.contains('active'))close();});
  }
  function looksLikeYouTubeReference(value){
    const v=String(value||'').trim();
    return validId(v)||/^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com|youtu\.be)\//i.test(v);
  }
  function updateSearchButton(){
    const button=$('addBtn'),input=$('songUrl');
    if(!button||!input)return;
    button.textContent=$('sf76MusicSheet')&&!$('sf76MusicSheet').hidden&&!looksLikeYouTubeReference(input.value) ? 'Buscar' : 'Adicionar';
  }
  function submitSearchText(event){
    const input=$('songUrl'),sheet=$('sf76MusicSheet');
    if(!sheet||sheet.hidden||state.tab!=='search'||!input)return;
    const text=String(input.value||'').trim();
    if(!text || looksLikeYouTubeReference(text))return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();
    if(text.length<2){status('Digite pelo menos duas letras para buscar.',true);return;}
    if(typeof handleSearchInput==='function')handleSearchInput(text);
    status('Os resultados aparecem abaixo do campo de busca.');
  }
  function takeRequestCard(){
    const card=$('sf10RequestCard');const host=$('sf76RequestHost');
    if(!card||!host)return;
    if(!state.originalHolder){state.originalHolder=document.createComment('SonoraFan 76: posição original do formulário');card.before(state.originalHolder);}
    host.appendChild(card);
    card.classList.add('sf76-moved-request');
    updateSearchButton();
  }
  function restoreRequestCard(){
    const card=$('sf10RequestCard');const place=state.originalHolder;
    if(card&&place?.parentNode){place.parentNode.insertBefore(card,place);place.remove();}
    card?.classList.remove('sf76-moved-request');
    if($('addBtn'))$('addBtn').textContent='Adicionar';
    state.originalHolder=null;
  }
  function open(tab='search'){
    // Janela unificada: busca e favoritas são abas no mesmo painel.
    // Evita abrir sf77 por cima das favoritas ou duplicar a experiência.
    window.sf77CloseSearch?.();
    window.sf113CloseSongSearch?.();
    if(!$('screen-room')?.classList.contains('active')&&!roomName())return;
    buildSheet();
    state.lastFocus=document.activeElement;
    const layer=$('sf76MusicSheet');
    if(!layer.hidden){
      switchTab(tab);
      return; // impedimos que o mesmo toque reinicialize a janela.
    }
    if(smallScreen()){
      // No celular o campo de busca tem DOM próprio. O cartão sf10 ficava
      // invisível ou era movido por outros controladores de modal.
      restoreRequestCard();
    } else takeRequestCard();
    layer.hidden=false;
    document.body.classList.add('sf76-sheet-active');
    layer.classList.toggle('sf133-owner-locked',$('screen-room')?.classList.contains('sf129-guest-locked'));
    const head=layer.querySelector('.sf76-head small');
    if(head)head.textContent=$('screen-room')?.classList.contains('sf129-owner-mode')?'PLAYLIST DO ANFITRIÃO':'A PRÓXIMA ESCOLHA É SUA';
    switchTab(tab);
    status(tab==='search' ? 'Busque uma música e toque em adicionar para colocá-la na fila.' : 'Escolha uma faixa favorita para enviar à fila.');
  }
  function close(){
    const layer=$('sf76MusicSheet');if(!layer||layer.hidden)return;
    layer.hidden=true;
    document.body.classList.remove('sf76-sheet-active');
    if(typeof window.sf78CloseInline==='function') window.sf78CloseInline();
    restoreRequestCard();
    state.lastFocus?.focus?.({preventScroll:true});
    state.lastFocus=null;
  }
  function switchTab(tab){
    if(!['search','favorites'].includes(tab))tab='search';
    state.tab=tab;
    const search=$('sf76SearchPane'),favorites=$('sf76FavoritesPane');
    if(search)search.hidden=tab!=='search';
    if(favorites)favorites.hidden=tab!=='favorites';
    document.querySelectorAll('#sf76MusicSheet [data-sf76-tab]').forEach(button=>{
      const selected=button.dataset.sf76Tab===tab;
      button.setAttribute('aria-selected',String(selected));button.classList.toggle('is-active',selected);
    });
    if(tab==='favorites') {
      window.sf78CloseInline?.();
      loadFavorites();
    } else {
      requestAnimationFrame(()=>{
        const target=smallScreen() ? $('sf138SearchQuery') : $('songUrl');
        target?.focus({preventScroll:true});
      });
    }
    const locked=$('screen-room')?.classList.contains('sf129-guest-locked');
    const submit=$('addBtn');if(submit)submit.disabled=!!locked;
    document.querySelectorAll('#sf76MusicSheet .song-preview-confirm').forEach(b=>b.disabled=!!locked);
    const info=$('sf76MusicStatus');if(locked&&info)status('🔒 Somente o anfitrião pode adicionar músicas nesta sala.',true);
  }
  async function loadFavorites(){
    const sequence=++state.searchRequest;
    const list=$('sf76FavoritesList');if(!list)return;
    list.innerHTML='<p class="sf76-empty">Carregando suas favoritas…</p>';
    try{
      const [favoritesResponse,genresResponse]=await Promise.all([
        fetch('/api/favorites',{credentials:'include'}),
        fetch('/api/favorite-genres',{credentials:'include'})
      ]);
      if(!favoritesResponse.ok)throw new Error('Não foi possível carregar suas músicas favoritas.');
      const tracks=await favoritesResponse.json();
      const genres=genresResponse.ok?await genresResponse.json().catch(()=>({})):{};
      if(sequence!==state.searchRequest)return;
      state.favorites=(Array.isArray(tracks)?tracks:[]).filter(t=>validId(t?.id));
      state.genres=Array.isArray(genres?.genres)?genres.genres.filter(g=>g&&typeof g.id==='string'&&typeof g.name==='string'):[];
      const shared=cachedFavorites();if(Array.isArray(shared)){shared.splice(0,shared.length,...state.favorites);}
      drawFavorites();
    }catch(e){if(sequence===state.searchRequest){list.innerHTML='<p class="sf76-empty" role="alert">Falha ao carregar favoritas. Toque em Minhas favoritas para tentar de novo.</p>';status(e.message,true);}}
  }
  function drawFavorites(){
    const chips=$('sf76FavoriteGenres'),list=$('sf76FavoritesList');if(!chips||!list)return;
    const all=state.favorites;
    const options=[{id:'all',name:'Todas'},{id:'none',name:'Sem gênero'},...state.genres];
    const known=new Set(state.genres.map(g=>g.id));
    chips.innerHTML=options.map(g=>{
      const count=all.filter(t=>g.id==='all'||(g.id==='none'?(!known.has(t.genreId)):t.genreId===g.id)).length;
      return `<button type="button" data-sf76-genre="${escapeHtml(g.id)}" aria-pressed="${state.filter===g.id}">${escapeHtml(g.name)} <span>${count}</span></button>`;
    }).join('');
    const q=String(state.search||'').trim().toLocaleLowerCase('pt-BR');
    const visible=all.filter(t=>{
      const genre=known.has(t.genreId)?t.genreId:'none';
      return (state.filter==='all'||genre===state.filter) && (!q||`${t.title||''} ${t.artist||''}`.toLocaleLowerCase('pt-BR').includes(q));
    });
    if(!visible.length){list.innerHTML='<p class="sf76-empty">Nenhuma música nesta seleção. Você pode buscar outra faixa na aba Buscar música.</p>';return;}
    list.innerHTML=visible.map(t=>`<article class="sf76-track">
      <img src="https://img.youtube.com/vi/${encodeURIComponent(t.id)}/mqdefault.jpg" alt="" loading="lazy">
      <div class="sf76-track-copy"><strong>${escapeHtml(t.title||'Música')}</strong><small>${escapeHtml(t.artist||'Artista')}</small></div>
      <button type="button" data-sf76-add="${escapeHtml(t.id)}" aria-label="Adicionar ${escapeHtml(t.title||'música')} à fila">＋ Adicionar</button>
    </article>`).join('');
  }
  async function submitFavorite(favorite){
    if(state.busy)return;
    if(!roomName()){status('Você precisa entrar em uma sala para adicionar músicas.',true);return;}
    if($('screen-room')?.classList.contains('sf129-guest-locked')){status('Somente o anfitrião pode adicionar músicas nesta sala.',true);return;}
    const liveSocket=socketClient();
    if(!liveSocket?.connected){status('Sem conexão com a sala. Reconecte-se e tente novamente.',true);return;}
    const current=currentRoomState();
    const allTracks=[...(current?.queue||[]),...(current?.waitingQueue||[])];
    if(allTracks.some(song=>song.id===favorite.id)){status('Essa música já está na fila da sala.',true);return;}
    const since=typeof lastAddTime!=='undefined'?Date.now()-lastAddTime:Infinity;
    if(since>=0&&since<30000){status(`Aguarde ${Math.ceil((30000-since)/1000)}s antes de adicionar outra música.`,true);return;}
    state.busy=true;
    const id=favorite.id;
    const buttons=Array.from(document.querySelectorAll('#sf76FavoritesList [data-sf76-add]'));
    buttons.forEach(b=>b.disabled=true);
    status('Verificando vídeo e enviando para a fila…');
    let duration=null;
    try{
      const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),7000);
      try{
        const response=await fetch('/api/video-info?id='+encodeURIComponent(id),{credentials:'include',signal:controller.signal});
        if(!response.ok)throw new Error('Não foi possível validar o vídeo. Tente novamente.');
        const info=await response.json();
        if(info.embeddable===false)throw new Error('Esse vídeo não permite reprodução na sala.');
        duration=Number(info.duration)||null;
        const max=Number(current?.maxDuration)||600;
        if(!current?.allowLive && duration && duration>max)throw new Error('Esse vídeo ultrapassa o limite de duração da sala.');
      }finally{clearTimeout(timer);}
      const song={id,title:favorite.title||'Música',artist:favorite.artist||'Artista',duration};
      if(typeof window.sf80QueueSong!=='function')throw new Error('Fila indisponível. Atualize a página.');
      await window.sf80QueueSong(song);
      status('✓ Música adicionada à fila! Use “Ver fila” para acompanhar.');
    }catch(e){status(e.message||'Erro ao adicionar música.',true);}
    finally{state.busy=false;buttons.forEach(b=>b.disabled=false);}
  }
  function initialize(){
    buildSheet();
    window.sf76OpenMusic=open;
    window.sf76CloseMusic=close;
    $('songUrl')?.addEventListener('input',updateSearchButton);
    $('songUrl')?.addEventListener('keydown',e=>{if(e.key==='Enter')submitSearchText(e);},true);
    $('addBtn')?.addEventListener('click',submitSearchText,true);
    $('searchResults')?.addEventListener('click',()=>{setTimeout(updateSearchButton,0);});
    // Atalhos legados agora abrem o painel acessível no mobile.
    window.sf34FindSong=function(){open('search');};
    document.addEventListener('click',e=>{
      const trigger=e.target.closest('#sf55SessionAdd,.add-first-btn,.sf34-add-mobile,[data-sf63-open="music"]');
      if(!trigger)return;
      if(trigger.matches('#sf55SessionAdd,.add-first-btn,.sf34-add-mobile,[data-sf63-open="music"]')){
        e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();open('search');
      }
    },true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
})();
