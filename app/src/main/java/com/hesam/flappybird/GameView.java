package com.hesam.flappybird;

import android.content.Context;
import android.graphics.*;
import android.graphics.drawable.ColorDrawable;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioTrack;
import android.view.MotionEvent;
import android.view.View;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.Random;

public class GameView extends View {
    private final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Random random = new Random();
    private final ArrayList<Gate> gates = new ArrayList<>();

    private float balloonY, windVelocity;
    private long lastFrame, lastSpawn, freezeUntil, fanUntil;
    private int score, best;
    private boolean started, gameOver;
    private boolean fanActive;
    private float fanForce;
    private int fanDirection = 1;
    private final RectF balloon = new RectF();

    private AudioTrack music;
    private Thread musicThread;

    static class Gate {
        float x, centerY, gap, phase, speed;
        boolean passed;
        Gate(float x, float centerY, float gap, float phase, float speed) {
            this.x = x; this.centerY = centerY; this.gap = gap;
            this.phase = phase; this.speed = speed;
        }
    }

    public GameView(Context c) {
        super(c);
        setBackground(new ColorDrawable(Color.rgb(10, 13, 20)));
        best = c.getSharedPreferences("game", 0).getInt("best", 0);
        setFocusable(true);
    }

    private void reset() {
        gates.clear();
        score = 0;
        started = false;
        gameOver = false;
        fanActive = false;
        windVelocity = 0;
        balloonY = getHeight() * 0.50f;
        freezeUntil = 0;
        fanUntil = 0;
        lastFrame = System.nanoTime();
        lastSpawn = 0;
        invalidate();
    }

    private void startRun() {
        if (gameOver) reset();
        started = true;
        gameOver = false;
        balloonY = getHeight() * 0.50f;
        windVelocity = 0;
        gates.clear();
        addGate(getWidth() * 0.78f, true);
        lastSpawn = System.currentTimeMillis();
        startMusic();
    }

    private void addGate(float x, boolean first) {
        float h = getHeight();
        float ceiling = h * 0.10f;
        float floor = h * 0.86f;
        float gap = h * (first ? 0.34f : Math.max(0.21f, 0.34f - Math.min(score, 40) * 0.003f));
        float center = first ? h * 0.50f : ceiling + gap / 2f + random.nextFloat() * (floor - ceiling - gap);
        float speed = 0.65f + Math.min(score, 35) * 0.018f;
        gates.add(new Gate(x, center, gap, random.nextFloat() * 6.28f, speed));
    }

    @Override protected void onSizeChanged(int w, int h, int ow, int oh) {
        balloonY = h * 0.50f;
    }

    @Override protected void onDraw(Canvas c) {
        super.onDraw(c);
        long now = System.nanoTime();
        float dt = Math.min(32f, (now - lastFrame) / 1_000_000f);
        lastFrame = now;

        drawBackground(c);
        if (started && !gameOver) update(dt);
        drawGates(c);
        drawFan(c);
        drawBalloon(c);
        drawHud(c);

        if (started && !gameOver) postInvalidateDelayed(12);
        else invalidate();
    }

    private void update(float dt) {
        long now = System.currentTimeMillis();

        // The balloon stays horizontally fixed. Wind can gently move it vertically.
        if (fanActive && now < fanUntil) {
            windVelocity += fanForce * fanDirection * dt;
        } else {
            fanActive = false;
            windVelocity *= 0.94f;
        }
        windVelocity *= 0.985f;
        balloonY += windVelocity * dt;

        float ceiling = getHeight() * 0.10f;
        float floor = getHeight() * 0.86f;
        float half = getWidth() * 0.045f;
        balloonY = Math.max(ceiling + half, Math.min(floor - half, balloonY));

        boolean frozen = now < freezeUntil;
        for (Gate g : gates) {
            if (!frozen) {
                g.phase += g.speed * dt / 1000f;
                float range = Math.max(8f, (getHeight() * 0.72f - g.gap) * 0.5f);
                g.centerY = getHeight() * 0.50f + (float)Math.sin(g.phase) * range;
                float min = ceiling + g.gap / 2f;
                float max = floor - g.gap / 2f;
                g.centerY = Math.max(min, Math.min(max, g.centerY));
            }
        }

        if (now - lastSpawn > Math.max(1150, 1650 - score * 10L)) {
            addGate(getWidth() + 50, false);
            lastSpawn = now;
            if (random.nextFloat() < 0.24f) activateFan();
        }

        float speed = (0.23f + Math.min(score, 35) * 0.0035f) * dt * Math.max(0.85f, getWidth() / 360f);
        Iterator<Gate> it = gates.iterator();
        while (it.hasNext()) {
            Gate g = it.next();
            g.x -= speed;

            if (g.x < -getWidth() * 0.22f) {
                it.remove();
                continue;
            }

            float gateW = getWidth() * 0.16f;
            if (!g.passed && g.x + gateW < getWidth() * 0.27f) {
                g.passed = true;
                score++;
                if (score > best) {
                    best = score;
                    getContext().getSharedPreferences("game", 0)
                            .edit().putInt("best", best).apply();
                }
                // A fan can appear randomly after any successful point.
                if (random.nextFloat() < 0.30f) activateFan();
            }
        }

        float bw = getWidth() * 0.105f;
        float bh = getHeight() * 0.13f;
        float bx = getWidth() * 0.24f;
        balloon.set(bx, balloonY - bh / 2f, bx + bw, balloonY + bh / 2f);

        // Small hitbox forgiveness makes the game feel fair.
        RectF hit = new RectF(
                balloon.left + bw * 0.14f,
                balloon.top + bh * 0.12f,
                balloon.right - bw * 0.14f,
                balloon.bottom - bh * 0.10f
        );

        if (hit.top < ceiling || hit.bottom > floor) {
            endGame();
            return;
        }

        for (Gate g : gates) {
            float gateW = getWidth() * 0.16f;
            float top = g.centerY - g.gap / 2f;
            float bottom = g.centerY + g.gap / 2f;

            if (hit.right > g.x && hit.left < g.x + gateW &&
                    (hit.top < top || hit.bottom > bottom)) {
                endGame();
                return;
            }
        }
    }

    private void activateFan() {
        fanActive = true;
        fanUntil = System.currentTimeMillis() + 950;
        fanDirection = random.nextBoolean() ? 1 : -1;
        fanForce = 0.00032f + random.nextFloat() * 0.00018f;
    }

    private void tapAction() {
        if (!started || gameOver) return;
        // Tap freezes moving gates briefly, giving the player control over timing.
        freezeUntil = System.currentTimeMillis() + 1050;
        if (fanActive) fanUntil = Math.min(fanUntil, System.currentTimeMillis() + 550);
        invalidate();
    }

    private void endGame() {
        if (!gameOver) {
            gameOver = true;
            started = false;
            stopMusic();
        }
    }

    private void drawBackground(Canvas c) {
        p.setStyle(Paint.Style.FILL);
        p.setColor(Color.rgb(10, 13, 20));
        c.drawRect(0, 0, getWidth(), getHeight(), p);

        p.setColor(0x1836FF80);
        for (int i = 0; i < 12; i++) {
            float x = (i * 91 + (System.nanoTime() / 15000000) % 91) % Math.max(1, getWidth());
            float y = getHeight() * (0.08f + (i % 6) * 0.15f);
            c.drawCircle(x, y, 1.5f, p);
        }

        p.setColor(0xFF252B35);
        c.drawRect(0, getHeight() * 0.075f, getWidth(), getHeight() * 0.09f, p);
        c.drawRect(0, getHeight() * 0.88f, getWidth(), getHeight() * 0.895f, p);
    }

    private void drawGates(Canvas c) {
        float gw = getWidth() * 0.16f;
        float ceiling = getHeight() * 0.10f;
        float floor = getHeight() * 0.88f;

        for (Gate g : gates) {
            float top = g.centerY - g.gap / 2f;
            float bottom = g.centerY + g.gap / 2f;

            p.setColor(0xFFE8E8E8);
            c.drawRoundRect(g.x, ceiling, g.x + gw, top, 12, 12, p);
            c.drawRoundRect(g.x, bottom, g.x + gw, floor, 12, 12, p);

            // Red-white arcade balloon style obstacle caps.
            p.setColor(0xFFE53935);
            c.drawRect(g.x, top - 8, g.x + gw, top, p);
            c.drawRect(g.x, bottom, g.x + gw, bottom + 8, p);

            p.setColor(0xFFB71C1C);
            c.drawRect(g.x + gw * 0.76f, ceiling, g.x + gw, top, p);
            c.drawRect(g.x + gw * 0.76f, bottom, g.x + gw, floor, p);
        }
    }

    private void drawFan(Canvas c) {
        if (!fanActive) return;

        float cx = getWidth() * 0.86f;
        float cy = getHeight() * 0.78f;
        p.setStyle(Paint.Style.FILL);
        p.setColor(0xFFD9E0E8);
        c.drawCircle(cx, cy, getWidth() * 0.065f, p);

        p.setColor(0xFF555E6A);
        for (int i = 0; i < 4; i++) {
            c.save();
            c.rotate(i * 90f + (System.currentTimeMillis() % 360), cx, cy);
            c.drawOval(cx - getWidth() * 0.015f, cy - getWidth() * 0.055f,
                    cx + getWidth() * 0.015f, cy, p);
            c.restore();
        }

        p.setColor(0x6636FF80);
        float dir = fanDirection > 0 ? -1f : 1f;
        for (int i = 1; i <= 4; i++) {
            float y = cy + dir * i * getHeight() * 0.035f;
            c.drawLine(cx, cy, cx, y, p);
        }
    }

    private void drawBalloon(Canvas c) {
        float bw = getWidth() * 0.105f;
        float bh = getHeight() * 0.13f;
        float bx = getWidth() * 0.24f;

        balloon.set(bx, balloonY - bh / 2f, bx + bw, balloonY + bh / 2f);

        // Red / white arcade balloon.
        p.setColor(0xFFE53935);
        c.drawOval(balloon, p);

        p.setColor(Color.WHITE);
        c.drawOval(
                bx + bw * 0.24f, balloon.top + bh * 0.10f,
                bx + bw * 0.50f, balloon.bottom - bh * 0.12f, p
        );

        p.setColor(0xFFB71C1C);
        Path knot = new Path();
        knot.moveTo(bx + bw * 0.43f, balloon.bottom - bh * 0.02f);
        knot.lineTo(bx + bw * 0.57f, balloon.bottom - bh * 0.02f);
        knot.lineTo(bx + bw * 0.50f, balloon.bottom + bh * 0.13f);
        knot.close();
        c.drawPath(knot, p);

        p.setColor(0xFF7A1010);
        p.setStrokeWidth(2f);
        c.drawLine(bx + bw * 0.50f, balloon.bottom + bh * 0.13f,
                bx + bw * 0.50f, balloon.bottom + bh * 0.38f, p);
    }

    private void drawHud(Canvas c) {
        p.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        p.setTextAlign(Paint.Align.CENTER);
        p.setColor(Color.WHITE);
        p.setTextSize(getWidth() * 0.14f);

        if (started || gameOver) {
            c.drawText(String.valueOf(score), getWidth() / 2f, getHeight() * 0.15f, p);
        }

        if (started && !gameOver) {
            p.setTextSize(getWidth() * 0.043f);
            p.setColor(0xFF36FF80);
            c.drawText(System.currentTimeMillis() < freezeUntil ? "FROZEN • NICE TIMING" : "TAP TO STOP THE GATES",
                    getWidth() / 2f, getHeight() * 0.21f, p);

            if (fanActive) {
                p.setColor(Color.WHITE);
                c.drawText(fanDirection > 0 ? "WIND ↑" : "WIND ↓",
                        getWidth() / 2f, getHeight() * 0.26f, p);
            }
        } else {
            p.setColor(0xE6121720);
            c.drawRoundRect(getWidth() * 0.08f, getHeight() * 0.27f,
                    getWidth() * 0.92f, getHeight() * 0.75f, 30, 30, p);

            p.setColor(Color.WHITE);
            p.setTextSize(getWidth() * 0.095f);
            c.drawText(gameOver ? "BALLOON DOWN" : "BALLOON ARCADE",
                    getWidth() / 2f, getHeight() * 0.40f, p);

            p.setColor(0xFFE53935);
            p.setTextSize(getWidth() * 0.052f);
            c.drawText(gameOver ? "TAP TO PLAY AGAIN" : "TAP TO START",
                    getWidth() / 2f, getHeight() * 0.51f, p);

            p.setColor(0xCCFFFFFF);
            p.setTextSize(getWidth() * 0.041f);
            c.drawText("Stop the moving gates at the right moment",
                    getWidth() / 2f, getHeight() * 0.59f, p);
            c.drawText("BEST  " + best, getWidth() / 2f, getHeight() * 0.67f, p);
        }
    }

    private void startMusic() {
        if (music != null) return;

        final int sampleRate = 22050;
        final int buffer = AudioTrack.getMinBufferSize(sampleRate,
                AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT);

        music = new AudioTrack(AudioManager.STREAM_MUSIC, sampleRate,
                AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT,
                Math.max(buffer, 2048), AudioTrack.MODE_STREAM);

        music.setVolume(0.13f);
        music.play();

        musicThread = new Thread(() -> {
            short[] data = new short[1024];
            double phase = 0;
            int tick = 0;
            double[] notes = {261.63, 329.63, 392.00, 329.63, 293.66, 349.23, 440.00, 349.23};

            try {
                while (music != null && !Thread.currentThread().isInterrupted()) {
                    double freq = notes[(tick / 12) % notes.length];
                    for (int i = 0; i < data.length; i++) {
                        double t = phase / sampleRate;
                        double wave = Math.sin(2 * Math.PI * freq * t) * 0.48
                                + Math.sin(2 * Math.PI * freq * 2 * t) * 0.12;
                        data[i] = (short)(wave * 2500);
                        phase++;
                    }
                    music.write(data, 0, data.length);
                    tick++;
                }
            } catch (Exception ignored) { }
        }, "balloon-music");
        musicThread.start();
    }

    private void stopMusic() {
        AudioTrack m = music;
        music = null;
        if (musicThread != null) {
            musicThread.interrupt();
            musicThread = null;
        }
        if (m != null) {
            try { m.stop(); } catch (Exception ignored) {}
            m.release();
        }
    }

    @Override public boolean onTouchEvent(MotionEvent e) {
        if (e.getAction() == MotionEvent.ACTION_DOWN) {
            if (!started || gameOver) {
                startRun();
            } else {
                tapAction();
            }
            return true;
        }
        return true;
    }

    @Override protected void onDetachedFromWindow() {
        stopMusic();
        super.onDetachedFromWindow();
    }
}
