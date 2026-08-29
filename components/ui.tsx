import { ReactNode, useEffect, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { IconClose } from './icons';

// Card() - Generic container component for displaying content with optional styling, className, and click handler
export function Card({
  children,
  className = '',
  style,
  onClick,
  id,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  id?: string;
}) {
  return (
    <div id={id} className={`card ${className}`} style={style} onClick={onClick}>
      {children}
    </div>
  );
}

// Button() - Styled button component with variants (primary, secondary, destructive, text) and sizes
export function Button({
  children,
  variant = 'primary',
  size,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'destructive' | 'text';
  size?: 'sm';
}) {
  const variantClass =
    variant === 'primary'
      ? 'btn-primary'
      : variant === 'secondary'
        ? 'btn-secondary'
        : variant === 'destructive'
          ? 'btn-destructive'
          : 'btn-text';
  const cls = variant === 'text' ? variantClass : `btn ${variantClass}${size === 'sm' ? ' btn-sm' : ''}`;
  return (
    <button className={`${cls} ${className}`} {...props}>
      {children}
    </button>
  );
}

const CHIP_CLASS: Record<string, string> = {
  pending: 'chip-pending',
  approved: 'chip-verified',
  verified: 'chip-verified',
  rejected: 'chip-rejected',
  duplicate: 'chip-neutral',
  in_progress: 'chip-progress',
  ongoing: 'chip-progress',
  scheduled: 'chip-pending',
  completed: 'chip-resolved',
  resolved: 'chip-resolved',
  active: 'chip-resolved',
  inactive: 'chip-neutral',
  assigned: 'chip-pending',
  accepted: 'chip-verified',
  declined: 'chip-rejected',
  cancelled: 'chip-rejected',
  low: 'chip-sev-low',
  medium: 'chip-sev-med',
  high: 'chip-sev-high',
  critical: 'chip-sev-high',
};

// Chip() - Small badge component that displays status with color coding based on tone (pending, approved, rejected, etc.)
export function Chip({ children, tone }: { children: string; tone: string }) {
  return <span className={`chip ${CHIP_CLASS[tone] ?? 'chip-neutral'}`}>{children.replace(/_/g, ' ')}</span>;
}

const URGENCY_CLASS: Record<string, string> = {
  low: 'chip-urgency-low',
  medium: 'chip-urgency-medium',
  high: 'chip-urgency-high',
  critical: 'chip-urgency-critical',
};

/** Green/yellow/orange/red urgency badge, distinct from the general-purpose Chip tones. */
// UrgencyBadge() - Colored urgency/severity badge for incidents (low, medium, high, critical)
export function UrgencyBadge({ severity }: { severity: string }) {
  return <span className={`chip ${URGENCY_CLASS[severity] ?? 'chip-neutral'}`}>{severity}</span>;
}

// Toast() - Fixed notification message that appears at bottom of screen with dismiss button
export function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--text)',
        color: '#fff',
        padding: '12px 20px',
        borderRadius: 'var(--radius-md)',
        fontSize: 13.5,
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        zIndex: 100,
      }}
    >
      {message}
      <button type="button" onClick={onDismiss} aria-label={t('common.dismissNotification')} style={{ color: '#fff', opacity: 0.7 }}>
        ✕
      </button>
    </div>
  );
}


// Avatar() - Circular component showing user initials based on their name
export function Avatar({ name, size }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div className="avatar" style={size ? { width: size, height: size, fontSize: size * 0.36 } : undefined}>
      {initials}
    </div>
  );
}

// KpiCard() - Card displaying a key performance indicator with a large number and label
export function KpiCard({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <Card className="kpi-card">
      <div className="kpi-num" style={tone ? { color: `var(--${tone})` } : undefined}>
        {value}
      </div>
      <div className="kpi-label">{label}</div>
    </Card>
  );
}

// KpiRow() - Container that arranges multiple KpiCard components in a row
export function KpiRow({ children }: { children: ReactNode }) {
  return <div className="kpi-row">{children}</div>;
}

// SectionTitle() - Styled heading for separating page sections
export function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="section-title">{children}</div>;
}

// EmptyState() - Message displayed when there's no data to show
export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty-state">{children}</div>;
}

// Spinner() - Animated loading indicator shown while data is being fetched
export function Spinner() {
  const { t } = useTranslation();
  return (
    <div role="status" aria-label={t('common.loading')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
      <div
        aria-hidden="true"
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          border: '2px solid var(--border-strong)',
          borderTopColor: 'var(--primary)',
          animation: 'spin 0.7s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// FieldError() - Displays validation error message below a form field
export function FieldError({ message, id }: { message: string | null | undefined; id?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="field-error" role="alert">
      {message}
    </p>
  );
}

// ErrorBanner() - Prominent error message banner displayed at top of section
export function ErrorBanner({ message }: { message: string }) {
  return (
    <div role="alert"
      style={{
        borderRadius: 8,
        border: '1px solid var(--rejected)',
        background: 'var(--rejected-tint)',
        color: 'var(--rejected)',
        padding: '10px 14px',
        fontSize: 13.5,
      }}
    >
      {message}
    </div>
  );
}

// Skeleton() - Animated placeholder that shows while content is loading
export function Skeleton({ height = 16, width = '100%', style }: { height?: number; width?: number | string; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        height,
        width,
        borderRadius: 6,
        background: 'linear-gradient(90deg, #EFEEE7 25%, #F6F5F0 37%, #EFEEE7 63%)',
        backgroundSize: '400% 100%',
        animation: 'skeleton-pulse 1.4s ease infinite',
        ...style,
      }}
    >
      <style>{`@keyframes skeleton-pulse { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }`}</style>
    </div>
  );
}

// PageHeader() - Header at top of page with title, description, and optional action button
export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: description ? 4 : 20 }}>
      <div>
        <h1 style={{ fontSize: 22, marginBottom: 4 }}>{title}</h1>
        {description && <div className="subtitle" style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 24 }}>{description}</div>}
      </div>
      {action}
    </div>
  );
}

// FilterBar() - Container for filter/search controls
export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="filter-bar">{children}</div>;
}

// FilterPill() - Individual filter button that can be toggled active/inactive
export function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" className={`filter-pill ${active ? 'active' : ''}`} aria-pressed={active} onClick={onClick}>
      {children}
    </button>
  );
}

// Modal() - Dialog box that appears centered on screen with title, content, and action buttons
export function Modal({
  open,
  onClose,
  title,
  children,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="overlay active" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="close-x" onClick={onClose} aria-label="Close dialog">
            <IconClose style={{ width: 16, height: 16 }} />
          </button>
        </div>
        {children}
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
  );
}

// Drawer() - Side panel that slides in with title, content, and optional action buttons
export function Drawer({
  open,
  onClose,
  title,
  children,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="overlay drawer active" onClick={onClose}>
      <div className="drawer-panel" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="close-x" onClick={onClose} aria-label="Close dialog">
            <IconClose style={{ width: 16, height: 16 }} />
          </button>
        </div>
        {children}
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
  );
}

// TableThumb() - Thumbnail image placeholder for list items with optional gradient background
export function TableThumb({ gradient, alt }: { gradient?: string; alt?: string }) {
  return <div className="table-thumb" role={alt ? 'img' : undefined} aria-label={alt} aria-hidden={alt ? undefined : true} style={gradient ? { background: gradient } : undefined} />;
}
