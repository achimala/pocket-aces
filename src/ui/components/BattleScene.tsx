import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { audio } from '@/audio';
import { REGIONS } from '@/game/opponents';
import { deckDef } from '@/game/decks';
import { species } from '@/game/pips';
import { opponentName } from '@/game/opponents';
import { Art, T } from '@/content';
import PipSprite from './PipSprite';
import type { RunState } from '@/game/types';
import { speedFactor } from '../store';
import PixelBackdrop from './PixelBackdrop';

interface Props {
  run: RunState;
  shownDamage: number;
  hit: boolean;
  lunge: boolean;
  leadSpecies: string | null;
  dialog: string;
  damageFly: number | null;
  superHit: boolean;
}

function Typewriter({ text }: { text: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const step = Math.max(8, 22 * speedFactor());
    const id = setInterval(() => setN((x) => { if (x >= text.length) { clearInterval(id); return x; } return x + 1; }), step);
    return () => clearInterval(id);
  }, [text]);
  return <span>{text.slice(0, n)}<span className="caret">{n >= text.length ? '▼' : ''}</span></span>;
}

export default function BattleScene({ run, shownDamage, hit, lunge, leadSpecies, dialog, damageFly, superHit }: Props) {
  const b = run.battle!;
  const opp = b.opponent;
  const n = Math.max(1, opp.party.length);
  const slice = b.hp / n;
  const idx = Math.min(n, Math.floor(shownDamage / slice + 1e-9));
  const active = idx < n ? species(opp.party[idx]) : null;
  const activeHp = active ? Math.max(0, (idx + 1) * slice - shownDamage) : 0;
  const frac = active ? activeHp / slice : 0;
  const [transient, setTransient] = useState<string | null>(null);
  const prevIdx = useRef(idx);
  useEffect(() => {
    if (idx > prevIdx.current) {
      const fainted = species(opp.party[Math.min(n - 1, prevIdx.current)]).name.toUpperCase();
      audio.sfx('faint');
      setTransient(`${opp.kind === 'wild' ? `${T.terms.wild} ` : 'Foe '}${fainted} fainted!`);
      const timers: ReturnType<typeof setTimeout>[] = [];
      if (idx < n) timers.push(setTimeout(() => { setTransient(`${opponentName(opp)} sent out ${species(opp.party[idx]).name.toUpperCase()}!`); audio.sfx('pop'); }, 1100 * Math.max(0.5, speedFactor())));
      timers.push(setTimeout(() => setTransient(null), 2600 * Math.max(0.5, speedFactor())));
      prevIdx.current = idx;
      return () => timers.forEach(clearTimeout);
    }
    prevIdx.current = idx;
  }, [idx, n, opp]);
  const level = Math.min(100, 5 + run.region * 9 + (opp.kind === 'wild' ? 0 : opp.kind === 'trainer' ? 3 : 8) + idx);
  const bg = run.endless ? REGIONS[9].id : REGIONS[Math.min(run.region, 8)].id;
  const allySp = species(leadSpecies ?? deckDef(run.starter).species);
  const text = transient ?? dialog;
  return (
    <div className={`scene ${hit ? 'scene-hit' : ''} ${superHit && hit ? 'scene-super' : ''}`}>
      <PixelBackdrop className="scene-bg" src={Art.backdrop(bg)} focusY={0.62} />
      <div className="scene-shade" />
      <div className="foe">
        <div className="platform" />
        <AnimatePresence mode="wait">
          {active && (
            <motion.div key={`${idx}-${active.id}`} className={`foe-holder ${hit ? 'flinch' : ''}`}
              initial={{ scale: 0, opacity: 0, filter: 'brightness(8)' }} animate={{ scale: 1, opacity: 1, filter: 'brightness(1)', transition: { duration: 0.38 * speedFactor() } }}
              exit={{ y: [0, -10, 90], scaleY: [1, 1.1, 0.25], opacity: [1, 1, 0], filter: ['brightness(1)', 'brightness(3)', 'brightness(0.3) grayscale(1)'], transition: { duration: 0.7 * speedFactor(), times: [0, 0.2, 1], ease: 'easeIn' } }}>
              <PipSprite id={active.id} className={`foe-sprite ${hit ? 'blink' : ''}`} alt={active.name} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="hpbox foe-box">
        <div className="hp-name"><span>{active ? active.name.toUpperCase() : '———'}</span><span className="lv">Lv{level}</span></div>
        <div className="hp-line"><span className="hp-tag">HP</span><div className="hp-track"><div className={`hp-fill ${frac < 0.2 ? 'low' : frac < 0.5 ? 'mid' : ''}`} style={{ width: `${frac * 100}%` }} /></div></div>
        <div className="hp-sub">
          <span className="balls">{opp.party.map((_, i) => <i key={i} className={i < idx ? 'out' : ''} />)}</span>
          <span className="hp-num">{Math.ceil(activeHp).toLocaleString()}/{Math.ceil(slice).toLocaleString()}</span>
        </div>
      </div>
      <div className={`ally ${lunge ? 'lunge' : ''}`}>
        <div className="platform" />
        <PipSprite key={allySp.id} id={allySp.id} back className="ally-sprite" />
      </div>
      <div className="hpbox ally-box">
        <div className="hp-name"><span>{allySp.name.toUpperCase()}</span><span className="lv">YOU</span></div>
        <div className="pp-line"><span className="hp-tag atk">ATK</span><span className="pips">{Array.from({ length: Math.max(b.handsLeft, 0) }, (_, i) => <i key={i} />)}</span></div>
        <div className="pp-line"><span className="hp-tag dsc">DIS</span><span className="pips dsc">{Array.from({ length: Math.max(b.discardsLeft, 0) }, (_, i) => <i key={i} />)}</span></div>
      </div>
      <AnimatePresence>
        {damageFly != null && (
          <motion.div className="scene-damage" initial={{ left: '30%', top: '70%', scale: 0.3, opacity: 0 }} animate={{ left: ['30%', '45%', '70%'], top: ['70%', '30%', '28%'], scale: [0.3, 1.5, 1], opacity: 1 }} exit={{ opacity: 0, scale: 1.6 }} transition={{ duration: 0.6 * speedFactor(), times: [0, 0.5, 1] }}>
            -{damageFly.toLocaleString()}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="dialog"><Typewriter text={text} /></div>
    </div>
  );
}
