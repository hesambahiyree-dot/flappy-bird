import { SAVE_KEY, SAVE_VERSION, type ControlMode } from "./types";
export type SaveData = { version: typeof SAVE_VERSION; bestScore: number; soundEnabled: boolean; controlMode: ControlMode };
const defaults: SaveData = { version: SAVE_VERSION, bestScore: 0, soundEnabled: true, controlMode: "both" };
function migrate(raw: Partial<SaveData>): SaveData { return { ...defaults, bestScore: typeof raw.bestScore === "number" ? raw.bestScore : 0, soundEnabled: typeof raw.soundEnabled === "boolean" ? raw.soundEnabled : true, controlMode: raw.controlMode === "tap" || raw.controlMode === "swipe" || raw.controlMode === "both" ? raw.controlMode : "both", version: SAVE_VERSION }; }
export function loadSave(): SaveData { try { const raw = localStorage.getItem(SAVE_KEY); if (!raw) return { ...defaults }; return migrate(JSON.parse(raw) as Partial<SaveData>); } catch { return { ...defaults }; } }
export function writeSave(data: SaveData): void { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...data, version: SAVE_VERSION })); } catch {} }
