# Pocket Aces: design summary

The short version of the design, matching the code. Names below are the default pack's; the engine uses neutral ids.

## Mapping

| Balatro | Pocket Aces |
| --- | --- |
| Deck / card rank / suit | Party of Pips / evolution family (tier 2–A from final-form stat total) / type (dual types = two suits) |
| Chips × Mult | Power × Mult = Damage |
| Blind target | Opponent HP |
| Hands / discards | Attacks (4) / discards (3) |
| Ante → Small, Big, Boss | Region (Fernreach…Moorhaven) → Wild Encounter, Challenger, Pit Boss |
| Final | The Grand Table: four High Rollers, then a Kingpin; then High Stakes Peak, endless, vs The Stranger |
| Jokers | Items (5 slots) |
| Tarot / Planet / Spectral | Tonics / Playbooks / Relics |
| Vouchers / Tags / Packs | Key Items / Fruits / Lanterns, kits and boxes |
| Enhancements / Editions / Seals | Abilities / Foil-Holo-Shiny-Shadow / Ribbons |
| Decks / Stakes | Starters (9, 3 unlocked) / Normal, Hard, Ironman |

## Core rules

- Card Power = tier value (2–10, J/Q/K = 10, A = 11) + 4 per evolution stage, + permanent bonuses.
- Hands are the Balatro twelve. Flush = 5 cards sharing a type. Straight = 5 consecutive tiers (A wraps).
- **Evolution bonus**: every matched set gets +4 Mult per extra distinct stage (a full three-stage line = +8). The Family Tree item doubles it.
- **Type chart**: a scored card with type advantage over the opponent gets ×2 Power everywhere. Against Pit Bosses, High Rollers and Kingpins, resisted cards score ×0.5 and immune cards score 0.
- HP curve per region: 300, 800, 1800, 4200, 9000, 16000, 28000, 42000 (Wild ×1, Challenger ×1.5, Pit Boss ×2). High Rollers 60000 each, Kingpin 90000, High Stakes Peak ×1.6 per rematch. Hard and Ironman ×1.15.
- Economy (¢ = chips): ¢4 start, Wild ¢3 / Challenger ¢4 / Pit Boss ¢5 / High Roller ¢8, ¢1 per unused attack, interest ¢1 per ¢5 (cap ¢5, raised by the Chip Tray and Chip Vault).
- Every boss rule is a mechanic id in `src/game/opponents.ts` (`firstguard`, `nodiscards`, …); its display name comes from the leader's pack entry.

## Where things live

- `src/game/hands.ts`: hand detection and base values.
- `src/game/scoring.ts`: the scoring pipeline; emits `ScoreEvent`s the UI animates.
- `src/game/items.ts`, `consumables.ts`, `keyitems.ts`, `fruits.ts`: content mechanics (names come from the pack).
- `src/game/opponents.ts`: regions, leaders and their rules, trainer classes, HP curve.
- `src/game/run.ts`: the run state machine (battles, shop, packs, skips, endless).
- `src/game/decks.ts`: starter decks and unlock conditions.
- `src/game/data/pips.json`: the 151 slots' structure (types, stage, family, evolutions, legendary flag, stat total, tier).
- `src/content/`: the `ContentPack` interface, the default pack, the active-pack registry (`T` for text, `Art` for art) and an optional overlay (an imported pack can rename and re-skin Pips and items only).

## Look and feel

- Table: an original painterly-swirl WebGL shader (`src/ui/components/Swirl.tsx`): a vortex-twisted, domain-warped noise field posterized into three palette bands that follow the phase and the opponent's type.
- Battle: a handheld-RPG-style scene (`BattleScene.tsx`) with the foe's active Pip, HP box, party markers, your lead card's back sprite and a typewriter dialogue box. The foe's total HP is split evenly across its party, so Pips faint one by one. Attacks lunge, hits make the foe flinch, and fainted Pips flash and sink; all scaled by the game-speed setting.
- Pips: procedural pixel placeholders (`src/content/procedural/creature.ts`) with idle breathing, bob and sway per motion preset (`PipSprite.tsx`). Generated art from `scripts/art-prompts.json` replaces them when present.
- Cards (`PipCard.tsx`, `cards.css`): ivory card stock, type-gradient frame, playing-card corner with tier and type icons, 3D tilt, idle sway, Foil/Holo/Shiny effects, evolve flash; a felt-green back with a gold spade medallion.
- Fonts are self-hosted in `public/fonts` (Jersey 15 for text, Press Start 2P for numbers).
