// Pit Bosses, High Rollers, Kingpins and the Stranger. Original characters; mechanics live in src/game/opponents.ts.
import type { LeaderText } from '../types';

export const LEADERS: Record<string, LeaderText> = {
  // Fernreach
  rocco: { name: 'Rocco', ruleName: 'Opening Guard', crest: 'Flagstone Crest', look: 'broad-shouldered quarry foreman with a granite-grey beard, hard hat and a pickaxe slung over one shoulder' },
  marina: { name: 'Marina', ruleName: 'Riptide', crest: 'Undertow Crest', look: 'sun-tanned harbor pilot with a teal rain slicker, braided hair and a brass spyglass' },
  volta: { name: 'Volta', ruleName: 'Static Field', crest: 'Coil Crest', look: 'wiry lineworker with frizzy static-charged hair, rubber gloves and goggles pushed up on the forehead' },
  // Lanternport
  wren: { name: 'Wren', ruleName: 'Swarm Tactics', crest: 'Chitin Crest', look: 'small entomologist with round glasses, a butterfly net and a vest full of specimen jars' },
  lou: { name: 'Lou', ruleName: 'Second Helping', crest: 'Platter Crest', look: 'cheerful diner owner in a checkered apron, holding a stack of pancakes' },
  esme: { name: 'Esme', ruleName: 'Fog Veil', crest: 'Mist Crest', look: 'pale lighthouse keeper in a long grey shawl, carrying a dim green lantern' },
  // Cinder Isles
  duke: { name: 'Duke', ruleName: 'One-Track Mind', crest: 'Fist Crest', look: 'retired boxer with taped knuckles, a towel around the neck and a crooked grin' },
  tamsin: { name: 'Tamsin', ruleName: 'Backdraft', crest: 'Kiln Crest', look: 'glassblower with soot-streaked leather apron, crimson bandana and a glowing blowpipe' },
  gus: { name: 'Gus', ruleName: 'Siesta', crest: 'Hammock Crest', look: 'laid-back ferry captain dozing in a straw hat, sandals and an open floral shirt' },
  // Frostmere
  fern: { name: 'Fern', ruleName: 'Overgrowth', crest: 'Thicket Crest', look: 'greenhouse botanist with moss-green overalls, pruning shears and vines tucked in her hair' },
  kit: { name: 'Kit', ruleName: 'Read the Tell', crest: 'Sparring Crest', look: 'sharp-eyed martial arts coach with a black headband, wrist wraps and a whistle' },
  sasha: { name: 'Sasha', ruleName: 'Frostbite', crest: 'Glacier Crest', look: 'ice sculptor in a white fur-lined parka, holding a chisel, breath misting' },
  // Neon Basin
  bram: { name: 'Bram', ruleName: 'Toll Booth', crest: 'Carapace Crest', look: 'gruff toll collector in a reflective vest, a beetle pin on his cap and a coin changer belt' },
  tex: { name: 'Tex', ruleName: 'Sinkhole', crest: 'Fault Crest', look: 'dusty desert surveyor with a wide-brim hat, theodolite and sun-cracked boots' },
  piper: { name: 'Piper', ruleName: 'Headwind', crest: 'Updraft Crest', look: 'stunt pilot in a leather flight jacket, scarf trailing and goggles on' },
  // Gilded Coast
  roxy: { name: 'Roxy', ruleName: 'Pump Up', crest: 'Rally Crest', look: 'roller-derby jammer with knee pads, a star helmet and a confident stance' },
  primrose: { name: 'Primrose', ruleName: 'Velvet Rope', crest: 'Petal Crest', look: 'glamorous nightclub hostess in a pastel ballgown with a velvet rope and clipboard' },
  odette: { name: 'Odette', ruleName: 'Five or Fold', crest: 'Oracle Crest', look: 'calm fortune teller with a deck of oversized tarot-style cards fanned in one hand and a violet veil' },
  // Sunreef
  vic: { name: 'Vic', ruleName: 'Pickpocket', crest: 'Alley Crest', look: 'slick street magician in a dark waistcoat, flipping a coin across his knuckles' },
  mesa: { name: 'Mesa', ruleName: 'Shell Game', crest: 'Dune Crest', look: 'sandy-haired archaeologist with a brush, a dusty satchel and three tin cups' },
  iggy: { name: 'Iggy', ruleName: 'Heat Haze', crest: 'Magma Crest', look: 'fire dancer in modern streetwear, spinning two flaming poi' },
  // Moorhaven
  tova: { name: 'Tova', ruleName: 'Squeeze Play', crest: 'Grapple Crest', look: 'towering wrestler in a cape and a plain singlet, arms crossed' },
  rex: { name: 'Rex', ruleName: 'Glass Ceiling', crest: 'Scale Crest', look: 'tall falconer-style dragon keeper with a scaled leather bracer and a long coat' },
  jinx: { name: 'Jinx', ruleName: 'Gag Order', crest: 'Nightfall Crest', look: 'punk musician with a black leather jacket, safety pins and a microphone stand' },
  // The Grand Table: High Rollers
  ingrid: { name: 'Ingrid', ruleName: 'Deep Freeze', crest: 'High Roller', look: 'icy blackjack dealer with silver hair in a tight bun, white gloves and a pale frost-colored vest' },
  brutus: { name: 'Brutus', ruleName: 'Iron Hide', crest: 'High Roller', look: 'massive casino bouncer in a tight suit, bald, with a scar and folded arms' },
  morrow: { name: 'Morrow', ruleName: 'Hex', crest: 'High Roller', look: 'gaunt croupier in an old-fashioned tailcoat, candle-lit, with a roulette ball between his fingers' },
  sable: { name: 'Sable', ruleName: 'Short Leash', crest: 'High Roller', look: 'stern baccarat dealer with a long dark coat, a dragon-shaped brooch and sharp eyes' },
  // Kingpins
  ace: { name: 'Ace', ruleName: 'House Pride', crest: 'Kingpin', look: 'smug young card prodigy in a white suit, spiky hair and a single ace of spades' },
  aurelia: { name: 'Aurelia', ruleName: 'Clean Sweep', crest: 'Kingpin', look: 'elegant casino owner with long golden hair, a black evening coat and a jeweled cane' },
  monty: { name: 'Monty', ruleName: 'Showstopper', crest: 'Kingpin', look: 'flamboyant showman in a scarlet-and-gold ringmaster coat, top hat and a confident grin' },
  // Endless
  stranger: { name: 'The Stranger', ruleName: '???', crest: 'High Stakes', look: 'silent figure in a hooded traveling cloak and a wide-brim hat, face in shadow, a single card glowing in hand' },
};

/** Portrait art for the generic opponents (trainer classes) and the shop clerk. */
export const PORTRAIT_LOOKS: Record<string, string> = {
  clerk: 'friendly bazaar shopkeeper with an apron full of pockets, a pencil behind one ear and a welcoming smile',
  schoolkid: 'eager kid in a school uniform and backpack, holding a lantern',
  socialite: 'well-dressed socialite with a sun hat and pearls',
  mothchaser: 'kid in shorts and a straw hat swinging a butterfly net',
  rambler: 'bearded hiker with a huge backpack and walking stick',
  angler: 'fisher in waders with a rod and a bucket',
  mystic: 'robed mystic with a crystal pendant and closed eyes',
  brawler: 'martial artist in a plain gi with a black belt',
  cardsharp: 'shady card player in a striped vest with cards up the sleeve',
  prodigy: 'confident young competitor in a sleek sports jacket',
  lifeguard: 'lifeguard with a whistle, scarlet shorts and a rescue float',
  falconer: 'falconer with a leather glove and a feathered cap',
  bookie: 'bookmaker with a visor, ledger and pencil',
  medium: 'medium in a dark shawl holding a candle',
  tinkerer: 'tinkerer with a lab coat, goggles and a wrench',
  rival: 'cocky rival with a backwards cap and a smirk',
};
