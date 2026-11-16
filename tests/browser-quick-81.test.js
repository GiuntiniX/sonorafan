'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { existsSync } = require('node:fs');
const { spawn } = require('node:child_process');

const binaries = [process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean);
const chrome=binaries.find(bin=>existsSync(bin));
test('desktop quick search confirms in place and full search stays separate (Chromium)',{skip:chrome||process.env.CI==='true'?false:'Chrome/Chromium not installed'},async()=>{
 assert.ok(chrome,'Chrome/Chromium must be installed in CI to run the browser regression');
 const file='file://'+path.join(__dirname,'fixtures/quick-add-81.html');
 const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-first-run','--disable-background-networking','--allow-file-access-from-files','--virtual-time-budget=4000','--dump-dom',file];
 const output=await new Promise((resolve,reject)=>{
   const child=spawn(chrome,args,{stdio:['ignore','pipe','pipe']});
   let stdout='',stderr='';
   const timeout=setTimeout(()=>{child.kill();reject(new Error('Chrome test timeout: '+stderr.slice(-400)));},20000);
   child.stdout.on('data',d=>{stdout+=d.toString();});
   child.stderr.on('data',d=>{stderr+=d.toString();});
   child.on('error',err=>{clearTimeout(timeout);reject(err);});
   child.on('close',code=>{clearTimeout(timeout);code===0?resolve(stdout):reject(new Error('Chrome exit '+code+': '+stderr.slice(-700)));});
 });
 const match=output.match(/data-sf81-test="([^"]+)"/);
 assert.equal(match?.[1],'ok',output.slice(-2000));
});
