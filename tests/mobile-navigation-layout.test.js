'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=name=>fs.readFileSync(path.join(__dirname,'..','public',name),'utf8');

test('mobile layout removes transformed active screen and anchors bottom navigation',()=>{
 const css=src('sonorafan-mobile-audit-298.css');
 assert.match(css,/#screen-lobby\.screen\.active,[\s\S]*?#screen-room\.screen\.active\s*\{\s*animation:none!important;\s*transform:none!important;/);
 assert.match(css,/#screen-lobby\.sf125-platform\.active #sf125MobileBar\.sf125-mobile-bar\s*\{\s*position:absolute!important;/);
 assert.match(css,/#screen-lobby\.sf125-platform\.active \.sf28-lobby-main\.sf125-main\s*\{[\s\S]*?overflow:hidden!important;/);
});

test('returning from sections does not use global scrollIntoView',()=>{
 const nav=src('sonorafan-unified-125.js');
 assert.doesNotMatch(nav,/sf125LobbyHero'\)\?\.scrollIntoView/);
 assert.match(nav,/case 'lobby':[\s\S]*?content\.scrollTop=0;/);
 const rooms=src('sonorafan-rooms-discovery-216.js');
 assert.match(rooms,/function close\(\)[\s\S]*?if\(main\)main\.scrollTop=0;/);
 const pages=src('sonorafan-page-shell-207.js');
 assert.match(pages,/function resetOuterScroll\(\)/);
 assert.match(pages,/function restore\(\)[\s\S]*?resetOuterScroll\(\);/);
});

test('all mobile navigation assets are loaded with current cache versions',()=>{
 const html=src('index.html');
 for(const asset of ['sonorafan-mobile-audit-298.css','sonorafan-unified-125.js','sonorafan-rooms-discovery-216.js','sonorafan-page-shell-207.js'])
   assert.match(html,new RegExp(asset.replaceAll('.','\\.')+'\\?v=302\\.0'));
});
