'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { decodeYouTubeEntities } = require('../youtube-utils-81');

const read = name => fs.readFileSync(path.join(__dirname,'..',name),'utf8');

test('YouTube API search titles show correct accents and quotes', () => {
  assert.equal(decodeYouTubeEntities('Rock &amp; Roll &quot;Live&quot;'),'Rock & Roll "Live"');
  assert.equal(decodeYouTubeEntities('Jo&#227;o &apos;ao vivo&apos;'),"João 'ao vivo'");
  assert.equal(decodeYouTubeEntities('Banda &#x1F3B5;'), 'Banda 🎵');
  assert.equal(decodeYouTubeEntities('Música sem entidades'),'Música sem entidades');
  assert.equal(decodeYouTubeEntities('Incompleto &unknown;'),'Incompleto &unknown;');
});
test('desktop quick select remains separate from full search', () => {
  const fast = read('public/sonorafan-inline-search-78.js');
  const quick = read('public/sonorafan-quick-add-81.js');
  const html = read('public/index.html');
  assert.match(fast,/window\.sf81QuickSelect\(track\)/);
  assert.match(quick,/window\.sf80QueueSong\(chosen\)/);
  assert.match(quick,/window\.sf78SearchFromField/);
  assert.match(fast,/window\.sf77OpenSearch/);
  assert.match(html,/\/sonorafan-quick-add-81\.js/);
  assert.match(html,/\/sonorafan-quick-add-81\.css/);
});
test('server explicitly accepts or rejects queue request to originating socket', () => {
  const code=read('server.js');
  const start=code.indexOf("socket.on('addSong'");
  const end=code.indexOf("socket.on('likeMessage'",start);
  assert.ok(start>0&&end>start);
  const handler=code.slice(start,end);
  assert.match(handler,/socket\.on\('addSong', \(song, acknowledge\)/);
  assert.match(handler,/reply\(false/);
  assert.match(handler,/reply\(true, \{ placement: 'queue' \}\)/);
  assert.match(handler,/reply\(true, \{ placement: 'waiting' \}\)/);
  assert.match(handler,/broadcastState\(currentRoom\)/);
});
test('PWA and queue discovery assets referenced after original application',()=>{
  const html=read('public/index.html');
  assert.match(html,/sonorafan-queue-discovery-82\.js/);
});

test('single listener cannot skip shared room by reporting an early video end',()=>{
 const code=read('server.js');
 assert.match(code,/if \(!reportedId \|\| reportedId !== activeId\) return/);
 assert.match(code,/room\.listenerCount > 1 && !socket\.isAdmin && getPosition\(room\) < duration - 7/);
});
