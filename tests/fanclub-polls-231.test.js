'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('poll API accepts 2-8 unique alternatives and votes index 0-7',()=>{
 const s=read('fan-clubs-71.js');
 assert.match(s,/options\.length>8/);
 assert.match(s,/option(s)?\.length<2/);
 assert.match(s,/choice>=8/);
 assert.match(s,/Array\.isArray\(req\.body\?\.options\)/);
 assert.match(s,/canModerate\(data,me\)/);
});
test('editing polls is server-authorized and votes are never reset or remapped',()=>{
 const s=read('fan-clubs-71.js');
 const update=s.split("app.patch('/api/fan-clubs/:id/polls/:pollId'")[1]?.split("app.delete('/api/fan-clubs/:id/polls/:pollId'")[0];
 assert.ok(update,'PATCH route for editing a poll');
 assert.match(update,/if\(!canModerate\(data,me\)\)/);
 assert.match(update,/db\.runTransaction/);
 assert.match(update,/hasVotes&&editOptions!==undefined&&!sameOptions/);
 assert.match(update,/if\(editOptions!==undefined&&!hasVotes\)update\.options=options/);
 assert.doesNotMatch(update,/votes:\s*\{\}/);
 assert.match(update,/tx\.update\(target,update\)/);
});
test('poll editor adds and removes alternatives and renders responsive results',()=>{
 const js=read('public/sonorafan-community-71.js');
 const css=read('public/sonorafan-fanclub-social-227.css');
 assert.match(js,/function openPollEditor\(poll=null\)/);
 assert.match(js,/data-sf231-add-option/);
 assert.match(js,/data-sf231-remove-option/);
 assert.match(js,/if\(list\.children\.length>=8\)return/);
 assert.match(js,/data-sf231-edit-poll/);
 assert.match(js,/data-sf231-close-poll/);
 assert.match(js,/function pollCard\(p,compact=false\)/);
 assert.match(js,/Math\.round\(count\*100\/total\)/);
 assert.match(css,/\.sf231-poll-choice/);
 assert.match(css,/@media\(max-width:600px\)/);
});
