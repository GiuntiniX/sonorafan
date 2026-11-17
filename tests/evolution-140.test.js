'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('mobile swipe changes existing tabs and does not touch controls',()=>{
  const callbacks={};
  const screen={
    classList:{contains:key=>key==='active'},
    style:{setProperty(){},removeProperty(){}},
    addEventListener(){}
  };
  const layout={addEventListener:(type,fn)=>{callbacks[type]=fn;}};
  const body={classList:{toggle(){}},dataset:{tab:'player'}};
  const context={
    document:{
      documentElement:{style:{setProperty(){},removeProperty(){},getPropertyValue(){return '';}}},
      body,hidden:false,addEventListener(){},
      getElementById:id=>id==='screen-room'?screen:id==='roomLayout'?layout:null,
      querySelector:()=>null
    },
    window:{
      innerHeight:800,innerWidth:390,matchMedia:()=>({matches:true}),
      visualViewport:{height:640,addEventListener(){}},addEventListener(){}
    },
    MutationObserver:class{observe(){}},
    requestAnimationFrame:fn=>{fn();return 1;},
    getComputedStyle:()=>({display:'block'}),
    setTab:tab=>{body.dataset.tab=tab;}
  };
  vm.runInNewContext(read('public/sonorafan-mobile-room-136.js'),context,{timeout:2000});
  const safe={closest:()=>null};
  callbacks.touchstart({touches:[{clientX:240,clientY:220}],target:safe});
  callbacks.touchend({changedTouches:[{clientX:125,clientY:227}],target:safe});
  assert.equal(body.dataset.tab,'chat');
  const button={closest:()=>({})};
  callbacks.touchstart({touches:[{clientX:240,clientY:220}],target:button});
  callbacks.touchend({changedTouches:[{clientX:125,clientY:227}],target:button});
  assert.equal(body.dataset.tab,'chat');
  callbacks.touchstart({touches:[{clientX:130,clientY:220}],target:safe});
  callbacks.touchend({changedTouches:[{clientX:235,clientY:230}],target:safe});
  assert.equal(body.dataset.tab,'player');
});

test('queue annotates known song durations conservatively',()=>{
  const listeners={};
  const makeRow=()=>{
    const info={eta:null,querySelector(){return this.eta;},appendChild(el){this.eta=el;}};
    return {
      info,classList:{toggle(){}},
      querySelector:s=>s==='.info'?info:null
    };
  };
  const rows=[makeRow(),makeRow()];
  const list={querySelectorAll:()=>rows};
  const context={
    document:{
      readyState:'complete',
      addEventListener(){},
      getElementById:id=>id==='queueList'?list:null,
      querySelector:()=>null,
      createElement:()=>({textContent:'',className:'',remove(){}})
    },
    window:{},
    requestAnimationFrame:fn=>{fn();return 1;},
    socket:{on:(name,fn)=>{listeners[name]=fn;}},
    console,
    setTimeout,clearTimeout
  };
  vm.runInNewContext(read('public/sonorafan-queue-tools-95.js'),context,{timeout:2000});
  listeners.roomState({queue:[
    {id:'dQw4w9WgXcQ',duration:180,title:'A'},
    {id:'abcdef12345',duration:210,title:'B'}
  ],currentIndex:0});
  assert.match(rows[1].info.eta.textContent,/Antes desta: ~3 min/);
  assert.match(rows[1].info.eta.title,/não é o tempo exato/);
});

test('integrated upgrades keep single existing surfaces and updated resources',()=>{
  const html=read('public/index.html');
  const styles=read('public/sonorafan-room-personalization-133.css');
  const club=read('public/sonorafan-community-71.js');
  const theme=read('public/sonorafan-room-themes-88.js');
  const badges=read('public/sonorafan-club-45.js');
  const community=read('public/sonorafan-community-110.js');
  assert.doesNotMatch(html,/Interface mobile v137\.1/);
  assert.match(html,/sonorafan-mobile-room-136\.js\?v=140\.0/);
  assert.match(html,/sonorafan-queue-tools-95\.js\?v=140\.0/);
  assert.match(styles,/sf140-duration-ahead/);
  assert.match(club,/data-sf140-share-song/);
  assert.match(club,/sf71PostText/);
  assert.match(theme,/function updateSelection\(/);
  assert.match(badges,/Faltam /);
  assert.match(community,/scheduleRender/);
});
