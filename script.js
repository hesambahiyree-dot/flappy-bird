'use strict';

/* =========================
   بالن غروب — Canvas Arcade
   همه‌چیز در همین فایل است.
   برای جایگزینی PNG بالن، تابع drawBalloon()
   را می‌توان با drawImage() عوض کرد.
   ========================= */

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const app = document.getElementById('app');
const balloonSprite = new Image();
balloonSprite.src = 'assets/balloon.svg';

const screens = {
  home: document.getElementById('home'),
  settings: document.getElementById('settings'),
  help: document.getElementById('help'),
  gameUI: document.getElementById('gameUI'),
  gameOver: document.getElementById('gameOver')
};

const state = {
  mode: localStorage.getItem('bg_mode') || 'hybrid',
  sensitivity: Number(localStorage.getItem('bg_sens') || 100) / 100,
  sound: localStorage.getItem('bg_sound') !== 'false',
  score: 0,
  losses: Number(localStorage.getItem('bg_losses') || 0),
  running: false,
  paused: false,
  over: false,
  last: 0,
  elapsed: 0,
  spawnTimer: 0,
  sunset: 0,
  shield: false,
  wind: 0,
  audio: null
};

let W = 360, H = 640, dpr = 1;
let balloon, pillars = [], particles = [], windLines = [];

class Balloon {
  constructor(){
    this.x = W * .25;
    this.y = H * .50;
    this.speed = 0;
    this.w = 48;
    this.h = 62;
    this.vy = 0;
  }
  update(dt){
    this.vy += state.wind * dt;
    this.vy *= Math.pow(.92, dt * 60);
    this.y += this.vy * dt;
    const top = H * .16, bottom = H * .83;
    if(this.y < top){ this.y = top; this.vy = Math.abs(this.vy)*.15; }
    if(this.y > bottom){ this.y = bottom; this.vy = -Math.abs(this.vy)*.15; }
  }
  bounds(){
    return {x:this.x-this.w*.38,y:this.y-this.h*.40,w:this.w*.76,h:this.h*.78};
  }
}

class Pillar {
  constructor(x, gapY, gapHeight, speed){
    this.x = x; this.gapY = gapY; this.gapHeight = gapHeight;
    this.speed = speed; this.targetGapY = gapY; this.passed = false;
    // Tap moves continuously in one direction; direction changes only at an edge.
    this.tapDirection = -1;
    this.selected = false;
  }
  update(dt){
    this.x -= this.speed * dt;
    const diff = this.targetGapY - this.gapY;
    this.gapY += diff * (1 - Math.exp(-12 * dt));
  }
  moveBy(amount){
    const min = H*.08 + this.gapHeight/2;
    const max = H*.92 - this.gapHeight/2;
    const next = this.targetGapY + amount;
    if(next <= min){
      this.targetGapY = min;
      this.tapDirection = 1;
    }else if(next >= max){
      this.targetGapY = max;
      this.tapDirection = -1;
    }else{
      this.targetGapY = next;
    }
  }
  getGap(){
    return {top:this.gapY-this.gapHeight/2,bottom:this.gapY+this.gapHeight/2};
  }
  collides(b){
    const gap = this.getGap();
    const bx=b.x-b.w*.36, br=b.x+b.w*.36;
    if(br < this.x || bx > this.x + this.width()) return false;
    const by=b.y-b.h*.36, bb=b.y+b.h*.36;
    return by < gap.top || bb > gap.bottom;
  }
  width(){ return Math.max(36, W*.105); }
}

function resize(){
  const rect = app.getBoundingClientRect();
  dpr = Math.min(2, window.devicePixelRatio || 1);
  W = rect.width; H = rect.height;
  canvas.width = Math.floor(W*dpr); canvas.height = Math.floor(H*dpr);
  canvas.style.width = W+'px'; canvas.style.height = H+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
  if(balloon){
    balloon.x = W*.25;
    balloon.y = Math.min(H*.82, Math.max(H*.18, balloon.y));
  }
}
window.addEventListener('resize', resize);

function show(name){
  Object.values(screens).forEach(s=>s.classList.add('hidden'));
  if(name === 'game') screens.gameUI.classList.remove('hidden');
  else screens[name].classList.remove('hidden');
}
function hideOverlay(id){ document.getElementById(id).classList.add('hidden'); }
function showOverlay(id){ document.getElementById(id).classList.remove('hidden'); }

function updateSettingsUI(){
  document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active', b.dataset.mode===state.mode));
  document.getElementById('sensitivity').value = Math.round(state.sensitivity*100);
  document.getElementById('sensValue').textContent = Math.round(state.sensitivity*100)+'%';
  document.getElementById('sound').checked = state.sound;
}
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{
  state.mode=b.dataset.mode; localStorage.setItem('bg_mode',state.mode); updateSettingsUI();
}));
document.getElementById('sensitivity').addEventListener('input',e=>{
  state.sensitivity=Number(e.target.value)/100;
  document.getElementById('sensValue').textContent=e.target.value+'%';
  localStorage.setItem('bg_sens',e.target.value);
});
document.getElementById('sound').addEventListener('change',e=>{
  state.sound=e.target.checked; localStorage.setItem('bg_sound',state.sound);
});

document.getElementById('playBtn').onclick=startGame;
document.getElementById('settingsBtn').onclick=()=>{updateSettingsUI();show('settings')};
document.getElementById('helpBtn').onclick=()=>show('help');
document.querySelectorAll('[data-back]').forEach(b=>b.onclick=()=>show('home'));
document.getElementById('pauseBtn').onclick=togglePause;
document.getElementById('resumeBtn').onclick=togglePause;
document.getElementById('quitBtn').onclick=()=>{state.running=false;state.paused=false;hideOverlay('pauseOverlay');show('home')};
document.getElementById('restartBtn').onclick=startGame;
document.getElementById('rewardBtn').onclick=rewardContinue;

function initGame(){
  balloon = new Balloon();
  pillars = [];
  particles = [];
  windLines = [];
  state.score=0; state.elapsed=0; state.spawnTimer=.15; state.sunset=0; state.wind=0;
  state.over=false; state.shield=false;
  document.getElementById('score').textContent='0';
  addPillar(W+80);
  addPillar(W+80 + W*.82);
}

function difficulty(){
  return Math.min(1, state.score/35);
}
function addPillar(x){
  const d=difficulty();
  const gapH=H*(.255 - .075*d);
  const min=H*.08+gapH/2, max=H*.92-gapH/2;
  const gapY=min+Math.random()*(max-min);
  const speedSteps = Math.floor(state.score / 5);
  const speedMultiplier = 1 + speedSteps * 0.10;
  const speed=Math.min(430, W*(.44 + .18*d) * speedMultiplier);
  pillars.push(new Pillar(x,gapY,gapH,speed));
}

function getTargetPillar(){
  let target=null, best=Infinity;
  for(const p of pillars){
    const dist=p.x - balloon.x;
    if(dist>=-p.width() && dist<best){best=dist;target=p}
  }
  return target || pillars[0];
}

function tapControl(){
  if(!state.running || state.paused || state.over) return;
  const p=getTargetPillar();
  if(!p) return;
  // Each tap advances 20px in the current direction. Only reaching
  // the top/bottom edge reverses the direction.
  p.moveBy(20*p.tapDirection);
  beep(330,.045);
}
let touchY=0, touchMoved=false;
canvas.addEventListener('pointerdown',e=>{
  touchY=e.clientY; touchMoved=false;
  if(!state.running){ startGame(); return; }
  if(state.paused || state.over) return;
  if(state.mode==='tap' || state.mode==='hybrid') {
    // کمی صبر می‌کنیم تا اگر حرکت بود، به عنوان swipe ثبت شود.
  }
  canvas.setPointerCapture?.(e.pointerId);
});
canvas.addEventListener('pointermove',e=>{
  if(!state.running || state.paused || state.over) return;
  const dy=e.clientY-touchY;
  if(Math.abs(dy)>1){
    touchMoved=true;
    if(state.mode==='swipe' || state.mode==='hybrid'){
      const p=getTargetPillar();
      if(p) p.moveBy(dy*state.sensitivity);
      touchY=e.clientY;
    }
  }
});
canvas.addEventListener('pointerup',()=>{
  if(!state.running || state.paused || state.over) return;
  if(!touchMoved && (state.mode==='tap' || state.mode==='hybrid')) tapControl();
});

function togglePause(){
  if(!state.running || state.over) return;
  state.paused=!state.paused;
  document.getElementById('pauseOverlay').classList.toggle('hidden',!state.paused);
  if(state.paused) stopAudio();
  else startAudio();
}

function startGame(){
  hideOverlay('pauseOverlay');
  show('game');
  initGame();
  state.running=true; state.paused=false; state.last=performance.now();
  startAudio();
  requestAnimationFrame(loop);
}

function endGame(){
  if(state.over) return;
  state.over=true; state.running=false;
  stopAudio();
  state.losses++; localStorage.setItem('bg_losses',state.losses);
  document.getElementById('finalScore').textContent=state.score;
  show('gameOver');
  // جایگاه interstitial هر ۵ باخت:
  if(state.losses % 5 === 0){
    setTimeout(()=>alert('جایگاه تبلیغ میان‌برنامه‌ای — در نسخه انتشار به شبکه تبلیغاتی متصل می‌شود.'),120);
  }
}

function rewardContinue(){
  if(!state.over) return;
  // Placeholder شبیه رفتار Rewarded Ad:
  state.over=false; state.running=true; state.shield=true;
  balloon.y=H*.5; balloon.vy=0;
  show('game');
  state.last=performance.now();
  startAudio();
  // پاداش ادامه: یک سپر.
  requestAnimationFrame(loop);
}

function loop(now){
  if(!state.running) return;
  if(state.paused){state.last=now;requestAnimationFrame(loop);return;}
  let dt=(now-state.last)/1000;
  state.last=now; dt=Math.min(.033,Math.max(.001,dt));
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function update(dt){
  state.elapsed += dt;
  state.sunset = Math.min(1,state.elapsed/150);
  const d=difficulty();
  const speedBonus=1+d*.22;

  // بدون پنکه؛ بالن در محور عمودی ثابت می‌ماند.
  state.wind = 0;

  balloon.update(dt);

  state.spawnTimer-=dt;
  if(state.spawnTimer<=0){
    const last=pillars[pillars.length-1];
    if(!last || last.x < W*.72){
      addPillar(W+50);
      state.spawnTimer=1.75-Math.min(.35,d*.35);
    }else state.spawnTimer=.12;
  }

  for(const p of pillars) p.update(dt);
  for(let i=pillars.length-1;i>=0;i--){
    const p=pillars[i];
    if(!p.passed && p.x+p.width()<balloon.x){
      p.passed=true;
      state.score++;
      document.getElementById('score').textContent=state.score;
      beep(650,.06);
      burst(balloon.x,balloon.y);
    }
    if(p.x+p.width() < -30) pillars.splice(i,1);
  }

  if(!state.shield){
    for(const p of pillars){
      if(p.collides(balloon)){ endGame(); return; }
    }
  }else{
    // یک برخورد را نادیده بگیر و سپر را مصرف کن.
    for(const p of pillars){
      if(p.collides(balloon)){state.shield=false;break;}
    }
  }

  if(state.sunset>=1){
    endGame(); return;
  }

  for(const q of particles){
    q.x+=q.vx*dt;q.y+=q.vy*dt;q.life-=dt;
  }
  particles=particles.filter(q=>q.life>0);

  windLines=[];
  if(Math.abs(state.wind)>.08){
    for(let i=0;i<8;i++){
      windLines.push({x:W*(.46+Math.random()*.5),y:H*(.18+Math.random()*.6),phase:Math.random()*6.28});
    }
  }
}

function draw(){
  drawBackground();
  drawSun();
  drawPillars();
  drawParticles();
  drawBalloon();
}

function drawBackground(){
  const g=ctx.createLinearGradient(0,0,0,H);
  const night=state.sunset;
  g.addColorStop(0, mix('#4A2C4A','#17152f',night*.55));
  g.addColorStop(.55,mix('#7d3f5c','#2b2740',night*.55));
  g.addColorStop(1,mix('#D84315','#101a2a',night*.75));
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  // درخشش افق
  const glow=ctx.createRadialGradient(W*.48,H*.84,5,W*.48,H*.84,W*.72);
  glow.addColorStop(0,'rgba(255,145,0,.20)');
  glow.addColorStop(1,'rgba(255,145,0,0)');
  ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
}

function drawSun(){
  const y=H*(.80 + state.sunset*.17);
  const r=Math.min(W*.34,H*.20);
  const grad=ctx.createRadialGradient(W*.5,y-r*.2,2,W*.5,y,r);
  grad.addColorStop(0,'#FFE082');grad.addColorStop(.55,'#FFC107');grad.addColorStop(1,'rgba(255,193,7,0)');
  ctx.fillStyle=grad;ctx.beginPath();ctx.arc(W*.5,y,r,0,Math.PI*2);ctx.fill();
}

function drawPillars(){
  for(const p of pillars){
    const gap=p.getGap(), w=p.width();
    drawPillarRect(p.x,0,w,gap.top,true);
    drawPillarRect(p.x,gap.bottom,w,H-gap.bottom,false);
    // خط روشن کنار ستون برای ظاهر کارتونی
    if(p===getTargetPillar()){
      ctx.strokeStyle='rgba(255,210,140,.35)';ctx.lineWidth=2;
      ctx.strokeRect(p.x-2,gap.top-2,w+4,gap.bottom-gap.top+4);
    }
  }
}
function drawPillarRect(x,y,w,h,capAtBottom){
  if(h<=0)return;
  ctx.fillStyle='#5D4037';ctx.strokeStyle='#171313';ctx.lineWidth=5;
  ctx.fillRect(x,y,w,h);ctx.strokeRect(x,y,w,h);
  const capH=Math.min(18,h*.08), capW=w+10;
  const cx=x-5;
  const cy=capAtBottom ? Math.max(0,h-capH) : y;
  ctx.fillStyle='#70483a';ctx.fillRect(cx,cy,capW,capH);ctx.strokeRect(cx,cy,capW,capH);
  ctx.fillStyle='rgba(255,255,255,.07)';ctx.fillRect(x+5,y,Math.max(3,w*.09),h);
}

function drawBalloon(){
  const x=balloon.x,y=balloon.y;
  const spriteW=Math.min(88,W*.245);
  const naturalRatio = (balloonSprite.naturalHeight || 290) / (balloonSprite.naturalWidth || 180);
  const spriteH = spriteW * naturalRatio;
  ctx.save();
  if(balloonSprite.complete && balloonSprite.naturalWidth){
    ctx.drawImage(balloonSprite,x-spriteW/2,y-spriteH*.43,spriteW,spriteH);
  }else{
    ctx.fillStyle='#E6D5B8';ctx.strokeStyle='#171313';ctx.lineWidth=4;
    ctx.beginPath();ctx.ellipse(x,y-14,30,39,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle='#5D4037';ctx.fillRect(x-28,y+18,56,28);ctx.strokeRect(x-28,y+18,56,28);
  }
  ctx.restore();
}
function drawParticles(){
  for(const q of particles){
    ctx.globalAlpha=Math.max(0,q.life);
    ctx.fillStyle='#ffd39b';ctx.beginPath();ctx.arc(q.x,q.y,q.size,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;
}

function burst(x,y){
  for(let i=0;i<14;i++){
    const a=Math.random()*Math.PI*2, s=30+Math.random()*80;
    particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.5+Math.random()*.5,size:1+Math.random()*3});
  }
}

function roundRect(x,y,w,h,r,fill,stroke,lw){
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
  ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke();
}
function mix(a,b,t){
  const pa=parseInt(a.slice(1),16),pb=parseInt(b.slice(1),16);
  const ar=pa>>16,ag=(pa>>8)&255,ab=pa&255,br=pb>>16,bg=(pb>>8)&255,bb=pb&255;
  return '#'+[ar+(br-ar)*t,ag+(bg-ag)*t,ab+(bb-ab)*t].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
}

/* صدای ساده WebAudio؛ بدون فایل خارجی */
function startAudio(){
  if(!state.sound)return;
  try{
    if(!state.audio) state.audio=new (window.AudioContext||window.webkitAudioContext)();
    state.audio.resume();
  }catch(e){}
}
function stopAudio(){}
function beep(freq,dur){
  if(!state.sound || !state.audio)return;
  try{
    const o=state.audio.createOscillator(), g=state.audio.createGain();
    o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(.0001,state.audio.currentTime);
    g.gain.exponentialRampToValueAtTime(.035,state.audio.currentTime+.008);
    g.gain.exponentialRampToValueAtTime(.0001,state.audio.currentTime+dur);
    o.connect(g).connect(state.audio.destination);o.start();o.stop(state.audio.currentTime+dur+.01);
  }catch(e){}
}

resize();
updateSettingsUI();
show('home');
drawBackground();drawSun();
