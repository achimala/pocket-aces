import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  content: ReactNode;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const LONG_PRESS_MS = 420;

/**
 * Tooltip in a portal. With a mouse it follows the pointer on hover; position is written straight to the DOM
 * (one rAF per frame), so moving the mouse never re-renders React. On touch screens a tap never opens it (taps
 * select things); a long-press shows it until the finger lifts, and that press doesn't count as a tap.
 */
export default function Tooltip({ content, children, className, style }: Props) {
  const [open, setOpen] = useState(false);
  const tip = useRef<HTMLDivElement | null>(null);
  const last = useRef({ x: 0, y: 0 });
  const raf = useRef(0);
  const press = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swallowClick = useRef(false);
  const place = () => {
    raf.current = 0;
    const el = tip.current; if (!el) return;
    const w = el.offsetWidth || 250, h = el.offsetHeight || 160;
    let x = last.current.x + 16, y = last.current.y + 16;
    if (x + w > window.innerWidth) x = last.current.x - w - 8;
    if (y + h > window.innerHeight) y = last.current.y - h - 8;
    el.style.transform = `translate3d(${Math.max(4, Math.min(x, window.innerWidth - w - 4))}px, ${Math.max(4, y)}px, 0)`;
    el.style.visibility = 'visible';
  };
  const at = (e: React.PointerEvent) => { last.current = { x: e.clientX, y: e.clientY }; };
  const cancelPress = () => { if (press.current) { clearTimeout(press.current); press.current = null; } };
  useEffect(() => cancelPress, []);
  return (
    <div
      className={className}
      style={style}
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') { at(e); setOpen(true); } }}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse') return;
        at(e);
        if (!raf.current) raf.current = requestAnimationFrame(place);
      }}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') setOpen(false); }}
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse') return;
        at(e);
        cancelPress();
        press.current = setTimeout(() => { press.current = null; swallowClick.current = true; setOpen(true); }, LONG_PRESS_MS);
      }}
      onPointerUp={(e) => { if (e.pointerType !== 'mouse') { cancelPress(); setOpen(false); } }}
      onPointerCancel={() => { cancelPress(); setOpen(false); }}
      onClickCapture={(e) => { if (swallowClick.current) { swallowClick.current = false; e.stopPropagation(); e.preventDefault(); } }}
      onContextMenu={(e) => { if (open) e.preventDefault(); }}
    >
      {children}
      {open && content && createPortal(<div className="tip" ref={(el) => { tip.current = el; if (el) place(); }} style={{ left: 0, top: 0, visibility: 'hidden' }}>{content}</div>, document.body)}
    </div>
  );
}
