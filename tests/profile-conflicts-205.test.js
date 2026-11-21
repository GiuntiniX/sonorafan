'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const file=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('Forum 6.0 duplicate communities page is absent from the profile tabs',()=>{
 const source=file('public/sonorafan-profile-library-112.js');
 new Function(source);
 assert.doesNotMatch(source,/SONORAFAN · FÓRUM 6\.0/);
 assert.doesNotMatch(source,/id='sf600Community'/);
 assert.doesNotMatch(source,/\['community','♧ Comunidade'\]/);
 assert.match(source,/if\(tab==='community'\)tab='overview'/);
 assert.match(source,/hero\.after\(nav,overview,lib,dna,achievements\)/);
});
test('Overview does not clone the legacy avatar and preserves original editor',()=>{
 const overview=file('public/sonorafan-profile-dashboard-202.js');
 const tabs=file('public/sonorafan-profile-library-112.js');
 new Function(overview);
 assert.doesNotMatch(overview,/cloneNode\(true\)/);
 assert.doesNotMatch(overview,/sf202-profile-avatar/);
 assert.match(overview,/sf112SwitchProfileTab\?\.\('profile'\)/);
 assert.match(tabs,/\['profile','◉ Editar perfil'\]/);
});
test('Club participation matches overview totals even for clubs you administer',()=>{
 const overview=file('public/sonorafan-profile-dashboard-202.js');
 assert.match(overview,/const member=\(\)=>state\.clubs\.filter\(c=>c\.joined\|\|c\.owner\)/);
 assert.match(overview,/Fan Clubs de que faço parte/);
 assert.match(overview,/Fan Clubs que administro/);
});
test('Unified profile CSS isolates the overview and supports mobile',()=>{
 const css=file('public/sonorafan-community-profile-202.css'),html=file('public/index.html');
 assert.match(css,/sf112-tab-overview/);
 assert.match(css,/overflow:hidden!important;isolation:isolate/);
 assert.match(css,/@media\(max-width:680px\)/);
 assert.match(html,/sonorafan-community-profile-202\.css\?v=205\.0/);
 assert.match(html,/sonorafan-profile-dashboard-202\.js\?v=205\.0/);
});
