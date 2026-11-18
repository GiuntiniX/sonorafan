'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');

test('Fan Club usa o espaço lateral para ideias e enquetes, não para salas',()=>{
 const js=read('public/sonorafan-community-71.js');
 assert.match(js,/id="sf170CommunityAside"/);
 assert.match(js,/Ideias dos fãs/);
 assert.match(js,/Enquetes em destaque/);
 assert.doesNotMatch(js,/<h4>Salas do Fan Club<\/h4>/);
 assert.match(js,/data-sf170-new-idea/);
 assert.match(js,/data-sf170-vote-idea/);
 assert.match(js,/data-sf160-vote/);
});

test('Fan Clubs mantêm seções próprias sem compartilhar músicas ou mixtapes',()=>{
 const js=read('public/sonorafan-community-71.js');
 const studio=read('public/sonorafan-studio-100.js');
 assert.match(js,/\['mural','Mural'\]/);
 assert.match(js,/\['events','Eventos'\]/);
 assert.match(js,/\['members','Membros'\]/);
 assert.match(js,/data-sf170-create-event/);
 assert.match(js,/data-sf170-moderator/);
 assert.doesNotMatch(js,/data-sf140-share-song|musicCard\(|data-sf150-music-filter/);
 assert.doesNotMatch(studio,/mix-club|Enviar ao Fan Club/);
});

test('Imagens, ideias e notificações não dependem de serviços externos',()=>{
 const js=read('public/sonorafan-community-71.js');
 const api=read('fan-clubs-71.js');
 assert.match(js,/compressPostPhoto/);
 assert.match(js,/sf170PostImage/);
 assert.match(js,/data-sf170-notifications/);
 assert.match(api,/app\.post\('\/api\/fan-clubs\/:id\/notifications'/);
 assert.match(api,/app\.post\('\/api\/fan-clubs\/:id\/ideas'/);
 assert.match(api,/postImages/);
 assert.match(api,/notificationMutedIds/);
});

test('Guide atual, responsividade e controle de foco estão preservados',()=>{
 const css=read('public/sonorafan-community-71.css');
 const html=read('public/index.html');
 assert.match(css,/#sf71ClubDetail \.sf170-community-aside/);
 assert.match(css,/#caff00/);
 assert.match(css,/@media\(max-width:900px\)/);
 assert.match(css,/:focus-visible/);
 assert.match(html,/sonorafan-community-71\.js\?v=170\.0/);
 assert.match(html,/sonorafan-community-71\.css\?v=170\.0/);
});
