'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', 'public');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'sonorafan-room-redesign-113.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'sonorafan-room-redesign-113.js'), 'utf8');

test('room redesign is loaded and does not remove core realtime elements', () => {
  assert.match(html, /id="screen-room" data-sf113-view="visual"/);
  for (const asset of ['sonorafan-room-redesign-113.css', 'sonorafan-room-redesign-113.js']) {
    assert.ok(html.includes('/' + asset + '?v='), asset);
  }
  for (const id of ['youtube-player', 'queueList', 'chatMessagesInner', 'sf5ListenersBody', 'sf88RoomThemeButton', 'volumeSlider', 'sf113VisualStage']) {
    assert.ok(html.includes('id="' + id + '"'), id);
  }
});

test('visual and video modes remain local presentation choices', () => {
  assert.match(js, /localStorage\.setItem\(KEY, mode\)/);
  assert.match(js, /screen\.setAttribute\('data-sf113-view', mode\)/);
  assert.match(css, /data-sf113-view="video"/);
  assert.match(css, /data-sf113-view="visual"/);
  assert.doesNotMatch(js, /\b(?:pauseVideo|playVideo|loadVideoById|socket\.emit)\s*\(/);
});

test('room has only listening-related navigation; clubs stay outside', () => {
  assert.doesNotMatch(html, /<nav class="sf113-nav"/);
  assert.match(html, /id="sf116MoreButton"/);
  assert.match(html, /id="sf113AddMusic"/);
  assert.match(html, /id="sf116Favorites"/);
  assert.doesNotMatch(html, /id="sf74OpenFanClubs"/);
  assert.match(css, /#sf82Explore/);
  assert.match(css, /#sf82FindFans/);
});

test('existing themed illustrations and mobile tabs remain supported', () => {
  assert.match(css, /--sf88-art/);
  assert.match(css, /--sf88-primary/);
  assert.match(css, /--sf88-secondary/);
  assert.match(css, /body\[data-tab="player"\]/);
  assert.match(css, /body\[data-tab="queue"\]/);
  assert.match(css, /body\[data-tab="chat"\]/);
});
