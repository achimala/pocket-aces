import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

interface Props {
  src: string;
  className?: string;
  /** Vertical anchor of the crop, 0 = top, 1 = bottom. */
  focusY?: number;
  style?: CSSProperties;
}

/**
 * A pixel-art backdrop filling its box at a whole-number scale (in device pixels), so every art pixel is the
 * same crisp square; whatever overflows is cropped rather than stretched. Large non-pixel images (placeholders,
 * imported packs) just cover the box.
 */
export default function PixelBackdrop({ src, className, focusY = 0.5, style }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [nat, setNat] = useState<[number, number] | null>(null);
  const [box, setBox] = useState<[number, number]>([0, 0]);
  useEffect(() => {
    let live = true;
    const im = new Image();
    im.onload = () => { if (live) setNat([im.naturalWidth, im.naturalHeight]); };
    im.src = src;
    return () => { live = false; };
  }, [src]);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setBox([el.clientWidth, el.clientHeight]);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const pixelArt = !!nat && nat[0] <= 640;
  let size = 'cover';
  if (pixelArt && box[0] && box[1]) {
    const dpr = window.devicePixelRatio || 1;
    const scale = Math.ceil(Math.max(box[0] / nat![0], box[1] / nat![1]) * dpr) / dpr;
    size = `${nat![0] * scale}px ${nat![1] * scale}px`;
  }
  return (
    <div ref={ref} className={className} style={{
      ...style, backgroundImage: `url("${src}")`, backgroundSize: size, backgroundRepeat: 'no-repeat',
      backgroundPosition: `center ${Math.round(focusY * 100)}%`, imageRendering: pixelArt ? 'pixelated' : undefined,
    }} />
  );
}
