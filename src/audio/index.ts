// Public audio facade: a singleton that is safe to call before init() or
// when the Web Audio API is unavailable (every method becomes a no-op).
import { Player, Synth } from './synth';
import { SONGS, type SongName } from './music';
import { SFX, type SfxName, type SfxOpts } from './sfx';

export type { SongName } from './music';
export type { SfxName, SfxOpts } from './sfx';

export interface PlayMusicOpts {
  /** Crossfade time in seconds (default 0.6). */
  fade?: number;
  /** Restart even if this song is already playing. */
  restart?: boolean;
}

interface Settings {
  music: number;
  sfx: number;
  muted: boolean;
}

interface Current {
  name: SongName;
  player: Player;
  gain: GainNode;
}

const STORAGE_KEY = 'pocketaces.audio';
const DEFAULTS: Settings = { music: 0.7, sfx: 0.8, muted: false };
const MUSIC_TRIM = 0.55;
const SFX_TRIM = 0.8;

const clamp01 = (v: number): number => Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0));

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return { ...DEFAULTS };
    const s = parsed as Partial<Record<keyof Settings, unknown>>;
    return {
      music: typeof s.music === 'number' ? clamp01(s.music) : DEFAULTS.music,
      sfx: typeof s.sfx === 'number' ? clamp01(s.sfx) : DEFAULTS.sfx,
      muted: s.muted === true,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // Storage unavailable (private mode, quota); settings stay in memory.
  }
}

class AudioSystem {
  private readonly synth = new Synth();
  private settings = loadSettings();
  private current: Current | null = null;
  private initPromise: Promise<void> | null = null;

  /** Creates/resumes the AudioContext. Call from a user gesture; safe to repeat. */
  init(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.synth
        .init()
        .then((running) => {
          this.applyVolumes();
          if (!running) this.initPromise = null;
        })
        .catch(() => {
          this.initPromise = null;
        });
    }
    return this.initPromise;
  }

  playMusic(name: SongName, opts: PlayMusicOpts = {}): void {
    if (!this.synth.ready) return;
    if (this.current?.name === name && this.current.player.playing && !opts.restart) return;
    const fade = opts.fade ?? 0.6;
    const gain = this.synth.createMusicChannel();
    if (!gain) return;
    this.fadeOut(this.current, fade);
    const now = this.synth.now;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + (this.current ? fade : 0.05));
    const player = new Player(this.synth, SONGS[name], gain, () => this.onSongEnd(name));
    this.current = { name, player, gain };
    player.start();
  }

  stopMusic(fade = 0.5): void {
    this.fadeOut(this.current, fade);
    this.current = null;
  }

  sfx(name: SfxName, opts: SfxOpts = {}): void {
    const out = this.synth.sfxBus;
    if (!this.synth.ready || !out) return;
    const volume = opts.volume ?? 1;
    const start = this.synth.now;
    for (const v of SFX[name](opts)) {
      this.synth.play({ ...v, time: start + (v.at ?? 0), vel: (v.vel ?? 0.8) * volume, out });
    }
  }

  setMusicVolume(v: number): void {
    this.settings.music = clamp01(v);
    this.commit();
  }

  setSfxVolume(v: number): void {
    this.settings.sfx = clamp01(v);
    this.commit();
  }

  setMuted(muted: boolean): void {
    this.settings.muted = muted;
    this.commit();
  }

  isMuted(): boolean {
    return this.settings.muted;
  }

  getMusicVolume(): number {
    return this.settings.music;
  }

  getSfxVolume(): number {
    return this.settings.sfx;
  }

  /** Name of the song currently playing, if any. */
  get currentSong(): SongName | null {
    return this.current?.name ?? null;
  }

  private commit(): void {
    saveSettings(this.settings);
    this.applyVolumes();
  }

  private applyVolumes(): void {
    const { masterBus, musicBus, sfxBus } = this.synth;
    if (!masterBus || !musicBus || !sfxBus) return;
    const now = this.synth.now;
    masterBus.gain.setTargetAtTime(this.settings.muted ? 0 : 1, now, 0.02);
    musicBus.gain.setTargetAtTime(this.settings.music * MUSIC_TRIM, now, 0.02);
    sfxBus.gain.setTargetAtTime(this.settings.sfx * SFX_TRIM, now, 0.02);
  }

  private fadeOut(cur: Current | null, fade: number): void {
    if (!cur) return;
    const now = this.synth.now;
    const g = cur.gain.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + Math.max(fade, 0.02));
    setTimeout(() => {
      cur.player.stop();
      cur.gain.disconnect();
    }, fade * 1000 + 100);
  }

  private onSongEnd(name: SongName): void {
    if (this.current?.name !== name || this.current.player.playing) return;
    this.current.gain.disconnect();
    this.current = null;
  }
}

export const audio = new AudioSystem();
/** Dev/recording only: a MediaStream tapped off the master bus. */
export function captureStream(): MediaStream | null {
  const master = (audio as unknown as { synth: Synth }).synth.masterBus;
  if (!master) return null;
  const dest = (master.context as AudioContext).createMediaStreamDestination();
  master.connect(dest);
  return dest.stream;
}
export default audio;
