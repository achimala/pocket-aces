// Loaded only with ?dev. Gives recording/automation scripts a brain (best play) and an audio tap.
import { audio, captureStream } from '@/audio';
import { evaluateHand } from '@/game/hands';
import { viewCard } from '@/game/pips';
import { canPlaySelected } from '@/game/run';
import { handOptions, scoreHand } from '@/game/scoring';
import type { RunState } from '@/game/types';
import { getState, updateSettings } from '@/ui/store';

function combos<T>(arr: T[], k: number): T[][] {
  const out: T[][] = [];
  const rec = (s: number, acc: T[]) => { if (acc.length === k) { out.push([...acc]); return; } for (let i = s; i < arr.length; i++) { acc.push(arr[i]); rec(i + 1, acc); acc.pop(); } };
  rec(0, []);
  return out;
}
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

function bestPlay(): { uids: string[]; damage: number; type: string; discard: string[] | null } | null {
  const run = getState().run;
  const b = run?.battle;
  if (!run || !b) return null;
  const hand = b.hand.filter((u) => !run.deck.find((c) => c.uid === u)!.frozen);
  let best: { uids: string[]; damage: number; type: string } | null = null;
  for (const k of [5, 4, 3, 2, 1]) {
    if (hand.length < k) continue;
    for (const uids of combos(hand, k)) {
      const r: RunState = clone(run);
      r.battle!.selected = uids;
      if (canPlaySelected(r)) continue;
      const played = uids.map((u) => viewCard(r.deck.find((c) => c.uid === u)!));
      const res = scoreHand(r, r.battle!, played, r.battle!.hand.filter((u) => !uids.includes(u)));
      if (!best || res.damage > best.damage) best = { uids, damage: res.damage, type: res.hand.type };
    }
  }
  if (!best) return null;
  // keep only the cards that actually score, so the play reads cleanly on screen
  const views = best.uids.map((u) => viewCard(run.deck.find((c) => c.uid === u)!));
  const scoring = evaluateHand(views, handOptions(run)).scoring;
  const mustFive = b.opponent.ruleId === 'fivecards' && !b.bossDisabled;
  const uids = mustFive ? best.uids : best.uids.filter((u) => scoring.includes(u));
  const remaining = b.hp - b.damage;
  let discard: string[] | null = null;
  if (b.discardsLeft > 0 && b.handsLeft > 1 && best.damage < (remaining / b.handsLeft) * 0.7) {
    const keep = new Set(best.uids.filter((u) => scoring.includes(u)));
    const junk = b.hand.filter((u) => !keep.has(u)).slice(0, 5);
    if (junk.length) discard = junk;
  }
  return { uids: uids.length ? uids : best.uids, damage: best.damage, type: best.type, discard };
}

let recorder: MediaRecorder | null = null;
let chunks: Blob[] = [];
let startedAt = 0;

function evolvable(): string[] {
  const run = getState().run; const b = run?.battle; if (!run || !b) return [];
  return b.hand.filter((u) => { const c = run.deck.find((x) => x.uid === u)!; return !c.frozen && !c.faceDown && c.ability !== 'fossil' && viewCard(c).sp.evolvesTo.length > 0; });
}
const api = {
  evolvable,
  run: () => getState().run,
  bestPlay,
  setSpeed: (speed: 1 | 2 | 4) => updateSettings({ speed }),
  async startAudio(): Promise<number> {
    await audio.init();
    const stream = captureStream();
    if (!stream) return 0;
    chunks = [];
    recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 192000 });
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    recorder.start(1000);
    startedAt = Date.now();
    return startedAt;
  },
  async stopAudio(): Promise<{ startedAt: number; b64: string }> {
    const r = recorder;
    if (!r) return { startedAt: 0, b64: '' };
    await new Promise<void>((res) => { r.onstop = () => res(); r.stop(); });
    const buf = new Uint8Array(await new Blob(chunks).arrayBuffer());
    let bin = '';
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return { startedAt, b64: btoa(bin) };
  },
  playMusic: (name: Parameters<typeof audio.playMusic>[0]) => audio.playMusic(name, { restart: true, fade: 0 }),
  setVolumes: (music: number, sfx: number) => { audio.setMusicVolume(music); audio.setSfxVolume(sfx); },
};
(window as unknown as { __pk: typeof api }).__pk = api;
export {};
