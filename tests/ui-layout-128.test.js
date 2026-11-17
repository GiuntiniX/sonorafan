'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const html = read('public/index.html');
const lobbyMenu = read('public/sonorafan-unified-125.js');
const lobbyPanel = read('public/sonorafan-lobby-107.js');
const roomStyles = read('public/sonorafan-room-queue-128.css');

test('v128: queue and action split use the original, unique functional IDs', () => {
  for (const id of [
    'sf113AddMusic', 'sf116Favorites', 'queueList', 'queueCount',
    'waitingQueueLabel', 'waitingQueueList', 'sf39QueueInsight',
    'sf52VoteStatus', 'sf5ListenersBody', 'sf5ListenersCount'
  ]) {
    assert.equal((html.match(new RegExp('id="' + id + '"', 'g')) || []).length, 1, id);
  }
  assert.match(html, /class="queue-column[^"]*sf128-queue"/);
  assert.match(html, /class="sf128-add-panel"/);
  assert.match(html, /class="sf128-queue-tracks"/);
  assert.match(html, /class="sf5-listening-card sf128-presence"/);
  assert.doesNotMatch(html, /Quem está ouvindo\?/);
});

test('v128: the current queue is rendered alongside the music action', () => {
  const room = html.split('<div class="queue-column sf33-queue-column sf34-queue sf128-queue">')[1]
    ?.split('<div class="player-column sf34-player-column">')[0];
  assert.ok(room, 'queue room markup');
  assert.ok(room.indexOf('sf128-add-panel') < room.indexOf('sf128-queue-tracks'));
  assert.ok(room.indexOf('id="sf113AddMusic"') < room.indexOf('id="queueList"'));
  assert.ok(room.indexOf('id="sf5ListenersBody"') < room.indexOf('id="queueList"'));
  assert.match(roomStyles, /grid-column:1 \/ 3!important/);
  assert.match(roomStyles, /@media\(max-width:768px\)/);
});

test('v128: no redundant library/favorites navigation in the lobby', () => {
  assert.doesNotMatch(lobbyMenu, /data-sf125-go="(?:library|favorites)"/);
  assert.doesNotMatch(lobbyPanel, /data-sf107="(?:library|favorites)"/);
  assert.match(lobbyMenu, /data-sf125-go="create-club"/);
  assert.match(lobbyPanel, /data-sf107="scroll">Ver salas/);
});

test('v128: late stylesheet override is loaded after the mobile fixes', () => {
  const mobile = html.indexOf('/sonorafan-mobile-126.css?v=126.1');
  const room = html.indexOf('/sonorafan-room-queue-128.css?v=128.1');
  assert.ok(mobile >= 0 && room > mobile);
  assert.match(roomStyles, /#sf113AddMusic/);
  assert.match(roomStyles, /#sf5ListenersBody/);
});
