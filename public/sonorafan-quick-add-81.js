/* SonoraFan 81 — escolha rapida, sem abrir o modal da busca completa. */
(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  const valid=id=>/^[A-Za-z0-9_-]{11}$/.test(String(id||''));
  const node=(tag,cls,txt)=>{
    const el=document.createElement(tag);
    if(cls)el.className=cls;
    if(txt!==undefined)el.textContent=txt;
    return el;
  };
  let token=0,controller=null,busy=false;
  function status(message,bad=false){
    const el=$('sf81QuickStatus');
    if(!el)return;
    el.textContent=message;
    el.classList.toggle('error',!!bad);
  }
  function choose(track){
    if(!valid(track?.id)||!$('sf78InlineSearch')||$('sf78InlineSearch').hidden)return false;
    const host=$('sf78InlineResults');
    if(!host)return false;
    const version=++token;
    controller?.abort();
    controller=new AbortController();
    busy=false;
    let chosen={id:track.id,title:String(track.title||'Música'),artist:String(track.artist||'Artista'),duration:null};
    const panel=node('div','sf81-quick-card');
    const top=node('div','sf81-quick-track');
    const pic=node('img','sf81-quick-thumb');
    pic.src='https://img.youtube.com/vi/'+encodeURIComponent(track.id)+'/mqdefault.jpg';
    pic.alt='';
    const copy=node('div','sf81-quick-copy');
    copy.append(node('small','','FAIXA SELECIONADA'),node('strong','',chosen.title),node('span','',chosen.artist));
    top.append(pic,copy);
    const line=node('p','sf81-quick-status','Verificando disponibilidade e duração…');
    line.id='sf81QuickStatus';
    line.setAttribute('role','status');
    line.setAttribute('aria-live','polite');
    const actions=node('div','sf81-quick-actions');
    const back=node('button','sf81-back','‹ Resultados');
    back.type='button';
    back.addEventListener('click',()=>{
      if(busy)return;
      ++token;controller?.abort();
      window.sf78SearchFromField?.($('songUrl')?.value||'',true);
    });
    const submit=node('button','sf81-submit','＋ Adicionar à fila');
    submit.type='button';submit.disabled=true;
    submit.id='sf81QuickSubmit';
    submit.addEventListener('click',async()=>{
      if(busy||submit.disabled)return;
      busy=true;submit.disabled=true;back.disabled=true;
      submit.textContent='⏳ Enviando…';
      status('Aguardando confirmação da sala…');
      try{
        if(typeof window.sf80QueueSong!=='function')throw new Error('Fila indisponível. Atualize a página.');
        const result=await window.sf80QueueSong(chosen);
        if(typeof toast==='function')toast(result?.placement==='waiting'?'🎵 Música adicionada à espera!':'🎵 Música adicionada à fila!','success');
        window.sf78CloseInline?.();
        if($('songUrl'))$('songUrl').value='';
        if($('addBtn'))$('addBtn').textContent='Adicionar';
        if(typeof clearPreview==='function')clearPreview();
      }catch(e){
        status(e?.message||'Não foi possível incluir a música.',true);
        submit.textContent='↻ Tentar adicionar';
        submit.disabled=false;back.disabled=false;
      }finally{busy=false;}
    });
    actions.append(back,submit);
    panel.append(top,line,actions);
    host.replaceChildren(panel);
    if($('sf78Hint'))$('sf78Hint').textContent='Busca rápida · confirme aqui. Use “Busca completa” apenas se quiser explorar mais.';
    const timeout=setTimeout(()=>controller?.abort(),8000);
    fetch('/api/video-info?id='+encodeURIComponent(track.id),{credentials:'include',signal:controller.signal})
      .then(r=>{if(!r.ok)throw new Error('Verificação indisponível');return r.json();})
      .then(data=>{
        if(token!==version||!panel.isConnected)return;
        if(data?.embeddable===false){status('Esta música não permite reprodução na sala. Escolha outra.',true);return;}
        const seconds=Number(data?.duration);
        chosen={id:track.id,title:String(data?.title||chosen.title),artist:String(data?.artist||chosen.artist),duration:Number.isFinite(seconds)&&seconds>0?Math.floor(seconds):null};
        copy.querySelector('strong').textContent=chosen.title;
        copy.querySelector('span').textContent=chosen.artist;
        const limit=typeof roomLimit==='function'?Number(roomLimit()):600;
        const allowLive=typeof currentRoomData!=='undefined'&&Boolean(currentRoomData?.allowLive);
        if(chosen.duration&&!allowLive&&chosen.duration>limit){status('Vídeo acima do limite da sala ('+Math.floor(limit/60)+' min).',true);return;}
        const dur=chosen.duration?Math.floor(chosen.duration/60)+':'+String(chosen.duration%60).padStart(2,'0'):'não verificada';
        status('Duração: '+dur+' · pronta para adicionar.');
        submit.disabled=false;
      })
      .catch(()=>{
        if(token!==version||!panel.isConnected)return;
        status('Duração não verificada. A sala fará a validação ao adicionar.');
        submit.disabled=false;
      })
      .finally(()=>clearTimeout(timeout));
    submit.focus({preventScroll:true});
    return true;
  }
  window.sf81QuickSelect=choose;
})();
