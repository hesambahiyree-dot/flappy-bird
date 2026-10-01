import type { ControlMode, Screen, UiSnapshot } from "./types";
import { loadSave, writeSave, type SaveData } from "./storage";
const DEFAULT_SNAP: UiSnapshot = { screen: "menu", score: 0, bestScore: 0, soundEnabled: true, controlMode: "both" };
export class UIManager {
  private snap: UiSnapshot;
  private listeners = new Set<() => void>();
  constructor() { const save = loadSave(); this.snap = { ...DEFAULT_SNAP, bestScore: save.bestScore, soundEnabled: save.soundEnabled, controlMode: save.controlMode }; }
  subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  getSnapshot = (): UiSnapshot => this.snap;
  get screen(): Screen { return this.snap.screen; }
  get score(): number { return this.snap.score; }
  get controlMode(): ControlMode { return this.snap.controlMode; }
  get soundEnabled(): boolean { return this.snap.soundEnabled; }
  persist(): void { const data: SaveData = { version: 1, bestScore: this.snap.bestScore, soundEnabled: this.snap.soundEnabled, controlMode: this.snap.controlMode }; writeSave(data); }
  setScreen(screen: Screen): void { if (this.snap.screen === screen) return; this.patch({ screen }); }
  setScore(score: number): void { if (this.snap.score === score) return; this.patch({ score }); }
  noteBest(score: number): void { if (score > this.snap.bestScore) { this.patch({ bestScore: score }); this.persist(); } }
  setSound(soundEnabled: boolean): void { this.patch({ soundEnabled }); this.persist(); }
  setControlMode(controlMode: ControlMode): void { this.patch({ controlMode }); this.persist(); }
  private patch(partial: Partial<UiSnapshot>): void { this.snap = { ...this.snap, ...partial }; for (const fn of this.listeners) fn(); }
}
export const defaultUiSnapshot: UiSnapshot = DEFAULT_SNAP;
