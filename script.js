(()=>{"use strict";
const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
const menu=document.getElementById("menu"),settingsPanel=document.getElementById("settingsPanel"),helpPanel=document.getElementById("helpPanel"),gameOver=document.getElementById("gameOver");
const W=360,H=640,TOP=54,BOTTOM=515,GAP=154,PILLAR_W=54,HIT_PAD=16;
let scale=1,ox=0,oy=0,last=0,running=false,score=0,sensitivity=1,dragging=null,pointerId=null;
const balloon={x:82,y:320,r:30,vy:0};
let pillars=[];
function resize(){const s=Math.min(innerWidth/W,innerHeight/H);scale=s;ox=(innerWidth-W*s)/2;oy=(innerHeight-H*s)/2;canvas.width=innerWidth*devicePixelRatio;canvas.height=innerHeight*devicePixelRatio;ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0)}
addEventListener("resize",resize);resize();
function world(e){return{x:(e.clientX-ox)/scale,y:(e.clientY-oy)/scale}}
function makePillar(x,gapY){return{x,gapY,w:PILLAR_W,gapH:GAP,verticalSpeed:72,dir:0,auto:false,passed:false}}
function reset(){pillars=[390,590,790,990].map((x,i)=>makePillar(x,[175,265,355,225][i]));}
function clamp(p){p.gapY=Math.max(TOP,Math.min(BOTTOM-p.gapH,p.gapY))}
function clickPillar(p){p.auto=true;p.dir=-1}
function updatePillar(p,dt){
  const horizontalSpeed=92+Math.min(score*3,90);
  if(p.auto){
    p.gapY+=p.dir*p.verticalSpeed*dt;
    if(p.gapY<=TOP){p.gapY=TOP;p.dir=1}
    if(p.gapY>=BOTTOM-p.gapH){p.gapY=BOTTOM-p.gapH;p.auto=false;p.dir=0}
  }
  p.x-=horizontalSpeed*dt;
  if(p.x+p.w<0){
    const right=Math.max(...pillars.map(q=>q.x+q.w));
    p.x=right+200;
    p.gapY=TOP+Math.random()*(BOTTOM-p.gapH-TOP);
    p.auto=false;p.dir=0;p.passed=false;
  }
}
function pillarAt(x){for(const p of pillars){if(x>=p.x-HIT_PAD&&x<=p.x+p.w+HIT_PAD)return p}return null}
function dragPillar(p,y){p.gapY+=(y-p._lastY)*sensitivity;p._lastY=y;p.auto=false;p.dir=0;clamp(p)}
function start(){
  menu.classList.add("hidden");settingsPanel.classList.add("hidden");helpPanel.classList.add("hidden");gameOver.classList.add("hidden");
  score=0;balloon.y=320;balloon.vy=0;reset();running=true;last=performance.now();requestAnimationFrame(loop)
}
function end(){running=false;document.getElementById("finalScore").textContent="امتیاز: "+score;gameOver.classList.remove("hidden")}
function hit(cx,cy,r,rx,ry,rw,rh){const x=Math.max(rx,Math.min(cx,rx+rw)),y=Math.max(ry,Math.min(cy,ry+rh));return(cx-x)**2+(cy-y)**2<r*r}
function update(dt){
  balloon.vy+=180*dt;balloon.y+=balloon.vy*dt;
  if(balloon.y-balloon.r<0||balloon.y+balloon.r>H)return end();
  for(const p of pillars){
    const oldRight=p.x+p.w;updatePillar(p,dt);
    if(!p.passed&&oldRight<balloon.x){p.passed=true;score++}
    const b=p.gapY+p.gapH;
    if(hit(balloon.x,balloon.y,balloon.r,p.x,0,p.w,p.gapY)||hit(balloon.x,balloon.y,balloon.r,p.x,b,p.w,H-b))return end()
  }
}
function drawBalloon(){
  ctx.save();ctx.translate(balloon.x,balloon.y);
  ctx.fillStyle="#E6D5B8";ctx.strokeStyle="#5D4037";ctx.lineWidth=4;
  ctx.beginPath();ctx.ellipse(0,-7,31,35,0,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.strokeStyle="#2b211c";ctx.lineWidth=3;ctx.beginPath();ctx.arc(8,-8,7,.1,Math.PI-.1);ctx.stroke();
  ctx.fillStyle="#5D4037";ctx.fillRect(-14,24,28,17);ctx.strokeRect(-14,24,28,17);
  ctx.fillStyle="#FF5722";ctx.beginPath();ctx.moveTo(-5,42);ctx.quadraticCurveTo(0,53,5,42);ctx.closePath();ctx.fill();ctx.restore()
}
function drawPillar(p){
  const cap=12;ctx.fillStyle="#5D4037";ctx.strokeStyle="#3b2721";ctx.lineWidth=4;
  ctx.fillRect(p.x,0,p.w,p.gapY);ctx.strokeRect(p.x,0,p.w,p.gapY);
  ctx.fillRect(p.x,p.gapY+p.gapH,p.w,H-p.gapY-p.gapH);ctx.strokeRect(p.x,p.gapY+p.gapH,p.w,H-p.gapY-p.gapH);
  ctx.fillRect(p.x-cap,p.gapY-cap,p.w+cap*2,cap);ctx.strokeRect(p.x-cap,p.gapY-cap,p.w+cap*2,cap);
  ctx.fillRect(p.x-cap,p.gapY+p.gapH,p.w+cap*2,cap);ctx.strokeRect(p.x-cap,p.gapY+p.gapH,p.w+cap*2,cap)
}
function draw(){
  ctx.save();ctx.clearRect(0,0,innerWidth,innerHeight);ctx.translate(ox,oy);ctx.scale(scale,scale);
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,"#4A2C4A");g.addColorStop(.55,"#D84315");g.addColorStop(1,"#FFB45B");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.fillStyle="#FFC107";ctx.beginPath();ctx.arc(180,510,105,0,Math.PI*2);ctx.fill();
  pillars.forEach(drawPillar);drawBalloon();
  ctx.fillStyle="#fff";ctx.font="900 30px Tahoma,Arial";ctx.textAlign="left";ctx.fillText(score,22,45);ctx.restore()
}
function loop(t){if(!running)return;const dt=Math.min(.033,(t-last)/1000);last=t;update(dt);draw();if(running)requestAnimationFrame(loop)}
canvas.addEventListener("pointerdown",e=>{
  if(!running)return;const q=world(e),p=pillarAt(q.x);if(!p)return;
  pointerId=e.pointerId;dragging=p;p._lastY=q.y;clickPillar(p);canvas.setPointerCapture?.(e.pointerId);e.preventDefault()
});
canvas.addEventListener("pointermove",e=>{if(!running||!dragging||e.pointerId!==pointerId)return;dragPillar(dragging,world(e).y);e.preventDefault()});
function endPointer(e){if(e.pointerId!==pointerId)return;dragging=null;pointerId=null}
canvas.addEventListener("pointerup",endPointer);canvas.addEventListener("pointercancel",endPointer);
document.getElementById("play").onclick=start;
document.getElementById("settings").onclick=()=>{menu.classList.add("hidden");settingsPanel.classList.remove("hidden")};
document.getElementById("help").onclick=()=>{menu.classList.add("hidden");helpPanel.classList.remove("hidden")};
document.getElementById("backSettings").onclick=()=>{settingsPanel.classList.add("hidden");menu.classList.remove("hidden")};
document.getElementById("backHelp").onclick=()=>{helpPanel.classList.add("hidden");menu.classList.remove("hidden")};
document.getElementById("restart").onclick=start;
document.getElementById("home").onclick=()=>{gameOver.classList.add("hidden");menu.classList.remove("hidden")};
document.getElementById("sensitivity").oninput=e=>sensitivity=+e.target.value;
draw()
})();