import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { audio } from '@/audio';
import { makeCard } from '@/game/inventory';
import { HAND_BASE, HAND_NAMES } from '@/game/hands';
import type { Card, HandType, PType } from '@/game/types';
import PipCard from './PipCard';
import TypeIcon from './TypeIcon';
import { iconUrl } from './ItemCard';
import { Art, T } from '@/content';

const slot = (n: number) => 'c' + String(n).padStart(3, '0');
const c = (n: number, extra: Partial<Card> = {}): Card => ({ ...makeCard(slot(n), extra), uid: `tut-${n}-${extra.edition ?? ''}-${Math.random().toString(36).slice(2, 6)}` });
const nm = (n: number) => T.pipName(slot(n));

function Cards({ ids, size = 'sm' }: { ids: (number | Card)[]; size?: 'sm' | 'xs' | 'md' }) {
  const [cards] = useState(() => ids.map((x) => (typeof x === 'number' ? c(x) : x)));
  return <div className="tut-cards">{cards.map((card) => <PipCard key={card.uid} card={card} size={size} still />)}</div>;
}

const Matchup = ({ a, d, label, cls }: { a: PType; d: PType; label: string; cls: string }) => (
  <div className="tut-match"><TypeIcon type={a} size={22} /> <span>▶</span> <TypeIcon type={d} size={22} /> <b className={cls}>{label}</b></div>
);

const PAGES: { title: string; body: () => React.ReactNode }[] = [
  {
    title: 'Your party is your deck',
    body: () => (
      <>
        <p>{T.terms.game} is poker with a party of {T.terms.pips}. Each battle you draw <b>8 cards</b>, pick <b>up to 5</b>, and <b className="power-c">ATTACK</b> to play a poker hand. Beat the opponent's <b>HP</b> before you run out of attacks. <b className="mult-c">DISCARD</b> swaps cards you don't want.</p>
        <Cards ids={[1, 2, 3, 25, 26]} />
        <p className="muted">That hand is a Full House: three from the {nm(1)} family and two from the {nm(25)} family.</p>
      </>
    ),
  },
  {
    title: 'Reading a card',
    body: () => (
      <div className="tut-split">
        <Cards ids={[6]} size="md" />
        <ul>
          <li><b>Tier</b> (top left, 2 to A) is the card's poker rank. Every {T.terms.pip} in an evolution family shares it, so <b>{nm(4)}, {nm(5)} and {nm(6)} all pair up</b>.</li>
          <li><b>Type icons</b> under the tier are its suits. {nm(6)} is Fire <i>and</i> Flying, so it fits either flush.</li>
          <li><b>Dots</b> (top right) show the evolution stage. Evolved cards are worth more Power.</li>
          <li><b>+Power</b> (bottom) is what it adds when it scores.</li>
        </ul>
      </div>
    ),
  },
  {
    title: 'Power × Mult = Damage',
    body: () => (
      <>
        <p>Every hand has a base <b className="power-c">Power</b> and <b className="mult-c">Mult</b>. Scored cards add their Power, items add more of both, then they multiply.</p>
        <div className="tut-hands">
          {(['pair', 'twopair', 'three', 'straight', 'flush', 'fullhouse', 'four', 'straightflush'] as HandType[]).map((h) => (
            <div key={h}><span>{HAND_NAMES[h]}</span><b className="power-c">{HAND_BASE[h].power}</b> × <b className="mult-c">{HAND_BASE[h].mult}</b></div>
          ))}
        </div>
        <p><b>Pair / Three / Four of a Kind</b>: same family. <b>Flush</b>: 5 cards sharing a type. <b>Straight</b>: 5 tiers in a row.</p>
        <p><b style={{ color: '#ffd84d' }}>Evolution bonus:</b> a set with different stages of one family gets <b className="mult-c">+4 Mult</b> per extra stage. A full line like {nm(1)} + {nm(2)} + {nm(3)} is +8.</p>
      </>
    ),
  },
  {
    title: 'Type matchups',
    body: () => (
      <>
        <p>Every opponent has a type, and the type chart applies to each card you score.</p>
        <div className="tut-matches">
          <Matchup a="water" d="fire" label="Advantage: card Power ×2" cls="good" />
          <Matchup a="fire" d="water" label={`Resisted: Power ×½ (${T.terms.bosses} only)`} cls="bad" />
          <Matchup a="electric" d="ground" label={`Immune: scores 0 (${T.terms.bosses} only)`} cls="bad" />
        </div>
        <p className="muted">{T.terms.wild} {T.terms.pips} and {T.terms.trainer}s only ever give you the bonus. {T.terms.bosses}, {T.terms.elite}s and the {T.terms.kingpin} also punish bad matchups, and each has a signature rule shown before the fight.</p>
      </>
    ),
  },
  {
    title: `The ${T.terms.shop}`,
    body: () => (
      <>
        <p>Win a battle, earn {T.terms.currencyName.toLowerCase()} ({T.terms.currency}), and shop. Unspent money earns interest ({T.money(1)} per {T.money(5)}, up to {T.money(5)}).</p>
        <div className="tut-shop">
          <div><img className="pixel" src={iconUrl('booster')} alt="" /><b>Items</b><span>Passive bonuses that score left to right. You hold 5.</span></div>
          <div><img className="pixel" src={iconUrl('growthtonic')} alt="" /><b>{T.terms.tonics}</b><span>Evolve cards, change their type, add abilities.</span></div>
          <div><img className="pixel" src={iconUrl('book_pair')} alt="" /><b>{T.terms.books}</b><span>Level up one hand type for good.</span></div>
          <div><img className="pixel" src={iconUrl('lantern')} alt="" /><b>{T.terms.lantern}s</b><span>Catch new {T.terms.pips} for your party.</span></div>
        </div>
        <p className="muted">Click an Item to move or sell it. Click a {T.terms.tonic} or {T.terms.book} in your Bag to use it (select cards in battle first if it needs targets).</p>
      </>
    ),
  },
  {
    title: `The road to the ${T.terms.kingpin}`,
    body: () => (
      <>
        <p>Eight regions, three battles each: a <b>{T.terms.wild} Encounter</b>, a <b>{T.terms.trainer}</b>, then the <b>{T.terms.boss}</b>. You may skip the first two for a {T.terms.fruit}. After {T.region('moorhaven')} comes {T.terms.league}: four <b>{T.terms.elite}s</b> and the <b>{T.terms.kingpin}</b>.</p>
        <div className="tut-leaders">{['rocco', 'lou', 'tamsin', 'sasha', 'piper', 'primrose', 'vic', 'rex', 'sable', 'aurelia'].map((l) => <img key={l} className="pixel" src={Art.portrait(l)} alt="" />)}</div>
        <p><b>Tips:</b> pick one plan and feed it. Level your favourite hand with {T.terms.books}, evolve full lines for the bonus, or paint your party one type for flushes. <span className="kbd">Enter</span> attacks, <span className="kbd">X</span> discards, <span className="kbd">S</span> sorts.</p>
      </>
    ),
  },
];

export default function HowToPlay({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const page = PAGES[i];
  const go = (d: number) => { audio.sfx('click'); setI((x) => Math.max(0, Math.min(PAGES.length - 1, x + d))); };
  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 880 }}>
      <motion.div className="panel tut" onClick={(e) => e.stopPropagation()} initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 240, damping: 20 }}>
        <div className="tut-head"><span className="label">How to play · {i + 1}/{PAGES.length}</span><button className="btn btn-small btn-ghost" onClick={onClose}>Skip ✕</button></div>
        <AnimatePresence mode="wait">
          <motion.div key={i} className="tut-body" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.16 }}>
            <h2>{page.title}</h2>
            {page.body()}
          </motion.div>
        </AnimatePresence>
        <div className="tut-foot">
          <button className="btn" disabled={i === 0} onClick={() => go(-1)}>◀ Back</button>
          <div className="tut-dots">{PAGES.map((_, k) => <i key={k} className={k === i ? 'on' : ''} onClick={() => setI(k)} />)}</div>
          {i < PAGES.length - 1 ? <button className="btn btn-primary" onClick={() => go(1)}>Next ▶</button> : <button className="btn btn-primary" onClick={() => { audio.sfx('win'); onClose(); }}>Let's battle!</button>}
        </div>
      </motion.div>
    </div>
  );
}

const KEY = 'pocketaces.tutorialSeen';
export function tutorialSeen(): boolean { try { return !!localStorage.getItem(KEY); } catch { return true; } }
export function markTutorialSeen(): void { try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ } }
