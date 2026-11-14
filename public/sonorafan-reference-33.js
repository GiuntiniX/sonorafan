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
