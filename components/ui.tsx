import { ReactNode } from 'react';
import { IconClose } from './icons';

export function Card({
  children,
  className = '',
  style,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  return (
    <div className={`card ${className}`} style={style} onClick={onClick}>
      {children}
    </div>
  );
}

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
  completed: 'chip-resolved',
  resolved: 'chip-resolved',
  active: 'chip-resolved',
  inactive: 'chip-neutral',
  assigned: 'chip-pending',
  accepted: 'chip-verified',
  declined: 'chip-rejected',
  low: 'chip-sev-low',
  medium: 'chip-sev-med',
  high: 'chip-sev-high',
  critical: 'chip-sev-high',
};

export function Chip({ children, tone }: { children: string; tone: string }) {
  return <span className={`chip ${CHIP_CLASS[tone] ?? 'chip-neutral'}`}>{children.replace(/_/g, ' ')}</span>;
}

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

export function KpiRow({ children }: { children: ReactNode }) {
  return <div className="kpi-row">{children}</div>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="section-title">{children}</div>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty-state">{children}</div>;
}

export function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
      <div
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

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
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

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="filter-bar">{children}</div>;
}

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
    <button className={`filter-pill ${active ? 'active' : ''}`} onClick={onClick}>
      {children}
    </button>
  );
}

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
  if (!open) return null;
  return (
    <div className="overlay active" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <span className="close-x" onClick={onClose}>
            <IconClose style={{ width: 16, height: 16 }} />
          </span>
        </div>
        {children}
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
  );
}

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
  if (!open) return null;
  return (
    <div className="overlay drawer active" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <span className="close-x" onClick={onClose}>
            <IconClose style={{ width: 16, height: 16 }} />
          </span>
        </div>
        {children}
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
  );
}

export function TableThumb({ gradient }: { gradient?: string }) {
  return <div className="table-thumb" style={gradient ? { background: gradient } : undefined} />;
}
