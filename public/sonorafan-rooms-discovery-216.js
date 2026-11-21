/* SonoraFan 216 · página de descoberta de salas, ligada às salas reais e aos favoritos da conta. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const valid=v=>typeof v==='string'&&v.length>0&&v.length<=140&&!/[\/\\\u0000-\u001f\u007f]/.test(v); // inclui identificadores antigos com acentos
const fmt=v=>Math.max(0,Number(v)||0).toLocaleString('pt-BR');
const state={rooms:[],bookmarks:new Set(),mode:'discover',query:'',style:'',activity:'all',sort:'popular',view:'grid',limit:12,ready:false,loading:false,lastFetch:0,lastFavorites:0,favoritesError:''};
const styles=[['','Todos'],['kpop','K-pop'],['pop','Pop'],['jpop','J-pop'],['trap','Trap'],['lofi','Lo-fi'],['indie','Indie'],['rock','Rock'],['mpb','MPB'],['eletronica','Eletrônica'],['funk','Funk'],['rap','Rap'],['sertanejo','Sertanejo'],['pagode','Pagode'],['reggae','Reggae'],['forro','Forró'],['jazz','Jazz'],['metal','Metal'],['samba','Samba']];
function fallback(r){const theme=String(r.roomTheme||'');const set={geral:'/themes/final-172/indie.webp',indie:'/themes/final-164/indie.webp',kpop:'/themes/festival-214/kpop.svg',bts:'/themes/festival-214/bts.svg',jpop:'/themes/festival-214/jpop.svg',trap:'/themes/festival-214/trap.svg',lofi:'/themes/festival-214/lofi.svg',rock:'/themes/final-164/rock.webp',pop:'/themes/final-164/pop.webp',reggae:'/themes/final-170/reggae.webp',jazz:'/themes/final-170/jazz.webp'};return set[theme]||'/themes/final-172/indie.webp';}
function cover(r){
const custom=typeof r.coverUrl==='string'&&/^https:\/\//i.test(r.coverUrl)?r.coverUrl:'';
const id=r.currentTrack?.id,video=typeof id==='string'&&/^[a-z0-9_-]{11}$/i.test(id)?'https://img.youtube.com/vi/'+id+'/hqdefault.jpg':'';
return {src:custom||video||fallback(r),fallback:video||fallback(r),art:fallback(r),custom:!!custom};
}
function crop(r){return {x:Math.min(100,Math.max(0,Number(r.coverX??50)||0)),y:Math.min(100,Math.max(0,Number(r.coverY??50)||0)),zoom:Math.min(2,Math.max(1,Number(r.coverZoom??1)||1))};}
function pic(r,extra=''){const c=cover(r),p=crop(r);return '<div class="sf216-cover '+extra+'"><img src="'+esc(c.src)+'" data-fallback="'+esc(c.fallback)+'" data-art="'+esc(c.art)+'" alt="" loading="lazy" decoding="async" style="object-position:'+p.x+'% '+p.y+'%;transform-origin:'+p.x+'% '+p.y+'%;transform:scale('+(c.custom?p.zoom:1)+')"></div>';}
function genre(r){const found=styles.find(x=>x[0]===r.genre);return found?found[1]:(r.genre||'Estilo não informado');}
function roomTimestamp(r){const id=String(r.slug||'').split('-').pop()||'';const n=/^[0-9a-z]{7,12}$/i.test(id)?parseInt(id,36):0;return n>1577836800000&&n<Date.now()+86400000?n:0;}
function all(){let list=state.rooms.slice();if(state.mode==='mine'||state.mode==='manage')list=list.filter(r=>r.isMine);else if(state.mode==='favorites')list=list.filter(r=>state.bookmarks.has(r.slug));if(state.style)list=list.filter(r=>r.genre===state.style);if(state.activity==='live')list=list.filter(r=>r.isPlaying);if(state.activity==='ready')list=list.filter(r=>!r.isPlaying);if(state.query){const q=norm(state.query);list=list.filter(r=>norm([r.name,r.description,r.genre,r.currentTrack?.title,r.currentTrack?.artist].join(' ')).includes(q));}
if(state.sort==='recent')list.sort((a,b)=>roomTimestamp(b)-roomTimestamp(a));else if(state.sort==='az')list.sort((a,b)=>String(a.name).localeCompare(String(b.name),'pt-BR'));else if(state.sort==='live')list.sort((a,b)=>Number(!!b.isPlaying)-Number(!!a.isPlaying)||Number(b.listenerCount||0)-Number(a.listenerCount||0));else list.sort((a,b)=>Number(b.listenerCount||0)-Number(a.listenerCount||0)||Number(!!b.isPlaying)-Number(!!a.isPlaying));return list;}
function heart(r){return state.bookmarks.has(r.slug)?'♥':'♡';}
function card(r,featured=false){const saved=state.bookmarks.has(r.slug),now=r.currentTrack?.title?'♫ '+r.currentTrack.title:'Sala pronta para receber músicas';
return '<article class="sf216-card'+(featured?' sf216-featured':'')+'">'+pic(r)+
'<div class="sf216-card-body"><div class="sf216-tags">'+(r.isPlaying?'<span class="sf216-live">● Ao vivo</span>':'<span>♫ Sala aberta</span>')+(featured?'<span>✦ Em destaque</span>':'')+'</div>'+
'<h3>'+esc(r.name||'Sala musical')+'</h3><p class="sf216-meta">'+esc(genre(r))+' · '+fmt(r.listenerCount)+' '+(Number(r.listenerCount)===1?'ouvinte':'ouvintes')+'</p>'+
'<p class="sf216-track" title="'+esc(now)+'">'+esc(now)+'</p>'+
'<div class="sf216-card-actions"><button type="button" data-sf216-fav="'+esc(r.slug)+'" aria-pressed="'+saved+'" aria-label="'+(saved?'Remover sala dos favoritos':'Favoritar sala')+'" title="'+(saved?'Desfavoritar':'Favoritar')+'">'+heart(r)+'</button>'+
'<button class="sf216-join" type="button" '+(state.mode==='manage'&&r.isMine?'data-sf216-manage':'data-sf216-join')+'="'+esc(r.slug)+'">'+(state.mode==='manage'&&r.isMine?'⚙ Gerenciar':'▶ Entrar')+'</button></div></div></article>';}
function renderProfile(){const name=String($('userDisplayName')?.textContent||'Sua experiência').trim();const label=$('sf216ProfileName');if(label)label.textContent=name==='Usuário'?'Sua experiência':name;const avatar=$('userAvatar'),dest=$('sf216Avatar');if(dest&&avatar){const img=avatar.querySelector('img');dest.replaceChildren();if(img?.src){const copy=document.createElement('img');copy.src=img.src;copy.alt='';dest.append(copy);}else dest.textContent=(name[0]||'♫').toUpperCase();}
$('sf216CountFavorites').textContent=fmt(state.bookmarks.size);$('sf216CountMine').textContent=fmt(state.rooms.filter(r=>r.isMine).length);}
function renderSideFavorites(){
 const host=$('sf216SideFavorites');if(!host)return;
 const rooms=state.rooms.filter(r=>state.bookmarks.has(r.slug)).slice(0,3);
 host.innerHTML=rooms.map(r=>'<button type="button" data-sf216-join="'+esc(r.slug)+'">'+pic(r)+'<span><strong>'+esc(r.name)+'</strong><small>'+esc(genre(r))+'</small></span><span>▶</span></button>').join('')||'<p class="sf216-side-empty">Favorite salas para vê-las aqui.</p>';
 attachImageFallback(host);
}
function renderHero(list){
 const hero=$('sf216Hero');if(!hero)return;
 const eligible=state.mode==='discover'&&!state.query&&!state.style&&state.activity==='all'&&list.length;
 hero.hidden=!eligible;if(!eligible)return;
 const r=list[0],saved=state.bookmarks.has(r.slug);
 hero.innerHTML='<div class="sf216-hero-art">'+pic(r)+'</div><div class="sf216-hero-content"><span class="sf216-hero-kicker">♛ SALA EM DESTAQUE</span><h2>'+esc(r.name)+'</h2><p>'+esc(genre(r))+' · '+fmt(r.listenerCount)+' ouvintes</p><small>'+esc(r.currentTrack?.title?'♫ Tocando agora: '+r.currentTrack.title:'Entre na sala e escolha sua próxima música')+'</small><div class="sf216-hero-actions"><button type="button" data-sf216-join="'+esc(r.slug)+'">▶ Entrar na sala</button><button type="button" data-sf216-fav="'+esc(r.slug)+'" aria-pressed="'+saved+'" aria-label="'+(saved?'Remover dos favoritos':'Favoritar sala')+'">'+(saved?'♥':'♡')+'</button></div></div>';
 attachImageFallback(hero);
}
function renderFilters(){const holder=$('sf216Styles');if(!holder)return;holder.innerHTML=styles.map(([id,label])=>'<button type="button" data-sf216-style="'+esc(id)+'" aria-pressed="'+(state.style===id)+'" class="'+(state.style===id?'is-active':'')+'">'+esc(label)+'</button>').join('');
document.querySelectorAll('[data-sf216-mode]').forEach(el=>{const yes=el.dataset.sf216Mode===state.mode;el.classList.toggle('is-active',yes);el.setAttribute('aria-pressed',String(yes));});
$('sf216Search').value=state.query;$('sf216Activity').value=state.activity;$('sf216Sort').value=state.sort;
const heading=$('sf216ResultsTitle');if(heading)heading.textContent=state.mode==='mine'?'Minhas salas':state.mode==='manage'?'Gerenciar salas':state.mode==='favorites'?'Salas favoritas':'Descobrir salas';
}
function render(){if(!$('sf216Explorer'))return;renderFilters();renderProfile();renderSideFavorites();const list=all(),host=$('sf216Cards'),count=$('sf216ResultCount');if(count)count.textContent=list.length+' '+(list.length===1?'sala encontrada':'salas encontradas');
const status=$('sf216Status');if(status){status.textContent=state.loading?'Atualizando salas…':state.favoritesError||'';status.hidden=!status.textContent;}
if(!host)return;
renderHero(list);
const visible=list.slice(0,state.limit);host.classList.toggle('sf216-list-mode',state.view==='list');
host.innerHTML=visible.length?visible.map(r=>card(r,false)).join(''):'<div class="sf216-empty"><strong>Nenhuma sala encontrada</strong><p>Experimente buscar outro nome ou limpar os filtros.</p><button type="button" data-sf216-clear>Limpar filtros</button></div>';
$('sf216More').hidden=list.length<=state.limit;
attachImageFallback(host);}
function attachImageFallback(host){host.querySelectorAll('img[data-fallback]').forEach(img=>img.addEventListener('error',()=>{if(!img.dataset.tried){img.dataset.tried='1';img.src=img.dataset.fallback;return;}if(!img.dataset.triedArt){img.dataset.triedArt='1';img.src=img.dataset.art;}}));}
async function fetchRooms(force=false){if(state.loading||!force&&Date.now()-state.lastFetch<12000)return;state.loading=true;render();try{const response=await fetch('/api/rooms',{credentials:'same-origin',cache:'no-store'});if(!response.ok)throw Error('Não foi possível atualizar as salas.');const list=await response.json();if(Array.isArray(list))state.rooms=list;state.lastFetch=Date.now();}catch(e){state.favoritesError=e.message;}finally{state.loading=false;render();}}
async function fetchBookmarks(force=false){if(!force&&Date.now()-state.lastFavorites<20000)return;try{const res=await fetch('/api/room-bookmarks',{credentials:'same-origin',cache:'no-store'});if(res.status===401){state.bookmarks.clear();state.favoritesError='';return;}if(!res.ok)throw Error('Não foi possível carregar suas salas favoritas.');const body=await res.json();state.bookmarks=new Set((body.slugs||[]).filter(valid));state.lastFavorites=Date.now();state.favoritesError='';}catch(e){state.favoritesError=e.message;}finally{render();}}
async function toggleFavorite(slug){if(!valid(slug))return;const want=!state.bookmarks.has(slug),old=new Set(state.bookmarks);
if(want)state.bookmarks.add(slug);else state.bookmarks.delete(slug);render();
try{const res=await fetch('/api/room-bookmarks',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug,favorite:want})});const data=await res.json();if(!res.ok)throw Error(data.error||'Não foi possível salvar o favorito.');state.bookmarks=new Set((data.slugs||[]).filter(valid));render();}
catch(e){state.bookmarks=old;render();if(typeof window.toast==='function')window.toast(e.message,'error');else alert(e.message);}}
function enterRoom(slug,manage=false){
 if(!valid(slug)){showError('Identificador de sala inválido.');return;}
 const join=window.joinRoom;
 if(typeof join!=='function'){showError('Não foi possível iniciar a entrada. Atualize a página e tente novamente.');return;}
 if(!state.rooms.some(room=>room.slug===slug)){showError('Esta sala não está mais disponível. Atualize a lista.');fetchRooms(true);return;}
 window.sf216ManageRoomAfterJoin=manage?slug:null;
 close();
 try{join(slug);}catch(error){window.sf216ManageRoomAfterJoin=null;showError('Erro ao entrar na sala. Tente novamente.');console.error('sf216 enterRoom:',error);open(state.mode);}
}
function showError(message){const node=$('sf216Status');if(node){node.textContent=message;node.hidden=false;}else if(typeof window.toast==='function')window.toast(message,'error');}
function close(){const page=$('sf216Explorer');if(!page)return;page.hidden=true;$('screen-lobby')?.classList.remove('sf216-explore-mode');document.querySelectorAll('[data-sf125-go]').forEach(el=>{el.classList.toggle('is-active',el.dataset.sf125Go==='lobby');});window.sf207SetActive?.('lobby');}
function open(mode='discover'){const page=$('sf216Explorer');if(!page)return;if(!$('screen-lobby')?.classList.contains('active')&&typeof window.showScreen==='function')window.showScreen('lobby');window.sf207LeavePage?.();window.sf200CloseAgenda?.();
state.mode=['discover','mine','favorites','manage'].includes(mode)?mode:'discover';state.limit=12;page.hidden=false;$('screen-lobby').classList.add('sf216-explore-mode');document.querySelectorAll('[data-sf125-go]').forEach(el=>{el.classList.toggle('is-active',el.dataset.sf125Go==='rooms');});
window.sf207SetActive?.('rooms');render();fetchRooms(true);fetchBookmarks(true);page.scrollTop=0;}
function clear(){state.query='';state.style='';state.activity='all';state.sort='popular';state.limit=12;render();}
function onClick(e){const node=e.target.closest('[data-sf216-join],[data-sf216-fav],[data-sf216-mode],[data-sf216-style],[data-sf216-create],[data-sf216-close],[data-sf216-clear],[data-sf216-more],[data-sf216-view],[data-sf216-profile],[data-sf216-manage],[data-sf216-community]');if(!node)return;
if(node.hasAttribute('data-sf216-manage')){const slug=node.dataset.sf216Manage;if(valid(slug)){enterRoom(slug,true);
  // Aguardar a confirmação da entrada; não abrir um editor vazio.
  let tries=0;const check=()=>{
    if(window.sf216ManageRoomAfterJoin!==slug)return;
    const room=document.getElementById('screen-room'),title=document.getElementById('roomTitle');
    const matching=state.rooms.find(r=>r.slug===slug);
    if(room?.classList.contains('active')&&matching&&title?.textContent?.includes(matching.name)){
      window.sf216ManageRoomAfterJoin=null;
      window.openRoomCfg?.();
    }else if(++tries<35)setTimeout(check,350);
    else window.sf216ManageRoomAfterJoin=null;
  };setTimeout(check,350);}return;}
if(node.hasAttribute('data-sf216-join')){enterRoom(node.dataset.sf216Join);return;}
if(node.hasAttribute('data-sf216-fav'))return void toggleFavorite(node.dataset.sf216Fav);
if(node.hasAttribute('data-sf216-mode')){state.mode=node.dataset.sf216Mode;state.limit=12;render();return;}
if(node.hasAttribute('data-sf216-style')){state.style=node.dataset.sf216Style;state.limit=12;render();return;}
if(node.hasAttribute('data-sf216-create'))return window.showCreateRoom?.();
if(node.hasAttribute('data-sf216-profile')){close();return window.sf125Navigate?.('profile');}
if(node.hasAttribute('data-sf216-community')){close();return window.sf125Navigate?.('clubs');}
if(node.hasAttribute('data-sf216-close'))return close();
if(node.hasAttribute('data-sf216-clear'))return clear();
if(node.hasAttribute('data-sf216-more')){state.limit+=12;render();return;}
if(node.hasAttribute('data-sf216-view')){state.view=state.view==='grid'?'list':'grid';render();return;}}
function build(){if($('sf216Explorer'))return;const main=document.querySelector('#screen-lobby .sf28-lobby-main');if(!main)return;
const page=document.createElement('section');page.id='sf216Explorer';page.className='sf216-page';page.hidden=true;page.setAttribute('aria-label','Explorar salas');
page.innerHTML='<header class="sf216-topbar"><img src="/brand-144/sonorafan-logo.svg" alt="SonoraFan" width="1260" height="426"><nav aria-label="Navegação de salas"><button type="button" data-sf216-close>⌂ Início</button><button type="button" class="is-current">◈ Salas</button><button type="button" data-sf216-community>♧ Fanclub</button><button type="button" data-sf216-profile>◉ Perfil</button></nav></header><div class="sf216-shell"><aside class="sf216-aside" aria-label="Minha área de salas">'+
'<div class="sf216-profile"><div class="sf216-avatar" id="sf216Avatar">♫</div><strong id="sf216ProfileName">Sua experiência</strong><small>Minha comunidade SonoraFan</small><div class="sf216-stats"><span><b id="sf216CountMine">0</b>salas criadas</span><span><b id="sf216CountFavorites">0</b>favoritas</span></div></div>'+
'<section class="sf216-favorite-panel"><div class="sf216-panel-heading"><strong>♡ Favoritas</strong><button type="button" data-sf216-mode="favorites">Ver todas ›</button></div><div id="sf216SideFavorites" class="sf216-side-favorites"></div></section>'+
'<div class="sf216-side-nav"><button type="button" data-sf216-mode="discover">◈ Descobrir salas</button><button type="button" data-sf216-mode="mine">♬ Minhas salas</button><button type="button" data-sf216-mode="manage">⚙ Gerenciar salas</button><button type="button" data-sf216-mode="favorites">♡ Favoritas</button><button type="button" data-sf216-profile>◉ Meu perfil</button><button type="button" data-sf216-create>＋ Criar sala</button><button type="button" data-sf216-close>← Voltar ao início</button></div></aside>'+
'<main class="sf216-content"><div class="sf216-head"><div class="sf216-heading"><span class="sf216-kicker">SONORAFAN · COMUNIDADE</span><h1>▷ Minhas salas e descoberta</h1><p>Encontre uma sala, conheça novas músicas e compartilhe sua vibe.</p></div><button class="sf216-create" type="button" data-sf216-create>＋ Criar sala</button></div>'+
'<div class="sf216-tabs" role="group" aria-label="Área de salas"><button type="button" data-sf216-mode="discover">◉ Descobrir salas</button><button type="button" data-sf216-mode="mine">▤ Minhas salas</button><button type="button" data-sf216-mode="manage">⚙ Gerenciar salas</button></div>'+
'<div class="sf216-search-row"><label class="sf216-search">⌕ <input id="sf216Search" type="search" maxlength="90" autocomplete="off" placeholder="Buscar por nome da sala, estilo, música ou artista…" aria-label="Buscar salas"></label><select id="sf216Activity" aria-label="Filtrar atividade"><option value="all">Qualquer atividade</option><option value="live">Tocando agora</option><option value="ready">Salas abertas</option></select><select id="sf216Sort" aria-label="Ordenação"><option value="popular">Mais populares</option><option value="live">Ao vivo primeiro</option><option value="recent">Mais recentes</option><option value="az">Nome (A–Z)</option></select></div>'+
'<div class="sf216-style-label">Estilos musicais <span>Filtre pelo gênero da sala</span></div><div class="sf216-styles" id="sf216Styles"></div>'+
'<div id="sf216Hero" class="sf216-hero" hidden></div><div class="sf216-results-head"><div><h2 id="sf216ResultsTitle">Descobrir salas</h2><small id="sf216ResultCount" aria-live="polite"></small></div><div><button type="button" class="sf216-view" data-sf216-view aria-label="Alternar visualização">▦</button></div></div><p id="sf216Status" class="sf216-status" hidden></p><div class="sf216-cards" id="sf216Cards"></div><button id="sf216More" class="sf216-more" type="button" data-sf216-more hidden>Carregar mais salas ↓</button></main></div>';
main.append(page);
page.addEventListener('click',onClick);
$('sf216Search').addEventListener('input',e=>{state.query=e.target.value.trim().slice(0,90);state.limit=12;render();});
$('sf216Activity').addEventListener('change',e=>{state.activity=e.target.value;state.limit=12;render();});
$('sf216Sort').addEventListener('change',e=>{state.sort=e.target.value;render();});
render();
}
function init(){build();if(!$('sf216Explorer'))return;
const orig=window.sf125Navigate;
window.sf125Navigate=function(area){if(area==='rooms'){open();return;}if(area==='lobby'){close();if(typeof orig==='function')return orig.apply(this,arguments);return;}if(typeof orig==='function'){close();return orig.apply(this,arguments);}};
document.addEventListener('click',e=>{const el=e.target.closest('[data-sf107="scroll"],[data-sf107="more"]');if(el&&$('screen-lobby')?.classList.contains('active')){e.preventDefault();e.stopImmediatePropagation();open();}},true);
window.sf216OpenRooms=open;window.sf216CloseRooms=close;
const client=typeof window.socket!=='undefined'?window.socket:null;
client?.on?.('roomState',data=>{
  if(window.sf216ManageRoomAfterJoin&&data?.slug===window.sf216ManageRoomAfterJoin){
    window.sf216ManageRoomAfterJoin=null;
    setTimeout(()=>{if($('screen-room')?.classList.contains('active'))window.openRoomCfg?.();},350);
  }
});
client?.on?.('roomsUpdate',list=>{if(Array.isArray(list)&&$('sf216Explorer')&&!$('sf216Explorer').hidden){state.rooms=list;render();}});
setInterval(()=>{if(!$('sf216Explorer')?.hidden&&$('screen-lobby')?.classList.contains('active')&&!document.hidden)fetchRooms();},15000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
