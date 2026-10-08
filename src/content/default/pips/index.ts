// All 151 Pip entries for the default pack, split into files of ~25 so each stays reviewable.
import type { PipEntry } from '../../types';
import { PIPS_01 } from './pips-01';
import { PIPS_02 } from './pips-02';
import { PIPS_03 } from './pips-03';
import { PIPS_04 } from './pips-04';
import { PIPS_05 } from './pips-05';
import { PIPS_06 } from './pips-06';

export const PIPS: Record<string, PipEntry> = { ...PIPS_01, ...PIPS_02, ...PIPS_03, ...PIPS_04, ...PIPS_05, ...PIPS_06 };
