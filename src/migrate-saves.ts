// Imported first by main.tsx so old saves are copied into the current keys before any module reads storage.
import { migrateLegacyStorage } from './game/legacy';
import { SAVE_VERSION } from './game/run';

migrateLegacyStorage(SAVE_VERSION);
