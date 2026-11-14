/* SonoraFan 38.0 — Bundle visual dos módulos 32–35. */

/* ===== v32 : sonorafan-indie-32.js ===== */
/* SonoraFan 32 · pôsteres e busca do lobby (sem API, sem dados fictícios). */
(() => {
 'use strict';
 const styles=[
   {re:/indie|alternativ|lo.?fi|folk|chill|shoegaze|dream pop/i, art:'indie'},
   {re:/rock|metal|punk|grunge|guitarra|hardcore/i, art:'rock'},
   {re:/mpb|brasil|pagode|samba|sertanejo|forro|forró|bossa/i, art:'brasil'},
   {re:/eletr|techno|house|dj|beat|funk|rap|hip.?hop|trap|dance/i, art:'electro'}
 ];
 let lastCards = 0;
 const field=()=>document.getElementById('sf10RoomQuery');
 const refreshChips=()=>{
   const q=(field()?.value||'').trim().toLocaleLowerCase('pt-BR');
   document.querySelectorAll('#screen-lobby [data-sf32-genre]').forEach(el=>{
     el.setAttribute('aria-pressed',String(q===el.dataset.sf32Genre));
   });
   const clear=document.getElementById('sf32SearchClear');if(clear) clear.hidden=!q;
 };
 function decorate(){
   const cards=document.querySelectorAll('#screen-lobby #roomGrid .room-card');
   if(cards.length===0)return;
   cards.forEach((card,index)=>{
     if(card.dataset.sf32Art)return;
     const text=(card.textContent||'');
     const pick=styles.find(x=>x.re.test(text))?.art || ['indie','rock','brasil','electro'][index%4];
     card.style.setProperty('--sf32-poster',`url('/art-32/poster-${pick}.svg')`);
     card.dataset.sf32Art=pick;
   });
   lastCards=cards.length;
 }
 function setup(){
   const input=field(),clear=document.getElementById('sf32SearchClear');
   if(!input)return;
   input.addEventListener('input',refreshChips);
   document.querySelectorAll('#screen-lobby [data-sf32-genre]').forEach(btn=>btn.addEventListener('click',()=>{
     input.value=input.value.trim().toLocaleLowerCase('pt-BR')===btn.dataset.sf32Genre?'':btn.dataset.sf32Genre;
     input.dispatchEvent(new Event('input',{bubbles:true}));
     refreshChips();input.focus({preventScroll:true});
   }));
   clear?.addEventListener('click',()=>{input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));refreshChips();input.focus({preventScroll:true})});
   refreshChips();
   const grid=document.getElementById('roomGrid');
   if(grid && typeof MutationObserver!=='undefined'){
     const observer=new MutationObserver(()=>decorate());
     observer.observe(grid,{childList:true});
     decorate();
   }
 }
 document.addEventListener('DOMContentLoaded',setup);
})();

;

/* ===== v33 : sonorafan-reference-33.js ===== */
/* SonoraFan 33 — imagens da referência, sempre com dados reais da plataforma. */
(()=>{
 'use strict';
 const genres=[
   {re:/indie|alternativ|lo.?fi|folk|chill|shoegaze/i,art:'indie'},
   {re:/rock|metal|punk|grunge|guitarra|hardcore/i,art:'rock'},
   {re:/mpb|brasil|pagode|samba|sertanejo|forro|forró|bossa/i,art:'brasil'},
   {re:/eletr|techno|house|beats|funk|rap|hip.?hop|trap|dance|dj/i,art:'electro'}
 ];
 const posters=['indie','rock','brasil','electro'];
 function decorateCards(){
   document.querySelectorAll('#screen-lobby #roomGrid .room-card').forEach((card,i)=>{
     // Preserve room data and existing join handlers. Only decorate the real card.
     if(card.dataset.sf33Poster)return;
     const text=card.textContent||'';
     const art=genres.find(g=>g.re.test(text))?.art||posters[i%posters.length];
     card.style.setProperty('--sf33-poster',`url('/art-33/poster-${art}.webp')`);
     card.dataset.sf33Poster=art;
   });
 }
 function updateEmptyStage(){
   const emptyArt=document.getElementById('sf33EmptyPlayerArt');
   const title=document.getElementById('trackTitle');
   if(!emptyArt||!title)return;
   // Rely on display text already produced by the existing player code;
   // no interference with timing, YouTube API or queue events.
   const empty=/^(fila vazia|nenhuma música|nenhuma musica|sem música|sem musica|-)$/i.test(title.textContent.trim());
   emptyArt.hidden=!empty;
 }
 function init(){
   const grid=document.getElementById('roomGrid');
   if(grid){new MutationObserver(decorateCards).observe(grid,{childList:true});decorateCards()}
   const title=document.getElementById('trackTitle');
   if(title){new MutationObserver(updateEmptyStage).observe(title,{childList:true,characterData:true,subtree:true});updateEmptyStage()}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

;

/* ===== v34 : sonorafan-stage-34.js ===== */
/* SonoraFan 34 · atalhos mobile e decoração não invasiva.
   Não modifica as regras da fila, autenticação nem controle do player. */
(()=>{
 'use strict';
 window.sf34LobbyJump=function(which){
   const scroll=document.querySelector('#screen-lobby .sf28-lobby-content');
   if(!scroll)return;
   const target=which==='rooms'?document.getElementById('roomGrid'):document.querySelector('#screen-lobby .sf33-banner');
   if(which==='rooms'&&target){
     const top=target.getBoundingClientRect().top-scroll.getBoundingClientRect().top+scroll.scrollTop-10;
     scroll.scrollTo({top:Math.max(0,top),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
   }else scroll.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 };
 window.sf34FindSong=function(){
   const input=document.getElementById('songUrl');
   if(!input)return;
   if(typeof setTab==='function')setTab('queue');
   requestAnimationFrame(()=>{
     const room=document.querySelector('#screen-room .room-layout');
     const box=document.getElementById('sf10RequestCard');
     if(room&&box){
       const pos=box.getBoundingClientRect().top-room.getBoundingClientRect().top+room.scrollTop-12;
       room.scrollTo({top:Math.max(0,pos),behavior:'smooth'});
     }
     setTimeout(()=>input.focus({preventScroll:true}),160);
   });
 };
})();

;

/* ===== v35 : sonorafan-refino-35.js ===== */
/* SonoraFan 35 — pequenos refinamentos de UX, sem alterar autenticação,
 * sincronização da sala, fila, YouTube ou lógica de modais. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 function init(){
   const create=$('createRoomModal');
   const name=$('newRoomName');
   // Abrir criação pelo mouse/teclado posiciona o foco no nome;
   // não interfere no wizard ao trocar de etapa.
   if(create&&name){
     let active=create.classList.contains('active');
     const watch=new MutationObserver(()=>{
       const now=create.classList.contains('active');
       if(now&&!active){
         requestAnimationFrame(()=>{if(create.classList.contains('active')&&!name.closest('[hidden]'))name.focus({preventScroll:true})});
       }
       active=now;
     });
     watch.observe(create,{attributes:true,attributeFilter:['class']});
   }
   // Atalho / para busca atual; não captura teclas quando usuário já digita
   // nem impede qualquer atalho nativo do YouTube ou formulário.
   document.addEventListener('keydown',e=>{
     if(e.key!=='/'||e.ctrlKey||e.metaKey||e.altKey||e.repeat)return;
     const target=e.target;
     if(target instanceof HTMLElement && (target.isContentEditable||target.closest('input,textarea,select,[contenteditable="true"],[role="textbox"]')))return;
     if(document.querySelector('.modal-overlay.active,.sf29-tour[aria-hidden="false"]'))return;
     const room=$('screen-room');const lobby=$('screen-lobby');
     if(room?.classList.contains('active')){
       const input=$('songUrl');
       if(!input)return;
       e.preventDefault();
       if(typeof window.sf34FindSong==='function')window.sf34FindSong();else input.focus();
     } else if(lobby?.classList.contains('active')){
       const input=$('sf10RoomQuery');if(!input)return;
       e.preventDefault();input.focus({preventScroll:true});input.select();
     }
   });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

;
