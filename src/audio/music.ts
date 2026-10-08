// Song format plus original chiptune compositions.
//
// Grid notation (one token per 16th step, `|` and newlines ignored):
//   C4 F#3 Bb2  note on       -  hold previous   .  rest
//   suffix !  accent (vel 1)  ~  soft (vel 0.5)
//   noise:  x hat   o open hat   s snare   k kick   c crash
import type { ADSR, Duty, Vibrato } from './synth';

export type NoiseKey = 'x' | 'o' | 's' | 'k' | 'c';

export interface Note {
  step: number;
  dur: number;
  note: number | NoiseKey;
  vel?: number;
}

export interface Track {
  notes: Note[];
  duty?: Duty;
  vol?: number;
  env?: Partial<ADSR>;
  vibrato?: Vibrato;
}

export interface Song {
  bpm: number;
  /** Length in 16th steps. */
  steps: number;
  loop: boolean;
  /** Delay of the upbeat 8th as a fraction of a 16th step (0.67 = triplet swing). */
  swing?: number;
  channels: { pulse1?: Track; pulse2?: Track; triangle?: Track; noise?: Track };
}

export interface Phrase {
  notes: Note[];
  len: number;
}

export type SongName = 'title' | 'battle' | 'boss' | 'shop' | 'league' | 'victory' | 'gameover' | 'win';

// ---------------------------------------------------------------------------
// Notation helpers

const SEMI: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const TOKEN = /^([A-G])([#b]?)(\d)([!~]?)$/;
const DRUM = /^([xoskc])([!~]?)$/;
const VEL: Record<string, number> = { '': 0.8, '!': 1, '~': 0.5 };

export function midi(name: string): number {
  const m = TOKEN.exec(name);
  if (!m) throw new Error(`Bad note: ${name}`);
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return 12 * (Number(m[3]) + 1) + SEMI[m[1]] + acc;
}

function parseTok(tok: string): { note: number | NoiseKey; vel: number } | null {
  const d = DRUM.exec(tok);
  if (d) return { note: d[1] as NoiseKey, vel: VEL[d[2]] };
  const m = TOKEN.exec(tok);
  if (!m) return null;
  return { note: midi(tok.slice(0, tok.length - m[4].length)), vel: VEL[m[4]] };
}

/** Parses grid notation into a Phrase. */
export function p(src: string): Phrase {
  const toks = src.split(/\s+/).filter((t) => t !== '' && t !== '|');
  const notes: Note[] = [];
  let last: Note | null = null;
  toks.forEach((tok, step) => {
    if (tok === '-') {
      if (last) last.dur += 1;
      return;
    }
    if (tok === '.') {
      last = null;
      return;
    }
    const parsed = parseTok(tok);
    if (!parsed) throw new Error(`Bad token "${tok}"`);
    last = { step, dur: 1, note: parsed.note, vel: parsed.vel };
    notes.push(last);
  });
  return { notes, len: toks.length };
}

export function seq(...parts: Phrase[]): Phrase {
  const notes: Note[] = [];
  let len = 0;
  for (const ph of parts) {
    for (const n of ph.notes) notes.push({ ...n, step: n.step + len });
    len += ph.len;
  }
  return { notes, len };
}

export const rep = (ph: Phrase, n: number): Phrase => seq(...Array.from({ length: n }, () => ph));

/** Truncates a phrase to its first `len` steps. */
export const cut = (ph: Phrase, len: number): Phrase => ({ len, notes: ph.notes.filter((n) => n.step < len) });

export function tr(ph: Phrase, semis: number): Phrase {
  return { len: ph.len, notes: ph.notes.map((n) => (typeof n.note === 'number' ? { ...n, note: n.note + semis } : { ...n })) };
}

/** One bar cycling through `names`, one note every `stepLen` steps. */
export function arp(names: string, stepLen: number, vel = 0.6, len = 16): Phrase {
  const ns = names.split(/\s+/).filter(Boolean).map(midi);
  const notes: Note[] = [];
  for (let s = 0, i = 0; s < len; s += stepLen, i++) notes.push({ step: s, dur: stepLen, note: ns[i % ns.length], vel });
  return { notes, len };
}

function bassBar(root: string, offsets: number[], vel: number): Phrase {
  const r = midi(root);
  return { len: 16, notes: offsets.map((o, i) => ({ step: i * 2, dur: 1, note: r + o, vel: i % 2 === 0 ? vel : vel * 0.8 })) };
}

/** Bouncy GB bassline: root/octave with a fifth on the last beat. */
export const bounce = (root: string): Phrase => bassBar(root, [0, 0, 12, 0, 0, 12, 7, 12], 0.9);
/** Driving straight 8ths with octave pops. */
export const drive = (root: string): Phrase => bassBar(root, [0, 0, 12, 0, 0, 12, 0, 12], 0.95);

/** Walking bass: four quarter notes. */
export function walk(names: string): Phrase {
  return { len: 16, notes: names.split(/\s+/).map((n, i) => ({ step: i * 4, dur: 3, note: midi(n), vel: 0.9 })) };
}

/** Off-beat chord stabs on the upbeat 8ths. */
export function comp(names: string): Phrase {
  return { len: 16, notes: names.split(/\s+/).map((n, i) => ({ step: i * 4 + 2, dur: 1, note: midi(n), vel: 0.55 })) };
}

/** Tremolo: 16 soft 16ths on one note. */
export const trem = (name: string, vel = 0.35): Phrase => arp(name, 1, vel);

export const tk = (ph: Phrase, opts: Omit<Track, 'notes'> = {}): Track => ({ notes: ph.notes, ...opts });

const LEAD_VIB: Vibrato = { rate: 6, depth: 12 };
const BEAT = p('k . x . s . x . k . x . s . x x');
const BEAT_OPEN = p('k . x . s . x o k . x . s . x x');
const FILL = p('k . x . s . x . s . s . s s s s');
const BLOCK8 = seq(rep(BEAT, 3), FILL, rep(BEAT, 3), FILL);

// ---------------------------------------------------------------------------
// Songs

function title(): Song {
  const a = p(`
    C4 - E4 - G4 - - - E4 - G4 - C5 - - - | B4 - - - - - - - G4 - A4 - B4 - - -
    C5 - - - B4 - A4 - E4 - - - - - G4 - | F4 - G4 - A4 - - - G4 - F4 - E4 - D4 -
    C4 - E4 - G4 - - - E4 - G4 - C5 - - - | D5 - - - - - - - B4 - C5 - D5 - - -
    E5 - - - D5 - C5 - A4 - - - C5 - - - | B4 - - - - - - - D5 - - - - - . .`);
  const b = p(`
    A4 - - - C5 - E5 - - - D5 - C5 - - - | A4 - C5 - D5 - - - C5 - A4 - F4 - - -
    G4 - - - - - E4 - G4 - - - C5 - - - | B4 - - - D5 - B4 - G4 - - - - - - -
    A4 - - - C5 - E5 - - - F5 - E5 - - - | D5 - - - C5 - A4 - F4 - - - A4 - - -
    G4 - - - B4 - D5 - G5 - - - F5 - D5 - | B4 - - - - - - - G4 - - - - - . .`);
  const c = p(`
    F4 - A4 - C5 - - - D5 - C5 - A4 - - - | G4 - B4 - D5 - - - E5 - D5 - B4 - - -
    E5 - - - - - D5 - B4 - - - G4 - - - | A4 - - - B4 - C5 - E5 - - - - - - -
    F5 - - - E5 - D5 - C5 - - - A4 - - - | G4 - - - A4 - B4 - D5 - - - B4 - - -
    C5 - - - - - - - - - - - - - - - | . . . . . . . . G4 - A4 - B4 - - -`);
  const C = 'E3 G3 C4 G3', G = 'D3 G3 B3 G3', Am = 'E3 A3 C4 A3', F = 'F3 A3 C4 A3', Em = 'E3 G3 B3 G3';
  const arps = (chords: string[]) => seq(...chords.map((ch) => arp(ch, 2, 0.5)));
  const harmA = arps([C, G, Am, F, C, G, F, G]);
  const roots = (rs: string) => seq(...rs.split(' ').map(bounce));
  return {
    bpm: 110,
    steps: 512,
    loop: true,
    channels: {
      pulse1: tk(seq(a, b, tr(a, 12), c), { duty: 0.5, vol: 0.85, vibrato: LEAD_VIB }),
      pulse2: tk(seq(harmA, arps([Am, F, C, G, Am, F, G, G]), a, arps([F, G, Em, Am, F, G, C, G])), { duty: 0.25, vol: 0.6 }),
      triangle: tk(seq(roots('C2 G2 A2 F2 C2 G2 F2 G2'), roots('A2 F2 C2 G2 A2 F2 G2 G2'), roots('C2 G2 A2 F2 C2 G2 F2 G2'), roots('F2 G2 E2 A2 F2 G2 C2 G2'))),
      noise: tk(seq(rep(p('x . x . x . x . x . x . x . x x'), 8), BLOCK8, BLOCK8, BLOCK8), { vol: 0.8 }),
    },
  };
}

function battle(): Song {
  const a1 = p(`
    A4 - - - E4 - A4 - C5 - - - B4 - A4 - | G4 - - - E4 - - - . . A4 - B4 - C5 -
    D5 - - - C5 - D5 - F5 - - - E5 - D5 - | B4 - - - - - - - G4 - A4 - B4 - D5 -`);
  const a2 = p(`
    E5 - - - - - D5 - C5 - - - B4 - A4 - | C5 - - - B4 - A4 - G4 - - - E4 - - -
    F4 - A4 - C5 - A4 - D5 - - - C5 - B4 - | G#4 - - - - - - - B4 - - - E5 - - -`);
  const a3 = p(`
    A4 - C5 - E5 - - - A5 - - - G5 - E5 - | F5 - - - E5 - D5 - C5 - - - B4 - - -
    D5 - - - C5 - B4 - A4 - - - C5 - D5 - | E5 - - - - - - - G#4 - B4 - E5 - - -`);
  const b1 = p(`
    E5 - - - G5 - - - E5 - D5 - C5 - - - | D5 - - - - - - - B4 - D5 - G5 - - -
    A5 - - - G5 - F5 - E5 - - - C5 - - - | D5 - - - E5 - D5 - B4 - - - G4 - - -
    E5 - - - G5 - - - E5 - D5 - C5 - - - | D5 - - - - - - - G5 - - - B5 - - -
    A5 - - - - - G5 - F5 - - - E5 - - - | E5 - - - D#5 - E5 - G#5 - - - B4 - - -`);
  const b2 = p(`
    C5 - E5 - G5 - - - A5 - G5 - E5 - - - | D5 - G5 - B5 - - - A5 - G5 - D5 - - -
    F5 - - - A5 - - - G5 - F5 - E5 - D5 - | E5 - - - - - - - D5 - - - B4 - - -
    C5 - E5 - G5 - - - C6 - - - B5 - G5 - | A5 - - - G5 - E5 - D5 - - - E5 - - -
    F5 - - - - - E5 - D5 - - - C5 - - - | B4 - - - - - - - G#4 - - - E4 - - -`);
  const Am = 'A3 C4 E4 C4', F = 'F3 A3 C4 A3', G = 'G3 B3 D4 B3', E = 'E3 G#3 B3 G#3', C = 'C4 E4 G4 E4';
  const arps = (chords: string[], len: number) => seq(...chords.map((ch) => arp(ch, len, 0.5)));
  const minorA = arps([Am, Am, F, G, Am, Am, F, E], 1);
  const majorB = arps([C, G, F, G, C, G, F, E], 2);
  const roots = (rs: string) => seq(...rs.split(' ').map(drive));
  const bassA = roots('A2 A2 F2 G2 A2 A2 F2 E2');
  const bassB = roots('C3 G2 F2 G2 C3 G2 F2 E2');
  const drumsB = seq(rep(BEAT_OPEN, 3), FILL, rep(BEAT_OPEN, 3), FILL);
  return {
    bpm: 156,
    steps: 512,
    loop: true,
    channels: {
      pulse1: tk(seq(a1, a2, b1, a1, a3, b2), { duty: 0.5, vol: 0.85, vibrato: LEAD_VIB }),
      pulse2: tk(seq(minorA, majorB, minorA, majorB), { duty: 0.25, vol: 0.5, env: { d: 0.05, s: 0.4, r: 0.03 } }),
      triangle: tk(seq(bassA, bassB, bassA, bassB)),
      noise: tk(seq(BLOCK8, drumsB, BLOCK8, drumsB), { vol: 0.9 }),
    },
  };
}

function boss(): Song {
  const r1 = p('E2 - . E2 - . E3 . G2 - A#2 - A2 - F2 -');
  const r2 = p('E2 - . E2 - . E3 . G2 - A#2 - B2 - C3 B2');
  const riff = seq(r1, r2);
  const m1 = p(`
    . . . . . . . . . . . . . . . . | . . . . . . . . . . . . B4 - D5 -
    E5 - - - - - - - D5 - B4 - G4 - - - | A#4 - - - A4 - G4 - E4 - - - - - - -
    E5 - - - - - - - G5 - - - F#5 - E5 - | D5 - - - E5 - D5 - B4 - - - - - - -
    G4 - A#4 - B4 - - - D5 - - - B4 - A#4 - | A4 - - - - - - - E4 - - - - - - -`);
  const hook = p(`E5 - - - - - - - D5 - B4 - G4 - - - | A#4 - - - A4 - G4 - E4 - - - - - - -`);
  const m2 = seq(tr(hook, 3), tr(hook, 3), tr(hook, 5),
    p(`C5 - D5 - E5 - F5 - G5 - - - F#5 - - - | B4 - - - - - - - D#5 - - - F#5 - - -`));
  const stabs = p('E4 - . E4 - . E4 . . . . . . . . . | E4 - . E4 - . E4 . . . . . . . . .');
  const tension = seq(trem('B4'), trem('B4'), trem('C5'), trem('B4'));
  const drums = p('k . x k s . x . k k x . s . x o');
  const drumsFill = p('k . x k s . x . s s . s s s s c');
  return {
    bpm: 140,
    steps: 256,
    loop: true,
    channels: {
      pulse1: tk(seq(m1, m2), { duty: 0.5, vol: 0.85, vibrato: { rate: 5.5, depth: 20 } }),
      pulse2: tk(seq(rep(stabs, 4), rep(tension, 2)), { duty: 0.125, vol: 0.55, env: { d: 0.04, s: 0.5, r: 0.02 } }),
      triangle: tk(seq(rep(riff, 4), rep(tr(riff, 3), 2), tr(riff, 5),
        p('C3 - - - C3 - - - B2 - - - B2 - - - | B2 - - - - - - - B2 B2 B2 B2 B2 - - -')), { vol: 1 }),
      noise: tk(rep(seq(rep(drums, 3), drumsFill), 4), { vol: 0.9 }),
    },
  };
}

function shop(): Song {
  const mel = p(`
    A4 - C5 - A4 - F4 - G4 - - - . . A4 - | F4 - - - D4 - F4 - A4 - - - . . G4 -
    A#4 - A4 - G4 - F4 - D4 - - - . . G4 - | E4 - - - G4 - A#4 - C5 - - - . . . .
    A4 - C5 - A4 - F4 - G4 - - - A4 - C5 - | D5 - - - C5 - A4 - F4 - - - . . A4 -
    A#4 - C5 - D5 - - - C5 - A#4 - G4 - E4 - | F4 - - - - - - - . . . . . . C5 -
    D5 - - - D5 - F5 - D5 - C5 - A#4 - - - | C#5 - - - - - C5 - A#4 - G#4 - F4 - - -
    A4 - C5 - F5 - - - E5 - C5 - A4 - - - | F#4 - A4 - C5 - - - D5 - C5 - A4 - - -
    A#4 - - - D5 - - - F5 - - - D5 - - - | E5 - - - C5 - - - G4 - - - A#4 - - -
    A4 - - - - - - - . . . . . . . . | . . . . . . . . . . . . C5 - E5 -`);
  const F = 'A3 C4 E4 C4', Dm = 'F3 A3 C4 A3', Gm = 'A#3 D4 F4 D4', C7 = 'E3 G3 A#3 G3';
  const Bb = 'D4 F4 A#3 F4', Bbm = 'C#4 F4 A#3 F4', D7 = 'F#3 A3 C4 A3';
  const comps = seq(...[F, Dm, Gm, C7, F, Dm, Gm, F, Bb, Bbm, F, D7, Gm, C7, F, C7].map(comp));
  const bass = seq(...[
    'F2 A2 C3 E3', 'D3 C3 A2 F2', 'G2 A#2 D3 F3', 'C3 A#2 G2 E2',
    'F2 A2 C3 E3', 'D3 C3 A2 F2', 'G2 A#2 C3 E3', 'F2 A2 C3 D3',
    'A#2 D3 F3 G3', 'A#2 C#3 F3 G#3', 'A2 C3 F3 E3', 'D3 C3 A2 F#2',
    'G2 A#2 D3 A#2', 'C3 E3 G2 A#2', 'F2 A2 C3 D3', 'C3 E3 G2 A#2',
  ].map(walk));
  return {
    bpm: 120,
    steps: 256,
    loop: true,
    swing: 0.6,
    channels: {
      pulse1: tk(mel, { duty: 0.25, vol: 0.8, env: { d: 0.1, s: 0.5, r: 0.08 }, vibrato: { rate: 5, depth: 10 } }),
      pulse2: tk(comps, { duty: 0.125, vol: 0.55, env: { d: 0.06, s: 0.3, r: 0.04 } }),
      triangle: tk(bass, { vol: 1 }),
      noise: tk(rep(p('k . x . x . x . k . x . s . x .'), 16), { vol: 0.6 }),
    },
  };
}

function league(): Song {
  const a1 = p(`
    D5 - - - - - - - A4 - - - D5 - F5 - | A5 - - - - - G5 - F5 - - - D5 - - -
    C5 - - - - - A4 - C5 - - - F5 - - - | E5 - - - D5 - E5 - G5 - - - E5 - C5 -
    D5 - - - - - - - A4 - - - D5 - F5 - | A5 - - - - - A#5 - A5 - - - F5 - - -
    G5 - - - A#5 - G5 - D5 - - - F5 - G5 - | A5 - - - - - - - C#5 - E5 - A5 - - -`);
  const a2 = p(`
    F5 - D5 - A5 - - - D6 - - - C6 - A5 - | A#5 - - - A5 - G5 - F5 - - - D5 - - -
    F5 - - - E5 - F5 - A5 - - - C6 - - - | G5 - - - E5 - C5 - E5 - - - G5 - - -
    A5 - - - F5 - D5 - A5 - - - D6 - - - | A#5 - - - - - A5 - F5 - - - D5 - F5 -
    G5 - A#5 - D6 - - - A#5 - - - G5 - - - | A5 - - - - - - - E5 - - - C#5 - - -`);
  const turn = p(`A4 - C#5 - E5 - G5 - A5 - - - G5 - E5 - | C#5 - E5 - A5 - - - - - - - - - - -`);
  const Dm = 'D4 F4 A4 D5 F5 D5 A4 F4', Bb = 'A#3 D4 F4 A#4 D5 A#4 F4 D4', F = 'F3 A3 C4 F4 A4 F4 C4 A3';
  const C = 'C4 E4 G4 C5 E5 C5 G4 E4', Gm = 'G3 A#3 D4 G4 A#4 G4 D4 A#3', A = 'A3 C#4 E4 A4 C#5 A4 E4 C#4';
  const arps = seq(...[Dm, Bb, F, C, Dm, Bb, Gm, A].map((ch) => arp(ch, 1, 0.5)));
  const bass = seq(...'D2 A#2 F2 C3 D2 A#2 G2 A2'.split(' ').map(drive));
  const sectionLead = seq(a1, a2);
  const sectionArps = rep(arps, 2);
  const sectionBass = rep(bass, 2);
  const drums = seq(p('c . x . s . x . k . x . s . x x'), rep(BEAT, 2), FILL, rep(BEAT_OPEN, 3), FILL);
  return {
    bpm: 170,
    steps: 512,
    loop: true,
    channels: {
      pulse1: tk(seq(sectionLead, tr(cut(sectionLead, 224), 2), turn), { duty: 0.5, vol: 0.85, vibrato: LEAD_VIB }),
      pulse2: tk(seq(sectionArps, tr(cut(sectionArps, 224), 2), rep(arp(A, 1, 0.5), 2)), { duty: 0.25, vol: 0.5 }),
      triangle: tk(seq(sectionBass, tr(cut(sectionBass, 224), 2), rep(drive('A2'), 2))),
      noise: tk(rep(drums, 4), { vol: 0.9 }),
    },
  };
}

function victory(): Song {
  const lead = p(`
    G4 - . G4 - . G4 - . G4 - - E4 - - - | F4 - . F4 - . F4 - . F4 - - D4 - - -
    G4 - . G4 - . G4 - . C5 - - E5 - - - | D5 - - - - - - - . . . . G4 - B4 -
    C5 - - - E5 - - - G5 - - - - - - - | A5 - - - G5 - - - E5 - - - C5 - - -
    D5 - - - E5 - - - F5 - - - G5 - - - | C6 - - - - - - - - - - - - - - -`);
  const harm = p(`
    E4 - . E4 - . E4 - . E4 - - C4 - - - | D4 - . D4 - . D4 - . D4 - - B3 - - -
    E4 - . E4 - . E4 - . E4 - - G4 - - - | B4 - - - - - - - . . . . E4 - G4 -
    G4 - - - C5 - - - E5 - - - - - - - | F5 - - - E5 - - - C5 - - - G4 - - -
    B4 - - - C5 - - - D5 - - - B4 - - - | E5 - - - - - - - - - - - - - - -`);
  const bass = p(`
    C2 - - - C2 - - - C2 - - - C2 - - - | F2 - - - F2 - - - F2 - - - F2 - - -
    C2 - - - C2 - - - C2 - - - C2 - - - | G2 - - - G2 - - - G2 - - - G2 - - -
    C2 - - - E2 - - - G2 - - - C3 - - - | F2 - - - F2 - - - C3 - - - C3 - - -
    G2 - - - G2 - - - G2 - - - G2 - - - | C2 - - - - - - - - - - - - - - -`);
  return {
    bpm: 140,
    steps: 128,
    loop: false,
    channels: {
      pulse1: tk(lead, { duty: 0.5, vol: 0.9, vibrato: LEAD_VIB }),
      pulse2: tk(harm, { duty: 0.25, vol: 0.6 }),
      triangle: tk(bass),
      noise: tk(seq(rep(BEAT, 7), p('c . . . . . . . . . . . . . . .')), { vol: 0.8 }),
    },
  };
}

function gameover(): Song {
  return {
    bpm: 90,
    steps: 64,
    loop: false,
    channels: {
      pulse1: tk(p(`E5 - - - - - - - D5 - - - C5 - - - | B4 - - - - - - - A#4 - - - A4 - - -
                    G#4 - - - - - - - - - - - - - - - | A4 - - - - - - - - - - - - - - -`),
        { duty: 0.5, vol: 0.8, vibrato: { rate: 5, depth: 25 }, env: { d: 0.3, s: 0.6, r: 0.4 } }),
      pulse2: tk(p(`C5 - - - - - - - B4 - - - A4 - - - | G#4 - - - - - - - G4 - - - F4 - - -
                    E4 - - - - - - - - - - - - - - - | C4 - - - - - - - - - - - - - - -`),
        { duty: 0.25, vol: 0.5, env: { d: 0.3, s: 0.6, r: 0.4 } }),
      triangle: tk(p(`A2 - - - - - - - - - - - - - - - | F2 - - - - - - - - - - - - - - -
                      E2 - - - - - - - - - - - - - - - | A1 - - - - - - - - - - - - - - -`),
        { env: { d: 0.5, s: 0.7, r: 0.5 } }),
      noise: tk(p('c~ . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . . | c~ . . . . . . . . . . . . . . .')),
    },
  };
}

function win(): Song {
  const lead = p(`
    D5 - - - G5 - - - B5 - - - A5 - G5 - | F#5 - - - - - - - D5 - - - E5 - F#5 -
    G5 - - - - - E5 - B4 - - - D5 - E5 - | C5 - - - D5 - E5 - G5 - - - - - - -
    D5 - - - G5 - - - B5 - - - A5 - G5 - | A5 - - - - - - - F#5 - - - D5 - - -
    E5 - - - G5 - - - C6 - - - B5 - A5 - | A5 - - - - - - - F#5 - - - D5 - - -
    B5 - - - - - - - G5 - - - D5 - G5 - | D#5 - - - F#5 - - - A5 - - - F#5 - - -
    E5 - - - G5 - B5 - E6 - - - D6 - B5 - | C6 - - - B5 - A5 - G5 - - - E5 - - -
    D5 - - - G5 - - - B5 - - - D6 - - - | A5 - - - - - - - F#5 - - - A5 - - -
    C6 - - - B5 - - - A5 - - - F#5 - - - | G5 - - - - - - - - - - - . . . .`);
  const G = 'D4 G4 B4 G4', D = 'D4 F#4 A4 F#4', Em = 'E4 G4 B4 G4', C = 'E4 G4 C5 G4', B7 = 'D#4 F#4 B4 F#4';
  const CD = 'E4 G4 C5 G4 D4 F#4 A4 F#4';
  const harm = seq(...[G, D, Em, C, G, D, C, D, G, B7, Em, C, G, D, CD, G].map((ch) => arp(ch, 2, 0.5)));
  const bass = seq(...'G2 D2 E2 C2 G2 D2 C2 D2 G2 B2 E2 C2 G2 D2'.split(' ').map(bounce),
    p('C2 . C3 . C2 . C3 . D2 . D3 . D2 . D3 .'), bounce('G2'));
  return {
    bpm: 120,
    steps: 256,
    loop: true,
    channels: {
      pulse1: tk(lead, { duty: 0.5, vol: 0.85, vibrato: LEAD_VIB }),
      pulse2: tk(harm, { duty: 0.25, vol: 0.55 }),
      triangle: tk(bass),
      noise: tk(rep(BLOCK8, 2), { vol: 0.8 }),
    },
  };
}

export const SONGS: Record<SongName, Song> = {
  title: title(),
  battle: battle(),
  boss: boss(),
  shop: shop(),
  league: league(),
  victory: victory(),
  gameover: gameover(),
  win: win(),
};
