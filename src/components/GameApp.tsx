import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CircleHelp, Home, Pause, Play, RotateCcw, Settings, Volume2, VolumeX } from "lucide-react";
import { Button } from "./ui/button";
import { Game } from "../game/Game";
import { defaultUiSnapshot } from "../game/UIManager";
import type { ControlMode } from "../game/types";
import { cn } from "../lib/utils";

const noopSubscribe = () => () => {};

export function GameApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [game, setGame] = useState<Game | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const instance = new Game(canvas);
    setGame(instance);
    instance.start();
    return () => { instance.destroy(); setGame(null); };
  }, []);
  const snap = useSyncExternalStore(game ? game.ui.subscribe : noopSubscribe, () => game?.ui.getSnapshot() ?? defaultUiSnapshot, () => defaultUiSnapshot);
  const playing = snap.screen === "play";
  const overlay = snap.screen !== "play";
  return <div className="game-shell">
    <canvas ref={canvasRef} className="game-canvas" aria-label="بالن غروب" />
    {playing ? <div className="hud"><div className="hud-score" aria-live="polite">{snap.score}</div><Button variant="ghost" size="icon" className="hud-pause" aria-label="توقف" onClick={() => game?.pause()}><Pause className="size-6" fill="currentColor" /></Button></div> : null}
    {overlay ? <div className="overlay" data-screen={snap.screen}>
      {snap.screen === "menu" ? <Menu game={game} best={snap.bestScore} /> : null}
      {snap.screen === "settings" ? <SettingsPanel game={game} sound={snap.soundEnabled} mode={snap.controlMode} /> : null}
      {snap.screen === "help" ? <HelpPanel game={game} /> : null}
      {snap.screen === "paused" ? <PausePanel game={game} /> : null}
      {snap.screen === "gameover" ? <GameOverPanel game={game} score={snap.score} best={snap.bestScore} /> : null}
    </div> : null}
  </div>;
}

function Menu({ game, best }: { game: Game | null; best: number }) {
  return <div className="panel-wrap">
    <img src={`${import.meta.env.BASE_URL}assets/balloon.png`} alt="" className="hero-balloon" />
    <h1 className="title">بالن غروب</h1><p className="best-line">بهترین امتیاز {best}</p>
    <div className="stack"><Button className="w-full" onClick={() => game?.startPlay()}><Play className="size-5" fill="currentColor" />بازی</Button><Button variant="secondary" className="w-full" onClick={() => game?.openSettings()}><Settings className="size-5" />تنظیمات</Button><Button variant="secondary" className="w-full" onClick={() => game?.openHelp()}><CircleHelp className="size-5" />راهنما</Button></div><AdSlot />
  </div>;
}

function SettingsPanel({ game, sound, mode }: { game: Game | null; sound: boolean; mode: ControlMode }) {
  const modes: { id: ControlMode; label: string }[] = [{ id: "both", label: "ضربه و کشیدن" }, { id: "tap", label: "فقط ضربه" }, { id: "swipe", label: "فقط کشیدن" }];
  return <div className="panel"><h2 className="panel-title">تنظیمات</h2><button type="button" className="setting-row" onClick={() => game?.setSound(!sound)}><span>صدا</span>{sound ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}</button><p className="setting-label">کنترل</p><div className="mode-row">{modes.map((m) => <button key={m.id} type="button" className={cn("mode-chip", mode === m.id && "mode-chip-on")} onClick={() => game?.setControlMode(m.id)}>{m.label}</button>)}</div><Button variant="secondary" className="w-full mt-5" onClick={() => game?.openMenu()}><Home className="size-5" />منو</Button></div>;
}

function HelpPanel({ game }: { game: Game | null }) {
  return <div className="panel"><h2 className="panel-title">راهنما</h2><ul className="help-list"><li>بالن سر جایش می‌ماند؛ ستون‌ها از راست به چپ می‌آیند.</li><li>فقط روی ستون فعال ضربه بزن. هر ضربه شکاف را کمی بالا می‌برد.</li><li>روی همان ستون انگشت بکش تا شکاف بالا یا پایین برود.</li><li>لمس جای خالی صفحه ستونی را حرکت نمی‌دهد.</li><li>از شکاف رد شو. برخورد با بدنه ستون یعنی باخت.</li><li>از امتیاز ۱۰ سرعت بیشتر و شکاف کوچک‌تر می‌شود.</li></ul><Button variant="secondary" className="w-full mt-5" onClick={() => game?.openMenu()}><Home className="size-5" />منو</Button></div>;
}

function PausePanel({ game }: { game: Game | null }) {
  return <div className="panel"><h2 className="panel-title">بازی متوقف شد</h2><div className="stack"><Button className="w-full" onClick={() => game?.resume()}><Play className="size-5" fill="currentColor" />ادامه</Button><Button variant="secondary" className="w-full" onClick={() => game?.restart()}><RotateCcw className="size-5" />شروع مجدد</Button><Button variant="secondary" className="w-full" onClick={() => game?.openMenu()}><Home className="size-5" />منو</Button></div><AdSlot /></div>;
}

function GameOverPanel({ game, score, best }: { game: Game | null; score: number; best: number }) {
  return <div className="panel-wrap"><h2 className="panel-title">بازی تمام شد</h2><img src={`${import.meta.env.BASE_URL}assets/fallen-balloon.png`} alt="" className="fallen-balloon" /><p className="score-label">امتیاز</p><p className="score-big">{score}</p><p className="best-line">بهترین {best}</p><div className="stack"><Button className="w-full" onClick={() => game?.restart()}><RotateCcw className="size-5" />دوباره</Button><Button variant="secondary" className="w-full" onClick={() => game?.openMenu()}><Home className="size-5" />منو</Button></div><AdSlot /></div>;
}
function AdSlot() { return <div className="ad-slot" aria-hidden="true">AD</div>; }
