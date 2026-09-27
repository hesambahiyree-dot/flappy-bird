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
    private final ArrayList<Gate> gates = new ArrayList<>();
    private float playerY, velocity;
    private long lastFrame, lastGate;
    private int score, best, combo;
    private boolean started, gameOver, gravityDown = true;
    private final float gravity = 0.00185f, tapImpulse = 0.62f;
    private final RectF player = new RectF();

    static class Gate {
        float x, gapY, gap;
        boolean scored;
        Gate(float x, float gapY, float gap) { this.x=x; this.gapY=gapY; this.gap=gap; }
    }

    public GameView(Context c) {
        super(c);
        setBackground(new ColorDrawable(Color.rgb(7,12,19)));
        best = c.getSharedPreferences("game",0).getInt("best",0);
        setFocusable(true);
    }

    private void reset() {
        gates.clear(); score=0; combo=0; started=false; gameOver=false;
        gravityDown=true; playerY=getHeight()*0.5f; velocity=0;
        lastFrame=System.nanoTime(); lastGate=0; invalidate();
    }

    private void startRun() {
        if (gameOver) reset();
        started = true;
        if (gates.isEmpty()) addGate(getWidth()*0.95f);
        lastGate = System.currentTimeMillis();
        tapGravity();
    }

    private void tapGravity() {
        if (!started || gameOver) return;
        gravityDown = !gravityDown;
        velocity = gravityDown ? Math.abs(tapImpulse) : -Math.abs(tapImpulse);
        invalidate();
    }

    private void addGate(float x) {
        float margin = getHeight()*0.14f;
        float min = margin, max = getHeight()*0.86f;
        float difficulty = Math.min(score, 60) / 60f;
        float gap = getHeight() * (0.23f - 0.08f*difficulty);
        float gapY = min + random.nextFloat() * (max-min);
        gates.add(new Gate(x, gapY, Math.max(gap, getHeight()*0.13f)));
    }

    @Override protected void onSizeChanged(int w,int h,int ow,int oh) {
        playerY=h*0.5f;
    }

    @Override protected void onDraw(Canvas c) {
        super.onDraw(c);
        long now=System.nanoTime();
        float dt=Math.min(30f,(now-lastFrame)/1_000_000f);
        lastFrame=now;
        drawBackground(c);
        if(started && !gameOver) update(dt);
        drawGates(c); drawPlayer(c); drawHud(c);
        if(started && !gameOver) postInvalidateDelayed(8); else invalidate();
    }

    private void update(float dt) {
        float g = gravityDown ? gravity : -gravity;
        velocity += g*dt;
        playerY += velocity*dt;

        float scale=Math.max(0.8f,getWidth()/360f);
        float speed=(0.34f+Math.min(score,50)*0.004f)*dt*scale;
        long now=System.currentTimeMillis();
        long interval=Math.max(820,1420-score*8);
        if(now-lastGate>interval){ addGate(getWidth()+50); lastGate=now; }

        for(Gate q:gates) q.x-=speed;

        Iterator<Gate> it=gates.iterator();
        while(it.hasNext()) {
            Gate q=it.next();
            if(q.x < -100) { it.remove(); continue; }
            if(!q.scored && q.x+getWidth()*0.155f < getWidth()*0.22f) {
                q.scored=true; score++; combo++;
                if(score>best) {
                    best=score;
                    getContext().getSharedPreferences("game",0).edit().putInt("best",best).apply();
                }
            }
        }

        float pw=getWidth()*0.105f, ph=pw*0.78f, px=getWidth()*0.22f;
        player.set(px,playerY-ph/2,px+pw,playerY+ph/2);

        float ceiling=getHeight()*0.055f, floor=getHeight()*0.89f;
        if(player.top<ceiling || player.bottom>floor) { endGame(); return; }

        for(Gate q:gates) {
            float gw=getWidth()*0.155f;
            float top=q.gapY-q.gap/2f, bottom=q.gapY+q.gap/2f;
            RectF a=new RectF(q.x,ceiling,q.x+gw,top);
            RectF b=new RectF(q.x,bottom,q.x+gw,floor);
            if(RectF.intersects(player,a)||RectF.intersects(player,b)) { endGame(); break; }
        }
    }

    private void endGame() { if(!gameOver) { gameOver=true; started=false; } }

    private void drawBackground(Canvas c) {
        p.setStyle(Paint.Style.FILL);
        p.setColor(Color.rgb(7,12,19)); c.drawRect(0,0,getWidth(),getHeight(),p);
        p.setColor(0x2236FF80);
        for(int i=0;i<9;i++) {
            float x=(i*83+(System.nanoTime()/12000000)%83)%Math.max(1,getWidth());
            c.drawCircle(x,getHeight()*(0.09f+i*0.105f),1.6f,p);
        }
        p.setColor(0xFF16232C);
        c.drawRect(0,getHeight()*0.055f,getWidth(),getHeight()*0.065f,p);
        c.drawRect(0,getHeight()*0.89f,getWidth(),getHeight()*0.90f,p);
    }

    private void drawGates(Canvas c) {
        float gw=getWidth()*0.155f, ceiling=getHeight()*0.055f, floor=getHeight()*0.89f;
        for(Gate q:gates) {
            float top=q.gapY-q.gap/2f, bottom=q.gapY+q.gap/2f;
            p.setColor(Color.rgb(29,43,50));
            c.drawRoundRect(q.x,ceiling,q.x+gw,top,9,9,p);
            c.drawRoundRect(q.x,bottom,q.x+gw,floor,9,9,p);
            p.setColor(0xFF36FF80);
            c.drawRect(q.x,top-5,q.x+gw,top,p);
            c.drawRect(q.x,bottom,q.x+gw,bottom+5,p);
            p.setColor(0x5536FF80);
            c.drawRect(q.x+gw*0.7f,ceiling,q.x+gw,top,p);
            c.drawRect(q.x+gw*0.7f,bottom,q.x+gw,floor,p);
        }
    }

    private void drawPlayer(Canvas c) {
        float pw=getWidth()*0.105f, ph=pw*0.78f, px=getWidth()*0.22f;
        player.set(px,playerY-ph/2,px+pw,playerY+ph/2);
        p.setColor(0xFF36FF80);
        c.drawOval(player,p);
        p.setColor(Color.WHITE);
        c.drawCircle(px+pw*.72f,playerY-ph*.2f,pw*.13f,p);
        p.setColor(0xFF07100B);
        c.drawCircle(px+pw*.77f,playerY-ph*.2f,pw*.06f,p);
        p.setColor(0x8836FF80);
        c.drawCircle(px+pw*.5f,playerY,pw*.78f,p);
    }

    private void drawHud(Canvas c) {
        p.setTypeface(Typeface.create(Typeface.DEFAULT,Typeface.BOLD));
        p.setTextAlign(Paint.Align.CENTER);
        p.setColor(Color.WHITE);
        p.setTextSize(getWidth()*.14f);
        if(started || gameOver) c.drawText(String.valueOf(score),getWidth()/2f,getHeight()*.12f,p);

        if(started && !gameOver) {
            p.setTextSize(getWidth()*.042f);
            p.setColor(0xFF36FF80);
            c.drawText(gravityDown ? "GRAVITY ↓  •  TAP = FLIP" : "GRAVITY ↑  •  TAP = FLIP",getWidth()/2f,getHeight()*.17f,p);
            p.setColor(0x99FFFFFF);
            c.drawText("COMBO  "+combo,getWidth()/2f,getHeight()*.22f,p);
        } else {
            p.setColor(0xE60A1017);
            c.drawRoundRect(getWidth()*.08f,getHeight()*.27f,getWidth()*.92f,getHeight()*.73f,30,30,p);
            p.setColor(Color.WHITE);
            p.setTextSize(getWidth()*.105f);
            c.drawText(gameOver ? "RUN OVER" : "TAP GRAVITY",getWidth()/2f,getHeight()*.40f,p);
            p.setColor(0xFF36FF80);
            p.setTextSize(getWidth()*.052f);
            c.drawText(gameOver ? "TAP TO RESTART" : "EVERY TAP FLIPS GRAVITY",getWidth()/2f,getHeight()*.51f,p);
            p.setColor(0xBFFFFFFF);
            p.setTextSize(getWidth()*.043f);
            c.drawText("One wrong tap = game over",getWidth()/2f,getHeight()*.59f,p);
            c.drawText("BEST  "+best+"   •   TAP TO START",getWidth()/2f,getHeight()*.66f,p);
        }
    }

    @Override public boolean onTouchEvent(MotionEvent e) {
        if(e.getAction()==MotionEvent.ACTION_DOWN) {
            if(!started || gameOver) { startRun(); return true; }
            tapGravity();
            return true;
        }
        return true;
    }
}
