import { motion } from 'framer-motion';
import { audio } from '@/audio';
import { currentRegionName, rerollBoss, skipBattle } from '@/game/run';
import type { RunState } from '@/game/types';
import { act, toast } from '../store';
import { OppPortrait } from '../components/OpponentPanel';
import TypeBadge from '../components/TypeBadge';
import { fruitDef } from '@/game/fruits';
import { opponentName, opponentRule, opponentTitle, REGIONS } from '@/game/opponents';
import { Art, T } from '@/content';

export default function SelectScreen({ run, onBegin }: { run: RunState; onBegin: () => void }) {
  const opps = run.previewOpponents ?? [];
  const league = run.region >= 8;
  const begin = onBegin;
  const skip = () => { const r = act(skipBattle) as string | null; if (r) toast(r); else audio.sfx('whoosh'); };
  const canReroll = run.keyItems.includes('roadatlas') || run.keyItems.includes('balloon');
  const t = T.terms;
  return (
    <div className="select-wrap">
      <div className="select-title">
        {run.endless ? t.summit.toUpperCase() : league ? t.league.toUpperCase() : currentRegionName(run).toUpperCase()}
        <small>{run.endless ? `Rematch ${run.leagueRound + 1} · HP keeps climbing` : league ? (run.battleIndex < 4 ? `Four ${t.elite}s stand between you and the ${t.kingpin}.` : `The ${t.kingpin} awaits.`) : `Region ${run.region + 1} of 8 · Pick your next battle`}</small>
      </div>
      <div className="route">
        {REGIONS.slice(0, 9).map((r, i) => {
          const state = i < run.region ? 'done' : i === Math.min(run.region, 8) ? 'now' : 'todo';
          const lid = i < 8 ? run.leaders[i] : run.champion;
          return (
            <div key={r.id} className={`route-node ${state}`} title={r.name}>
              <div className="route-face">{state === 'todo' && i !== 8 ? <span>?</span> : <img className="pixel" src={Art.portrait(i === 8 && state === 'todo' ? 'sable' : lid)} alt="" />}</div>
              <div className="route-name">{r.name.toUpperCase()}</div>
            </div>
          );
        })}
      </div>
      <div className="blind-row">
        {opps.map((o, i) => {
          const idx = league ? run.battleIndex : i;
          const current = idx === run.battleIndex;
          const done = !league && i < run.battleIndex;
          const boss = o.kind !== 'wild' && o.kind !== 'trainer';
          return (
            <motion.div key={o.id + i} className={`panel blind-card ${current ? 'current' : ''} ${done ? 'done' : ''} ${boss ? 'boss' : ''}`} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: current ? -8 : 0 }} transition={{ delay: i * 0.1 }}>
              <div className="b-title">{opponentTitle(o).toUpperCase()}</div>
              <div className="b-portrait"><OppPortrait opp={o} /></div>
              <div className="b-name">{opponentName(o)}</div>
              <div className="row" style={{ gap: 4, justifyContent: 'center' }}>{o.types.map((t) => <TypeBadge key={t} type={t} small />)}</div>
              <div className="b-hp">HP {o.hp.toLocaleString()}</div>
              <div className="b-reward">Reward {T.money(o.reward)}{o.kind === 'boss' ? ` + ${t.crest.toLowerCase()}` : ''}</div>
              {opponentRule(o) && <div className="rule-box" style={{ fontSize: 11 }}>{opponentRule(o)}</div>}
              {done && <div className={`stamp ${run.skippedThisRegion[i] ? 'skipped' : ''}`}>{run.skippedThisRegion[i] ? 'SKIPPED' : 'WON'}</div>}
              {current && (
                <div className="b-actions">
                  <button className="btn btn-primary" onClick={begin}>{boss ? 'CHALLENGE' : 'BATTLE'}</button>
                  {!boss && !league && <button className="btn btn-ghost" onClick={skip} title={`Skip for a random ${t.fruit}`}>Skip 🍑</button>}
                  {o.kind === 'boss' && canReroll && <button className="btn btn-ghost btn-small" onClick={() => { const r = act((rr) => rerollBoss(rr)) as string | null; if (r) toast(r); else audio.sfx('reroll'); }}>Reroll</button>}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
      {run.fruits.length > 0 && <div className="muted" style={{ fontSize: 12 }}>{t.fruits} in effect: {run.fruits.map((f) => fruitDef(f).name).join(', ')}</div>}
    </div>
  );
}
