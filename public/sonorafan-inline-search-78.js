/* SonoraFan 78 — busca rápida, leve e sobreposta acima do campo de música.
   Preserva a janela completa (v77), a prévia original e a fila colaborativa. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const validId = id => /^[a-zA-Z0-9_-]{11}$/.test(String(id || ''));
  const isLink = text => validId(String(text || '').trim()) || /^(?:https?:\/\/|www\.|(?:m\.)?youtube(?:\.com)?\/|youtu\.be\/)/i.test(String(text || '').trim());
  const roomActive = () => Boolean($('screen-room')?.classList.contains('active'));
  const state = { open:false, query:'', sequence:0, timer:null, controller:null, items:[], activeIndex:-1, lastAnchor:null };
  // Resultados públicos em memória: mesma otimização na busca móvel e desktop.
  const sf150InlineCache=new Map();
  function sf150Get(query){
    const key=query.toLocaleLowerCase('pt-BR'),item=sf150InlineCache.get(key);
    if(!item||Date.now()-item.at>90000){sf150InlineCache.delete(key);return null;}
    return item.tracks;
  }
  function sf150Put(query,tracks){
    const key=query.toLocaleLowerCase('pt-BR');
    sf150InlineCache.delete(key);sf150InlineCache.set(key,{at:Date.now(),tracks});
    if(sf150InlineCache.size>12)sf150InlineCache.delete(sf150InlineCache.keys().next().value);
  }
  const maxRows = 6;
  let frame = 0;
  function syncButton() {
    const input=$('songUrl'), button=$('addBtn');
    if (!input || !button) return;
    const value=String(input.value||'').trim();
    button.textContent=(value.length>=2&&!isLink(value))?'Buscar':'Adicionar';
  }

  function makeNode(tag, className, content) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (content !== undefined) el.textContent = content;
    return el;
  }
  function build() {
    if ($('sf78InlineSearch')) return;
    const popup = makeNode('div', 'sf78-popover');
    popup.id = 'sf78InlineSearch'; popup.hidden = true;
    popup.setAttribute('aria-label', 'Sugestões de músicas');
    popup.innerHTML = `
      <div class="sf78-topbar">
        <strong><span aria-hidden="true">♫</span> MÚSICAS ENCONTRADAS</strong>
        <div class="sf78-top-actions">
          <button type="button" id="sf78OpenFull" class="sf78-extended" aria-label="Abrir busca completa de músicas">↗ Busca completa</button>
          <button type="button" id="sf78Close" class="sf78-x" aria-label="Fechar resultados">✕</button>
        </div>
      </div>
      <div class="sf78-items" id="sf78InlineResults" role="listbox" aria-label="Resultados da busca de música"></div>
      <div class="sf78-bottom" id="sf78Hint" aria-live="polite">Selecione uma música para visualizar antes de adicionar.</div>`;
    document.body.appendChild(popup);
    $('sf78OpenFull').addEventListener('click', openFull);
    $('sf78Close').addEventListener('click', () => close());
  }
  function abort() {
    clearTimeout(state.timer); state.timer = null;
    if (state.controller) state.controller.abort();
    state.controller = null; state.sequence++;
  }
  function close({ clearQuery = false } = {}) {
    abort();
    state.open = false;
    state.activeIndex = -1;
    state.items = [];
    if (clearQuery) state.query = '';
    $('sf78InlineSearch')?.setAttribute('hidden','');
    // Mantém o componente dentro da aba enquanto a janela estiver aberta.
    // O próximo open() reposiciona-o se acionado fora dela.
    const input = $('songUrl');
    input?.setAttribute('aria-expanded','false');
    input?.removeAttribute('aria-activedescendant');
  }
  function renderMessage(message, icon='⌕') {
    const host = $('sf78InlineResults');
    if (!host) return;
    host.replaceChildren();
    const empty = makeNode('div', 'sf78-message');
    empty.append(makeNode('span', '', icon), makeNode('p','',message));
    host.append(empty);
    $('sf78Hint').textContent = 'Busque por artista, banda ou nome da música.';
    position();
  }
  function updateActive() {
    const rows = [...$('sf78InlineResults').querySelectorAll('.sf78-row')];
    rows.forEach((row,i) => {
      row.classList.toggle('is-active',i===state.activeIndex);
      row.setAttribute('aria-selected', String(i===state.activeIndex));
    });
    const current=rows[state.activeIndex];
    const input=$('songUrl');
    if(current){input?.setAttribute('aria-activedescendant',current.id); current.scrollIntoView({block:'nearest'});}
    else input?.removeAttribute('aria-activedescendant');
  }
  function choose(track) {
    if (!validId(track?.id)) return;
    if (typeof window.sf81QuickSelect === 'function' && window.sf81QuickSelect(track)) return;
    close();
    if (typeof window.sf77PickTrack === 'function') {
      window.sf77PickTrack(track);
    } else if (typeof selectSearchResult === 'function') {
      selectSearchResult(track.id, track.title, track.artist);
    } else {
      const input = $('songUrl');
      if (input) input.value = track.id;
      if (typeof previewSong === 'function') previewSong();
    }
    syncButton();
  }
  function renderTracks(tracks) {
    const host=$('sf78InlineResults');
    host.replaceChildren();
    state.items=tracks;
    state.activeIndex=-1;
    for (let i=0; i<tracks.length; i++) {
      const track=tracks[i];
      const btn=makeNode('button','sf78-row'); btn.type='button'; btn.id=`sf78-result-${i}`;
      btn.setAttribute('role','option');btn.setAttribute('aria-selected','false');
      btn.setAttribute('aria-label',`Selecionar ${track.title} de ${track.artist}`);
      const img=makeNode('img','sf78-thumbnail');img.loading='lazy';img.alt='';
      img.src=`https://img.youtube.com/vi/${encodeURIComponent(track.id)}/mqdefault.jpg`;
      const detail=makeNode('span','sf78-detail');
      detail.append(makeNode('strong','',track.title),makeNode('small','',track.artist));
      btn.append(img,detail,makeNode('span','sf78-choose','Escolher'));
      btn.addEventListener('click',()=>choose(track));
      host.append(btn);
    }
    $('sf78Hint').textContent=`${tracks.length} ${tracks.length===1?'resultado':'resultados'} · selecione para adicionar aqui ou use a busca completa.`;
    position();
  }
  /* Na janela única de música, a busca ocupa a área de resultados da própria
     aba. Fora da janela, preserva a pesquisa flutuante legada. */
  function syncResultsHost(){
    const popup=$('sf78InlineSearch');
    if(!popup)return false;
    const sheet=$('sf76MusicSheet');
    const inline=$('sf76InlineResultsHost');
    const useInline=Boolean(sheet && !sheet.hidden && inline);
    if(useInline){
      if(popup.parentElement!==inline)inline.appendChild(popup);
      popup.classList.add('sf134-inline');
      popup.style.removeProperty('top');
      popup.style.removeProperty('left');
      popup.style.removeProperty('width');
      popup.style.removeProperty('max-height');
      popup.dataset.placement='inline';
    } else {
      popup.classList.remove('sf134-inline');
      if(popup.parentElement!==document.body)document.body.appendChild(popup);
    }
    return useInline;
  }

  function visualBounds() {
    const view=window.visualViewport;
    return view ? { top:view.offsetTop, bottom:view.offsetTop+view.height, width:view.width } : { top:0, bottom:window.innerHeight, width:window.innerWidth };
  }
  function position() {
    if (!state.open || !$('songUrl')) return;
    cancelAnimationFrame(frame);
    frame=requestAnimationFrame(()=>{
      if (!state.open) return;
      const popup=$('sf78InlineSearch'), input=$('songUrl');
      if (!popup || !input || !input.getClientRects().length) return;
      // A área interna é parte do fluxo normal, nunca calcula coordenadas
      // absolutas ou cobre o formulário e o botão de fechar.
      if(syncResultsHost())return;
      const rect=input.getBoundingClientRect();
      const v=visualBounds(), margin=10, gap=8;
      const width=Math.min(470,Math.max(240,Math.min(v.width-margin*2, Math.max(rect.width+100, 340))));
      popup.style.width=`${width}px`;
      popup.style.left=`${Math.max(margin,Math.min(rect.left,v.width-width-margin))}px`;
      const spaceAbove=rect.top-v.top-gap-margin;
      const spaceBelow=v.bottom-rect.bottom-gap-margin;
      const above=(spaceAbove>=165 || spaceAbove>=spaceBelow);
      const available=Math.max(125,above?spaceAbove:spaceBelow);
      popup.style.maxHeight=`${Math.min(395,available)}px`;
      const height=popup.getBoundingClientRect().height;
      const top=above?rect.top-gap-height:rect.bottom+gap;
      popup.style.top=`${Math.max(v.top+margin,Math.min(top,v.bottom-height-margin))}px`;
      popup.dataset.placement=above?'above':'below';
    });
  }
  function open() {
    if (!roomActive()) return false;
    build();
    state.open=true;
    syncResultsHost();
    $('sf78InlineSearch').hidden=false;
    $('songUrl')?.setAttribute('aria-expanded','true');
    $('searchResults')?.classList.remove('show');
    position();
    return true;
  }
  function search(value, immediate=false) {
    const query=String(value||'').trim();
    syncButton();
    if (!roomActive() || query.length<2 || isLink(query)) { close(); return false; }
    const sameQuery=state.open && query === state.query;
    if (sameQuery && !immediate) { position(); return true; }
    abort(); state.query=query; state.items=[]; state.activeIndex=-1;
    if (!open()) return false;
    const cached=sf150Get(query);
    if(cached){
      if(cached.length)renderTracks(cached);
      else renderMessage('Nenhuma música encontrada. Tente outra busca.','♫');
      return true;
    }
    renderMessage(`Procurando por “${query}”…`,'♫');
    const sequence=state.sequence;
    state.timer=setTimeout(async()=>{
      const controller=new AbortController(); state.controller=controller;
      const timeout=setTimeout(()=>controller.abort(),9000);
      try {
        const response=await fetch(`/api/search-youtube?q=${encodeURIComponent(query)}`,{credentials:'include',signal:controller.signal});
        if(!response.ok)throw new Error(`Erro HTTP ${response.status}`);
        const data=await response.json();
        if(sequence!==state.sequence || !state.open) return;
        const seen=new Set();
        const tracks=(Array.isArray(data?.items)?data.items:[])
          .filter(item=>validId(item?.id)&&!seen.has(item.id)&&(seen.add(item.id),true))
          .slice(0,maxRows)
          .map(item=>({id:item.id,title:String(item.title||'Música'),artist:String(item.artist||'Artista desconhecido')}));
        sf150Put(query,tracks);
        if (tracks.length) renderTracks(tracks);
        else renderMessage('Nenhuma música encontrada. Tente outra busca ou abra a busca completa.','♫');
      } catch(e) {
        if(sequence!==state.sequence || !state.open) return;
        renderMessage(e?.name==='AbortError'?'A busca demorou demais. Tente novamente.':'Não foi possível carregar as músicas. Tente novamente.','!');
      } finally {
        clearTimeout(timeout);
        if (sequence===state.sequence) state.controller=null;
      }
    },immediate?0:280);
    return true;
  }
  function openFull() {
    const query=String($('songUrl')?.value||state.query||'').trim();
    close();
    if(typeof window.sf77OpenSearch==='function') window.sf77OpenSearch(isLink(query)?'':query);
  }
  function init() {
    build();
    window.sf78SearchFromField=search;
    window.sf78CloseInline=close;
    window.sf78OpenFullSearch=openFull;
    const input=$('songUrl');
    if(input){
      input.setAttribute('role','combobox');
      input.setAttribute('aria-autocomplete','list');
      input.setAttribute('aria-haspopup','listbox');
      input.setAttribute('aria-controls','sf78InlineResults');
      input.setAttribute('aria-expanded','false');
      input.addEventListener('keydown',e=>{
        if(e.key==='Escape' && state.open) {e.preventDefault();e.stopImmediatePropagation();close();return;}
        if(!state.open || !['ArrowDown','ArrowUp','Enter'].includes(e.key)) return;
        e.preventDefault();e.stopImmediatePropagation();
        if(e.key==='ArrowDown' && state.items.length){state.activeIndex=(state.activeIndex+1)%state.items.length;updateActive();}
        else if(e.key==='ArrowUp' && state.items.length){state.activeIndex=state.activeIndex<=0?state.items.length-1:state.activeIndex-1;updateActive();}
        else if(e.key==='Enter' && state.items.length){choose(state.items[Math.max(state.activeIndex,0)]);}
      },true);
      input.addEventListener('focus',()=>{
        if(!state.open && input.value.trim().length>=2 && !isLink(input.value)) search(input.value);
      });
    }
    $('sf78FullSearchBtn')?.addEventListener('click',openFull);
    $('addBtn')?.addEventListener('click', e=>{
      const text=$('songUrl')?.value||'';
      if(text.trim().length>=2 && !isLink(text) && roomActive()) {
        e.preventDefault();e.stopImmediatePropagation();
        search(text,true);
      }
    },true);
    document.addEventListener('pointerdown',e=>{
      if(!state.open)return;
      if(e.target.closest('#sf78InlineSearch,#songUrl,#addBtn,#sf78FullSearchBtn'))return;
      close();
    },true);
    document.addEventListener('scroll',()=>{if(state.open) position();},true);
    window.addEventListener('resize',()=>{if(state.open)position();},{passive:true});
    window.visualViewport?.addEventListener('resize',()=>{if(state.open)position();},{passive:true});
    window.visualViewport?.addEventListener('scroll',()=>{if(state.open)position();},{passive:true});
    new MutationObserver(()=>{if(state.open&&!roomActive())close();})
      .observe($('screen-room')||document.body,{attributes:true,attributeFilter:['class']});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
