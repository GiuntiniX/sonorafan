'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const legacy={
  'brand-54/sonorafan-icon-192.png':'brand-144/sonorafan-icon-192.png',
  'brand-54/sonorafan-icon-512.png':'brand-144/sonorafan-icon-512.png',
  'brand-64/sonorafan-favicon-64.png':'brand-144/sonorafan-icon-192.png',
  'brand-64/sonorafan-icon-192.png':'brand-144/sonorafan-icon-192.png',
  'brand-64/sonorafan-icon-512.png':'brand-144/sonorafan-icon-512.png',
  'brand-64/sonorafan-logo-transparent.png':'brand-144/sonorafan-logo.svg'
};
test('old SonoraFan brand binaries are removed, but their URLs retain permanent redirects',()=>{
 const server=read('server.js');
 const beforeStatic=server.slice(0,server.indexOf("app.use(express.static("));
 for(const [oldAsset,newAsset] of Object.entries(legacy)){
   assert.ok(!fs.existsSync(path.join(root,'public',oldAsset)),'Old asset still present: '+oldAsset);
   assert.ok(fs.existsSync(path.join(root,'public',newAsset)),'New asset missing: '+newAsset);
   assert.ok(beforeStatic.includes("'/'"+oldAsset.replace(/^\//,'')+"'")||beforeStatic.includes("'"+'/'+oldAsset+"'"),'Legacy route missing: '+oldAsset);
   assert.ok(beforeStatic.includes("'"+'/'+newAsset+"'"),'Redirect target missing: '+newAsset);
 }
 assert.match(beforeStatic,/res\.redirect\(301, legacyBrandImages\[req\.path\]\)/);
});
test('live interface uses current brand and dynamically rendered historical artwork remains intact',()=>{
 const html=read('public/index.html');
 assert.doesNotMatch(html,/\/brand-(?:54|64)\//);
 assert.match(html,/sf121-preview-brand/);
 assert.match(html,/\/brand-144\/sonorafan-mark\.svg/);
 const dynamic=read('public/sonorafan-ui-38.js');
 assert.match(dynamic,/art-32\/poster-\$\{pick\}\.svg/);
 for(const slug of ['indie','rock','brasil','electro'])
   assert.ok(fs.existsSync(path.join(root,'public/art-32/poster-'+slug+'.svg')),'Dynamic art required: '+slug);
 for(const p of ['public/themes/catalog-88.json','public/sonorafan-ui-38.css','public/sf-static-142-sw.js'])
   assert.ok(fs.existsSync(path.join(root,p)),p);
});
