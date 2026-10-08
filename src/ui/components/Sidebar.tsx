import { HAND_MOVES, HAND_NAMES, handValues, type HandResult } from '@/game/hands';
import { currentRegionName } from '@/game/run';
import { evolutionPreview } from '@/game/scoring';
import type { RunState } from '@/game/types';
import { T } from '@/content';
import OpponentPanel from './OpponentPanel';
import { useStore } from '../store';

interface Props {
  run: RunState;
  preview: HandResult | null;
  shown: { power: number; mult: number; shake: 'power' | 'mult' | null };
  damagePreview?: number | null;
  hiddenDamage?: number;
  onFire?: boolean;
  onOpenSettings: () => void;
  onOpenDeck: () => void;
  onOpenHelp?: () => void;
}

export default function Sidebar({ run, preview, shown, damagePreview, hiddenDamage = 0, onFire, onOpenSettings, onOpenDeck, onOpenHelp }: Props) {
  const s = useStore();
  const b = run.battle;
  const opp = b?.opponent;
  const level = preview ? run.handLevels[preview.type] : 1;
  const base = preview ? handValues(preview.type, level) : null;
  const evo = preview && !shown.power ? evolutionPreview(run, preview) : 0;
  const t = T.terms;
  const regionLabel = run.endless ? `${t.summit} ${run.leagueRound + 1}` : run.region === 8 ? (run.battleIndex < 4 ? `${t.elite} ${run.battleIndex + 1}/4` : t.kingpin) : `${currentRegionName(run)} ${run.battleIndex + 1}/3`;
  return (
    <aside className="sidebar">
      {opp && b ? <OpponentPanel opp={opp} hp={b.hp} damage={Math.max(0, b.damage - hiddenDamage)} ruleOff={b.bossDisabled} /> : (
        <div className="panel opp-card"><div className="opp-title">REGION {Math.min(run.region, 8) + 1}</div><div className="opp-name">{currentRegionName(run)}</div><div className="muted" style={{ fontSize: 12 }}>{run.region < 8 ? `${t.boss}: ${T.leader(run.leaders[run.region]).name}` : run.endless ? 'The summit awaits.' : t.league}</div></div>
      )}
      <div className="panel score-box">
        <div className="hand-name">
          {preview ? <>{HAND_NAMES[preview.type]} <span className="lv">LV.{level}</span>{s.settings.showMoveNames && <span className="move">{HAND_MOVES[preview.type]}</span>}</> : <span className="muted" style={{ fontSize: 13 }}>Select up to 5 cards</span>}
        </div>
        <div className="pm-row">
          <div className={`pm power ${shown.shake === 'power' ? 'shake' : ''} ${onFire ? 'onfire' : ''}`}><span className="lab">POWER</span>{fmt(shown.power || base?.power || 0)}</div>
          <div className="pm-x">×</div>
          <div className={`pm mult ${shown.shake === 'mult' ? 'shake' : ''} ${onFire ? 'onfire' : ''}`}><span className="lab">MULT</span>{fmt(shown.mult || base?.mult || 0)}</div>
        </div>
        {evo > 0 && <div className="evo-chip">EVOLVED · +{evo} MULT</div>}
        <div className="damage-line">{damagePreview != null ? <>= <b>{damagePreview.toLocaleString()}</b> damage</> : base ? <>= <b>{Math.round(base.power * base.mult).toLocaleString()}</b> base</> : ''}</div>
      </div>
      <div className="stat-grid">
        <div className="stat hands"><span className="label">Attacks</span><span className="v">{b ? b.handsLeft : run.handsBase}</span></div>
        <div className="stat discards"><span className="label">Discards</span><span className="v">{b ? b.discardsLeft : run.discardsBase}</span></div>
        <div className="stat money"><span className="label">Money</span><span className="v">{T.money(run.money)}</span></div>
        <div className="stat region"><span className="label">Progress</span><span className="v">{regionLabel}</span></div>
      </div>
      <div className="panel" style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="row"><span className="label">{t.crests}</span><div className="badges-row">{Array.from({ length: 8 }, (_, i) => <div key={i} className={`badge-pip ${i < run.badges.length ? 'on' : ''}`} title={run.badges[i] ? T.leader(run.badges[i]).crest : ''} />)}</div></div>
        {run.keyItems.length > 0 && <div className="muted" style={{ fontSize: 11 }}>Key Items: {run.keyItems.length}</div>}
        {run.fruits.length > 0 && <div className="muted" style={{ fontSize: 11 }}>{t.fruits} held: {run.fruits.length}</div>}
        <div className="row" style={{ gap: 6 }}>
          <button className="btn btn-small" onClick={onOpenDeck}>Party ({run.deck.length})</button>
          <button className="btn btn-small btn-ghost" onClick={onOpenHelp} title="How to play">?</button>
          <button className="btn btn-small btn-ghost" onClick={onOpenSettings} title="Settings">⚙</button>
        </div>
        <div className="seed-line"><span>SEED {run.seed}</span><span>{run.difficulty.toUpperCase()}</span></div>
      </div>
    </aside>
  );
}

function fmt(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 10000) return Math.round(n).toLocaleString();
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
