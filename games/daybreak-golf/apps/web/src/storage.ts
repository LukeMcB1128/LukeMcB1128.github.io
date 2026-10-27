import { isRound, type Round } from '@golf/game';

const ROUNDS_KEY='daybreak.rounds.v1';
const PLAYER_KEY='daybreak.player.v1';
export const backupEnabled=import.meta.env?.MODE!=='pages';
export let storageAvailable=true;
function read(key:string) {try{return localStorage.getItem(key);}catch{storageAvailable=false;return null;}}
function write(key:string,value:string) {try{localStorage.setItem(key,value);return true;}catch{storageAvailable=false;return false;}}
const savedPlayer=read(PLAYER_KEY);
export const playerId=backupEnabled?(savedPlayer&&/^[a-zA-Z0-9-]{16,80}$/.test(savedPlayer)?savedPlayer:crypto.randomUUID()):'';
if(backupEnabled)write(PLAYER_KEY,playerId);
export function readRounds():Round[] {
  try { const data=JSON.parse(read(ROUNDS_KEY)??'[]');return Array.isArray(data)?data.filter(isRound):[]; } catch{return [];}
}
export function writeRounds(rounds:Round[]) { return write(ROUNDS_KEY,JSON.stringify(rounds.slice(0,200))); }
export function mergeRounds(local:Round[],remote:Round[]) {
  const map=new Map(local.map(r=>[r.id,r]));
  for(const r of remote) if(isRound(r)&&(!map.has(r.id)||Date.parse(r.updatedAt)>Date.parse(map.get(r.id)!.updatedAt)))map.set(r.id,r);
  return [...map.values()].sort((a,b)=>Date.parse(b.updatedAt)-Date.parse(a.updatedAt));
}
async function request(method:'GET'|'POST',round?:Round) {
  const response=await fetch('/api/rounds',{method,headers:{'Content-Type':'application/json','X-Player-Id':playerId},body:round?JSON.stringify(round):undefined,signal:AbortSignal.timeout(4000)});
  if(!response.ok) throw new Error('Backup is not available');
  return response.json();
}
export async function fetchRounds():Promise<Round[]> {if(!backupEnabled)return [];const data=await request('GET');return Array.isArray(data.rounds)?data.rounds.filter(isRound):[];}
export async function backupRound(round:Round):Promise<Round> {if(!backupEnabled)return round;const data=await request('POST',round);if(!isRound(data.round))throw new Error('Invalid backup');return data.round;}
