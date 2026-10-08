// Run state machine: all transitions mutate the RunState in place. The UI wraps calls in a store update.
import { fruitDef, FRUITS, consumeFruit, hasFruit } from './fruits';
import { consumableDef } from './consumables';
import { buildDeck, deckDef } from './decks';
import { evaluateHand, HAND_NAMES } from './hands';
import { addCard, addItem, addToBag, applyDiscount, canAddItem, canAddToBag, cloneCard, evolveCard, itemPrice, makeCard, makeConsumable, makeItem, randomConsumable, randomItem, randomPip, removeCard } from './inventory';
import { itemDef, itemHooks, sumMod, chance } from './items';
import { availableKeyItems, keyItemDef } from './keyitems';
import { ELITE_ORDER, KINGPINS, LEADERS, LEGEND, makeLeader, makeTrainer, makeWild, opponentName, REGIONS } from './opponents';
import { species, slotNumber, viewCard } from './pips';
import { T } from '@/content';
import { randomSeed, Rng, uid } from './rng';
import { bossActive, handOptions, scoreHand, type ScoreResult } from './scoring';
import { ALL_TYPES, type BattleState, type Card, type ConsumableInstance, type Difficulty, type HandType, type ItemInstance, type Opponent, type PackKind, type RunState, type ShopState } from './types';

export const SAVE_VERSION = 2;

function rngOf(run: RunState): Rng { return new Rng(run.rng); }
function commit(run: RunState, rng: Rng) { run.rng = rng.state; }

export function emptyHandRecord(v: number): Record<HandType, number> {
  const o = {} as Record<HandType, number>;
  for (const h of Object.keys(HAND_NAMES) as HandType[]) o[h] = v;
  return o;
}

export function newRun(starter: string, difficulty: Difficulty, seed = randomSeed()): RunState {
  const def = deckDef(starter);
  const rng = Rng.fromSeed(seed, 1);
  const leaders: string[] = [];
  for (let r = 0; r < 8; r++) leaders.push(rng.pick(LEADERS.filter((l) => l.region === r)).id);
  const run: RunState = {
    version: SAVE_VERSION, seed, rng: rng.state, starter, difficulty, phase: 'select', region: 0, battleIndex: 0, leagueRound: 0,
    money: 4, handsBase: 4, discardsBase: difficulty === 'ironman' ? 2 : 3, handSizeBase: 8, itemSlots: 5, bagSlots: 2,
    deck: [], items: [], bag: [], keyItems: [], fruits: [], handLevels: emptyHandRecord(1), handPlays: emptyHandRecord(0),
    leaders, champion: rng.pick(KINGPINS), eliteOrder: [...ELITE_ORDER], badges: [],
    pendingFruitPacks: [], skippedThisRegion: [false, false, false],
    stats: { handsPlayed: 0, cardsPlayed: 0, cardsDiscarded: 0, bestDamage: 0, pipsCaught: 0, moneyEarned: 0, battlesWon: 0, skips: 0, itemsBought: 0 },
    bossRerolledThisRegion: false, endless: false, interestCap: 5, unlockQueue: [],
  };
  run.deck = buildDeck(def, rng);
  def.apply?.(run);
  commit(run, rng);
  generatePreview(run);
  return run;
}

export function currentRegionName(run: RunState): string {
  return REGIONS[Math.min(run.region, 9)].name;
}

export function generatePreview(run: RunState): void {
  const rng = rngOf(run);
  if (run.region >= 9 || run.endless) {
    run.previewOpponents = [makeLeader(run, rng, LEGEND)];
  } else if (run.region === 8) {
    const id = run.battleIndex < 4 ? run.eliteOrder[run.battleIndex] : run.champion;
    run.previewOpponents = [makeLeader(run, rng, id)];
  } else {
    run.previewOpponents = [makeWild(run, rng), makeTrainer(run, rng), makeLeader(run, rng, run.leaders[run.region])];
  }
  commit(run, rng);
}

export function currentOpponent(run: RunState): Opponent | undefined {
  if (!run.previewOpponents) return undefined;
  if (run.region >= 8) return run.previewOpponents[0];
  return run.previewOpponents[run.battleIndex];
}

export function isLeague(run: RunState): boolean { return run.region >= 8; }

export function rerollBoss(run: RunState, free = false): string | null {
  if (run.region >= 8) return `No ${T.terms.boss} here`;
  const hasBalloon = run.keyItems.includes('balloon');
  if (!free && !hasBalloon) {
    if (!run.keyItems.includes('roadatlas')) return `You need a ${T.keyItem('roadatlas')}`;
    if (run.bossRerolledThisRegion) return 'Already rerolled this region';
    if (run.money < 10) return 'Not enough money';
    run.money -= 10;
    run.bossRerolledThisRegion = true;
  }
  const rng = rngOf(run);
  const options = LEADERS.filter((l) => l.region === run.region && l.id !== run.leaders[run.region]);
  run.leaders[run.region] = rng.pick(options).id;
  commit(run, rng);
  const r2 = rngOf(run);
  run.previewOpponents![2] = makeLeader(run, r2, run.leaders[run.region]);
  commit(run, r2);
  return null;
}

// ---------------- battle ----------------

export function handSize(run: RunState): number {
  let n = run.handSizeBase + sumMod(run, 'handSizeMod');
  if (run.battle) {
    const b = run.battle;
    if (bossActive(run, b, 'deepfreeze')) n -= 1;
    if (bossActive(run, b, 'squeeze')) n -= b.attacksPlayed;
  }
  return Math.max(1, n);
}

export function startBattle(run: RunState): void {
  const opp = currentOpponent(run);
  if (!opp) return;
  const rng = rngOf(run);
  for (const c of run.deck) { c.faceDown = false; c.frozen = false; c.tired = false; }
  const hooks = itemHooks(run);
  let hands = run.handsBase + sumMod(run, 'handsMod');
  let discards = run.discardsBase + sumMod(run, 'discardsMod');
  const b: BattleState = {
    opponent: opp, hp: opp.hp, damage: 0, handsLeft: 0, discardsLeft: 0, handSize: 8, drawPile: [], hand: [], discardPile: [], played: [],
    handTypesPlayed: [], attacksPlayed: 0, selected: [], bossDisabled: hooks.some((h) => h.def.id === 'musicbox'), playedThisBattle: [], log: [],
  };
  run.battle = b;
  if (run.starter === 'apex') b.hp = opp.hp * 2;
  if (bossActive(run, b, 'nodiscards') || bossActive(run, b, 'deepfreeze')) discards = 0;
  if (bossActive(run, b, 'oneshot')) hands = 1;
  if (bossActive(run, b, 'spectacle')) hands += 2;
  b.handsLeft = Math.max(1, hands);
  b.discardsLeft = Math.max(0, discards);
  if (hasFruit(run, 'bighandbanana')) { consumeFruit(run, 'bighandbanana'); run.handSizeBase += 3; b.log.push(`${T.fruit('bighandbanana')}: +3 hand size`); (b as BattleState & { bigHand?: boolean }).bigHand = true; }
  b.weather = rng.pick(ALL_TYPES);
  for (const h of hooks) {
    if (h.def.id === 'tarpit') { const f = makeCard(rng.pick(run.deck.map((c) => c.speciesId)), { ability: 'fossil' }); run.deck.push(f); b.log.push(`${T.item('tarpit')}: a Fossil joined the deck`); }
    if (h.def.id === 'replicator' && run.bag.length && canAddToBag(run)) { addToBag(run, makeConsumable(run.bag[0].defId)); b.log.push(`${T.item('replicator')} duplicated ${consumableDef(run.bag[0].defId).name}`); }
    const m = h.def.onBattleStart?.(run, h.inst, rng);
    if (m) b.log.push(m);
  }
  b.handSize = handSize(run);
  b.drawPile = rng.shuffle(run.deck.map((c) => c.uid));
  commit(run, rng);
  run.phase = 'battle';
  draw(run, b.handSize);
}

export function draw(run: RunState, n: number): string[] {
  const b = run.battle!;
  const rng = rngOf(run);
  const drawn: string[] = [];
  for (let i = 0; i < n && b.drawPile.length; i++) {
    const u = b.drawPile.shift()!;
    const c = run.deck.find((x) => x.uid === u)!;
    c.faceDown = false;
    if (bossActive(run, b, 'static') && rng.chance(0.25)) c.faceDown = true;
    if ((bossActive(run, b, 'veilfinals') || bossActive(run, b, 'hex')) && species(c.speciesId).final && species(c.speciesId).stage > 0) c.faceDown = true;
    b.hand.push(u);
    drawn.push(u);
  }
  commit(run, rng);
  return drawn;
}

export function toggleSelect(run: RunState, cardUid: string): void {
  const b = run.battle!;
  const i = b.selected.indexOf(cardUid);
  if (i >= 0) b.selected.splice(i, 1);
  else if (b.selected.length < 5) {
    const c = run.deck.find((x) => x.uid === cardUid);
    if (c && !c.frozen) b.selected.push(cardUid);
  }
}

export function canPlaySelected(run: RunState): string | null {
  const b = run.battle;
  if (!b || b.played.length) return 'Busy';
  if (b.selected.length === 0) return 'Select cards';
  if (b.handsLeft <= 0) return 'No attacks left';
  const views = b.selected.map((u) => viewCard(run.deck.find((c) => c.uid === u)!));
  const hand = evaluateHand(views, handOptions(run));
  if (bossActive(run, b, 'fivecards') && b.selected.length !== 5) return `${T.leader(b.opponent.ruleFrom ?? b.opponent.id).ruleName}: play exactly 5 cards`;
  if ((bossActive(run, b, 'norepeat') || bossActive(run, b, 'cap40')) && b.handTypesPlayed.includes(hand.type)) return `${HAND_NAMES[hand.type]} already played`;
  if (bossActive(run, b, 'onetype') && b.firstHandType && b.firstHandType !== hand.type) return `${T.leader(b.opponent.ruleFrom ?? b.opponent.id).ruleName}: must play ${HAND_NAMES[b.firstHandType]}`;
  for (const h of itemHooks(run)) { const r = h.def.canPlay?.(run, b, hand); if (r) return r; }
  return null;
}


export function playHand(run: RunState): ScoreResult | null {
  const b = run.battle!;
  if (canPlaySelected(run)) return null;
  const played = b.selected.map((u) => viewCard(run.deck.find((c) => c.uid === u)!));
  for (const c of played) c.card.faceDown = false;
  b.played = [...b.selected];
  b.hand = b.hand.filter((u) => !b.selected.includes(u));
  b.selected = [];
  const result = scoreHand(run, b, played, b.hand);
  // apply
  b.damage += result.damage;
  b.handsLeft -= 1;
  b.attacksPlayed += 1;
  b.lastHandType = result.hand.type;
  b.handTypesPlayed.push(result.hand.type);
  if (!b.firstHandType) b.firstHandType = result.hand.type;
  run.handPlays[result.hand.type] = (run.handPlays[result.hand.type] ?? 0) + 1;
  run.stats.handsPlayed += 1;
  run.stats.cardsPlayed += played.length;
  if (result.damage > run.stats.bestDamage) { run.stats.bestDamage = result.damage; run.stats.bestHand = result.hand.type; }
  const rng = rngOf(run);
  const hooks = itemHooks(run);
  for (const h of hooks) {
    h.def.onAttackEnd?.(run, h.inst, { run, battle: b, hand: result.hand, played, scoring: played.filter((c) => result.hand.scoring.includes(c.card.uid)), held: [], rng, power: 0, mult: 0, isFinalAttack: b.handsLeft === 0, isFirstAttack: b.attacksPlayed === 1, superEffective: new Set(result.superEffective), typeCount: new Map() });
    if (h.def.id === 'studynotes' && chance(run, rng, 4)) { run.handLevels[result.hand.type] += 1; b.log.push(`${T.item('studynotes')}: ${HAND_NAMES[result.hand.type]} leveled up!`); result.events.push({ source: { kind: 'item', uid: h.owner.uid }, msg: 'Level up!', total: { power: result.power, mult: result.mult } }); }
    if (h.def.id === 'photocopier' && b.attacksPlayed === 1 && played.length === 1) { addCard(run, cloneCard(played[0].card)); b.log.push(`${T.item('photocopier')} copied ${played[0].name}`); }
  }
  run.items = run.items.filter((i) => !i.state.destroy);
  if (hasFruit(run, 'tipcoconut')) run.money += 1;
  if (bossActive(run, b, 'toll')) run.money -= played.length;
  for (const u of result.destroyed) removeCard(run, u);
  for (const c of played) { c.card.tired = false; if (bossActive(run, b, 'tirecards')) b.playedThisBattle.push(c.card.uid); }
  commit(run, rng);
  return result;
}

/** Called after the scoring animation: clean up the table, apply post-attack boss effects, draw, check win/lose. */
export function finishAttack(run: RunState): void {
  const b = run.battle!;
  const rng = rngOf(run);
  for (const u of b.played) if (run.deck.some((c) => c.uid === u)) b.discardPile.push(u);
  b.played = [];
  if (bossActive(run, b, 'tirecards')) for (const u of b.playedThisBattle) { const c = run.deck.find((x) => x.uid === u); if (c) c.tired = true; }
  if (b.damage >= b.hp) { commit(run, rng); winBattle(run); return; }
  if (b.handsLeft <= 0) {
    commit(run, rng);
    const sash = run.items.find((i) => i.defId === 'safetynet' && !i.disabled);
    if (sash && b.damage >= b.hp * 0.25) { run.items = run.items.filter((i) => i.uid !== sash.uid); b.log.push(`${T.item('safetynet')} held on!`); b.sashUsed = true; winBattle(run); return; }
    b.lost = true; run.phase = 'gameover'; return;
  }
  if (bossActive(run, b, 'regrow')) b.damage = Math.max(0, b.damage - Math.floor(b.opponent.hp * 0.15));
  if (bossActive(run, b, 'pumpup')) b.hp += Math.floor(b.opponent.hp * 0.15);
  if (bossActive(run, b, 'frostbite')) { const cands = rng.shuffle(b.hand.filter((u) => !run.deck.find((c) => c.uid === u)!.frozen)).slice(0, 2); for (const u of cands) run.deck.find((c) => c.uid === u)!.frozen = true; }
  if (bossActive(run, b, 'purge')) {
    const top = [...b.hand].map((u) => viewCard(run.deck.find((c) => c.uid === u)!)).sort((x, y) => y.basePower - x.basePower).slice(0, 2).map((v) => v.card.uid);
    b.hand = b.hand.filter((u) => !top.includes(u)); b.discardPile.push(...top);
  }
  if (bossActive(run, b, 'shuffleitems')) { rng.shuffle(run.items); for (const i of run.items) i.faceDown = false; if (run.items.length) { const it = rng.pick(run.items); it.faceDown = true; } }
  if (bossActive(run, b, 'hex')) { for (const i of run.items) i.disabled = false; if (run.items.length) rng.pick(run.items).disabled = true; }
  b.handSize = handSize(run);
  commit(run, rng);
  const want = bossActive(run, b, 'slowdraw') ? Math.min(3, Math.max(0, b.handSize - b.hand.length)) : Math.max(0, b.handSize - b.hand.length);
  draw(run, want);
  // disabled items apply to scoring via inst.disabled; faceDown (shuffleitems rule) also disables
  for (const i of run.items) if (i.faceDown) i.disabled = true; else if (!bossActive(run, b, 'hex')) i.disabled = false;
}

export function discardSelected(run: RunState): string | null {
  const b = run.battle!;
  if (b.played.length) return 'Busy';
  if (b.selected.length === 0) return 'Select cards';
  if (b.discardsLeft <= 0) return 'No discards left';
  const rng = rngOf(run);
  const cards = b.selected.map((u) => viewCard(run.deck.find((c) => c.uid === u)!));
  b.hand = b.hand.filter((u) => !b.selected.includes(u));
  b.discardPile.push(...b.selected);
  b.selected = [];
  b.discardsLeft -= 1;
  run.stats.cardsDiscarded += cards.length;
  for (const c of cards) {
    c.card.faceDown = false;
    if (c.card.ribbon === 'amethyst' && canAddToBag(run)) addToBag(run, randomConsumable(run, rng, 'tonic'));
  }
  for (const h of itemHooks(run)) h.def.onDiscard?.(run, h.inst, cards, rng);
  run.items = run.items.filter((i) => !i.state.destroy);
  commit(run, rng);
  const want = bossActive(run, b, 'slowdraw') ? Math.min(3, Math.max(0, b.handSize - b.hand.length)) : Math.max(0, b.handSize - b.hand.length);
  draw(run, want);
  return null;
}

export function winBattle(run: RunState): void {
  const b = run.battle!;
  b.won = true;
  const rng = rngOf(run);
  const opp = b.opponent;
  const lines: { label: string; amount: number }[] = [];
  lines.push({ label: opp.kind === 'wild' ? `${T.terms.wild} Encounter won` : `Defeated ${opponentName(opp)}`, amount: opp.reward });
  const liveWire = run.starter === 'spark';
  if (b.handsLeft > 0) lines.push({ label: `${b.handsLeft} unused attack${b.handsLeft > 1 ? 's' : ''}`, amount: b.handsLeft * (liveWire ? 2 : 1) });
  if (liveWire && b.discardsLeft > 0) lines.push({ label: `${b.discardsLeft} unused discards`, amount: b.discardsLeft });
  if (!liveWire) {
    const interest = Math.min(run.interestCap, Math.floor(Math.max(0, run.money) / 5));
    if (interest > 0) lines.push({ label: `Interest (${T.money(1)} per ${T.money(5)}, max ${T.money(run.interestCap)})`, amount: interest });
  }
  for (const u of b.hand) { const c = run.deck.find((x) => x.uid === u)!; if (c.ability === 'scavenger') lines.push({ label: `${species(c.speciesId).name}'s ${T.ability('scavenger')}`, amount: 3 }); }
  for (const h of itemHooks(run)) {
    const r = h.def.onBattleEnd?.(run, h.inst, rng);
    if (r?.money) lines.push({ label: itemDef(h.def.id).name, amount: r.money });
    if (r?.destroy) { h.owner.state.destroy = 1; b.log.push(r.msg ?? ''); }
    if (h.def.id === 'nursery') {
      const cands = run.deck.filter((c) => species(c.speciesId).evolvesTo.length && c.ability !== 'fossil');
      if (cands.length) { const c = rng.pick(cands); const from = species(c.speciesId).name; evolveCard(run, c, rng); b.log.push(`${T.item('nursery')}: ${from} evolved into ${species(c.speciesId).name}!`); }
    }
  }
  run.items = run.items.filter((i) => !i.state.destroy);
  for (const u of b.hand) { const c = run.deck.find((x) => x.uid === u)!; if (c.ribbon === 'sapphire' && b.lastHandType && canAddToBag(run)) addToBag(run, makeConsumable(`book_${b.lastHandType}`)); }
  if (opp.kind !== 'wild' && opp.kind !== 'trainer') {
    if (hasFruit(run, 'bountylychee')) { consumeFruit(run, 'bountylychee'); lines.push({ label: T.fruit('bountylychee'), amount: 25 }); }
    if (opp.kind === 'boss') run.badges.push(opp.id);
    run.unlockQueue.push('beat:' + opp.id);
  }
  const total = lines.reduce((a, l) => a + l.amount, 0);
  run.money += total;
  run.stats.moneyEarned += total;
  run.stats.battlesWon += 1;
  if ((b as BattleState & { bigHand?: boolean }).bigHand) run.handSizeBase -= 3;
  for (const i of run.items) { i.disabled = false; i.faceDown = false; }
  for (const c of run.deck) { c.faceDown = false; c.frozen = false; c.tired = false; }
  run.cashout = { lines, total };
  commit(run, rng);
  if (opp.kind === 'kingpin') { run.phase = 'win'; return; }
  run.phase = 'cashout';
}

export function toShop(run: RunState): void {
  run.battle = undefined;
  run.cashout = undefined;
  generateShop(run);
  run.phase = 'shop';
}

// ---------------- select / skip ----------------

export function skipBattle(run: RunState): string | null {
  if (run.region >= 8 || run.battleIndex >= 2) return 'Cannot skip';
  const rng = rngOf(run);
  const fruit = rng.pick(FRUITS);
  run.stats.skips += 1;
  run.skippedThisRegion[run.battleIndex] = true;
  if (hasFruit(run, 'passionfruit')) run.money += 5;
  commit(run, rng);
  earnFruit(run, fruit.id);
  run.battleIndex += 1;
  return null;
}

export function earnFruit(run: RunState, id: string): void {
  const def = fruitDef(id);
  const copies = consumeFruit(run, 'twinpeach') ? 2 : 1;
  const rng = rngOf(run);
  for (let i = 0; i < copies; i++) {
    run.unlockQueue.push('fruit:' + id);
    if (def.immediate) {
      switch (id) {
        case 'doubleplum': run.money += Math.min(40, Math.max(0, run.money)); break;
        case 'mentorquince': { const h = rng.pick(Object.keys(HAND_NAMES) as HandType[]); run.handLevels[h] += 3; run.toast = `${HAND_NAMES[h]} +3 levels!`; break; }
        case 'shufflestarfruit': rerollBoss(run, true); break;
        case 'giftgourd': for (let k = 0; k < 2; k++) if (canAddItem(run)) addItem(run, randomItem(run, rng, 'common')); break;
        default: if (def.pack) run.pendingFruitPacks.push(def.pack);
      }
    } else run.fruits.push(id);
  }
  commit(run, rng);
  run.toast = `${def.name}: ${def.desc}`;
}

export function openPendingPack(run: RunState): boolean {
  const k = run.pendingFruitPacks.shift();
  if (!k) return false;
  openPack(run, k, true);
  return true;
}

// ---------------- shop ----------------

export function rerollBase(run: RunState): number {
  let c = 5;
  if (run.keyItems.includes('scooter')) c -= 2;
  if (run.keyItems.includes('jetscooter')) c -= 2;
  return Math.max(0, c);
}

export function generateShop(run: RunState): void {
  const rng = rngOf(run);
  const slots = 2 + (run.keyItems.includes('extrashelf') ? 1 : 0) + (run.keyItems.includes('secondstall') ? 1 : 0);
  const shop: ShopState = { cards: [], packs: [], keyItems: [], rerollCost: rerollBase(run), rerolls: 0 };
  if (consumeFruit(run, 'spinquat')) shop.rerollCost = 0;
  if (consumeFruit(run, 'freerollfig')) shop.free = true;
  fillShopCards(run, shop, slots, rng);
  const packKinds: PackKind[] = ['lantern', 'lantern', 'brightlantern', 'grandlantern', 'tonickit', 'tonickit', 'bigtonickit', 'bookstack', 'bookstack', 'bookcrate', 'mysterybox', 'bigmysterybox'];
  for (let i = 0; i < 2; i++) { const k = rng.pick(packKinds); shop.packs.push({ uid: uid('p'), kind: k, price: shop.free ? 0 : applyDiscount(run, packPrice(k)) }); }
  const nKeys = 1 + (consumeFruit(run, 'keylime') ? 1 : 0);
  const avail = rng.shuffle(availableKeyItems(run));
  for (let i = 0; i < nKeys && i < avail.length; i++) shop.keyItems.push({ id: avail[i].id, price: applyDiscount(run, 10) });
  run.shop = shop;
  commit(run, rng);
}

function fillShopCards(run: RunState, shop: ShopState, slots: number, rng: Rng): void {
  const tonicW = run.keyItems.includes('tonicbar') ? 4 : run.keyItems.includes('tonicbelt') ? 2 : 1;
  const bookW = run.keyItems.includes('library') ? 4 : run.keyItems.includes('bookshelf') ? 2 : 1;
  const pipW = run.keyItems.includes('swapmeet') ? 1 : 0;
  const legW = run.starter === 'shade' ? 0.6 : 0;
  const fruitRarity = consumeFruit(run, 'highmelon') ? 'rare' : consumeFruit(run, 'bumppumpkin') ? 'uncommon' : undefined;
  const fruitEdition = consumeFruit(run, 'duskdate') ? 'shadow' : consumeFruit(run, 'glintgrape') ? 'shiny' : consumeFruit(run, 'prismlime') ? 'holo' : consumeFruit(run, 'tinfoilpear') ? 'foil' : undefined;
  for (let i = 0; i < slots; i++) {
    const kind = rng.weighted(['item', 'tonic', 'book', 'pip', 'relic'] as const, (k) => ({ item: 6, tonic: 1.6 * tonicW, book: 1.4 * bookW, pip: pipW, relic: legW })[k]);
    const free = shop.free;
    if (kind === 'item' || (i === 0 && (fruitRarity || fruitEdition))) {
      const it = randomItem(run, rng, i === 0 ? fruitRarity : undefined, i === 0 ? fruitEdition : undefined);
      shop.cards.push({ uid: uid('s'), kind: 'item', item: it, price: free ? 0 : itemPrice(run, it) });
    } else if (kind === 'pip') {
      const c = randomPip(run, rng);
      shop.cards.push({ uid: uid('s'), kind: 'pip', card: c, price: free ? 0 : applyDiscount(run, 3 + Math.floor(species(c.speciesId).tier / 4)) });
    } else {
      const c = randomConsumable(run, rng, kind);
      shop.cards.push({ uid: uid('s'), kind: 'consumable', consumable: c, price: free ? 0 : applyDiscount(run, consumableDef(c.defId).cost) });
    }
  }
}

export function packPrice(k: PackKind): number {
  return { lantern: 4, brightlantern: 6, grandlantern: 8, tonickit: 4, bigtonickit: 8, bookstack: 4, bookcrate: 8, mysterybox: 4, bigmysterybox: 8 }[k];
}
export function packInfo(k: PackKind): { name: string; count: number; picks: number; desc: string } {
  const t = T.terms;
  const shape = {
    lantern: { count: 3, picks: 1, desc: `Catch 1 of 3 ${t.pips}` },
    brightlantern: { count: 5, picks: 1, desc: `Catch 1 of 5 ${t.pips}` },
    grandlantern: { count: 5, picks: 2, desc: `Catch 2 of 5 ${t.pips}` },
    tonickit: { count: 3, picks: 1, desc: `Pick 1 of 3 ${t.tonics}` },
    bigtonickit: { count: 5, picks: 2, desc: `Pick 2 of 5 ${t.tonics}` },
    bookstack: { count: 3, picks: 1, desc: `Pick 1 of 3 ${t.books}` },
    bookcrate: { count: 5, picks: 2, desc: `Pick 2 of 5 ${t.books}` },
    mysterybox: { count: 2, picks: 1, desc: 'Pick 1 of 2 Items' },
    bigmysterybox: { count: 4, picks: 2, desc: 'Pick 2 of 4 Items' },
  }[k];
  return { name: T.pack(k), ...shape };
}

/** True for the creature packs (the lanterns). */
export function isPipPack(k: PackKind): boolean { return k === 'lantern' || k === 'brightlantern' || k === 'grandlantern'; }

export function reroll(run: RunState): string | null {
  const s = run.shop!;
  if (run.money < s.rerollCost) return 'Not enough money';
  run.money -= s.rerollCost;
  s.rerolls += 1;
  s.rerollCost += 1;
  const rng = rngOf(run);
  const slots = s.cards.length;
  s.cards = [];
  fillShopCards(run, s, slots, rng);
  commit(run, rng);
  return null;
}

export function buyShopCard(run: RunState, cardUid: string): string | null {
  const s = run.shop!;
  const sc = s.cards.find((c) => c.uid === cardUid);
  if (!sc || sc.sold) return 'Gone';
  if (run.money < sc.price) return 'Not enough money';
  if (sc.kind === 'item') { if (!canAddItem(run)) return 'No room for Items'; addItem(run, sc.item!); run.unlockQueue.push('item:' + sc.item!.defId); }
  if (sc.kind === 'consumable') { if (!canAddToBag(run)) return 'Bag is full'; addToBag(run, sc.consumable!); run.unlockQueue.push('cons:' + sc.consumable!.defId); }
  if (sc.kind === 'pip') addCard(run, sc.card!);
  run.money -= sc.price;
  run.stats.itemsBought += 1;
  sc.sold = true;
  return null;
}

export function buyAndUseConsumable(run: RunState, cardUid: string): string | null {
  const s = run.shop!;
  const sc = s.cards.find((c) => c.uid === cardUid);
  if (!sc || sc.sold || sc.kind !== 'consumable') return 'Gone';
  const def = consumableDef(sc.consumable!.defId);
  if (def.targets > 0) return 'Needs selected cards';
  const r = def.canUse?.(run, []);
  if (r) return r;
  if (run.money < sc.price) return 'Not enough money';
  run.money -= sc.price;
  sc.sold = true;
  const rng = rngOf(run);
  const msg = def.use(run, [], rng);
  commit(run, rng);
  run.lastUsedConsumable = def.id;
  run.unlockQueue.push('cons:' + def.id);
  if (msg) run.toast = msg;
  return null;
}

export function buyKeyItem(run: RunState, id: string): string | null {
  const s = run.shop!;
  const k = s.keyItems.find((x) => x.id === id);
  if (!k || k.sold) return 'Gone';
  if (run.money < k.price) return 'Not enough money';
  run.money -= k.price;
  k.sold = true;
  run.keyItems.push(id);
  keyItemDef(id).apply?.(run);
  run.unlockQueue.push('key:' + id);
  return null;
}

export function sellItem(run: RunState, itemUid: string): string | null {
  const it = run.items.find((i) => i.uid === itemUid);
  if (!it) return 'Gone';
  if (it.eternal) return 'Eternal items cannot be sold';
  run.money += it.sellValue;
  run.items = run.items.filter((i) => i.uid !== itemUid);
  return null;
}

export function sellConsumable(run: RunState, cUid: string): string | null {
  const c = run.bag.find((i) => i.uid === cUid);
  if (!c) return 'Gone';
  run.money += Math.max(1, Math.floor(consumableDef(c.defId).cost / 2));
  run.bag = run.bag.filter((i) => i.uid !== cUid);
  return null;
}

export function moveItem(run: RunState, itemUid: string, dir: -1 | 1): void {
  const i = run.items.findIndex((x) => x.uid === itemUid);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= run.items.length) return;
  [run.items[i], run.items[j]] = [run.items[j], run.items[i]];
}

export function buyPack(run: RunState, packUid: string): string | null {
  const s = run.shop!;
  const p = s.packs.find((x) => x.uid === packUid);
  if (!p || p.sold) return 'Gone';
  if (run.money < p.price) return 'Not enough money';
  run.money -= p.price;
  p.sold = true;
  openPack(run, p.kind, false);
  return null;
}

export function openPack(run: RunState, kind: PackKind, free: boolean): void {
  const rng = rngOf(run);
  const info = packInfo(kind);
  const choices: NonNullable<RunState['pack']>['choices'] = [];
  const seen = new Set<string>();
  const unique = (mk: () => ConsumableInstance): ConsumableInstance => { let c = mk(); for (let t = 0; t < 6 && seen.has(c.defId); t++) c = mk(); seen.add(c.defId); return c; };
  const uniqueItem = (mk: () => ItemInstance): ItemInstance => { let c = mk(); for (let t = 0; t < 6 && seen.has(c.defId + (c.variant ?? '')); t++) c = mk(); seen.add(c.defId + (c.variant ?? '')); return c; };
  for (let i = 0; i < info.count; i++) {
    if (kind === 'lantern' || kind === 'brightlantern' || kind === 'grandlantern') choices.push({ uid: uid('k'), card: randomPip(run, rng, { shinyChance: kind === 'grandlantern' ? 0.1 : 0.05 }) });
    else if (kind === 'tonickit' || kind === 'bigtonickit') choices.push({ uid: uid('k'), consumable: unique(() => randomConsumable(run, rng, run.starter === 'shade' && rng.chance(0.15) ? 'relic' : 'tonic')) });
    else if (kind === 'bookstack' || kind === 'bookcrate') {
      if (i === 0 && run.keyItems.includes('library')) {
        const most = (Object.entries(run.handPlays) as [HandType, number][]).sort((a, b) => b[1] - a[1])[0];
        choices.push({ uid: uid('k'), consumable: makeConsumable(`book_${most ? most[0] : 'pair'}`) });
      } else choices.push({ uid: uid('k'), consumable: unique(() => randomConsumable(run, rng, 'book')) });
    } else choices.push({ uid: uid('k'), item: uniqueItem(() => randomItem(run, rng)) });
  }
  run.pack = { kind, picksLeft: info.picks, choices, free };
  run.phase = 'pack';
  commit(run, rng);
}

export function pickFromPack(run: RunState, choiceUid: string, selectedCards: string[] = []): string | null {
  const p = run.pack!;
  const ch = p.choices.find((c) => c.uid === choiceUid);
  if (!ch) return 'Gone';
  if (ch.card) addCard(run, ch.card);
  else if (ch.item) { if (!canAddItem(run)) return 'No room for Items'; addItem(run, ch.item); run.unlockQueue.push('item:' + ch.item.defId); }
  else if (ch.consumable) {
    const def = consumableDef(ch.consumable.defId);
    // Use immediately if no targets needed and bag is full; else add to bag
    if (!canAddToBag(run)) {
      if (def.targets > 0 && !run.battle) return 'Bag is full';
      const r = def.canUse?.(run, []); if (r) return r;
      if (def.targets > 0) return 'Bag is full';
      const rng = rngOf(run); const msg = def.use(run, [], rng); commit(run, rng); if (msg) run.toast = msg; run.lastUsedConsumable = def.id;
    } else addToBag(run, ch.consumable);
    run.unlockQueue.push('cons:' + ch.consumable.defId);
  }
  p.choices = p.choices.filter((c) => c.uid !== choiceUid);
  p.picksLeft -= 1;
  if (p.picksLeft <= 0 || p.choices.length === 0) closePack(run);
  void selectedCards;
  return null;
}

export function closePack(run: RunState): void {
  run.pack = undefined;
  if (run.pendingFruitPacks.length) { openPendingPack(run); return; }
  run.phase = run.battle ? 'battle' : run.shop ? 'shop' : 'select';
}

/** Why a Bag consumable can't be used right now (null if it can). Never changes the run. */
export function consumableBlocker(run: RunState, cUid: string): string | null {
  const c = run.bag.find((i) => i.uid === cUid);
  if (!c) return 'Gone';
  const def = consumableDef(c.defId);
  const b = run.battle;
  if (b && bossActive(run, b, 'gag')) return `${T.leader(b.opponent.ruleFrom ?? b.opponent.id).ruleName}: cannot use consumables`;
  const selected = b ? b.selected.map((u) => run.deck.find((x) => x.uid === u)!) : [];
  if (def.targets > 0) {
    const min = def.minTargets ?? 1;
    const want = min === def.targets ? `${min}` : `${min}–${def.targets}`;
    if (!b) return `Use this in battle, on ${want} selected card${def.targets > 1 ? 's' : ''}`;
    if (selected.length < min || selected.length > def.targets) return `Select ${want} card${def.targets > 1 ? 's' : ''} in your hand first`;
  }
  return def.canUse?.(run, selected) ?? null;
}

export function useConsumable(run: RunState, cUid: string): string | null {
  const blocked = consumableBlocker(run, cUid);
  if (blocked) return blocked;
  const c = run.bag.find((i) => i.uid === cUid)!;
  const def = consumableDef(c.defId);
  const b = run.battle;
  const selected = b ? b.selected.map((u) => run.deck.find((x) => x.uid === u)!) : [];
  const rng = rngOf(run);
  const msg = def.use(run, selected, rng);
  commit(run, rng);
  run.bag = run.bag.filter((i) => i.uid !== cUid);
  if (b) b.selected = [];
  run.lastUsedConsumable = def.id;
  if (msg) run.toast = msg;
  return null;
}

export function leaveShop(run: RunState): void {
  run.shop = undefined;
  advance(run);
}

export function advance(run: RunState): void {
  if (run.region >= 9 || run.endless) {
    run.leagueRound += 1;
    generatePreview(run);
    run.phase = 'select';
    return;
  }
  if (run.region === 8) {
    run.battleIndex += 1;
    generatePreview(run);
    run.phase = 'select';
    return;
  }
  run.battleIndex += 1;
  if (run.battleIndex > 2) {
    run.region += 1;
    run.battleIndex = 0;
    run.skippedThisRegion = [false, false, false];
    run.bossRerolledThisRegion = false;
    generatePreview(run);
  }
  run.phase = 'select';
}

/** After the Kingpin: keep playing on the endless summit. */
export function continueEndless(run: RunState): void {
  run.endless = true;
  run.region = 9;
  run.battle = undefined;
  run.cashout = undefined;
  generateShop(run);
  run.phase = 'shop';
}

export function cardsInDeckSorted(run: RunState): Card[] {
  return [...run.deck].sort((a, b) => species(b.speciesId).tier - species(a.speciesId).tier || slotNumber(species(a.speciesId).family) - slotNumber(species(b.speciesId).family) || species(a.speciesId).stage - species(b.speciesId).stage);
}

export function debugInfo(run: RunState): string {
  return `${run.seed} R${run.region + 1}B${run.battleIndex + 1} $${run.money} deck=${run.deck.length} items=${run.items.map((i) => i.defId).join(',')}`;
}

export { makeItem };
