// A Pip's sprite. Default art gets procedural idle motion (breathing squash-and-stretch anchored at the base,
// a gentle bob and a slight sway) driven by the Pip's motion preset. The three motions animate the separate
// CSS `scale`, `translate` and `rotate` properties, so they compose with any `transform` the parent applies.
// An imported pack with animated sprites plays its own animation instead.
import type { CSSProperties } from 'react';
import { activePack, activeOverlay, Art } from '@/content';
import type { MotionPreset } from '@/content/types';
import { useStore } from '../store';

interface Props {
  id: string;
  back?: boolean;
  shiny?: boolean;
  /** Idle motion on/off (off for tiny thumbnails and grids). */
  idle?: boolean;
  className?: string;
  alt?: string;
  style?: CSSProperties;
}

/** Per-preset base timing (seconds) and amplitudes. Each Pip then varies phase/speed/amplitude by slot. */
const PRESETS: Record<MotionPreset, { breath: number; squash: number; bob: number; bobAmp: number; sway: number; swayAmp: number }> = {
  bouncy: { breath: 1.1, squash: 0.07, bob: 0.55, bobAmp: 5, sway: 2.2, swayAmp: 2 },
  floaty: { breath: 2.6, squash: 0.03, bob: 2.4, bobAmp: 7, sway: 3.6, swayAmp: 4 },
  heavy: { breath: 2.8, squash: 0.045, bob: 2.8, bobAmp: 1, sway: 5, swayAmp: 0.6 },
  jittery: { breath: 0.7, squash: 0.03, bob: 0.35, bobAmp: 1.5, sway: 0.5, swayAmp: 3 },
  slithery: { breath: 2.0, squash: 0.04, bob: 1.8, bobAmp: 2, sway: 1.6, swayAmp: 6 },
  steady: { breath: 2.2, squash: 0.035, bob: 2.2, bobAmp: 1.5, sway: 4.4, swayAmp: 1 },
  swaying: { breath: 2.4, squash: 0.03, bob: 2.4, bobAmp: 2, sway: 2.6, swayAmp: 7 },
  buzzy: { breath: 0.5, squash: 0.025, bob: 0.9, bobAmp: 4, sway: 0.7, swayAmp: 2.5 },
};

function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }

/** CSS variables for a Pip's idle motion. Idle motion is ambient, so it ignores the game-speed setting. */
export function motionVars(id: string, preset: MotionPreset | undefined): CSSProperties {
  const p = PRESETS[preset ?? 'steady'];
  const h = hash(id);
  const v = (k: number) => 0.85 + ((h >>> k) & 63) / 210; // 0.85..1.15 per-slot variation
  const t = (x: number) => `${x.toFixed(2)}s`;
  return {
    ['--breath' as string]: t(p.breath * v(0)),
    ['--squash' as string]: (p.squash * v(6)).toFixed(3),
    ['--bob' as string]: t(p.bob * v(12)),
    ['--bob-amp' as string]: `${(-p.bobAmp * v(18)).toFixed(1)}%`,
    ['--sway' as string]: t(p.sway * v(24)),
    ['--sway-amp' as string]: `${(p.swayAmp * v(3)).toFixed(1)}deg`,
    ['--phase' as string]: `-${((h % 1000) / 1000 * p.sway).toFixed(2)}s`,
  };
}

export default function PipSprite({ id, back, shiny, idle = true, className, alt = '', style }: Props) {
  const s = useStore();
  const src = Art.pip(id, { back, shiny });
  const animatedSource = !!activeOverlay()?.pips?.[id]?.sprite;
  const filter = shiny && Art.needsShinyFilter(id, back) ? Art.shinyFilter : undefined;
  const moving = idle && !animatedSource && !s.settings.reducedMotion;
  const preset = activePack().pips[id]?.motion;
  return (
    <img className={`pixel pip-img ${moving ? 'pip-idle' : ''} ${className ?? ''}`} src={src} alt={alt} draggable={false}
      style={{ ...(moving ? motionVars(id, preset) : null), ...style, ...(filter ? { filter } : null) }} />
  );
}
