/* SonoraFan v133 — propaga tema da sala para janelas globais.
   Fontes da verdade: data-room-theme e variáveis --sf88-* do sistema existente.
   Nunca muda reprodução, socket, fila, permissões ou tema salvo. */
(() => {
  'use strict';
  const screen=document.getElementById('screen-room');
  if(!screen)return;
  const root=document.body;
  const keys=[
    ['--sf88-primary','--sf133-primary'],
    ['--sf88-secondary','--sf133-secondary'],
    ['--sf88-panel','--sf133-panel'],
    ['--sf88-label','--sf133-label'],
    ['--sf88-art','--sf133-art']
  ];
  const sync=()=>{
    const enabled=screen.classList.contains('active') &&
      !!screen.dataset.roomTheme && screen.dataset.roomTheme!=='geral';
    root.classList.toggle('sf133-themed-room',enabled);
    // A mesma escolha visual recebe uma sobreposição ilustrada no painel
    // global de músicas. A identidade continua vindo do sistema sf88.
    const id=enabled?String(screen.dataset.roomTheme||''):'';
    const safe=/^(?:indie|metal|emo|mpb|eletronica|rock|pop|rap|funk|pagode|sertanejo|reggae|jazz|forro)$/.test(id);
    if(safe){
      root.dataset.sf143Theme=id;
      root.style.setProperty('--sf143-body-scene','url("/themes/atmospheres/'+id+'.svg")');
    }else{
      delete root.dataset.sf143Theme;
      root.style.removeProperty('--sf143-body-scene');
    }
    for(const [source,target] of keys){
      const value=enabled?screen.style.getPropertyValue(source).trim():'';
      if(value)root.style.setProperty(target,value);
      else root.style.removeProperty(target);
    }
    const sheet=document.getElementById('sf76MusicSheet');
    if(sheet&&!sheet.hidden){
      sheet.classList.toggle('sf133-owner-locked',screen.classList.contains('sf129-guest-locked'));
    }
  };
  new MutationObserver(sync).observe(screen,{
    attributes:true,attributeFilter:['data-room-theme','class','style']
  });
  // O painel de música é montado sob demanda na primeira abertura.
  document.addEventListener('click',event=>{
    if(event.target.closest('#sf113AddMusic,#sf116MoreButton,#sf88RoomThemeButton')){
      sync();
    }
  },true);
  sync();
  window.sf133SyncRoomTheme=sync;
})();
