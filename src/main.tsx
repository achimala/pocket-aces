import './migrate-saves';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './ui/styles.css';
import './ui/cards.css';
import './ui/scene.css';
import { notifyContentChange } from './content';
import { loadGeneratedArt } from './content/generated';
import { initPacks } from './ui/packs';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Optional assets: generated art (public/art/manifest.json) and locally imported packs (public/packs/*).
loadGeneratedArt().then((found) => { if (found) notifyContentChange(); });
initPacks();

if (new URLSearchParams(location.search).has('dev')) import('./dev');
