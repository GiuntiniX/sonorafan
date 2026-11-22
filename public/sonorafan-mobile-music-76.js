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
  const state={tab:'search',genres:[],favorites:[],filter:'all',search:'',sort:'recent',selected:new Set(),queueQuery:'',queueMode:'all',queueRoom:null,busy:false,lastFocus:null,originalHolder:null,pending:null,searchRequest:0};
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
          <button type="button" data-sf76-tab="queue" role="tab" aria-selected="false" aria-controls="sf76QueuePane">♫ Na fila</button>
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
            <details class="sf264-collection-create"><summary>＋ Nova coleção</summary><form class="sf76-create-genre" id="sf76CreateGenre"><label for="sf76NewGenre">Nome da coleção</label><div><input id="sf76NewGenre" maxlength="28" type="text" placeholder="Ex.: Academia, meus hits..." required><button type="submit">Criar</button></div></form></details>
            <div class="sf76-genres" id="sf76FavoriteGenres" role="group" aria-label="Filtrar favoritas por coleção"></div>
            <div class="sf264-toolbar"><span id="sf264VisibleCount" aria-live="polite"></span><label>Ordenar <select id="sf264Sort"><option value="recent">Recentes</option><option value="title">Música A–Z</option><option value="artist">Artista A–Z</option><option value="collection">Coleção</option></select></label></div>
            <div id="sf264Manage" class="sf264-manage" hidden></div>
            <div class="sf76-list" id="sf76FavoritesList" aria-live="polite"></div>
            <div class="sf264-batch" id="sf264Batch" hidden><span id="sf264BatchCount"></span><button type="button" id="sf264PrepareBatch">Preparar seleção</button><button type="button" id="sf264ClearBatch">Limpar</button></div>
          </section>
          <section id="sf76QueuePane" role="tabpanel" aria-label="Pesquisar músicas que estão na fila" hidden>
            <div class="sf269-queue-tools">
              <label for="sf269QueueSearch">Encontrar na fila</label>
              <div class="sf269-queue-fields">
                <input id="sf269QueueSearch" type="search" placeholder="Música, artista ou DJ…" autocomplete="off">
                <select id="sf269QueueMode" aria-label="Filtrar músicas da fila">
                  <option value="all">Todas</option>
                  <option value="next">Próximas</option>
                  <option value="mine">Minhas</option>
                </select>
              </div>
              <small id="sf269QueueCount" role="status" aria-live="polite"></small>
            </div>
            <div id="sf269QueueList" class="sf269-queue-list"></div>
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
    $('sf269QueueSearch').addEventListener('input',e=>{state.queueQuery=e.target.value;renderQueueTab();});
    $('sf269QueueMode').addEventListener('change',e=>{state.queueMode=e.target.value;renderQueueTab();});
    $('sf269QueueList').addEventListener('click',async e=>{
      const button=e.target.closest('[data-sf269-remove]');if(!button)return;
      const id=button.dataset.sf269Remove;
      if(!window.confirm('Retirar sua música da fila colaborativa?'))return;
      button.disabled=true;
      try{
        if(!window.sf95Queue?.removeOwnById)throw Error('Não foi possível localizar a sala.');
        await window.sf95Queue.removeOwnById(id);
        status('Música retirada da fila.');
        renderQueueTab();
      }catch(err){status(err.message||'Não foi possível retirar a música.',true);button.disabled=false;}
    });
    $('sf264Sort').value=state.sort;
    $('sf264Sort').addEventListener('change',e=>{state.sort=e.target.value;drawFavorites();});
    $('sf264ClearBatch').addEventListener('click',()=>{state.selected.clear();drawFavorites();});
    $('sf264PrepareBatch').addEventListener('click',()=>{
      const queue=state.favorites.filter(t=>state.selected.has(t.id));
      if(!queue.length)return;
      const song=queue[0];
      if(window.sfCooldown?.prepare?.(song)){
        status(queue.length===1?'Música preparada. Confirme no contador.':`Primeira de ${queue.length} músicas preparada. Confirme uma por vez, respeitando o intervalo da sala.`);
        state.selected.delete(song.id);drawFavorites();
      }
    });
    $('sf264Manage').addEventListener('click',async e=>{
      const action=e.target.closest('[data-sf264-manage]')?.dataset.sf264Manage;
      const genre=state.genres.find(g=>g.id===state.filter);
      if(!genre||!action)return;
      if(action==='rename'){
        const name=prompt('Novo nome da coleção:',genre.name)?.trim();
        if(!name||name===genre.name)return;
        await mutateFavorite(async()=>{const result=await favoritesApi('/api/favorite-genres/'+encodeURIComponent(genre.id),{method:'PATCH',body:JSON.stringify({name})});genre.name=result.genre.name;},'Coleção renomeada.');
      }else if(action==='delete'){
        if(!confirm('Excluir esta coleção? Suas músicas favoritas serão preservadas.'))return;
        await mutateFavorite(async()=>{await favoritesApi('/api/favorite-genres/'+encodeURIComponent(genre.id),{method:'DELETE'});state.genres=state.genres.filter(g=>g.id!==genre.id);state.favorites.forEach(t=>{if(t.genreId===genre.id)t.genreId='';});state.filter='none';},'Coleção excluída sem apagar as músicas.');
      }
    });
    $('sf76FavoriteGenres').addEventListener('click',e=>{const btn=e.target.closest('[data-sf76-genre]');if(!btn)return;state.filter=btn.dataset.sf76Genre;drawFavorites();});
    $('sf76FavoritesList').addEventListener('click',e=>{
      const button=e.target.closest('[data-sf76-add],[data-sf76-remove],[data-sf264-style]');if(!button||state.busy)return;
      const entry=state.favorites.find(x=>x.id===(button.dataset.sf76Add||button.dataset.sf76Remove||button.dataset.sf264Style));
      if(!entry)return;
      if(button.hasAttribute('data-sf76-add'))submitFavorite(entry);
      else if(button.hasAttribute('data-sf264-style'))editStyles(entry);
      else if(confirm('Remover esta música dos favoritos?'))removeFavoriteFromSheet(entry);
    });
    $('sf76FavoritesList').addEventListener('change',e=>{
      const check=e.target.closest('[data-sf264-check]');
      if(check){if(check.checked)state.selected.add(check.dataset.sf264Check);else state.selected.delete(check.dataset.sf264Check);renderBatch();return;}
      const field=e.target.closest('[data-sf76-assign]');if(!field||state.busy)return;
      const entry=state.favorites.find(x=>x.id===field.dataset.sf76Assign);
      if(entry)assignFavoriteGenre(entry,field.value);
    });
    $('sf76CreateGenre').addEventListener('submit',e=>{
      e.preventDefault();if(state.busy)return;
      const field=$('sf76NewGenre'),name=field.value.trim();if(!name)return;
      mutateFavorite(async()=>{
        const data=await favoritesApi('/api/favorite-genres',{method:'POST',body:JSON.stringify({name})});
        state.genres.push(data.genre);state.filter=data.genre.id;field.value='';$('sf76CreateGenre')?.closest('details')?.removeAttribute('open');
      },'Coleção criada. Em Todas, escolha o gênero de cada música.');
    });
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
    status(tab==='search' ? 'Busque uma música e toque em adicionar para colocá-la na fila.' : tab==='favorites' ? 'Escolha uma faixa favorita para enviar à fila.' : 'Encontre músicas na fila e gerencie suas escolhas.');
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
    if(!['search','favorites','queue'].includes(tab))tab='search';
    state.tab=tab;
    const search=$('sf76SearchPane'),favorites=$('sf76FavoritesPane'),queue=$('sf76QueuePane');
    if(search)search.hidden=tab!=='search';
    if(favorites)favorites.hidden=tab!=='favorites';
    if(queue)queue.hidden=tab!=='queue';
    document.querySelectorAll('#sf76MusicSheet [data-sf76-tab]').forEach(button=>{
      const selected=button.dataset.sf76Tab===tab;
      button.setAttribute('aria-selected',String(selected));button.classList.toggle('is-active',selected);
    });
    if(tab==='favorites') {
      window.sf78CloseInline?.();
      loadFavorites();
    } else if(tab==='queue'){
      window.sf78CloseInline?.();
      renderQueueTab();
      requestAnimationFrame(()=>$('sf269QueueSearch')?.focus({preventScroll:true}));
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
  function renderQueueTab(){
    const container=$('sf269QueueList'),counter=$('sf269QueueCount');
    if(!container||!counter)return;
    const data=window.sf95Queue?.getRoom?.()||currentRoomState();
    const tracks=Array.isArray(data?.queue)?data.queue:[];
    const waiting=Array.isArray(data?.waitingQueue)?data.waitingQueue:[];
    const index=Math.max(0,Number(data?.currentIndex)||0);
    const entries=[
      ...tracks.map((track,i)=>({track,position:i,waiting:false})),
      ...waiting.map(track=>({track,position:tracks.length,waiting:true}))
    ];
    const query=String(state.queueQuery||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLocaleLowerCase('pt-BR');
    const normalize=value=>String(value||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLocaleLowerCase('pt-BR');
    const mine=track=>Boolean(window.sf95Queue?.isMine?.(track));
    const filtered=entries.filter(item=>{
      const owns=mine(item.track);
      if(state.queueMode==='mine'&&!owns)return false;
      if(state.queueMode==='next'&&!item.waiting&&item.position<=index)return false;
      return !query||normalize([item.track.title,item.track.artist,item.track.dj].join(' ')).includes(query);
    });
    counter.textContent=filtered.length+' de '+entries.length+' músicas';
    if(!filtered.length){
      container.innerHTML='<p class="sf76-empty">Nenhuma música encontrada nesse filtro.</p>';return;
    }
    container.innerHTML=filtered.map(({track,position,waiting})=>{
      const owns=mine(track),canRemove=owns&&(waiting||position>index),current=!waiting&&position===index;
      return `<article class="sf269-queue-track">
        <img src="https://img.youtube.com/vi/${encodeURIComponent(track.id||'')}/mqdefault.jpg" alt="" loading="lazy">
        <div class="sf269-queue-copy"><strong>${escapeHtml(decodeTitle(track.title||'Música'))}</strong>
          <small>${escapeHtml(decodeTitle(track.artist||'Artista'))} · DJ ${escapeHtml(track.dj||'participante')}</small>
          <span>${waiting?'Aguardando entrada':current?'Tocando agora':position<index?'Já tocou':'Posição '+(position+1)}</span>
        </div>
        ${canRemove&&validId(track.id)?`<button type="button" data-sf269-remove="${escapeHtml(track.id)}" aria-label="Retirar ${escapeHtml(decodeTitle(track.title||'música'))} da fila">✕ Retirar</button>`:''}
      </article>`;
    }).join('');
  }

  async function favoritesApi(url,options={}){
    const response=await fetch(url,{credentials:'include',...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})}});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||'Não foi possível salvar a alteração.');
    return data;
  }
  async function mutateFavorite(operation,message){
    if(state.busy)return;state.busy=true;
    const panel=$('sf76FavoritesPane');
    panel?.querySelectorAll('button,input,select').forEach(control=>control.disabled=true);
    try{await operation();status(message);drawFavorites();}
    catch(error){status(error.message||'Erro ao atualizar favoritos.',true);drawFavorites();}
    finally{state.busy=false;panel?.querySelectorAll('button,input,select').forEach(control=>control.disabled=false);}
  }
  async function removeFavoriteFromSheet(entry){
    await mutateFavorite(async()=>{
      await favoritesApi('/api/favorites/'+encodeURIComponent(entry.id),{method:'DELETE'});
      state.favorites=state.favorites.filter(song=>song.id!==entry.id);state.selected.delete(entry.id);
      const shared=cachedFavorites();if(Array.isArray(shared))shared.splice(0,shared.length,...state.favorites);
    },'Música removida dos favoritos.');
  }
  async function assignFavoriteGenre(entry,genreId){
    if(genreId&&!state.genres.some(g=>g.id===genreId)){status('Gênero inválido.',true);drawFavorites();return;}
    if((entry.genreId||'')===genreId)return;
    await mutateFavorite(async()=>{
      await favoritesApi('/api/favorites/'+encodeURIComponent(entry.id)+'/genre',{method:'PATCH',body:JSON.stringify({genreId})});
      entry.genreId=genreId;
      const shared=cachedFavorites(),existing=Array.isArray(shared)?shared.find(x=>x.id===entry.id):null;
      if(existing)existing.genreId=genreId;
    },'Música movida para a coleção escolhida.');
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
      state.favorites=(Array.isArray(tracks)?tracks:[]).filter(t=>validId(t?.id));state.selected=new Set([...state.selected].filter(id=>state.favorites.some(t=>t.id===id)));
      state.genres=Array.isArray(genres?.genres)?genres.genres.filter(g=>g&&typeof g.id==='string'&&typeof g.name==='string'):[];
      const shared=cachedFavorites();if(Array.isArray(shared)){shared.splice(0,shared.length,...state.favorites);}
      drawFavorites();
    }catch(e){if(sequence===state.searchRequest){list.innerHTML='<p class="sf76-empty" role="alert">Falha ao carregar favoritas. Toque em Minhas favoritas para tentar de novo.</p>';status(e.message,true);}}
  }
  const decodeTitle=value=>String(value||'').replace(/&(?:quot|#34|#x22);/gi,'"').replace(/&(?:apos|#39|#x27);/gi,"'").replace(/&(?:amp|#38);/gi,'&').replace(/&(?:lt|#60);/gi,'<').replace(/&(?:gt|#62);/gi,'>');
  const fold=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
  const suggestions=[
    {test:/linkin park|limp bizkit|korn|slipknot|system of a down/i,styles:['Rock','Nu Metal','Alternativo']},
    {test:/falling in reverse|bring me the horizon|bad omens/i,styles:['Rock','Metalcore']},
    {test:/metallica|megadeth|iron maiden/i,styles:['Metal','Rock']},
    {test:/coldplay|imagine dragons/i,styles:['Pop Rock','Alternativo']},
    {test:/daft punk|avicii|alok|calvin harris/i,styles:['Eletrônica']},
    {test:/anitta|ludmilla/i,styles:['Pop','Brasil']},
    {test:/sertanejo|marilia mendonca|jorge e mateus/i,styles:['Sertanejo','Brasil']}
  ];
  function suggestedStyles(track){
    const input=fold((track.artist||'')+' '+(track.title||''));
    return suggestions.find(x=>x.test.test(input))?.styles||[];
  }
  async function editStyles(entry){
    const current=Array.isArray(entry.styles)?entry.styles:[];
    const recommendation=suggestedStyles(entry);
    const value=prompt('Estilos musicais separados por vírgula (até 6). Sugestão: '+(recommendation.join(', ')||'nenhuma'),current.join(', ')||recommendation.join(', '));
    if(value===null)return;
    const styles=[...new Set(value.split(',').map(t=>t.trim()).filter(Boolean))].slice(0,6);
    await mutateFavorite(async()=>{
      await favoritesApi('/api/favorites/'+encodeURIComponent(entry.id)+'/styles',{method:'PATCH',body:JSON.stringify({styles})});
      entry.styles=styles;
    },'Estilos musicais atualizados.');
  }
  function renderBatch(){
    const batch=$('sf264Batch'),count=$('sf264BatchCount');
    if(!batch||!count)return;
    batch.hidden=!state.selected.size;
    count.textContent=state.selected.size+' selecionada(s)';
  }
  function drawFavorites(){
    const chips=$('sf76FavoriteGenres'),list=$('sf76FavoritesList');if(!chips||!list)return;
    const all=state.favorites,known=new Set(state.genres.map(g=>g.id));
    if(state.filter!=='all'&&state.filter!=='none'&&!known.has(state.filter))state.filter='all';
    const options=[{id:'all',name:'Todas'},{id:'none',name:'Sem coleção'},...state.genres];
    chips.innerHTML=options.map(g=>{
      const count=all.filter(t=>g.id==='all'||(g.id==='none'?(!known.has(t.genreId)):t.genreId===g.id)).length;
      return `<button type="button" data-sf76-genre="${escapeHtml(g.id)}" aria-pressed="${state.filter===g.id}">${escapeHtml(g.name)} <span>${count}</span></button>`;
    }).join('');
    const manage=$('sf264Manage'),current=state.genres.find(g=>g.id===state.filter);
    manage.hidden=!current;
    manage.innerHTML=current?`<span>Coleção: <b>${escapeHtml(current.name)}</b></span><button type="button" data-sf264-manage="rename">Renomear</button><button type="button" data-sf264-manage="delete">Excluir</button>`:'';
    const q=fold(state.search);
    const visible=all.filter(t=>{
      const genre=known.has(t.genreId)?t.genreId:'none';
      return (state.filter==='all'||genre===state.filter)&&(!q||fold(decodeTitle(t.title)+' '+decodeTitle(t.artist)+' '+(t.styles||[]).join(' ')).includes(q));
    });
    const nameOf=t=>state.genres.find(g=>g.id===t.genreId)?.name||'';
    if(state.sort==='recent')visible.reverse();
    if(state.sort==='title')visible.sort((a,b)=>fold(decodeTitle(a.title)).localeCompare(fold(decodeTitle(b.title)),'pt-BR'));
    if(state.sort==='artist')visible.sort((a,b)=>fold(decodeTitle(a.artist)).localeCompare(fold(decodeTitle(b.artist)),'pt-BR'));
    if(state.sort==='collection')visible.sort((a,b)=>nameOf(a).localeCompare(nameOf(b),'pt-BR'));
    $('sf264VisibleCount').textContent=visible.length+' de '+all.length+' músicas';
    if(!visible.length){list.innerHTML='<p class="sf76-empty">Nenhuma música neste filtro. Experimente outro termo ou coleção.</p>';renderBatch();return;}
    const room=currentRoomState(),queued=new Set([...(room?.queue||[]),...(room?.waitingQueue||[])].map(t=>t.id));
    list.innerHTML=visible.map(t=>{
      const inQueue=queued.has(t.id),styles=Array.isArray(t.styles)?t.styles:[];
      const selectOptions=state.genres.map(g=>`<option value="${escapeHtml(g.id)}" ${t.genreId===g.id?'selected':''}>${escapeHtml(g.name)}</option>`).join('');
      return `<article class="sf76-track sf264-track" data-sf76-track="${escapeHtml(t.id)}">
        <input class="sf264-check" type="checkbox" data-sf264-check="${escapeHtml(t.id)}" aria-label="Selecionar ${escapeHtml(t.title||'música')}" ${state.selected.has(t.id)?'checked':''}>
        <img src="https://img.youtube.com/vi/${encodeURIComponent(t.id)}/mqdefault.jpg" alt="" loading="lazy">
        <div class="sf76-track-copy"><strong title="${escapeHtml(decodeTitle(t.title||'Música'))}">${escapeHtml(t.title||'Música')}</strong><small>${escapeHtml(decodeTitle(t.artist||'Artista'))}</small>
          <div class="sf264-style-row">${styles.slice(0,3).map(st=>`<span class="sf264-style">${escapeHtml(st)}</span>`).join('')}<button type="button" data-sf264-style="${escapeHtml(t.id)}" aria-label="Editar estilos musicais de ${escapeHtml(decodeTitle(t.title))}">${styles.length?'✎ Estilos':'＋ Estilos'}</button></div>
          <label class="sf76-assign sf264-assign"><span>Coleção</span><select data-sf76-assign="${escapeHtml(t.id)}" aria-label="Mudar coleção de ${escapeHtml(t.title||'música')}"><option value="" ${!known.has(t.genreId)?'selected':''}>Sem coleção</option>${selectOptions}</select></label>
        </div>
        <div class="sf76-track-actions">
          <button type="button" class="sf264-add" data-sf76-add="${escapeHtml(t.id)}" ${inQueue?'disabled':''} aria-label="Adicionar ${escapeHtml(decodeTitle(t.title||'música'))} à fila">${inQueue?'✓ Na fila':'＋ Adicionar'}</button>
          <button type="button" class="sf264-remove" data-sf76-remove="${escapeHtml(t.id)}" aria-label="Excluir ${escapeHtml(decodeTitle(t.title||'música'))} dos favoritos">✕ Excluir</button>
        </div>
      </article>`;
    }).join('');
    renderBatch();
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
    const wait=Math.max(window.sfCooldown?.remainingMs?.()||0, since>=0?Math.max(0,30000-since):0);
    if(wait>0){window.sfCooldown?.prepare?.({id:favorite.id,title:favorite.title,artist:favorite.artist});status('✓ Música preparada. Confirme quando o contador terminar.');return;}
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
      drawFavorites();
    }catch(e){status(e.message||'Erro ao adicionar música.',true);}
    finally{state.busy=false;buttons.forEach(b=>b.disabled=false);}
  }
  function initialize(){
    buildSheet();
    window.sf76OpenMusic=open;
    window.sf76CloseMusic=close;
    socketClient()?.on('roomState',()=>{if(state.tab==='queue'&&!$('sf76MusicSheet')?.hidden)renderQueueTab();});
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
