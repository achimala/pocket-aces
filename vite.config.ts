import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';

/**
 * Locally imported third-party packs live in public/packs/ so the dev server can serve them, but they must
 * never ship: drop them from the production output (set INCLUDE_PACKS=1 only for a private local build).
 */
function excludeImportedPacks(): Plugin {
  let outDir = 'dist';
  return {
    name: 'exclude-imported-packs',
    apply: 'build',
    configResolved(c) { outDir = path.resolve(c.root, c.build.outDir); },
    closeBundle() {
      if (process.env.INCLUDE_PACKS === '1') return;
      fs.rmSync(path.join(outDir, 'packs'), { recursive: true, force: true });
    },
  };
}

export default defineConfig({
  plugins: [react(), excludeImportedPacks()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  build: { outDir: 'dist', assetsInlineLimit: 0, sourcemap: false },
  server: { port: 5173 },
});
