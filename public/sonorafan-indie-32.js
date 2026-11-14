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
