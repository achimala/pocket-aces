// Optional content packs imported locally with `pnpm import-pack <source>`. The importer writes
// public/packs/index.json (the installed packs) and public/packs/<id>/manifest.json (a PackOverlay).
// Nothing here ships with the game: with no packs installed, the list stays empty and the UI hides the picker.
import { setOverlay, type PackOverlay } from '@/content';
import { getState, updateSettings } from './store';

export interface InstalledPack { id: string; label: string; manifest: string }

let installed: InstalledPack[] = [];
const cache = new Map<string, PackOverlay>();
const listeners = new Set<() => void>();

export function installedPacks(): InstalledPack[] { return installed; }
export function onPacksChange(fn: () => void): () => void { listeners.add(fn); return () => { listeners.delete(fn); }; }

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('json')) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Switch to an installed pack by id, or back to the default content with ''. */
export async function activatePack(id: string): Promise<boolean> {
  if (!id) { setOverlay(null); updateSettings({ overlay: '' }); return true; }
  const p = installed.find((x) => x.id === id);
  if (!p) return false;
  let o = cache.get(id);
  if (!o) {
    const m = await getJson<PackOverlay>(p.manifest);
    if (!m) return false;
    o = m;
    cache.set(id, o);
  }
  setOverlay(o);
  updateSettings({ overlay: id });
  return true;
}

export async function initPacks(): Promise<void> {
  const idx = await getJson<{ packs?: InstalledPack[] }>('/packs/index.json');
  installed = idx?.packs ?? [];
  for (const l of listeners) l();
  const want = getState().settings.overlay;
  if (want && !(await activatePack(want))) updateSettings({ overlay: '' });
}
