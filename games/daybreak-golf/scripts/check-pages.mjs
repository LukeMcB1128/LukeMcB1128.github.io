import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const dist=fileURLToPath(new URL('../apps/web/dist/',import.meta.url));
const html=await readFile(join(dist,'index.html'),'utf8');
const assets=[...html.matchAll(/(?:src|href)="(\/[^"\s]+)"/g)].map(match=>match[1]);
assert.ok(assets.length>=2,'Built scripts and styles must be present.');
for(const asset of assets) {
  assert.ok(asset.startsWith('/daybreak-golf/'),'Asset paths must stay under /daybreak-golf/.');
  await access(join(dist,asset.slice('/daybreak-golf/'.length)));
}
const files=await readdir(join(dist,'assets'));
const code=(await Promise.all(files.filter(file=>file.endsWith('.js')).map(file=>readFile(join(dist,'assets',file),'utf8')))).join('\n');
assert.ok(!code.includes('/api/rounds'),'The Pages client must not include the backup endpoint.');
assert.ok(!code.includes('backup pending'),'The Pages client must not show backup retry messages.');
assert.ok(code.includes('Saved in this browser'),'The Pages client must report browser-only saves.');
console.log('Pages build checked: subpath assets exist; SQL requests and retry messages are absent.');
