import { ReactNode } from 'react';

export default function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(16,24,48,.45)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '48px 20px',
        zIndex: 50,
        overflowY: 'auto',
      }}
    >
      <div
        className="card pad"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: wide ? 720 : 480 }}
      >
        <div className="page-head" style={{ marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <button className="btn ghost sm" onClick={onClose}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
