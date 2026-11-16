'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const pub=path.join(__dirname,'..','public');
const html=fs.readFileSync(path.join(pub,'index.html'),'utf8');
const css=fs.readFileSync(path.join(pub,'sonorafan-room-redesign-113.css'),'utf8');
const js=fs.readFileSync(path.join(pub,'sonorafan-room-redesign-113.js'),'utf8');
const marker='/* SonoraFan 117 — volume acessível, tempo restante e palco de vídeo ampliado. */';
const patch=css.slice(css.indexOf(marker));

test('volume, time remaining and progress remain wired to the existing player IDs',()=>{
  assert.ok(patch.length>4000,'v117 stylesheet patch not loaded');
  for (const id of ['volumeSlider','volumeValue','volIcon','sf117VolumeToggle','progressFill',
      'sf117ProgressTrack','sf117Remaining','currentTime','totalTime','youtube-player']) {
    assert.equal(html.split('id="'+id+'"').length,2,id+' missing or duplicate');
  }
  assert.match(html,/id="sf117VolumeToggle"[^>]*aria-pressed="false"/);
  assert.match(html,/id="volumeSlider"[^>]*oninput="setVolume\(this.value\)"/);
  assert.match(html,/id="sf117ProgressTrack"[^>]*role="progressbar"/);
  assert.match(html,/sonorafan-room-redesign-113\.css\?v=117/);
  assert.match(html,/sonorafan-room-redesign-113\.js\?v=117/);
});

test('timeline visible in room themes, including end-of-track emphasis',()=>{
  assert.match(patch,/\.sf117-progress-track\s*\{[^}]*height:9px!important/s);
  assert.match(patch,/\.sf117-progress-track \.progress-fill\s*\{[^}]*var\(--sf113-primary\)[^}]*var\(--sf113-secondary\)/s);
  assert.match(patch,/\.progress-section\.sf117-player-controls\s*\{[^}]*max-height:none!important/s);
  assert.match(patch,/\.sf117-ending/);
  assert.match(js,/remainingLabel\.textContent/);
  assert.match(js,/timeline\.setAttribute\('aria-valuenow'/);
  assert.match(js,/new MutationObserver\(updateProgressUI\)/);
  assert.match(html,/\$\('progressFill'\)\.style\.width = \(current \/ duration \* 100\)/);
});

test('video zoom uses same YouTube embed and preserves original streaming controls',()=>{
  assert.match(patch,/data-sf113-view="video"\] \.player-frame iframe/);
  assert.match(patch,/scale\(var\(--sf117-video-zoom,1\.06\)\)/);
  assert.match(js,/new ResizeObserver\(fitVideoStage\)/);
  assert.match(js,/window\.setVolume\(next\)/);
  assert.doesNotMatch(js,/\b(?:pauseVideo|playVideo|loadVideoById|socket\.emit)\s*\(/);
  assert.match(patch,/@media\(max-width:768px\)/);
  assert.doesNotThrow(()=>new Function(js));
});

test('volume button has accessible state and remembers prior audible volume',()=>{
  assert.match(js,/toggle\.setAttribute\('aria-pressed'/);
  assert.match(js,/lastAudibleKey = 'sf117LastAudibleVolume'/);
  assert.match(js,/const next = volumeValue\(\) > 0 \? 0 : lastAudible/);
  assert.match(patch, /#volumeSlider::-webkit-slider-thumb/);
  assert.match(patch, /#volumeValue/);
});
