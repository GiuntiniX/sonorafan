'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'public/themes/catalog-88.json'),'utf8'));

test('todas as capas e miniaturas do catálogo publicado existem',()=>{
  assert.ok(catalog.length>0);
  for(const item of catalog){
    for(const prop of ['art','thumbnail']){
      assert.equal(typeof item[prop],'string',item.id+' '+prop);
      assert.match(item[prop],/^\/themes\/[A-Za-z0-9_./-]+\.(?:webp|svg|avif|png)$/);
      const file=path.resolve(root,'public',item[prop].slice(1));
      assert.ok(file.startsWith(path.join(root,'public','themes')+path.sep),'caminho inválido: '+file);
      assert.ok(fs.existsSync(file),item.id+': falta '+item[prop]);
    }
  }
});

test('o catálogo inicial do navegador mantém os mesmos 39 temas',()=>{
  const bootstrap=fs.readFileSync(path.join(root,'public/sonorafan-theme-bootstrap-226.js'),'utf8');
  for(const theme of catalog){
    assert.ok(bootstrap.includes(theme.art),theme.id+' sem arte inicial');
    assert.ok(bootstrap.includes(theme.thumbnail),theme.id+' sem miniatura inicial');
  }
});

test('imagens antigas retiradas não aparecem no catálogo atual',()=>{
  assert.ok(catalog.every(item=>!String(item.art).startsWith('/themes/illustrations/')));
  assert.ok(catalog.every(item=>!String(item.thumbnail).startsWith('/themes/illustrations/')));
});
