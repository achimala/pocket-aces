// import.html: receives a save handed over from the game's previous web address. Browsers keep saves per
// domain, so the old address sends its save here in the URL fragment (never sent to any server):
//   /import.html#v1.<base64url(gzip(JSON {storageKey: value}))>   (v0 = the same JSON, not gzipped)
// Only keys from the first build are accepted, and only into a browser with no progress here yet; the normal
// save migration then runs when the game loads.
import { isLegacyKey } from './game/legacy-hash';

const NEW = 'pocketaces.';

function fromBase64Url(s: string): Uint8Array<ArrayBuffer> {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

async function receive(): Promise<void> {
  const m = /^#v([01])\.([A-Za-z0-9_-]+)$/.exec(location.hash);
  history.replaceState(null, '', location.pathname); // don't leave the save in the address bar or history
  if (!m) return;
  if (localStorage.getItem(NEW + 'profile') || localStorage.getItem(NEW + 'run')) return; // already playing here
  const bytes = fromBase64Url(m[2]);
  const text = m[1] === '1'
    ? await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text()
    : new TextDecoder().decode(bytes);
  const data: unknown = JSON.parse(text);
  if (!data || typeof data !== 'object') return;
  let n = 0;
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    if (typeof v === 'string' && v.length < 4_000_000 && isLegacyKey(k)) { localStorage.setItem(k, v); n++; }
  }
  if (n) localStorage.removeItem(NEW + 'migrated'); // let the migration run on these keys
}

receive().catch(() => { /* a bad payload just means a fresh start */ }).finally(() => location.replace('/'));
