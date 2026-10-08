// Optional generated art. `pnpm gen-art` writes images under public/art/ plus public/art/manifest.json
// (a list of asset keys such as "pips/c001" → file path). When present, the default pack uses those files
// instead of the procedural placeholders. Without it, everything stays procedural.

let files: Record<string, string> = {};

export async function loadGeneratedArt(): Promise<boolean> {
  try {
    const res = await fetch('/art/manifest.json', { cache: 'no-cache' });
    if (!res.ok) return false;
    const m = (await res.json()) as { files?: Record<string, string> };
    files = m.files ?? {};
    return Object.keys(files).length > 0;
  } catch {
    return false;
  }
}

/** URL for a generated asset key, or undefined. Shiny variants of generated art are a CSS palette shift. */
export function generatedArt(key: string, shiny?: boolean): string | undefined {
  void shiny;
  const f = files[key];
  return f ? `/art/${f}` : undefined;
}

export function hasGeneratedArt(key: string): boolean { return key in files; }
