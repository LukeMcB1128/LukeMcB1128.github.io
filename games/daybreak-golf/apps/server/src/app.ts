import { createServer, type ServerResponse } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, existsSync, statSync, createReadStream } from 'node:fs';
import { dirname, resolve, extname, sep } from 'node:path';
import { isRound, type Round } from '@golf/game';

export function createApp(dbPath: string, staticDir: string) {
  if (dbPath!==':memory:') mkdirSync(dirname(dbPath),{recursive:true});
  const db=new DatabaseSync(dbPath);
  db.exec(`PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS rounds (
      player TEXT NOT NULL, id TEXT NOT NULL, updated_at TEXT NOT NULL,
      data TEXT NOT NULL, PRIMARY KEY(player,id)
    );`);
  const get=db.prepare('SELECT data FROM rounds WHERE player=? AND id=?');
  const list=db.prepare('SELECT data FROM rounds WHERE player=? ORDER BY updated_at DESC LIMIT 200');
  const put=db.prepare('INSERT INTO rounds (player,id,updated_at,data) VALUES (?,?,?,?) ON CONFLICT(player,id) DO UPDATE SET updated_at=excluded.updated_at,data=excluded.data');
  const json=(res:ServerResponse,status:number,data:unknown)=>{
    res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));
  };
  const server=createServer(async(req,res)=>{
    try {
      const url=new URL(req.url??'/','http://localhost');
      if(url.pathname==='/api/health') { json(res,200,{ok:true,storage:'sqlite'});return; }
      if(url.pathname.startsWith('/api/')) {
        // Each browser has a random backup key. This local app has no public account system.
        const player=req.headers['x-player-id'];
        if(typeof player!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(player)) {json(res,400,{error:'A valid player key is required.'});return;}
        if(url.pathname==='/api/rounds' && req.method==='GET') {
          json(res,200,{rounds:(list.all(player) as {data:string}[]).map(row=>JSON.parse(row.data))}); return;
        }
        if(url.pathname==='/api/rounds' && req.method==='POST') {
          let body='';
          for await(const part of req) {
            body+=part.toString();
            if(body.length>32768) {json(res,413,{error:'Request is too large.'});return;}
          }
          let round:Round;
          try {round=JSON.parse(body);} catch {json(res,400,{error:'Invalid JSON.'});return;}
          if(!isRound(round)) {json(res,400,{error:'Invalid round.'});return;}
          if(Date.parse(round.updatedAt)>Date.now()+300000) {json(res,400,{error:'Invalid update time.'});return;}
          const old=get.get(player,round.id) as {data:string}|undefined;
          if(old && Date.parse(JSON.parse(old.data).updatedAt)>Date.parse(round.updatedAt)) {json(res,200,{round:JSON.parse(old.data)});return;}
          put.run(player,round.id,new Date(round.updatedAt).toISOString(),JSON.stringify(round));
          json(res,200,{round});return;
        }
        json(res,404,{error:'Route not found.'});return;
      }
      if(req.method!=='GET' && req.method!=='HEAD') {res.writeHead(405);res.end();return;}
      const root=resolve(staticDir);
      let path=resolve(root,`.${decodeURIComponent(url.pathname)}`);
      if(path!==root && !path.startsWith(root+sep)) {res.writeHead(403);res.end();return;}
      if(!existsSync(path)||statSync(path).isDirectory()) path=resolve(root,'index.html');
      if(!existsSync(path)) {json(res,404,{error:'Run npm run build, or open the Vite server on port 5173.'});return;}
      const types:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.json':'application/json'};
      res.writeHead(200,{'Content-Type':types[extname(path)]??'application/octet-stream','X-Content-Type-Options':'nosniff'});
      if(req.method==='HEAD') res.end(); else createReadStream(path).pipe(res);
    } catch(error) {
      console.error(error);
      if(!res.headersSent) json(res,500,{error:'The server could not complete the request.'});else res.end();
    }
  });
  server.on('close',()=>db.close());
  return server;
}
