import { audio } from '@/audio';
import { buyAndUseConsumable, buyKeyItem, buyPack, buyShopCard, leaveShop, packInfo, reroll } from '@/game/run';
import { consumableDef } from '@/game/consumables';
import { keyItemDef } from '@/game/keyitems';
import type { RunState } from '@/game/types';
import { act, toast } from '../store';
import ItemCard, { iconUrl } from '../components/ItemCard';
import ConsumableCard from '../components/ConsumableCard';
import PipCard from '../components/PipCard';
import Tooltip from '../components/Tooltip';
import { Art, T } from '@/content';

export default function ShopScreen({ run }: { run: RunState }) {
  const s = run.shop!;
  const buy = (uid: string) => { const r = act((rr) => buyShopCard(rr, uid)) as string | null; if (r) { toast(r); audio.sfx('error'); } else audio.sfx('buy'); };
  const buyUse = (uid: string) => { const r = act((rr) => buyAndUseConsumable(rr, uid)) as string | null; if (r) { toast(r); audio.sfx('error'); } else audio.sfx('levelUp'); };
  const lines = T.shopLines;
  const t = T.terms;
  const line = lines[(run.region * 3 + run.battleIndex) % lines.length];
  return (
    <div className="shop">
      <div className="shop-head">
        <div className="shop-clerk"><img className="pixel" src={Art.portrait('clerk')} alt="" /></div>
        <div className="shop-bubble">{s.free ? `${T.fruit('freerollfig')} special: everything on the shelf is FREE!` : line}</div>
        <div className="spacer" />
        <div className="shop-actions">
          <button className="btn" onClick={() => { const r = act(reroll) as string | null; if (r) { toast(r); audio.sfx('error'); } else audio.sfx('reroll'); }} disabled={run.money < s.rerollCost}>Reroll {T.money(s.rerollCost)}</button>
          <button className="btn btn-primary btn-pixel" onClick={() => { audio.sfx('cardPlay'); act(leaveShop); }}>NEXT BATTLE ▶</button>
        </div>
      </div>
      <div className="shop-grid">
        <div className="panel shop-section">
          <div className="label">{t.shop} · Items & Bag</div>
          <div className="shop-row">
            {s.cards.map((c) => {
              if (c.kind === 'item') return <ItemCard key={c.uid} item={c.item!} run={run} price={c.price} sold={c.sold} onClick={() => buy(c.uid)} />;
              if (c.kind === 'consumable') {
                const def = consumableDef(c.consumable!.defId);
                return (
                  <div key={c.uid} className="col" style={{ alignItems: 'center', gap: 14 }}>
                    <ConsumableCard item={c.consumable!} price={c.price} sold={c.sold} onClick={() => buy(c.uid)} hint="Click to add to Bag" />
                    {def.targets === 0 && !c.sold && <button className="btn btn-small btn-green" onClick={() => buyUse(c.uid)}>Buy & use</button>}
                  </div>
                );
              }
              return (
                <div key={c.uid} className="col" style={{ alignItems: 'center', opacity: c.sold ? 0.3 : 1, pointerEvents: c.sold ? 'none' : 'auto' }}>
                  <PipCard card={c.card!} size="sm" onClick={() => buy(c.uid)} />
                  <div className="price" style={{ position: 'static', transform: 'none', background: 'var(--money)', color: '#2a1a00', fontFamily: 'var(--font-pixel)', fontSize: 9, padding: '3px 6px', borderRadius: 6 }}>{T.money(c.price)}</div>
                </div>
              );
            })}
            {s.cards.every((c) => c.sold) && <div className="dock-empty">Sold out. Reroll for more.</div>}
          </div>
        </div>
        <div className="panel shop-section">
          <div className="label">{t.lantern}s & Packs</div>
          <div className="shop-row">
            {s.packs.map((p) => { const info = packInfo(p.kind); return (
              <Tooltip key={p.uid} content={<div><div className="t-name">{info.name}</div><div className="t-line">{info.desc}</div></div>}>
                <div className={`pack-card ${p.sold ? 'sold' : ''}`} onClick={() => { const r = act((rr) => buyPack(rr, p.uid)) as string | null; if (r) { toast(r); audio.sfx('error'); } else audio.sfx('buy'); }}>
                  <div className="art"><img className="pixel" src={iconUrl(p.kind)} alt="" /></div>
                  <div className="iname">{info.name}</div>
                  <div className="desc">{info.desc}</div>
                  <div className="price">{T.money(p.price)}</div>
                </div>
              </Tooltip>); })}
          </div>
        </div>
        <div className="panel shop-section" style={{ gridColumn: '1 / -1' }}>
          <div className="label">Key Items</div>
          <div className="row" style={{ gap: 14, flexWrap: 'wrap' }}>
            {s.keyItems.map((k) => { const d = keyItemDef(k.id); return (
              <div key={k.id} className={`key-card ${k.sold ? 'sold' : ''}`} style={{ flex: '1 1 320px' }} onClick={() => { const r = act((rr) => buyKeyItem(rr, k.id)) as string | null; if (r) { toast(r); audio.sfx('error'); } else audio.sfx('levelUp'); }}>
                <div className="art"><img className="pixel" src={iconUrl(d.id)} alt="" /></div>
                <div><div className="kname">{d.name}</div><div className="kdesc">{d.desc}</div></div>
                <div className="price">{T.money(k.price)}</div>
              </div>); })}
            {s.keyItems.length === 0 && <div className="dock-empty">Nothing left to offer this region.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
