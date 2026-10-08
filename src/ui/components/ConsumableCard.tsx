import { consumableDef } from '@/game/consumables';
import type { ConsumableInstance } from '@/game/types';
import Tooltip from './Tooltip';
import { iconUrl } from './ItemCard';
import { T } from '@/content';

interface Props {
  item: ConsumableInstance;
  onClick?: () => void;
  price?: number;
  sold?: boolean;
  hint?: string;
}

export function consumableIcon(defId: string): string {
  return iconUrl(defId);
}

export default function ConsumableCard({ item, onClick, price, sold, hint }: Props) {
  const def = consumableDef(item.defId);
  const kindLabel = (def.kind === 'tonic' ? T.terms.tonic : def.kind === 'book' ? T.terms.book : T.terms.relic).toUpperCase();
  const tip = (
    <div>
      <div className="t-name">{def.name}</div>
      <div className="t-sub">{kindLabel}{def.targets > 0 ? ` · select ${def.minTargets === def.targets ? def.targets : `up to ${def.targets}`} card${def.targets > 1 ? 's' : ''}` : ''}</div>
      <div className="t-line">{def.desc}</div>
      {hint && <div className="t-line muted" style={{ fontSize: 11 }}>{hint}</div>}
      {!price && <div className="t-line muted" style={{ fontSize: 11 }}>Sell value {T.money(Math.max(1, Math.floor(def.cost / 2)))}</div>}
    </div>
  );
  return (
    <Tooltip content={tip}>
      <div className={`cons-card ${def.kind} ${sold ? 'sold' : ''}`} onClick={onClick}>
        <div className="kind">{kindLabel}</div>
        <div className="art"><img className="pixel" src={consumableIcon(def.id)} alt="" /></div>
        <div className="iname">{def.name}</div>
        {price !== undefined && <div className="price">{T.money(price)}</div>}
      </div>
    </Tooltip>
  );
}
