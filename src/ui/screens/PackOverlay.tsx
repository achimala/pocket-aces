import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { audio } from '@/audio';
import { closePack, isPipPack, packInfo, pickFromPack } from '@/game/run';
import type { RunState } from '@/game/types';
import { act, speedFactor, toast } from '../store';
import PipCard from '../components/PipCard';
import ItemCard, { iconUrl } from '../components/ItemCard';
import ConsumableCard from '../components/ConsumableCard';

export default function PackOverlay({ run }: { run: RunState }) {
  const p = run.pack!;
  const info = packInfo(p.kind);
  const isBall = isPipPack(p.kind);
  const [opened, setOpened] = useState(false);
  const [flash, setFlash] = useState(false);
  // The catch wobble: three shakes, a click, then it bursts open.
  useEffect(() => {
    setOpened(false);
    const sp = Math.max(0.4, speedFactor());
    const ts = [0, 1, 2].map((i) => setTimeout(() => audio.sfx('click'), (250 + i * 330) * sp));
    ts.push(setTimeout(() => { setFlash(true); audio.sfx(isBall ? 'shiny' : 'pop'); }, 1250 * sp));
    ts.push(setTimeout(() => { setOpened(true); }, 1380 * sp));
    ts.push(setTimeout(() => setFlash(false), 1700 * sp));
    return () => ts.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.kind, p.choices.length === 0]);
  const pick = (uid: string) => { const r = act((rr) => pickFromPack(rr, uid)) as string | null; if (r) { toast(r); audio.sfx('error'); } else audio.sfx(isBall ? 'evolve' : 'buy'); };
  return (
    <div className="pack-overlay">
      {flash && <motion.div className="pack-flash" initial={{ opacity: 0.95 }} animate={{ opacity: 0 }} transition={{ duration: 0.4 }} />}
      {!opened ? (
        <div className="pack-stage">
          <motion.img className="pack-ball pixel" src={iconUrl(p.kind)} alt="" initial={{ y: -300, rotate: -40 }}
            animate={{ y: [-300, 0, -24, 0, 0, 0, 0, 0, 0, 0], rotate: [-40, 0, 0, 0, -22, 22, -22, 22, -14, 0] }}
            transition={{ duration: 1.25 * Math.max(0.4, speedFactor()), times: [0, 0.14, 0.2, 0.26, 0.36, 0.46, 0.6, 0.7, 0.86, 1], ease: 'easeInOut' }} />
          <div className="pack-title">{info.name.toUpperCase()}</div>
        </div>
      ) : (
        <>
          <div className="pack-title">{info.name.toUpperCase()}<small>{isBall ? 'Catch' : 'Pick'} {p.picksLeft} more · {info.desc}</small></div>
          <div className="pack-choices">
            {p.choices.map((c, i) => (
              <motion.div key={c.uid} initial={{ scale: 0, opacity: 0, y: 60, rotate: (i - (p.choices.length - 1) / 2) * 14 }} animate={{ scale: 1, opacity: 1, y: 0, rotate: 0 }} transition={{ delay: i * 0.09, type: 'spring', stiffness: 220, damping: 15 }}>
                {c.card && <PipCard card={c.card} onClick={() => pick(c.uid)} />}
                {c.item && <ItemCard item={c.item} run={run} onClick={() => pick(c.uid)} />}
                {c.consumable && <ConsumableCard item={c.consumable} onClick={() => pick(c.uid)} hint={run.bag.length >= run.bagSlots ? 'Bag is full: non-targeting cards are used right away' : undefined} />}
              </motion.div>
            ))}
          </div>
          {run.battle && (
            <div className="col" style={{ alignItems: 'center' }}>
              <div className="label">Your hand</div>
              <div className="pack-hand">{run.battle.hand.map((u) => { const c = run.deck.find((x) => x.uid === u)!; return <PipCard key={u} card={c} size="xs" noTip />; })}</div>
            </div>
          )}
          <button className="btn btn-ghost" onClick={() => { audio.sfx('click'); act(closePack); }}>Skip</button>
        </>
      )}
    </div>
  );
}
