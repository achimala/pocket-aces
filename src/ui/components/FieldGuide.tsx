import { useState } from 'react';
import { audio } from '@/audio';
import { FAMILIES, familyTree, slotNumber, species, tierLabel, tierPower } from '@/game/pips';
import { typeName } from '@/game/typechart';
import type { Profile, Species } from '@/game/types';
import { T } from '@/content';
import PipSprite from './PipSprite';
import TypeBadge from './TypeBadge';

const num = (id: string) => '#' + String(slotNumber(id)).padStart(3, '0');

/** The Field Guide: every evolution line as one tile, so players can learn what evolves into what. */
export default function FieldGuide({ profile }: { profile: Profile }) {
  const [pick, setPick] = useState<string | null>(null);
  const caught = (id: string) => !!profile.dex[id];
  const total = Object.keys(profile.dex).length;
  const families = [...FAMILIES].sort((a, b) => slotNumber(a) - slotNumber(b));
  const sel = pick ? species(pick) : null;
  return (
    <div className="guide">
      <div className="guide-head">
        <b>{total}</b> / 151 caught
        <span className="muted">Each tile is one evolution line. Cards from the same line make pairs and sets together, and mixing stages in a set adds Mult.</span>
      </div>
      <div className="guide-grid">
        {families.map((f) => {
          const rows = familyTree(f);
          const root = rows[0][0];
          return (
            <div key={f} className="guide-line">
              <div className="guide-rank" title={`Tier ${tierLabel(root.tier)}`}>{tierLabel(root.tier)}</div>
              <div className="guide-stages">
                {rows.map((stage, i) => (
                  <div key={i} className="guide-stage">
                    {i > 0 && <i className="guide-arr" />}
                    <div className="guide-forms">
                      {stage.map((m) => <Member key={m.id} sp={m} seen={caught(m.id)} shiny={!!profile.dex[m.id]?.shiny} on={pick === m.id} onPick={() => { audio.sfx('click'); setPick(pick === m.id ? null : m.id); }} />)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {sel && <Detail sp={sel} seen={caught(sel.id)} onClose={() => setPick(null)} />}
    </div>
  );
}

function Member({ sp, seen, shiny, on, onPick }: { sp: Species; seen: boolean; shiny: boolean; on: boolean; onPick: () => void }) {
  return (
    <button className={`guide-pip ${seen ? '' : 'unseen'} ${on ? 'on' : ''}`} onClick={onPick} title={seen ? sp.name : '???'}>
      <PipSprite id={sp.id} shiny={shiny} idle={false} />
      <span className="n">{seen ? sp.name : '???'}{shiny ? ' ✦' : ''}</span>
    </button>
  );
}

function Detail({ sp, seen, onClose }: { sp: Species; seen: boolean; onClose: () => void }) {
  const power = tierPower(sp.tier) + sp.stage * 4;
  return (
    <div className="guide-detail panel">
      <PipSprite id={sp.id} className={seen ? '' : 'unseen'} />
      <div className="guide-info">
        <div className="row"><span className="num">{num(sp.id)}</span><b className="nm">{seen ? sp.name : '???'}</b><div className="spacer" /><button className="btn btn-small btn-ghost" onClick={onClose}>✕</button></div>
        {seen && <div className="muted">{sp.genus}</div>}
        <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>{sp.types.map((t) => <TypeBadge key={t} type={t} small />)}</div>
        <div className="guide-stats">
          <span>Rank <b>{tierLabel(sp.tier)}</b></span>
          <span>Stage <b>{sp.stage + 1}</b>{sp.final ? ' (final)' : ''}</span>
          <span><span className="power-c">+{power}</span> Power</span>
          {sp.legendary && <span className="legend-tag">Legendary</span>}
        </div>
        <div className="flavor">{seen ? sp.flavor : `Catch one to learn more. It's a ${sp.types.map(typeName).join('/')} ${T.terms.pip.toLowerCase()} of rank ${tierLabel(sp.tier)}.`}</div>
      </div>
    </div>
  );
}
