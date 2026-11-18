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
 assert.match(html,/sonorafan-community-71\.js\?v=600\.0/);
 assert.match(html,/sonorafan-community-71\.css\?v=600\.0/);
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

test('Forum 6.0 has stable topic routes, nested replies, quotes, tags and follow-up actions',()=>{
 const js=read('public/sonorafan-community-71.js');
 const api=read('fan-clubs-71.js');
 for(const name of ['sf600-topic-title','sf600-tags','sf600-favorite','sf600-unread','sf600-topic-detail',
   'data-sf600-open','data-sf600-share','data-sf600-reply-to','data-sf600-quote','sf600-related','sf600-back']){
   assert(js.includes(name),'missing '+name);
 }
 assert(js.includes("'#fanclub/'"),'permanent hash links are required');
 assert(js.includes('handleForumRoute'),'browser deep links need restoration');
 assert(js.includes('searchForum'),'history search should be server-backed');
 assert(api.includes("'/api/fan-clubs/:id/forum/search'"));
 assert(api.includes("'/api/fan-clubs/:id/posts/:postId/favorite'"));
 assert(api.includes("'/api/fan-clubs/:id/posts/:postId/related'"));
 assert(api.includes('forumTitle'),'legacy titles must be derived');
 assert(api.includes('parentId'),'thread references must persist');
 assert(api.includes('quoteText'),'quotations must be preserved');
});
test('Forum 6.0 keeps legacy Fan Club identity, five categories and separate music rooms',()=>{
 const js=read('public/sonorafan-community-71.js');
 const api=read('fan-clubs-71.js');
 const css=read('public/sonorafan-community-71.css');
 assert(js.includes('sf170CommunityAside'));
 assert(js.includes('data-sf180-edit-profile'));
 assert(api.includes('next.length>2'));
 for(const t of ['conversa','duvida','novidade','evento','ideia'])assert(js.includes(t+':{icon:'));
 assert.doesNotMatch(js,/data-sf140-share-song|data-sf150-music-filter|musicCard\(/);
 assert(css.includes('.sf600-topic-detail'));
 assert(css.includes('.sf600-reply'));
 assert(css.includes('background:#352441'));
});
