'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
test('private chat persists a verified sender for the direct inbox link',()=>{
 const server=src('server.js'),dm=src('chat-social-53.js');
 assert.match(dm,/peerId:req\.chat53Id/);
 assert.match(dm,/if\(can\.notify\) sf15Notify/);
 assert.match(server,/peerId:typeof data\.peerId/);
 assert.match(server,/\/\^\[a-f0-9\]\{24\}\$\//);
});
test('mentions and quoted replies target authenticated room participants',()=>{
 const server=src('server.js');
 assert.match(server,/so\.sfSocialRoom!==currentRoom/);
 assert.match(server,/so\.userEmail===socket\.userEmail/);
 assert.match(server,/type:'mention',title:\(isReply\?'Resposta de ':'Menção de '/);
 assert.match(server,/messageId:msg\._id/);
});
test('realtime notification only signals the destination user, not the whole room',()=>{
 const server=src('server.js');
 assert.match(server,/io\.to\('sf53-user-'\+sf15UserKey\(email\)\)\.emit\('sf111Notification'/);
 assert.doesNotMatch(server,/io\.emit\('sf111Notification'/);
});
test('lobby badge, detailed filters and read receipts reuse one trusted feed',()=>{
 const lobby=src('public/sonorafan-lobby-107.js');
 const center=src('public/social-stage3.js');
 const chat=src('public/sonorafan-chat-53.js');
 assert.match(lobby,/id="sf107NoticeButton"/);
 assert.match(lobby,/sf111:updated/);
 assert.match(lobby,/sf15OpenNotification/);
 for(const tab of ['message','mention','other'])assert.ok(center.includes("['"+tab+"',"));
 assert.match(center,/\/api\/social\/notifications\/read/);
 assert.match(center,/window\.sf15MarkPrivateRead/);
 assert.match(chat,/window\.sf15MarkPrivateRead/);
 assert.match(center,/window\.sf53OpenInbox\?\.\(a\.peerId\)/);
});
