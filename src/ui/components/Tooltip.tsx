import { useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  content: ReactNode;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/** Hover tooltip in a portal. Position is written straight to the DOM (one rAF per frame), so moving the mouse never re-renders React. */
export default function Tooltip({ content, children, className, style }: Props) {
  const [open, setOpen] = useState(false);
  const tip = useRef<HTMLDivElement | null>(null);
  const last = useRef({ x: 0, y: 0 });
  const raf = useRef(0);
  const place = () => {
    raf.current = 0;
    const el = tip.current; if (!el) return;
    const w = el.offsetWidth || 250, h = el.offsetHeight || 160;
    let x = last.current.x + 16, y = last.current.y + 16;
    if (x + w > window.innerWidth) x = last.current.x - w - 8;
    if (y + h > window.innerHeight) y = last.current.y - h - 8;
    el.style.transform = `translate3d(${Math.max(4, x)}px, ${Math.max(4, y)}px, 0)`;
    el.style.visibility = 'visible';
  };
  const move = (e: React.MouseEvent) => {
    last.current = { x: e.clientX, y: e.clientY };
    if (!raf.current) raf.current = requestAnimationFrame(place);
  };
  return (
    <div className={className} style={style} onMouseEnter={(e) => { last.current = { x: e.clientX, y: e.clientY }; setOpen(true); }} onMouseMove={move} onMouseLeave={() => setOpen(false)}>
      {children}
      {open && content && createPortal(<div className="tip" ref={(el) => { tip.current = el; if (el) place(); }} style={{ left: 0, top: 0, visibility: 'hidden' }}>{content}</div>, document.body)}
    </div>
  );
}
