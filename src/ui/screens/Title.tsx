import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { audio } from '@/audio';
import { hasSavedRun, resumeSavedRun, setScreen, useStore } from '../store';
import { SPECIES } from '@/game/pips';
import { Art, T } from '@/content';
import Logo from '../components/Logo';
import PipSprite from '../components/PipSprite';
import SettingsModal from '../components/SettingsModal';
import HowToPlay, { markTutorialSeen } from '../components/HowToPlay';
import PixelBackdrop from '../components/PixelBackdrop';

export default function TitleScreen() {
  const s = useStore();
  const [settings, setSettings] = useState(false);
  const [howto, setHowto] = useState(false);
  const saved = hasSavedRun();
  useEffect(() => { audio.playMusic('title'); }, []);
  const parade = useMemo(() => ['c025', 'c001', 'c004', 'c007', 'c133', 'c143', 'c094', 'c006', 'c131', 'c150'].map((id, i) => ({ id, x: 4 + i * 9.5, delay: i * 0.3 })), []);
  return (
    <div className="screen title-screen">
      <PixelBackdrop className="backdrop" src={Art.backdrop('title')} focusY={0.6} />
      <motion.div className="title-logo" initial={{ y: -80, opacity: 0, scale: 0.8 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 120, damping: 14 }}><Logo /></motion.div>
      <motion.div className="title-menu" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        {saved && <button className="btn btn-primary" onClick={() => { audio.sfx('click'); resumeSavedRun(); }}>CONTINUE RUN</button>}
        <button className={`btn ${saved ? '' : 'btn-primary'}`} onClick={() => { audio.sfx('click'); setScreen('starter'); }}>NEW RUN</button>
        <button className="btn" onClick={() => { audio.sfx('click'); setHowto(true); }}>HOW TO PLAY</button>
        <button className="btn" onClick={() => { audio.sfx('click'); setScreen('collection'); }}>COLLECTION</button>
        <button className="btn" onClick={() => { audio.sfx('click'); setSettings(true); }}>SETTINGS</button>
      </motion.div>
      <div className="title-sprites">
        {parade.map((p) => (
          <motion.div key={p.id} className="title-pip" style={{ left: `${p.x}%` }} initial={{ y: 120 }} animate={{ y: 0 }} transition={{ delay: p.delay, type: 'spring', stiffness: 120, damping: 14 }}><PipSprite id={p.id} /></motion.div>
        ))}
      </div>
      <div className="title-footer">A creature-collecting poker roguelike · {Object.values(s.profile.wins).reduce((a, b) => a + b, 0)} wins · {Object.keys(s.profile.dex).length}/{SPECIES.length} {T.terms.dex}</div>
      {settings && <SettingsModal onClose={() => setSettings(false)} />}
      {howto && <HowToPlay onClose={() => { markTutorialSeen(); setHowto(false); }} />}
    </div>
  );
}
