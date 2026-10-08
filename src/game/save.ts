import type { Profile, RunState } from './types';
import { SAVE_VERSION } from './run';
import { DECKS } from './decks';

// Storage keys. Saves from older builds use other keys and are simply not picked up.
export const STORAGE_PREFIX = 'pocketaces.';
const RUN_KEY = STORAGE_PREFIX + 'run';
const PROFILE_KEY = STORAGE_PREFIX + 'profile';
const SETTINGS_KEY = STORAGE_PREFIX + 'settings';

export interface Settings {
  speed: 1 | 2 | 4;
  reducedMotion: boolean;
  crt: boolean;
  showMoveNames: boolean;
  /** Table background: the full swirl, a slow one, or still. */
  background: 'swirl' | 'slow' | 'still';
  /** Optional imported content overlay id (e.g. a locally imported pack), or '' for the default pack. */
  overlay: string;
}

function read<T>(key: string): T | null {
  try {
    const s = localStorage.getItem(key);
    return s ? (JSON.parse(s) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, v: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ }
}

export function saveRun(run: RunState | null): void {
  if (!run || run.phase === 'gameover' || run.phase === 'win') { try { localStorage.removeItem(RUN_KEY); } catch { /* ignore */ } return; }
  write(RUN_KEY, run);
}
export function loadRun(): RunState | null {
  const r = read<RunState>(RUN_KEY);
  if (!r || r.version !== SAVE_VERSION) return null;
  return r;
}
export function clearRun(): void { try { localStorage.removeItem(RUN_KEY); } catch { /* ignore */ } }

export function defaultProfile(): Profile {
  return { unlockedStarters: ['sprout', 'ember', 'tide'], wins: {}, losses: {}, bestDamage: 0, mostBadges: 0, discovered: {}, dex: {}, handPlays: {}, startersWon: [], difficultyWins: {}, runsStarted: 0 };
}
export function loadProfile(): Profile {
  return { ...defaultProfile(), ...(read<Profile>(PROFILE_KEY) ?? {}) };
}
export function saveProfile(p: Profile): void { write(PROFILE_KEY, p); }

export function loadSettings(): Settings {
  return { speed: 1, reducedMotion: prefersReducedMotion(), crt: false, showMoveNames: false, background: 'swirl', overlay: '', ...(read<Settings>(SETTINGS_KEY) ?? {}) };
}
function prefersReducedMotion(): boolean {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}
export function saveSettings(s: Settings): void { write(SETTINGS_KEY, s); }

/** Fold a run's progress into the profile. Returns newly unlocked starters. */
export function syncProfile(p: Profile, run: RunState): string[] {
  for (const u of run.unlockQueue) p.discovered[u] = true;
  run.unlockQueue = [];
  for (const c of run.deck) {
    const e = p.dex[c.speciesId] ?? { caught: 0 };
    e.caught = Math.max(e.caught, 1);
    if (c.edition === 'shiny') e.shiny = true;
    p.dex[c.speciesId] = e;
  }
  for (const it of run.items) p.discovered['item:' + it.defId] = true;
  for (const b of run.bag) p.discovered['cons:' + b.defId] = true;
  for (const k of run.keyItems) p.discovered['key:' + k] = true;
  for (const [h, n] of Object.entries(run.handPlays)) p.handPlays[h] = Math.max(p.handPlays[h] ?? 0, n);
  if ((run.handPlays.five ?? 0) > 0 || (run.handPlays.flushfive ?? 0) > 0) p.fiveOfAKind = true;
  p.bestDamage = Math.max(p.bestDamage, run.stats.bestDamage);
  p.mostBadges = Math.max(p.mostBadges, run.badges.length);
  if (run.phase === 'win' && !p.discovered['won:' + run.seed]) {
    p.discovered['won:' + run.seed] = true;
    p.wins[run.starter] = (p.wins[run.starter] ?? 0) + 1;
    if (!p.startersWon.includes(run.starter)) p.startersWon.push(run.starter);
    const dw = p.difficultyWins[run.starter] ?? [];
    if (!dw.includes(run.difficulty)) dw.push(run.difficulty);
    p.difficultyWins[run.starter] = dw;
  }
  if (run.phase === 'gameover' && !p.discovered['lost:' + run.seed]) {
    p.discovered['lost:' + run.seed] = true;
    p.losses[run.starter] = (p.losses[run.starter] ?? 0) + 1;
  }
  const newly: string[] = [];
  for (const d of DECKS) {
    if (!p.unlockedStarters.includes(d.id) && d.isUnlocked(p)) { p.unlockedStarters.push(d.id); newly.push(d.id); }
  }
  saveProfile(p);
  return newly;
}
