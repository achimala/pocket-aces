// The "Pocket Aces" wordmark, inlined so it can use the page's pixel font (an <img> SVG cannot).
import { logoSvg } from '@/content/procedural/scenes';
import { hasGeneratedArt, generatedArt } from '@/content/generated';

export default function Logo({ className }: { className?: string }) {
  if (hasGeneratedArt('logo')) return <img className={className} src={generatedArt('logo')} alt="Pocket Aces" />;
  return <div className={className} role="img" aria-label="Pocket Aces" dangerouslySetInnerHTML={{ __html: logoSvg() }} />;
}
