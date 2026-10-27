import '@fontsource-variable/dm-sans';
import '@fontsource-variable/manrope';
import './style.css';
import { CLUBS, WIDTH, HEIGHT, generateCourse, newRound, completeHole, dailyDate, distance, lieAt, lieFactor, simulateShot, prepareShot, suggestedPower, powerAtTime, swingPosition, swingWindow, resolveSwing, holeName, relativeScore, formatScore, scoreLabel, clamp, type Round, type Club, type ShotFrame } from '@golf/game';
import { createRenderer } from './render.ts';
import { readRounds, writeRounds, mergeRounds, fetchRounds, backupRound, storageAvailable, playerId, backupEnabled } from './storage.ts';

const icons:Record<string,string>={
  flag:'<path d="M5 21V3m0 1c5-4 9 4 14 0v9c-5 4-9-4-14 0"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
  arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',
  wind:'<path d="M3 8h12c5 0 5-6 1-6-2 0-3 1-3 2M2 12h17c4 0 4 6 0 6-2 0-3-1-3-2M4 16h5c4 0 4 6 0 6"/>',
  chart:'<path d="M5 20V10m7 10V4m7 16v-7"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4m0 3v1"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
  volume:'<path d="m11 4-6 5H2v6h3l6 5V4m5 4c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/>',
  pin:'<circle cx="12" cy="9" r="3"/><path d="M19 9c0 6-7 12-7 12S5 15 5 9a7 7 0 0 1 14 0"/>',
  leaf:'<path d="M5 20c0-9 6-15 15-16 0 10-4 16-11 16-6 0-6-8-1-11m-3 11L16 9"/>',
  infinity:'<path d="M12 12c-3-7-10-7-10 0s7 7 10 0c3-7 10-7 10 0s-7 7-10 0Z"/>',
};
const icon=(name:string,cls='')=>`<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]??icons.flag}</svg>`;
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
let rounds=readRounds();
let round:Round;
let holes=generateCourse(dailyDate());
let club:Club=CLUBS[0];
let power=85,angle=0,busy=false,holed=false;
let moving:ShotFrame|null=null,trail:ShotFrame[]=[];
let syncState=backupEnabled?'Connecting to backup':'Saved in this browser';
let localOk=storageAvailable;
let modalOpen=false;
let sound=false;
let audio:AudioContext|null=null;
let lastInfiniteId=rounds.find(r=>r.mode==='infinite'&&!r.complete)?.id;
let shotToken=0;
let syncing=false;
let swinging=false,swingStart=0,swingFrame=0;
let meterPhase:'power'|'aim'='power';
let liveAngle=0;
const pendingBackups=new Map(rounds.map(r=>[r.id,r]));

document.querySelector<HTMLDivElement>('#app')!.innerHTML=`
  <header class="header"><a class="brand" href="${import.meta.env.BASE_URL}" aria-label="Daybreak Golf home"><span class="brand-mark">${icon('flag')}</span><span>DAYBREAK<span class="brand-sub">THE DAILY GOLF CLUB</span></span></a>
    <nav class="mode-nav" aria-label="Game mode"><button id="daily-mode" class="active">${icon('sun')}Daily course</button><button id="infinite-mode">${icon('infinity')}Infinite play</button></nav>
    <div class="header-actions"><button class="text-button" id="history-button">${icon('chart')}<span>My rounds</span></button><button class="icon-button" id="help-button" aria-label="How to play">${icon('help')}</button></div>
  </header>
  <main>
    <section class="intro"><div><div class="eyebrow" id="date-line">YOUR DAILY DOSE OF OUTSIDE</div><h1>A little time on the green<span>.</span></h1><p id="intro-copy">A new course every day. Eighteen holes. Just you and the fairway.</p><button id="new-links-course" class="new-course-link">New links course ${icon('arrow')}</button></div>
      <div class="course-stamp"><span class="stamp-icon">${icon('flag')}</span><div><strong id="stamp-title">The daily eighteen</strong><span id="stamp-detail">18 holes <i>·</i> Par 72 <i>·</i> A fresh start</span></div></div>
    </section>
    <div class="game-layout">
      <section class="course-wrap" aria-label="Golf course">
        <canvas id="course" tabindex="0" aria-label="Golf course. Aim starts toward the hole. Select a point to change aim, or use Left and Right. Press Space to start, lock power, then lock aim."></canvas>
        <div class="course-top"><div class="hole-label"><span id="hole-number">01</span><div><strong id="hole-name">Willow Bend</strong><small id="hole-info">PAR 4 <i>·</i> 380 YARDS</small></div></div><div class="wind-badge">${icon('wind')}<span><strong id="wind-speed">8 mph</strong><small>WIND <span id="wind-direction">↗</span></small></span></div></div>
        <div class="course-bottom"><span class="lie-pill"><span class="lie-dot"></span><span id="lie-label">On the tee</span></span><span class="aim-tip" id="aim-tip">Select the course to aim</span><button class="sound-button" id="sound-button" aria-label="Turn sound on" aria-pressed="false">${icon('volume')}<span id="sound-state">Off</span></button></div>
        <div class="shot-callout" id="shot-callout" role="status" aria-live="polite"></div>
        <span class="map-credit">DAYBREAK MUNICIPAL GOLF CLUB</span>
      </section>
      <aside class="control-panel">
        <div class="round-status"><span class="eyebrow" id="round-label">TODAY'S ROUND</span><span class="live-dot" title="Round in progress"></span></div>
        <div class="round-stats"><div><span class="stat-label">HOLE</span><strong><span id="current-hole">1</span><small> / 18</small></strong></div><div><span class="stat-label">STROKES</span><strong id="stroke-count">0</strong></div><div><span class="stat-label">SCORE</span><strong id="score-total">E</strong></div></div>
        <div class="distance-row"><span>${icon('pin')}To the pin</span><strong><span id="distance">380</span><small> yd</small></strong></div>
        <div class="club-heading"><label class="eyebrow">CHOOSE YOUR CLUB</label><span id="club-range">245 yd</span></div>
        <div class="clubs" role="group" aria-label="Select a club">${CLUBS.map(c=>`<button data-club="${c.id}" aria-pressed="false" title="${c.name}, ${c.yards} yards"><span class="club-glyph">${c.id==='putter'?'⌑':'⌁'}</span><strong>${c.short}</strong><small>${c.name}</small></button>`).join('')}</div>
        <div class="shot-sequence"><span id="power-step" class="active">1 · POWER</span><span>→</span><span id="aim-step">2 · AIM</span><strong><span id="power-value">75</span><small>%</small></strong></div>
        <div class="swing-control" id="swing-control"><div class="swing-heading"><span class="eyebrow" id="meter-label">POWER → AIM</span><span id="swing-feedback" role="status">Start to set power</span></div><div class="swing-meter power-meter" id="swing-meter" aria-label="Shot control meter"><span class="power-fill" id="power-fill"></span><span class="swing-zone" id="swing-zone"></span><span class="swing-center" id="swing-center"></span><span class="swing-needle" id="swing-needle"></span></div><div class="swing-scale"><span id="meter-left">1%</span><span id="meter-middle">POWER</span><span id="meter-right">100%</span></div><div class="locked-power" id="locked-power">Club and aim are set for the next shot.</div></div>
        <button id="shoot-button" class="primary-button">Start swing ${icon('arrow')}</button>
        <p class="shot-hint" id="shot-hint">Aim on the course, then take your shot.</p>
        <div class="conditions"><span>${icon('leaf')}<span id="condition-text">Fairways are firm. Greens are quick.</span></span><button id="pickup-button" class="subtle-button" hidden>Pick up · score 16</button></div>
      </aside>
    </div>
    <section class="scorecard" aria-label="Round scorecard"><div class="scorecard-title">${icon('flag')}<div><strong>Your scorecard</strong><span id="scorecard-caption">One hole at a time.</span></div></div><div class="scorecard-scroll"><table><thead><tr id="scorecard-holes"><th scope="row">HOLE</th></tr></thead><tbody><tr id="scorecard-par"><th scope="row">PAR</th></tr><tr id="scorecard-scores"><th scope="row">YOU</th></tr></tbody></table></div><div class="scorecard-total"><small>TOTAL</small><strong id="total-strokes">—</strong><span id="total-par">PAR 72</span></div></section>
    <footer><span class="footer-motto">A fresh course. A clear head. See you tomorrow.</span><span class="save-state" id="save-state" role="status">${backupEnabled?'Connecting to backup':'Saved in this browser'}</span></footer>
  </main><div id="modal-root"></div>`;

const canvas=$<HTMLCanvasElement>('course');
const draw=createRenderer(canvas);


function paint() {if(round)draw({hole:holes[round.holeIndex],ball:round.ball,angle:swinging&&meterPhase==='aim'?liveAngle:angle,power,club,moving,trail,aim:!busy&&!round.complete,holed});}
function showCallout(message:string) {$('shot-callout').textContent=message;$('shot-callout').classList.add('visible');}
function hideCallout() {$('shot-callout').classList.remove('visible');}
function resetSetup() {
  const setup=prepareShot(holes[round.holeIndex],round.ball);
  club=setup.club;power=setup.power;angle=setup.angle;liveAngle=angle;meterPhase='power';
  $('swing-feedback').textContent='Start to set power';
  $('swing-needle').style.left='0%';
}
function updateMeter() {
  const aiming=meterPhase==='aim';
  const target=suggestedPower(holes[round.holeIndex],round.ball,club);
  const window=swingWindow(club,power,lieAt(holes[round.holeIndex],round.ball));
  $('power-value').textContent=String(power);
  $('swing-zone').style.left=`${aiming?(0.5-window)*100:Math.max(0,target-3)}%`;
  $('swing-zone').style.width=`${aiming?window*200:Math.min(6,103-target)}%`;
  $('swing-center').style.left=`${aiming?50:target}%`;
  $('power-fill').style.width=`${aiming?0:power}%`;
  $('swing-meter').classList.toggle('power-meter',!aiming);
  $('power-step').classList.toggle('active',!aiming);
  $('power-step').classList.toggle('locked',aiming);
  $('aim-step').classList.toggle('active',aiming);
  $('meter-label').textContent=aiming?'LOCK THE AIM':'LOCK THE POWER';
  $('meter-left').textContent=aiming?'LEFT':'1%';
  $('meter-middle').textContent=aiming?'STRAIGHT':`SUGGESTED ${target}%`;
  $('meter-right').textContent=aiming?'RIGHT':'100%';
  $('locked-power').textContent=aiming?`Power locked at ${power}%. Stop the line where you want to aim.`:'Select a club or adjust the aim before you start.';
}
function updateUI() {
  const h=holes[round.holeIndex],lie=lieAt(h,round.ball),rel=relativeScore(round.scores,holes);
  $('daily-mode').classList.toggle('active',round.mode==='daily');$('infinite-mode').classList.toggle('active',round.mode==='infinite');
  $('daily-mode').setAttribute('aria-pressed',String(round.mode==='daily'));$('infinite-mode').setAttribute('aria-pressed',String(round.mode==='infinite'));
  for(const id of ['daily-mode','infinite-mode','history-button','help-button','new-links-course'])$<HTMLButtonElement>(id).disabled=busy||swinging;
  $('date-line').textContent=round.mode==='daily'?new Date(`${round.date}T12:00:00Z`).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).toUpperCase()+' · DAILY COURSE': 'NO CLOCK. NO LIMIT. JUST GOLF.';
  $('intro-copy').textContent=h.style==='links'?'Coastal dunes. Pot bunkers. Find your line around the next bend.':round.mode==='daily'?'A new course every day. Eighteen holes. Just you and the fairway.':'Stay a little longer. A new course is always around the corner.';
  $('stamp-title').textContent=round.mode==='daily'?'The daily eighteen':'The endless fairway';
  $('stamp-detail').innerHTML=`18 holes <i>·</i> Par ${holes.reduce((s,h)=>s+h.par,0)} <i>·</i> ${round.mode==='daily'?'New at 00:00 UTC':'A course of your own'}`;
  $('round-label').textContent=round.complete?'ROUND COMPLETE':round.mode==='daily'?"TODAY'S ROUND":'INFINITE ROUND';
  $('hole-number').textContent=String(h.number).padStart(2,'0');$('hole-name').textContent=holeName(h);$('hole-info').innerHTML=`PAR ${h.par} <i>·</i> ${h.yards} YARDS${h.layout?` <i>·</i> ${h.layout.toUpperCase()}`:''}`;
  $('wind-speed').textContent=`${h.wind.speed} mph`;
  $('wind-direction').textContent=['→','↘','↓','↙','←','↖','↑','↗'][Math.round(h.wind.angle/(Math.PI/4))%8];
  $('current-hole').textContent=String(h.number);$('stroke-count').textContent=String(round.strokes);$('score-total').textContent=formatScore(rel);
  $('distance').textContent=String(Math.round(distance(round.ball,h.pin)/h.scale));
  $('lie-label').textContent=holed?'In the cup':({tee:'On the tee',fairway:'Fairway',rough:'In the rough',sand:'In the sand',water:'Water',green:'On the green'}[lie]);
  $('condition-text').textContent=lie==='sand'?'Sand reduces shot distance by 52%.':lie==='rough'?'Rough reduces shot distance by 28%.':lie==='green'?`Green speed: ${h.greenSpeed>1?'slow':'fast'}. Try the putter.`:'Wind affects airborne shots.';
  $('club-range').textContent=`${Math.round(club.yards*lieFactor(lie))} yd max`;
  document.querySelectorAll<HTMLButtonElement>('[data-club]').forEach(b=>{const active=b.dataset.club===club.id;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));b.disabled=busy||swinging||round.complete||holed;});
  updateMeter();
  $('swing-control').classList.toggle('swing-active',swinging);
  const shoot=$<HTMLButtonElement>('shoot-button');shoot.disabled=busy||(holed&&!round.complete);
  shoot.innerHTML=busy?'Ball in motion…':round.complete?`View your round ${icon('arrow')}`:swinging?(meterPhase==='power'?'Lock power':'Lock aim & shoot'):`Start swing ${icon('arrow')}`;
  $('shot-hint').textContent=busy?'A little patience. Let it roll.':round.complete?'A full scorecard. Time for a fresh course.':swinging?(meterPhase==='power'?'Press to lock power. Then lock the aim.':'Press to lock the moving line and shoot.'):'Start → lock power → lock aim. Space or button.';
  $('pickup-button').hidden=round.strokes<8||holed||round.complete||busy||swinging;
  $('aim-tip').textContent=busy?'Watch it fly':round.complete?'A round well spent':swinging&&meterPhase==='aim'?'Lock the moving aim line':'Aim starts toward the hole';
  const sum=round.scores.reduce((a,b)=>a+b,0);
  $('total-strokes').textContent=sum?String(sum):'—';$('total-par').textContent=`${formatScore(rel)} TO PAR`;
  $('scorecard-caption').textContent=round.complete?'All eighteen. Nicely done.':`${round.scores.length} of 18 complete`;
  $('scorecard-holes').innerHTML='<th scope="row">HOLE</th>'+holes.map((h,i)=>`<th scope="col" class="${i===round.holeIndex?'current':''}">${h.number}</th>`).join('');
  $('scorecard-par').innerHTML='<th scope="row">PAR</th>'+holes.map((h,i)=>`<td class="${i===round.holeIndex?'current':''}">${h.par}</td>`).join('');
  $('scorecard-scores').innerHTML='<th scope="row">YOU</th>'+holes.map((h,i)=>`<td class="${i===round.holeIndex?'current':''}"><span class="${round.scores[i]!==undefined?(round.scores[i]<h.par?'under':round.scores[i]>h.par?'over':'even'):''}">${round.scores[i]??'·'}</span></td>`).join('');
  updateSaveState();paint();
}
function updateSaveState() {
  if(!backupEnabled){$('save-state').textContent=localOk?'Saved in this browser':'Browser storage unavailable · scores will not survive a reload';$('save-state').classList.toggle('offline',!localOk);return;}
  $('save-state').textContent=localOk?syncState:syncState==='Backed up to SQLite'?'SQLite backup saved · browser storage unavailable':'Browser storage unavailable · backup pending';
  $('save-state').classList.toggle('offline',syncState.includes('pending')||!localOk);
}
async function sync() {
  if(!backupEnabled||syncing)return;
  syncing=true;
  try {
    while(pendingBackups.size) {
      const r=pendingBackups.values().next().value!;
      await backupRound(r);
      if(pendingBackups.get(r.id)===r)pendingBackups.delete(r.id);
    }
    syncState='Backed up to SQLite';
  } catch {syncState='Saved on this device · backup pending';}
  syncing=false;
  updateSaveState();
}
function persist() {
  round.updatedAt=new Date().toISOString();
  rounds=mergeRounds(rounds.filter(r=>r.id!==round.id),[structuredClone(round)]);
  if(backupEnabled)pendingBackups.set(round.id,structuredClone(round));
  localOk=writeRounds(rounds);if(backupEnabled)syncState='Saving backup…';updateSaveState();if(backupEnabled)void sync();
}
function activate(r:Round) {
  cancelAnimationFrame(swingFrame);swinging=false;
  shotToken++;round=structuredClone(r);holes=generateCourse(round.seed,round.courseVersion??1);busy=false;holed=round.complete;moving=null;trail=[];
  resetSetup();hideCallout();updateUI();
}
function changeMode(mode:'daily'|'infinite') {
  if(busy||swinging)return;
  closeModal();
  if(mode==='daily') {
    const date=dailyDate();activate(rounds.find(r=>r.id===`daily-${date}`)??newRound('daily',date,date));
  } else {
    const existing=rounds.find(r=>r.id===lastInfiniteId);
    const next=existing??newRound('infinite',crypto.randomUUID());lastInfiniteId=next.id;activate(next);
  }
  persist();
  if(round.complete)showSummary();
}
function beep(frequency:number,duration:number) {
  if(!sound)return;
  try{audio??=new AudioContext();void audio.resume();const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.type='sine';oscillator.frequency.value=frequency;gain.gain.setValueAtTime(0.06,audio.currentTime);gain.gain.exponentialRampToValueAtTime(0.001,audio.currentTime+duration);oscillator.connect(gain);gain.connect(audio.destination);oscillator.start();oscillator.stop(audio.currentTime+duration);}catch{/* Sound is optional. */}
}
async function takeShot() {
  if(busy||modalOpen)return;
  if(round.complete){showSummary();return;}
  if(holed)return;
  if(!swinging) {
    swinging=true;meterPhase='power';swingStart=performance.now();hideCallout();
    $('swing-feedback').textContent='Press to lock power';updateUI();
    const tick=()=>{
      if(!swinging)return;
      const elapsed=performance.now()-swingStart;
      if(meterPhase==='power') {
        power=powerAtTime(elapsed,club);
        $('swing-needle').style.left=`${power}%`;
        $('power-fill').style.width=`${power}%`;
        $('power-value').textContent=String(power);
      } else {
        const position=swingPosition(elapsed,club);
        liveAngle=angle+resolveSwing(club,power,lieAt(holes[round.holeIndex],round.ball),position).angleOffset;
        $('swing-needle').style.left=`${position*100}%`;
      }
      paint();swingFrame=requestAnimationFrame(tick);
    };
    tick();return;
  }
  if(meterPhase==='power') {
    power=powerAtTime(performance.now()-swingStart,club);
    meterPhase='aim';swingStart=performance.now();
    liveAngle=angle+resolveSwing(club,power,lieAt(holes[round.holeIndex],round.ball),0).angleOffset;
    $('swing-needle').style.left='0%';
    $('swing-feedback').textContent='Press to lock aim';updateUI();return;
  }
  const position=swingPosition(performance.now()-swingStart,club);
  const strike=resolveSwing(club,power,lieAt(holes[round.holeIndex],round.ball),position);
  liveAngle=angle+strike.angleOffset;
  swinging=false;cancelAnimationFrame(swingFrame);
  $('swing-needle').style.left=`${position*100}%`;
  const shotFeedback=`${power}% power · ${strike.label}`;
  $('swing-feedback').textContent=shotFeedback;
  busy=true;hideCallout();beep(club.id==='putter'?360:620,0.12);
  const result=simulateShot(holes[round.holeIndex],round.ball,club,power,liveAngle);
  const token=++shotToken;trail=[];updateUI();
  const start=performance.now(),duration=clamp(result.frames.length*12,850,3200);
  await new Promise<void>(resolve=>{
    function frame(now:number){
      if(token!==shotToken){resolve();return;}
      const t=Math.min(1,(now-start)/duration),index=Math.min(result.frames.length-1,Math.floor(t*result.frames.length));
      moving=result.frames[index]??null;trail=result.frames.slice(0,index+1);paint();
      if(t<1)requestAnimationFrame(frame);else resolve();
    }requestAnimationFrame(frame);
  });
  if(token!==shotToken)return;
  moving=null;busy=false;round.ball=result.ball;round.shots++;round.strokes+=1+result.penalty;round.penalties+=result.penalty;
  if(result.holed||round.strokes>=16) {finishHole(result.holed?Math.min(round.strokes,16):16,result.holed);return;}
  persist();resetSetup();$('swing-feedback').textContent=shotFeedback;showCallout(`${shotFeedback}. ${result.message}`);updateUI();
}
function finishHole(strokes:number,inCup:boolean) {
  holed=true;
  const h=holes[round.holeIndex],label=inCup?scoreLabel(strokes,h.par):'Stroke limit';
  round=completeHole(round,strokes,holes);
  if(round.complete){persist();updateUI();beep(880,0.5);showSummary();return;}
  // Store the next tee immediately, so a page refresh cannot repeat a finished hole.
  const completed=h.number;
  persist();beep(strokes<=h.par?880:440,0.3);
  openModal(`<div class="modal-emblem">${icon('flag')}</div><span class="eyebrow">HOLE ${completed} COMPLETE</span><h2>${label}<span>.</span></h2><p>${strokes} strokes on a par ${h.par}. Take a breath. The next fairway is waiting.</p><div class="result-grid"><div><small>ROUND SCORE</small><strong>${formatScore(relativeScore(round.scores,holes))}</strong></div><div><small>UP NEXT</small><strong>Hole ${completed+1}</strong></div></div><button class="primary-button" id="next-hole">Next hole ${icon('arrow')}</button>`,false);
  $('next-hole').onclick=()=>{closeModal();holed=false;trail=[];resetSetup();updateUI();};
}
let previousFocus:HTMLElement|null=null;
function openModal(content:string,canClose=true) {
  previousFocus=document.activeElement as HTMLElement;modalOpen=true;
  $('modal-root').innerHTML=`<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-label="Golf information">${canClose?`<button class="icon-button modal-close" id="close-modal" aria-label="Close">${icon('close')}</button>`:''}${content}</section></div>`;
  if(canClose){$('close-modal').onclick=closeModal;document.querySelector('.modal-backdrop')!.addEventListener('click',e=>{if(e.target===e.currentTarget)closeModal();});}
  document.querySelector<HTMLButtonElement>('.modal button')?.focus();
}
function closeModal() {$('modal-root').innerHTML='';modalOpen=false;previousFocus?.focus();}
function startFreshInfinite(){closeModal();const r=newRound('infinite',crypto.randomUUID());lastInfiniteId=r.id;activate(r);persist();}
function showSummary() {
  const total=round.scores.reduce((s,n)=>s+n,0),rel=relativeScore(round.scores,holes);
  openModal(`<div class="modal-emblem">${icon('sun')}</div><span class="eyebrow">EIGHTEEN HOLES. WELL SPENT.</span><h2>That's a round<span>.</span></h2><p>Your ${round.mode==='daily'?'daily':'infinite'} course is complete. Your scorecard is saved.</p><div class="summary-score">${total}<span>STROKES <b>${formatScore(rel)}</b></span></div><div class="result-grid"><div><small>BIRDIES OR BETTER</small><strong>${round.scores.filter((s,i)=>s<holes[i].par).length}</strong></div><div><small>PARS</small><strong>${round.scores.filter((s,i)=>s===holes[i].par).length}</strong></div><div><small>PENALTIES</small><strong>${round.penalties}</strong></div></div><button class="primary-button" id="new-course">Play a new course ${icon('arrow')}</button><button class="secondary-button" id="share-score">Copy scorecard</button>`);
  $('new-course').onclick=startFreshInfinite;
  $('share-score').onclick=async()=>{
    const text=`Daybreak Golf · ${round.mode==='daily'?round.date:'Infinite'}\n${total} strokes (${formatScore(rel)}) · Par ${holes.reduce((s,h)=>s+h.par,0)}\n${round.scores.map((s,i)=>s<holes[i].par?'🟢':s===holes[i].par?'⚪':'🟠').join('')}`;
    try{await navigator.clipboard.writeText(text);$('share-score').textContent='Scorecard copied';}catch{$('share-score').textContent='Clipboard is not available';}
  };
}
function showHelp() {
  openModal(`<span class="eyebrow">WELCOME TO THE CLUB</span><h2>Power. Aim. Play<span>.</span></h2><p>Get the ball into the cup in as few strokes as possible.</p><ol class="help-list"><li><strong>Check the setup.</strong> The game selects a club and points the aim toward the hole after each shot. You can select another club or point on the course.</li><li><strong>Lock the power.</strong> Select “Start swing” or press Space. The bar moves between 1% and 100%. Press again to lock the power. The marker shows a suggested power for the distance.</li><li><strong>Lock the aim.</strong> The same bar now controls aim. The line moves left and right around your target. Press again to lock the visible line and shoot. The center band gives a straight shot.</li></ol><div class="help-conditions"><span><b>Rough</b> 28% less distance; harder aim timing</span><span><b>Sand</b> 52% less distance; harder aim timing</span><span><b>Water / out of bounds</b> +1 stroke, return to previous spot</span><span><b>Wind</b> Moves airborne shots in the arrow direction</span><span><b>Green</b> Fast roll; use the putter</span></div><p class="small-copy">Escape cancels either meter step without a stroke. Left and Right adjust the starting aim before a swing. Power stays at the value you lock. High power narrows the straight aim band. Fast shots can roll across the cup. Trees mark rough and do not block the ball. Each hole has a 16-stroke limit. Daily courses change at 00:00 UTC.</p><p class="small-copy">${backupEnabled?'Scores save in this browser and back up to SQLite. Keep the browser backup key to restore your scores.':'Scores save only in this browser. Clearing site data removes your scores. Scores do not move between devices.'}</p><button id="help-done" class="primary-button">Let's play ${icon('arrow')}</button>`);
  $('help-done').onclick=closeModal;
}
function showHistory() {
  const items=[...rounds].sort((a,b)=>Date.parse(b.updatedAt)-Date.parse(a.updatedAt));
  openModal(`<span class="eyebrow">YOUR TIME ON THE COURSE</span><h2>My rounds<span>.</span></h2><p>Every scorecard has a story. These are yours.</p><div class="history-list">${items.map((r,i)=>{
    const hs=generateCourse(r.seed,r.courseVersion??1);return `<button class="history-item" data-round="${i}"><span class="history-icon">${icon(r.mode==='daily'?'sun':'infinity')}</span><span><strong>${r.mode==='daily'?'Daily course':'Infinite course'}</strong><small>${r.date} · ${r.complete?'18 holes complete':`${r.scores.length} / 18 holes`}</small></span><b>${formatScore(relativeScore(r.scores,hs))}</b>${icon('arrow')}</button>`;
  }).join('')||'<p>No rounds yet. Your first tee is waiting.</p>'}</div>${backupEnabled?`<p class="small-copy">Backup key: <code>${playerId}</code><br>Keep this key private. It identifies your scores on this local server.</p>`:`<p class="small-copy">Scores are saved in this browser only. Clearing site data removes them.</p>`}`);
  document.querySelectorAll<HTMLButtonElement>('[data-round]').forEach(b=>b.onclick=()=>{closeModal();activate(items[Number(b.dataset.round)]);if(round.mode==='infinite')lastInfiniteId=round.id;if(round.complete)showSummary();});
}

canvas.addEventListener('pointerdown',e=>{
  if(busy||swinging||holed||round.complete||modalOpen)return;
  const rect=canvas.getBoundingClientRect();
  angle=Math.atan2((e.clientY-rect.top)/rect.height*HEIGHT-round.ball.y,(e.clientX-rect.left)/rect.width*WIDTH-round.ball.x);
  hideCallout();paint();canvas.focus({preventScroll:true});
});
document.querySelectorAll<HTMLButtonElement>('[data-club]').forEach(b=>b.onclick=()=>{if(busy||swinging||holed||round.complete)return;club=CLUBS.find(c=>c.id===b.dataset.club)!;power=suggestedPower(holes[round.holeIndex],round.ball,club);meterPhase='power';updateUI();});
$('shoot-button').onclick=()=>void takeShot();
$('new-links-course').onclick=()=>{if(!busy&&!swinging)startFreshInfinite();};
$('daily-mode').onclick=()=>changeMode('daily');$('infinite-mode').onclick=()=>changeMode('infinite');
$('help-button').onclick=()=>{if(!busy&&(!holed||round.complete))showHelp();};$('history-button').onclick=()=>{if(!busy&&(!holed||round.complete))showHistory();};
$('pickup-button').onclick=()=>{if(!busy&&!holed&&round.strokes>=8)finishHole(16,false);};
$('sound-button').onclick=()=>{sound=!sound;$('sound-button').setAttribute('aria-pressed',String(sound));$('sound-button').setAttribute('aria-label',`Turn sound ${sound?'off':'on'}`);$('sound-state').textContent=sound?'On':'Off';beep(540,0.1);};
document.addEventListener('keydown',e=>{
  if(swinging) {
    if(e.code==='Space'){e.preventDefault();if(!e.repeat)void takeShot();}
    if(e.key==='Escape'){e.preventDefault();cancelSwing();}
    return;
  }
  if(modalOpen){
    if(e.key==='Escape'&&$('close-modal')){e.preventDefault();closeModal();}
    if(e.key==='Tab') {const focusable=[...document.querySelectorAll<HTMLElement>('.modal button, .modal a, .modal input')];const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
    return;
  }
  if(busy||holed||round.complete||(e.target as HTMLElement).matches('input,button,a'))return;
  if(!['ArrowLeft','ArrowRight',' '].includes(e.key))return;
  e.preventDefault();
  if(e.key==='ArrowLeft')angle-=Math.PI/90;
  if(e.key==='ArrowRight')angle+=Math.PI/90;
  if(e.key===' '){if(!e.repeat)void takeShot();}else updateUI();
});
function cancelSwing() {
  if(!swinging)return;
  swinging=false;cancelAnimationFrame(swingFrame);meterPhase='power';power=suggestedPower(holes[round.holeIndex],round.ball,club);$('swing-needle').style.left='0%';
  $('swing-feedback').textContent='Swing canceled. No stroke used.';updateUI();
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelSwing();});
new ResizeObserver(()=>paint()).observe(canvas);
if(backupEnabled){
  window.addEventListener('online',()=>void sync());
  setInterval(()=>{if(!busy&&syncState.includes('pending'))void sync();},30000);
}
window.addEventListener('storage',e=>{if(e.key==='daybreak.rounds.v1')rounds=mergeRounds(rounds,readRounds());});

async function boot() {
  const date=dailyDate();
  // Static Pages builds use browser storage and start without an API request.
  if(!backupEnabled){activate(rounds.find(r=>r.id===`daily-${date}`)??newRound('daily',date,date));persist();if(round.complete)showSummary();return;}
  // Show the course at once. Restore the newest backup before play starts.
  activate(rounds.find(r=>r.id===`daily-${date}`)??newRound('daily',date,date));
  busy=true;updateUI();$('shoot-button').textContent='Loading your scorecard…';
  try {rounds=mergeRounds(rounds,await fetchRounds());localOk=writeRounds(rounds);syncState='Backed up to SQLite';}
  catch {syncState='Saved on this device · backup pending';}
  activate(rounds.find(r=>r.id===`daily-${date}`)??newRound('daily',date,date));
  persist();
  if(round.complete)showSummary();
}
void boot();
