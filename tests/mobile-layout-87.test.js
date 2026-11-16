'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=filename=>fs.readFileSync(path.join(__dirname,'..',filename),'utf8');

test('every stylesheet is loaded in head before visible markup (no FOUC)',()=>{
 const html=read('public/index.html');
 const head=html.slice(0,html.indexOf('</head>'));
 const body=html.slice(html.indexOf('<body>'));
 const links=/<link\b[^>]*\brel=["']stylesheet["'][^>]*>/gi;
 assert.ok([...head.matchAll(links)].length>=44,'expected consolidated initial stylesheet list');
 assert.equal([...body.matchAll(links)].length,0,'stylesheets after body paint cause flash and layout shift');
 assert.match(head,/sonorafan-layout-fix-87\.css/);
});

test('mobile does not show oversized legacy song form',()=>{
 const css=read('public/sonorafan-layout-fix-87.css');
 assert.match(css,/@media\(max-width:768px\)[\s\S]*#screen-room #sf10RequestCard\{display:none!important\}/);
 const html=read('public/index.html');
 assert.match(html,/class="sf34-add-mobile"/);
 assert.match(html,/sf76OpenMusic/);
});

test('music discovery sends to shared queue, favorite remains optional',()=>{
 const music=read('public/sonorafan-evolution-63.js');
 const discovery=read('public/sonorafan-discovery-70.js');
 assert.match(music,/await window\.sf80QueueSong\(track\)/);
 assert.match(music,/const result=await window\.sf80QueueSong\(track\)/);
 assert.match(discovery,/data-sf70-favorite/);
 assert.match(discovery,/event\.target\.closest\('#sf63MusicResults \[data-sf70-favorite\]'\)/);
 assert.doesNotMatch(discovery,/if \(inFavoritesList\)/);
});

test('queue is rendered without waiting for YouTube iframe',()=>{
 const index=read('public/index.html');
 const start=index.indexOf('function syncPlayer(state)');
 const end=index.indexOf('function updateNextTrack',start);
 assert.ok(start!==-1&&end>start);
 const body=index.slice(start,end);
 const render=body.indexOf('renderQueue(');
 const guard=body.indexOf('if (!player || !player.loadVideoById) return;');
 assert.ok(render>=0&&guard>render,'renderQueue must happen before player initialization guard');
});
