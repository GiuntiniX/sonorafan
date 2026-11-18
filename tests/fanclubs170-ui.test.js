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
 assert.match(html,/sonorafan-community-71\.js\?v=180\.0/);
 assert.match(html,/sonorafan-community-71\.css\?v=180\.0/);
});

test('v180: cada tipo de publicação tem etiqueta, descrição e fundo próprio',()=>{
 const js=read('public/sonorafan-community-71.js');
 const css=read('public/sonorafan-community-71.css');
 for(const key of ['conversa','duvida','novidade','evento','ideia']){
   assert.match(js,new RegExp(key+':\\{icon:'));
   assert(css.includes('.sf180-type-'+key));
 }
 assert.match(js,/sf180-topic-label/);
 assert.match(js,/sf180-topic-preview/);
 assert.match(js,/data-sf180-filter/);
 assert.match(js,/sf180ForumCounts/);
 assert.match(js,/data-sf180-clear-filter/);
 assert.match(js,/sf180FeedSummary/);
});

test('v180: pesquisa, filtros e suporte a questões editadas são completos',()=>{
 const js=read('public/sonorafan-community-71.js');
 const api=read('fan-clubs-71.js');
 for(const key of ['duvida','evento','novidade','ideia','conversa','pinned','popular'])
   assert(js.includes('value="'+key+'"')||key==='popular'&&js.includes('value="popular"'));
 assert.match(js,/sf180-question-status/);
 assert.match(js,/sf180-best-answer/);
 assert.match(js,/data-sf180-resolve/);
 assert.match(js,/data-sf180-best-answer/);
 assert.match(js,/data-sf180-edit-post/);
 assert.match(api,/bestCommentId/);
 assert.match(api,/authorCanEdit/);
});

test('v180: edição da bio e das regras e administração com teto de dois',()=>{
 const js=read('public/sonorafan-community-71.js');
 const api=read('fan-clubs-71.js');
 assert.match(js,/data-sf180-edit-profile/);
 assert.match(js,/data-sf170-moderator/);
 assert.match(js,/2 vagas utilizadas/);
 assert.match(api,/app\.post\('\/api\/fan-clubs\/:id\/profile'/);
 assert.match(api,/canEditProfile/);
 assert.match(api,/next.length>2/);
 assert.match(api,/canDelete:ownerOrAdmin/);
});
