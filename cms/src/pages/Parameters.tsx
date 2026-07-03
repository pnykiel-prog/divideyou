import { useEffect, useState } from 'react';
import { api } from '../api';
import { Spinner, Field, ErrorAlert } from '../components/ui';

const SETTING_FIELDS: [string, string][] = [
  ['demoAccessDays', 'Demo access (days)'],
  ['accessPrice', 'Access price'],
  ['jrExchangeRate', 'JR exchange rate'],
  ['jrWithdrawalPeriodDays', 'JR withdrawal period (days)'],
  ['jrProtectionPeriodDays', 'JR protection period (days)'],
  ['minJrForVip', 'Min JR for VIP'],
  ['minJrForBonus', 'Min JR for bonus'],
  ['partnerTerm', 'Partner term'],
];

export default function Parameters() {
  const [settings, setSettings] = useState<any>({});
  const [thresholds, setThresholds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api
      .get('/admin/control-parameters')
      .then((r) => {
        setSettings(r.settings || {});
        setThresholds(r.commissionThresholds || []);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const setS = (k: string, v: any) => setSettings((s: any) => ({ ...s, [k]: v }));
  const setT = (i: number, k: string, v: any) =>
    setThresholds((ts) => ts.map((t, idx) => (idx === i ? { ...t, [k]: v } : t)));

  const save = async () => {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const s: any = {};
      for (const [k] of SETTING_FIELDS) s[k] = Number(settings[k]);
      await api.post('/admin/control-parameters', {
        settings: s,
        commissionThresholds: thresholds.map((t) => ({
          lowLimit: Number(t.lowLimit),
          highLimit: Number(t.highLimit),
          value: Number(t.value),
        })),
      });
      setMsg('Saved');
      load();
    } catch (err: any) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="page-head">
        <h1>Parameters</h1>
        <button className="btn primary" onClick={save} disabled={busy}>
          {busy ? 'Saving…' : 'Save all'}
        </button>
      </div>

      {msg && <div className="alert info">✓ {msg}</div>}
      <ErrorAlert error={error} />

      <div className="card pad" style={{ marginBottom: 20 }}>
        <h3>Settings</h3>
        <div className="grid cols-2">
          {SETTING_FIELDS.map(([k, label]) => (
            <Field key={k} label={label}>
              <input type="number" value={settings[k] ?? ''} onChange={(e) => setS(k, e.target.value)} />
            </Field>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="pad" style={{ paddingBottom: 0, display: 'flex', justifyContent: 'space-between' }}>
          <h3>Global commission thresholds</h3>
          <button
            className="btn sm"
            onClick={() => setThresholds((ts) => [...ts, { lowLimit: 0, highLimit: 0, value: 0 }])}
          >
            + Add
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Low limit</th>
              <th>High limit</th>
              <th>Value %</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {thresholds.map((t, i) => (
              <tr key={i}>
                <td>
                  <input type="number" value={t.lowLimit ?? ''} onChange={(e) => setT(i, 'lowLimit', e.target.value)} />
                </td>
                <td>
                  <input type="number" value={t.highLimit ?? ''} onChange={(e) => setT(i, 'highLimit', e.target.value)} />
                </td>
                <td>
                  <input type="number" value={t.value ?? ''} onChange={(e) => setT(i, 'value', e.target.value)} />
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    className="btn sm danger"
                    onClick={() => setThresholds((ts) => ts.filter((_, idx) => idx !== i))}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
