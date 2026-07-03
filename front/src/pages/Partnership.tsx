import { useEffect, useState } from 'react';
import { api, jr } from '../api';

export default function Partnership() {
  const [data, setData] = useState<any>(null);
  const [inviteEmail, setInviteEmail] = useState('');

  const load = () => api.get('/partnership').then(setData);
  useEffect(() => { load(); }, []);
  if (!data) return <div className="spinner">Ładowanie…</div>;

  const become = async () => {
    try { await api.post('/partnership/become', {}); load(); }
    catch (e: any) { alert(e.message); }
  };
  const invite = async () => {
    if (!inviteEmail) return;
    try { await api.post('/partnership/invite', { email: inviteEmail }); setInviteEmail(''); alert('Zaproszenie wysłane.'); }
    catch (e: any) { alert(e.message); }
  };
  const resign = async () => {
    if (!confirm('Zrezygnować z programu partnerskiego?')) return;
    try { await api.get('/partnership/resignation'); load(); } catch (e: any) { alert(e.message); }
  };
  const copy = (t: string) => { navigator.clipboard?.writeText(t); alert('Skopiowano!'); };

  if (!data.isPartner) {
    return (
      <div>
        <div className="page-head"><h1>Program partnerski</h1></div>
        <div className="card pad">
          <h3>Zarabiaj prowizje, zapraszając innych</h3>
          <p className="muted">Udostępniaj swój link polecający i zarabiaj prowizję za każdym razem, gdy zaproszone przez Ciebie osoby doładują saldo JR. Stawki prowizji rosną wraz z rozwojem Twojej sieci.</p>
          <pre style={{ whiteSpace: 'pre-wrap', background: 'var(--surface-2)', padding: 12, borderRadius: 8 }} className="muted">{data.partnerTerm}</pre>
          <button className="btn primary" onClick={become}>Zostań partnerem</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-head"><h1>Program partnerski</h1><button className="btn ghost" onClick={resign}>Zrezygnuj</button></div>

      <div className="grid cols-3" style={{ marginBottom: 16 }}>
        <div className="stat accent"><div className="label">Numer partnera</div><div className="value" style={{ fontSize: 20 }}>{data.partnerNumber}</div></div>
        <div className="stat"><div className="label">Poleceni partnerzy</div><div className="value">{data.partnersCount}</div></div>
        <div className="stat"><div className="label">Stawka prowizji</div><div className="value">{data.commissionPercent}%</div><div className="sub">zarobiono {jr(data.toCommissionPayout)}</div></div>
      </div>

      <div className="card pad" style={{ marginBottom: 16 }}>
        <h3>Twój link polecający</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <input readOnly value={data.inviteUrl || ''} />
          <button className="btn" onClick={() => copy(data.inviteUrl)}>Kopiuj</button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input placeholder="Zaproś przez e-mail…" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
          <button className="btn primary" onClick={invite}>Zaproś</button>
        </div>
      </div>

      <div className="card pad">
        <h3>Twoja sieć</h3>
        {data.partners.length === 0 && <div className="muted">Brak poleconych partnerów.</div>}
        {data.partners.length > 0 && (
          <table>
            <thead><tr><th>Imię i nazwisko</th><th>E-mail</th><th>Dołączył</th></tr></thead>
            <tbody>
              {data.partners.map((p: any) => (
                <tr key={p.id}>
                  <td>{p.companyName || [p.firstName, p.lastName].filter(Boolean).join(' ') || '—'}</td>
                  <td className="muted">{p.email}</td>
                  <td className="muted">{new Date(p.createdAt).toLocaleDateString('pl-PL')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
