'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawn}=require('node:child_process');
const dir=path.resolve(__dirname,'../public');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const css=fs.readFileSync(path.join(dir,'sonorafan-chat-neon-124.css'),'utf8');
const chrome=[process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].filter(Boolean).find(fs.existsSync);

test('isolated chat design preserves current chat handlers and structure',()=>{
 const start=html.indexOf('<div class="chat-column sf34-chat sf124-chat-neon">');
 const end=html.indexOf('id="sf113SearchBackdrop"',start);
 assert.ok(start>0&&end>start,'existing chat not found');
 const chat=html.slice(start,end);
 for(const id of ['premiumPresence','userCount','chatMessages','chatMessagesInner','chatInput','emojiPanel','newMsgPill','sf53ReplyPreview']){
  assert.ok(chat.includes('id="'+id+'"'),id+' must remain');
 }
 for(const handler of ['sendMessage()','toggleEmojis()','toggleUsersPop(event)','sf53OpenInbox']){
  assert.ok(chat.includes(handler),handler+' must remain');
 }
 assert.equal((html.match(/class="chat-column sf34-chat sf124-chat-neon"/g)||[]).length,1);
 assert.match(html,/sonorafan-chat-neon-124\.css\?v=124/);
 assert.ok(html.indexOf('/sonorafan-chat-neon-124.css?v=124')>html.indexOf('/sonorafan-auth-123.css?v=123'));
 assert.doesNotMatch(css,/\.player-column|\.queue-column|\.player-frame|\.room-layout|socket\./);
 for(const feature of ['--sf124-lime:#c4ff00','--sf124-orange:#ff8200','background-image:none!important','@media(max-width:768px)','@media(prefers-reduced-motion:reduce)']){
  assert.ok(css.includes(feature),feature);
 }
});

function fixture(){
 const styles=html.match(/<style>[\s\S]*?<\/style>/)?.[0];
 const links=Array.from(html.matchAll(/<link[^>]*rel="stylesheet"[^>]*>/g),m=>m[0].replace(/href="\//g,'href="./'));
 const a=html.indexOf('<div class="screen sf113-room" id="screen-room"'),b=html.indexOf('<!-- CREATE ROOM -->',a);
 assert.ok(styles&&links.length>=45&&a>0&&b>a,'real room or styles missing');
 const room=html.slice(a,b).replace(/src="\//g,'src="./');
 const script='<script>'+[
  "document.body.classList.add('sf64-room-sidebar-collapsed');",
  "document.body.dataset.tab='chat';",
  "document.getElementById('screen-room').classList.add('active');",
  "document.getElementById('screen-room').dataset.roomTheme='metal';",
  "document.getElementById('chatMessagesInner').innerHTML='<div class=\"msg\"><div class=\"msg-content\"><div class=\"msg-header\"><span class=\"msg-user\">Pessoa</span><span class=\"msg-time\">20:22</span></div><div class=\"msg-text\">Mensagem de teste do SonoraFan.</div></div></div>';",
  "window.addEventListener('load',()=>setTimeout(()=>{",
  "const q=s=>document.querySelector(s);const rect=e=>e.getBoundingClientRect();",
  "const chat=q('.sf124-chat-neon'),pane=q('#chatMessages'),inner=q('#chatMessagesInner'),msg=q('#chatMessagesInner .msg'),input=q('#chatInput'),bar=q('.sf124-chat-neon .chat-input-bar');",
  "const p=rect(pane),m=rect(msg),c=rect(chat),i=rect(input),b=rect(bar);",
  "const clean=getComputedStyle(pane).backgroundImage==='none'&&getComputedStyle(inner).backgroundImage==='none';",
  "const composer=i.width>55&&i.height>=28&&b.height>=34;",
  "const visible=c.width>220&&c.height>170&&c.right<=innerWidth+3;",
  "const flow=m.width>8&&m.left>=p.left-3&&m.right<=p.right+3;",
  "const out=document.createElement('output');out.id='sf124Metrics';out.dataset.sf124Test=clean&&composer&&visible&&flow?'ok':'fail';",
  "out.textContent=JSON.stringify({width:innerWidth,clean,composer,visible,flow,chat:[c.x,c.y,c.width,c.height],input:[i.x,i.y,i.width,i.height]});document.body.append(out);",
  "},220));"
 ].join('\n')+'</script>';
 return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+styles+links.join('\n')+'</head><body>'+room+script+'</body></html>';
}
async function runChromium(size){
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'sf124-'));
 const name='.sf124-chat-'+process.pid+'.html';
 const full=path.join(dir,name);
 fs.writeFileSync(full,fixture());
 const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-extensions','--disable-background-networking','--allow-file-access-from-files','--no-first-run','--user-data-dir='+folder,'--window-size='+size,'--virtual-time-budget=2200','--dump-dom','file://'+full];
 try{
  return await new Promise((resolve,reject)=>{
   const p=spawn(chrome,args,{stdio:['ignore','pipe','pipe']});let out='',err='',done=false;
   const finish=(e,v)=>{if(done)return;done=true;clearTimeout(timer);e?reject(e):resolve(v)};
   const timer=setTimeout(()=>{p.kill('SIGKILL');finish(new Error('Chrome timeout '+err.slice(-250)))},22000);
   p.stdout.on('data',v=>out+=v.toString());p.stderr.on('data',v=>err+=v.toString());
   p.on('error',e=>finish(e));p.on('close',code=>code===0?finish(null,out):finish(new Error('Chrome exit '+code+': '+err.slice(-250))));
  });
 }finally{fs.rmSync(full,{force:true});fs.rmSync(folder,{force:true,recursive:true})}
}
test('full CSS stack: chat has clean background, composer and message bounds (desktop/mobile)',{
 skip:chrome||process.env.CI==='true'?false:'Chromium unavailable'
},async()=>{
 assert.ok(chrome);
 for(const size of ['1600,900','1024,768','390,844']){
  const out=await runChromium(size);
  const status=out.match(/data-sf124-test="([^"]+)"/)?.[1];
  const metrics=out.match(/<output[^>]*id="sf124Metrics"[^>]*>([^<]+)<\/output>/)?.[1];
  assert.equal(status,'ok',size+': '+(metrics||out.slice(-650)));
 }
});
