'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const EventEmitter = require('node:events');

function setup({ connected = true, room = 'indie', queue = [], waitingQueue = [], addError = null, confirm = true, maxDuration = 600, allowLive = false, lastAdd = 0 } = {}) {
  const channel = new EventEmitter();
  channel.connected = connected;
  channel.emit = function(event, ...args) {
    if (event === 'addSong') {
      const song = args[0];
      if (addError) EventEmitter.prototype.emit.call(channel, 'error', addError);
      else if (confirm) EventEmitter.prototype.emit.call(channel, 'roomState', { slug: room, queue: [...queue, song], waitingQueue });
      return true;
    }
    return EventEmitter.prototype.emit.call(channel, event, ...args);
  };
  let cooldownCount = 0;
  const ctx = {
    window: {}, socket: channel, currentRoom: room, currentRoomData: { queue, waitingQueue, maxDuration, allowLive },
    lastAddTime: lastAdd, COOLDOWN: 30000, Date, setTimeout, clearTimeout, Error,
    startCooldown() { cooldownCount++; },
    document: { getElementById(id) { return id === 'screen-room' ? { classList: { contains: () => Boolean(room) } } : null; } }
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/sonorafan-queue-80.js'), 'utf8'), ctx);
  return { add: ctx.window.sf80QueueSong, channel, ctx, cooldownCount: () => cooldownCount };
}
const song = { id: 'abcdefghijk', title: 'Música', artist: 'Artista', duration: 240 };

test('only confirms success after the roomState contains the requested song', async () => {
  const s = setup();
  await s.add(song);
  assert.equal(s.cooldownCount(), 1);
  assert.ok(s.ctx.lastAddTime > 0);
  assert.equal(s.channel.listenerCount('roomState'), 0);
  assert.equal(s.channel.listenerCount('error'), 0);
});

test('server rejection is not reported as a success', async () => {
  const s = setup({ addError: 'Aguarde 30s' });
  await assert.rejects(s.add(song), /Aguarde 30s/);
  assert.equal(s.cooldownCount(), 0);
  assert.equal(s.ctx.lastAddTime, 0);
});

test('blocks duplicate songs and invalid IDs', async () => {
  await assert.rejects(setup({ queue: [song] }).add(song), /já está na fila/);
  await assert.rejects(setup().add({ id: 'bad' }), /válido/);
});

test('prevents adding without an active, connected room', async () => {
  await assert.rejects(setup({ connected: false }).add(song), /Sem conexão/);
  await assert.rejects(setup({ room: '' }).add(song), /Entre em uma sala/);
});

test('checks room duration and local cooldown', async () => {
  await assert.rejects(setup({ maxDuration: 100 }).add(song), /limite de duração/);
  await assert.rejects(setup({ lastAdd: Date.now() }).add(song), /Aguarde/);
});

test('disconnect while waiting rejects and removes listeners', async () => {
  const s = setup({ confirm: false });
  const pending = s.add(song);
  s.channel.connected = false;
  EventEmitter.prototype.emit.call(s.channel, 'disconnect');
  await assert.rejects(pending, /interrompida/);
  assert.equal(s.channel.listenerCount('roomState'), 0);
  assert.equal(s.channel.listenerCount('error'), 0);
});
