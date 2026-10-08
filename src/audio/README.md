# Audio

All sound is synthesized with the Web Audio API (no assets). Import the singleton: `import { audio } from '@/audio'`.

- `audio.init()` — call from the first user gesture (click/keydown); safe to call repeatedly. Everything is a no-op before it.
- `audio.playMusic(name, { fade?, restart? })` — crossfades to a `SongName` (`title`, `battle`, `boss`, `shop`, `league`, `victory`, `gameover`, `win`); no-op if already playing unless `restart`.
- `audio.stopMusic(fade?)` / `audio.currentSong`.
- `audio.sfx(name, { index?, t?, volume? })` — fires a `SfxName`; `chip` uses `index` (rising pitch), `tally` uses `t` (0..1).
- `setMusicVolume(v)`, `setSfxVolume(v)`, `setMuted(bool)`, `isMuted()`, `getMusicVolume()`, `getSfxVolume()` — persisted under localStorage `pocketaces.audio`.

Adding a song: in `music.ts`, write a function returning a `Song` (`bpm`, `steps` = 16ths per loop, `loop`, optional `swing`, and `channels.pulse1/pulse2/triangle/noise`).
Write parts in grid notation with `p('C4 - E4 . | ...')` (one token per 16th; `-` holds, `.` rests, `!`/`~` accent/soft; noise uses `x o s k c`),
combine with `seq`/`rep`/`tr`/`cut`/`arp`/`bounce`/`drive`/`walk`/`comp`, wrap with `tk(phrase, { duty, vol, env, vibrato })`, then add it to `SONGS` and the `SongName` union.
New SFX go in `sfx.ts` as an entry of `SFX` returning `pulse`/`tri`/`noise` voices with optional `at` offsets.
