import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { audio } from '@/audio';
import { HAND_MOVES, HAND_NAMES } from '@/game/hands';
import { evolutionLine, species, tierLabel, viewCard } from '@/game/pips';
import { consumableDef } from '@/game/consumables';
import { deckDef } from '@/game/decks';
import { T } from '@/content';
import { TYPE_COLORS } from '@/game/typechart';
import Swirl, { type Palette } from '../components/Swirl';
import HowToPlay, { markTutorialSeen, tutorialSeen } from '../components/HowToPlay';
import { opponentName, opponentTitle, REGIONS } from '@/game/opponents';
import { startBattle, canPlaySelected, cardsInDeckSorted, consumableBlocker, continueEndless, finishAttack, moveItem, playHand, sellConsumable, sellItem, toShop, useConsumable } from '@/game/run';
import { previewHand, type ScoreResult } from '@/game/scoring';
import type { HandResult } from '@/game/hands';
import { clearRun } from '@/game/save';
import type { RunState } from '@/game/types';
import { act, setRun, setScreen, speedFactor, toast, useRun, useStore } from '../store';
import Sidebar from '../components/Sidebar';
import ItemCard from '../components/ItemCard';
import ConsumableCard from '../components/ConsumableCard';
import PipCard from '../components/PipCard';
import SettingsModal from '../components/SettingsModal';
import SelectScreen from './Select';
import ShopScreen from './Shop';
import PackOverlay from './PackOverlay';
import Battle from './Battle';

export interface Pop { id: number; target: string; kind: string; text: string }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let popId = 0;

export default function RunScreen() {
  const run = useRun();
  const store = useStore();
  const [shown, setShown] = useState<{ power: number; mult: number; shake: 'power' | 'mult' | null }>({ power: 0, mult: 0, shake: null });
  const [pops, setPops] = useState<Pop[]>([]);
  const [bumpUid, setBumpUid] = useState<string | null>(null);
  const [wiggleUid, setWiggleUid] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);
  const [hiddenDamage, setHiddenDamage] = useState(0);
  const [damageFly, setDamageFly] = useState<number | null>(null);
  const [shake, setShake] = useState(false);
  const [settings, setSettings] = useState(false);
  const [deckView, setDeckView] = useState(false);
  const [debuffed, setDebuffed] = useState<Set<string>>(new Set());
  const [showCashout, setShowCashout] = useState(false);
  const [scoringHand, setScoringHand] = useState<HandResult | null>(null);
  const [sellUid, setSellUid] = useState<string | null>(null);
  const [bagOpen, setBagOpen] = useState<string | null>(null);
  const useBag = (uid: string) => {
    const kind = run.bag.find((x) => x.uid === uid)?.kind;
    const r = act((rr) => useConsumable(rr, uid)) as string | null;
    if (r) { toast(r); audio.sfx('error'); return; }
    audio.sfx(kind === 'book' ? 'levelUp' : 'evolve');
    setBagOpen(null);
  };
  const sellBag = (uid: string) => {
    const r = act((rr) => sellConsumable(rr, uid)) as string | null;
    if (r) toast(r); else audio.sfx('sell');
    setBagOpen(null);
  };
  const [dialog, setDialog] = useState('');
  const [leadSpecies, setLeadSpecies] = useState<string | null>(null);
  const [lunge, setLunge] = useState(false);
  const [superHit, setSuperHit] = useState(false);
  const [wipe, setWipe] = useState(0);
  const [howto, setHowto] = useState(() => !tutorialSeen() && !new URLSearchParams(location.search).has('dev'));
  const runRef = useRef(run);
  runRef.current = run;

  const b = run.battle;
  const preview = b && b.played.length === 0 ? previewHand(run, b.selected) : null;

  // music
  useEffect(() => {
    if (run.phase === 'battle' && b) {
      const k = b.opponent.kind;
      audio.playMusic(k === 'boss' ? 'boss' : k === 'wild' || k === 'trainer' ? 'battle' : 'league');
    } else if (run.phase === 'shop' || run.phase === 'select') audio.playMusic(run.phase === 'shop' ? 'shop' : run.region >= 8 ? 'league' : 'battle');
    else if (run.phase === 'gameover') audio.playMusic('gameover');
    else if (run.phase === 'win') audio.playMusic('win');
  }, [run.phase, b?.opponent.id, run.region]);

  // battle narration
  useEffect(() => {
    if (!b) return;
    const o = b.opponent;
    setLeadSpecies(null);
    setDialog(o.kind === 'wild' ? `A ${T.terms.wild.toLowerCase()} ${species(o.id).name.toUpperCase()} appeared!` : o.kind === 'trainer' ? `${opponentName(o)} wants to battle!` : `${opponentTitle(o)} ${opponentName(o)} wants to battle!`);
    const t = setTimeout(() => setDialog((d) => (d.includes('appeared') || d.includes('wants to battle') ? 'What will you do?' : d)), 3200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b?.opponent.id, b?.opponent.name]);

  const beginBattle = useCallback(() => {
    audio.sfx('whoosh');
    setWipe((w) => w + 1);
    setTimeout(() => act(startBattle), 480);
    setTimeout(() => setWipe(0), 1250);
  }, []);

  useEffect(() => {
    if (run.phase === 'cashout' && !animating) { setShowCashout(true); audio.playMusic('victory'); }
    else setShowCashout(false);
  }, [run.phase, animating]);

  const addPop = useCallback((target: string, kind: string, text: string) => {
    const id = ++popId;
    setPops((p) => [...p, { id, target, kind, text }]);
    setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 950 * speedFactor() + 200);
  }, []);

  const attack = useCallback(async () => {
    const r = runRef.current;
    const err = canPlaySelected(r);
    if (err) { toast(err); audio.sfx('error'); return; }
    const result = act(playHand) as ScoreResult | null;
    if (!result) return;
    setAnimating(true);
    setScoringHand(result.hand);
    setHiddenDamage(result.damage);
    const sp = speedFactor();
    audio.sfx('cardPlay');
    const lead = r.deck.find((c) => c.uid === result.hand.scoring[0]);
    if (lead && lead.ability !== 'fossil') setLeadSpecies(lead.speciesId);
    const leadName = lead && lead.ability !== 'fossil' ? species(lead.speciesId).name.toUpperCase() : 'Your team';
    setDialog(`${leadName} used ${HAND_MOVES[result.hand.type].toUpperCase()}! (${HAND_NAMES[result.hand.type]})`);
    const anySuper = result.superEffective.length > 0;
    setSuperHit(anySuper);
    const deb = new Set<string>();
    await sleep(420 * sp);
    let chip = 0;
    for (const ev of result.events) {
      const src = ev.source;
      if (src.kind === 'hand') { setShown({ power: ev.total.power, mult: ev.total.mult, shake: 'power' }); audio.sfx('pop'); await sleep(320 * sp); continue; }
      const target = src.kind === 'card' || src.kind === 'held' || src.kind === 'item' ? src.uid : src.kind === 'evo' ? 'evo' : 'deck';
      if (src.kind === 'card') { setBumpUid(null); await sleep(10); setBumpUid(src.uid); }
      if (src.kind === 'item') { setWiggleUid(null); await sleep(10); setWiggleUid(src.uid); }
      if (ev.debuffed) { deb.add(target); setDebuffed(new Set(deb)); addPop(target, 'debuff', ev.msg ?? 'Debuffed'); audio.sfx('error'); await sleep(260 * sp); continue; }
      if (ev.matchup === 'super' && ev.power) { addPop(target, 'super', 'ADVANTAGE!'); audio.sfx('superEffective'); }
      else if (ev.msg && !ev.power && !ev.mult && !ev.xmult && !ev.money) addPop(target, 'msg', ev.msg);
      else if (ev.msg && (src.kind === 'item' || src.kind === 'held' || src.kind === 'evo' || src.kind === 'deck' || ev.matchup === 'resisted' || ev.matchup === 'immune')) addPop(target, 'msg', ev.msg);
      if (ev.power) { addPop(target, 'power', `+${ev.power}`); audio.sfx('chip', { index: chip++ }); }
      if (ev.mult) { addPop(target, 'mult', `+${ev.mult} MULT`); audio.sfx('mult'); }
      if (ev.xmult) { addPop(target, 'xmult', `×${ev.xmult} MULT`); audio.sfx('xmult'); }
      if (ev.money) { addPop(target, 'money', `+${T.money(ev.money)}`); audio.sfx('cash'); }
      if (src.kind === 'evo') audio.sfx('evolve');
      setShown({ power: ev.total.power, mult: ev.total.mult, shake: ev.power ? 'power' : 'mult' });
      await sleep((src.kind === 'item' ? 440 : src.kind === 'evo' ? 520 : ev.retrigger ? 240 : 300) * sp);
    }
    setLunge(true);
    audio.sfx('whoosh');
    await sleep(200 * sp);
    setDamageFly(result.damage);
    await sleep(380 * sp);
    setLunge(false);
    setShake(true);
    setHiddenDamage(0);
    setDialog(result.capped ? `${result.damage.toLocaleString()} damage. ${result.capped}!` : anySuper ? 'Type advantage!' : result.rawDamage === 0 ? 'But nothing happened!' : `Dealt ${result.damage.toLocaleString()} damage!`);
    act(finishAttack);
    audio.sfx(anySuper ? 'superEffective' : 'damage');
    await sleep(520 * sp);
    setShake(false);
    setDamageFly(null);
    setDebuffed(new Set());
    const after = runRef.current;
    if (after.battle?.won) { await sleep(900 * sp); }
    else if (after.phase === 'gameover') { audio.sfx('lose'); setDialog('You are out of attacks... Your Pips are worn out!'); }
    else setTimeout(() => setDialog('What will you do?'), 1400 * sp);
    setShown({ power: 0, mult: 0, shake: null });
    setScoringHand(null);
    setBumpUid(null);
    setWiggleUid(null);
    setAnimating(false);
  }, [addPop]);

  const abandon = () => { clearRun(); setRun(null); setSettings(false); setScreen('title'); };
  const palette: Palette = run.phase === 'shop' || (run.phase === 'pack' && !b) ? ['#3fae84', '#1f6f86', '#10241f']
    : run.phase === 'gameover' ? ['#7a2b33', '#3a3f55', '#141418']
    : run.phase === 'win' ? ['#f5b942', '#e0672b', '#3a1d0a']
    : b ? [TYPE_COLORS[b.opponent.types[0]], b.opponent.kind === 'wild' || b.opponent.kind === 'trainer' ? '#1f5fa8' : '#7a1f3a', '#141a26']
    : ['#de443b', '#006bb4', '#162325'];
  const remaining = b ? b.hp - Math.max(0, b.damage - hiddenDamage) : 0;
  const onFire = animating && shown.power > 0 && Math.round(shown.power * shown.mult) >= remaining;

  return (
    <div className={`run ${shake ? 'shake-screen' : ''}`}>
      <Sidebar run={run} preview={preview ?? scoringHand} shown={shown} onFire={onFire} hiddenDamage={hiddenDamage} damagePreview={shown.power ? Math.round(shown.power * shown.mult) : null} onOpenSettings={() => setSettings(true)} onOpenDeck={() => setDeckView(true)} onOpenHelp={() => setHowto(true)} />
      <div className="table">
        <Swirl palette={palette} speed={animating ? 2.2 : 1} />
        <div className="table-vignette" />
        <div className="table-inner">
          <div className="topbar">
            <div className="items-dock">
              <div className="dock-label">ITEMS {run.items.length}/{run.itemSlots + run.items.filter((i) => i.edition === 'shadow').length}</div>
              {run.items.length === 0 && <div className="dock-empty">{`Items you buy at the ${T.terms.shop} go here. They score left to right.`}</div>}
              <AnimatePresence>
                {run.items.map((it, idx) => (
                  <motion.div key={it.uid} layout initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} className={`item-wrap ${sellUid === it.uid ? 'open' : ''}`}>
                    <ItemCard item={it} run={run} wiggle={wiggleUid === it.uid} extra={pops.filter((p) => p.target === it.uid).map((p, i) => <div key={p.id} className={`card-pop ${p.kind}`} style={{ top: -10 - i * 18 }}>{p.text}</div>)}
                      onClick={() => { if (animating) return; audio.sfx('click'); setSellUid(sellUid === it.uid ? null : it.uid); }} />
                    {!animating && (
                      <div className="item-tools">
                        <button className="btn btn-ghost" disabled={idx === 0} onClick={() => act((rr) => moveItem(rr, it.uid, -1))} title="Move left">◀</button>
                        <button className="btn btn-danger" disabled={it.eternal} onClick={() => { const r = act((rr) => sellItem(rr, it.uid)) as string | null; if (r) toast(r); else audio.sfx('sell'); setSellUid(null); }} title="Sell">Sell {T.money(it.sellValue)}</button>
                        <button className="btn btn-ghost" disabled={idx === run.items.length - 1} onClick={() => act((rr) => moveItem(rr, it.uid, 1))} title="Move right">▶</button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <div className="bag-dock">
              <div className="dock-label">BAG {run.bag.length}/{run.bagSlots + run.bag.filter((i) => i.edition === 'shadow').length}</div>
              {run.bag.length === 0 && <div className="dock-empty">{`${T.terms.tonics}, ${T.terms.books} and ${T.terms.relic}s`}</div>}
              <AnimatePresence>
                {run.bag.map((c) => (
                  <motion.div key={c.uid} layout initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0, opacity: 0 }} className={`item-wrap ${bagOpen === c.uid ? 'open' : ''}`}
                    onContextMenu={(e) => { e.preventDefault(); sellBag(c.uid); }}>
                    <ConsumableCard item={c} hint="Click for Use and Sell." onClick={() => { if (animating) return; audio.sfx('click'); setBagOpen(bagOpen === c.uid ? null : c.uid); }} />
                    {bagOpen === c.uid && !animating && <BagTools run={run} uid={c.uid} onUse={() => useBag(c.uid)} onSell={() => sellBag(c.uid)} />}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
          {run.phase === 'select' && <SelectScreen run={run} onBegin={beginBattle} />}
          {(run.phase === 'battle' || run.phase === 'cashout' || run.phase === 'gameover' || (run.phase === 'pack' && run.battle)) && run.battle && (
            <Battle run={run} animating={animating} pops={pops} bumpUid={bumpUid} onAttack={attack} debuffedUids={debuffed} hit={shake} shownDamage={Math.max(0, run.battle.damage - hiddenDamage)} lunge={lunge} leadSpecies={leadSpecies} dialog={dialog} damageFly={damageFly} superHit={superHit} />
          )}
          {(run.phase === 'shop' || (run.phase === 'pack' && !run.battle && run.shop)) && run.shop && <ShopScreen run={run} />}
          {run.phase === 'win' && <div className="select-wrap" />}
        </div>
      </div>
      {run.phase === 'pack' && run.pack && <PackOverlay run={run} />}
      {wipe > 0 && <><div className="wipe-flash" key={`f${wipe}`} /><div className="wipe" key={wipe}>{Array.from({ length: 10 }, (_, i) => <i key={i} style={{ animationDelay: `${0.12 + i * 0.012}s` }} />)}</div></>}
      <AnimatePresence>
        {showCashout && run.cashout && (
          <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {Array.from({ length: 26 }, (_, i) => <i key={i} className="coin" style={{ left: `${(i * 37) % 100}%`, animationDuration: `${1.6 + (i % 7) * 0.25}s`, animationDelay: `${(i % 9) * 0.12}s` }} />)}
            <motion.div className="panel cashout" style={{ position: 'relative', zIndex: 2 }} initial={{ scale: 0.7, y: 40 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 18 }}>
              <h2>{run.battle?.opponent.kind === 'boss' ? `${T.terms.crest.toUpperCase()} EARNED!` : 'VICTORY!'}</h2>
              {run.battle?.log.filter(Boolean).map((l, i) => <div key={i} className="muted" style={{ fontSize: 12, textAlign: 'center' }}>{l}</div>)}
              {run.cashout.lines.map((l, i) => (
                <motion.div key={i} className="cash-line" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.15 }} onAnimationComplete={() => audio.sfx('cash')}>
                  <span>{l.label}</span><span className="money">{T.money(l.amount)}</span>
                </motion.div>
              ))}
              <div className="cash-total"><span>TOTAL</span><span>{T.money(run.cashout.total)}</span></div>
              <button className="btn btn-primary btn-pixel" onClick={() => { audio.sfx('click'); act(toShop); }}>TO THE {T.terms.shop.toUpperCase()} ▶</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {(run.phase === 'gameover' || run.phase === 'win') && !animating && (
          <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="panel end-card" initial={{ scale: 0.7 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 18 }}>
              <h1 className={run.phase === 'win' ? 'win' : 'lose'}>{run.phase === 'win' ? (run.endless ? 'STILL STANDING' : `YOU ARE THE ${T.terms.kingpin.toUpperCase()}!`) : `ALL YOUR ${T.terms.pips.toUpperCase()} ARE WORN OUT`}</h1>
              <div className="muted">{run.phase === 'win' ? `${deckDef(run.starter).name} deck · ${run.difficulty} · seed ${run.seed}` : `Defeated by ${run.battle ? opponentName(run.battle.opponent) : '???'} in ${REGIONS[Math.min(run.region, 9)].name}. ${run.battle ? `${(run.battle.damage / run.battle.hp * 100).toFixed(0)}% of the way there.` : ''}`}</div>
              <div className="end-stats">
                <div className="stat"><span className="label">Best attack</span><span className="v">{run.stats.bestDamage.toLocaleString()} {run.stats.bestHand ? `(${HAND_NAMES[run.stats.bestHand]})` : ''}</span></div>
                <div className="stat"><span className="label">Most played</span><span className="v">{HAND_NAMES[(Object.entries(run.handPlays).sort((a, b2) => b2[1] - a[1])[0]?.[0] ?? 'high') as keyof typeof HAND_NAMES]}</span></div>
                <div className="stat"><span className="label">Battles won</span><span className="v">{run.stats.battlesWon}</span></div>
                <div className="stat"><span className="label">{T.terms.crests}</span><span className="v">{run.badges.length}</span></div>
                <div className="stat"><span className="label">Cards played / discarded</span><span className="v">{run.stats.cardsPlayed} / {run.stats.cardsDiscarded}</span></div>
                <div className="stat"><span className="label">{T.terms.pips} caught</span><span className="v">{run.stats.pipsCaught}</span></div>
                <div className="stat"><span className="label">Money earned</span><span className="v">{T.money(run.stats.moneyEarned)}</span></div>
                <div className="stat"><span className="label">Party size</span><span className="v">{run.deck.length}</span></div>
              </div>
              <div className="row" style={{ gap: 10 }}>
                {run.phase === 'win' && <button className="btn btn-green" onClick={() => { audio.sfx('boss'); act(continueEndless); }}>{`Climb ${T.terms.summit} (endless)`}</button>}
                <button className="btn btn-ghost" onClick={() => { navigator.clipboard?.writeText(`${T.terms.game} seed ${run.seed} · ${run.starter} · ${run.phase === 'win' ? 'WON' : `lost in ${REGIONS[Math.min(run.region, 9)].name}`} · best attack ${run.stats.bestDamage}`); toast('Copied to clipboard'); }}>Share</button>
                <button className="btn btn-primary" onClick={() => { audio.sfx('click'); abandon(); }}>Main menu</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {deckView && (
        <div className="overlay" onClick={() => setDeckView(false)}>
          <div className="panel deck-view" onClick={(e) => e.stopPropagation()}>
            <div className="row"><h2 style={{ margin: 0, fontFamily: 'var(--font-pixel)', fontSize: 13, color: 'var(--accent)' }}>YOUR PARTY · {run.deck.length} cards</h2><div className="spacer" />{b && <span className="muted" style={{ fontSize: 12 }}>Dimmed cards are in your hand, played or discarded</span>}<button className="btn btn-small" onClick={() => setDeckView(false)}>Close</button></div>
            <div className="deck-groups">
              {deckGroups(run).map((g) => (
                <div key={g.key} className="deck-group">
                  <div className="deck-group-head">
                    {g.line ? <><span className="rank">{tierLabel(g.line.members[0].tier)}</span><span>{g.line.members.map((m) => m.name).join(' → ')}{g.line.branches ? ` → ${g.line.branches} forms` : ''}</span></> : <span>Fossils</span>}
                    <span className="muted">×{g.cards.length}</span>
                  </div>
                  <div className="deck-grid">
                    {g.cards.map((c) => <PipCard key={c.uid} card={c} size="sm" className={b && !b.drawPile.includes(c.uid) ? 'gone' : ''} />)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {settings && <SettingsModal onClose={() => setSettings(false)} onAbandon={() => { if (window.confirm('Abandon this run? Progress will be lost.')) abandon(); }} />}
      {howto && <HowToPlay onClose={() => { markTutorialSeen(); setHowto(false); }} />}
      {store.toast && null}
    </div>
  );
}

/** The party grouped by evolution line (rank order), fossils last. */
function deckGroups(run: RunState) {
  const groups = new Map<string, { key: string; line: ReturnType<typeof evolutionLine> | null; cards: RunState['deck'] }>();
  for (const c of cardsInDeckSorted(run)) {
    const fossil = c.ability === 'fossil';
    const key = fossil ? 'fossil' : species(c.speciesId).family;
    if (!groups.has(key)) groups.set(key, { key, line: fossil ? null : evolutionLine(species(c.speciesId).family), cards: [] });
    groups.get(key)!.cards.push(c);
  }
  return [...groups.values()].sort((a, b) => (a.line ? 0 : 1) - (b.line ? 0 : 1));
}

/** Under an opened Bag consumable: what using it will do, then Use and Sell. */
function BagTools({ run, uid, onUse, onSell }: { run: RunState; uid: string; onUse: () => void; onSell: () => void }) {
  const c = run.bag.find((x) => x.uid === uid);
  if (!c) return null;
  const def = consumableDef(c.defId);
  const blocked = consumableBlocker(run, uid);
  const targets = run.battle?.selected.map((u) => run.deck.find((x) => x.uid === u)!).filter(Boolean) ?? [];
  return (
    <div className="bag-tools" onClick={(e) => e.stopPropagation()}>
      <div className="bag-what">{blocked ?? (def.targets > 0 ? `Use on ${targets.map((x) => viewCard(x).name).join(', ')}` : 'Ready to use')}</div>
      <div className="row" style={{ gap: 4 }}>
        <button className="btn btn-green" disabled={!!blocked} onClick={onUse}>Use</button>
        <button className="btn btn-danger" onClick={onSell}>Sell {T.money(Math.max(1, Math.floor(def.cost / 2)))}</button>
      </div>
    </div>
  );
}
