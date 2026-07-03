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
  return <div className="spinner">Ładowanie…</div>;
}

export function Empty({ children }: { children?: ReactNode }) {
  return <div className="empty">{children ?? 'Brak danych.'}</div>;
}

export function ErrorAlert({ error }: { error: any }) {
  if (!error) return null;
  return <div className="alert error">⚠ {error.message || String(error)}</div>;
}

const PAYMENT_STATUS: Record<number, [string, string]> = {
  1: ['Bezpieczny', 'green'],
  2: ['Ostrzeżenie', 'amber'],
  3: ['Zagrożenie', 'red'],
};
export function PaymentStatusBadge({ status }: { status: number }) {
  const [label, cls] = PAYMENT_STATUS[status] || ['Nieznany', 'gray'];
  return <span className={`badge ${cls}`}>{label}</span>;
}

const TX_STATUS: Record<number, [string, string]> = {
  0: ['Inicjacja', 'gray'],
  1: ['Oczekuje', 'amber'],
  2: ['Zaakceptowana', 'green'],
  3: ['Odrzucona', 'red'],
};
export function StatusBadge({ status }: { status: number }) {
  const [label, cls] = TX_STATUS[status] || [`#${status}`, 'gray'];
  return <span className={`badge ${cls}`}>{label}</span>;
}

export function YesNo({ value }: { value: any }) {
  return value ? (
    <span className="badge green">Tak</span>
  ) : (
    <span className="badge gray">Nie</span>
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
        Łącznie: {total} · strona {page} / {pages}
      </span>
      <button className="btn sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        ← Poprzednia
      </button>
      <button className="btn sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Następna →
      </button>
    </div>
  );
}
