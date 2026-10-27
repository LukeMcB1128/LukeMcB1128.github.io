import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../apps/server/src/app.ts';
import { newRound } from '@golf/game';

test('SQLite API saves, isolates, restores, and validates round data',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'daybreak-test-')),db=join(dir,'golf.db');
  let server=createApp(db,join(dir,'dist'));
  const listen=async()=>{server.listen(0,'127.0.0.1');await once(server,'listening');return `http://127.0.0.1:${(server.address() as {port:number}).port}`;};
  const close=()=>new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
  let base=await listen();
  const headers={'Content-Type':'application/json','X-Player-Id':'test-player-00000001'};
  const r=newRound('daily','2026-10-25','2026-10-25');
  try {
    assert.equal((await fetch(`${base}/api/health`)).status,200);
    assert.equal((await fetch(`${base}/api/rounds`)).status,400);
    const save=await fetch(`${base}/api/rounds`,{method:'POST',headers,body:JSON.stringify(r)});assert.equal(save.status,200);
    assert.deepEqual((await (await fetch(`${base}/api/rounds`,{headers})).json()).rounds,[r]);
    const other={'X-Player-Id':'test-player-00000002'};
    assert.deepEqual((await (await fetch(`${base}/api/rounds`,{headers:other})).json()).rounds,[]);
    const old={...r,updatedAt:'2020-01-01T00:00:00Z'};
    await fetch(`${base}/api/rounds`,{method:'POST',headers,body:JSON.stringify(old)});
    assert.deepEqual((await (await fetch(`${base}/api/rounds`,{headers})).json()).rounds,[r]);
    for(const body of ['{','{}',JSON.stringify({...r,strokes:-2}),JSON.stringify({...r,updatedAt:'2099-01-01T00:00:00Z'})])assert.equal((await fetch(`${base}/api/rounds`,{method:'POST',headers,body})).status,400);
    assert.equal((await fetch(`${base}/api/rounds`,{method:'POST',headers,body:'x'.repeat(33000)})).status,413);
    assert.equal((await fetch(`${base}/api/missing`,{headers})).status,404);
    await close();server=createApp(db,join(dir,'dist'));base=await listen();
    assert.deepEqual((await (await fetch(`${base}/api/rounds`,{headers})).json()).rounds,[r]);
  } finally {await close();rmSync(dir,{recursive:true,force:true});}
});
