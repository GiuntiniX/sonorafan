/* SonoraFan 83 — instalação PWA sem popups intrusivos. */
(()=>{
  'use strict';
  let pending=null,button=null,networkNotice=null;
  const netReady=()=>navigator.onLine!==false;
  function updateConnection(){
    const room=document.querySelector('#screen-room.active');
    const existing=document.getElementById('connBanner');
    if(netReady()){
      networkNotice?.remove();networkNotice=null;
      return;
    }
    // O aviso de conexão da sala já existe: não cria outro banner dentro do player.
    if(room&&existing)return;
    if(networkNotice?.isConnected)return;
    networkNotice=document.createElement('div');
    networkNotice.className='sf83-offline';
    networkNotice.setAttribute('role','status');
    networkNotice.textContent='Sem conexão. Música e chat precisam de internet; seus dados não foram alterados.';
    document.body.append(networkNotice);
  }
  function setupNetwork(){
    window.addEventListener('offline',updateConnection);
    window.addEventListener('online',()=>{
      updateConnection();
      // Socket.IO já gerencia a reconexão, sem criar um segundo cliente.
      if(document.querySelector('#screen-lobby.active')&&typeof window.sf107RefreshRooms==='function')
        window.sf107RefreshRooms();
    });
    updateConnection();
  }
  function registerStaticAssets(){
    if(!('serviceWorker'in navigator)||!window.isSecureContext)return;
    navigator.serviceWorker.register('/sf-static-142-sw.js',{scope:'/'})
      .catch(()=>{}); // Instalação continua utilizável sem service worker.
  }
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
  function init(){render();setupNetwork();registerStaticAssets();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
