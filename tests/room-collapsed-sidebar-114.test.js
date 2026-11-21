'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '../public');
const css = fs.readFileSync(path.join(root, 'sonorafan-room-redesign-113.css'), 'utf8');
const old = fs.readFileSync(path.join(root, 'sonorafan-ui-65.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const marker = '/* SonoraFan 114.1 — compatibilidade com estado legado de menu lateral recolhido.';
const patch = css.slice(css.indexOf(marker));

test('regression: collapsed old sidebar cannot zero the new room grid column', () => {
  assert.match(old, /body\.sf64-room-sidebar-collapsed #screen-room \.app\s*\{[^}]*grid-template-columns:\s*0 minmax\(0,1fr\)\s*!important/s);
  assert.ok(patch.length > 500, 'v114.1 compatibility patch is loaded');
  assert.match(patch, /body\.sf64-room-sidebar-collapsed #screen-room\.sf113-room > \.app/);
  assert.match(patch, /grid-template-columns:minmax\(0,1fr\)!important/);
  assert.match(patch, /\.app > \.room-layout\s*\{/);
  assert.match(patch, /grid-column:1\/-1!important/);
});

test('legacy sidebar reveal shortcut stays hidden in top-nav room', () => {
  assert.match(patch, /#sf64RoomSidebarShow/);
  assert.match(patch, /visibility:hidden!important/);
  assert.match(css, /#screen-room\.sf113-room #sf64RoomSidebar\{display:none!important\}/);
});

test('room CSS is cache-busted in HTML and video/chat IDs remain untouched', () => {
  assert.match(html, /sonorafan-room-redesign-113\.css\?v=187\\.1/);
  assert.match(html, /id="screen-room" data-sf113-view="visual"/);
  for(const id of ['youtube-player','chatMessagesInner','chatInput','queueList','sf113VisualStage']){
    assert.ok(html.includes('id="' + id + '"'), id);
  }
});

test('single column layout remains scoped to the room, including mobile', () => {
  assert.match(patch, /@media\(max-width:768px\)/);
  assert.match(patch, /grid-template-rows:56px minmax\(0,1fr\) auto!important/);
  assert.doesNotMatch(patch, /#screen-lobby|#landingScreen/);
});
