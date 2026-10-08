import { useCallback, useEffect, useState } from 'react';
import type { Profile, RunState } from '@/game/types';
import { onContentChange } from '@/content';
import { loadProfile, loadRun, loadSettings, saveRun, saveSettings, syncProfile, type Settings } from '@/game/save';

export type Screen = 'title' | 'starter' | 'run' | 'collection';

interface GameStore {
  run: RunState | null;
  profile: Profile;
  settings: Settings;
  screen: Screen;
  toast: string | null;
  unlocks: string[];
}

type Listener = () => void;
let state: GameStore = { run: null, profile: loadProfile(), settings: loadSettings(), screen: 'title', toast: null, unlocks: [] };
const listeners = new Set<Listener>();
function emit() { for (const l of listeners) l(); }

export function getState(): GameStore { return state; }

// Re-render everything when content changes (pack toggled, generated art loaded).
onContentChange(() => { state = { ...state }; emit(); });

export function setScreen(screen: Screen): void {
  state = { ...state, screen };
  emit();
}

export function setRun(run: RunState | null): void {
  state = { ...state, run };
  saveRun(run);
  emit();
}

/** Apply an engine mutation to the current run, then persist and re-render. */
export function act(fn: (run: RunState) => unknown): unknown {
  const run = state.run;
  if (!run) return undefined;
  const r = fn(run);
  if (run.toast) { state = { ...state, toast: run.toast }; run.toast = undefined; }
  const newly = syncProfile(state.profile, run);
  if (newly.length) state = { ...state, unlocks: [...state.unlocks, ...newly] };
  state = { ...state, run, profile: { ...state.profile } };
  saveRun(run);
  emit();
  return r;
}

export function toast(msg: string | null): void {
  state = { ...state, toast: msg };
  emit();
}
export function popUnlock(): void {
  state = { ...state, unlocks: state.unlocks.slice(1) };
  emit();
}

export function updateSettings(patch: Partial<Settings>): void {
  const settings = { ...state.settings, ...patch };
  saveSettings(settings);
  state = { ...state, settings };
  emit();
}

export function hasSavedRun(): boolean { return !!loadRun(); }
export function resumeSavedRun(): boolean {
  const r = loadRun();
  if (!r) return false;
  state = { ...state, run: r, screen: 'run' };
  emit();
  return true;
}

export function useStore(): GameStore {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return state;
}

export function useRun(): RunState {
  const s = useStore();
  if (!s.run) throw new Error('no run');
  return s.run;
}

export function useAct() {
  return useCallback(act, []);
}

export function speedFactor(): number {
  return 1 / state.settings.speed;
}
