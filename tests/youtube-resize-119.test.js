'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const dir=path.join(__dirname,'..','public');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const js=fs.readFileSync(path.join(dir,'sonorafan-room-redesign-113.js'),'utf8');
const css=fs.readFileSync(path.join(dir,'sonorafan-room-redesign-113.css'),'utf8');

test('YouTube iframe API gets actual cover dimensions on ready',()=>{
 assert.match(html,/function sf119ResizeYoutube\(width, height\)/);
 assert.match(html,/player\.setSize\(w, h\)/);
 assert.match(html,/window\.sf119ResizeYoutube = sf119ResizeYoutube/);
 assert.match(html,/onReady: \(\) => \{[\s\S]*?sf119ResizeYoutube\(w, Math\.ceil\(w \* 9 \/ 16\)\)/);
 assert.match(html,/window\.sf119FitVideoStage\?\.\(\)/);
 assert.match(html,/sonorafan-room-redesign-113\.css\?v=\d+(?:\.\d+)*/);
 assert.match(html,/sonorafan-room-redesign-113\.js\?v=\d+(?:\.\d+)*/);
});

test('runtime synchronizes iframe after YouTube API replaces placeholder',()=>{
 assert.match(js,/new MutationObserver\(fitVideoStage\)\.observe\(frame, \{ childList: true, subtree: true \}\)/);
 assert.match(js,/const iframeChanged = Boolean\(iframe && iframe !== sf119LastIframe\)/);
 assert.match(js,/iframe\.style\.setProperty\('width', widthPx, 'important'\)/);
 assert.match(js,/iframe\.style\.setProperty\('height', heightPx, 'important'\)/);
 assert.match(js,/iframe\.setAttribute\('width', String\(fullWidth\)\)/);
 assert.match(js,/window\.sf119ResizeYoutube\?\.\(fullWidth, fullHeight\)/);
 assert.match(css,/overflow:clip!important/);
 assert.doesNotMatch(js,/\b(?:pauseVideo|playVideo|loadVideoById|socket\.emit)\s*\(/);
 assert.doesNotThrow(()=>new Function(js));
});

test('player setSize cache resets on iframe replacement',()=>{
 assert.match(html,/let sf119SizedIframe = null/);
 assert.match(html,/sf119SizedIframe !== activeIframe/);
 assert.match(html,/sf119LastAppliedPlayerSize = ''/);
});
