'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const isFile=relative=>fs.existsSync(path.join(root,relative));

test('all local stylesheets and scripts in the actual page are deployed',()=>{
  const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
  const resources=[...html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)=["']([^"']+\.(?:js|css))(?:\?[^"']*)?["']/g)]
    .map(m=>m[1]).filter(p=>p.startsWith('/')&&!p.startsWith('/socket.io/'));
  assert.ok(resources.length>=80,'Expected frontend assets to remain referenced');
  for(const url of resources){
    assert.ok(isFile('public/'+url.slice(1)),url+' is used by the HTML but missing from public/');
  }
});

test('PWA manifest and its real icons remain available',()=>{
  const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
  assert.match(html,/<link rel="manifest" href="\/manifest\.json"/);
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'public/manifest.json'),'utf8'));
  for(const icon of manifest.icons||[]){
    assert.ok(isFile('public/'+String(icon.src).replace(/^\/+/,'')),'Missing app icon: '+icon.src);
  }
});

test('runtime and existing regression coverage remain present',()=>{
  for(const filename of ['server.js','package.json','package-lock.json','public/index.html',
    'public/sonorafan-ui-38.js','public/sonorafan-ui-38.css',
    'tests/browser-quick-81.test.js','tests/mobile-layout-87.test.js']){
    assert.ok(isFile(filename),'Missing essential file: '+filename);
  }
});
