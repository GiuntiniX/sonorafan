'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const {AVATAR_CATALOG,AVATAR_IDS}=require('../avatar-catalog-60');
const {AVATARS}=require('../sonorafan-profile-108');
const {NEW_BADGES,publicSnapshot,applyAction}=require('../gamification-45');

test('Perfil 6.0: forty original project-hosted avatars including legacy selection',()=>{
 assert.equal(AVATAR_CATALOG.length,40);
 assert.equal(new Set(AVATAR_IDS).size,40);
 assert.deepEqual(AVATAR_IDS,AVATARS);
 for(const id of ['indie','rock','trans-futurista','nao-binario','agenero','robo-dj','androide','ciborgue','funkeiro','funkeira','havaiano','tropical','punk']){
   assert(AVATAR_IDS.includes(id),'Missing '+id);
 }
 for(const character of AVATAR_CATALOG){
   assert(/^[a-z0-9-]+$/.test(character.id));
   assert(typeof character.label==='string'&&character.label.length>1);
   assert(typeof character.description==='string'&&character.description.length>8);
   assert(['identity','music','brazil','future','fantasy','creative'].includes(character.category));
   const svg=read('public/avatars-108/'+character.id+'.svg');
   assert(svg.includes('<svg'),character.id);
   assert(svg.includes('<title')||svg.includes('aria-label='),character.id+' accessible title missing');
   assert(!/<script|onload\s*=|<foreignObject|<image\s+href=/i.test(svg),'SVG must be local/vector-only: '+character.id);
 }
});

test('Perfil 6.0: server validates 40 avatars but never accepts arbitrary paths',()=>{
 const server=read('sonorafan-profile-108.js');
 assert(server.includes("require('./avatar-catalog-60')"));
 assert(server.includes("'/api/profile108/characters'"));
 assert(server.includes('AVATARS.includes(req.body?.id)'));
 assert(server.includes("AVATAR_CATALOG"));
 assert(server.includes("if(!email)return"));
 assert(!AVATAR_IDS.includes('../../evil.svg'));
});

test('Perfil 6.0: original inclusive avatar studio provides filters, search and local art',()=>{
 const client=read('public/sonorafan-profile-108.js');
 assert(client.includes('/api/profile108/characters'));
 assert(client.includes('sf600AvatarCategory'));
 assert(client.includes('sf600AvatarSearch'));
 assert(client.includes('sf600AvatarCount'));
 assert(client.includes('renderAvatarCatalog'));
 assert(client.includes('chooseAvatar'));
 assert(client.includes('state.avatarItems'));
 assert(client.includes('/avatars-108/'));
 assert(client.includes("aria-pressed="));
 assert(client.includes('loading="lazy"'));
});

test('Perfil 6.0: Conquistas is unified as Minha Jornada inside Profile',()=>{
 const client=read('public/sonorafan-profile-library-112.js');
 const compat=read('public/sonorafan-club-45.js');
 const html=read('public/index.html');
 assert(client.includes("['achievements','✦ Minha Jornada']"));
 assert(client.includes('sf600Journey'));
 assert(client.includes("'/api/ranking60/me'"));
 assert(client.includes("'/api/fan-clubs?mine=true'"));
 assert(client.includes('sf600Community'));
 assert(client.includes("['avatars','◉ Avatares']"));
 assert(client.includes('sf600-specializations'));
 assert(client.includes('sf600-missions'));
 assert(client.includes('sf600-medals'));
 assert(client.includes('sf600-recent'));
 assert(client.includes("'/api/ranking60/preferences'"));
 assert(client.includes("window.sf60Ranking?.open?.()"));
 assert(compat.includes("window.sf112OpenProfile('achievements')"));
 assert(!html.includes('Abrir SonoraFan Club ↗'));
 assert(html.includes('Ver Conquistas e Minha Jornada'));
 assert(html.includes('sonorafan-profile-60.css?v=601.0'));
 assert(html.includes('sonorafan-profile-108.js?v=601.0'));
});

test('Perfil 6.0: no new gamification collection, XP/medals/missions persist',()=>{
 const snapshot=publicSnapshot({points:100,badges:['DJ Lendário','Primeiro Play'],gamification:{
   lifetime:{songs:30,rooms:10,votes:3,likes:2,clubs:4}
 }},new Date('2026-11-18T13:00:00Z'));
 assert.equal(snapshot.points,100);
 assert(snapshot.badges.includes('DJ Lendário'));
 assert(snapshot.achievements.some(a=>a.name==='Curador Musical'&&a.at===25&&a.unlocked));
 assert(snapshot.badges.includes('Curador Musical'),'validated legacy progress should unlock new cosmetic badges on read');
 assert(snapshot.achievements.some(a=>a.name==='Conector de Fãs'&&a.at===5));
 assert(snapshot.missions.some(m=>m.period==='weekly'));
 assert(NEW_BADGES.length>=14);
 const next=applyAction({points:100,badges:['DJ Lendário'],gamification:{lifetime:{songs:24}}},'song','track-id',new Date('2026-11-18T13:00:00Z'));
 assert(next.changed);
 assert(next.data.badges.includes('DJ Lendário'));
 assert(next.data.badges.includes('Curador Musical'));
});

test('Perfil 6.0: tab layout respects guide, full-screen mobile and reduced motion',()=>{
 const css=read('public/sonorafan-profile-60.css');
 for(const term of ['sf112-tab-achievements','sf112-tab-community','sf112-tab-avatars',
   '#C8FF00','sf600-journey-hero','sf600-avatar-controls','max-width:760px','prefers-reduced-motion',':focus-visible']){
   assert(css.includes(term),term);
 }
 assert(css.includes('sf600-missions'));
});

test('Perfil: avatar preview and actions stay together without detached CTA',()=>{
 const js=read('public/sonorafan-profile-108.js');
 const css=read('public/sonorafan-profile-60.css');
 assert(js.includes('class="sf108-avatar-summary"'));
 assert(js.includes('class="sf108-avatar-summary-copy"'));
 assert(js.includes('Sua imagem atual'));
 assert(js.includes('Enviar minha foto'));
 assert(js.includes('Escolher personagem'));
 assert(js.includes('sf108GalleryHeading'));
 assert(!js.includes('id="sf108EditAvatar"'),'old detached bottom button removed');
 assert(js.includes("window.sf112OpenProfile('avatars')"));
 assert(js.includes('chooseAvatar'));
 assert(js.includes('sf108FileInput'));
 for(const selector of [
   '.sf108-avatar-summary','.sf108-avatar-choices','.sf108-studio-left',
   '.sf108-studio-right','#sf108AvatarPreview','#sf108DefaultAvatar',
   '.sf108-avatar-grid','.sf108-identity'
 ]){
   assert(css.includes(selector),'Missing profile layout '+selector);
 }
 assert(css.includes('align-content:start'),'avatar action layout must not stretch across available height');
 assert(css.includes('grid-row:auto!important'),'preview must not span artificial grid rows');
 assert(css.includes('.sf112-tab-profile #sf108Studio'),'avatar studio belongs in its own tab');
 assert(css.includes('max-width:390px'),'compact mobile portrait layout');
});

test('Perfil: avatar changes preserve authenticated upload and selected gallery character',()=>{
 const js=read('public/sonorafan-profile-108.js');
 assert(js.includes("api('/api/profile108/avatar'"));
 assert(js.includes('state.avatar=response.avatar;syncAvatar()'));
 assert(js.includes('state.avatar=res.avatar;syncAvatar()'));
 assert(js.includes("window.sf112SwitchProfileTab?.('avatars')"));
 assert(js.includes("aria-pressed="));
 assert(js.includes('loading="lazy"'));
});
