'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const get=p=>fs.readFileSync(path.join(root,p),'utf8');
const js=get('public/sonorafan-mobile-room-136.js');
const css=get('public/sonorafan-mobile-room-136.css');
const legacy=get('public/sonorafan-mobile-room-135.css');
const html=get('public/index.html');
const server=get('server.js');

test('v137 eliminates conflicting root 100vh, fixed tabs and duplicate bottom padding',()=>{
 assert.match(css,/body\.sf137-mobile-room\s*\{/);
 assert.match(css,/min-height:var\(--sf137-viewport-height,100dvh\)!important/);
 assert.match(css,/max-height:var\(--sf137-viewport-height,100dvh\)!important/);
 assert.match(legacy,/grid-template-rows: 56px minmax\(0, 1fr\) var\(--sf135-tabs-height\)/);
 assert.match(legacy,/padding-bottom: 0 !important/);
 assert.match(legacy,/position: relative !important/);
 assert.doesNotMatch(legacy,/position: fixed !important/);
 assert.match(css,/#screen-room\.sf113-room > \.app > #mTabs\.mtabs/);
 assert.match(css,/grid-row:3!important/);
 assert.match(css,/height:var\(--sf137-viewport-height,100dvh\)!important/);
});
test('v137 identifies the deployed version, disables caching of index and names its scripts',()=>{
 assert.match(html,/sonorafan-mobile-room-135\.css\?v=137/);
 assert.match(html,/sonorafan-mobile-room-136\.css\?v=137/);
 assert.match(html,/sonorafan-mobile-room-136\.js\?v=137/);
 assert.match(html,/Interface mobile v137\.1/);
 assert.match(server,/get\('\/api\/client-version'/);
 assert.match(server,/res\.set\('Cache-Control','no-store, no-cache, must-revalidate'\)/);
});

function makeElement(initialClasses=[]){
 const names=new Set(initialClasses),props=new Map();
 return {
  classList:{
   contains:s=>names.has(s),add:s=>names.add(s),remove:s=>names.delete(s),
   toggle:(s,value)=>{if(value===undefined)value=!names.has(s);if(value)names.add(s);else names.delete(s);return value;}
  },
  style:{setProperty:(k,v)=>props.set(k,v),removeProperty:k=>props.delete(k),
    getPropertyValue:k=>props.get(k)||''},
  getBoundingClientRect:()=>({top:0,bottom:640,height:640}),
  addEventListener:()=>{},querySelector:()=>null,
  get textContent(){return this._text||''},set textContent(x){this._text=x}
 };
}
function simulateViewport(visualHeight){
 const docRoot=makeElement();
 const body=makeElement();
 const screen=makeElement(['active']);
 const welcome=makeElement();
 const count=makeElement();count.textContent='0 músicas';
 const chatInput=makeElement();
 const elements={'screen-room':screen,'sf136MobileWelcome':welcome,'queueCount':count,'chatInput':chatInput};
 const subscriptions=[];
 const context={
  document:{documentElement:docRoot,body,
    getElementById:id=>elements[id]||null,
    querySelector:()=>null,addEventListener:()=>{},hidden:false},
  window:{
    innerHeight:820,innerWidth:390,
    visualViewport:{height:visualHeight,addEventListener:()=>{}},
    matchMedia:()=>({matches:true}),addEventListener:()=>{}
  },
  MutationObserver:class{constructor(cb){this.cb=cb;subscriptions.push(this)}observe(){}},
  requestAnimationFrame:cb=>{cb();return 1;},
  getComputedStyle:()=>({display:'flex'})
 };
 vm.runInNewContext(js,context,{timeout:2500});
 return {root:docRoot,body,screen,welcome,context,subscriptions};
}
test('actual viewport JavaScript clamps body to Chrome Android visible height',()=>{
 const data=simulateViewport(637);
 assert.equal(data.root.style.getPropertyValue('--sf137-viewport-height'),'637px');
 assert.equal(data.screen.style.getPropertyValue('--sf136-mobile-vh'),'637px');
 assert.equal(data.body.classList.contains('sf137-mobile-room'),true);
 assert.equal(data.welcome.hidden,false);
 assert.equal(data.context.window.sf137MobileMetrics().version,'137.1');
 data.screen.classList.remove('active');
 // A observação da classe da sala força a medição quando se sai dela.
 data.subscriptions[0].cb();
 assert.equal(data.body.classList.contains('sf137-mobile-room'),false);
 assert.equal(data.root.style.getPropertyValue('--sf137-viewport-height'),'');
});
