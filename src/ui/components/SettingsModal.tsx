import { useEffect, useState } from 'react';
import { audio } from '@/audio';
import { activeOverlay, DEFAULT_LABEL } from '@/content';
import { updateSettings, useStore } from '../store';
import { activatePack, installedPacks, onPacksChange } from '../packs';

export default function SettingsModal({ onClose, onAbandon }: { onClose: () => void; onAbandon?: () => void }) {
  const s = useStore();
  const [packs, setPacks] = useState(installedPacks());
  useEffect(() => onPacksChange(() => setPacks(installedPacks())), []);
  const attribution = activeOverlay()?.attribution;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="panel settings-card" onClick={(e) => e.stopPropagation()}>
        <h2>SETTINGS</h2>
        <div className="setting-row"><span>Music volume</span><input type="range" min={0} max={1} step={0.05} defaultValue={audio.getMusicVolume()} onChange={(e) => audio.setMusicVolume(Number(e.target.value))} /></div>
        <div className="setting-row"><span>SFX volume</span><input type="range" min={0} max={1} step={0.05} defaultValue={audio.getSfxVolume()} onChange={(e) => { audio.setSfxVolume(Number(e.target.value)); audio.sfx('click'); }} /></div>
        <div className="setting-row"><span>Mute all</span><input type="checkbox" defaultChecked={audio.isMuted()} onChange={(e) => audio.setMuted(e.target.checked)} /></div>
        <div className="setting-row"><span>Animation speed</span>
          <div className="seg">{([1, 2, 4] as const).map((v) => <button key={v} className={s.settings.speed === v ? 'on' : ''} onClick={() => updateSettings({ speed: v })}>{v}x</button>)}</div>
        </div>
        <div className="setting-row"><span>Background</span>
          <div className="seg">{(['swirl', 'slow', 'still'] as const).map((v) => <button key={v} className={s.settings.background === v && !s.settings.reducedMotion ? 'on' : ''} disabled={s.settings.reducedMotion} onClick={() => updateSettings({ background: v })}>{v[0].toUpperCase() + v.slice(1)}</button>)}</div>
        </div>
        <div className="setting-row"><span>Reduced motion<small className="setting-note">No flashes, shake or swirl</small></span><input type="checkbox" checked={s.settings.reducedMotion} onChange={(e) => updateSettings({ reducedMotion: e.target.checked })} /></div>
        <div className="setting-row"><span>CRT scanlines</span><input type="checkbox" checked={s.settings.crt} onChange={(e) => updateSettings({ crt: e.target.checked })} /></div>
        <div className="setting-row"><span>Show move names for hands</span><input type="checkbox" checked={s.settings.showMoveNames} onChange={(e) => updateSettings({ showMoveNames: e.target.checked })} /></div>
        {packs.length > 0 && (
          <>
            <div className="setting-row"><span>Content pack</span>
              <select className="input pack-select" value={s.settings.overlay} onChange={(e) => { audio.sfx('click'); void activatePack(e.target.value); }}>
                <option value="">{DEFAULT_LABEL}</option>
                {packs.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            {attribution && <div className="muted" style={{ fontSize: 11, maxWidth: 380 }}>{attribution}</div>}
          </>
        )}
        <div className="row" style={{ justifyContent: 'flex-end', gap: 10 }}>
          {onAbandon && <button className="btn btn-danger" onClick={onAbandon}>Abandon run</button>}
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
