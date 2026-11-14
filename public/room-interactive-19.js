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
  const shirtColors={violet:'#8d6bff',coral:'#fa8465',mint:'#53d3b3',gold:'#f1bf4c',blue:'#58a9ff',rose:'#ed75bc'};
  const hairCodes=['short','wave','side','curly','long','spiky'];
  const accessoryCodes=['headphones','glasses','cap','none'];
  const defaultLook={shirt:'violet',hair:'short',accessory:'headphones'};
  const cleanLook=look=>({
    shirt:Object.hasOwn(shirtColors,look?.shirt)?look.shirt:defaultLook.shirt,
    hair:hairCodes.includes(look?.hair)?look.hair:defaultLook.hair,
    accessory:accessoryCodes.includes(look?.accessory)?look.accessory:defaultLook.accessory
  });
  // SonoraFan 23: personagens chibi inspirados em avatares de mundos sociais 2D.
  // Cabeça grande, expressão amigável, corpo curto, roupa com detalhes e contorno.
  function characterSvg(face,look=null){
    if(window.SF24CharacterArt?.render) return window.SF24CharacterArt.render(face,cleanLook(look),faces.indexOf(face));
    const i=Math.max(0,faces.indexOf(face));
    const [,skin,baseHair,style]=styleSets[i];
    const custom=look?cleanLook(look):null;
    const outfit=custom?shirtColors[custom.shirt]:styleSets[i][0];
    const hair=baseHair;
    const hairIdx=custom?hairCodes.indexOf(custom.hair):style%6;
    const accessory=custom?.accessory||'headphones';
    const outline='#241c3b', highlight='#fff9',shadow='#0003';
    const hairShifts=[
      `<path d="M17 40 Q12 13 46 12 Q76 11 78 39 L69 31 Q55 24 43 28 L25 37Z"/>`,
      `<path d="M17 43 Q10 22 32 14 Q58 2 76 27 L78 44 L67 31 L57 23 L45 34 L31 27Z"/>`,
      `<path d="M15 41 Q18 12 45 13 Q72 12 77 38 L69 21 L44 29 L24 42Z"/>`,
      `<path d="M14 39 Q12 26 21 20 Q16 8 34 13 Q45 3 56 14 Q75 9 77 30 L77 45 L65 28 L26 33Z"/>`,
      `<path d="M17 40 Q15 9 43 11 Q76 8 78 40 L80 68 L69 60 L67 31 L28 32 L23 63 L13 69Z"/>`,
      `<path d="M15 40 L21 23 L17 9 L35 19 L45 4 L56 20 L70 12 L68 25 L80 39 L67 31 L30 32Z"/>`
    ];
    const hairShape=hairShifts[hairIdx];
    const smile=i%3===0?`<path d="M42 63 Q48 68 55 63" fill="none" stroke="#954d5b" stroke-width="2.4" stroke-linecap="round"/>`:
      `<path d="M42 63 Q49 72 56 63" fill="#924655" stroke="#924655" stroke-width="1.4"/><path d="M44 65 Q49 68 54 65" stroke="#fff6" stroke-width="1.3"/>`;
    const topDecor=i%4===0?'✦':i%4===1?'♫':i%4===2?'★':'♡';
    const headwear=accessory==='headphones'?`<path d="M18 45 Q13 7 46 6 Q81 6 77 45" fill="none" stroke="${outfit}" stroke-width="6" stroke-linecap="round"/><rect x="12" y="42" width="11" height="20" rx="5" fill="${outfit}" stroke="${outline}" stroke-width="2.5"/><rect x="72" y="42" width="11" height="20" rx="5" fill="${outfit}" stroke="${outline}" stroke-width="2.5"/>`:'';
    const glasses=accessory==='glasses'?`<path d="M29 49 H41 Q47 57 53 49 H65" fill="none" stroke="${outline}" stroke-width="3"/><rect x="29" y="45" width="15" height="14" rx="5" fill="#25264144" stroke="${outline}" stroke-width="3"/><rect x="51" y="45" width="15" height="14" rx="5" fill="#25264144" stroke="${outline}" stroke-width="3"/>`:'';
    const cap=accessory==='cap'?`<path d="M16 37 Q18 6 49 12 Q76 14 78 40 L20 42Z" fill="${outfit}" stroke="${outline}" stroke-width="3"/><path d="M25 40 Q51 34 87 42 Q68 50 31 45" fill="${outfit}" stroke="${outline}" stroke-width="2.5"/>`:'';
    return `<svg class="sf21-figure sf23-chibi" viewBox="0 0 96 124" xmlns="${nsvg}" aria-hidden="true" focusable="false">
      <ellipse cx="48" cy="118" rx="33" ry="5" fill="#090512" opacity=".34"/>
      <g class="sf21-limbs" stroke="${outline}" stroke-linejoin="round" stroke-width="2.5">
        <path d="M31 99 L29 110 Q20 114 22 118 L43 118 L44 101Z" fill="#42405c"/>
        <path d="M53 100 L53 115 L75 118 Q77 112 66 110 L64 97Z" fill="#42405c"/>
      </g>
      <g class="sf21-arms" stroke="${outline}" stroke-width="2.5" stroke-linecap="round">
        <path d="M27 88 Q14 93 15 106" fill="none" stroke="${skin}" stroke-width="10"/>
        <path d="M68 87 Q81 94 80 106" fill="none" stroke="${skin}" stroke-width="10"/>
        <circle cx="15" cy="106" r="6" fill="${skin}"/><circle cx="80" cy="106" r="6" fill="${skin}"/>
      </g>
      <path d="M29 79 Q46 72 65 79 L73 106 Q47 115 23 106Z" fill="${outfit}" stroke="${outline}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M30 88 Q48 94 66 86" fill="none" stroke="${highlight}" stroke-width="2" opacity=".65"/>
      <path d="M38 75 L38 83 Q48 90 58 82 L58 75Z" fill="${skin}" stroke="${outline}" stroke-width="2"/>
      <text x="48" y="102" text-anchor="middle" font-size="14" fill="white" font-weight="900" font-family="sans-serif">${topDecor}</text>
      <g>
        <ellipse cx="48" cy="48" rx="32" ry="36" fill="${skin}" stroke="${outline}" stroke-width="3"/>
        <ellipse cx="19" cy="54" rx="6" ry="9" fill="${skin}" stroke="${outline}" stroke-width="2"/>
        <ellipse cx="77" cy="54" rx="6" ry="9" fill="${skin}" stroke="${outline}" stroke-width="2"/>
        <g fill="${hair}" stroke="${outline}" stroke-width="2.4" stroke-linejoin="round">${hairShape}</g>
        <ellipse cx="36" cy="52" rx="5" ry="7" fill="${outline}"/><ellipse cx="60" cy="52" rx="5" ry="7" fill="${outline}"/>
        <ellipse cx="37.7" cy="49.5" rx="1.8" ry="2.4" fill="#fff"/><ellipse cx="61.7" cy="49.5" rx="1.8" ry="2.4" fill="#fff"/>
        <ellipse cx="27" cy="62" rx="7" ry="4" fill="#e5779c" opacity=".5"/><ellipse cx="69" cy="62" rx="7" ry="4" fill="#e5779c" opacity=".5"/>
        ${smile}
      </g>
      ${headwear}${glasses}${cap}
    </svg>`;
  }
  function makeCharacter(face,look=null){
    const span=document.createElement('span');span.className='sf19-face sf21-character';
    span.innerHTML=characterSvg(face,look);return span;
  }
  const lookStorageKey='sf22-avatar-style';
  let storedLook=null;
  try { const raw=JSON.parse(localStorage.getItem(lookStorageKey));
    if(raw && Object.hasOwn(shirtColors,raw.shirt)&&hairCodes.includes(raw.hair)&&accessoryCodes.includes(raw.accessory)) storedLook=cleanLook(raw);
  } catch (_) {}
  let draftLook=storedLook||{...defaultLook};
  async function loadCharacterProfile(){
    try{
      const r=await fetch('/api/avatar/me',{credentials:'include'});
      if(!r.ok)return;
      const data=await r.json();
      if(data.look){storedLook=cleanLook(data.look);draftLook=storedLook;
        try{localStorage.setItem(lookStorageKey,JSON.stringify(storedLook))}catch(_){}
      }
      if(faces.includes(data.avatar))activeAvatar=data.avatar;
      if(isOpen)renderDialog();
    }catch(_){/* offline: a aparência local continua disponível para prévia */}
  }

  let syncedRoom=null;
  function renderLookChoices(previewLook=null){
    const mine=current();draftLook=cleanLook(previewLook||mine?.look||draftLook);
    const configs=[
      ['sf22ShirtChoices','shirt',Object.keys(shirtColors),{violet:'Roxo',coral:'Coral',mint:'Menta',gold:'Dourado',blue:'Azul',rose:'Rosa'}],
      ['sf22HairChoices','hair',hairCodes,{short:'Curto',wave:'Ondas',side:'Lateral',curly:'Cacheado',long:'Longo',spiky:'Espetado'}],
      ['sf22AccessoryChoices','accessory',accessoryCodes,{headphones:'🎧 Fones',glasses:'🕶️ Óculos',cap:'🧢 Boné',none:'Sem acessório'}]
    ];
    for(const [id,key,items,labels] of configs){const node=el(id);if(!node)continue;node.replaceChildren();
      for(const v of items){const btn=document.createElement('button');btn.type='button';btn.dataset.lookKey=key;btn.dataset.lookValue=v;
        btn.setAttribute('aria-pressed',String(draftLook[key]===v));btn.setAttribute('aria-label',labels[v]);
        if(key==='shirt'){const dot=document.createElement('i');dot.style.background=shirtColors[v];btn.appendChild(dot)}
        const text=document.createElement('span');text.textContent=labels[v];btn.appendChild(text);node.appendChild(btn)}
    }
    const preview=el('sf22LookPreview');if(preview)preview.replaceChildren(makeCharacter(current()?.avatar||activeAvatar||'🎧',draftLook));
  }
  for(const id of ['sf22ShirtChoices','sf22HairChoices','sf22AccessoryChoices']){
    el(id)?.addEventListener('click',e=>{const btn=e.target.closest('button[data-look-key]');if(!btn)return;
      draftLook={...draftLook,[btn.dataset.lookKey]:btn.dataset.lookValue};
      renderLookChoices(draftLook);change({look:draftLook});
    });
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
        const face=makeCharacter(faces.includes(p.avatar)?p.avatar:'🎧',p.look);b.appendChild(face);
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
    avatarBox.replaceChildren();seatBox.replaceChildren();renderLookChoices();
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
    if(!target)return;const bubble=document.createElement('span');bubble.className='sf19-reaction';bubble.textContent=data.emoji;target.appendChild(bubble);target.classList.remove('sf24-cheer');void target.offsetWidth;target.classList.add('sf24-cheer');setTimeout(()=>{bubble.remove();target.classList.remove('sf24-cheer')},1300);
  }
  if(socketReady()){
    socket.on('users',list=>{if(!Array.isArray(list))return;people=list.map(x=>({name:String(x.name||'Ouvinte').slice(0,40),avatar:String(x.avatar||'🎧'),seat:Number.isInteger(x.seat)?x.seat:null,role:x.role||'',look:x.look?cleanLook(x.look):null,dance:['bounce','sway','groove','still'].includes(x.dance)?x.dance:'sway'}));layout()});
    socket.on('roomState',state=>{
      const slug=String(state?.slug||'');
      if(slug && slug!==syncedRoom){syncedRoom=slug;
        loadCharacterProfile();
      }
    });
    socket.on('roomReaction',onReaction);
    socket.on('sf19Saved',saved=>{activeAvatar=saved.avatar;activeSeat=saved.seat;if(saved.look){draftLook=cleanLook(saved.look);storedLook=draftLook;try{localStorage.setItem(lookStorageKey,JSON.stringify(draftLook))}catch(_){}}if(el('sf19Status'))el('sf19Status').textContent='Presença atualizada para todos na sala.'});
    socket.on('sf23SaveError',message=>{if(el('sf19Status'))el('sf19Status').textContent=String(message||'Erro ao salvar aparência.').slice(0,130)});
    socket.on('sf19Error',message=>{if(el('sf19Status'))el('sf19Status').textContent=String(message||'Não foi possível atualizar.').slice(0,130)});
  }
  document.addEventListener('click',e=>{if(e.target.closest('#screen-room .sf5-navigation button')&&e.target.closest('button[onclick*="leaveRoom"]')){people=[];syncedRoom=null;layout()}});

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
