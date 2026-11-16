'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const css = readFileSync(join(__dirname, '../public/sonorafan-room-redesign-113.css'), 'utf8');
const html = readFileSync(join(__dirname, '../public/index.html'), 'utf8');
const fix = css.slice(css.indexOf('/* SonoraFan 114 — correção do chat: rolagem única e composer ancorado. */'));

test('chat retains original real-time message and composer ids', () => {
  assert.ok(fix.length > 1000, 'chat layout correction was loaded');
  for (const id of ['chatMessages', 'chatMessagesInner', 'chatInput', 'newMsgPill', 'typingIndicator', 'emojiPanel', 'sf53ReplyPreview']) {
    assert.ok(html.includes('id="' + id + '"'), id);
  }
});

test('single scroll container: inner message list scrolls, outer wrapper clips', () => {
  assert.match(fix, /\.chat-messages\s*\{[^}]*overflow:hidden!important/s);
  assert.match(fix, /\.chat-messages-inner\s*\{[^}]*overflow-y:auto!important/s);
  assert.match(fix, /\.chat-panel\s*\{[^}]*min-height:0!important;[^}]*overflow:hidden!important/s);
});

test('mobile chat has a viewport-bound height rather than the prior auto/visible values', () => {
  assert.match(fix, /body\[data-tab="chat"\] #screen-room\.sf113-room \.chat-column\.sf34-chat\s*\{[^}]*height:max\(235px,calc\(100dvh/s);
  assert.match(fix, /body\[data-tab="chat"\] #screen-room\.sf113-room \.chat-column\.sf34-chat\s*\{[^}]*overflow:hidden!important/s);
  assert.match(fix, /body\.sf93-keyboard-open\[data-tab="chat"\][^\{]*\{[^}]*--sf93-visible-height/s);
});

test('composer remains visible and separate from messages scroll area', () => {
  assert.match(fix, /\.chat-input-bar\s*\{[^}]*flex:0 0 auto!important/s);
  assert.match(fix, /\.chat-input-bar input\s*\{[^}]*min-width:0!important/s);
});
