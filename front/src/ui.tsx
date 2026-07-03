import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Check } from 'lucide-react';

/* ---- Toast ---- */
const ToastCtx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const show = useCallback((m: string) => {
    setMsg(m);
    window.setTimeout(() => setMsg(null), 2600);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg && (
        <div className="toast" role="status">
          <Check size={16} /> {msg}
        </div>
      )}
    </ToastCtx.Provider>
  );
}

/* ---- Shared bits ---- */
export function Spinner() {
  return (
    <div className="spinner">
      <span className="spin-ic" /> Ładowanie…
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

export function ErrorAlert({ children }: { children: ReactNode }) {
  return <div className="err-alert">{children}</div>;
}

/* Placeholder media gradient — deterministic per key (until real photos exist). */
const PALETTES = [
  ['#2E9E54', '#185749'],
  ['#2B6FB0', '#173A5E'],
  ['#C9821A', '#8A5410'],
  ['#9C2F63', '#5E1B3B'],
  ['#0E3A33', '#2E9E54'],
  ['#3A6EA5', '#9C2F63'],
];
export function gradient(key: string | number): string {
  const s = String(key);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const [a, b] = PALETTES[h % PALETTES.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

/* Transaction status → badge class + label */
export function statusBadge(status: number | undefined, cancelled?: boolean): { cls: string; label: string } {
  if (cancelled) return { cls: 'badge-cancel', label: 'Anulowana' };
  switch (status) {
    case 2: return { cls: 'badge-ok', label: 'Zaakceptowana' };
    case 3: return { cls: 'badge-rej', label: 'Odrzucona' };
    case 1:
    default: return { cls: 'badge-wait', label: 'Oczekująca' };
  }
}
