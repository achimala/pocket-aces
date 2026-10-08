import { useState } from 'react';
import { audio } from '@/audio';
import { ITEMS } from '@/game/items';
import { CONSUMABLES } from '@/game/consumables';
import { KEY_ITEMS } from '@/game/keyitems';
import { FRUITS } from '@/game/fruits';
import { Art, T } from '@/content';
import FieldGuide from '../components/FieldGuide';
import { LEADERS } from '@/game/opponents';
import { setScreen, useStore } from '../store';
import { iconUrl } from '../components/ItemCard';
import { consumableIcon } from '../components/ConsumableCard';
import PixelBackdrop from '../components/PixelBackdrop';

type Tab = 'dex' | 'items' | 'bag' | 'keys' | 'fruits' | 'leaders';

export default function Collection() {
  const s = useStore();
  const [tab, setTab] = useState<Tab>('dex');
  const p = s.profile;
  const seen = (k: string) => !!p.discovered[k];
  const t = T.terms;
  const tabs: [Tab, string][] = [['dex', t.dex], ['items', 'Items'], ['bag', `${t.tonics}, ${t.books} & ${t.relic}s`], ['keys', 'Key Items'], ['fruits', t.fruits], ['leaders', t.bosses]];
  return (
    <div className="screen collection">
      <PixelBackdrop className="backdrop" src={Art.backdrop('grandtable')} />
      <div className="row" style={{ zIndex: 1 }}>
        <button className="btn btn-ghost btn-small" onClick={() => { audio.sfx('click'); setScreen('title'); }}>← Back</button>
        <h1>COLLECTION</h1>
      </div>
      <div className="coll-tabs" style={{ zIndex: 1 }}>
        {tabs.map(([t, l]) => <button key={t} className={`btn btn-small ${tab === t ? 'btn-primary' : ''}`} onClick={() => { audio.sfx('click'); setTab(t); }}>{l}</button>)}
      </div>
      <div className="panel" style={{ padding: 14, zIndex: 1, overflow: 'auto' }}>
        {tab === 'dex' && <FieldGuide profile={p} />}
        {tab === 'items' && <div className="coll-grid">{ITEMS.map((d) => <Cell key={d.id} name={d.name} icon={iconUrl(d.id)} seen={seen('item:' + d.id)} sub={d.rarity} />)}</div>}
        {tab === 'bag' && <div className="coll-grid">{CONSUMABLES.map((d) => <Cell key={d.id} name={d.name} icon={consumableIcon(d.id)} seen={seen('cons:' + d.id)} sub={d.kind} />)}</div>}
        {tab === 'keys' && <div className="coll-grid">{KEY_ITEMS.map((d) => <Cell key={d.id} name={d.name} icon={iconUrl(d.id)} seen={seen('key:' + d.id)} sub="" />)}</div>}
        {tab === 'fruits' && <div className="coll-grid">{FRUITS.map((d) => <Cell key={d.id} name={d.name} icon={iconUrl(d.id)} seen={seen('fruit:' + d.id)} sub="" />)}</div>}
        {tab === 'leaders' && <div className="coll-grid">{LEADERS.map((l) => <Cell key={l.id} name={T.leader(l.id).name} icon={Art.portrait(l.id)} seen={seen('beat:' + l.id)} sub={T.leader(l.id).ruleName} />)}</div>}
      </div>
    </div>
  );
}

function Cell({ name, icon, seen, sub }: { name: string; icon: string; seen: boolean; sub: string }) {
  return (
    <div className={`dex-cell ${seen ? '' : 'unseen'}`} style={{ width: 96, height: 104 }} title={seen ? name : '???'}>
      <img className="pixel" src={icon} alt="" style={{ borderRadius: 6 }} onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
      <div style={{ textAlign: 'center', lineHeight: 1.05 }}>{seen ? name : '???'}</div>
      {sub && <div className="num">{sub}</div>}
    </div>
  );
}
