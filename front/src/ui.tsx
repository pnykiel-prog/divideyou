import { createContext, useContext, useState, useCallback, ReactNode, CSSProperties } from 'react';
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

/* Map a program/bonus/news name to image search keywords (category-matched photos). */
const KEYWORDS: [RegExp, string][] = [
  [/si[łl]ownia|fitness|fitlife/i, 'gym,fitness'],
  [/j[ęe]zyk|speakup/i, 'language,classroom'],
  [/wellness|spa/i, 'spa,wellness'],
  [/coworking|office|biur/i, 'coworking,office'],
  [/jazd|driveon|prawo jazdy/i, 'driving,car'],
  [/tenis|ace/i, 'tennis,court'],
  [/boxfood|catering|kuchni|posi[łl]|jedzen/i, 'healthy,food'],
  [/kodowan|devstart|programowan/i, 'programming,laptop'],
  [/malucha|kids|dzieci/i, 'children,playground'],
  [/muzyczn|sonata|music/i, 'music,instrument'],
  [/basen|aqua|p[łl]ywan/i, 'swimming,pool'],
  [/fotograf|frameart/i, 'photography,camera'],
  [/golf|eagle/i, 'golf,course'],
  [/klinik|privatemed|medyczn|zdrow/i, 'clinic,medical'],
  [/kino|cinema/i, 'cinema,movie'],
  [/zakup|shopmax|shop/i, 'shopping,store'],
  [/paliw|fuel/i, 'fuel,gas-station'],
  [/ksi[ąa][żz]|readmore|book/i, 'books,library'],
  [/kaw|coffee/i, 'coffee,cafe'],
];
export function keywordFor(name?: string, fallback = 'lifestyle,city'): string {
  const n = name || '';
  for (const [re, kw] of KEYWORDS) if (re.test(n)) return kw;
  return fallback;
}

function hashNum(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 100000;
}

// Category-matched stock photo (LoremFlickr), stable per seed.
export function photoUrl(q: string, seed: string | number, w = 800, h = 500): string {
  return `https://loremflickr.com/${w}/${h}/${encodeURIComponent(q)}?lock=${hashNum(String(seed))}`;
}

// Media container with a real photo over a gradient fallback (shown if the photo fails to load).
export function Bg({ q, seed, w, h, overlay, className, style, children }: {
  q: string; seed: string | number; w?: number; h?: number; overlay?: boolean;
  className?: string; style?: CSSProperties; children?: ReactNode;
}) {
  return (
    <div className={`mediabg ${className || ''}`} style={{ ...style, background: gradient(seed) }}>
      <img
        className="media-img"
        src={photoUrl(q, seed, w, h)}
        alt=""
        loading="lazy"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
      />
      {overlay && <div className="media-scrim" />}
      {children}
    </div>
  );
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
