import { fileURLToPath } from 'node:url';
import { createApp } from './app.ts';

const dbPath=process.env.GOLF_DB??fileURLToPath(new URL('../../../data/golf.db',import.meta.url));
const staticDir=fileURLToPath(new URL('../../web/dist',import.meta.url));
const port=Number(process.env.PORT??3001);
const server=createApp(dbPath,staticDir);
server.listen(port,'127.0.0.1',()=>console.log(`Daybreak Golf: http://127.0.0.1:${port}`));
for(const signal of ['SIGINT','SIGTERM'] as const) process.on(signal,()=>server.close(()=>process.exit(0)));
