'use client';

import { ReactNode, useEffect, useId } from 'react';
import { useTranslation } from 'react-i18next';
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
export function UrgencyBadge({ severity }: { severity: string }) {
  return <span className={`chip ${URGENCY_CLASS[severity] ?? 'chip-neutral'}`}>{severity}</span>;
}

export function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  const { t } = useTranslation();
  return (
    <div role="status" aria-live="polite" className="toast">
      {message}
      <button type="button" onClick={onDismiss} aria-label={t('common.dismissNotification')} style={{ color: 'inherit', opacity: 0.7 }}>
        ✕
      </button>
    </div>
  );
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

/** `tone` must name an ink token (a status colour), not a fill like --primary:
 * fills are darkened in dark mode to carry white text and are too dark to read
 * as a numeral. `accent` paints the numeral with the brand gradient and is
 * meant for one headline figure per page. */
export function KpiCard({
  label,
  value,
  sub,
  icon,
  tone,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: ReactNode;
  tone?: string;
  accent?: boolean;
}) {
  return (
    <Card className="kpi-card">
      <div className="kpi-head">
        <div>
          <div
            className={`kpi-num ${accent && !tone ? 'kpi-num--accent' : ''}`}
            style={tone ? { color: `var(--${tone})` } : undefined}
          >
            {value}
          </div>
          <div className="kpi-label">{label}</div>
          {sub && <div className="kpi-sub">{sub}</div>}
        </div>
        {icon && (
          <span
            className="kpi-icon"
            aria-hidden="true"
            style={tone ? { background: `var(--${tone}-tint)`, color: `var(--${tone})` } : undefined}
          >
            {icon}
          </span>
        )}
      </div>
    </Card>
  );
}

export function KpiRow({ children }: { children: ReactNode }) {
  return <div className="kpi-row">{children}</div>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="section-title">{children}</div>;
}

/**
 * A "?" affordance for a control whose behavior isn't obvious from its label
 * alone (SRS §3.7) — e.g. what a workflow stage's colour actually controls,
 * or what a service-area radius is used for. Native `title` gives every
 * browser's built-in hover tooltip for free; `tabIndex`+`aria-label` make the
 * same text available to keyboard and screen-reader users, who never see a
 * `title`-only tooltip otherwise.
 */
export function HelpHint({ text }: { text: string }) {
  return (
    <span
      role="img"
      aria-label={text}
      title={text}
      tabIndex={0}
      className="help-hint"
    >
      ?
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty-state">{children}</div>;
}

export function Spinner() {
  const { t } = useTranslation();
  return (
    <div role="status" aria-label={t('common.loading')} className="spinner-wrap">
      <div aria-hidden="true" className="spinner" />
    </div>
  );
}

export function FieldError({ message, id }: { message: string | null | undefined; id?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="field-error" role="alert">
      {message}
    </p>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div role="alert" className="error-banner">
      {message}
    </div>
  );
}

export function Skeleton({ height = 16, width = '100%', style }: { height?: number; width?: number | string; style?: React.CSSProperties }) {
  return (
    <div
      className="eco-skeleton"
      style={{
        height,
        width,
        borderRadius: 6,
        background: 'linear-gradient(90deg, var(--skeleton-1) 25%, var(--skeleton-2) 37%, var(--skeleton-1) 63%)',
        backgroundSize: '400% 100%',
        animation: 'eco-skeleton 1.4s ease infinite',
        ...style,
      }}
    />
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
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
    <button type="button" className={`filter-pill ${active ? 'active' : ''}`} aria-pressed={active} onClick={onClick}>
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

export function TableThumb({ gradient, alt }: { gradient?: string; alt?: string }) {
  return <div className="table-thumb" role={alt ? 'img' : undefined} aria-label={alt} aria-hidden={alt ? undefined : true} style={gradient ? { background: gradient } : undefined} />;
}

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  align?: 'left' | 'right';
  width?: number | string;
  /** Renders the header as a tri-state sort button and sets aria-sort. */
  sort?: { active: 'asc' | 'desc' | null; onToggle: () => void };
  render: (row: T, index: number) => ReactNode;
}

/**
 * The one table in the dashboard. Absorbs the `<Card><table>…` block that was
 * copy-pasted across seven pages, each with its own hand-written empty row, and
 * makes rows keyboard-activatable everywhere rather than on one page only.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  onRowActivate,
  rowLabel,
  empty,
  loading,
  caption,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  onRowActivate?: (row: T) => void;
  rowLabel?: (row: T) => string;
  empty: ReactNode;
  loading?: boolean;
  caption?: string;
}) {
  return (
    <Card>
      <table>
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                style={{ width: column.width, textAlign: column.align }}
                aria-sort={
                  column.sort
                    ? column.sort.active === 'asc'
                      ? 'ascending'
                      : column.sort.active === 'desc'
                        ? 'descending'
                        : 'none'
                    : undefined
                }
              >
                {column.sort ? (
                  <button type="button" className="th-sort" onClick={column.sort.onToggle}>
                    {column.header}
                    <span aria-hidden="true">
                      {column.sort.active === 'desc' ? '▼' : column.sort.active === 'asc' ? '▲' : '↕'}
                    </span>
                  </button>
                ) : (
                  column.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && rows.length === 0
            ? [0, 1, 2].map((placeholder) => (
                <tr key={`skeleton-${placeholder}`}>
                  {columns.map((column) => (
                    <td key={column.key}>
                      <Skeleton height={14} />
                    </td>
                  ))}
                </tr>
              ))
            : null}
          {!loading && rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="data-table-empty">
                {empty}
              </td>
            </tr>
          ) : null}
          {rows.map((row, index) => {
            const activate = onRowActivate ? () => onRowActivate(row) : undefined;
            return (
              <tr
                key={getRowKey(row)}
                className={activate ? 'row-activatable' : undefined}
                tabIndex={activate ? 0 : undefined}
                aria-label={activate && rowLabel ? rowLabel(row) : undefined}
                onClick={activate}
                onKeyDown={
                  activate
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          activate();
                        }
                      }
                    : undefined
                }
              >
                {columns.map((column) => (
                  <td key={column.key} style={{ textAlign: column.align }}>
                    {column.render(row, index)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

/** Page numbers windowed around the current page, so a 40-page list stays one row. */
function pageWindow(page: number, pageCount: number, span = 5): number[] {
  const half = Math.floor(span / 2);
  let start = Math.max(1, page - half);
  const end = Math.min(pageCount, start + span - 1);
  start = Math.max(1, end - span + 1);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function Pagination({
  page,
  pageCount,
  totalItems,
  pageSize,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const { t } = useTranslation();
  if (pageCount <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  return (
    <nav className="pagination" aria-label={t('common.pagination')}>
      <span className="pagination-info">
        {t('common.showingRange', { from, to, total: totalItems })}
      </span>
      <div className="pagination-pages">
        <button
          type="button"
          className="filter-pill"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label={t('common.previousPage')}
        >
          ‹
        </button>
        {pageWindow(page, pageCount).map((number) => (
          <button
            key={number}
            type="button"
            className={`filter-pill ${number === page ? 'active' : ''}`}
            aria-current={number === page ? 'page' : undefined}
            onClick={() => onPageChange(number)}
          >
            {number}
          </button>
        ))}
        <button
          type="button"
          className="filter-pill"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          aria-label={t('common.nextPage')}
        >
          ›
        </button>
      </div>
    </nav>
  );
}
