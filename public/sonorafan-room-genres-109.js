(()=>{'use strict';
const $=id=>document.getElementById(id);
const field=()=>$('sf109GenrePicker');
const selected=()=>field()?.querySelector('input[name="sf109RoomGenre"]:checked')?.value||'';
const warn=()=>{const error=$('sf109GenreError');if(error)error.hidden=false;
  field()?.classList.add('sf109-invalid');
  field()?.querySelector('input[name="sf109RoomGenre"]')?.focus();
  field()?.scrollIntoView({behavior:'smooth',block:'nearest'});
};
document.addEventListener('click',e=>{
  if(!e.target.closest('#createRoomModal .sf10-next'))return;
  const modal=$('createRoomModal');
  if(!modal?.classList.contains('active'))return;
  // Only the identity stage requires a genre. No default silently chosen.
  const stepOne=modal.querySelector('.sf10-step-one');
  if(!stepOne || getComputedStyle(stepOne).display==='none'||stepOne.hidden)return;
  if(!selected()){e.preventDefault();e.stopImmediatePropagation();warn();}
},true);
document.addEventListener('change',e=>{
 if(e.target.matches('#sf109GenrePicker input[name="sf109RoomGenre"]')){
  field()?.classList.remove('sf109-invalid');
  const error=$('sf109GenreError');if(error)error.hidden=true;
 }
});
})();