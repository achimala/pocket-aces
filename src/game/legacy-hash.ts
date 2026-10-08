// Hashing shared by the save migration (legacy.ts) and the cross-domain save import (import-save.ts).
// Old content ids and storage keys are only ever compared by hash, so the repository never spells them.

export function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (const b of new TextEncoder().encode(s)) h = Math.imul(h ^ b, 0x01000193) >>> 0;
  return h.toString(36);
}

/** Hash of the first build's storage key prefix (including its trailing dot). */
export const LEGACY_PREFIX_HASH = '1q5zoai';

/** Is this a storage key written by the first build? */
export function isLegacyKey(key: string): boolean {
  const dot = key.indexOf('.');
  return dot > 0 && fnv1a(key.slice(0, dot + 1)) === LEGACY_PREFIX_HASH;
}
