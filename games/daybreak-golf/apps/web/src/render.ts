import { WIDTH, HEIGHT, distance, shotDistance, type Hole, type Point, type Club, type ShotFrame } from '@golf/game';

export type View = { hole: Hole; ball: Point; angle: number; power: number; club: Club; moving: ShotFrame|null; trail: ShotFrame[]; aim: boolean; holed: boolean };
export function createRenderer(canvas:HTMLCanvasElement) {
  const ctx=canvas.getContext('2d')!;
  const base=document.createElement('canvas');base.width=WIDTH;base.height=HEIGHT;
  const c=base.getContext('2d')!;
  let previous:Hole|null=null;
  function ellipse(context:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,color:string,rotation=0) {
    context.beginPath();context.ellipse(x,y,rx,ry,rotation,0,Math.PI*2);context.fillStyle=color;context.fill();
  }
  function route(h:Hole) {
    c.beginPath(); c.moveTo(h.route[0].x,h.route[0].y);
    for(let i=1;i<h.route.length;i++) c.lineTo(h.route[i].x,h.route[i].y);
    c.lineJoin='round';c.lineCap='round';
  }
  function strokeRoute(context:CanvasRenderingContext2D,h:Hole,padding:number,color:string) {
    context.strokeStyle=color;context.fillStyle=color;context.lineCap='round';context.lineJoin='round';
    for(let j=1;j<h.route.length;j++) {
      context.beginPath();context.moveTo(h.route[j-1].x,h.route[j-1].y);context.lineTo(h.route[j].x,h.route[j].y);
      context.lineWidth=((h.fairwayWidths?.[j-1]??h.fairwayWidth)+(h.fairwayWidths?.[j]??h.fairwayWidth))/2+padding;context.stroke();
    }
  }
  function terrain(h:Hole) {
    c.fillStyle=h.style==='links'?'#919963':'#5c834f';c.fillRect(0,0,WIDTH,HEIGHT);
    // Light bands give the rough a cut-grass texture.
    c.save();c.globalAlpha=0.045;
    for(let i=-HEIGHT;i<WIDTH;i+=48) {c.fillStyle='#173f32';c.beginPath();c.moveTo(i,0);c.lineTo(i+28,0);c.lineTo(i+HEIGHT+28,HEIGHT);c.lineTo(i+HEIGHT,HEIGHT);c.fill();}
    c.restore();
    for(const dune of h.dunes??[]) {
      ellipse(c,dune.x+5,dune.y+5,dune.rx+4,dune.ry+3,'#727f4b33',dune.rotation);
      ellipse(c,dune.x,dune.y,dune.rx,dune.ry,'#a9aa73',dune.rotation);
      ellipse(c,dune.x-5,dune.y-4,dune.rx*0.79,dune.ry*0.72,'#b5b17b',dune.rotation);
      c.save();c.translate(dune.x,dune.y);c.rotate(dune.rotation);c.strokeStyle='#87894f99';c.lineWidth=1.3;
      for(let k=-2;k<=2;k++){const x=k*6;c.beginPath();c.moveTo(x,4);c.lineTo(x-3,-4);c.moveTo(x,4);c.lineTo(x+1,-7);c.moveTo(x,4);c.lineTo(x+4,-2);c.stroke();}c.restore();
    }
    if(h.style==='links') {
      strokeRoute(c,h,20,'#808f53');strokeRoute(c,h,6,'#a8b777');strokeRoute(c,h,0,'#b0c083');
    } else {
      route(h);c.strokeStyle='#527648';c.lineWidth=h.fairwayWidth+30;c.stroke();
      route(h);c.strokeStyle='#8eae6c';c.lineWidth=h.fairwayWidth+8;c.stroke();
      route(h);c.strokeStyle='#9abb77';c.lineWidth=h.fairwayWidth;c.stroke();
    }
    // Clip bands to the fairway with a transparent surface.
    const grass=document.createElement('canvas');grass.width=WIDTH;grass.height=HEIGHT;
    const g=grass.getContext('2d')!;
    strokeRoute(g,h,0,'#fff');
    g.globalCompositeOperation='source-in';
    for(let x=-HEIGHT;x<WIDTH;x+=64) {g.fillStyle='#ffffff0b';g.beginPath();g.moveTo(x,0);g.lineTo(x+32,0);g.lineTo(x+HEIGHT+32,HEIGHT);g.lineTo(x+HEIGHT,HEIGHT);g.fill();}
    c.drawImage(grass,0,0);
    for(const hazard of h.hazards) {
      const {x,y,rx,ry,rotation,type}=hazard;
      if(type==='water') {
        ellipse(c,x,y,rx+6,ry+6,'#446c4b',rotation);
        ellipse(c,x,y,rx+2,ry+2,'#b2b68a',rotation);
        ellipse(c,x,y,rx,ry,'#70a9a5',rotation);
        ellipse(c,x-5,y-5,rx*0.86,ry*0.77,'#78b2ab',rotation);
        c.save();c.beginPath();c.ellipse(x,y,rx-5,ry-5,rotation,0,Math.PI*2);c.clip();
        c.strokeStyle='#acd1bd66';c.lineWidth=2;
        for(let a=-3;a<=3;a++){c.beginPath();c.moveTo(x-rx+12,y+a*14);c.quadraticCurveTo(x,y+a*14-5,x+rx-12,y+a*14);c.stroke();}c.restore();
      } else {
        ellipse(c,x,y+3,rx+5,ry+5,h.style==='links'?'#6e7946':'#67834e',rotation);
        if(h.style==='links')ellipse(c,x,y,rx+2,ry+2,'#71603e',rotation);
        ellipse(c,x,y,rx+3,ry+3,'#c3b581',rotation);
        ellipse(c,x,y-2,rx,ry,'#ead8a3',rotation);
        ellipse(c,x-4,y-5,rx*0.78,ry*0.72,'#f0e1b6',rotation);
        c.save();c.translate(x,y);c.rotate(rotation);c.strokeStyle='#c6af783f';c.lineWidth=1;
        for(let j=-2;j<=2;j++){c.beginPath();c.ellipse(0,j*2,rx*0.7,ry*0.5+j*2,0,0.2,2.9);c.stroke();}c.restore();
      }
    }
    ellipse(c,h.pin.x,h.pin.y,h.greenRadius+8,h.greenRadius+5,'#80a361');
    ellipse(c,h.pin.x,h.pin.y,h.greenRadius,h.greenRadius-3,'#b3cf85');
    ellipse(c,h.pin.x-8,h.pin.y-7,h.greenRadius*0.78,h.greenRadius*0.7,'#b9d48d');
    // A small fringe separates the tee box from the fairway.
    c.save();c.translate(h.tee.x,h.tee.y);c.rotate(Math.atan2(h.route[1].y-h.tee.y,h.route[1].x-h.tee.x));
    c.fillStyle='#6a9658';c.beginPath();c.roundRect(-25,-18,50,36,8);c.fill();
    c.fillStyle='#b5ce8a';c.fillRect(-16,-12,32,24);
    c.fillStyle='#f4e9cc';c.fillRect(-3,-18,6,5);c.fillRect(-3,13,6,5);c.restore();
    // Trees are visual scenery. The rough beneath them reduces shot distance.
    for(const t of h.trees.sort((a,b)=>a.y-b.y)) {
      ellipse(c,t.x+10,t.y+10,t.size*1.05,t.size*0.6,'#264d373b',-0.5);
      ellipse(c,t.x,t.y,t.size,t.size*0.88,'#315c3c');
      ellipse(c,t.x-3,t.y-5,t.size*0.86,t.size*0.72,'#416e43');
      ellipse(c,t.x-5,t.y-8,t.size*0.58,t.size*0.5,'#4a7848');
    }
    // A quiet boundary frame helps show the edge of play.
    c.strokeStyle='#eff0cb30';c.lineWidth=1;c.setLineDash([4,10]);
    c.beginPath();c.roundRect(22,22,WIDTH-44,HEIGHT-44,24);c.stroke();c.setLineDash([]);
  }
  function draw(v:View) {
    const dpr=Math.min(devicePixelRatio||1,2);
    const width=Math.round(canvas.clientWidth*dpr),height=Math.round(canvas.clientHeight*dpr);
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
    ctx.setTransform(canvas.width/WIDTH,0,0,canvas.height/HEIGHT,0,0);
    if(v.hole!==previous){terrain(v.hole);previous=v.hole;}
    ctx.drawImage(base,0,0);
    const h=v.hole;
    if(v.trail.length>1) {
      ctx.beginPath();v.trail.forEach((p,i)=>i?ctx.lineTo(p.x,p.y-p.height*0.4):ctx.moveTo(p.x,p.y));
      ctx.strokeStyle='#f8ecc470';ctx.lineWidth=2;ctx.setLineDash([3,6]);ctx.stroke();ctx.setLineDash([]);
    }
    if(v.aim&&!v.moving&&!v.holed) {
      const length=shotDistance(h,v.ball,v.club,v.power)*h.scale;
      const target={x:v.ball.x+Math.cos(v.angle)*length,y:v.ball.y+Math.sin(v.angle)*length};
      ctx.beginPath();ctx.moveTo(v.ball.x,v.ball.y);ctx.lineTo(target.x,target.y);
      ctx.setLineDash([2,10]);ctx.strokeStyle='#fffce7b5';ctx.lineWidth=2.5;ctx.stroke();ctx.setLineDash([]);
      ctx.beginPath();ctx.arc(target.x,target.y,13,0,Math.PI*2);ctx.strokeStyle='#fffce7cc';ctx.lineWidth=1.5;ctx.stroke();
      ctx.beginPath();ctx.arc(target.x,target.y,4,0,Math.PI*2);ctx.fillStyle='#fffce7';ctx.fill();
      if(distance(target,h.pin)>30) {
        ctx.fillStyle='#193f32d9';ctx.beginPath();ctx.roundRect(target.x-29,target.y+22,58,24,12);ctx.fill();
        ctx.fillStyle='#fff8dc';ctx.font='11px system-ui';ctx.textAlign='center';ctx.fillText(`${Math.round(length/h.scale)} yd`,target.x,target.y+38);
      }
    }
    ellipse(ctx,h.pin.x,h.pin.y,7,4,'#315c39');
    // Flag and its shadow.
    ctx.beginPath();ctx.moveTo(h.pin.x,h.pin.y);ctx.lineTo(h.pin.x+19,h.pin.y+4);ctx.strokeStyle='#56723a50';ctx.lineWidth=3;ctx.stroke();
    ctx.beginPath();ctx.moveTo(h.pin.x,h.pin.y);ctx.lineTo(h.pin.x,h.pin.y-49);ctx.strokeStyle='#f7f0d9';ctx.lineWidth=2.5;ctx.stroke();
    ctx.beginPath();ctx.moveTo(h.pin.x+1,h.pin.y-49);ctx.lineTo(h.pin.x+30,h.pin.y-41);ctx.lineTo(h.pin.x+1,h.pin.y-30);ctx.fillStyle='#e9b968';ctx.fill();
    ctx.fillStyle='#714d28';ctx.font='bold 10px system-ui';ctx.textAlign='left';ctx.fillText(String(h.number),h.pin.x+7,h.pin.y-37);
    if(!v.holed) {
      const b=v.moving??{...v.ball,height:0};
      ellipse(ctx,b.x+2,b.y+3,5+b.height*0.025,3+b.height*0.012,'#1f3a3260');
      if(!v.moving) {ctx.beginPath();ctx.arc(b.x,b.y,12,0,Math.PI*2);ctx.strokeStyle='#f9f5d87a';ctx.lineWidth=1;ctx.stroke();}
      ellipse(ctx,b.x,b.y-b.height,5.5,5.5,'#fffdf0');
      ellipse(ctx,b.x+1,b.y-b.height+1,2,2,'#e6e7d6');
    }
  }
  return draw;
}
