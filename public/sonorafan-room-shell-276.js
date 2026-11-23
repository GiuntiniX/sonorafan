/* SonoraFan 276 — Unified navigation in rooms.
   Adds a dedicated left rail without relocating or re-creating the live player,
   queue, chat or their socket handlers. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const screen=$('screen-room');
 if(!screen)return;
 const items=[
  ['lobby','⌂','Início'],
  ['rooms','♫','Salas'],
  ['clubs','♧','Fan Clubs'],
  ['agenda','▦','Agenda Musical'],
  ['ranking','♜','Ranking'],
  ['profile','♙','Meu Perfil']
 ];
 const create=[['create','＋','Criar Sala'],['create-club','♧','Criar Fan Club'],['create-event','▦','Criar Evento']];
 function build(){
  const app=screen.querySelector(':scope > .app');
  if(!app||$('sf276RoomSidebar'))return;
  const aside=document.createElement('aside');
  aside.id='sf276RoomSidebar';
  aside.className='sf276-room-sidebar';
  aside.setAttribute('aria-label','Navegação principal SonoraFan');
  const button=([action,icon,label])=>
   '<button type="button" data-sf276-to="'+action+'" title="'+label+'" aria-label="'+label+'"><span aria-hidden="true" class="sf276-icon">'+icon+'</span><span class="sf276-label">'+label+'</span></button>';
  aside.innerHTML=
   '<div class="sf276-brand"><img src="/brand-144/sonorafan-logo.svg" alt="SonoraFan" decoding="async"></div>'+
   '<nav aria-label="Páginas do SonoraFan" class="sf276-nav">'+items.map(button).join('')+
   '<button type="button" class="is-active" aria-current="page" data-sf276-to="current" title="Sala atual" aria-label="Sala atual"><span class="sf276-icon" aria-hidden="true">▶</span><span class="sf276-label">Sala atual</span></button></nav>'+
   '<div class="sf276-divider"></div><span class="sf276-section">Criar</span>'+
   '<nav aria-label="Criar" class="sf276-nav sf276-create">'+create.map(button).join('')+'</nav>'+
   '<div class="sf276-ambient" aria-hidden="true"></div>';
  app.insertBefore(aside,app.firstElementChild);
  aside.addEventListener('click',e=>{
    const control=e.target.closest('button[data-sf276-to]');if(!control)return;
    const destination=control.dataset.sf276To;
    if(destination==='current')return;
    const navigate=()=>{
      if(destination==='lobby'){window.sf125Navigate?.('lobby');return;}
      if(typeof window.sf125Navigate==='function'){window.sf125Navigate(destination);return;}
      if(destination==='rooms')document.getElementById('sf107Popular')?.scrollIntoView({block:'start'});
    };
    // Navigation to other pages happens only after leaving the active room.
    if(typeof window.leaveRoom==='function')window.leaveRoom();
    else if(typeof window.showScreen==='function')window.showScreen('lobby');
    requestAnimationFrame(navigate);
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build,{once:true});
 else build();
})();
