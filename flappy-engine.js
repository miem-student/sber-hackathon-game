'use strict';

const FlappyEngine = (() => {
  const WIDTH=360,HEIGHT=480,TARGET=8,X=88,RADIUS=13,GAP=210;
  const SPEED=85,GRAVITY=400,FLAP=-180,GATE_WIDTH=52,SPACING=220,FIRST_X=370;
  const TICK=1/120;
  const POOLS=['ABCDEFGHJKLMNPQRSTUVWXYZ','abcdefghjkmnpqrstuvwxyz','23456789','!?#@+%'];
  function create(random=Math.random) {
    if(typeof random!=='function')throw new TypeError('Random source must be a function');
    const draw=()=>{const n=random();if(!Number.isFinite(n)||n<0||n>=1)throw new RangeError('Random value must be in [0, 1)');return n;};
    let center=240;
    const gates=[],symbols=[];
    for(let id=0;id<TARGET;id++){
      center=Math.max(195,Math.min(285,center+(draw()-.5)*50));
      gates.push({id,x:FIRST_X+id*SPACING,center,passed:false});
      const pool=POOLS[id%POOLS.length];symbols.push(pool[Math.floor(draw()*pool.length)]);
    }
    return {y:240,vy:0,gates,password:'',status:'ready',bumps:0,flash:0,symbols,remainder:0};
  }
  function resume(s) {
    if(!['ready','paused','bumped'].includes(s.status))return false;
    s.status='running';return true;
  }
  function flap(s) {
    if(s.status!=='running'&&!resume(s))return false;
    s.vy=FLAP;return true;
  }
  function pause(s) {
    if(s.status!=='running')return false;
    s.status='paused';return true;
  }
  function circleHitsRect(y,left,top,width,height) {
    const nearestX=Math.max(left,Math.min(X,left+width));
    const nearestY=Math.max(top,Math.min(y,top+height));
    return (X-nearestX)**2+(y-nearestY)**2<RADIUS**2;
  }
  function collides(s) {
    if(s.y-RADIUS<0||s.y+RADIUS>HEIGHT)return true;
    return s.gates.some(g=>!g.passed&&(
      circleHitsRect(s.y,g.x,0,GATE_WIDTH,g.center-GAP/2)||
      circleHitsRect(s.y,g.x,g.center+GAP/2,GATE_WIDTH,HEIGHT-g.center-GAP/2)
    ));
  }
  function bump(s) {
    s.bumps++;s.flash=.6;s.status='bumped';s.vy=0;s.remainder=0;
    s.gates=s.gates.filter(g=>!g.passed);
    const next=s.gates[0];
    if(next){const shift=FIRST_X-next.x;s.gates.forEach(g=>{g.x+=shift;});s.y=next.center;}
    else s.y=HEIGHT/2;
  }
  function tick(s) {
    s.vy+=GRAVITY*TICK;s.y+=s.vy*TICK;
    s.gates.forEach(g=>{g.x-=SPEED*TICK;});
    s.flash=Math.max(0,s.flash-TICK);
    // Resolve contact before scoring: touching a gate cannot award a symbol.
    if(collides(s)){bump(s);return;}
    for(const g of s.gates){
      if(!g.passed&&g.x+GATE_WIDTH<X-RADIUS){
        g.passed=true;s.password+=s.symbols[g.id];s.flash=.6;
        if(s.password.length===TARGET){s.status='won';s.remainder=0;return;}
      }
    }
  }
  function step(s,seconds) {
    if(s.status!=='running'||!Number.isFinite(seconds)||seconds<=0)return;
    s.remainder+=Math.min(.25,seconds);
    while(s.remainder+1e-12>=TICK&&s.status==='running'){
      s.remainder=Math.max(0,s.remainder-TICK);if(s.remainder<1e-12)s.remainder=0;tick(s);
    }
  }
  return {WIDTH,HEIGHT,TARGET,X,RADIUS,GAP,SPEED,GRAVITY,FLAP,GATE_WIDTH,SPACING,FIRST_X,create,flap,resume,pause,step};
})();

if(typeof module!=='undefined'&&module.exports)module.exports=FlappyEngine;
