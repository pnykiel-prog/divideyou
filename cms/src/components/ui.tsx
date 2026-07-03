import { ReactNode } from 'react';

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Spinner() {
  return <div className="spinner">Loading…</div>;
}

export function Empty({ children }: { children?: ReactNode }) {
  return <div className="empty">{children ?? 'Nothing here yet.'}</div>;
}

export function ErrorAlert({ error }: { error: any }) {
  if (!error) return null;
  return <div className="alert error">⚠ {error.message || String(error)}</div>;
}

const PAYMENT_STATUS: Record<number, [string, string]> = {
  1: ['Safe', 'green'],
  2: ['Warning', 'amber'],
  3: ['Danger', 'red'],
};
export function PaymentStatusBadge({ status }: { status: number }) {
  const [label, cls] = PAYMENT_STATUS[status] || ['Unknown', 'gray'];
  return <span className={`badge ${cls}`}>{label}</span>;
}

const TX_STATUS: Record<number, [string, string]> = {
  0: ['Init', 'gray'],
  1: ['Pending', 'amber'],
  2: ['Accepted', 'green'],
  3: ['Rejected', 'red'],
};
export function StatusBadge({ status }: { status: number }) {
  const [label, cls] = TX_STATUS[status] || [`#${status}`, 'gray'];
  return <span className={`badge ${cls}`}>{label}</span>;
}

export function YesNo({ value }: { value: any }) {
  return value ? (
    <span className="badge green">Yes</span>
  ) : (
    <span className="badge gray">No</span>
  );
}

export function Pager({
  page,
  perPage,
  total,
  onPage,
}: {
  page: number;
  perPage: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  return (
    <div
      className="btn-row"
      style={{ marginTop: 16, alignItems: 'center', justifyContent: 'flex-end' }}
    >
      <span className="muted" style={{ marginRight: 'auto' }}>
        {total} total · page {page} / {pages}
      </span>
      <button className="btn sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        ← Prev
      </button>
      <button className="btn sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Next →
      </button>
    </div>
  );
}
