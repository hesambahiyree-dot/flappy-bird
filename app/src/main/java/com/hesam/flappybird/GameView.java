package com.hesam.flappybird;

import android.content.Context;
import android.graphics.*;
import android.graphics.drawable.ColorDrawable;
import android.view.MotionEvent;
import android.view.View;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.Random;

public class GameView extends View {
    private final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Random random = new Random();
    private final ArrayList<Pipe> pipes = new ArrayList<>();
    private float birdY, birdV, groundX, cloudX;
    private long lastFrame, lastPipe;
    private int score, best;
    private boolean started, gameOver;
    private final float gravity = 0.00165f, flap = -0.48f, pipeSpeed = 0.32f;
    private final RectF bird = new RectF();

    static class Pipe { float x, gapY; boolean scored; Pipe(float x, float gapY){this.x=x;this.gapY=gapY;} }

    public GameView(Context c) { super(c); setBackground(new ColorDrawable(Color.rgb(145, 220, 245))); best = c.getSharedPreferences("game",0).getInt("best",0); setFocusable(true); }

    private void reset() { pipes.clear(); score=0; started=false; gameOver=false; birdY=getHeight()*0.45f; birdV=0; lastFrame=System.nanoTime(); lastPipe=0; invalidate(); }

    private void start() { if (gameOver) { reset(); return; } started=true; birdV=flap; if (pipes.isEmpty()) addPipe(getWidth()*0.95f); }

    private void addPipe(float x) { float min=getHeight()*0.25f, max=getHeight()*0.68f; float gapY=min + random.nextFloat()*(max-min); pipes.add(new Pipe(x,gapY)); }

    @Override protected void onSizeChanged(int w,int h,int ow,int oh){ birdY=h*0.45f; groundX=0; cloudX=w*0.7f; }

    @Override protected void onDraw(Canvas c) {
        super.onDraw(c); long now=System.nanoTime(); float dt=Math.min(32f,(now-lastFrame)/1_000_000f); lastFrame=now;
        drawSky(c); if(started && !gameOver) update(dt); drawPipes(c); drawBird(c); drawGround(c); drawHud(c);
        if(started && !gameOver) postInvalidateDelayed(8); else if(!started || gameOver) invalidate();
    }

    private void update(float dt) {
        birdV += gravity*dt; birdY += birdV*dt;
        float scale=getWidth()/360f; float speed=pipeSpeed*dt*scale;
        if(lastPipe==0 || System.currentTimeMillis()-lastPipe>1500){ addPipe(getWidth()+40); lastPipe=System.currentTimeMillis(); }
        for(Pipe q:pipes) q.x-=speed;
        Iterator<Pipe> it=pipes.iterator(); while(it.hasNext()){ Pipe q=it.next(); if(q.x < -70) it.remove(); if(!q.scored && q.x+50 < getWidth()*0.24f){q.scored=true;score++; if(score>best){best=score;getContext().getSharedPreferences("game",0).edit().putInt("best",best).apply();}} }
        float bw=getWidth()*0.11f, bh=bw*0.78f, bx=getWidth()*0.22f; bird.set(bx,birdY-bh/2,bx+bw,birdY+bh/2);
        if(bird.top<0 || bird.bottom>getHeight()-getHeight()*0.12f) endGame();
        for(Pipe q:pipes){ float pw=getWidth()*0.16f, gap=getHeight()*0.27f, top=q.gapY-gap/2, bottom=q.gapY+gap/2; RectF a=new RectF(q.x,0,q.x+pw,top), b=new RectF(q.x,bottom,q.x+pw,getHeight()); if(RectF.intersects(bird,a)||RectF.intersects(bird,b)) { endGame(); break; } }
    }

    private void endGame(){ if(!gameOver){gameOver=true;started=false;} }

    private void drawSky(Canvas c){ p.setStyle(Paint.Style.FILL); p.setColor(Color.rgb(145,220,245)); c.drawRect(0,0,getWidth(),getHeight(),p); p.setColor(0x55FFFFFF); c.drawCircle(cloudX,getHeight()*0.18f,28,p); c.drawCircle(cloudX+28,getHeight()*0.18f,20,p); c.drawCircle(cloudX-25,getHeight()*0.2f,18,p); cloudX-=0.05f; if(cloudX<-70)cloudX=getWidth()+70; }

    private void drawPipes(Canvas c){ float pw=getWidth()*0.16f, gap=getHeight()*0.27f; for(Pipe q:pipes){float top=q.gapY-gap/2,bottom=q.gapY+gap/2; p.setColor(Color.rgb(57,178,79)); c.drawRect(q.x,0,q.x+pw,top,p); c.drawRect(q.x-5,top-18,q.x+pw+5,top,p); c.drawRect(q.x,bottom,q.x+pw,getHeight(),p); c.drawRect(q.x-5,bottom,q.x+pw+5,bottom+18,p); p.setColor(0x33102020); c.drawRect(q.x+pw*0.72f,0,q.x+pw,top,p); c.drawRect(q.x+pw*0.72f,bottom,q.x+pw,getHeight(),p); } }

    private void drawBird(Canvas c){ float bw=getWidth()*0.11f, bh=bw*0.78f, bx=getWidth()*0.22f; bird.set(bx,birdY-bh/2,bx+bw,birdY+bh/2); p.setColor(Color.rgb(255,220,55)); c.drawOval(bird,p); p.setColor(Color.rgb(255,178,25)); Path wing=new Path(); wing.moveTo(bx+bw*.42f,birdY); wing.quadTo(bx+bw*.05f,birdY+bh*.15f,bx+bw*.35f,birdY+bh*.42f); wing.quadTo(bx+bw*.62f,birdY+bh*.22f,bx+bw*.62f,birdY); c.drawPath(wing,p); p.setColor(Color.WHITE); c.drawCircle(bx+bw*.73f,birdY-bh*.2f,bw*.13f,p); p.setColor(Color.rgb(25,32,36)); c.drawCircle(bx+bw*.77f,birdY-bh*.2f,bw*.06f,p); p.setColor(Color.rgb(240,120,30)); Path beak=new Path(); beak.moveTo(bx+bw*.94f,birdY-bh*.04f); beak.lineTo(bx+bw*1.25f,birdY+bh*.06f); beak.lineTo(bx+bw*.94f,birdY+bh*.14f); beak.close(); c.drawPath(beak,p); }

    private void drawGround(Canvas c){ float gh=getHeight()*.12f; p.setColor(Color.rgb(223,195,105)); c.drawRect(0,getHeight()-gh,getWidth(),getHeight(),p); p.setColor(Color.rgb(95,183,70)); c.drawRect(0,getHeight()-gh,getWidth(),getHeight()-gh+10,p); }

    private void drawHud(Canvas c){ p.setTypeface(Typeface.create(Typeface.DEFAULT,Typeface.BOLD)); p.setTextAlign(Paint.Align.CENTER); p.setShadowLayer(5,2,2,0x66000000); p.setColor(Color.WHITE); p.setTextSize(getWidth()*.13f); if(started||gameOver)c.drawText(String.valueOf(score),getWidth()/2f,getHeight()*.13f,p); p.clearShadowLayer();
        if(!started){ p.setColor(0xAA101820); c.drawRoundRect(getWidth()*.12f,getHeight()*.32f,getWidth()*.88f,getHeight()*.67f,24,24,p); p.setColor(Color.WHITE); p.setTextSize(getWidth()*.085f); c.drawText(gameOver?"GAME OVER":"FLAPPY",getWidth()/2f,getHeight()*.43f,p); p.setTextSize(getWidth()*.05f); c.drawText(gameOver?"Tap to play again":"Tap to flap",getWidth()/2f,getHeight()*.52f,p); p.setTextSize(getWidth()*.045f); c.drawText("Best: "+best,getWidth()/2f,getHeight()*.59f,p); }
    }

    @Override public boolean onTouchEvent(MotionEvent e){ if(e.getAction()==MotionEvent.ACTION_DOWN){ start(); return true; } return true; }
}
