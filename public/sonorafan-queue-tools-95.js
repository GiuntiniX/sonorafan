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
    if(header&&list&&!$('sf95FilterBar')){
      const trigger=document.createElement('button');
      trigger.id='sf95FilterTrigger';trigger.type='button';trigger.className='sf95-icon-button';
      trigger.textContent='⌕';trigger.title='Buscar ou filtrar músicas na fila';
      trigger.setAttribute('aria-label',trigger.title);
      trigger.setAttribute('aria-controls','sf95FilterBar');
      trigger.setAttribute('aria-expanded','false');
      trigger.addEventListener('click',()=>filterOpen?closeFilter():openFilter());
      (header.querySelector('div')||header).append(trigger);
      const bar=document.createElement('div');
      bar.id='sf95FilterBar';bar.className='sf95-filter-bar';bar.hidden=true;
      bar.innerHTML='<input id="sf95FilterInput" type="search" placeholder="Música, artista ou DJ…" aria-label="Buscar na fila">'+
        '<select id="sf95FilterMode" aria-label="Exibir músicas"><option value="all">Todas</option>'+
        '<option value="next">Próximas</option><option value="mine">Minhas</option></select>'+
        '<small id="sf95FilterCount" aria-live="polite"></small>';
      list.before(bar);
      $('sf95FilterInput').addEventListener('input',e=>{query=e.target.value.trim().toLocaleLowerCase('pt-BR');schedule();});
      $('sf95FilterInput').addEventListener('keydown',e=>{if(e.key==='Escape')closeFilter();});
      $('sf95FilterMode').addEventListener('change',e=>{mode=e.target.value;schedule();});
      // Evita loop: a decoração muda conteúdo interno das linhas.
      new MutationObserver(schedule).observe(list,{childList:true});
    }
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
    build();
    filterOpen=true;
    if($('sf95FilterBar'))$('sf95FilterBar').hidden=false;
    $('sf95FilterTrigger')?.setAttribute('aria-expanded','true');
    $('sf95FilterInput')?.focus({preventScroll:true});
    schedule();
  }
  function closeFilter() {
    filterOpen=false;query='';mode='all';
    if($('sf95FilterBar'))$('sf95FilterBar').hidden=true;
    if($('sf95FilterInput'))$('sf95FilterInput').value='';
    if($('sf95FilterMode'))$('sf95FilterMode').value='all';
    $('sf95FilterTrigger')?.setAttribute('aria-expanded','false');
    schedule();
  }
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
      row.classList.toggle('sf95-row-hidden',filterOpen&&!matched);
      if(matched)visible++;
      let remove=row.querySelector('.sf95-remove-track');
      const canRemove=filterOpen&&mode==='mine'&&own(song)&&i>index;
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
    if($('sf95FilterCount'))$('sf95FilterCount').textContent=filterOpen?visible+' de '+tracks.length+' músicas':'';
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
      update:()=>{build();schedule();}
    };
    requestAnimationFrame(build);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();