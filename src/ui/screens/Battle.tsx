import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { audio } from '@/audio';
import { species } from '@/game/pips';
import { opponentName, opponentRule, opponentTitle } from '@/game/opponents';
import { T } from '@/content';
import { canPlaySelected, discardSelected, toggleSelect } from '@/game/run';
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
  // Overlap cards just enough for the whole hand to fit the space between the controls.
  const handRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ w: 0, card: 100 });
  useLayoutEffect(() => {
    const el = handRef.current;
    if (!el) return;
    const measure = () => setFit({ w: el.clientWidth, card: parseFloat(getComputedStyle(el).getPropertyValue('--card-w')) || 100 });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const overlap = fit.w && n ? Math.max(-fit.card * 0.4, Math.min(-12, (fit.w - 28 - n * fit.card) / (2 * n))) : -12;
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
  // Family focus: hovering a card (mouse) lights up its relatives and dims the rest; without a hover, the
  // families of the selected cards light up, which is what touch players see.
  const [hoverUid, setHoverUid] = useState<string | null>(null);
  const familyOf = (uid: string) => { const c = run.deck.find((x) => x.uid === uid); return c && c.ability !== 'fossil' ? species(c.speciesId).family : null; };
  const hoverFamily = hoverUid && hand.some((c) => c.uid === hoverUid) ? familyOf(hoverUid) : null;
  const focus = new Set(hoverFamily ? [hoverFamily] : b.selected.map(familyOf).filter((f): f is string => !!f));
  const held: Record<string, number> = {};
  for (const c of hand) held[c.speciesId] = (held[c.speciesId] ?? 0) + 1;
  const kinOf = (uid: string) => { const f = familyOf(uid); return !!f && focus.has(f) && hand.filter((c) => familyOf(c.uid) === f).length > 1; };
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
          <div className="hand-cards" ref={handRef}>
            <AnimatePresence initial={false}>
              {hand.map((c, i) => {
                const rot = (i - (n - 1) / 2) * 2;
                const lift = Math.abs(i - (n - 1) / 2) ** 1.5 * 1.6;
                return (
                  <motion.div key={c.uid} layoutId={c.uid} className="card-slot" style={{ zIndex: i, margin: `0 ${overlap}px` }}
                    initial={{ x: 600, y: -80, opacity: 0, rotate: 25 }} animate={{ x: 0, y: lift, opacity: 1, rotate: rot }} exit={{ opacity: 0, y: 160, rotate: -12, scale: 0.7 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 24, delay: i * 0.015 }}>
                    <div onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHoverUid(c.uid); }} onPointerLeave={(e) => { if (e.pointerType === 'mouse') setHoverUid((h) => (h === c.uid ? null : h)); }}>
                      <PipCard card={c} selected={b.selected.includes(c.uid)} onClick={() => select(c.uid)}
                        kin={!animating && kinOf(c.uid)} unrelated={!animating && !!hoverFamily && !kinOf(c.uid) && c.uid !== hoverUid} held={held} />
                    </div>
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
