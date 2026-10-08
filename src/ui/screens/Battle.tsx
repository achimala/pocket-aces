import { useEffect, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { audio } from '@/audio';
import { consumableDef } from '@/game/consumables';
import { species, viewCard } from '@/game/pips';
import { opponentName, opponentRule, opponentTitle } from '@/game/opponents';
import { T } from '@/content';
import { canPlaySelected, discardSelected, toggleSelect, useConsumable } from '@/game/run';
import type { RunState } from '@/game/types';
import { act, toast } from '../store';
import PipCard from '../components/PipCard';
import BattleScene from '../components/BattleScene';
import { OppPortrait } from '../components/OpponentPanel';
import type { Pop } from './Run';

interface Props {
  run: RunState;
  animating: boolean;
  pops: Pop[];
  bumpUid: string | null;
  onAttack: () => void;
  debuffedUids: Set<string>;
  hit: boolean;
  shownDamage: number;
  lunge: boolean;
  leadSpecies: string | null;
  dialog: string;
  damageFly: number | null;
  superHit: boolean;
}

type SortMode = 'tier' | 'type';

export default function Battle({ run, animating, pops, bumpUid, onAttack, debuffedUids, hit, shownDamage, lunge, leadSpecies, dialog, damageFly, superHit }: Props) {
  const b = run.battle!;
  const [sort, setSort] = useState<SortMode>('tier');
  const boss = b.opponent.kind !== 'wild' && b.opponent.kind !== 'trainer';
  const [intro, setIntro] = useState(boss);
  useEffect(() => {
    if (!boss) { setIntro(false); return; }
    setIntro(true);
    const t0 = setTimeout(() => audio.sfx('boss'), 500);
    const t = setTimeout(() => setIntro(false), 2800);
    return () => { clearTimeout(t); clearTimeout(t0); };
  }, [b.opponent.id, b.opponent.name, boss]);

  const handCards = b.hand.map((u) => run.deck.find((c) => c.uid === u)!).filter(Boolean);
  const sortKey = (c: typeof handCards[number]) => { const sp = species(c.speciesId); const t = (c.typeOverride ?? sp.types)[0] ?? 'zz'; return sort === 'tier' ? -sp.tier * 100 - sp.stage : (t.charCodeAt(0) * 1000 + t.charCodeAt(1)) * 100 - sp.tier; };
  const hand = [...handCards].sort((x, y) => sortKey(x) - sortKey(y) || x.uid.localeCompare(y.uid));
  const played = b.played.map((u) => run.deck.find((c) => c.uid === u)!).filter(Boolean);
  const n = hand.length;
  const playErr = canPlaySelected(run);
  const canDiscard = !animating && b.selected.length > 0 && b.discardsLeft > 0 && b.played.length === 0;

  const discard = () => {
    const r = act(discardSelected) as string | null;
    if (r) { toast(r); audio.sfx('error'); } else audio.sfx('cardDiscard');
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !animating && !playErr) onAttack();
      if ((e.key === 'x' || e.key === 'X') && canDiscard) discard();
      if (e.key === 's' || e.key === 'S') setSort((s) => (s === 'tier' ? 'type' : 'tier'));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  const select = (uid: string) => {
    if (animating || b.played.length) return;
    const was = b.selected.includes(uid);
    act((rr) => toggleSelect(rr, uid));
    audio.sfx(was ? 'cardDeselect' : 'cardSelect');
  };
  const popsFor = (uid: string) => pops.filter((p) => p.target === uid);
  const floating = pops.filter((p) => p.target === 'evo' || p.target === 'deck');

  return (
    <div className="center">
      <AnimatePresence>
        {intro && (
          <motion.div className="battle-intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ delay: 0.55 }}>
            <motion.div className="intro-banner" initial={{ x: -600 }} animate={{ x: 0 }} exit={{ x: 600 }} transition={{ type: 'spring', stiffness: 160, damping: 20, delay: 0.55 }}>
              <OppPortrait opp={b.opponent} />
              <div className="intro-text">
                <div className="k">{opponentTitle(b.opponent).toUpperCase()} · HP {b.hp.toLocaleString()}</div>
                <div className="n">VS {opponentName(b.opponent).toUpperCase()}</div>
                {opponentRule(b.opponent) && <div className="r">{b.bossDisabled ? `${T.item('musicbox')} silences the rule!` : opponentRule(b.opponent)}</div>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="scene-wrap">
        <BattleScene run={run} shownDamage={shownDamage} hit={hit} lunge={lunge} leadSpecies={leadSpecies} dialog={dialog} damageFly={damageFly} superHit={superHit} />
      </div>
      <LayoutGroup>
        <div className="played-zone">
          <div className="played-row">
            <AnimatePresence>
              {played.map((c) => (
                <motion.div key={c.uid} layoutId={c.uid} className="card-slot" initial={false} exit={{ opacity: 0, x: 500, y: -40, rotate: 30, scale: 0.6 }} transition={{ type: 'spring', stiffness: 300, damping: 26 }}>
                  <PipCard card={c} bump={bumpUid === c.uid} debuffed={debuffedUids.has(c.uid)} noTip still />
                  <Pops list={popsFor(c.uid)} />
                </motion.div>
              ))}
            </AnimatePresence>
            {floating.length > 0 && <div style={{ position: 'absolute', left: '50%', top: -6 }}><Pops list={floating} big /></div>}
          </div>
        </div>
        <div className="hand-area">
          <div className="hand-controls">
            <span className="label">Sort</span>
            <div className="sort-btns">
              <button className={`btn btn-small ${sort === 'tier' ? 'btn-primary' : ''}`} onClick={() => { audio.sfx('click'); setSort('tier'); }}>Tier</button>
              <button className={`btn btn-small ${sort === 'type' ? 'btn-primary' : ''}`} onClick={() => { audio.sfx('click'); setSort('type'); }}>Type</button>
            </div>
            <span className="muted" style={{ fontSize: 11 }}>{b.selected.length}/5 selected</span>
          </div>
          <div className="hand-cards">
            <AnimatePresence initial={false}>
              {hand.map((c, i) => {
                const rot = (i - (n - 1) / 2) * 2;
                const lift = Math.abs(i - (n - 1) / 2) ** 1.5 * 1.6;
                return (
                  <motion.div key={c.uid} layoutId={c.uid} className="card-slot" style={{ zIndex: i }}
                    initial={{ x: 600, y: -80, opacity: 0, rotate: 25 }} animate={{ x: 0, y: lift, opacity: 1, rotate: rot }} exit={{ opacity: 0, y: 160, rotate: -12, scale: 0.7 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 24, delay: i * 0.015 }}>
                    <PipCard card={c} selected={b.selected.includes(c.uid)} onClick={() => select(c.uid)} />
                    <Pops list={popsFor(c.uid)} />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
          <div className="hand-actions">
            <div className="deck-pile" title="Cards left in your draw pile"><div className="emblem" /><span>{b.drawPile.length}</span><small>/ {run.deck.length}</small></div>
            <div className="btn-row">
              <button className="btn btn-discard" disabled={!canDiscard} onClick={discard}>DISCARD</button>
              <button className="btn btn-attack" disabled={animating || !!playErr} onClick={onAttack} title={playErr ?? 'Enter'}>ATTACK</button>
            </div>
          </div>
        </div>
      </LayoutGroup>
      <BagUse run={run} />
    </div>
  );
}

function Pops({ list, big }: { list: Pop[]; big?: boolean }) {
  return (
    <AnimatePresence>
      {list.map((p, i) => (
        <motion.div key={p.id} className={`card-pop ${p.kind}`} style={{ top: (big ? 0 : -14) - i * 24, fontSize: big ? 16 : undefined }}
          initial={{ opacity: 0, y: 14, scale: 0.4, x: '-50%' }} animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }} exit={{ opacity: 0, y: -26, x: '-50%' }} transition={{ type: 'spring', stiffness: 520, damping: 16 }}>
          {p.text}
          {(p.kind === 'power' || p.kind === 'mult' || p.kind === 'xmult') && Array.from({ length: 6 }, (_, k) => {
            const a = ((p.id * 53 + k * 60) % 360) * (Math.PI / 180);
            return <i key={k} className="spark" style={{ ['--dx' as string]: `${Math.cos(a) * 46}px`, ['--dy' as string]: `${Math.sin(a) * 46}px`, color: p.kind === 'power' ? '#6bbcff' : '#ff8aa0', background: p.kind === 'power' ? '#bfe0ff' : '#ffd0d8' }} />;
          })}
        </motion.div>
      ))}
    </AnimatePresence>
  );
}

/** Small strip for using Bag items on the selected cards. */
function BagUse({ run }: { run: RunState }) {
  const b = run.battle!;
  if (!b.selected.length || !run.bag.length) return null;
  const targeting = run.bag.filter((c) => consumableDef(c.defId).targets > 0);
  if (!targeting.length) return null;
  const v = b.selected.map((u) => viewCard(run.deck.find((c) => c.uid === u)!));
  return (
    <div className="bag-use">
      <span className="label">Use on {v.map((x) => x.name).join(', ')}</span>
      <div className="row">
        {targeting.map((c) => (
          <button key={c.uid} className="btn btn-small btn-green" onClick={() => { const r = act((rr) => useConsumable(rr, c.uid)) as string | null; if (r) { toast(r); audio.sfx('error'); } else audio.sfx('evolve'); }}>
            {consumableDef(c.defId).name}
          </button>
        ))}
      </div>
    </div>
  );
}
