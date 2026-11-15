/* SonoraFan 67.0 — menus compactos e favoritos organizados em gêneros criados pelo usuário. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  const state = {genres:[], loaded:false, loading:false, key:'', filter:'all', query:'', editing:false, busy:false};
  const favorites = () => (typeof myFavorites !== 'undefined' && Array.isArray(myFavorites)) ? myFavorites : [];
  const me = () => (typeof currentUser !== 'undefined' && currentUser) ? String(currentUser.email||'') : '';
  const status = (msg, error=false) => {const node=$('sf67FavStatus'); if(node){node.textContent=msg;node.classList.toggle('is-error',!!error);}};
  const selectedGenre = id => state.genres.find(x=>x.id===id);
  async function api(url,options={}) {
    const response = await fetch(url,{credentials:'include',...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})}});
    const data=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(data.error || 'Não foi possível concluir a operação.');
    return data;
  }
  async function loadGenres(){
    const key=me();
    if(!key) {state.loaded=false;status('Entre na sua conta para organizar as músicas.',true);return;}
    if(state.loading)return;
    state.loading=true;
    try{const response=await api('/api/favorite-genres');state.genres=Array.isArray(response.genres)?response.genres:[];state.loaded=true;status('');}
    catch(e){state.loaded=false;status(e.message,true);}
    finally{state.loading=false; draw();}
  }
  function buttonChip(id,name,count){
    const active=state.filter===id;
    return `<button type="button" class="sf67-chip ${active?'is-active':''}" data-sf67-filter="${escape(id)}" aria-pressed="${active}">${escape(name)}<span>${count}</span></button>`;
  }
  function row(item) {
    const id=String(item.id||'');
    if(!/^[\w-]{11}$/.test(id))return '';
    const choices=[{id:'',name:'Sem gênero'},...state.genres];
    const current=selectedGenre(item.genreId)?.id||'';
    return `<article class="sf67-fav-track" data-sf67-id="${escape(id)}">
      <img src="https://img.youtube.com/vi/${encodeURIComponent(id)}/mqdefault.jpg" alt="" loading="lazy" decoding="async">
      <div class="sf67-track-info"><strong title="${escape(item.title||'Música')}">${escape(item.title||'Música')}</strong><small>${escape(item.artist||'Artista')}</small>
      ${state.filter==='all'?`<label class="sf67-assign"><span>Gênero</span><select class="sf67-track-genre" aria-label="Gênero de ${escape(item.title||'Música')}">${choices.map(g=>`<option value="${escape(g.id)}" ${current===g.id?'selected':''}>${escape(g.name)}</option>`).join('')}</select></label>`:''}</div>
      <div class="sf67-track-actions"><button type="button" data-sf67-action="queue" title="Adicionar à fila" aria-label="Adicionar ${escape(item.title||'Música')} à fila">＋</button><button type="button" class="sf67-delete-track" data-sf67-action="remove" title="Remover dos favoritos" aria-label="Remover ${escape(item.title||'Música')} dos favoritos">×</button></div>
    </article>`;
  }
  function draw(){
    const box=$('favoritesList'),chips=$('sf67GenreFilters'),management=$('sf67GenreManage');if(!box||!chips||!management)return;
    box.dataset.sf72Filtered=String(state.filter!=='all');
    if(!state.loaded){if(state.loading)box.innerHTML='<p class="sf67-empty">Carregando suas coleções…</p>';else box.innerHTML='<p class="sf67-empty">Não foi possível carregar as coleções. Abra novamente para tentar.</p>';return;}
    const tracks=favorites();
    const known=new Set(state.genres.map(g=>g.id));
    const byGenre=g=>tracks.filter(f=>(known.has(f.genreId)?f.genreId:'')===g);
    chips.innerHTML=buttonChip('all','Todas',tracks.length)+buttonChip('none','Sem gênero',byGenre('').length)+state.genres.map(g=>buttonChip(g.id,g.name,byGenre(g.id).length)).join('');
    if(state.filter!=='all'&&state.filter!=='none'&&!known.has(state.filter))state.filter='all';
    const chosen=selectedGenre(state.filter);
    management.hidden=!chosen;
    if(chosen) management.innerHTML=`<div class="sf67-manage-title"><span>Gênero: <strong>${escape(chosen.name)}</strong></span><div><button type="button" data-sf67-action="edit-genre">Renomear</button><button type="button" data-sf67-action="delete-genre" class="sf67-danger">Excluir gênero</button></div></div>${state.editing?`<form id="sf67RenameForm" class="sf67-inline"><label class="sr-only" for="sf67RenameName">Novo nome</label><input id="sf67RenameName" maxlength="28" required value="${escape(chosen.name)}"><button type="submit">Salvar</button></form>`:''}`;
    const search=state.query.trim().toLocaleLowerCase('pt-BR');
    const relevant=t=>!search||`${t.title||''} ${t.artist||''}`.toLocaleLowerCase('pt-BR').includes(search);
    const sections=[];
    const renderGroup=(id,name)=>{
      const all=byGenre(id);const items=all.filter(relevant).slice().sort((a,b)=>String(a.title||'').localeCompare(String(b.title||''),'pt-BR'));
      if(state.filter==='all'&&!items.length)return;
      sections.push(`<section class="sf67-fav-section"><h4>${escape(name)} <span>${items.length}</span></h4>${items.length?items.map(row).join(''):'<p class="sf67-empty">Nenhuma música nesta categoria.</p>'}</section>`);
    };
    if(state.filter==='all'){
      state.genres.forEach(g=>renderGroup(g.id,g.name));renderGroup('','Sem gênero');
    }else if(state.filter==='none') renderGroup('','Sem gênero');
    else renderGroup(state.filter,chosen?.name||'Coleção');
    box.innerHTML=sections.join('')||'<div class="sf67-empty">Nenhuma música encontrada. Crie uma coleção ou experimente outro filtro.</div>';
    $('sf67FavCount').textContent=`${tracks.length} ${tracks.length===1?'música':'músicas'}`;
  }
  function render(){
    const key=me();
    if(state.key!==key){state.key=key;state.loaded=false;state.loading=false;state.genres=[];state.filter='all';state.editing=false;state.query='';if($('sf67FavSearch'))$('sf67FavSearch').value='';}
    if(!state.loaded){loadGenres();return;}
    draw();
  }
  async function task(operation,success){
    if(state.busy)return;
    state.busy=true;status('Salvando alterações…');
    try{await operation();status(success);draw();}
    catch(e){status(e.message,true);draw();}
    finally{state.busy=false;}
  }
  function setupFavorites(){
    const form=$('sf67GenreForm'),chips=$('sf67GenreFilters'),manage=$('sf67GenreManage'),list=$('favoritesList'),search=$('sf67FavSearch');
    if(!form||!chips||!manage||!list)return;
    form.addEventListener('submit',e=>{e.preventDefault();const field=$('sf67GenreName'),name=field.value.trim();if(!name)return;
      task(async()=>{const d=await api('/api/favorite-genres',{method:'POST',body:JSON.stringify({name})});state.genres.push(d.genre);state.filter=d.genre.id;state.editing=false;field.value='';},'Gênero criado. Escolha as músicas para organizá-las.');
    });
    chips.addEventListener('click',e=>{const btn=e.target.closest('[data-sf67-filter]');if(!btn)return;state.filter=btn.dataset.sf67Filter;state.editing=false;draw();chips.querySelector(`[data-sf67-filter="${CSS.escape(state.filter)}"]`)?.focus();});
    search?.addEventListener('input',e=>{state.query=e.target.value;draw();});
    manage.addEventListener('click',e=>{
      const btn=e.target.closest('[data-sf67-action]');if(!btn)return;const chosen=selectedGenre(state.filter);if(!chosen)return;
      if(btn.dataset.sf67Action==='edit-genre'){state.editing=!state.editing;draw();$('sf67RenameName')?.focus();}
      if(btn.dataset.sf67Action==='delete-genre'){
        if(!confirm(`Excluir o gênero “${chosen.name}”? As músicas voltarão para Sem gênero.`))return;
        task(async()=>{await api(`/api/favorite-genres/${encodeURIComponent(chosen.id)}`,{method:'DELETE'});state.genres=state.genres.filter(x=>x.id!==chosen.id);favorites().forEach(f=>{if(f.genreId===chosen.id)f.genreId='';});state.filter='none';state.editing=false;},'Gênero excluído sem apagar nenhuma música.');
      }
    });
    manage.addEventListener('submit',e=>{if(e.target.id!=='sf67RenameForm')return;e.preventDefault();const chosen=selectedGenre(state.filter);if(!chosen)return;const name=$('sf67RenameName').value.trim();
      task(async()=>{const d=await api(`/api/favorite-genres/${encodeURIComponent(chosen.id)}`,{method:'PATCH',body:JSON.stringify({name})});state.genres=state.genres.map(x=>x.id===chosen.id?d.genre:x);state.editing=false;},'Gênero renomeado.');
    });
    list.addEventListener('change',e=>{const select=e.target.closest('.sf67-track-genre');if(!select)return;const article=select.closest('[data-sf67-id]'),id=article?.dataset.sf67Id;const song=favorites().find(f=>f.id===id);if(!song)return;
      const genreId=select.value==='none'?'':select.value;
      task(async()=>{await api(`/api/favorites/${encodeURIComponent(id)}/genre`,{method:'PATCH',body:JSON.stringify({genreId})});song.genreId=genreId;},'Música organizada.');
    });
    list.addEventListener('click',e=>{const btn=e.target.closest('[data-sf67-action]');if(!btn)return;const id=btn.closest('[data-sf67-id]')?.dataset.sf67Id;if(!id)return;
      if(btn.dataset.sf67Action==='queue'){if(typeof addFavoriteToQueue==='function')addFavoriteToQueue(id);}
      else if(btn.dataset.sf67Action==='remove'){if(!confirm('Remover esta música dos favoritos?'))return;if(typeof removeFavorite==='function')removeFavorite(id);}
    });
  }
  function restoreCompactMenus(){
    for(const nav of [document.querySelector('#screen-lobby .sf28-sidebar-nav'),document.querySelector('#screen-room .sf5-navigation')]){
      if(!nav)continue;
      nav.classList.remove('sf67-more-open');
      nav.querySelectorAll('.sf67-more-toggle').forEach(button=>button.remove());
      nav.querySelectorAll('.sf67-nav-extra,.sf67-nav-primary').forEach(button=>{
        button.classList.remove('sf67-nav-extra','sf67-nav-primary');
        button.style.removeProperty('order');
      });
    }
  }
  function init(){restoreCompactMenus();setupFavorites();window.sf67RenderFavorites=render;}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
