'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');

test('real SonoraFan YouTube setSize bridge is idempotent, resizes and handles iframe replacement',()=>{
  const a=html.indexOf("    let sf119LastAppliedPlayerSize = '';");
  const b=html.indexOf('    function sf9CheckAudio(expectedId)',a);
  assert.ok(a>0 && b>a+400, 'live inline resize bridge missing');
  const body=html.slice(a,b);
  let iframe={name:'one'};
  const sizes=[];
  let fits=0;
  const player={
    getIframe(){return iframe},
    setSize(width,height){sizes.push([width,height])}
  };
  const frame={clientWidth:830,clientHeight:467};
  const document={querySelector(selector){
    assert.equal(selector,'#screen-room .player-frame');
    return frame;
  }};
  const window={sf119FitVideoStage(){fits++}};
  const resize=Function('document','window','requestAnimationFrame','player',body+
    '\nreturn window.sf119ResizeYoutube;')(document,window,callback=>callback(),player);
  resize(830,467);
  assert.deepEqual(sizes,[[830,467]]);
  resize(830,467);
  assert.equal(sizes.length,1,'same dimensions must not reconfigure YouTube repeatedly');
  iframe={name:'replacement iframe'};
  resize(830,467);
  assert.deepEqual(sizes,[[830,467],[830,467]],'new iframe with same dimensions must resize');
  resize(1440,810);
  assert.deepEqual(sizes.at(-1),[1440,810]);
  assert.equal(fits,3);
});

test('setSize method is layout-only and does not mutate the shared playback queue',()=>{
 const a=html.indexOf("    let sf119LastAppliedPlayerSize = '';");
 const b=html.indexOf('    function sf9CheckAudio(expectedId)',a);
 const block=html.slice(a,b);
 assert.doesNotMatch(block,/\.playVideo\(|\.pauseVideo\(|\.seekTo\(|\.loadVideoById\(|socket\.emit/);
 assert.match(block,/player\.setSize\(w, h\)/);
});
