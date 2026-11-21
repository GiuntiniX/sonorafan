'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('mural sidebar shows featured poll before trending topics, using the existing poll component',()=>{
 const js=read('public/sonorafan-community-71.js');
 const start=js.indexOf('function renderSocialWidgets()');
 const end=js.indexOf('function renderFeed()',start);
 assert.ok(start>=0&&end>start);
 const widget=js.slice(start,end);
 assert.match(widget,/featuredPoll=/);
 assert.match(widget,/state\.polls/);
 assert.match(widget,/pollCard\(featuredPoll,true\)/);
 assert.ok(widget.indexOf('Enquete em destaque')<widget.indexOf('Tópicos em alta'));
 assert.match(widget,/data-sf160-create-poll/);
 assert.match(widget,/goto\('polls','Ver todas'\)/);
});
test('sidebar uses the same vote handler, then refreshes poll and widgets',()=>{
 const js=read('public/sonorafan-community-71.js');
 assert.match(js,/data-sf160-vote/);
 assert.match(js,/await post\('\/api\/fan-clubs\/'\+encodeURIComponent\(id\)\+'\/polls\/'/);
 assert.match(js,/await loadExtras\(id\)/);
 assert.match(js,/renderExtras\(\);renderCommunityAside\(\);renderSocialWidgets\(\)/);
});
test('new highlighted poll stylesheet is responsive and loaded fresh',()=>{
 const html=read('public/index.html'),css=read('public/sonorafan-fanclub-social-227.css');
 assert.match(html,/sonorafan-community-71\.js\?v=232\.0/);
 assert.match(html,/sonorafan-fanclub-social-227\.css\?v=232\.0/);
 assert.match(css,/\.sf232-poll-intro/);
 assert.match(css,/#sf227Right \.sf231-poll \.sf231-poll-choice/);
 assert.match(css,/@media\(max-width:800px\)/);
});
