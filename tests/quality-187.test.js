'use strict';
// SonoraFan 187 — regression gates for recent mobile and chat stability.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const src=name=>fs.readFileSync(path.join(root,name),'utf8');

test('mobile signup remains scrollable and has accessible zoom',()=>{
 const html=src('public/index.html');
 const css=src('public/sonorafan-mobile-186.css');
 assert.match(html,/<meta name="viewport" content="width=device-width, initial-scale=1\.0">/);
 assert.doesNotMatch(html,/user-scalable=no/);
 assert.match(css,/#signupModal\.sf123-signup-screen\.active\s*\{[\s\S]*?display:block!important/);
 assert.match(css,/overflow-y:auto!important/);
 assert.match(css,/touch-action:pan-y!important/);
 assert.match(css,/height:max-content!important/);
 assert.match(css,/max-height:none!important/);
 assert.match(html,/<a class="sf123-back-home" href="\/"/);
 assert.match(html,/sonorafan-mobile-186\.css\?v=186\.3/);
});
test('session expiry checked on access and restored after restart',()=>{
 const server=src('server.js');
 assert.match(server,/const sessionExpirations = new Map\(\)/);
 assert.match(server,/expiry <= Date\.now\(\)/);
 assert.match(server,/sessionExpirations\.set\(d\.id, v\.exp\)/);
 assert.match(server,/sessionExpirations\.delete\(key\)/);
});
test('queue actions are filtered from public chat without swallowing moderation',()=>{
 const server=src('server.js');
 const marker=server.indexOf('function isRoutineMusicChatNotice(text)');
 assert.ok(marker>=0);
 const until=server.indexOf('function addSystemMsg',marker);
 const fn=server.slice(marker,until);
 const predicate=new Function(fn+';return isRoutineMusicChatNotice;')();
 for(const s of [
   '▶ Música teste — Artista',
   '📥 Música da fila de espera: Teste',
   '⏭️ Música pulada por votação! (3 votos)',
   '⏳ "Teste" entrou na fila de espera',
   '🗑️ "Teste" removida pelo admin.',
   '👎 "Teste" foi removida por votação!'
 ]) assert.equal(predicate(s),true,s);
 for(const s of [
   '📣 Admin: Comunicado importante',
   '🔒 O chat foi travado por um administrador.',
   '🔇 Participante silenciado',
   '⚠️ Erro ao buscar músicas para o rádio.'
 ]) assert.equal(predicate(s),false,s);
 assert.match(server,/if \(isRoutineMusicChatNotice\(text\)\) return;/);
});
test('runtime and image-only service-worker strategies stay aligned',()=>{
 const docker=src('Dockerfile.txt'),pkg=JSON.parse(src('package.json'));
 assert.match(docker,/FROM node:22-alpine/);
 assert.match(pkg.engines.node,/22/);
 assert.match(docker,/npm ci --omit=dev/);
 const serviceWorker=src('public/sf-static-142-sw.js');
 assert.match(serviceWorker,/req\.mode==='navigate'/);
 assert.match(serviceWorker,/req\.headers\.has\('authorization'\)/);
});
