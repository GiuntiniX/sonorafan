/* SonoraFan 167 — um menu acessível para Temas e Convidar.
   Não altera sockets, convites nem o seletor de atmosferas existente. */
(() => {
  'use strict';
  const trigger=document.getElementById('sf167MenuTrigger');
  const panel=document.getElementById('sf167MenuPanel');
  const room=document.getElementById('screen-room');
  if(!trigger||!panel||!room)return;
  const items=()=>[...panel.querySelectorAll('button:not([disabled])')].filter(b=>!b.hidden);
  const isOpen=()=>!panel.hidden;
  const reposition=()=>{
    if(!isOpen())return;
    if(matchMedia('(max-width:768px)').matches){
      panel.style.removeProperty('--sf167-y');
      panel.style.removeProperty('--sf167-right');
      return;
    }
    const rect=trigger.getBoundingClientRect();
    const top=Math.min(rect.bottom+10,window.innerHeight-100);
    const right=Math.max(12,window.innerWidth-rect.right);
    panel.style.setProperty('--sf167-y',Math.max(8,top)+'px');
    panel.style.setProperty('--sf167-right',right+'px');
  };
  function close(restoreFocus=false){
    if(!isOpen())return;
    panel.hidden=true;
    trigger.setAttribute('aria-expanded','false');
    if(restoreFocus)trigger.focus({preventScroll:true});
  }
  function open(){
    if(!room.classList.contains('active'))return;
    panel.hidden=false;
    trigger.setAttribute('aria-expanded','true');
    reposition();
    items()[0]?.focus({preventScroll:true});
  }
  trigger.addEventListener('click',()=>isOpen()?close(true):open());
  trigger.addEventListener('keydown',event=>{
    if(['ArrowDown','Enter',' '].includes(event.key)){
      if(event.key!=='Enter'&&event.key!==' ')event.preventDefault();
      if(!isOpen()){if(event.key==='ArrowDown')open();}
    }
  });
  panel.addEventListener('click',event=>{
    const item=event.target.closest('button');
    if(!item)return;
    const action=item.dataset.sf167Action;
    if(action==='invite'){
      close(true);
      if(typeof window.copyInviteLink==='function')window.copyInviteLink();
      return;
    }
    if(action==='theme'){
      // O seletor original é aberto pelo listener do botão #sf88RoomThemeButton.
      // Preservamos o foco no diálogo; o menu deixa de aparecer atrás dele.
      close(false);
    }
  });
  panel.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close(true);return;}
    if(event.key==='Tab'){close(false);return;}
    if(event.key!=='ArrowDown'&&event.key!=='ArrowUp'&&event.key!=='Home'&&event.key!=='End')return;
    event.preventDefault();
    const buttons=items();if(!buttons.length)return;
    const current=buttons.indexOf(document.activeElement);
    let next=0;
    if(event.key==='Home')next=0;
    else if(event.key==='End')next=buttons.length-1;
    else next=(current+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;
    buttons[next].focus({preventScroll:true});
  });
  document.addEventListener('pointerdown',event=>{
    if(isOpen()&&!panel.contains(event.target)&&!trigger.contains(event.target))close();
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&isOpen()){event.preventDefault();close(true);}
  });
  window.addEventListener('resize',reposition,{passive:true});
  window.addEventListener('scroll',reposition,{passive:true,capture:true});
  const observer=new MutationObserver(()=>{
    if(!room.classList.contains('active'))close();
    if(!document.getElementById('sf88ThemeOverlay')?.hidden)close();
  });
  observer.observe(room,{attributes:true,attributeFilter:['class']});
  const theme=document.getElementById('sf88ThemeOverlay');
  if(theme)observer.observe(theme,{attributes:true,attributeFilter:['hidden']});
  window.sf167CloseRoomMenu=()=>close();
})();
