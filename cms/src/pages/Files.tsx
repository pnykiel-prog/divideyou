import { useEffect, useState } from 'react';
import { Folder, Upload, FolderPlus, FileText, Image as ImageIcon, Trash2, ChevronRight } from 'lucide-react';
import { api } from '../api';
import { Spinner, Empty, Field, ErrorAlert } from '../components/ui';
import Modal from '../components/Modal';

interface Crumb {
  id: string | null;
  name: string;
}

const IMG_RE = /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i;
const PDF_RE = /\.pdf$/i;

function fileSize(n: any): string {
  if (n == null || isNaN(Number(n))) return '';
  const b = Number(n);
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Files() {
  const [trail, setTrail] = useState<Crumb[]>([{ id: null, name: 'Media' }]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [modal, setModal] = useState<'dir' | 'file' | null>(null);

  const current = trail[trail.length - 1];

  const load = () => {
    setLoading(true);
    const path = current.id ? `/admin/file/directory/${current.id}` : '/admin/file/directory';
    api
      .get(path)
      .then((r) => setItems(Array.isArray(r) ? r : r.items || []))
      .catch(setError)
      .finally(() => setLoading(false));
  };
  useEffect(load, [current.id]);

  const open = (item: any) => {
    if (item.isDirectory) setTrail((t) => [...t, { id: item.id, name: item.name }]);
  };
  const goto = (i: number) => setTrail((t) => t.slice(0, i + 1));

  const del = async (id: any) => {
    if (!confirm('Usunąć ten element?')) return;
    try {
      await api.del(`/admin/file/${id}`);
      load();
    } catch (err: any) {
      setError(err);
    }
  };

  const directories = items.filter((i) => i.isDirectory);
  const files = items.filter((i) => !i.isDirectory);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Pliki</h1>
          <p className="sub">Biblioteka mediów · drzewo folderów i upload.</p>
        </div>
        <div className="btn-row">
          <button className="btn" onClick={() => setModal('dir')}>
            <FolderPlus size={16} /> Nowy folder
          </button>
          <button className="btn primary" onClick={() => setModal('file')}>
            <Upload size={16} /> Prześlij plik
          </button>
        </div>
      </div>

      <ErrorAlert error={error} />

      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: 16, alignItems: 'start' }}>
        {/* Folder tree */}
        <div className="card pad">
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              color: 'var(--ink-3)',
              marginBottom: 10,
            }}
          >
            Foldery
          </div>
          {trail.map((c, i) => {
            const isCurrent = i === trail.length - 1;
            return (
              <FolderRow
                key={`t-${i}`}
                name={c.name}
                depth={i}
                active={isCurrent}
                count={isCurrent ? items.length : undefined}
                onClick={() => goto(i)}
              />
            );
          })}
          {directories.map((d) => (
            <FolderRow key={d.id} name={d.name} depth={trail.length} onClick={() => open(d)} />
          ))}
        </div>

        {/* Files pane */}
        <div className="card pad">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            {trail.map((c, i) => (
              <span key={`b-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {i > 0 && <ChevronRight size={14} style={{ color: 'var(--ink-3)' }} />}
                <a
                  onClick={() => goto(i)}
                  style={{
                    cursor: 'pointer',
                    fontWeight: i === trail.length - 1 ? 700 : 600,
                    color: i === trail.length - 1 ? 'var(--ink)' : 'var(--ink-3)',
                  }}
                >
                  {c.name}
                </a>
              </span>
            ))}
          </div>

          {loading ? (
            <Spinner />
          ) : files.length === 0 ? (
            <Empty>Brak plików w tym folderze.</Empty>
          ) : (
            <div className="grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
              {files.map((f) => {
                const isPdf = PDF_RE.test(f.name || '') || (!IMG_RE.test(f.name || '') && /pdf/i.test(f.type || ''));
                const isImg = IMG_RE.test(f.name || '') || /image/i.test(f.type || '');
                const pdf = !isImg && isPdf;
                const size = fileSize(f.size ?? f.fileSize ?? f.bytes);
                return (
                  <div
                    key={f.id}
                    className="card"
                    style={{ padding: 10, position: 'relative', textAlign: 'center' }}
                  >
                    <button
                      className="act del"
                      title="Usuń"
                      onClick={() => del(f.id)}
                      style={{ position: 'absolute', top: 6, right: 6, width: 26, height: 26 }}
                    >
                      <Trash2 size={13} />
                    </button>
                    <div
                      style={{
                        height: 86,
                        borderRadius: 9,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 9,
                        background: pdf ? 'var(--c-red-bg)' : 'var(--brand-tint)',
                        color: pdf ? 'var(--c-red)' : 'var(--brand-600)',
                      }}
                    >
                      {pdf ? <FileText size={28} /> : <ImageIcon size={28} />}
                    </div>
                    <div
                      style={{
                        fontSize: 12.5,
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={f.name}
                    >
                      {f.name}
                    </div>
                    {size && <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>{size}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {modal && (
        <CreateModal
          kind={modal}
          directoryId={current.id}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function FolderRow({
  name,
  depth,
  active,
  count,
  onClick,
}: {
  name: string;
  depth: number;
  active?: boolean;
  count?: number;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: '8px 10px',
        paddingLeft: 10 + depth * 14,
        borderRadius: 8,
        cursor: 'pointer',
        fontSize: 13.5,
        fontWeight: 600,
        color: active ? 'var(--brand-600)' : 'var(--ink-2)',
        background: active ? 'var(--brand-tint)' : 'transparent',
      }}
    >
      <Folder size={16} style={{ flex: 'none' }} />
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
      {count != null && (
        <span className="badge gray" style={{ padding: '1px 8px' }}>{count}</span>
      )}
    </div>
  );
}

function CreateModal({
  kind,
  directoryId,
  onClose,
  onSaved,
}: {
  kind: 'dir' | 'file';
  directoryId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [marketingMaterial, setMarketingMaterial] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<any>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (kind === 'dir') await api.post('/admin/file/directory', { name, directoryId });
      else await api.post('/admin/file', { name, directoryId, marketingMaterial });
      onSaved();
    } catch (err: any) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={kind === 'dir' ? 'Nowy folder' : 'Prześlij plik'} onClose={onClose}>
      <form onSubmit={save}>
        <ErrorAlert error={error} />
        <Field label="Nazwa">
          <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </Field>
        {kind === 'file' && (
          <Field label="Materiał marketingowy (URL / treść)">
            <input value={marketingMaterial} onChange={(e) => setMarketingMaterial(e.target.value)} />
          </Field>
        )}
        <div className="btn-row" style={{ justifyContent: 'flex-end', marginTop: 4 }}>
          <button type="button" className="btn ghost" onClick={onClose}>
            Anuluj
          </button>
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? 'Zapisywanie…' : kind === 'dir' ? 'Utwórz' : 'Prześlij'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
