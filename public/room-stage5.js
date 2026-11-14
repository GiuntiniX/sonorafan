
(function(){
  function enhanceRoomTypeBadges(){
    const mode = document.querySelector('#createCfg .sf17-create-summary strong');
    const modal = document.getElementById('createRoomModal');
    if(!modal || !mode) return;
    modal.dataset.sf17Mode = /DJ/.test(mode.textContent) ? 'dj' : 'collab';
  }
  document.addEventListener('click', function(e){
    if(e.target.closest('#createRoomModal')) setTimeout(enhanceRoomTypeBadges, 10);
  });
  document.addEventListener('DOMContentLoaded', enhanceRoomTypeBadges);
})();
