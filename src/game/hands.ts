import type { CardView } from './pips';
import { T } from '@/content';
import type { HandType, PType } from './types';

export interface HandOptions {
  fourFingers?: boolean; // Divining Rod
  shortcut?: boolean; // Shortcut
  splash?: boolean; // Participation Trophy
}

export interface HandSet {
  family: string;
  uids: string[];
  stages: number; // distinct stages
}

export interface HandResult {
  type: HandType;
  scoring: string[]; // uids that score, in play order
  sets: HandSet[];
  flushType?: PType;
}

export const HAND_NAMES: Record<HandType, string> = {
  high: 'High Card', pair: 'Pair', twopair: 'Two Pair', three: 'Three of a Kind', straight: 'Straight', flush: 'Flush',
  fullhouse: 'Full House', four: 'Four of a Kind', straightflush: 'Straight Flush', five: 'Five of a Kind',
  flushhouse: 'Flush House', flushfive: 'Flush Five',
};

/** Flavor move names per hand, from the active ContentPack. */
export const HAND_MOVES: Record<HandType, string> = new Proxy({} as Record<HandType, string>, { get: (_, k) => T.move(String(k)) });

export const HAND_BASE: Record<HandType, { power: number; mult: number; lvPower: number; lvMult: number }> = {
  high: { power: 5, mult: 1, lvPower: 10, lvMult: 1 },
  pair: { power: 10, mult: 2, lvPower: 15, lvMult: 1 },
  twopair: { power: 20, mult: 2, lvPower: 20, lvMult: 1 },
  three: { power: 30, mult: 3, lvPower: 20, lvMult: 2 },
  straight: { power: 30, mult: 4, lvPower: 30, lvMult: 3 },
  flush: { power: 35, mult: 4, lvPower: 15, lvMult: 2 },
  fullhouse: { power: 40, mult: 4, lvPower: 25, lvMult: 2 },
  four: { power: 60, mult: 7, lvPower: 30, lvMult: 3 },
  straightflush: { power: 100, mult: 8, lvPower: 40, lvMult: 4 },
  five: { power: 120, mult: 12, lvPower: 35, lvMult: 3 },
  flushhouse: { power: 140, mult: 14, lvPower: 40, lvMult: 4 },
  flushfive: { power: 160, mult: 16, lvPower: 50, lvMult: 3 },
};

export const SECRET_HANDS: HandType[] = ['five', 'flushhouse', 'flushfive'];

export function handValues(type: HandType, level: number): { power: number; mult: number } {
  const b = HAND_BASE[type];
  return { power: b.power + b.lvPower * (level - 1), mult: b.mult + b.lvMult * (level - 1) };
}

/** Does `type` contain the sub-hand `part` (for items like Pair o' Dice: "contains a Pair")? */
export function handContains(type: HandType, part: HandType): boolean {
  const map: Record<HandType, HandType[]> = {
    high: ['high'],
    pair: ['pair'],
    twopair: ['twopair', 'pair'],
    three: ['three', 'pair'],
    straight: ['straight'],
    flush: ['flush'],
    fullhouse: ['fullhouse', 'three', 'twopair', 'pair'],
    four: ['four', 'three', 'twopair', 'pair'],
    straightflush: ['straightflush', 'straight', 'flush'],
    five: ['five', 'four', 'three', 'twopair', 'pair'],
    flushhouse: ['flushhouse', 'fullhouse', 'flush', 'three', 'twopair', 'pair'],
    flushfive: ['flushfive', 'five', 'flush', 'four', 'three', 'twopair', 'pair'],
  };
  return map[type].includes(part);
}

function findFlush(cards: CardView[], need: number): { type: PType; uids: string[] } | null {
  const counts = new Map<PType, CardView[]>();
  for (const c of cards) for (const t of c.types) {
    if (!counts.has(t)) counts.set(t, []);
    counts.get(t)!.push(c);
  }
  let best: { type: PType; uids: string[] } | null = null;
  for (const [t, cs] of counts) {
    if (cs.length >= need && (!best || cs.length > best.uids.length)) best = { type: t, uids: cs.map((c) => c.card.uid) };
  }
  return best;
}

function findStraight(cards: CardView[], need: number, shortcut: boolean): string[] | null {
  const byTier = new Map<number, CardView[]>();
  for (const c of cards) {
    if (c.tier == null) continue;
    const ts = c.tier === 14 ? [14, 1] : [c.tier];
    for (const t of ts) {
      if (!byTier.has(t)) byTier.set(t, []);
      byTier.get(t)!.push(c);
    }
  }
  const tiers = [...byTier.keys()].sort((a, b) => a - b);
  // walk sequences allowing gap of 1 when shortcut
  let best: number[] | null = null;
  for (let i = 0; i < tiers.length; i++) {
    const seq = [tiers[i]];
    for (let j = i + 1; j < tiers.length; j++) {
      const gap = tiers[j] - seq[seq.length - 1];
      if (gap === 1 || (shortcut && gap === 2)) seq.push(tiers[j]);
      else break;
    }
    if (seq.length >= need && (!best || seq.length > best.length)) best = seq;
  }
  if (!best) return null;
  const used = new Set<string>();
  for (const t of best) {
    const c = byTier.get(t)!.find((x) => !used.has(x.card.uid));
    if (c) used.add(c.card.uid);
  }
  return [...used];
}

export function evaluateHand(played: CardView[], opts: HandOptions = {}): HandResult {
  const fossils = played.filter((c) => c.family == null);
  const cards = played.filter((c) => c.family != null);
  const need = opts.fourFingers ? 4 : 5;
  const groups = new Map<string, CardView[]>();
  for (const c of cards) {
    if (!groups.has(c.family!)) groups.set(c.family!, []);
    groups.get(c.family!)!.push(c);
  }
  const sizes = [...groups.values()].sort((a, b) => b.length - a.length);
  const flush = cards.length >= need ? findFlush(cards, need) : null;
  const straight = cards.length >= need ? findStraight(cards, need, !!opts.shortcut) : null;

  const mkSet = (cs: CardView[]): HandSet => ({
    family: cs[0].family!,
    uids: cs.map((c) => c.card.uid),
    stages: new Set(cs.map((c) => c.stage)).size,
  });

  let type: HandType = 'high';
  let scoring: string[] = [];
  let sets: HandSet[] = [];
  const g0 = sizes[0];
  const g1 = sizes[1];

  const allFlush = (uids: string[]) => flush && uids.every((u) => flush.uids.includes(u));

  if (g0 && g0.length >= 5) {
    sets = [mkSet(g0)];
    scoring = g0.map((c) => c.card.uid);
    type = allFlush(scoring) ? 'flushfive' : 'five';
  } else if (g0 && g0.length >= 3 && g1 && g1.length >= 2 && (!flush || !allFlush([...g0, ...g1].map((c) => c.card.uid)) ? true : true)) {
    const uids = [...g0, ...g1].map((c) => c.card.uid);
    const isFlushHouse = allFlush(uids);
    if (isFlushHouse) {
      type = 'flushhouse'; scoring = uids; sets = [mkSet(g0), mkSet(g1)];
    } else if (g0.length >= 4) {
      type = 'four'; scoring = g0.map((c) => c.card.uid); sets = [mkSet(g0)];
    } else {
      type = 'fullhouse'; scoring = uids; sets = [mkSet(g0), mkSet(g1)];
    }
  } else if (straight && flush && straight.filter((u) => flush.uids.includes(u)).length >= need) {
    type = 'straightflush';
    scoring = straight.filter((u) => flush.uids.includes(u));
  } else if (g0 && g0.length >= 4) {
    type = 'four'; scoring = g0.map((c) => c.card.uid); sets = [mkSet(g0)];
  } else if (flush) {
    type = 'flush'; scoring = flush.uids;
  } else if (straight) {
    type = 'straight'; scoring = straight;
  } else if (g0 && g0.length === 3) {
    type = 'three'; scoring = g0.map((c) => c.card.uid); sets = [mkSet(g0)];
  } else if (g0 && g0.length === 2 && g1 && g1.length === 2) {
    type = 'twopair'; scoring = [...g0, ...g1].map((c) => c.card.uid); sets = [mkSet(g0), mkSet(g1)];
  } else if (g0 && g0.length === 2) {
    type = 'pair'; scoring = g0.map((c) => c.card.uid); sets = [mkSet(g0)];
  } else if (cards.length > 0) {
    type = 'high';
    const top = [...cards].sort((a, b) => (b.tier ?? 0) - (a.tier ?? 0) || b.basePower - a.basePower)[0];
    scoring = [top.card.uid];
  }

  let scoringSet = new Set(scoring);
  for (const f of fossils) scoringSet.add(f.card.uid);
  if (opts.splash) scoringSet = new Set(played.map((c) => c.card.uid));
  const ordered = played.filter((c) => scoringSet.has(c.card.uid)).map((c) => c.card.uid);
  return { type, scoring: ordered, sets, flushType: flush && (type === 'flush' || type === 'straightflush' || type === 'flushhouse' || type === 'flushfive') ? flush.type : undefined };
}
