import { species } from '@/game/pips';
import { opponentName, opponentRule, opponentTitle } from '@/game/opponents';
import { Art, T } from '@/content';
import PipSprite from './PipSprite';
import type { Opponent } from '@/game/types';
import TypeBadge from './TypeBadge';

interface Props {
  opp: Opponent;
  hp: number; // current target
  damage: number;
  ruleOff?: boolean;
  compact?: boolean;
}

export function OppPortrait({ opp, className }: { opp: Opponent; className?: string }) {
  if (opp.kind === 'wild') return <PipSprite id={opp.id} className={className} />;
  return <img className={`pixel ${className ?? ''}`} src={Art.portrait(opp.portrait ?? opp.id)} alt="" />;
}

export default function OpponentPanel({ opp, hp, damage, ruleOff }: Props) {
  const frac = Math.max(0, Math.min(1, 1 - damage / hp));
  const boss = opp.kind !== 'wild' && opp.kind !== 'trainer';
  const n = opp.party.length;
  const faintedCount = Math.min(n, Math.floor((1 - frac) * n + 1e-9));
  const rule = opponentRule(opp);
  return (
    <div className={`panel opp-card ${boss ? 'boss' : ''}`}>
      <div className="opp-head">
        <div className="opp-portrait"><OppPortrait opp={opp} /></div>
        <div style={{ minWidth: 0 }}>
          <div className="opp-title">{opponentTitle(opp).toUpperCase()}</div>
          <div className="opp-name">{opponentName(opp)}</div>
          <div className="row" style={{ gap: 4, marginTop: 4, flexWrap: 'wrap' }}>{opp.types.map((t) => <TypeBadge key={t} type={t} small />)}</div>
        </div>
      </div>
      <div className="hp-wrap">
        <div className={`hp-bar ${frac < 0.25 ? 'low' : frac < 0.55 ? 'mid' : ''}`} style={{ transform: `scaleX(${frac})` }} />
        <div className="hp-text">HP {Math.max(0, hp - damage).toLocaleString()} / {hp.toLocaleString()}</div>
      </div>
      <div className="party-row">
        {opp.party.map((id, i) => <PipSprite key={i} id={id} idle={false} className={i < faintedCount ? 'fainted' : ''} alt={species(id).name} />)}
      </div>
      {rule && <div className={`rule-box ${ruleOff ? 'off' : ''}`}><b>{rule.split(':')[0]}:</b>{rule.slice(rule.indexOf(':') + 1)}{ruleOff ? ` (${T.item('musicbox')}!)` : ''}</div>}
    </div>
  );
}
