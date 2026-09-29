const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
const menu=document.getElementById("menu"),hud=document.getElementById("hud"),over=document.getElementById("gameover"),settingsScreen=document.getElementById("settingsScreen"),helpScreen=document.getElementById("helpScreen"),pauseScreen=document.getElementById("pauseScreen");
const scoreEl=document.getElementById("score"),finalEl=document.getElementById("finalScore"),sensitivityEl=document.getElementById("sensitivity"),soundToggle=document.getElementById("soundToggle");

const balloonImg=new Image();
balloonImg.src="design/game-assets/balloon.svg";
let hasBalloon=false;
balloonImg.onload=()=>hasBalloon=true;

let W=0,H=0,dpr=1,state="menu",last=0,score=0,paused=false,spawnTimer=0,difficulty=0,sensitivity=3,sound=true;
let dragStartY=null,dragMoved=false;
const balloon={x:.27,y:.50,r:34};
let pillars=[];

function resize(){
  dpr=Math.min(devicePixelRatio||1,2);
  W=innerWidth; H=innerHeight;
  canvas.width=W*dpr; canvas.height=H*dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  balloon.r=Math.max(25,Math.min(39,W*.075));
}
addEventListener("resize",resize); resize();

function hideScreens(){[menu,settingsScreen,helpScreen,over,pauseScreen].forEach(x=>x.classList.add("hidden"))}

function reset(){
  score=0; difficulty=0; spawnTimer=.15; pillars=[];
  state="playing"; paused=false; dragStartY=null; dragMoved=false;
  hideScreens(); hud.classList.remove("hidden"); scoreEl.textContent="0";
}

function goMenu(){
  state="menu"; paused=false; hideScreens();
  hud.classList.add("hidden"); menu.classList.remove("hidden");
}

function addPillar(){
  // Difficulty increases only through the scrolling speed and smaller gaps.
  const gapH=Math.max(H*.235,H*(.355-difficulty*.045));
  const margin=H*.075;
  const maxY=H-gapH-margin;
  const gapY=margin+Math.random()*Math.max(1,maxY-margin);
  pillars.push({
    x:W+72,
    w:Math.max(58,W*.155),
    gapY,gapH,
    scored:false,
    active:false,
    speed:Math.max(170,W*.41)*(1+difficulty*.55)
  });
}

function clampGap(p){
  const margin=H*.055;
  p.gapY=Math.max(margin,Math.min(H-p.gapH-margin,p.gapY));
}

function getActivePillar(){
  // Only the first pillar that the balloon still has to pass can be controlled.
  return pillars.find(p=>!p.scored && p.x+p.w>balloon.x*W-balloon.r) || null;
}

function moveActiveGap(delta){
  const p=getActivePillar();
  if(!p)return;
  p.gapY+=delta;
  clampGap(p);
}

function update(dt){
  if(state!=="playing"||paused)return;

  difficulty=Math.min(1.6,score/30);
  spawnTimer-=dt;
  if(spawnTimer<=0){
    addPillar();
    spawnTimer=Math.max(.78,1.32-difficulty*.24);
  }

  // The pillars get faster as the score rises.
  const speedFactor=.94+sensitivity*.055;
  for(const p of pillars)p.x-=p.speed*speedFactor*dt;
  pillars=pillars.filter(p=>p.x+p.w>-30);

  for(const p of pillars){
    if(!p.scored && p.x+p.w<balloon.x*W-balloon.r){
      p.scored=true;
      score++;
      scoreEl.textContent=score;
    }
  }

  const bx=balloon.x*W,by=balloon.y*H;
  for(const p of pillars){
    const hitX=bx+balloon.r>p.x&&bx-balloon.r<p.x+p.w;
    const hitY=by-balloon.r<p.gapY||by+balloon.r>p.gapY+p.gapH;
    if(hitX&&hitY){gameOver();return}
  }
}

function gameOver(){
  state="over"; hud.classList.add("hidden");
  finalEl.textContent=score; over.classList.remove("hidden");
}

function drawBackground(){
  // Match the supplied game UI: purple -> red-orange sunset, no extra foreground.
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,"#43205A");
  g.addColorStop(.30,"#673052");
  g.addColorStop(.63,"#A44C42");
  g.addColorStop(1,"#E55B20");
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);

  const sx=W*.50,sy=H*.985,sr=Math.max(W*.40,H*.18);
  ctx.fillStyle="#FF9D00";
  ctx.beginPath(); ctx.arc(sx,sy,sr,Math.PI,Math.PI*2); ctx.fill();
}

function drawPillar(p){
  ctx.fillStyle="#59351F";
  ctx.strokeStyle="#20140F";
  ctx.lineWidth=5;

  ctx.fillRect(p.x,0,p.w,p.gapY);
  ctx.strokeRect(p.x,0,p.w,p.gapY);

  ctx.fillRect(p.x,p.gapY+p.gapH,p.w,H-p.gapY-p.gapH);
  ctx.strokeRect(p.x,p.gapY+p.gapH,p.w,H-p.gapY-p.gapH);

  // Wide dark caps, matching the reference UI.
  ctx.fillStyle="#6D432B";
  ctx.fillRect(p.x-8,p.gapY-15,p.w+16,15);
  ctx.strokeRect(p.x-8,p.gapY-15,p.w+16,15);
  ctx.fillRect(p.x-8,p.gapY+p.gapH,p.w+16,15);
  ctx.strokeRect(p.x-8,p.gapY+p.gapH,p.w+16,15);
}

function drawBalloon(){
  const x=balloon.x*W,y=balloon.y*H;
  if(hasBalloon){
    const h=Math.min(H*.29,Math.max(150,W*.47));
    const w=h*.55;
    ctx.drawImage(balloonImg,x-w*.5,y-h*.42,w,h);
    return;
  }
}

function render(){
  drawBackground();
  for(const p of pillars)drawPillar(p);
  drawBalloon();
}

function loop(t){
  const dt=Math.min(.033,(t-last)/1000||0);
  last=t; update(dt); render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Tap: move ONLY the currently active pillar's gap.
// Each tap alternates direction so the player can steer it upward/downward.
function tap(){
  if(state==="menu")return reset();
  if(state==="over")return reset();
  if(state==="playing"&&!paused){
    const p=getActivePillar();
    if(!p)return;
    const targetY=p.gapY + (p._tapDirection==="up" ? H*.10 : -H*.10);
    p._tapDirection=targetY>p.gapY ? "down" : "up";
    p.gapY=targetY;
    clampGap(p);
  }
}

function pointerDown(e){
  if(state!=="playing"||paused)return;
  dragStartY=e.clientY; dragMoved=false;
}
function pointerMove(e){
  if(dragStartY===null||state!=="playing"||paused)return;
  const dy=e.clientY-dragStartY;
  if(Math.abs(dy)>=2){
    dragMoved=true;
    // Drag/scroll affects ONLY the active pillar.
    moveActiveGap(dy*.95);
    dragStartY=e.clientY;
  }
}
function pointerUp(e){
  if(dragStartY===null)return;
  const wasDrag=dragMoved;
  dragStartY=null; dragMoved=false;
  if(!wasDrag)tap();
}

canvas.addEventListener("pointerdown",e=>{e.preventDefault();canvas.setPointerCapture?.(e.pointerId);pointerDown(e)});
canvas.addEventListener("pointermove",e=>{e.preventDefault();pointerMove(e)});
canvas.addEventListener("pointerup",e=>{e.preventDefault();pointerUp(e)});
canvas.addEventListener("pointercancel",()=>{dragStartY=null;dragMoved=false});
canvas.addEventListener("wheel",e=>{
  if(state!=="playing"||paused)return;
  e.preventDefault();
  moveActiveGap(e.deltaY*.55);
},{passive:false});

document.getElementById("play").onclick=reset;
document.getElementById("restart").onclick=reset;
document.getElementById("home").onclick=goMenu;
document.getElementById("pauseHome").onclick=goMenu;
document.getElementById("settings").onclick=()=>{hideScreens();settingsScreen.classList.remove("hidden")};
document.getElementById("help").onclick=()=>{hideScreens();helpScreen.classList.remove("hidden")};
document.getElementById("settingsBack").onclick=goMenu;
document.getElementById("helpBack").onclick=goMenu;
if(document.getElementById("pause")){
  document.getElementById("pause").onclick=()=>{if(state==="playing"){paused=true;pauseScreen.classList.remove("hidden")}};
}
document.getElementById("resume").onclick=()=>{paused=false;pauseScreen.classList.add("hidden")};
sensitivityEl.oninput=()=>sensitivity=Number(sensitivityEl.value);
soundToggle.onclick=()=>{sound=!sound;soundToggle.textContent=sound?"روشن":"خاموش";soundToggle.classList.toggle("on",sound)};
