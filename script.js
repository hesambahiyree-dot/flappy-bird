const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
const menu=document.getElementById("menu"),hud=document.getElementById("hud"),over=document.getElementById("gameover"),settingsScreen=document.getElementById("settingsScreen"),helpScreen=document.getElementById("helpScreen"),pauseScreen=document.getElementById("pauseScreen");
const scoreEl=document.getElementById("score"),finalEl=document.getElementById("finalScore"),sensitivityEl=document.getElementById("sensitivity"),soundToggle=document.getElementById("soundToggle");
const balloonImg=new Image(); balloonImg.src="design/game-assets/balloon.svg"; let hasBalloon=false; balloonImg.onload=()=>hasBalloon=true;
let W=0,H=0,dpr=1,state="menu",last=0,score=0,paused=false,spawnTimer=0,difficulty=0,sensitivity=3,sound=true;
let dragStartY=null,dragMoved=false;
const balloon={x:.27,y:.5,r:34}; let pillars=[];
function resize(){dpr=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);balloon.r=Math.max(24,Math.min(40,W*.075))}
addEventListener("resize",resize);resize();
function hideScreens(){[menu,settingsScreen,helpScreen,over,pauseScreen].forEach(x=>x.classList.add("hidden"))}
function reset(){score=0;difficulty=0;spawnTimer=.2;pillars=[];state="playing";paused=false;dragStartY=null;dragMoved=false;hideScreens();hud.classList.remove("hidden");scoreEl.textContent="0"}
function goMenu(){state="menu";paused=false;hideScreens();hud.classList.add("hidden");menu.classList.remove("hidden")}
function addPillar(){
  const gapH=Math.max(H*.23,H*(.35-difficulty*.04)),margin=H*.08,maxY=H-gapH-margin;
  const gapY=margin+Math.random()*Math.max(1,maxY-margin);
  pillars.push({x:W+70,w:Math.max(58,W*.155),baseGapY:gapY,gapY:gapY,gapH,scored:false,speed:Math.max(165,W*.40)+difficulty*24});
}
function clampGap(p){const margin=H*.06;p.gapY=Math.max(margin,Math.min(H-p.gapH-margin,p.gapY))}
function moveGaps(delta){
  for(const p of pillars){p.gapY+=delta;clampGap(p)}
}
function update(dt){
  if(state!=="playing"||paused)return;
  difficulty=Math.min(2,score/35);
  spawnTimer-=dt;
  if(spawnTimer<=0){addPillar();spawnTimer=Math.max(.92,1.42-difficulty*.22)}
  const speedFactor=.8+sensitivity*.14;
  for(const p of pillars)p.x-=p.speed*speedFactor*dt;
  pillars=pillars.filter(p=>p.x+p.w>-25);
  for(const p of pillars)if(!p.scored&&p.x+p.w<balloon.x*W-balloon.r){p.scored=true;score++;scoreEl.textContent=score}
  for(const p of pillars){
    const bx=balloon.x*W,by=balloon.y*H;
    const hitX=bx+balloon.r>p.x&&bx-balloon.r<p.x+p.w;
    const hitY=by-balloon.r<p.gapY||by+balloon.r>p.gapY+p.gapH;
    if(hitX&&hitY){gameOver();return}
  }
}
function gameOver(){state="over";hud.classList.add("hidden");finalEl.textContent=score;over.classList.remove("hidden")}
function drawBackground(){
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,"#4A2C4A");g.addColorStop(.5,"#A53E2B");g.addColorStop(1,"#D84315");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  const sx=W*.76,sy=H*.79,sr=Math.min(W,H)*.19,sg=ctx.createRadialGradient(sx,sy,0,sx,sy,sr);sg.addColorStop(0,"#FFD36A");sg.addColorStop(.72,"#FFC107");sg.addColorStop(1,"#FF8A1F00");ctx.fillStyle=sg;ctx.beginPath();ctx.arc(sx,sy,sr,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#2b172633";ctx.beginPath();ctx.moveTo(0,H*.83);ctx.quadraticCurveTo(W*.18,H*.76,W*.36,H*.84);ctx.quadraticCurveTo(W*.58,H*.74,W*.78,H*.84);ctx.quadraticCurveTo(W*.9,H*.78,W,H*.84);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();
}
function drawPillar(p){
  ctx.fillStyle="#5D4037";ctx.strokeStyle="#2A1B18";ctx.lineWidth=5;
  ctx.fillRect(p.x,0,p.w,p.gapY);ctx.strokeRect(p.x,0,p.w,p.gapY);
  ctx.fillRect(p.x,p.gapY+p.gapH,p.w,H-p.gapY-p.gapH);ctx.strokeRect(p.x,p.gapY+p.gapH,p.w,H-p.gapY-p.gapH);
  ctx.fillStyle="#765044";ctx.fillRect(p.x-9,p.gapY-18,p.w+18,18);ctx.strokeRect(p.x-9,p.gapY-18,p.w+18,18);
  ctx.fillRect(p.x-9,p.gapY+p.gapH,p.w+18,18);ctx.strokeRect(p.x-9,p.gapY+p.gapH,p.w+18,18);
}
function drawBalloon(){
  const x=balloon.x*W,y=balloon.y*H,r=balloon.r;
  if(hasBalloon){const h=Math.min(H*.27, r*3.2),w=h*.60;ctx.drawImage(balloonImg,x-w*.5,y-h*.43,w,h);return}
  ctx.save();ctx.translate(x,y);ctx.fillStyle="#E6D5B8";ctx.strokeStyle="#18120F";ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(0,-r*.35,r*.92,r*1.18,-.08,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.fillStyle="#5D4037";ctx.beginPath();ctx.moveTo(-r*.36,r*.73);ctx.lineTo(r*.36,r*.73);ctx.lineTo(r*.27,r*1.08);ctx.lineTo(-r*.27,r*1.08);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle="#FF5722";ctx.beginPath();ctx.moveTo(-5,r*.76);ctx.quadraticCurveTo(0,r*1.34,5,r*.76);ctx.fill();ctx.fillStyle="#111";ctx.beginPath();ctx.ellipse(r*.32,-r*.36,r*.12,r*.17,-.3,0,Math.PI*2);ctx.fill();ctx.restore();
}
function render(){drawBackground();for(const p of pillars)drawPillar(p);drawBalloon()}
function loop(t){const dt=Math.min(.033,(t-last)/1000||0);last=t;update(dt);render();requestAnimationFrame(loop)}requestAnimationFrame(loop);

function tap(){if(state==="menu")return reset();if(state==="over")return reset();if(state==="playing"&&!paused)moveGaps((Math.random()<.5?-1:1)*H*.085)}
function pointerDown(e){if(state!=="playing"||paused)return;dragStartY=e.clientY;dragMoved=false}
function pointerMove(e){if(dragStartY===null||state!=="playing"||paused)return;const dy=e.clientY-dragStartY;if(Math.abs(dy)>=2){dragMoved=true;moveGaps(dy*.95);dragStartY=e.clientY}}
function pointerUp(e){if(dragStartY===null)return;const wasDrag=dragMoved;dragStartY=null;dragMoved=false;if(!wasDrag)tap()}
canvas.addEventListener("pointerdown",e=>{e.preventDefault();canvas.setPointerCapture?.(e.pointerId);pointerDown(e)});
canvas.addEventListener("pointermove",e=>{e.preventDefault();pointerMove(e)});
canvas.addEventListener("pointerup",e=>{e.preventDefault();pointerUp(e)});
canvas.addEventListener("pointercancel",e=>{dragStartY=null;dragMoved=false});

document.getElementById("play").onclick=reset;document.getElementById("restart").onclick=reset;document.getElementById("home").onclick=goMenu;document.getElementById("pauseHome").onclick=goMenu;
document.getElementById("settings").onclick=()=>{hideScreens();settingsScreen.classList.remove("hidden")};
document.getElementById("help").onclick=()=>{hideScreens();helpScreen.classList.remove("hidden")};
document.getElementById("settingsBack").onclick=goMenu;document.getElementById("helpBack").onclick=goMenu;
document.getElementById("pause").onclick=()=>{if(state==="playing"){paused=true;pauseScreen.classList.remove("hidden")}};
document.getElementById("resume").onclick=()=>{paused=false;pauseScreen.classList.add("hidden")};
sensitivityEl.oninput=()=>sensitivity=Number(sensitivityEl.value);
soundToggle.onclick=()=>{sound=!sound;soundToggle.textContent=sound?"روشن":"خاموش";soundToggle.classList.toggle("on",sound)};
