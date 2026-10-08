import { TYPE_COLORS, TYPE_ICONS, typeName } from '@/game/typechart';
import type { PType } from '@/game/types';

export default function TypeBadge({ type, small }: { type: PType; small?: boolean }) {
  return (
    <span className="type-badge" style={{ background: TYPE_COLORS[type], fontSize: small ? 9 : undefined }}>
      <span>{TYPE_ICONS[type]}</span>
      {typeName(type)}
    </span>
  );
}
