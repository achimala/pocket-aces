import { itemDef, itemName } from '@/game/items';
import type { ItemInstance, RunState } from '@/game/types';
import { EDITION_LABELS } from '@/game/consumables';
import Tooltip from './Tooltip';
import { TYPE_COLORS } from '@/game/typechart';
import { Art, T } from '@/content';

interface Props {
  item: ItemInstance;
  run?: RunState;
  size?: 'md' | 'sm';
  onClick?: () => void;
  price?: number;
  sold?: boolean;
  wiggle?: boolean;
  extra?: React.ReactNode;
}

export function iconUrl(id: string): string { return Art.icon(id); }

export default function ItemCard({ item, run, size = 'md', onClick, price, sold, wiggle, extra }: Props) {
  const def = itemDef(item.defId);
  const name = itemName(item);
  const cls = ['item-card', size === 'sm' ? 'sm' : '', `rarity-${def.rarity}`, item.disabled ? 'disabled' : '', item.faceDown ? 'facedown' : '', sold ? 'sold' : '', wiggle ? 'wiggle' : '', item.edition === 'shiny' ? 'ed-shiny' : '', item.edition === 'shadow' ? 'ed-shadow' : ''].join(' ');
  const tint = def.typed && item.variant ? TYPE_COLORS[item.variant] : undefined;
  const tip = (
    <div>
      <div className="t-name">{name}</div>
      <div className="t-sub"><span className={`t-tag rar ${def.rarity}`} style={{ color: '#000' }}>{def.rarity.toUpperCase()}</span>{item.eternal ? <span className="t-tag">ETERNAL</span> : null}{item.edition ? <span className="t-tag ed">{EDITION_LABELS[item.edition]}</span> : null}</div>
      <div className="t-line">{def.desc(item, run)}</div>
      {item.disabled && <div className="t-line" style={{ color: '#f88' }}>Disabled this attack</div>}
      {!price && <div className="t-line muted" style={{ fontSize: 11 }}>Sell value {T.money(item.sellValue)}</div>}
    </div>
  );
  return (
    <Tooltip content={tip}>
      <div className={cls} onClick={onClick} style={tint ? { boxShadow: `0 5px 10px rgba(0,0,0,0.4), inset 0 -3px 0 ${tint}` } : undefined}>
        <div className={`rar ${def.rarity}`}>{def.rarity.toUpperCase()}</div>
        <div className="art">
          <img className="pixel" src={iconUrl(def.id)} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.textContent = '🎒'; }} style={tint ? { filter: `drop-shadow(0 0 6px ${tint})` } : undefined} />
        </div>
        <div className="iname">{name}</div>
        {item.eternal && <div className="eternal">♾️</div>}
        {item.edition === 'foil' && <div className="ed-foil" />}
        {item.edition === 'holo' && <div className="ed-holo" />}
        {price !== undefined && <div className="price">{T.money(price)}</div>}
        {extra}
      </div>
    </Tooltip>
  );
}
