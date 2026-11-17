'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');

test('owner-only playlist respects selection at creation and storage', () => {
  const server = read('server.js');
  assert.match(server, /room\.musicMode = cfg\.addMode === 'owner' \? 'owner' : 'fair'/);
  assert.match(server, /Object\.assign\(room, \{ color: cfg\.color, emoji: cfg\.emoji, description: cfg\.description, slowMode: cfg\.slowMode, addMode: cfg\.addMode \}\)/);
  assert.match(server, /addMode: r\.addMode/);
  assert.match(server, /addMode: room\.addMode/);
  assert.match(server, /persistRoom\(room\)/);
});
test('the server, not just a disabled button, prevents guests from adding', () => {
  const server = read('server.js');
  const add = server.split("socket.on('addSong'")[1]?.split("socket.on('likeMessage'")[0];
  assert.ok(add, 'addSong handler');
  assert.match(add, /room\.addMode === 'owner' \|\| room\.musicMode === 'owner'/);
  assert.match(add, /socket\.userEmail === room\.ownerEmail/);
  assert.match(add, /if \(!authorized\)/);
  const skip = server.split("socket.on('voteSkip'")[1]?.split("socket.on('setMusicMode'")[0];
  assert.match(skip, /room\.ownerEmail \? socket\.userEmail !== room\.ownerEmail/);
});
test('both create and edit read mode from selected configuration', () => {
  const html = read('public/index.html');
  const script = html.slice(html.indexOf('function renderCfg('),html.indexOf('async function emitJoin(',html.indexOf('function renderCfg(')));
  assert.match(script, /sf129-mode-picker/);
  assert.match(script, /pick\('addMode','owner'\)/);
  assert.match(script, /addMode: s\.addMode === 'owner' \? 'owner' : 'all'/);
  assert.match(script, /renderCfg\('editCfg', 'e',/);
});
test('owner permission respects the actual socket account and does not leak email', () => {
  const server = read('server.js');
  const handler = server.split("socket.on('getPlaylistPermission'")[1]?.split("socket.on('addSong'")[0];
  assert.ok(handler);
  assert.match(handler, /room\.ownerEmail === socket\.userEmail/);
  assert.match(handler, /canAdd: !ownerOnly \|\| isOwner/);
  assert.doesNotMatch(handler, /ownerEmail:/);
  const client = read('public/sonorafan-room-permissions-129.js');
  assert.match(client, /getPlaylistPermission/);
  assert.match(client, /roomState/);
  assert.match(client, /button\.disabled = locked/);
});
test('login stays compact and illustration stays resolution-independent', () => {
  const html = read('public/index.html');
  const css = read('public/sonorafan-creation-auth-129.css');
  const art = read('public/art-129/sonorafan-stage.svg');
  assert.match(html,/sonorafan-creation-auth-129\.css\?v=129/);
  assert.match(html,/sonorafan-room-permissions-129\.js\?v=129/);
  assert.match(html,/art-129\/sonorafan-stage\.svg/);
  assert.match(css, /min-height:49px!important/);
  assert.match(css, /width:min\(100%,420px\)!important/);
  assert.match(art, /<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(art, /viewBox="0 0 1600 1200"/);
});
