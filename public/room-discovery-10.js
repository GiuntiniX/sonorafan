/* SonoraFan 10 — descoberta premium + fluxo de criação; não altera as regras do servidor. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
let rooms=[],filter='all',query='';
const favKey='sf10.favoriteRooms.v1';
const getFav=()=>{try{const v=JSON.parse(localStorage.getItem(favKey)||'[]');return Array.isArray(v)?v:[]}catch{return []}};
const setFav=arr=>{try{localStorage.setItem(favKey,JSON.stringify(arr))}catch{}};
function applyRoomFilters(){
 const grid=$('roomGrid');if(!grid)return;
 const fav=new Set(getFav());let shown=0;
 grid.querySelectorAll('.sf10-empty-filter').forEach(n=>n.remove());
 for(const card of grid.querySelectorAll('.room-card')){
  const slug=card.dataset.sf10Slug||'';const item=rooms.find(r=>r.slug===slug)||{};
  const hay=[item.name,item.description,item.emoji,item.currentTrack?.title,item.currentTrack?.artist].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR');
  const good=(!query||hay.includes(query))&&(filter==='all'||filter==='live'&&item.isPlaying||filter==='favorites'&&fav.has(slug)||filter==='collab'&&item.addMode!=='owner');
  card.hidden=!good;card.style.display=good?'':'none';if(good)shown++;
  const button=card.querySelector('.sf10-favorite-room');if(button){button.setAttribute('aria-pressed',String(fav.has(slug)));button.textContent=fav.has(slug)?'♥':'♡';button.title=fav.has(slug)?'Remover das minhas salas':'Salvar em minhas salas'}
 }
 if(!shown&&rooms.length){const e=document.createElement('div');e.className='sf10-empty-filter';e.textContent='Nenhuma sala encontrada para este filtro. Experimente outra busca.';grid.append(e)}
 const count=$('sf10RoomsCount');if(count)count.textContent=`${shown} ${shown===1?'sala encontrada':'salas encontradas'}`;
 const head=$('sf10RoomsHeading');if(head)head.textContent=filter==='favorites'?'Minhas salas favoritas':filter==='live'?'Acontecendo agora':filter==='collab'?'Salas colaborativas':'Explore as salas';
}
window.sf10DecorateRooms=function(data){
 rooms=Array.isArray(data)?data:[];
 const cards=[...$('roomGrid')?.querySelectorAll('.room-card')||[]];
 cards.forEach((card,i)=>{
  const item=rooms[i];if(!item)return;card.dataset.sf10Slug=item.slug;
  if(!item.currentTrack?.id)card.classList.add('sf10-no-art');
  const body=card.querySelector('.room-card-body');
  if(body){const tag=document.createElement('div');tag.className='sf10-card-type';tag.textContent=item.isPrivate?'🔒 Sala privada':item.addMode==='owner'?'♫ Playlist do anfitrião':'♫ Playlist colaborativa';body.insertBefore(tag,body.firstChild);
   const enter=document.createElement('div');enter.className='sf10-card-enter';enter.textContent='Entrar na sala  ↗';body.append(enter)}
  const fav=document.createElement('button');fav.type='button';fav.className='sf10-favorite-room';fav.setAttribute('aria-label','Salvar sala nos favoritos');fav.addEventListener('click',e=>{e.stopPropagation();const chosen=new Set(getFav());if(chosen.has(item.slug))chosen.delete(item.slug);else chosen.add(item.slug);setFav([...chosen]);applyRoomFilters()});card.append(fav);
 });
 applyRoomFilters();
};
const roomQuery=$('sf10RoomQuery');roomQuery?.addEventListener('input',e=>{query=String(e.target.value||'').trim().toLocaleLowerCase('pt-BR');applyRoomFilters()});
document.querySelectorAll('[data-sf10-filter]').forEach(btn=>btn.addEventListener('click',()=>{filter=btn.dataset.sf10Filter;document.querySelectorAll('[data-sf10-filter]').forEach(b=>{b.classList.toggle('on',b===btn);b.setAttribute('aria-pressed',String(b===btn))});applyRoomFilters()}));
window.sf10OpenEvents=()=>{window.sf5OpenCommunity?.();setTimeout(()=>document.querySelector('[data-sf-tab="events"]')?.click(),0)};
window.sf10FocusSong=()=>{
 const card=$('sf10RequestCard'),input=$('songUrl');if(!card||!input)return;
 if(window.innerWidth<=1024){if(typeof setTab==='function')setTab('player');const player=document.querySelector('#screen-room .player-column');if(player && card.parentElement!==player)player.append(card)}
 input.scrollIntoView({behavior:'smooth',block:'center'});input.focus({preventScroll:true});
};
// On mobile, move composer into the player tab so it isn't stranded in a hidden grid row.
const composer=$('sf10RequestCard'),home=composer?.parentElement;
function placeComposer(){if(!composer||!home)return;const target=window.innerWidth<=1024?document.querySelector('#screen-room .player-column'):home;if(target&&composer.parentElement!==target)target.append(composer)}
window.addEventListener('resize',placeComposer);placeComposer();
const modal=$('createRoomModal');
function step(n){
 if(!modal)return;
 modal.dataset.sf10Step=String(n);
 const back=modal.querySelector('.sf10-back'),next=modal.querySelector('.sf10-next'),submit=modal.querySelector('.sf10-submit');
 if(back)back.hidden=n!==2;
 if(next)next.hidden=n!==1;
 if(submit)submit.hidden=n!==2;
 modal.querySelectorAll('[data-sf10-step-mark]').forEach(mark=>{
   const current=mark.dataset.sf10StepMark===String(n);
   if(current)mark.setAttribute('aria-current','step');else mark.removeAttribute('aria-current');
 });
 const scroll=modal.querySelector('#sf130CreateScroll');
 if(scroll)scroll.scrollTop=0; // mobile e desktop começam a nova etapa pelo topo
}
window.sf10WizardReset=()=>step(1);
window.sf10WizardNext=()=>{
 const name=$('newRoomName');
 if(!name?.value.trim()){name?.focus();if(typeof toast==='function')toast('Dê um nome para sua sala.','error');return}
 const genre=modal?.querySelector('input[name="sf109RoomGenre"]:checked');
 const error=$('sf109GenreError');
 if(!genre){
   if(error)error.hidden=false;
   $('sf109GenrePicker')?.classList.add('sf109-invalid');
   modal?.querySelector('input[name="sf109RoomGenre"]')?.focus();
   if(typeof toast==='function')toast('Selecione o gênero musical da sua sala.','error');
   return;
 }
 if(error)error.hidden=true;
 $('sf109GenrePicker')?.classList.remove('sf109-invalid');
 step(2);
};
window.sf10WizardBack=()=>step(1);
modal?.querySelector('#sf109GenrePicker')?.addEventListener('change',()=>{
 const error=$('sf109GenreError');
 if(error)error.hidden=true;
 $('sf109GenrePicker')?.classList.remove('sf109-invalid');
});
step(1);
})();
