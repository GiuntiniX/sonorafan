'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const server=read('server.js');
const notifications=read('public/social-stage3.js');
const lobby=read('public/sonorafan-lobby-107.js');
const css=read('public/sonorafan-notifications-111.css');
const html=read('public/index.html');

test('individual X is available in notification center and lobby, with correct action',()=>{
 assert.match(notifications,/sf111-dismiss/);
 assert.match(notifications,/setAttribute\('aria-label','Remover notificação:/);
 assert.match(notifications,/dismissOne\(a\.id\)/);
 assert.match(notifications,/window\.sf15DismissNotification=id=>dismissOne\(id\)/);
 assert.match(lobby,/data-sf111-dismiss/);
 assert.match(lobby,/removeNotice\.dataset\.sf111Dismiss/);
 assert.match(css,/\.sf111-dismiss\{/);
 assert.match(css,/\.sf111-lobby-dismiss\{/);
});
test('clear-all operates across filters and updates badge and lobby count',()=>{
 assert.match(notifications,/sf111-clear-all/);
 assert.match(notifications,/post\('\/api\/social\/notifications\/dismiss',\{all:true\}\)/);
 assert.match(notifications,/state\.alerts=\[\]/);
 assert.match(notifications,/renderBadge\(\)/);
 assert.match(notifications,/sf111:updated/);
 assert.match(css,/\.sf111-clear-all\{/);
 assert.match(lobby,/document\.addEventListener\('sf111:updated'/);
});
test('authenticated server dismissal persists while keeping message records unchanged',()=>{
 assert.match(server,/app\.post\('\/api\/social\/notifications\/dismiss'/);
 const begin=server.indexOf("app.post('/api/social/notifications/dismiss'");
 const end=server.indexOf("app.post('/api/social/invite-friend'",begin);
 assert.ok(begin>=0&&end>begin);
 const endpoint=server.slice(begin,end);
 assert.match(endpoint,/const email=sessionEmail\(req\)/);
 assert.match(endpoint,/sf15WriteAlerts\(email,remaining\)/);
 assert.match(endpoint,/type:'event_hidden'/);
 assert.match(endpoint,/req\.body\?\.all===true/);
 assert.match(server,/dismissedIds\.has\('hidden-'\+x\.id\)/);
 assert.doesNotMatch(endpoint,/deleteUser|deleteMessage|delete.*room|collection\('messages'\)/);
});
test('updated assets are loaded and scripts pass syntax checks',()=>{
 assert.match(html,/social-stage3\.js\?v=187\.0/);
 assert.match(html,/sonorafan-lobby-107\.js\?v=187\.0/);
 assert.match(html,/sonorafan-notifications-111\.css\?v=187\.0/);
 assert.doesNotThrow(()=>new Function(notifications));
 assert.doesNotThrow(()=>new Function(lobby));
});
