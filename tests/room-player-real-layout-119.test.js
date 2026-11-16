'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawn} = require('node:child_process');
const chrome = [process.env.CHROME_BIN, '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium'].filter(Boolean).find(fs.existsSync);
const publicDir = path.resolve(__dirname, '../public');

function buildRealRoomFixture() {
  const full = fs.readFileSync(path.join(publicDir,'index.html'),'utf8');
  // Use the actual inline CSS, every original linked stylesheet, and the actual
  // room subtree. No simplified stand-in layout CSS is permitted in this test.
  const inlineStyle = full.match(/<style>[\s\S]*?<\/style>/)?.[0];
  assert.ok(inlineStyle, 'Original inline CSS missing');
  const links = Array.from(full.matchAll(/<link[^>]*rel="stylesheet"[^>]*>/g),
    m => m[0].replace(/href="\//g, 'href="./'));
  assert.ok(links.length >= 45, 'Full original CSS stack missing');
  const start = full.indexOf('<div class="screen sf113-room" id="screen-room"');
  const end = full.indexOf('<!-- CREATE ROOM -->', start);
  assert.ok(start >= 0 && end > start, 'Original room subtree missing');
  const room = full.slice(start,end).replace(/src="\//g, 'src="./');
  assert.ok(room.includes('id="playerSection"') && room.includes('id="volumeSlider"'));
  const js = String.raw`
<script>
(function(){
 document.body.classList.add('sf64-room-sidebar-collapsed');
 document.body.dataset.tab='player';
 const screen=document.getElementById('screen-room');
 screen.classList.add('active');
 screen.dataset.sf113View='video';
 const placeholder=document.getElementById('youtube-player');
 // The real YouTube iframe API replaces the placeholder with a sized iframe.
 const iframe=document.createElement('iframe');
 iframe.id='youtube-player';
 iframe.title='Mock do YouTube com dimensões reais';
 iframe.width='460';iframe.height='260';
 iframe.style.width='460px';iframe.style.height='260px';
 iframe.srcdoc='<body style="margin:0;background:linear-gradient(130deg,#dc493c,#dd792d)"></body>';
 placeholder.replaceWith(iframe);
 window.setVolume=v=>{
   const slider=document.getElementById('volumeSlider');
   slider.value=String(v);
 };
})();
</script>
<script src="./sonorafan-room-redesign-113.js"></script>
<script>
window.addEventListener('load',()=>{
 setTimeout(()=>{
  const $=id=>document.getElementById(id);
  const screen=$('screen-room');
  const player=$('playerSection');
  const frame=player.querySelector('.player-frame');
  const iframe=$('youtube-player');
  const dock=screen.querySelector('.sf118-controls-dock');
  const volume=$('volumeSlider');
  const progress=$('sf117ProgressTrack');
  const rect=e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height]};
  const [fx,fy,fw,fh]=rect(frame);
  const [ix,iy,iw,ih]=rect(iframe);
  const [dx,dy,dw,dh]=rect(dock);
  const [vx,vy,vw,vh]=rect(volume);
  const [px,py,pw,ph]=rect(player);
  const css=getComputedStyle(iframe);
  const fit=fw>150 && fh>100 && iw>=fw-2 && ih>=fh-2
    && ix<=fx+2 && iy<=fy+2 && ix+iw>=fx+fw-2 && iy+ih>=fy+fh-2;
  const below=dh>55&&dw>=fw-3&&dy>=fy+fh-4;
  const vol=vw>=65&&vh>0&&vy>=dy-2&&vy<dy+dh+2;
  const bar=getComputedStyle(progress);
  const data={viewport:innerWidth, frame:[fx,fy,fw,fh], iframe:[ix,iy,iw,ih],
   dock:[dx,dy,dw,dh], volume:[vx,vy,vw,vh], player:[px,py,pw,ph],
   iframeStyle:{width:css.width,height:css.height,position:css.position,transform:css.transform},
   computedGrid:getComputedStyle(player.parentElement).gridTemplateRows,
   progress:[bar.width,bar.height],
   fit,below,vol,
   clean:!(['auto','scroll'].includes(getComputedStyle(frame).overflowY))};
  const node=document.createElement('output');node.id='sf119Metrics';
  node.dataset.sf119Test=['fit','below','vol','clean'].every(key=>data[key])?'ok':'fail';
  node.textContent=JSON.stringify(data);document.body.append(node);
 },200);
});
</script>`;
  return '<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8">'+inlineStyle+
    links.join('\n')+'</head><body>'+room+js+'</body></html>';
}

async function renderOne(browserSize) {
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'sf119-prof-'));
 const filename='.sf119-real-'+process.pid+'.html';
 const fixture=path.join(publicDir,filename);
 fs.writeFileSync(fixture,buildRealRoomFixture());
 const args=['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',
  '--disable-extensions','--disable-background-networking','--allow-file-access-from-files',
  '--no-first-run','--user-data-dir='+profile,'--window-size='+browserSize,
  '--virtual-time-budget=1900','--dump-dom','file://'+fixture];
 try{
  return await new Promise((resolve,reject)=>{
   const proc=spawn(chrome,args,{stdio:['ignore','pipe','pipe']});
   let stdout='',stderr='',settled=false;
   const finish=(err,value)=>{if(settled)return;settled=true;clearTimeout(timer);err?reject(err):resolve(value)};
   const timer=setTimeout(()=>{proc.kill('SIGKILL');finish(new Error('Chromium timeout '+stderr.slice(-250)))},20000);
   proc.stdout.on('data',data=>stdout+=data.toString());
   proc.stderr.on('data',data=>stderr+=data.toString());
   proc.on('error',error=>finish(error));
   proc.on('close',code=>code===0?finish(null,stdout):finish(new Error('Chromium '+code+' '+stderr.slice(-400))));
  });
 }finally{fs.rmSync(fixture,{force:true});fs.rmSync(profile,{recursive:true,force:true})}
}
test('real room HTML and all CSS: iframe must fill stage and volume remain below (Chromium)', {
 skip: chrome||process.env.CI==='true'?false:'Chromium unavailable'
}, async()=>{
 assert.ok(chrome,'Chromium required in CI');
 for(const size of ['1792,900','1440,900','1024,768','390,844']){
  let last=null;
  for(let n=0;n<2;n++){
   try {
    const output=await renderOne(size);
    const result=output.match(/data-sf119-test="([^"]+)"/)?.[1];
    const metrics=output.match(/<output[^>]*id="sf119Metrics"[^>]*>([^<]+)<\/output>/)?.[1];
    assert.equal(result,'ok','screen '+size+': '+(metrics||output.slice(-1000)));
    last=null;break;
   }catch(e){last=e;if(!/Chromium timeout|Chromium [0-9]+/.test(String(e.message)))break}
  }
  if(last)throw last;
 }
});
