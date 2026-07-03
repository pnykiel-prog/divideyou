import { useEffect, useState } from 'react';
import { api, jr } from '../api';

export default function Partnership() {
  const [data, setData] = useState<any>(null);
  const [inviteEmail, setInviteEmail] = useState('');

  const load = () => api.get('/partnership').then(setData);
  useEffect(() => { load(); }, []);
  if (!data) return <div className="spinner">Loading…</div>;

  const become = async () => {
    try { await api.post('/partnership/become', {}); load(); }
    catch (e: any) { alert(e.message); }
  };
  const invite = async () => {
    if (!inviteEmail) return;
    try { await api.post('/partnership/invite', { email: inviteEmail }); setInviteEmail(''); alert('Invitation sent.'); }
    catch (e: any) { alert(e.message); }
  };
  const resign = async () => {
    if (!confirm('Resign from the partnership programme?')) return;
    try { await api.get('/partnership/resignation'); load(); } catch (e: any) { alert(e.message); }
  };
  const copy = (t: string) => { navigator.clipboard?.writeText(t); alert('Copied!'); };

  if (!data.isPartner) {
    return (
      <div>
        <div className="page-head"><h1>Partnership programme</h1></div>
        <div className="card pad">
          <h3>Earn commissions by inviting others</h3>
          <p className="muted">Share your referral link and earn a commission every time the people you invite top up their JR balance. Commission rates increase as your network grows.</p>
          <pre style={{ whiteSpace: 'pre-wrap', background: 'var(--surface-2)', padding: 12, borderRadius: 8 }} className="muted">{data.partnerTerm}</pre>
          <button className="btn primary" onClick={become}>Become a partner</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-head"><h1>Partnership</h1><button className="btn ghost" onClick={resign}>Resign</button></div>

      <div className="grid cols-3" style={{ marginBottom: 16 }}>
        <div className="stat accent"><div className="label">Partner number</div><div className="value" style={{ fontSize: 20 }}>{data.partnerNumber}</div></div>
        <div className="stat"><div className="label">Referred partners</div><div className="value">{data.partnersCount}</div></div>
        <div className="stat"><div className="label">Commission rate</div><div className="value">{data.commissionPercent}%</div><div className="sub">{jr(data.toCommissionPayout)} earned</div></div>
      </div>

      <div className="card pad" style={{ marginBottom: 16 }}>
        <h3>Your referral link</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <input readOnly value={data.inviteUrl || ''} />
          <button className="btn" onClick={() => copy(data.inviteUrl)}>Copy</button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input placeholder="Invite by email…" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
          <button className="btn primary" onClick={invite}>Invite</button>
        </div>
      </div>

      <div className="card pad">
        <h3>Your network</h3>
        {data.partners.length === 0 && <div className="muted">No referred partners yet.</div>}
        {data.partners.length > 0 && (
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Joined</th></tr></thead>
            <tbody>
              {data.partners.map((p: any) => (
                <tr key={p.id}>
                  <td>{p.companyName || [p.firstName, p.lastName].filter(Boolean).join(' ') || '—'}</td>
                  <td className="muted">{p.email}</td>
                  <td className="muted">{new Date(p.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
