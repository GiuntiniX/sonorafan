/* SonoraFan 24 — Biblioteca de personagens 2D ilustrados.
   Somente parâmetros de listas locais: não insere dados pessoais no SVG. */
(function(){
  'use strict';
  const identities=['🎧','🎸','🎹','🎤','🪩','🔥','💜','🦊','🐼','😎','🌙','👾'];
  const palette=[
    {skin:'#dfab85',hair:'#272139',bottom:'#273557',trim:'#ffd67a'},
    {skin:'#b87959',hair:'#39253a',bottom:'#433458',trim:'#ffab69'},
    {skin:'#edc39f',hair:'#5d4163',bottom:'#25394d',trim:'#72dbe9'},
    {skin:'#b57d63',hair:'#1c233c',bottom:'#4b2c58',trim:'#ff92cd'},
    {skin:'#f0bb88',hair:'#a05a35',bottom:'#433068',trim:'#ffdc72'},
    {skin:'#b88368',hair:'#283b5d',bottom:'#1c3447',trim:'#ff8d5d'},
    {skin:'#e8b69e',hair:'#49334f',bottom:'#34405d',trim:'#d69fff'},
    {skin:'#d7a080',hair:'#543321',bottom:'#314744',trim:'#7cf1bd'},
    {skin:'#e9e9e9',hair:'#30343e',bottom:'#38404f',trim:'#c9ddff'},
    {skin:'#c69173',hair:'#3d2a38',bottom:'#31405b',trim:'#72d5ff'},
    {skin:'#e5b28b',hair:'#392d5a',bottom:'#373060',trim:'#a4b0ff'},
    {skin:'#a6e5f7',hair:'#303055',bottom:'#34395c',trim:'#f0a4ff'}
  ];
  const colors={violet:'#8d6bff',coral:'#fa8465',mint:'#53d3b3',gold:'#f1bf4c',blue:'#58a9ff',rose:'#ed75bc'};
  const hairs=['short','wave','side','curly','long','spiky'];
  const accessories=['headphones','glasses','cap','none'];
  let nextId=0;
  const path=(d,fill,extra='')=>`<path d="${d}" fill="${fill}" ${extra}/>`;
  function render(face,look={},passedIndex){
    const index=passedIndex>=0?passedIndex:identities.indexOf(face);
    const i=Math.max(0,index)%12,p=palette[i];
    const shirt=colors[look?.shirt]||colors.violet;
    const hairStyle=hairs.includes(look?.hair)?look.hair:hairs[i%hairs.length];
    const accessory=accessories.includes(look?.accessory)?look.accessory:'headphones';
    const id='sf24art'+(++nextId),o='#29203c';
    const animal=i===7?'fox':i===8?'panda':i===11?'robot':null;
    const skin=animal==='fox'?'#ffbd73':animal==='panda'?'#f3eef5':animal==='robot'?'#a9e4f3':p.skin;
    const hi=animal==='robot'?'#e4ffff':'#fff6';
    const hairPaths={
      short:'M24 49 Q20 18 48 14 Q86 6 97 46 L88 43 L81 31 Q58 38 35 31 L28 48Z',
      wave:'M23 52 Q12 30 30 18 Q36 4 51 14 Q69 3 84 17 Q106 22 97 48 L88 45 Q84 34 77 33 Q70 42 60 34 Q48 38 41 31 Q33 46 23 52Z',
      side:'M21 53 Q15 17 52 15 Q89 10 96 43 L89 42 L79 35 Q59 52 32 43 L25 55Z',
      curly:'M23 50 Q12 43 18 30 Q13 13 33 16 Q40 6 52 13 Q65 1 77 17 Q98 10 99 32 Q105 45 93 51 L88 34 Q55 39 28 40Z',
      long:'M24 53 Q12 17 51 12 Q90 10 98 51 L102 88 L87 81 L83 36 Q57 42 34 32 L29 83 L18 87Z',
      spiky:'M22 52 L20 29 L13 13 L37 22 L48 5 L59 20 L83 8 L80 26 L102 21 L95 52 L87 39 L38 35 L25 54Z'
    };
    const ears=animal==='fox'?`<path d="M18 40 L16 11 L38 28 M82 27 L106 11 L102 44" fill="#ffac57" stroke="${o}" stroke-width="3" stroke-linejoin="round"/><path d="M22 18 L27 33 M97 19 L91 32" stroke="#ffdfd4" stroke-width="6" stroke-linecap="round"/>`:
       animal==='panda'?`<circle cx="27" cy="26" r="14" fill="#2b2b42" stroke="${o}" stroke-width="3"/><circle cx="92" cy="26" r="14" fill="#2b2b42" stroke="${o}" stroke-width="3"/>`:
       animal==='robot'?`<path d="M60 17 V7" stroke="#5ccae4" stroke-width="4"/><circle cx="60" cy="7" r="5" fill="#ff74ce"/>`:'';
    const hair=animal? '':`<path d="${hairPaths[hairStyle]}" fill="${p.hair}" stroke="${o}" stroke-width="3" stroke-linejoin="round"/><path d="M36 25 Q53 13 74 23" stroke="#fff" opacity=".13" stroke-width="4" stroke-linecap="round" fill="none"/>`;
    const faceMask=animal==='panda'?`<ellipse cx="43" cy="63" rx="12" ry="15" fill="#333047"/><ellipse cx="78" cy="63" rx="12" ry="15" fill="#333047"/>`:animal==='robot'?`<rect x="29" y="50" width="62" height="29" rx="10" fill="#345d78" stroke="#27506a"/>`:'';
    const eyeColor=animal==='robot'?'#9cffff':animal==='panda'?'#ffffff':'#24203b';
    const eye=`<g class="sf24-eyes" fill="${eyeColor}"><ellipse cx="44" cy="62" rx="6.2" ry="8.8"/><ellipse cx="77" cy="62" rx="6.2" ry="8.8"/></g><g fill="#fff"><ellipse cx="46" cy="59" rx="2" ry="2.8"/><ellipse cx="79" cy="59" rx="2" ry="2.8"/></g>`;
    const eyebrows=i%3===0?'M37 49 Q43 45 49 49 M71 49 Q77 45 83 49':'M37 50 Q43 47 49 50 M71 50 Q77 47 83 50';
    const mouth=i%4===0?'<ellipse cx="60" cy="84" rx="5" ry="6" fill="#823e60"/>':i%4===1?'<path d="M52 81 Q61 91 70 80" stroke="#8d4764" stroke-width="3" fill="none" stroke-linecap="round"/>':i%4===2?'<path d="M52 83 Q61 88 70 83" stroke="#8d4764" stroke-width="2.7" fill="none" stroke-linecap="round"/>':'<path d="M52 82 Q60 89 70 81 L70 86 Q61 93 52 86Z" fill="#a84f68"/>';
    const jacketType=i%4;
    const jacket=jacketType===0?`<path d="M35 108 L45 119 L42 146 L27 148Z M85 108 L74 119 L77 146 L93 148Z" fill="${p.bottom}" stroke="${o}" stroke-width="2.2"/><path d="M45 116 L60 136 L75 116" stroke="#ffffff55" stroke-width="2" fill="none"/>`:
       jacketType===1?`<path d="M33 111 L48 121 L48 149 L26 149Z M86 111 L72 121 L72 149 L94 149Z" fill="${p.bottom}" stroke="${o}" stroke-width="2.2"/><path d="M52 122 V149 M68 122 V149" stroke="#fff6" stroke-width="2"/>`:
       jacketType===2?`<path d="M28 116 Q60 108 92 116 L91 143 Q61 155 29 144Z" fill="${shirt}" stroke="${o}" stroke-width="2"/><path d="M44 130 H76" stroke="#fff7" stroke-width="3"/>`:
       `<path d="M31 109 L43 122 L29 140Z M89 109 L77 122 L91 140Z" fill="${p.bottom}" stroke="${o}" stroke-width="2"/><path d="M48 120 L60 136 L72 120" fill="none" stroke="${p.trim}" stroke-width="3"/>`;
    const emblem=['♫','✦','★','♥','✶','♪','☾','◆','●','♫','☽','✧'][i];
    const accessorySvg=accessory==='headphones'?`<path d="M24 61 Q18 18 60 17 Q101 18 97 61" fill="none" stroke="${o}" stroke-width="9"/><path d="M24 61 Q18 19 60 20 Q100 18 97 61" fill="none" stroke="${shirt}" stroke-width="5"/><rect x="18" y="54" width="13" height="27" rx="6" fill="url(#${id}metal)" stroke="${o}" stroke-width="3"/><rect x="91" y="54" width="13" height="27" rx="6" fill="url(#${id}metal)" stroke="${o}" stroke-width="3"/>`:
     accessory==='glasses'?`<rect x="33" y="55" width="22" height="17" rx="7" fill="#27294388" stroke="${o}" stroke-width="3"/><rect x="65" y="55" width="22" height="17" rx="7" fill="#27294388" stroke="${o}" stroke-width="3"/><path d="M55 60 Q60 55 65 60" stroke="${o}" stroke-width="3"/>`:
     accessory==='cap'?`<path d="M26 49 Q29 14 59 20 Q90 18 96 51Z" fill="${shirt}" stroke="${o}" stroke-width="3"/><path d="M42 51 Q81 40 107 52 Q73 61 39 54" fill="${p.trim}" stroke="${o}" stroke-width="2"/>`:'';
    return `<svg class="sf21-figure sf23-chibi sf24-illustrated" viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Personagem ilustrado">
      <defs><linearGradient id="${id}shirt" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff" stop-opacity=".28"/><stop offset=".48" stop-color="${shirt}"/><stop offset="1" stop-color="${shirt}"/></linearGradient><linearGradient id="${id}skin" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff" stop-opacity=".19"/><stop offset=".45" stop-color="${skin}"/><stop offset="1" stop-color="${skin}"/></linearGradient><linearGradient id="${id}metal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffffff"/><stop offset=".4" stop-color="${p.trim}"/><stop offset="1" stop-color="#46405a"/></linearGradient></defs>
      <ellipse cx="60" cy="153" rx="36" ry="5" fill="#05030e" opacity=".35"/>
      <g class="sf24-footwear" stroke="${o}" stroke-width="3" stroke-linejoin="round"><path d="M40 130 L39 147 Q27 146 25 153 Q39 159 54 153 L54 136Z" fill="${p.bottom}"/><path d="M67 136 L68 152 Q83 158 96 153 Q91 146 80 146 L79 129Z" fill="${p.bottom}"/><path d="M26 153 Q40 155 54 153 M68 153 Q83 155 95 153" stroke="#d7e6ff" stroke-width="2"/></g>
      <g class="sf24-arm-left"><path d="M37 110 Q21 115 19 130" stroke="${o}" stroke-width="14" fill="none" stroke-linecap="round"/><path d="M37 110 Q21 115 19 130" stroke="${shirt}" stroke-width="10" fill="none" stroke-linecap="round"/><circle cx="19" cy="130" r="6" fill="${skin}" stroke="${o}" stroke-width="2"/></g>
      <g class="sf24-arm-right"><path d="M83 110 Q98 114 101 128" stroke="${o}" stroke-width="14" fill="none" stroke-linecap="round"/><path d="M83 110 Q98 114 101 128" stroke="${shirt}" stroke-width="10" fill="none" stroke-linecap="round"/><circle cx="101" cy="128" r="6" fill="${skin}" stroke="${o}" stroke-width="2"/></g>
      <path d="M39 110 Q60 102 81 110 L93 144 Q60 158 27 144Z" fill="url(#${id}shirt)" stroke="${o}" stroke-width="3.5" stroke-linejoin="round"/>
      ${jacket}<path d="M49 109 L49 114 Q60 122 71 114 L71 107" fill="${skin}" stroke="${o}" stroke-width="2"/>
      <text x="60" y="140" text-anchor="middle" font-size="17" font-weight="900" font-family="system-ui,sans-serif" fill="${p.trim}" stroke="#0005" stroke-width=".5">${emblem}</text>
      ${ears}<g class="sf24-head"><ellipse cx="60" cy="61" rx="42" ry="47" fill="url(#${id}skin)" stroke="${o}" stroke-width="3.6"/>
      <ellipse cx="20" cy="67" rx="7" ry="10" fill="${skin}" stroke="${o}" stroke-width="2"/><ellipse cx="100" cy="67" rx="7" ry="10" fill="${skin}" stroke="${o}" stroke-width="2"/>
      ${faceMask}${hair}<path d="${eyebrows}" stroke="${o}" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      ${eye}<ellipse cx="34" cy="80" rx="8" ry="4" fill="#ff7da5" opacity=".32"/><ellipse cx="86" cy="80" rx="8" ry="4" fill="#ff7da5" opacity=".32"/>
      <path d="M59 69 Q57 77 61 77" fill="none" stroke="${o}" stroke-width="1.5" opacity=".4"/>${mouth}</g>
      ${accessorySvg}</svg>`;
  }
  window.SF24CharacterArt=Object.freeze({render});
})();
