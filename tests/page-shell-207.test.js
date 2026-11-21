'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('Legacy quick actions and redundant community card are removed at the source',()=>{
 const html=read('public/index.html');
 const builder=read('public/sonorafan-profile-108.js');
 assert.doesNotMatch(html,/class="sf43-quick-actions"/);
 assert.doesNotMatch(html,/window\.sf5OpenCommunity\?\.\(\)/);
 assert.doesNotMatch(builder,/Mais atalhos e recursos da comunidade/);
 assert.doesNotMatch(builder,/sf108-more-actions/);
});
test('Page shell is mounted and keeps original profile data and tab handlers',()=>{
 const html=read('public/index.html'),shell=read('public/sonorafan-page-shell-207.js');
 new Function(shell);
 for(const value of ['/sonorafan-page-shell-207.js?v=207.0','/sonorafan-page-shell-207.css?v=207.0'])
  assert.ok(html.includes(value),value);
 assert.match(shell,/sf207-profile-page/);
 assert.match(shell,/originalOpen/);
 assert.match(shell,/sf112OpenProfile/);
 assert.match(shell,/sf43CloseProfile/);
 assert.match(shell,/aria-current/);
});
test('Sidebar and mobile invoke shared page controller',()=>{
 const shell=read('public/sonorafan-page-shell-207.js');
 const ui=read('public/sonorafan-unified-125.js');
 new Function(ui);
 assert.match(ui,/\(window\.sf125Navigate\|\|go\)\(btn\.dataset\.sf125Go\)/);
 assert.match(shell,/sf125MobileBar/);
 assert.match(shell,/secondaryPage/);
 assert.match(shell,/startSecondary\('clubs'\)/);
 assert.match(shell,/startSecondary\('ranking'\)/);
});
test('Profile is displayed as page and preserves responsive design',()=>{
 const css=read('public/sonorafan-page-shell-207.css');
 for(const fragment of ['sf207-profile-content','sf207-clubs-content','sf207-ranking-content','sf43-profile-modal','sf125Sidebar'])
  assert.ok(css.includes(fragment),fragment);
 assert.match(css,/@media\(max-width:560px\)/);
});
