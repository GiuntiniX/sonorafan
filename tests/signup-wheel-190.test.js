'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('registration desktop wheel routes to scrollable modal without blocking zoom or mobile',()=>{
 const js=read('public/sonorafan-signup-scroll-190.js');
 const css=read('public/sonorafan-signup-clean-185.css');
 const html=read('public/index.html');
 assert.match(html,/sonorafan-signup-scroll-190\.js\?v=190\.0/);
 assert.match(html,/sonorafan-signup-clean-185\.css\?v=190\.0/);
 assert.match(js,/modal\.addEventListener\('wheel'/);
 assert.match(js,/passive:\s*false/);
 assert.match(js,/event\.ctrlKey\s*\|\|\s*event\.metaKey/);
 assert.match(js,/window\.innerWidth\s*<\s*1050/);
 assert.match(js,/modal\.scrollHeight\s*-\s*modal\.clientHeight/);
 assert.match(js,/modal\.scrollTop\s*=\s*next/);
 assert.match(css,/overscroll-behavior-y:auto!important/);
 assert.doesNotThrow(()=>new Function(js));
});
