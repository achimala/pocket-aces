// Synthesized sound effects. Each entry returns a list of voices to fire
// (with an optional `at` offset in seconds) so the facade can place them.
import { midiToFreq, type ADSR, type VoiceSpec } from './synth';

export type SfxName =
  | 'click' | 'hover' | 'cardSelect' | 'cardDeselect' | 'cardDraw' | 'cardPlay' | 'cardDiscard'
  | 'chip' | 'mult' | 'xmult' | 'tally' | 'damage' | 'superEffective' | 'evolve' | 'faint'
  | 'cash' | 'buy' | 'sell' | 'reroll' | 'levelUp' | 'boss' | 'win' | 'lose'
  | 'whoosh' | 'pop' | 'error' | 'shiny';

export interface SfxOpts {
  /** For `chip`: 0..n, raises pitch per chip. */
  index?: number;
  /** For `tally`: 0..1 progress, raises pitch. */
  t?: number;
  /** Multiplier on the effect's own level. */
  volume?: number;
}

export type SfxVoice = VoiceSpec & { at?: number };
export type SfxDef = (o: SfxOpts) => SfxVoice[];

type Extra = Partial<SfxVoice>;
const pulse = (freq: number, dur: number, x: Extra = {}): SfxVoice => ({ wave: 'pulse', duty: 0.5, freq, dur, ...x });
const tri = (freq: number, dur: number, x: Extra = {}): SfxVoice => ({ wave: 'triangle', freq, dur, ...x });
const noise = (dur: number, x: Extra = {}): SfxVoice => ({ wave: 'noise', noiseMode: 'short', dur, ...x });
const PLUCK: Partial<ADSR> = { d: 0.05, s: 0.3, r: 0.04 };
const HOLD: Partial<ADSR> = { d: 0.15, s: 0.5, r: 0.2 };
const f = midiToFreq;

/** A sequence of pulse notes, `gap` seconds apart. */
function run(notes: number[], gap: number, dur: number, x: Extra = {}): SfxVoice[] {
  return notes.map((m, i) => pulse(f(m), dur, { at: i * gap, ...x }));
}

const coin = (lo: number, hi: number, at = 0): SfxVoice[] => [
  pulse(f(lo), 0.06, { at, duty: 0.125, vel: 0.55, env: PLUCK }),
  pulse(f(hi), 0.28, { at: at + 0.06, duty: 0.125, vel: 0.55, env: { d: 0.18, s: 0.35, r: 0.1 } }),
];

export const SFX: Record<SfxName, SfxDef> = {
  click: () => [pulse(1100, 0.03, { vel: 0.45, env: PLUCK })],
  hover: () => [tri(1500, 0.02, { vel: 0.12, env: PLUCK })],
  cardSelect: () => [pulse(520, 0.07, { slideTo: 1040, slideTime: 0.05, duty: 0.25, vel: 0.5, env: PLUCK })],
  cardDeselect: () => [pulse(900, 0.07, { slideTo: 450, slideTime: 0.05, duty: 0.25, vel: 0.4, env: PLUCK })],
  cardDraw: () => [
    noise(0.08, { filter: { type: 'bandpass', freq: 1200, to: 7000, q: 1 }, env: { d: 0.08 }, vel: 0.5 }),
    tri(300, 0.06, { slideTo: 900, vel: 0.25, env: PLUCK }),
  ],
  cardPlay: () => [noise(0.03, { vel: 0.6 }), pulse(700, 0.05, { slideTo: 350, duty: 0.125, vel: 0.6, env: PLUCK })],
  cardDiscard: () => [
    noise(0.12, { noiseMode: 'long', filter: { type: 'lowpass', freq: 2500, to: 300 }, vel: 0.45 }),
    tri(380, 0.1, { slideTo: 160, vel: 0.35, env: PLUCK }),
  ],
  chip: ({ index = 0 }) => {
    const m = 76 + Math.min(Math.max(index, 0), 24);
    return [pulse(f(m), 0.06, { duty: 0.25, vel: 0.55, env: PLUCK }), pulse(f(m + 12), 0.03, { duty: 0.125, vel: 0.2, env: PLUCK })];
  },
  mult: () => [
    pulse(220, 0.14, { slideTo: 90, slideTime: 0.12, duty: 0.125, vel: 0.8 }),
    tri(110, 0.12, { slideTo: 55, vel: 0.7 }),
    noise(0.05, { noiseMode: 'long', filter: { type: 'lowpass', freq: 1200 }, vel: 0.5 }),
  ],
  xmult: () => [
    pulse(660, 0.3, { slideTo: 110, slideTime: 0.25, vel: 0.9, env: HOLD }),
    pulse(663, 0.3, { slideTo: 111, slideTime: 0.25, duty: 0.25, vel: 0.5, env: HOLD }),
    tri(80, 0.3, { slideTo: 40, vel: 0.8 }),
    noise(0.25, { noiseMode: 'long', vel: 0.6 }),
  ],
  tally: ({ t = 0 }) => [pulse(700 * Math.pow(2, Math.min(Math.max(t, 0), 1) * 1.2), 0.025, { duty: 0.125, vel: 0.35, env: { d: 0.02, s: 0.2, r: 0.02 } })],
  damage: () => [
    tri(220, 0.25, { slideTo: 35, slideTime: 0.2, vel: 0.9 }),
    pulse(180, 0.1, { slideTo: 60, duty: 0.125, vel: 0.5 }),
    noise(0.22, { noiseMode: 'long', filter: { type: 'lowpass', freq: 5000, to: 400 }, vel: 0.7 }),
  ],
  superEffective: () => [
    pulse(880, 0.1, { vel: 0.8, env: PLUCK }),
    noise(0.04, { vel: 0.5 }),
    pulse(1320, 0.16, { at: 0.09, vel: 0.8, vibrato: { rate: 30, depth: 40 }, env: HOLD }),
    noise(0.06, { at: 0.09, noiseMode: 'long', vel: 0.6 }),
  ],
  evolve: () => [
    ...run([72, 76, 79, 84, 88, 91], 0.07, 0.08, { duty: 0.25, vel: 0.6, env: PLUCK }),
    pulse(f(96), 0.6, { at: 0.42, duty: 0.25, vel: 0.6, vibrato: { rate: 7, depth: 30 }, env: { d: 0.1, s: 0.6, r: 0.3 } }),
    noise(0.5, { noiseMode: 'long', filter: { type: 'highpass', freq: 3000, to: 9000 }, env: { a: 0.3, d: 0.2, s: 0, r: 0.2 }, vel: 0.25 }),
  ],
  faint: () => [
    pulse(600, 0.5, { slideTo: 70, slideTime: 0.45, vel: 0.7, vibrato: { rate: 12, depth: 60 }, env: { d: 0.1, s: 0.7, r: 0.1 } }),
    tri(300, 0.5, { slideTo: 35, slideTime: 0.45, vel: 0.5, env: { d: 0.1, s: 0.7, r: 0.1 } }),
  ],
  cash: () => coin(83, 88),
  buy: () => [pulse(500, 0.06, { slideTo: 1000, duty: 0.25, vel: 0.5, env: PLUCK }), ...coin(83, 88, 0.08)],
  sell: () => [pulse(1000, 0.06, { slideTo: 500, duty: 0.25, vel: 0.5, env: PLUCK }), ...coin(79, 84, 0.08)],
  reroll: () => [
    noise(0.02, { vel: 0.5 }),
    noise(0.02, { at: 0.06, vel: 0.5 }),
    noise(0.02, { at: 0.12, vel: 0.5 }),
    tri(400, 0.2, { slideTo: 1200, vel: 0.3 }),
    pulse(f(84), 0.08, { at: 0.18, duty: 0.25, vel: 0.5, env: PLUCK }),
  ],
  levelUp: () => [
    ...run([72, 76], 0.1, 0.1, { duty: 0.25, vel: 0.7, env: PLUCK }),
    pulse(f(79), 0.35, { at: 0.2, duty: 0.25, vel: 0.7, vibrato: { rate: 6, depth: 20 }, env: HOLD }),
  ],
  boss: () => [
    tri(55, 1, { vel: 0.9, env: { a: 0.05, d: 0.3, s: 0.6, r: 0.4 } }),
    pulse(110, 1, { duty: 0.125, vel: 0.5, vibrato: { rate: 5, depth: 25 }, env: { a: 0.1, d: 0.3, s: 0.5, r: 0.4 } }),
    pulse(116.5, 0.8, { duty: 0.125, vel: 0.35, env: { a: 0.1, d: 0.3, s: 0.5, r: 0.4 } }),
    noise(0.8, { noiseMode: 'long', filter: { type: 'lowpass', freq: 600, to: 150 }, env: { a: 0.2, d: 0.4, s: 0, r: 0.3 }, vel: 0.4 }),
  ],
  win: () => [
    ...[72, 76, 79, 84].map((m, i) => pulse(f(m), 0.6, { duty: i % 2 ? 0.25 : 0.5, vel: 0.45, vibrato: { rate: 6, depth: 15 }, env: { d: 0.2, s: 0.5, r: 0.3 } })),
    tri(f(48), 0.6, { vel: 0.7, env: { d: 0.2, s: 0.6, r: 0.3 } }),
    noise(0.08, { vel: 0.4 }),
  ],
  lose: () => [
    ...run([64, 62, 60], 0.15, 0.16, { vel: 0.7, env: HOLD }),
    pulse(f(59), 0.45, { at: 0.45, vel: 0.7, vibrato: { rate: 5, depth: 30 }, env: { d: 0.2, s: 0.6, r: 0.3 } }),
    tri(f(43), 0.5, { at: 0.45, vel: 0.6, env: { d: 0.2, s: 0.6, r: 0.3 } }),
  ],
  whoosh: () => [noise(0.25, { noiseMode: 'long', filter: { type: 'bandpass', freq: 300, to: 5000, q: 1.5 }, env: { a: 0.08, d: 0.15, s: 0, r: 0.05 }, vel: 0.5 })],
  pop: () => [pulse(400, 0.05, { slideTo: 900, slideTime: 0.03, vel: 0.5, env: PLUCK })],
  error: () => [
    pulse(110, 0.18, { duty: 0.125, vel: 0.4, env: { d: 0.05, s: 0.8, r: 0.05 } }),
    pulse(116, 0.18, { duty: 0.125, vel: 0.3, env: { d: 0.05, s: 0.8, r: 0.05 } }),
  ],
  shiny: () => [
    ...run([84, 88, 91, 96], 0.045, 0.06, { duty: 0.125, vel: 0.4, env: PLUCK }),
    pulse(f(100), 0.4, { at: 0.18, duty: 0.125, vel: 0.3, vibrato: { rate: 8, depth: 20 }, env: { d: 0.15, s: 0.4, r: 0.25 } }),
  ],
};
