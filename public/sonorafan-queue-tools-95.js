(function SonoraFanQueue95() {
  'use strict';
  const $ = id => document.getElementById(id);
  const roomActive=()=>!!$('screen-room')?.classList.contains('active');
  const client=()=>typeof socket!=='undefined'?socket:null;
  let room=null, userId='', query='',mode='all',filterOpen=false,queued=false,compact=false;
  function own(t) {
    return !!t && (t.addedByUserId && userId ? t.addedByUserId===userId :
      (typeof myName!=='undefined' && t.dj===myName));
  }
  function report(message,bad=false) {
    if(typeof toast==='function')toast(message,bad?'error':'success');
    else console[bad?'warn':'info']('SonoraFan:',message);
  }
  async function ack(event,data) {
    if(!client()?.connected)throw Error('Conexão com a sala indisponível.');
    return new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>reject(Error('A sala não respondeu.')),8000);
      client().emit(event,data,response=>{
        clearTimeout(timeout);
        if(response?.ok)resolve(response);
        else reject(Error(response?.error||'Operação não autorizada.'));
      });
    });
  }
  function build() {
    const header=document.querySelector('#screen-room .sf34-queue .queue-header');
    const list=$('queueList');
    // The search/ownership filters now live in the unified Add Music dialog.
    // Clean up legacy controls on existing long-running sessions.
    $('sf95FilterTrigger')?.remove();
    $('sf95FilterBar')?.remove();
    const mini=$('premiumMiniPlayer');
    if(mini&&!$('sf95CompactVideo')){
      const btn=document.createElement('button');
      btn.id='sf95CompactVideo';btn.type='button';btn.className='sf95-compact-control';
      btn.addEventListener('click',()=>{
        compact=!compact;
        syncCompact();
        if(window.matchMedia('(max-width:768px)').matches&&roomActive()&&typeof setTab==='function')setTab('player');
      });
      mini.querySelector('button')?.before(btn);syncCompact();
    }
  }
  function syncCompact(){
    $('screen-room')?.classList.toggle('sf95-compact-video',compact);
    const btn=$('sf95CompactVideo');
    if(btn){
      btn.textContent=compact?'▣':'▢';
      btn.setAttribute('aria-pressed',String(compact));
      btn.title=compact?'Expandir vídeo da sala':'Compactar vídeo sem interromper a reprodução';
      btn.setAttribute('aria-label',btn.title);
    }
  }
  function openFilter() {
    if(!roomActive())return;
    if(typeof window.sf76OpenMusic==='function')window.sf76OpenMusic('queue');
  }
  function closeFilter(){ filterOpen=false;query='';mode='all';schedule(); }
  function schedule(){
    if(queued)return;
    queued=true;requestAnimationFrame(()=>{queued=false;decorate();});
  }
  function decorate(){
    const list=$('queueList');if(!list)return;
    const tracks=room?.queue||[], index=Number(room?.currentIndex)||0;
    const rows=[...list.querySelectorAll(':scope > .queue-item')];
    let visible=0;
    let durationAhead=0,estimateKnown=true;
    rows.forEach((row,i)=>{
      const song=tracks[i];if(!song)return;
      if(i>index){
        const holder=row.querySelector('.info');
        let eta=holder?.querySelector('.sf140-duration-ahead');
        if(estimateKnown&&durationAhead>0){
          if(!eta&&holder){
            eta=document.createElement('small');eta.className='sf140-duration-ahead';
            holder.appendChild(eta);
          }
          if(eta){
            const estimate='Antes desta: ~'+Math.ceil(durationAhead/60)+' min em músicas';
            if(eta.textContent!==estimate)eta.textContent=estimate;
            eta.title='Soma das durações anteriores, não é o tempo exato de espera';
          }
        }else eta?.remove();
      }
      if(i>=index){
        const duration=Number(song.duration);
        if(!Number.isFinite(duration)||duration<=0)estimateKnown=false;
        else durationAhead+=duration;
      }
      const matched=(!query||(String(song.title||'')+' '+String(song.artist||'')+' '+String(song.dj||'')).toLocaleLowerCase('pt-BR').includes(query)) &&
        (mode==='all'||mode==='next'&&i>index||mode==='mine'&&own(song));
      row.classList.remove('sf95-row-hidden');
      if(matched)visible++;
      let remove=row.querySelector('.sf95-remove-track');
      const canRemove=own(song)&&i>index;
      if(!canRemove&&remove)remove.remove();
      if(canRemove&&!remove){
        const holder=row.querySelector('.queue-votes');
        if(holder){
          remove=document.createElement('button');
          remove.type='button';remove.className='sf95-remove-track';
          remove.textContent='✕ Retirar';remove.dataset.id=song.id;
          remove.setAttribute('aria-label','Retirar minha música '+String(song.title||'')+' da fila');
          remove.addEventListener('click',removeOwn);
          holder.append(remove);
        }
      }
    });

  }
  async function removeOwn(event){
    const button=event.currentTarget,id=button.dataset.id;
    if(!/^[A-Za-z0-9_-]{11}$/.test(id))return;
    if(!window.confirm('Retirar sua música da fila colaborativa?'))return;
    button.disabled=true;
    try{await ack('sf95:removeOwnSong',{id});report('Música retirada da fila.');}
    catch(e){report(e.message,true);button.disabled=false;}
  }
  function init(){
    build();
    const clientSocket=client();
    clientSocket?.on('roomState',data=>{room=data;schedule();});
    window.sf95Queue={
      setUserId:id=>{userId=typeof id==='string'?id:'';schedule();},
      openFilter,
      getRoom:()=>room,
      isMine:own,
      removeOwnById:async id=>{
        if(!/^[A-Za-z0-9_-]{11}$/.test(id))throw Error('Música inválida.');
        return ack('sf95:removeOwnSong',{id});
      },
      update:()=>{build();schedule();}
    };
    requestAnimationFrame(build);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();