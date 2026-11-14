/* SonoraFan 19 · ações de presença 2D. O servidor valida identidade e lugares. */
(function(){
  'use strict';
  const room=document.getElementById('screen-room'),crowd=document.getElementById('sf18Crowd');
  const overlay=document.getElementById('sf19Overlay');
  if(!room||!crowd||!overlay)return;
  const faces=['🎧','🎸','🎹','🎤','🪩','🔥','💜','🦊','🐼','😎','🌙','👾'];
  const count=24,el=id=>document.getElementById(id);
  let people=[],lastName='',activeSeat=null,activeAvatar=null,isOpen=false;
  const socketReady=()=>typeof socket!=='undefined'&&socket&&typeof socket.emit==='function';
  const me=()=>typeof myName==='string'?myName:'';
  const current=()=>people.find(p=>p.name===me())||null;
  function layout(){
    crowd.replaceChildren();
    const used=new Set();
    const slots=new Array(count).fill(null);
    // Never invent participants; assign unmatched real participants to first free spot.
    people.slice(0,count).forEach(p=>{if(Number.isInteger(p.seat)&&p.seat>=0&&p.seat<count&&!used.has(p.seat)){slots[p.seat]=p;used.add(p.seat)}});
    people.slice(0,count).forEach(p=>{if(slots.includes(p))return;const idx=slots.findIndex((x)=>!x);if(idx>=0)slots[idx]=p});
    slots.forEach((p,i)=>{
      const b=document.createElement('button');b.type='button';b.className='sf19-seat';b.dataset.seat=String(i);
      b.setAttribute('aria-label',p?`Lugar ${i+1}: ${p.name}`:`Lugar ${i+1} livre`);
      if(p){
        b.classList.add('sf19-filled');if(p.name===me())b.classList.add('sf19-self');
        if(p.role==='owner')b.classList.add('sf19-host');
        const face=document.createElement('span');face.className='sf19-face';face.textContent=String(p.avatar||'🎧').slice(0,4);b.appendChild(face);
        if(p.name===me()){const you=document.createElement('span');you.className='sf19-you';you.textContent='VOCÊ';b.appendChild(you)}
      }else{const num=document.createElement('span');num.className='sf19-seatnum';num.textContent='+';b.appendChild(num)}
      b.title=p?`${p.name} · Lugar ${i+1}`:`Ocupar lugar ${i+1}`;crowd.appendChild(b);
    });
    if(el('sf18CrowdCount'))el('sf18CrowdCount').textContent=String(people.length);
    const mine=current();if(mine&&Number.isInteger(mine.seat))activeSeat=mine.seat;
    if(mine&&faces.includes(mine.avatar))activeAvatar=mine.avatar;
    if(el('sf19MySeat'))el('sf19MySeat').textContent=mine&&Number.isInteger(mine.seat)?`Seu lugar: ${mine.seat+1}`:'Escolha seu lugar';
    if(isOpen)renderDialog();
  }
  function renderDialog(){
    const avatarBox=el('sf19AvatarOptions'),seatBox=el('sf19Seats');
    if(!avatarBox||!seatBox)return;
    avatarBox.replaceChildren();seatBox.replaceChildren();
    faces.forEach(face=>{const b=document.createElement('button');b.type='button';b.textContent=face;b.dataset.face=face;b.setAttribute('aria-label',`Escolher avatar ${face}`);b.setAttribute('aria-pressed',String((current()?.avatar||activeAvatar||'🎧')===face));avatarBox.appendChild(b)});
    const taken=new Set(people.filter(p=>p.name!==me()&&Number.isInteger(p.seat)).map(p=>p.seat));
    for(let i=0;i<count;i++){
      const b=document.createElement('button');b.type='button';b.dataset.seat=String(i);b.textContent=String(i+1);b.disabled=taken.has(i);b.setAttribute('aria-label',`Lugar ${i+1}${taken.has(i)?' ocupado':''}`);
      b.setAttribute('aria-pressed',String(current()?.seat===i));seatBox.appendChild(b);
    }
  }
  function change(payload){if(!socketReady()||!room.classList.contains('active'))return;socket.emit('sf19Customize',payload);if(el('sf19Status'))el('sf19Status').textContent='Atualizando presença…'}
  function open(){isOpen=true;overlay.hidden=false;renderDialog();el('sf19Close')?.focus()}
  function close(){isOpen=false;overlay.hidden=true;el('sf19CustomizeButton')?.focus()}
  el('sf19CustomizeButton')?.addEventListener('click',open);
  el('sf19Close')?.addEventListener('click',close);el('sf19CloseBottom')?.addEventListener('click',close);
  overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&isOpen)close()});
  el('sf19AvatarOptions')?.addEventListener('click',e=>{const b=e.target.closest('button[data-face]');if(b)change({avatar:b.dataset.face})});
  el('sf19Seats')?.addEventListener('click',e=>{const b=e.target.closest('button[data-seat]');if(b&&!b.disabled)change({seat:Number(b.dataset.seat)})});
  crowd.addEventListener('click',e=>{const b=e.target.closest('button[data-seat]');if(!b)return;const seat=Number(b.dataset.seat);const mine=current();const occupied=people.find(p=>p.seat===seat&&p.name!==me());if(occupied){if(el('sf19Status'))el('sf19Status').textContent='Este lugar já está ocupado.';open();return}if(mine?.seat===seat)return;change({seat})});
  function onReaction(data){
    if(!data?.name||!['🔥','❤️','🙌','⚡','🎶'].includes(data.emoji))return;
    const p=people.find(x=>x.name===data.name);if(!p)return;
    const seats=[...crowd.querySelectorAll('.sf19-seat')];const target=seats.find(s=>s.classList.contains('sf19-filled')&&s.title.startsWith(p.name+' ·'));
    if(!target)return;const bubble=document.createElement('span');bubble.className='sf19-reaction';bubble.textContent=data.emoji;target.appendChild(bubble);setTimeout(()=>bubble.remove(),1300);
  }
  if(socketReady()){
    socket.on('users',list=>{if(!Array.isArray(list))return;people=list.map(x=>({name:String(x.name||'Ouvinte').slice(0,40),avatar:String(x.avatar||'🎧'),seat:Number.isInteger(x.seat)?x.seat:null,role:x.role||''}));layout()});
    socket.on('roomReaction',onReaction);
    socket.on('sf19Saved',saved=>{activeAvatar=saved.avatar;activeSeat=saved.seat;if(el('sf19Status'))el('sf19Status').textContent='Presença atualizada para todos na sala.'});
    socket.on('sf19Error',message=>{if(el('sf19Status'))el('sf19Status').textContent=String(message||'Não foi possível atualizar.').slice(0,130)});
  }
  document.addEventListener('click',e=>{if(e.target.closest('#screen-room .sf5-navigation button')&&e.target.closest('button[onclick*="leaveRoom"]')){people=[];layout()}});
  layout();
})();
