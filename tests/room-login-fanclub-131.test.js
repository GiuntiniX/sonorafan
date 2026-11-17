'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const dir=path.join(root,'public');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const styles=fs.readFileSync(path.join(dir,'sonorafan-room-login-fanclub-131.css'),'utf8');
const roomJS=fs.readFileSync(path.join(dir,'sonorafan-room-redesign-113.js'),'utf8');
const chrome=[process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].filter(Boolean).find(fs.existsSync);
const between=(a,b)=>{const start=html.indexOf(a),end=html.indexOf(b,start);assert.ok(start>=0&&end>start,'html boundaries: '+a);return html.slice(start,end);};
test('v131 retains native Fan Club click handlers and corrects green button contrast',()=>{
 const lobby=fs.readFileSync(path.join(dir,'sonorafan-lobby-107.js'),'utf8');
 assert.match(lobby,/class="sf107-club-create" data-sf107="club-create">＋ Criar Fan Club/);
 assert.match(styles,/data-sf107="club-create"/);
 assert.match(styles,/-webkit-text-fill-color:#10120a!important/);
 assert.match(styles,/min-width:154px!important/);
 const community=fs.readFileSync(path.join(dir,'sonorafan-experience-126.js'),'utf8');
 assert.match(community,/data-sf126-club="create"/);
 assert.match(styles,/data-sf126-club="create"/);
});
test('v131 login uses editable fields and concert photo rather than previous SVG',()=>{
 const login=between('<!-- ===== SONORAFAN 123 • LOGIN','<!-- ===== SONORAFAN 123 • CADASTRO');
 for(const id of ['loginScreen','loginEmail','loginPassword','loginBtn','sf123RememberLogin','loginError']){
  assert.match(login,new RegExp('id="'+id+'"'));
 }
 assert.match(login,/art-132\/sonorafan-login-guitarrista\.avif/);
 assert.doesNotMatch(login,/art-129\/sonorafan-stage\.svg/);
 assert.match(styles,/grid-template-columns:minmax\(355px,38%\) minmax\(0,62%\)/);
 assert.match(styles,/@media\(max-width:800px\)/);
 assert.match(html,/sonorafan-room-login-fanclub-131\.css\?v=131/);
});
test('v131 room keeps real player, queue, add, favorites, listeners, chat and themes',()=>{
 const room=between('<!-- ROOM -->','<!-- CREATE ROOM -->');
 for(const id of ['screen-room','playerSection','youtube-player','queueList','waitingQueueList',
  'sf113AddMusic','sf116Favorites','chatMessages','chatInput','sf5ListenersBody',
  'sf88RoomThemeButton','sf113VisualStage','volumeSlider']){
   assert.equal((room.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 }
 assert.match(styles,/@media\(min-width:1161px\)/);
 assert.match(styles,/@media\(min-width:769px\) and \(max-width:1160px\)/);
 assert.match(styles,/grid-column:3!important;grid-row:1!important/);
 assert.match(styles,/grid-column:3!important;grid-row:2!important/);
 assert.match(styles,/@media\(max-width:768px\)/);
 assert.match(roomJS,/let mode = 'video'/);
 assert.match(roomJS,/saved === 'visual' \|\| saved === 'video'/);
});
const fixture=()=>{
 const rootCss=html.match(/<style>[\s\S]*?<\/style>/)?.[0]||'';
 const links=[...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*>/g)]
  .map(m=>m[0].replace(/href="\//g,'href="./')).join('\n');
 const room=between('<!-- ROOM -->','<!-- CREATE ROOM -->').replace(/src="\//g,'src="./');
 const js=`<script>
 document.body.classList.add('sf64-room-sidebar-collapsed');
 document.body.dataset.tab='player';
 const root=document.getElementById('screen-room');root.classList.add('active');
 root.dataset.sf113View='video';
 const holder=document.getElementById('youtube-player');
 const iframe=document.createElement('iframe');iframe.id='youtube-player';iframe.srcdoc='<body style="background:#24102b"></body>';
 holder.replaceWith(iframe);
 setTimeout(()=>{
   const $=s=>document.querySelector(s);
   const b=s=>$(s).getBoundingClientRect();
   const player=b('.player-column'),queue=b('.queue-column'),chat=b('.chat-column');
   const frame=b('.player-frame'),add=b('#sf113AddMusic');
   const layout=b('#roomLayout');
   const style=getComputedStyle($('#roomLayout'));
   const info={width:innerWidth,height:innerHeight,
     player:{x:player.x,y:player.y,w:player.width,h:player.height},
     queue:{x:queue.x,y:queue.y,w:queue.width,h:queue.height},
     chat:{x:chat.x,y:chat.y,w:chat.width,h:chat.height},
     video:{x:frame.x,y:frame.y,w:frame.width,h:frame.height},
     add:{x:add.x,y:add.y,w:add.width,h:add.height},
     grid:style.gridTemplateColumns,layoutHeight:layout.height};
   const ok=innerWidth>=769
     ? player.width>=queue.width && queue.x>player.x && chat.x>=queue.x-3
       && chat.y>queue.y && add.width>80 && add.height>=30
       && frame.width>queue.width && frame.height>160
       && player.x>=layout.x-2 && queue.right<=layout.right+3
     : true;
   const out=document.createElement('output');out.id='sf131Metrics';
   out.setAttribute('data-ok',String(ok));out.textContent=JSON.stringify(info);document.body.append(out);
 },350);
 </script>`;
 return '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+rootCss+links+'</head><body>'+room+js+'</body></html>';
};
async function render(size){
 const file=path.join(dir,'.sf131-test-'+process.pid+'.html');
 const user=fs.mkdtempSync(path.join(os.tmpdir(),'sf131chrome-'));
 fs.writeFileSync(file,fixture());
 try{return await new Promise((resolve,reject)=>{
   const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--disable-extensions','--allow-file-access-from-files','--user-data-dir='+user,'--window-size='+size,'--virtual-time-budget=1700','--dump-dom','file://'+file];
   const child=spawn(chrome,args,{stdio:['ignore','pipe','pipe']});let result='',stderr='',done=false;
   const finish=(err,x)=>{if(done)return;done=true;clearTimeout(timer);err?reject(err):resolve(x)};
   const timer=setTimeout(()=>{child.kill('SIGKILL');finish(new Error('Chrome timeout '+stderr.slice(-200)))},18000);
   child.stdout.on('data',d=>result+=d.toString());
   child.stderr.on('data',d=>stderr+=d.toString());
   child.on('error',finish);
   child.on('close',code=>code===0?finish(null,result):finish(new Error('Chrome '+code+stderr.slice(-200))));
 });}finally{fs.rmSync(file,{force:true});fs.rmSync(user,{recursive:true,force:true})}
}
test('v131 Chromium places queue above chat BESIDE the oversized video',{skip:!chrome},async()=>{
 for(const size of ['1600,900','1280,900','1024,768']){
  const output=await render(size);
  const status=output.match(/id="sf131Metrics"[^>]*data-ok="([^"]+)"/)?.[1];
  const details=output.match(/<output[^>]*id="sf131Metrics"[^>]*>([^<]+)<\/output>/)?.[1];
  assert.equal(status,'true',size+': '+(details||output.slice(-500)));
 }
});
