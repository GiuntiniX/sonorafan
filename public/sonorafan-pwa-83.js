/* SonoraFan 83 — instalação PWA sem popups intrusivos. */
(()=>{
  'use strict';
  let pending=null,button=null;
  const installed=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  function remove(){button?.remove();button=null;}
  function render(){
    if(!pending||installed())return;
    if(button?.isConnected)return;
    const target=document.querySelector('#screen-lobby .sf28-lobby-userbar');
    if(!target)return;
    button=document.createElement('button');
    button.type='button';button.className='sf83-install';
    button.textContent='＋ Instalar app';
    button.setAttribute('aria-label','Instalar SonoraFan neste dispositivo');
    button.addEventListener('click',async()=>{
      if(!pending)return;
      const prompt=pending;pending=null;
      try{await prompt.prompt();await prompt.userChoice;}catch(_){}
      remove();
    });
    target.append(button);
  }
  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();pending=event;render();
  });
  window.addEventListener('appinstalled',()=>{pending=null;remove();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();
})();
