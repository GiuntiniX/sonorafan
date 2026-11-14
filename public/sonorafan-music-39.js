/* SonoraFan 39 — compartilhar músicas da playlist, sem alterar o player. */
(()=>{
  'use strict';
  async function copyVideo(id){
    if(!/^[A-Za-z0-9_-]{11}$/.test(id))return;
    const link=`https://www.youtube.com/watch?v=${id}`;
    try {
      if(navigator.clipboard?.writeText) await navigator.clipboard.writeText(link);
      else {
        const field=document.createElement('textarea');field.value=link;field.setAttribute('readonly','');field.style.position='fixed';field.style.opacity='0';document.body.append(field);field.select();
        const ok=document.execCommand('copy');field.remove();if(!ok)throw Error('copy failed');
      }
      if(typeof window.toast==='function') window.toast('Link da música copiado ✦','success');
    }catch(_){
      if(typeof window.toast==='function') window.toast('Não foi possível copiar o link','error');
    }
  }
  document.addEventListener('click',event=>{
    const btn=event.target.closest?.('#queueList .sf39-share-track');
    if(!btn)return;
    event.stopPropagation();
    copyVideo(btn.dataset.video||'');
  });
})();
