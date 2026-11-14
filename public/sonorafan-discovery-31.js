
/* SonoraFan 31.0 — busca refinada e experiência discovery indie */
(function(){
  'use strict';
  const placeholders=[
    'Busque uma sala, artista ou estilo musical',
    'Ex.: indie, rock alternativo, house, MPB',
    'Procure pela sua próxima vibe musical',
    'Digite o nome de uma sala ou gênero'
  ];
  let ph=0;
  function cyclePlaceholder(){
    const input=document.getElementById('sf10RoomQuery');
    if(!input) return;
    ph=(ph+1)%placeholders.length;
    input.setAttribute('placeholder', placeholders[ph]);
  }
  function applyRoomFilter(query){
    const cards=[...document.querySelectorAll('#roomGrid .room-card')];
    const q=(query||'').trim().toLowerCase();
    let visible=0;
    cards.forEach(card=>{
      const match=!q || (card.textContent||'').toLowerCase().includes(q);
      card.classList.toggle('is-hidden', !match);
      if(match) visible++;
    });
    const count=document.getElementById('sf10RoomsCount');
    if(count) count.textContent = visible===1 ? '1 sala encontrada' : `${visible} salas encontradas`;
    const heading=document.getElementById('sf10RoomsHeading');
    if(heading && q) heading.textContent = `Resultados para “${query.trim()}”`;
    else if(heading) heading.textContent = 'Salas em destaque';
  }
  function wireDiscovery(){
    const input=document.getElementById('sf10RoomQuery');
    const searchBtn=document.getElementById('sf31SearchAction');
    if(!input) return;
    input.addEventListener('input', ()=>applyRoomFilter(input.value));
    input.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); applyRoomFilter(input.value); } });
    searchBtn?.addEventListener('click', ()=>applyRoomFilter(input.value));
    document.querySelectorAll('.sf31-quick-tags [data-genre]').forEach(btn=>{
      btn.addEventListener('click', ()=>{ input.value=btn.dataset.genre||''; applyRoomFilter(input.value); input.focus(); });
    });
    setInterval(cyclePlaceholder, 3600);
  }
  function hookLoadRooms(){
    if(typeof window.loadRooms !== 'function' || window.loadRooms.__sf31Wrapped) return;
    const original=window.loadRooms;
    window.loadRooms = async function(){
      await original.apply(this, arguments);
      const q=document.getElementById('sf10RoomQuery')?.value || '';
      applyRoomFilter(q);
    };
    window.loadRooms.__sf31Wrapped = true;
  }
  document.addEventListener('DOMContentLoaded', ()=>{
    wireDiscovery();
    hookLoadRooms();
    setTimeout(()=>applyRoomFilter(document.getElementById('sf10RoomQuery')?.value || ''), 800);
  });
})();
