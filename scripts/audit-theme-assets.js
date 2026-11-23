#!/usr/bin/env node
'use strict';
// Auditoria conservadora: apenas informa candidatos, nunca apaga arquivos.
// Execute: node scripts/audit-theme-assets.js
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const themeRoot = path.join(root, 'public', 'themes');
const textExtensions = new Set(['.js','.cjs','.mjs','.ts','.css','.html','.json','.md','.svg']);
const imageExtensions = new Set(['.webp','.avif','.png','.jpg','.jpeg','.gif']);
const ignoredDirs = new Set(['.git','node_modules','.next','coverage','dist','build']);
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(entry => {
    if (entry.isDirectory()) return ignoredDirs.has(entry.name) ? [] : walk(path.join(dir,entry.name));
    return entry.isFile() ? [path.join(dir,entry.name)] : [];
  });
}
const sourceFiles = walk(root).filter(f => textExtensions.has(path.extname(f).toLowerCase()) && !f.includes('/package-lock.json'));
const sources = sourceFiles.map(file => ({file:path.relative(root,file).replace(/\\/g,'/'),body:fs.readFileSync(file,'utf8')}));
const images = walk(themeRoot).filter(f => imageExtensions.has(path.extname(f).toLowerCase()));
let referenced=0;
const candidates=[];
for (const file of images) {
  const rel = path.relative(path.join(root,'public'),file).replace(/\\/g,'/');
  const abs = '/'+rel;
  const encoded = encodeURI(abs);
  const matching = sources.filter(s => s.body.includes(abs) || s.body.includes(rel) || s.body.includes(encoded));
  // Alguns módulos geram URLs dinamicamente. Uma referência à pasta, mesmo
  // sem nome de arquivo, impede que a imagem seja classificada como segura.
  const folder = path.posix.dirname(abs)+'/';
  const dynamic = matching.length ? [] : sources.filter(s=>s.body.includes(folder));
  if(matching.length){referenced++;continue;}
  candidates.push({file:path.relative(root,file).replace(/\\/g,'/'),bytes:fs.statSync(file).size,dynamicSources:dynamic.map(s=>s.file).slice(0,6)});
}
console.log(JSON.stringify({
  status:'dry-run',trackedThemeImages:images.length,referenced,
  potentialUnused:candidates.length,
  potentialBytes:candidates.reduce((sum,x)=>sum+x.bytes,0),
  warning:'Não apague automaticamente: confirme URLs dinâmicas, conteúdo persistido, CSS e testes.',
  candidates
},null,2));
