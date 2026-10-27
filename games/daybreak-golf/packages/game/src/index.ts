export const COURSE_VERSION = 2;
export const WIDTH = 1000;
export const HEIGHT = 700;
export type Point = { x: number; y: number };
export type Lie = 'tee' | 'fairway' | 'rough' | 'sand' | 'water' | 'green';
export type ClubId = 'driver' | 'wood' | 'iron5' | 'iron7' | 'wedge' | 'putter';
export type Club = { id: ClubId; name: string; short: string; yards: number; loft: number };
export const CLUBS: Club[] = [
  { id: 'driver', name: 'Driver', short: 'DR', yards: 245, loft: 0.7 },
  { id: 'wood', name: '3 Wood', short: '3W', yards: 215, loft: 0.85 },
  { id: 'iron5', name: '5 Iron', short: '5i', yards: 170, loft: 1 },
  { id: 'iron7', name: '7 Iron', short: '7i', yards: 140, loft: 1.15 },
  { id: 'wedge', name: 'Wedge', short: 'PW', yards: 90, loft: 1.4 },
  { id: 'putter', name: 'Putter', short: 'PT', yards: 38, loft: 0 },
];
export type Hazard = Point & { rx: number; ry: number; rotation: number; type: 'water' | 'sand' };
export type Hole = {
  number: number; par: number; yards: number; tee: Point; pin: Point;
  route: Point[]; fairwayWidth: number; greenRadius: number; scale: number;
  hazards: Hazard[]; trees: (Point & { size: number })[];
  style?: 'links'; layout?: 'straight'|'dogleg'|'L-shaped'|'double dogleg';
  fairwayWidths?: number[]; dunes?: (Point & {rx:number;ry:number;rotation:number})[];
  wind: { speed: number; angle: number }; greenSpeed: number;
};
export type Round = {
  id: string; mode: 'daily' | 'infinite'; date: string; seed: string;
  scores: number[]; holeIndex: number; ball: Point; strokes: number;
  shots: number; penalties: number; complete: boolean; updatedAt: string;
  courseVersion?: number;
};
export function hashSeed(value: string): number {
  let hash = 2166136261;
  for (const c of value) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
  return hash >>> 0;
}
export function random(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let n = Math.imul(seed ^ seed >>> 15, 1 | seed);
    n = n + Math.imul(n ^ n >>> 7, 61 | n) ^ n;
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
}
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
function segmentDistance(p: Point, a: Point, b: Point) {
  const t = clamp(((p.x-a.x)*(b.x-a.x)+(p.y-a.y)*(b.y-a.y)) / (distance(a,b)**2 || 1), 0, 1);
  return distance(p, {x: a.x+(b.x-a.x)*t, y: a.y+(b.y-a.y)*t});
}
export function inHazard(p: Point, h: Hazard) {
  const c = Math.cos(h.rotation), s = Math.sin(h.rotation);
  const x = (p.x-h.x)*c + (p.y-h.y)*s;
  const y = -(p.x-h.x)*s + (p.y-h.y)*c;
  return (x/h.rx)**2 + (y/h.ry)**2 <= 1;
}
export function lieAt(hole: Hole, p: Point): Lie {
  if (distance(p, hole.pin) < hole.greenRadius) return 'green';
  if (distance(p, hole.tee) < 24) return 'tee';
  for (const h of hole.hazards) if (inHazard(p, h)) return h.type;
  for (let i=1; i<hole.route.length; i++) {
    const a=hole.route[i-1],b=hole.route[i];
    const t=clamp(((p.x-a.x)*(b.x-a.x)+(p.y-a.y)*(b.y-a.y))/(distance(a,b)**2||1),0,1);
    const width=hole.fairwayWidths ? hole.fairwayWidths[i-1]*(1-t)+hole.fairwayWidths[i]*t : hole.fairwayWidth;
    if (segmentDistance(p,a,b) < width/2) return 'fairway';
  }
  return 'rough';
}
const NAMES = ['Willow Bend', 'Stillwater', 'The Long Meadow', 'Copper Creek', 'Fox Hollow', 'North Ridge', 'Clover Run', 'The Pines', 'Homeward'];
export function holeName(hole: Hole) { return hole.style==='links'?LINKS_NAMES[(hole.number-1)%LINKS_NAMES.length]:NAMES[(hole.number-1)%NAMES.length]; }
function generateLegacyCourse(seed: string): Hole[] {
  const rng = random(hashSeed(`daybreak-v1:${seed}`));
  const pars = [4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 5, 3, 4, 4, 5, 3, 4, 4];
  return pars.map((par, i) => {
    const flip = rng() > 0.5;
    const tee = {x: 120+rng()*60, y: 505+rng()*70};
    const pin = {x: 790+rng()*60, y: 135+rng()*55};
    if (flip) { tee.y = HEIGHT-tee.y; pin.y=HEIGHT-pin.y; }
    const yards = Math.round((par===3 ? 165 : par===4 ? 340 : 490) + rng()*(par===3?65:70));
    const route = [tee, {x: 350, y: tee.y+(pin.y-tee.y)*0.27+(rng()-0.5)*130},
      {x: 610, y: tee.y+(pin.y-tee.y)*0.7+(rng()-0.5)*110}, pin];
    const hole: Hole = {
      number:i+1, par, yards, tee, pin, route, fairwayWidth: 106+rng()*28,
      greenRadius: 64+rng()*9, scale: distance(tee,pin)/yards,
      wind: { speed: Math.round(rng()*13), angle:rng()*Math.PI*2 },
      greenSpeed: 0.88+rng()*0.25, hazards: [], trees: [],
    };
    // Hazards sit beside the route. Every hole has a clear line from tee to green.
    const side = rng()>0.5 ? 1 : -1;
    const center = route[1];
    if (i%3!==1) hole.hazards.push({x:center.x+45, y:clamp(center.y+side*112,100,600), rx:90+rng()*40, ry:46+rng()*16, rotation:(rng()-0.5)*1.1, type:'water'});
    hole.hazards.push({x:pin.x-85, y:clamp(pin.y+side*65,65,635), rx:40+rng()*12, ry:25+rng()*12, rotation:rng()*2, type:'sand'});
    if (par>3) hole.hazards.push({x:route[2].x-25, y:route[2].y-side*82, rx:42, ry:25, rotation:rng()*2, type:'sand'});
    for(let t=0; t<75; t++) {
      const tree = {x:40+rng()*920, y:40+rng()*620, size:11+rng()*12};
      if(lieAt(hole,tree)==='rough' && distance(tree,tee)>65 && distance(tree,pin)>105 && !route.some((p,j)=>j>0 && segmentDistance(tree,route[j-1],p)<100)) hole.trees.push(tree);
    }
    return hole;
  });
}
const LINKS_NAMES=['The Elbow','Salt Marsh','Three Dunes','Gorse Corner','The Headland','Short Sands','The Long Turn','North Shore','Homeward Bend','The Crook','Serpentine','The Dell','Blind Corner','The Strand','Far Horizons','The Postage Stamp','Westward','The Last Turn'];
function curvedRoute(points:Point[]):Point[] {
  const route:Point[]=[];
  for(let i=0;i<points.length-1;i++) {
    const a=points[Math.max(0,i-1)],b=points[i],c=points[i+1],d=points[Math.min(points.length-1,i+2)];
    for(let s=0;s<10;s++) {
      const t=s/10,t2=t*t,t3=t2*t;
      const axis=(k:'x'|'y')=>0.5*(2*b[k]+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t2+(-a[k]+3*b[k]-3*c[k]+d[k])*t3);
      route.push({x:clamp(axis('x'),105,895),y:clamp(axis('y'),105,595)});
    }
  }
  return [...route,{...points.at(-1)!}];
}
export function generateCourse(seed:string,version=COURSE_VERSION):Hole[] {
  if(version===1)return generateLegacyCourse(seed);
  const rng=random(hashSeed(`daybreak-v2:${seed}`));
  const pars=[4,3,5,4,4,3,5,4,4,4,5,3,4,4,5,3,4,4];
  return pars.map((par,i)=>{
    const layout:NonNullable<Hole['layout']>=par===3?'straight':par===5?'double dogleg':i%3===0?'L-shaped':i%3===1?'dogleg':'straight';
    let points:Point[];
    if(layout==='L-shaped')points=[{x:145,y:550},{x:490,y:550},{x:700,y:485},{x:730,y:155}];
    else if(layout==='dogleg')points=[{x:145,y:550},{x:420,y:455},{x:530,y:205},{x:845,y:155}];
    else if(layout==='double dogleg')points=[{x:130,y:545},{x:365,y:545},{x:490,y:210},{x:855,y:155}];
    else points=[{x:150,y:540},{x:385,y:435},{x:615,y:310},{x:845,y:165}];
    // Reflect each design, then vary its control points. Keep clear margins at the edge.
    const flipX=rng()>0.5,flipY=rng()>0.5;
    points=points.map(p=>({x:flipX?WIDTH-p.x:p.x,y:flipY?HEIGHT-p.y:p.y})).map(p=>({x:p.x+(rng()-0.5)*60,y:p.y+(rng()-0.5)*50}));
    const route=curvedRoute(points),tee={...route[0]},pin={...route.at(-1)!};
    const routeLength=route.slice(1).reduce((sum,p,j)=>sum+distance(route[j],p),0);
    const yards=Math.round((par===3?155:par===4?350:495)+rng()*(par===3?65:par===4?85:95));
    const fairwayWidth=76+rng()*12;
    const phase=rng()*Math.PI*2;
    const fairwayWidths=route.map((_,j)=>{
      const t=j/(route.length-1);
      const landing=Math.exp(-(((t-0.38)/0.14)**2))*34+Math.exp(-(((t-0.74)/0.1)**2))*20;
      return fairwayWidth+landing+Math.sin(t*Math.PI*5+phase)*10;
    });
    const h:Hole={number:i+1,par,yards,tee,pin,route,fairwayWidth,fairwayWidths,
      greenRadius:48+rng()*12,scale:routeLength/yards,style:'links',layout,
      hazards:[],trees:[],dunes:[],wind:{speed:5+Math.round(rng()*13),angle:rng()*Math.PI*2},greenSpeed:0.86+rng()*0.24};
    // Place pot bunkers beside landing areas and outside the green fringe.
    for(const fraction of [0.32,0.57,0.78]) {
      const j=Math.round(fraction*(route.length-1)),p=route[j],next=route[j+1];
      const tangent=Math.atan2(next.y-p.y,next.x-p.x),side=rng()>0.5?1:-1;
      const radius=16+rng()*10,offset=fairwayWidths[j]/2+radius*0.35;
      const bunker={x:p.x-Math.sin(tangent)*offset*side,y:p.y+Math.cos(tangent)*offset*side,rx:radius,ry:radius*(0.65+rng()*0.3),rotation:tangent+rng(),type:'sand' as const};
      if(distance(bunker,tee)>65&&distance(bunker,pin)>h.greenRadius+radius+12)h.hazards.push(bunker);
    }
    const approach=route[route.length-2],direction=Math.atan2(pin.y-approach.y,pin.x-approach.x);
    for(const side of [-1,1]) {
      const a=direction+side*(1.1+rng()*0.35),r=h.greenRadius+29;
      h.hazards.push({x:pin.x+Math.cos(a)*r,y:pin.y+Math.sin(a)*r,rx:17+rng()*7,ry:13+rng()*6,rotation:a,type:'sand'});
    }
    // Occasional coastal water replaces the pond on every hole.
    if(i%5===1) {
      const x=flipX?WIDTH-16:16;
      h.hazards.push({x,y:HEIGHT/2,rx:58,ry:250+rng()*45,rotation:0,type:'water'});
    }
    // Dunes and grass tufts are rough scenery, with no hidden collision rule.
    for(let j=0;j<70;j++) {
      const p={x:55+rng()*890,y:55+rng()*590};
      if(distance(p,tee)<75||distance(p,pin)<h.greenRadius+65||h.hazards.some(b=>inHazard(p,b)))continue;
      if(route.some((r,k)=>k>0&&segmentDistance(p,route[k-1],r)<90))continue;
      if(h.dunes!.some(d=>distance(p,d)<d.rx+48))continue;
      h.dunes!.push({...p,rx:24+rng()*32,ry:10+rng()*17,rotation:rng()*Math.PI});
    }
    return h;
  });
}
export const lieFactor = (lie: Lie) => lie==='rough' ? 0.72 : lie==='sand' ? 0.48 : 1;
export function shotDistance(hole: Hole, ball: Point, club: Club, power: number) {
  return club.yards * power/100 * lieFactor(lieAt(hole,ball));
}
export function suggestedPower(hole:Hole,ball:Point,club:Club) {
  return clamp(Math.round(distance(ball,hole.pin)/hole.scale/(club.yards*lieFactor(lieAt(hole,ball)))*100),1,100);
}
export function prepareShot(hole:Hole,ball:Point) {
  const lie=lieAt(hole,ball),yards=distance(ball,hole.pin)/hole.scale;
  const club=lie==='green'||yards<28?CLUBS[5]:[...CLUBS.slice(0,5)].reverse().find(c=>c.yards*lieFactor(lie)>=yards)??CLUBS[0];
  return {club,power:suggestedPower(hole,ball,club),angle:Math.atan2(hole.pin.y-ball.y,hole.pin.x-ball.x)};
}
export function powerAtTime(elapsed:number,club:Club) {
  const period=club.id==='putter'?2600:2000;
  const phase=(Math.max(0,elapsed)%period)/period*2;
  return clamp(Math.round((phase<=1?phase:2-phase)*100),1,100);
}
export type ShotFrame = Point & { height: number };
export type SwingResult = { angleOffset: number; label: string; error: number };
export function swingPeriod(club:Club) { return club.id==='putter'?2200:club.id==='wedge'?1900:1500; }
export function swingPosition(elapsed:number,club:Club) {
  const phase=((Math.max(0,elapsed)%swingPeriod(club))/swingPeriod(club))*2;
  return phase<=1?phase:2-phase;
}
export function swingWindow(club:Club,power:number,lie:Lie) {
  const base=club.id==='putter'?0.075:0.065;
  return base*(power>85?0.65:1)*(lie==='rough'?0.8:lie==='sand'?0.65:1);
}
export function resolveSwing(club:Club,power:number,lie:Lie,position:number):SwingResult {
  const offset=clamp(position,0,1)-0.5,window=swingWindow(club,power,lie);
  const error=Math.sign(offset)*Math.max(0,Math.abs(offset)-window)/(0.5-window);
  const degrees=club.id==='putter'?3.5:club.id==='driver'?12:club.id==='wood'?10:7;
  return {error,angleOffset:error*degrees*Math.PI/180*(lie==='sand'?1.35:lie==='rough'?1.2:1),
    label:error===0?'Straight aim':offset<0?'Aim locked left':'Aim locked right'};
}
export type ShotResult = { frames: ShotFrame[]; ball: Point; holed: boolean; penalty: number; message: string };
export function simulateShot(hole: Hole, origin: Point, club: Club, power: number, angle: number): ShotResult {
  const frames: ShotFrame[] = [];
  const yards = shotDistance(hole,origin,club,clamp(power,1,100));
  const total = yards*hole.scale;
  const putt = club.id==='putter';
  const carry = putt ? 0 : total*0.85;
  const windFactor = putt ? 0 : total/450*hole.wind.speed*hole.scale*0.65;
  let p = {x:origin.x+Math.cos(angle)*carry+Math.cos(hole.wind.angle)*windFactor, y:origin.y+Math.sin(angle)*carry+Math.sin(hole.wind.angle)*windFactor};
  if (!putt) for(let i=0;i<=65;i++) {
    const t=i/65;
    frames.push({x:origin.x+(p.x-origin.x)*t,y:origin.y+(p.y-origin.y)*t,height:Math.sin(t*Math.PI)*Math.min(85,total*0.25)*club.loft});
  }
  else p={...origin};
  let speed = Math.sqrt(2*(putt?90:125)*(putt?total:total*0.15));
  let vx=Math.cos(angle)*speed, vy=Math.sin(angle)*speed;
  const penalty = (message: string): ShotResult => ({frames,ball:{...origin},holed:false,penalty:1,message});
  for(let i=0;i<600;i++) {
    if (p.x<20 || p.x>WIDTH-20 || p.y<20 || p.y>HEIGHT-20) return penalty('Out of bounds. One penalty stroke. Play from the previous position.');
    const lie=lieAt(hole,p);
    if(lie==='water') return penalty('Water hazard. One penalty stroke. Play from the previous position.');
    if(distance(p,hole.pin)<4 && speed<65) {
      frames.push({...hole.pin,height:0});
      return {frames,ball:{...hole.pin},holed:true,penalty:0,message:'In the cup!'};
    }
    if(speed<2) break;
    const friction=(lie==='rough'?310:lie==='sand'?650:lie==='green'?90*hole.greenSpeed:125);
    const nextSpeed=Math.max(0,speed-friction/60);
    vx*=nextSpeed/speed; vy*=nextSpeed/speed; speed=nextSpeed;
    p={x:p.x+vx/60,y:p.y+vy/60}; frames.push({...p,height:0});
  }
  return {frames,ball:p,holed:false,penalty:0,message:lieAt(hole,p)==='sand'?'In the sand. Use more power or a shorter club.':lieAt(hole,p)==='rough'?'In the rough. Carry is reduced.':'A good place for the next shot.'};
}
export function dailyDate() { return new Date().toISOString().slice(0,10); }
export function newRound(mode:'daily'|'infinite', seed:string, date=dailyDate()): Round {
  const holes=generateCourse(seed);
  return {id:mode==='daily'?`daily-${date}`:`infinite-${seed}`,mode,date,seed,courseVersion:COURSE_VERSION,scores:[],holeIndex:0,ball:{...holes[0].tee},strokes:0,shots:0,penalties:0,complete:false,updatedAt:new Date().toISOString()};
}
export function scoreLabel(strokes:number, par:number) {
  const diff=strokes-par;
  if(strokes===1) return 'Hole in one';
  return diff<=-3?'Albatross':diff===-2?'Eagle':diff===-1?'Birdie':diff===0?'Par':diff===1?'Bogey':diff===2?'Double bogey':`+${diff}`;
}
export function relativeScore(scores:number[], holes:Hole[]) { return scores.reduce((sum,s,i)=>sum+s-holes[i].par,0); }
export function formatScore(score:number) { return score===0?'E':score>0?`+${score}`:String(score); }
export function completeHole(round:Round,strokes:number,holes:Hole[]):Round {
  if(round.complete||round.scores.length!==round.holeIndex)throw new Error('This hole is already complete.');
  if(!Number.isInteger(strokes)||strokes<1||strokes>16)throw new Error('Invalid hole score.');
  const complete=round.holeIndex===17;
  const holeIndex=complete?17:round.holeIndex+1;
  return {...round,scores:[...round.scores,strokes],complete,holeIndex,
    ball:{...(complete?holes[17].pin:holes[holeIndex].tee)},strokes:complete?strokes:0};
}
export function isRound(value:unknown): value is Round {
  if (!value || typeof value!=='object') return false;
  const r=value as Round;
  return typeof r.id==='string' && r.id.length<160 && (r.mode==='daily'||r.mode==='infinite') &&
    (r.courseVersion===undefined||r.courseVersion===1||r.courseVersion===2) &&
    typeof r.date==='string' && /^\d{4}-\d{2}-\d{2}$/.test(r.date) &&
    typeof r.seed==='string' && r.seed.length>0 && r.seed.length<100 &&
    Array.isArray(r.scores) && r.scores.length<=18 && r.scores.every(s=>Number.isInteger(s)&&s>=1&&s<=16) &&
    Number.isInteger(r.holeIndex) && r.holeIndex>=0 && r.holeIndex<18 &&
    !!r.ball && Number.isFinite(r.ball.x) && Number.isFinite(r.ball.y) && r.ball.x>=0 && r.ball.x<=WIDTH && r.ball.y>=0 && r.ball.y<=HEIGHT &&
    Number.isInteger(r.strokes) && r.strokes>=0 && r.strokes<=16 &&
    Number.isInteger(r.shots) && r.shots>=0 && r.shots<=288 &&
    Number.isInteger(r.penalties) && r.penalties>=0 && r.penalties<=288 &&
    typeof r.complete==='boolean' && r.scores.length===(r.complete?18:r.holeIndex) && (!r.complete||r.holeIndex===17) &&
    typeof r.updatedAt==='string' && Number.isFinite(Date.parse(r.updatedAt)) &&
    (r.mode!=='daily'||(r.seed===r.date && r.id===`daily-${r.date}`));
}
