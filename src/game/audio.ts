export class GameAudio {
  private ctx: AudioContext | null = null; private master: GainNode | null = null; private sfx: GainNode | null = null; enabled = true;
  unlock(): void { const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext; if (!this.ctx) { this.ctx = new Ctx({ latencyHint: "interactive" }); this.master = this.ctx.createGain(); this.sfx = this.ctx.createGain(); this.sfx.connect(this.master); this.master.connect(this.ctx.destination); this.applyGain(); } if (this.ctx.state === "suspended") void this.ctx.resume(); }
  setEnabled(on: boolean): void { this.enabled = on; this.applyGain(); }
  private applyGain(): void { if (!this.ctx || !this.master) return; this.master.gain.setTargetAtTime(this.enabled ? 1 : 0, this.ctx.currentTime, 0.02); }
  private tone(freq: number, dur: number, type: OscillatorType, gain: number, slide = 0): void { if (!this.enabled) return; this.unlock(); const ctx = this.ctx; const bus = this.sfx; if (!ctx || !bus) return; const osc = ctx.createOscillator(); const g = ctx.createGain(); osc.type = type; osc.frequency.setValueAtTime(freq, ctx.currentTime); if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), ctx.currentTime + dur); g.gain.setValueAtTime(0.0001, ctx.currentTime); g.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur); osc.connect(g); g.connect(bus); osc.start(); osc.stop(ctx.currentTime + dur + 0.02); osc.onended = () => { osc.disconnect(); g.disconnect(); }; }
  tap(): void { const jitter = 1 + (Math.random() * 2 - 1) * 0.06; this.tone(520 * jitter, 0.06, "triangle", 0.07); }
  score(): void { this.tone(660, 0.09, "sine", 0.09, 80); this.tone(880, 0.12, "triangle", 0.05, 40); }
  crash(): void { this.tone(140, 0.28, "sawtooth", 0.12, -90); this.tone(70, 0.34, "square", 0.08, -30); }
  ui(): void { this.tone(480, 0.05, "sine", 0.05); }
  resume(): void { if (this.ctx?.state === "suspended") void this.ctx.resume(); }
}
