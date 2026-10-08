import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { audio } from '@/audio';
import { useStore, toast, popUnlock } from './ui/store';
import TitleScreen from './ui/screens/Title';
import StarterSelect from './ui/screens/StarterSelect';
import RunScreen from './ui/screens/Run';
import Collection from './ui/screens/Collection';
import { deckDef } from '@/game/decks';
import PipSprite from './ui/components/PipSprite';

export default function App() {
  const s = useStore();
  useEffect(() => {
    const kick = () => { audio.init(); };
    window.addEventListener('pointerdown', kick, { once: true });
    window.addEventListener('keydown', kick, { once: true });
    return () => { window.removeEventListener('pointerdown', kick); window.removeEventListener('keydown', kick); };
  }, []);
  useEffect(() => {
    if (!s.toast) return;
    const t = setTimeout(() => toast(null), 3200);
    return () => clearTimeout(t);
  }, [s.toast]);
  useEffect(() => {
    document.documentElement.dataset.crt = s.settings.crt ? '1' : '0';
    document.documentElement.dataset.motion = s.settings.reducedMotion ? 'reduced' : 'full';
    document.documentElement.dataset.bg = s.settings.background;
    document.documentElement.style.setProperty('--spd', String(1 / s.settings.speed));
  }, [s.settings.crt, s.settings.reducedMotion, s.settings.speed, s.settings.background]);

  return (
    <div className="app">
      {s.screen === 'title' && <TitleScreen />}
      {s.screen === 'starter' && <StarterSelect />}
      {s.screen === 'run' && s.run && <RunScreen key={s.run.seed} />}
      {s.screen === 'collection' && <Collection />}
      <AnimatePresence>
        {s.toast && (
          <motion.div className="toast" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} key={s.toast}>
            {s.toast}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {s.unlocks[0] && (
          <motion.div className="unlock-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="panel unlock-card" initial={{ scale: 0.6, rotate: -6 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
              <div className="unlock-title">NEW STARTER UNLOCKED</div>
              <PipSprite id={deckDef(s.unlocks[0]).species} className="unlock-sprite" />
              <div className="unlock-name">{deckDef(s.unlocks[0]).name} deck</div>
              <div className="unlock-perk">{deckDef(s.unlocks[0]).perk}</div>
              <button className="btn btn-primary" onClick={() => { audio.sfx('click'); popUnlock(); }}>Nice!</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
