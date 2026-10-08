import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { audio } from '@/audio';
import { DECKS } from '@/game/decks';
import { Art } from '@/content';
import PipSprite from '../components/PipSprite';
import { newRun } from '@/game/run';
import { randomSeed } from '@/game/rng';
import type { Difficulty } from '@/game/types';
import { setRun, setScreen, useStore } from '../store';

export default function StarterSelect() {
  const s = useStore();
  const [pick, setPick] = useState('sprout');
  const [diff, setDiff] = useState<Difficulty>('normal');
  const [seed, setSeed] = useState('');
  useEffect(() => { audio.playMusic('title'); }, []);
  const start = () => {
    audio.sfx('win');
    const run = newRun(pick, diff, seed.trim() ? seed.trim().toUpperCase() : randomSeed());
    setRun(run);
    setScreen('run');
  };
  return (
    <div className="screen starter-screen">
      <div className="backdrop" style={{ backgroundImage: `url("${Art.backdrop('fernreach')}")` }} />
      <div className="starter-header">
        <button className="btn btn-ghost btn-small" onClick={() => { audio.sfx('click'); setScreen('title'); }}>← Back</button>
        <h1>CHOOSE YOUR STARTER</h1>
        <span className="muted">Your starter decides your party of 52 and a run-long perk.</span>
      </div>
      <div className="starter-grid">
        {DECKS.map((d, i) => {
          const unlocked = s.profile.unlockedStarters.includes(d.id);
          const wins = s.profile.wins[d.id] ?? 0;
          return (
            <motion.div key={d.id} className={`panel starter-card ${pick === d.id ? 'selected' : ''} ${unlocked ? '' : 'locked'}`}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              onClick={() => { if (!unlocked) { audio.sfx('error'); return; } audio.sfx('cardSelect'); setPick(d.id); }}>
              {wins > 0 && <div className="wins">★ {wins} win{wins > 1 ? 's' : ''}</div>}
              <PipSprite id={d.species} />
              <div className="name">{d.name}</div>
              <div className="lean">{d.lean}</div>
              <div className="perk">{d.perk}</div>
              {!unlocked && <div className="lean">🔒 {d.unlock}</div>}
            </motion.div>
          );
        })}
      </div>
      <div className="starter-footer">
        <div className="seg">
          {(['normal', 'hard', 'ironman'] as Difficulty[]).map((d) => <button key={d} className={diff === d ? 'on' : ''} onClick={() => { audio.sfx('click'); setDiff(d); }}>{d === 'normal' ? 'Normal' : d === 'hard' ? 'Hard' : 'Ironman'}</button>)}
        </div>
        <span className="muted" style={{ fontSize: 12 }}>{diff === 'normal' ? 'The intended experience.' : diff === 'hard' ? 'Wild Encounters pay nothing, HP x1.15.' : 'Hard, plus −1 discard and some Items are Eternal.'}</span>
        <input className="input" placeholder="SEED" value={seed} onChange={(e) => setSeed(e.target.value)} maxLength={12} />
        <div className="spacer" />
        <button className="btn btn-primary btn-pixel" onClick={start}>DEAL ME IN!</button>
      </div>
    </div>
  );
}
