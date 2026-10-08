// Chiptune synth engine: lazily created AudioContext, pulse/triangle/noise
// voices with ADSR envelopes, and a lookahead sequencer for Song patterns.
import type { NoiseKey, Note, Song, Track } from './music';

export type Duty = 0.125 | 0.25 | 0.5;
export type Wave = 'pulse' | 'triangle' | 'noise';
export type NoiseMode = 'short' | 'long';

export interface ADSR {
  a: number;
  d: number;
  s: number;
  r: number;
}

/** Vibrato: `rate` in Hz, `depth` in cents. */
export interface Vibrato {
  rate: number;
  depth: number;
}

/** Biquad filter in front of the amp. `to` sweeps the cutoff over the note. */
export interface FilterSpec {
  type: BiquadFilterType;
  freq: number;
  to?: number;
  q?: number;
}

export interface VoiceParams {
  wave: Wave;
  /** Absolute AudioContext time at which the note starts. */
  time: number;
  /** Gate length in seconds (release follows). */
  dur: number;
  freq?: number;
  duty?: Duty;
  vel?: number;
  env?: Partial<ADSR>;
  vibrato?: Vibrato;
  slideTo?: number;
  slideTime?: number;
  noiseMode?: NoiseMode;
  filter?: FilterSpec;
  out?: AudioNode;
}

/** A voice description without placement; used by SFX and drum tables. */
export type VoiceSpec = Omit<VoiceParams, 'time' | 'out'>;

export const midiToFreq = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

const LOOKAHEAD = 0.1;
const TICK_MS = 25;
const DUTIES: readonly Duty[] = [0.125, 0.25, 0.5];

const DEFAULT_ENV: Record<Wave, ADSR> = {
  pulse: { a: 0.004, d: 0.08, s: 0.55, r: 0.06 },
  triangle: { a: 0.004, d: 0.04, s: 0.9, r: 0.04 },
  noise: { a: 0.001, d: 0.05, s: 0, r: 0.03 },
};

const NOISE_DEFAULTS: Record<NoiseMode, { filter: FilterSpec; env: Partial<ADSR> }> = {
  short: { filter: { type: 'highpass', freq: 6500 }, env: { d: 0.04 } },
  long: { filter: { type: 'lowpass', freq: 7000 }, env: { d: 0.3 } },
};

function getContextCtor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/** Fourier series of a rectangular pulse with the given duty cycle. */
function makePulseWave(ctx: AudioContext, duty: Duty): PeriodicWave {
  const n = 48;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  for (let k = 1; k < n; k++) {
    real[k] = Math.sin(2 * Math.PI * k * duty) / (Math.PI * k);
    imag[k] = (1 - Math.cos(2 * Math.PI * k * duty)) / (Math.PI * k);
  }
  return ctx.createPeriodicWave(real, imag);
}

function makeNoise(ctx: AudioContext): AudioBuffer {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

/** Schedules an ADSR on `g`; returns the time at which the voice is silent. */
function applyEnvelope(g: AudioParam, t0: number, dur: number, env: ADSR, vel: number): number {
  const peak = Math.max(vel, 0.0001);
  const sus = peak * env.s;
  const aEnd = t0 + env.a;
  const dEnd = aEnd + env.d;
  const gate = Math.max(t0 + dur, aEnd);
  g.setValueAtTime(0, t0);
  g.linearRampToValueAtTime(peak, aEnd);
  if (gate >= dEnd) {
    g.linearRampToValueAtTime(sus, dEnd);
    g.setValueAtTime(sus, gate);
  } else {
    const frac = (gate - aEnd) / Math.max(env.d, 0.0001);
    g.linearRampToValueAtTime(peak - (peak - sus) * frac, gate);
  }
  const end = gate + env.r;
  g.linearRampToValueAtTime(0, end);
  return end + 0.02;
}

export class Synth {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private sfx: GainNode | null = null;
  private pulses = new Map<Duty, PeriodicWave>();
  private noise: AudioBuffer | null = null;

  get ready(): boolean {
    return this.ctx !== null;
  }
  get now(): number {
    return this.ctx?.currentTime ?? 0;
  }
  get masterBus(): GainNode | null {
    return this.master;
  }
  get musicBus(): GainNode | null {
    return this.music;
  }
  get sfxBus(): GainNode | null {
    return this.sfx;
  }

  /** Creates the context on first call and resumes it; returns whether audio is running. */
  async init(): Promise<boolean> {
    const ctx = this.ctx ?? this.create();
    if (!ctx) return false;
    if (ctx.state !== 'running') {
      try {
        await ctx.resume();
      } catch {
        return false;
      }
    }
    return ctx.state === 'running';
  }

  /** A fresh gain node feeding the music bus (one per playing song, for crossfades). */
  createMusicChannel(): GainNode | null {
    if (!this.ctx || !this.music) return null;
    const g = this.ctx.createGain();
    g.connect(this.music);
    return g;
  }

  play(p: VoiceParams): void {
    const ctx = this.ctx;
    const out = p.out ?? this.sfx;
    if (!ctx || !out) return;
    const t0 = Math.max(p.time, ctx.currentTime);
    const nd = p.wave === 'noise' ? NOISE_DEFAULTS[p.noiseMode ?? 'short'] : undefined;
    const env: ADSR = { ...DEFAULT_ENV[p.wave], ...nd?.env, ...p.env };
    const amp = ctx.createGain();
    const end = applyEnvelope(amp.gain, t0, p.dur, env, p.vel ?? 0.8);
    const src = p.wave === 'noise' ? this.noiseSource(ctx) : this.toneSource(ctx, p, t0, end);
    if (!src) return;
    const filter = p.filter ?? nd?.filter;
    const head = filter ? this.filtered(ctx, src, filter, t0, p.dur) : src;
    head.connect(amp);
    amp.connect(out);
    src.start(t0);
    src.stop(end);
  }

  private create(): AudioContext | null {
    const Ctor = getContextCtor();
    if (!Ctor) return null;
    let ctx: AudioContext;
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 12;
    comp.ratio.value = 4;
    comp.attack.value = 0.003;
    comp.release.value = 0.12;
    comp.connect(ctx.destination);
    const master = ctx.createGain();
    master.connect(comp);
    const music = ctx.createGain();
    music.connect(master);
    const sfx = ctx.createGain();
    sfx.connect(master);
    for (const d of DUTIES) this.pulses.set(d, makePulseWave(ctx, d));
    this.noise = makeNoise(ctx);
    this.ctx = ctx;
    this.master = master;
    this.music = music;
    this.sfx = sfx;
    return ctx;
  }

  private toneSource(ctx: AudioContext, p: VoiceParams, t0: number, end: number): OscillatorNode {
    const osc = ctx.createOscillator();
    const wave = p.wave === 'pulse' ? this.pulses.get(p.duty ?? 0.5) : undefined;
    if (wave) osc.setPeriodicWave(wave);
    else osc.type = p.wave === 'pulse' ? 'square' : 'triangle';
    const f = Math.max(p.freq ?? 440, 1);
    osc.frequency.setValueAtTime(f, t0);
    if (p.slideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(p.slideTo, 1), t0 + (p.slideTime ?? p.dur));
    }
    if (p.vibrato) this.addVibrato(ctx, osc, p.vibrato, t0, end);
    return osc;
  }

  private addVibrato(ctx: AudioContext, osc: OscillatorNode, v: Vibrato, t0: number, end: number): void {
    const lfo = ctx.createOscillator();
    lfo.frequency.value = v.rate;
    const depth = ctx.createGain();
    depth.gain.value = v.depth;
    lfo.connect(depth);
    depth.connect(osc.detune);
    lfo.start(t0);
    lfo.stop(end);
  }

  private noiseSource(ctx: AudioContext): AudioBufferSourceNode | null {
    if (!this.noise) return null;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    src.loopStart = Math.random() * 1.5;
    src.loopEnd = src.loopStart + 0.5;
    return src;
  }

  private filtered(ctx: AudioContext, src: AudioNode, f: FilterSpec, t0: number, dur: number): AudioNode {
    const node = ctx.createBiquadFilter();
    node.type = f.type;
    node.Q.value = f.q ?? 0.7;
    node.frequency.setValueAtTime(f.freq, t0);
    if (f.to !== undefined) node.frequency.exponentialRampToValueAtTime(Math.max(f.to, 10), t0 + dur);
    src.connect(node);
    return node;
  }
}

// ---------------------------------------------------------------------------
// Sequencer

export type ChannelKey = keyof Song['channels'];

interface StepEvent {
  key: ChannelKey;
  track: Track;
  note: Note;
}

const DRUMS: Record<NoiseKey, (vel: number) => VoiceSpec[]> = {
  x: (vel) => [{ wave: 'noise', noiseMode: 'short', dur: 0.03, vel: vel * 0.45 }],
  o: (vel) => [{ wave: 'noise', noiseMode: 'short', dur: 0.15, env: { d: 0.2 }, vel: vel * 0.4 }],
  s: (vel) => [
    { wave: 'noise', noiseMode: 'long', dur: 0.08, env: { d: 0.12 }, vel: vel * 0.7, filter: { type: 'bandpass', freq: 2200, q: 0.5 } },
    { wave: 'triangle', freq: 230, slideTo: 120, slideTime: 0.05, dur: 0.05, vel: vel * 0.5 },
  ],
  k: (vel) => [
    { wave: 'triangle', freq: 170, slideTo: 45, slideTime: 0.07, dur: 0.1, env: { d: 0.05, s: 0.8, r: 0.05 }, vel },
    { wave: 'noise', noiseMode: 'long', dur: 0.03, vel: vel * 0.5, filter: { type: 'lowpass', freq: 500 } },
  ],
  c: (vel) => [{ wave: 'noise', noiseMode: 'long', dur: 0.5, env: { d: 0.6 }, vel: vel * 0.6, filter: { type: 'highpass', freq: 3000 } }],
};

function indexSong(song: Song): StepEvent[][] {
  const events: StepEvent[][] = Array.from({ length: song.steps }, () => []);
  for (const key of Object.keys(song.channels) as ChannelKey[]) {
    const track = song.channels[key];
    if (!track) continue;
    for (const note of track.notes) {
      if (note.step >= 0 && note.step < song.steps) events[note.step].push({ key, track, note });
    }
  }
  return events;
}

/** Plays one Song through `out`, scheduling notes 100 ms ahead of the clock. */
export class Player {
  private step = 0;
  private nextTime = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly stepDur: number;
  private readonly events: StepEvent[][];

  constructor(
    private readonly synth: Synth,
    private readonly song: Song,
    private readonly out: AudioNode,
    private readonly onEnd?: () => void,
  ) {
    this.stepDur = 60 / song.bpm / 4;
    this.events = indexSong(song);
  }

  get playing(): boolean {
    return this.timer !== null;
  }

  start(at = this.synth.now + 0.05): void {
    this.stop();
    this.step = 0;
    this.nextTime = at;
    this.timer = setInterval(this.tick, TICK_MS);
    this.tick();
  }

  stop(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }

  private tick = (): void => {
    const horizon = this.synth.now + LOOKAHEAD;
    while (this.timer !== null && this.nextTime < horizon) {
      this.scheduleStep(this.step, this.nextTime);
      this.step += 1;
      this.nextTime += this.stepDur;
      if (this.step >= this.song.steps) {
        if (this.song.loop) this.step = 0;
        else this.finish();
      }
    }
  };

  private finish(): void {
    this.stop();
    const wait = (this.nextTime - this.synth.now + 0.5) * 1000;
    setTimeout(() => this.onEnd?.(), Math.max(0, wait));
  }

  private scheduleStep(i: number, t: number): void {
    const swing = this.song.swing ?? 0;
    const time = i % 4 === 2 ? t + swing * this.stepDur : t;
    for (const ev of this.events[i]) this.trigger(ev, time);
  }

  private trigger(ev: StepEvent, time: number): void {
    const { note, track } = ev;
    const vel = (note.vel ?? 0.8) * (track.vol ?? 1);
    if (typeof note.note === 'string') {
      for (const v of DRUMS[note.note](vel)) this.synth.play({ ...v, time, out: this.out });
      return;
    }
    const wave: Wave = ev.key === 'triangle' ? 'triangle' : 'pulse';
    const duty = track.duty ?? (ev.key === 'pulse1' ? 0.5 : 0.25);
    this.synth.play({
      wave,
      duty,
      freq: midiToFreq(note.note),
      time,
      dur: Math.max(note.dur * this.stepDur - 0.012, 0.02),
      vel,
      env: track.env,
      vibrato: track.vibrato,
      out: this.out,
    });
  }
}
