'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..','public',p),'utf8');
test('desktop registration reference remains consistent at 60–125% browser zoom',()=>{
  const base=read('sonorafan-signup-reference-184.css');
  const live=read('sonorafan-signup-clean-185.css');
  const html=read('index.html');
  assert.doesNotMatch(base,/@media[^\{]*min-height\s*:\s*650px/);
  assert.doesNotMatch(live,/@media[^\{]*min-height\s*:\s*650px/);
  assert.match(base,/@media\s*\(min-width:1050px\)/);
  assert.match(live,/@media\s*\(min-width:1050px\)/);
  assert.match(base,/sonorafan-cadastro-referencia-exata\.webp/);
  assert.match(live,/left:42\.1%!important;top:13\.15%!important/);
  assert.match(html,/signup-reference-184\.css\?v=184\.5/);
  assert.match(html,/signup-clean-185\.css\?v=185\.3/);
  assert.match(html,/sonorafan-mobile-186\.css\?v=186\.3/);
});
