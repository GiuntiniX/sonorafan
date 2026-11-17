'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('approved logo appears in all legacy site brand surfaces',()=>{
 const html=read('public/index.html');
 const hits=(html.match(/src="\/brand-144\/sonorafan-logo\.svg"/g)||[]).length;
 assert.equal(hits,8);
 assert.doesNotMatch(html,/sonorafan-logo-transparent\.png/);
 assert.match(html,/property="og:image" content="\/brand-144\/sonorafan-logo\.svg"/);
 assert.match(html,/id="roomTitle"/);
 assert.match(html,/id="queueList"/);
 assert.match(html,/id="chatInput"/);
});
test('approved logo is transparent, retains brand colors and has no external assets',()=>{
 const svg=read('public/brand-144/sonorafan-logo.svg');
 assert.match(svg,/viewBox="0 0 1260 426"/);
 assert.match(svg,/#ffffff/);
 assert.match(svg,/#f40073/);
 assert.match(svg,/#ffce08/);
 assert.match(svg,/#c4ff00/);
 assert.doesNotMatch(svg,/<rect\b|<image\b|https?:\/\//i);
});
test('favicon and PWA use consistent mark with non-SVG installation fallback',()=>{
 const html=read('public/index.html');
 const manifest=JSON.parse(read('public/manifest.json'));
 assert.match(html,/rel="icon" href="\/brand-144\/sonorafan-mark\.svg"/);
 assert.match(html,/rel="apple-touch-icon" href="\/brand-64\/sonorafan-icon-192\.png"/);
 assert.ok(manifest.icons.some(x=>x.src==='/brand-144/sonorafan-mark.svg'));
 assert.ok(manifest.icons.some(x=>x.type==='image/png'&&x.sizes==='192x192'));
 assert.ok(manifest.icons.some(x=>x.type==='image/png'&&x.sizes==='512x512'));
 const icon=read('public/brand-144/sonorafan-mark.svg');
 assert.match(icon,/viewBox="760 0 540 450"/);
});
