import { useEffect, useState } from 'react';
import { api } from '../api';
import { Spinner, Empty, Field, ErrorAlert } from '../components/ui';
import Modal from '../components/Modal';

interface Crumb {
  id: string | null;
  name: string;
}

export default function Files() {
  const [trail, setTrail] = useState<Crumb[]>([{ id: null, name: 'Root' }]);
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
    if (!confirm('Delete this item?')) return;
    try {
      await api.del(`/admin/file/${id}`);
      load();
    } catch (err: any) {
      setError(err);
    }
  };

  return (
    <div>
      <div className="page-head">
        <h1>Files</h1>
        <div className="btn-row">
          <button className="btn" onClick={() => setModal('dir')}>
            + New folder
          </button>
          <button className="btn primary" onClick={() => setModal('file')}>
            + Add file
          </button>
        </div>
      </div>

      <ErrorAlert error={error} />

      <div className="card pad" style={{ marginBottom: 16 }}>
        <div className="btn-row" style={{ gap: 4 }}>
          {trail.map((c, i) => (
            <span key={i}>
              <a style={{ cursor: 'pointer' }} onClick={() => goto(i)}>
                {c.name}
              </a>
              {i < trail.length - 1 && <span className="muted"> / </span>}
            </span>
          ))}
        </div>
      </div>

      <div className="card">
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <Empty>Empty folder.</Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.isDirectory ? (
                      <a style={{ cursor: 'pointer' }} onClick={() => open(item)}>
                        📁 {item.name}
                      </a>
                    ) : (
                      <span>📄 {item.name}</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${item.isDirectory ? 'blue' : 'gray'}`}>
                      {item.isDirectory ? 'Folder' : 'File'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn sm danger" onClick={() => del(item.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
    <Modal title={kind === 'dir' ? 'New folder' : 'Add file'} onClose={onClose}>
      <form onSubmit={save}>
        <ErrorAlert error={error} />
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </Field>
        {kind === 'file' && (
          <Field label="Marketing material (URL / content)">
            <input value={marketingMaterial} onChange={(e) => setMarketingMaterial(e.target.value)} />
          </Field>
        )}
        <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? 'Saving…' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
