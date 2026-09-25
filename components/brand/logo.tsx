import Image from 'next/image';
import './brand.css';

export const BRAND_NAME = 'EcoTrack';
export const BRAND_TAGLINE = 'Report. Act. Keep It Clean.';

interface BrandLogoProps {
  /** `mark` is the hexagon alone; `lockup` adds the ECOTRACK wordmark. */
  variant?: 'mark' | 'lockup';
  /** Mark box size in px. The wordmark and tagline scale with it. */
  size?: number;
  tagline?: boolean;
  /** Accessible name for a standalone mark. Omit when visible text or the
   *  surrounding link already names it. */
  label?: string;
  className?: string;
}

/**
 * The EcoTrack mark and lockup. Both artwork variants are rendered and CSS
 * picks one from `<html data-theme>`, which THEME_INIT_SCRIPT sets before
 * first paint -- so there is no light-to-dark swap flash and this stays a
 * server component. The dark variant carries a white rim so its outline
 * reads on dark surfaces.
 */
export function BrandLogo({ variant = 'lockup', size = 32, tagline = false, label, className }: BrandLogoProps) {
  const style = { '--brand-mark': `${size}px` } as React.CSSProperties;
  const mark = (
    <span className="brand-mark" aria-hidden="true">
      <Image src="/brand/logo-mark.png" alt="" width={size} height={size} className="brand-mark-img brand-mark-img--light" />
      <Image src="/brand/logo-mark-dark.png" alt="" width={size} height={size} className="brand-mark-img brand-mark-img--dark" />
    </span>
  );

  if (variant === 'mark') {
    return (
      <span
        className={`brand ${className ?? ''}`}
        style={style}
        {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      >
        {mark}
      </span>
    );
  }

  return (
    <span className={`brand brand--lockup ${className ?? ''}`} style={style}>
      {mark}
      <span className="brand-text">
        <span className="brand-wordmark">{BRAND_NAME}</span>
        {tagline && <span className="brand-tagline">{BRAND_TAGLINE}</span>}
      </span>
    </span>
  );
}
