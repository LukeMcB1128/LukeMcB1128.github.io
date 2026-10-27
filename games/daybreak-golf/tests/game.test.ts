import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CLUBS, generateCourse, newRound, completeHole, isRound, simulateShot, prepareShot, suggestedPower, powerAtTime, swingPosition, swingPeriod, swingWindow, resolveSwing, distance, lieAt, relativeScore, scoreLabel, type Hole } from '@golf/game';

function practice():Hole {
  const h=generateCourse('test')[0];
  return {...h,tee:{x:100,y:350},pin:{x:850,y:350},route:[{x:100,y:350},{x:850,y:350}],fairwayWidth:120,fairwayWidths:undefined,style:undefined,scale:2,wind:{speed:0,angle:0},hazards:[],greenSpeed:1};
}
test('daily seed gives the same 18 holes and a par of 72',()=>{
  const a=generateCourse('2026-10-25'),b=generateCourse('2026-10-25');
  assert.deepEqual(a,b);assert.equal(a.length,18);assert.equal(a.reduce((s,h)=>s+h.par,0),72);
  assert.notDeepEqual(a,generateCourse('2026-10-26'));
});
test('generated courses have safe tees and greens across 100 seeds',()=>{
  for(let s=0;s<100;s++) for(const h of generateCourse(String(s))) {
    assert.equal(lieAt(h,h.tee),'tee');assert.equal(lieAt(h,h.pin),'green');
    assert.ok(h.scale>0);assert.ok(h.yards>150);assert.ok(h.hazards.some(h=>h.type==='sand'));
  }
});
test('links rounds contain L-shaped holes, doglegs, and open dune scenery',()=>{
  for(let seed=0;seed<20;seed++) {
    const holes=generateCourse(`links-${seed}`);
    const layouts=new Set(holes.map(h=>h.layout));
    for(const shape of ['straight','dogleg','L-shaped','double dogleg'])assert.ok(layouts.has(shape as Hole['layout']));
    for(const h of holes){assert.equal(h.style,'links');assert.equal(h.trees.length,0);assert.ok(h.dunes!.length>5);assert.ok(h.hazards.filter(b=>b.type==='sand').length>=2);}
    assert.ok(holes.filter(h=>h.hazards.some(b=>b.type==='water')).length<holes.length/2);
  }
});
test('route yardage follows the full fairway and L-shaped holes have a real turn',()=>{
  for(const h of generateCourse('links-turns')) {
    const routeLength=h.route.slice(1).reduce((sum,p,i)=>sum+distance(h.route[i],p),0);
    assert.ok(Math.abs(routeLength/h.scale-h.yards)<1e-8);
    assert.ok(routeLength>=distance(h.tee,h.pin));
    if(h.layout==='L-shaped') {
      assert.ok(routeLength/distance(h.tee,h.pin)>1.25);
      const first=h.route[3],last=h.route.at(-4)!;
      const a=Math.atan2(first.y-h.tee.y,first.x-h.tee.x),b=Math.atan2(h.pin.y-last.y,h.pin.x-last.x);
      assert.ok(Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)))>Math.PI/3);
    }
  }
});
test('all links routes remain in bounds and leave a playable fairway center',()=>{
  for(let seed=0;seed<50;seed++)for(const h of generateCourse(`safe-${seed}`)) {
    assert.equal(h.fairwayWidths!.length,h.route.length);
    assert.ok(Math.max(...h.fairwayWidths!)-Math.min(...h.fairwayWidths!)>25);
    for(const p of h.route) {
      assert.ok(p.x>=100&&p.x<=900&&p.y>=100&&p.y<=600);
      assert.ok(['tee','fairway','green'].includes(lieAt(h,p)));
    }
  }
});
test('legacy courses and saved rounds retain their original generator',()=>{
  const old=generateCourse('2026-10-25',1),current=generateCourse('2026-10-25');
  assert.equal(old[0].yards,381);assert.equal(old[0].style,undefined);assert.notDeepEqual(old,current);
  assert.deepEqual(old,generateCourse('2026-10-25',1));
  const round=newRound('daily','2026-10-25','2026-10-25');assert.equal(round.courseVersion,2);
  assert.ok(isRound(round));assert.ok(isRound({...round,courseVersion:undefined}));assert.equal(isRound({...round,courseVersion:999}),false);
});
test('club and power change shot distance',()=>{
  const h=practice();
  const driver=simulateShot(h,h.tee,CLUBS[0],100,0),iron=simulateShot(h,h.tee,CLUBS[3],100,0),half=simulateShot(h,h.tee,CLUBS[0],50,0);
  assert.ok(distance(h.tee,driver.ball)>distance(h.tee,iron.ball));
  assert.ok(Math.abs(distance(h.tee,half.ball)/distance(h.tee,driver.ball)-0.5)<0.02);
});
test('rough and sand reduce distance',()=>{
  const h=practice(),rough={x:100,y:200},sand={x:100,y:500};
  h.hazards.push({...sand,rx:40,ry:40,rotation:0,type:'sand'});
  const fair=simulateShot(h,h.tee,CLUBS[2],100,0),r=simulateShot(h,rough,CLUBS[2],100,0),s=simulateShot(h,sand,CLUBS[2],100,0);
  assert.equal(lieAt(h,rough),'rough');assert.equal(lieAt(h,sand),'sand');
  assert.ok(distance(rough,r.ball)<distance(h.tee,fair.ball)*0.8);
  assert.ok(distance(sand,s.ball)<distance(rough,r.ball));
});
test('wind moves flying shots but does not move putts',()=>{
  const h=practice();const windy={...h,wind:{speed:12,angle:Math.PI/2}};
  assert.ok(simulateShot(windy,h.tee,CLUBS[0],80,0).ball.y>simulateShot(h,h.tee,CLUBS[0],80,0).ball.y);
  assert.deepEqual(simulateShot(windy,h.tee,CLUBS[5],50,0).ball,simulateShot(h,h.tee,CLUBS[5],50,0).ball);
});
test('water adds a penalty and returns the ball to its previous position',()=>{
  const h=practice();
  h.hazards.push({x:100+245*2*0.85,y:350,rx:40,ry:40,rotation:0,type:'water'});
  const result=simulateShot(h,h.tee,CLUBS[0],100,0);
  assert.equal(result.penalty,1);assert.equal(result.holed,false);assert.deepEqual(result.ball,h.tee);
});
test('out of bounds adds a penalty',()=>{
  const h=practice(),result=simulateShot(h,h.tee,CLUBS[0],100,Math.PI);
  assert.equal(result.penalty,1);assert.deepEqual(result.ball,h.tee);
});
test('a controlled putt reaches the cup',()=>{
  const h=practice(),ball={x:820,y:350};
  const result=simulateShot(h,ball,CLUBS[5],40,0);
  assert.equal(result.holed,true);assert.deepEqual(result.ball,h.pin);
});
test('fast putts and shots beside the cup do not receive automatic capture',()=>{
  const h=practice();
  assert.equal(simulateShot(h,{x:820,y:350},CLUBS[5],100,0).holed,false);
  assert.equal(simulateShot(h,{x:820,y:355},CLUBS[5],40,0).holed,false);
});
test('the timing marker moves at a stable speed and reflects at each end',()=>{
  const club=CLUBS[0],period=swingPeriod(club);
  assert.equal(swingPosition(0,club),0);
  assert.equal(swingPosition(period/4,club),0.5);
  assert.equal(swingPosition(period/2,club),1);
  assert.equal(swingPosition(period*0.75,club),0.5);
  assert.equal(swingPosition(period,club),0);
  assert.ok(swingPeriod(CLUBS[5])>period);
});
test('power rises and falls independently before aim timing starts',()=>{
  const club=CLUBS[0];
  assert.equal(powerAtTime(0,club),1);
  assert.equal(powerAtTime(500,club),50);
  assert.equal(powerAtTime(1000,club),100);
  assert.equal(powerAtTime(1500,club),50);
  assert.equal(powerAtTime(2000,club),1);
  assert.equal(powerAtTime(650,CLUBS[5]),50);
  for(let t=0;t<6000;t+=13)assert.ok(powerAtTime(t,club)>=1&&powerAtTime(t,club)<=100);
});
test('shot setup selects a suitable club and aims toward the hole',()=>{
  const h=practice(),tee=prepareShot(h,h.tee);
  assert.equal(tee.club.id,'driver');assert.equal(tee.angle,0);assert.equal(tee.power,100);
  const approach=prepareShot(h,{x:570,y:350});
  assert.equal(approach.club.id,'iron7');assert.equal(approach.power,100);
  const green=prepareShot(h,{x:820,y:340});
  assert.equal(green.club.id,'putter');assert.ok(green.angle>0);
  assert.equal(green.power,suggestedPower(h,{x:820,y:340},CLUBS[5]));
});
test('aim timing changes the shot line while locked power remains exact',()=>{
  const h=practice(),club=CLUBS[0],lockedPower=powerAtTime(650,club);
  const strike=resolveSwing(club,lockedPower,'tee',0.1);
  const result=simulateShot(h,h.tee,club,lockedPower,strike.angleOffset);
  const straight=simulateShot(h,h.tee,club,lockedPower,0);
  assert.equal(lockedPower,65);assert.ok(result.ball.y<straight.ball.y);
  assert.ok(Math.abs(distance(h.tee,result.ball)-distance(h.tee,straight.ball))<2);
});
test('center timing preserves aim; left and right locks have opposite directions',()=>{
  const club=CLUBS[0];
  const clean=resolveSwing(club,75,'tee',0.5),early=resolveSwing(club,75,'tee',0.1),late=resolveSwing(club,75,'tee',0.9);
  assert.equal(clean.angleOffset,0);
  assert.ok(early.angleOffset<0);assert.ok(late.angleOffset>0);
  assert.ok(Math.abs(early.angleOffset+late.angleOffset)<1e-10);
  assert.deepEqual(early,resolveSwing(club,75,'tee',0.1));
});
test('high power and difficult lies narrow the clean band',()=>{
  const club=CLUBS[0],normal=swingWindow(club,75,'tee');
  assert.ok(swingWindow(club,100,'tee')<normal);
  assert.ok(swingWindow(club,75,'rough')<normal);
  assert.ok(swingWindow(club,75,'sand')<swingWindow(club,75,'rough'));
  assert.equal(resolveSwing(club,75,'tee',0.55).error,0);
  assert.ok(resolveSwing(club,100,'sand',0.55).error>0);
});
test('aim locks stay within club direction limits',()=>{
  const h=practice(),club=CLUBS[0];
  h.fairwayWidth=500;
  const clean=simulateShot(h,h.tee,club,75,0),strike=resolveSwing(club,75,'tee',0);
  const missed=simulateShot(h,h.tee,club,75,strike.angleOffset);
  assert.ok(missed.ball.y<clean.ball.y);
  assert.ok(Math.abs(distance(h.tee,missed.ball)-distance(h.tee,clean.ball))<2);
  assert.ok(Math.abs(Math.abs(strike.angleOffset)-12*Math.PI/180)<1e-10);
  assert.ok(Math.abs(resolveSwing(CLUBS[5],75,'green',0).angleOffset)<Math.abs(strike.angleOffset));
});
test('green speed changes roll distance',()=>{
  const h=practice(),ball={x:800,y:350};
  const fast=simulateShot({...h,greenSpeed:0.88},ball,CLUBS[5],20,Math.PI);
  const slow=simulateShot({...h,greenSpeed:1.13},ball,CLUBS[5],20,Math.PI);
  assert.ok(distance(ball,fast.ball)>distance(ball,slow.ball));
});
test('all 18 holes advance once and produce a valid completed round',()=>{
  let r=newRound('daily','2026-10-25','2026-10-25');const h=generateCourse(r.seed);
  for(let i=0;i<18;i++) {
    const old=structuredClone(r);r=completeHole(r,h[i].par,h);
    assert.equal(r.scores.length,i+1);assert.equal(old.scores.length,i);assert.ok(isRound(r));
    if(i<17){assert.deepEqual(r.ball,h[i+1].tee);assert.equal(r.strokes,0);}
  }
  assert.equal(r.complete,true);assert.equal(relativeScore(r.scores,h),0);
  assert.throws(()=>completeHole(r,4,h));
});
test('score labels and round validation handle invalid input',()=>{
  assert.equal(scoreLabel(3,4),'Birdie');assert.equal(scoreLabel(1,3),'Hole in one');assert.equal(scoreLabel(6,4),'Double bogey');
  const r=newRound('infinite','test');assert.ok(isRound(r));
  for(const bad of [null,{}, {...r,scores:[-1]}, {...r,ball:{x:NaN,y:3}}, {...r,complete:true}, {...r,strokes:99}, {...r,mode:'daily',seed:'wrong'}])assert.equal(isRound(bad),false);
});
test('a complete generated daily course can be played into all 18 cups',()=>{
  let round=newRound('daily','2026-10-25','2026-10-25');
  const holes=generateCourse(round.seed);
  for(const hole of holes) {
    let holed=false,strokes=0;
    while(!holed&&strokes<16) {
      const angle=Math.atan2(hole.pin.y-round.ball.y,hole.pin.x-round.ball.x);
      let best:ReturnType<typeof simulateShot>|undefined,bestCost=Infinity;
      for(const club of CLUBS) for(let power=2;power<=100;power+=2) {
        const shot=simulateShot(hole,round.ball,club,power,angle);
        const cost=shot.holed?-1:distance(shot.ball,hole.pin)+shot.penalty*10000;
        if(cost<bestCost){best=shot;bestCost=cost;}
      }
      assert.ok(best);assert.equal(best.penalty,0);
      assert.ok(best.frames.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.height)));
      round.ball=best.ball;holed=best.holed;round.shots++;strokes++;
    }
    assert.ok(holed,`Hole ${hole.number} must be reachable`);
    round=completeHole(round,strokes,holes);
  }
  assert.equal(round.complete,true);assert.equal(round.scores.length,18);assert.ok(isRound(round));
});
