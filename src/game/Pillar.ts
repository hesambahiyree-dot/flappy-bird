import type { Rect } from "./types";
const PILLAR_FILL = "#3a2418"; const PILLAR_INNER = "#4a3022"; const PILLAR_EDGE = "#24150e"; const MIN_CAP = 10;
export class Pillar {
  x: number; gapY: number; targetGapY: number; gapHeight: number; speed: number; width: number; canvasH: number; scored = false; passed = false; readonly id: number;
  constructor(x: number, gapY: number, gapHeight: number, speed: number, width: number, canvasH: number, id: number) { this.x=x; this.gapY=gapY; this.targetGapY=gapY; this.gapHeight=gapHeight; this.speed=speed; this.width=width; this.canvasH=canvasH; this.id=id; this.clampGap(); this.gapY=this.targetGapY; }
  private gapLimits(): { min:number; max:number } { const half=this.gapHeight/2; return { min:MIN_CAP+half, max:this.canvasH-MIN_CAP-half }; }
  private clampGap(): void { const {min,max}=this.gapLimits(); this.targetGapY=Math.max(min,Math.min(max,this.targetGapY)); this.gapY=Math.max(min,Math.min(max,this.gapY)); }
  moveGap(deltaY:number, immediate=false):void { this.targetGapY+=deltaY; this.clampGap(); if(immediate)this.gapY=this.targetGapY; }
  containsTouch(px:number, py:number, slop:number):boolean { void py; return px>=this.x-slop && px<=this.x+this.width+slop; }
  getTopRect():Rect { const h=Math.max(MIN_CAP,this.gapY-this.gapHeight/2); return {x:this.x,y:0,w:this.width,h}; }
  getBottomRect():Rect { const top=this.gapY+this.gapHeight/2; return {x:this.x,y:top,w:this.width,h:Math.max(MIN_CAP,this.canvasH-top)}; }
  update(dt:number,moving:boolean):void { if(moving)this.x-=this.speed*dt; const k=18; this.gapY+=(this.targetGapY-this.gapY)*(1-Math.exp(-k*dt)); this.clampGap(); }
  draw(ctx:CanvasRenderingContext2D,active:boolean):void { this.drawSegment(ctx,this.getTopRect(),active); this.drawSegment(ctx,this.getBottomRect(),active); }
  private drawSegment(ctx:CanvasRenderingContext2D,r:Rect,active:boolean):void { if(r.h<=1)return; const rad=Math.min(10,r.w*0.22); ctx.save(); if(active){ctx.shadowColor="rgba(244,230,200,0.35)";ctx.shadowBlur=14;} roundRect(ctx,r.x,r.y,r.w,r.h,rad); ctx.fillStyle=PILLAR_FILL;ctx.fill();ctx.shadowBlur=0;ctx.lineWidth=2;ctx.strokeStyle=PILLAR_EDGE;ctx.stroke();ctx.fillStyle=PILLAR_INNER;const inset=Math.max(3,r.w*0.18);if(r.h>inset*3){roundRect(ctx,r.x+inset,r.y+4,r.w*0.22,r.h-8,3);ctx.fill();}ctx.restore(); }
}
function roundRect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number):void { const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath(); }
