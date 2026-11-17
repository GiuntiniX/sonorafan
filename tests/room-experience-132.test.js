'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const load=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=load('public/index.html');
const css=load('public/sonorafan-room-experience-132.css');

test('v132 landing preview uses the actual approved K-pop room image',()=>{
 const asset=path.join(root,'public/art-132/sonorafan-room-kpop.avif');
 const b=fs.readFileSync(asset);
 assert.ok(b.length>10000,'image has valid non-empty visual data');
 assert.equal(b.toString('ascii',4,12).slice(0,4),'ftyp','AVIF file signature');
 assert.match(html,/class="sf121-room-preview sf132-landing-preview"/);
 assert.match(html,/class="sf132-room-illustration" src="\/art-132\/sonorafan-room-kpop\.avif"/);
 assert.match(html,/sonorafan-room-experience-132\.css\?v=132/);
 assert.match(css,/#landingScreen\.sf121-home \.sf121-room-preview \.sf132-room-illustration/);
});
test('v132 room has one official queue, one song search and one favorite selector',()=>{
 const a=html.indexOf('<!-- ROOM -->');
 const b=html.indexOf('<!-- CREATE ROOM -->',a);
 assert.ok(a>=0&&b>a);
 const room=html.slice(a,b);
 for(const id of ['queueList','queueCount','waitingQueueList','sf113AddMusic','sf116Favorites',
   'playerSection','youtube-player','chatMessages','chatInput','sf5ListenersBody']){
    assert.equal((room.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 }
 assert.ok(room.indexOf('id="sf113AddMusic"')<room.indexOf('id="queueList"'));
 assert.match(room,/id="sf116Favorites"[^>]*hidden/);
 assert.match(room,/id="sf113AddMusic"[^>]*aria-haspopup="dialog"/);
 const unified=load("public/sonorafan-mobile-music-76.js");
 assert.match(unified,/window\.sf76OpenMusic=open/);
 assert.match(unified,/\[data-sf76-tab\]/);
 assert.match(unified,/window\.sf80QueueSong\(song\)/);
 const js=load('public/sonorafan-room-redesign-113.js');
 assert.match(js,/\$\('sf113AddMusic'\)\?\.addEventListener\('click', openSongSearch\)/);
 assert.match(html,/function addFavoriteToQueue\(id\)/);
 assert.match(html,/socket\.emit\('addSong', \{ id: fav\.id, title: fav\.title, artist: fav\.artist, duration: null \}\)/);
});
test('v132 three-column room remains themed and keeps existing mobile tabs',()=>{
 assert.match(css,/grid-template-columns:var\(--sf132-queue-width\) minmax\(0,1fr\) var\(--sf132-chat-width\)/);
 assert.match(css,/#roomLayout > \.queue-column\.sf128-queue/);
 assert.match(css,/grid-column:1!important;grid-row:1!important/);
 assert.match(css,/#roomLayout > \.player-column\.sf34-player-column/);
 assert.match(css,/grid-column:2!important;grid-row:1!important/);
 assert.match(css,/#roomLayout \.chat-column\.sf34-chat/);
 assert.match(css,/grid-column:3!important;grid-row:1!important/);
 assert.match(css,/@media\(max-width:768px\)/);
 assert.match(css,/--sf113-stroke/);
 assert.match(load('public/sonorafan-room-redesign-113.css'),/body\[data-tab="queue"\]/);
});
