import { useEffect, useRef, useState } from 'react';
import { evolutionLine, species, tierLabel, viewCard } from '@/game/pips';
import { Art, T } from '@/content';
import PipSprite from './PipSprite';
import { TYPE_COLORS, typeName } from '@/game/typechart';
import type { Card, PType } from '@/game/types';
import { ABILITY_LABELS, EDITION_LABELS, RIBBON_LABELS } from '@/game/consumables';
import Tooltip from './Tooltip';
import TypeIcon from './TypeIcon';

interface Props {
  card: Card;
  size?: 'md' | 'sm' | 'xs';
  selected?: boolean;
  debuffed?: boolean;
  bump?: boolean;
  onClick?: () => void;
  noTip?: boolean;
  className?: string;
  still?: boolean; // no idle sway
  /** Family highlighting in the hand: a relative of the focused card, or an unrelated card while one is focused. */
  kin?: boolean;
  unrelated?: boolean;
}


function hash(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }

export default function PipCard({ card, size = 'md', selected, debuffed, bump, onClick, noTip, className, still, kin, unrelated }: Props) {
  const v = viewCard(card);
  const sp = species(card.speciesId);
  const fossil = card.ability === 'fossil';
  const types = fossil ? [] : (card.typeOverride ?? sp.types);
  const t1 = types[0] ? TYPE_COLORS[types[0]] : '#8a8f9c';
  const t2 = types[1] ? TYPE_COLORS[types[1]] : t1;
  const ref = useRef<HTMLDivElement>(null);
  const prevSpecies = useRef(card.speciesId);
  const [evolving, setEvolving] = useState(false);
  useEffect(() => {
    if (prevSpecies.current !== card.speciesId) {
      prevSpecies.current = card.speciesId;
      setEvolving(true);
      const t = setTimeout(() => setEvolving(false), 1100);
      return () => clearTimeout(t);
    }
  }, [card.speciesId]);
  const line = fossil ? null : evolutionLine(sp.id);
  const showLine = !!line && (line.members.length > 1 || line.branches > 0);
  const pending = useRef<{ x: number; y: number } | null>(null);
  const rect = useRef<DOMRect | null>(null);
  const onMove = (e: React.MouseEvent) => {
    const first = !pending.current;
    pending.current = { x: e.clientX, y: e.clientY };
    if (!first) return;
    requestAnimationFrame(() => {
      const el = ref.current; const pt = pending.current; pending.current = null;
      if (!el || !pt) return;
      const r = rect.current ?? (rect.current = el.getBoundingClientRect());
      const px = Math.min(1, Math.max(0, (pt.x - r.left) / r.width)), py = Math.min(1, Math.max(0, (pt.y - r.top) / r.height));
      el.style.setProperty('--ry', `${((px - 0.5) * 22).toFixed(1)}deg`);
      el.style.setProperty('--rx', `${((0.5 - py) * 18).toFixed(1)}deg`);
      const g = el.lastElementChild as HTMLElement | null;
      if (g) g.style.transform = `translate3d(${((px - 0.5) * 100).toFixed(0)}%, ${((py - 0.5) * 100).toFixed(0)}%, 0)`;
    });
  };
  const onLeave = () => { rect.current = null; const el = ref.current; if (!el) return; el.style.setProperty('--ry', '0deg'); el.style.setProperty('--rx', '0deg'); };
  const classes = ['pcard', size !== 'md' ? size : '', selected ? 'selected' : '', card.faceDown ? 'facedown' : '', card.frozen ? 'frozen' : '', card.tired ? 'tired' : '', debuffed ? 'debuffed' : '', bump ? 'bump' : '', kin ? 'kin' : '', unrelated ? 'unrelated' : '', evolving ? 'evolving' : '', card.edition ? `ed-${card.edition}` : '', className ?? ''].join(' ');
  const h = hash(card.uid);
  const body = (
    <div className={`sway ${still ? 'still' : ''}`} style={{ animationDelay: `-${(h % 40) / 10}s`, animationDuration: `${3.4 + (h % 17) / 10}s` }}>
      <div ref={ref} className={classes} style={{ ['--t1' as string]: t1, ['--t2' as string]: t2 }} onClick={onClick} onMouseMove={onMove} onMouseLeave={onLeave} data-uid={card.uid} role="button" aria-label={`${v.name}${fossil ? '' : ` tier ${tierLabel(sp.tier)}`}`}>
        {card.faceDown ? (
          <div className="cardback"><div className="emblem" /></div>
        ) : (
          <div className="frame">
            <div className="art">
              <div className="art-bg" />
              {fossil ? <img className="pixel" src={Art.icon('fossil')} alt="" draggable={false} /> : <PipSprite id={sp.id} shiny={card.edition === 'shiny'} idle={size !== 'xs'} />}
            </div>
            {!fossil && (
              <div className="corner">
                <span className="tier">{tierLabel(sp.tier)}</span>
                <span className="pips">{card.ability === 'chameleon' ? <span className="type-icon any" /> : types.map((t: PType) => <TypeIcon key={t} type={t} size={size === 'xs' ? 9 : size === 'sm' ? 12 : 14} title={typeName(t)} />)}</span>
                {showLine && size !== 'xs' && (
                  <span className="line">
                    {line!.members.map((m, i) => (
                      <span key={m.id} className="line-step">
                        {i > 0 && <i className="arr" />}
                        <PipSprite id={m.id} idle={false} className={m.id === sp.id ? 'on' : ''} />
                      </span>
                    ))}
                    {line!.branches > 0 && <span className="fork">+{line!.branches}</span>}
                  </span>
                )}
              </div>
            )}
            {card.ability && <div className="badge-ab">{T.ability(card.ability).toUpperCase()}</div>}
            <div className="nameplate">{v.name}</div>
            <div className="foot">
              <span className="pw">{v.basePower}</span>
              {card.ribbon && <span className={`ribbon ${card.ribbon}`} />}
            </div>
          </div>
        )}
        {card.edition && card.edition !== 'shadow' && <div className={`fx fx-${card.edition}`} />}
        <div className="glare" />
      </div>
    </div>
  );
  if (noTip || card.faceDown) return body;
  const tip = (
    <div>
      <div className="t-name">{v.name} {!fossil && <span className="muted" style={{ fontSize: 11 }}>· Tier {tierLabel(sp.tier)} · Stage {sp.stage + 1}{sp.final ? ' (final)' : ''}</span>}</div>
      <div className="t-sub">{fossil ? 'Fossil · no family, no type' : `${sp.genus} · ${types.map(typeName).join(' / ')}`}</div>
      <div className="t-line"><span className="power-c">+{v.basePower} Power</span> when scored{card.bonusPower ? ` (includes +${card.bonusPower} training)` : ''}</div>
      {showLine && (
        <div className="t-line t-evo">
          {line!.members.map((m, i) => <span key={m.id}>{i > 0 && ' → '}{m.id === sp.id ? <b>{m.name}</b> : m.name}</span>)}
          {line!.branches > 0 && <span> → {line!.branches} forms</span>}
          <div className="muted">Cards in the same line make pairs and sets together. Each extra stage in a set adds <span className="mult-c">+4 Mult</span>.</div>
        </div>
      )}
      {card.ability && <div className="t-line"><span className="t-tag ab">ABILITY</span>{ABILITY_LABELS[card.ability]}</div>}
      {card.edition && <div className="t-line"><span className="t-tag ed">EDITION</span>{EDITION_LABELS[card.edition]}</div>}
      {card.ribbon && <div className="t-line"><span className="t-tag rb">RIBBON</span>{RIBBON_LABELS[card.ribbon]}</div>}
      {card.frozen && <div className="t-line" style={{ color: '#9cf' }}>Frozen: cannot be played this battle</div>}
      {card.tired && <div className="t-line muted">Tired: scores nothing this battle</div>}
      {!fossil && <div className="t-flavor">{sp.flavor}</div>}
    </div>
  );
  return <Tooltip content={tip} className="card-slot">{body}</Tooltip>;
}
