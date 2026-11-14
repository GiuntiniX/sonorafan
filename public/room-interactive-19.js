/* SonoraFan 19 · ações de presença 2D. O servidor valida identidade e lugares. */
(function(){
  'use strict';
  const room=document.getElementById('screen-room'),crowd=document.getElementById('sf18Crowd');
  const overlay=document.getElementById('sf19Overlay');
  if(!room||!crowd||!overlay)return;
  const faces=['🎧','🎸','🎹','🎤','🪩','🔥','💜','🦊','🐼','😎','🌙','👾'];
  const count=24,el=id=>document.getElementById(id);

  /* SonoraFan 21 — personagens 2D desenhados por SVG, sem imagens externas.
     O emoji continua sendo a identidade enviada ao servidor (compatível com v20). */
  const styleSets=[
    ['#8d6bff','#dd9f79','#26305c',0],['#fe9655','#b97953','#30253d',1],
    ['#5bd4de','#f0bd92','#593b87',2],['#e15da8','#a96c50','#262a42',3],
    ['#ffd174','#e6ad7e','#7438a8',4],['#ff7248','#b98568','#283d5d',5],
    ['#bf8fff','#e6b89b','#45324f',6],['#6ed6a4','#d39372','#312d40',7],
    ['#eebccd','#a46f5b','#555e8a',8],['#6ac7ff','#c98f6c','#513f42',9],
    ['#91a7ff','#e1ab80','#372f65',10],['#df95ff','#c58e6f','#2a5265',11]
  ];
  const nsvg='http://www.w3.org/2000/svg';
  function characterSvg(face){
    const i=Math.max(0,faces.indexOf(face));const [shirt,skin,hair,style]=styleSets[i];
    const hairPath=[
      'M19 26 Q17 7 40 11 Q61 5 63 27 L55 19 Q37 10 19 26',
      'M18 29 Q14 11 34 10 Q54 3 63 24 L56 21 L50 14 L41 22 L29 17Z',
      'M18 26 Q21 7 40 13 Q59 9 62 28 L58 17 L47 22 L34 14 L20 27Z',
      'M17 31 Q13 11 35 10 Q61 4 65 29 L60 34 L56 18 L27 18 L21 34Z',
      'M17 24 Q20 4 45 11 Q62 10 62 26 L53 17 L38 19 L21 24Z',
      'M17 29 Q16 8 43 11 Q63 11 62 31 L56 21 L30 17 L20 32Z'
    ][style%6];
    const mark=style===7?'✦':style===8?'•':style===11?'♫':'';
    return `<svg class="sf21-figure" viewBox="0 0 80 102" xmlns="${nsvg}" aria-hidden="true" focusable="false">
      <ellipse cx="40" cy="97" rx="23" ry="4" fill="#000" opacity=".23"/>
      <g class="sf21-limbs"><path d="M30 77 L27 93" stroke="${hair}" stroke-width="10" stroke-linecap="round"/><path d="M49 77 L53 93" stroke="${hair}" stroke-width="10" stroke-linecap="round"/><path d="M26 94 L18 94 M54 94 L61 94" stroke="${shirt}" stroke-width="7" stroke-linecap="round"/></g>
      <g class="sf21-arms"><path d="M22 53 L12 72" stroke="${skin}" stroke-width="10" stroke-linecap="round"/><path d="M58 53 L69 70" stroke="${skin}" stroke-width="10" stroke-linecap="round"/><circle cx="12" cy="73" r="5" fill="${skin}"/><circle cx="69" cy="71" r="5" fill="${skin}"/></g>
      <path d="M24 49 Q40 44 56 49 L62 81 Q40 89 18 81Z" fill="${shirt}" stroke="#ffffff" stroke-opacity=".18" stroke-width="1.2"/>
      <path d="M35 43 L35 52 L45 52 L45 43" fill="${skin}"/><path d="M36 53 L40 61 L44 53" fill="#fff" opacity=".16"/>
      <ellipse cx="40" cy="30" rx="20" ry="24" fill="${skin}"/><path d="${hairPath}" fill="${hair}"/>
      <path d="M23 23 Q17 38 25 46" stroke="${hair}" stroke-width="6" stroke-linecap="round" fill="none" opacity=".9"/>
      <path d="M57 23 Q63 38 55 46" stroke="${hair}" stroke-width="6" stroke-linecap="round" fill="none" opacity=".9"/>
      <g fill="${hair}"><ellipse cx="32" cy="32" rx="2.2" ry="2.8"/><ellipse cx="49" cy="32" rx="2.2" ry="2.8"/></g>
      <path d="M35 42 Q40 45 46 41" stroke="#744a4f" stroke-width="1.7" stroke-linecap="round" fill="none"/>
      <path d="M19 29 Q16 18 24 16 M61 29 Q64 18 56 16" stroke="${shirt}" stroke-width="5" stroke-linecap="round" fill="none"/>
      <rect x="14" y="27" width="8" height="17" rx="4" fill="${shirt}"/><rect x="58" y="27" width="8" height="17" rx="4" fill="${shirt}"/>
      <path d="M22 17 Q40 0 58 17" fill="none" stroke="${shirt}" stroke-width="5" stroke-linecap="round"/>
      <text x="40" y="72" text-anchor="middle" fill="white" font-size="13" font-weight="900" font-family="sans-serif">${mark}</text>
    </svg>`;
  }
  function makeCharacter(face){
    const span=document.createElement('span');span.className='sf19-face sf21-character';
    span.innerHTML=characterSvg(face);return span;
  }

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
        b.classList.add('sf19-filled');b.dataset.dance=p.dance||'sway';if(p.name===me())b.classList.add('sf19-self');
        if(p.role==='owner')b.classList.add('sf19-host');
        const face=makeCharacter(faces.includes(p.avatar)?p.avatar:'🎧');b.appendChild(face);
        const label=document.createElement('span');label.className='sf21-person-label';label.textContent=p.name.slice(0,11);b.appendChild(label);
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
    faces.forEach(face=>{const b=document.createElement('button');b.type='button';b.appendChild(makeCharacter(face));const tag=document.createElement('span');tag.className='sf21-face-tag';tag.textContent=face;b.appendChild(tag);b.dataset.face=face;b.setAttribute('aria-label',`Escolher personagem ${face}`);b.setAttribute('aria-pressed',String((current()?.avatar||activeAvatar||'🎧')===face));avatarBox.appendChild(b)});
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
    socket.on('users',list=>{if(!Array.isArray(list))return;people=list.map(x=>({name:String(x.name||'Ouvinte').slice(0,40),avatar:String(x.avatar||'🎧'),seat:Number.isInteger(x.seat)?x.seat:null,role:x.role||'',dance:['bounce','sway','groove','still'].includes(x.dance)?x.dance:'sway'}));layout()});
    socket.on('roomReaction',onReaction);
    socket.on('sf19Saved',saved=>{activeAvatar=saved.avatar;activeSeat=saved.seat;if(el('sf19Status'))el('sf19Status').textContent='Presença atualizada para todos na sala.'});
    socket.on('sf19Error',message=>{if(el('sf19Status'))el('sf19Status').textContent=String(message||'Não foi possível atualizar.').slice(0,130)});
  }
  document.addEventListener('click',e=>{if(e.target.closest('#screen-room .sf5-navigation button')&&e.target.closest('button[onclick*="leaveRoom"]')){people=[];layout()}});

  // SonoraFan 20: escolhas de animação individuais, sincronizadas para a mesma sala.
  const seatChoices=el('sf19Seats');
  if(seatChoices && !el('sf20DanceChoices')){
    const wrap=document.createElement('section');wrap.className='sf20-dance-group';
    wrap.innerHTML='<h3>Seu movimento na pista</h3><div class="sf20-dance-choices" id="sf20DanceChoices"></div><p>O movimento é visível para todos na sala. Você pode mudar quando quiser.</p>';
    seatChoices.after(wrap);
    const choices=wrap.querySelector('#sf20DanceChoices');
    [['sway','🌊 Balançar'],['bounce','🎵 Pular'],['groove','🕺 Dançar'],['still','🧍 Parado']].forEach(([value,label])=>{
      const b=document.createElement('button');b.type='button';b.dataset.dance=value;b.textContent=label;choices.appendChild(b);
    });
    choices.addEventListener('click',e=>{const b=e.target.closest('[data-dance]');if(b)change({dance:b.dataset.dance})});
  }
  function paintDance(){const active=current()?.dance||'sway';el('sf20DanceChoices')?.querySelectorAll('[data-dance]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.dance===active)))}
  socketReady()&&socket.on('users',paintDance);
  layout();
})();
