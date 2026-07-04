import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { api } from '../api';
import { Spinner, Field, ErrorAlert } from '../components/ui';

const SETTING_FIELDS: [string, string][] = [
  ['demoAccessDays', 'Dni bezpłatnego dostępu (demo)'],
  ['accessPrice', 'Opłata za dostęp (JR)'],
  ['jrExchangeRate', 'Wartość 1 JR (PLN)'],
  ['jrWithdrawalPeriodDays', 'Okres wypłaty JR (dni)'],
  ['jrProtectionPeriodDays', 'Okres ochrony / karencji wypłaty (dni)'],
  ['minJrForVip', 'Min. saldo JR — programy VIP'],
  ['minJrForBonus', 'Min. saldo JR — bonusy'],
  ['partnerTerm', 'Termin partnera (dni)'],
];
const LABELS: Record<string, string> = Object.fromEntries(SETTING_FIELDS);

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
      setMsg('Zapisano');
      load();
    } catch (err: any) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;

  const SField = ({ k }: { k: string }) => (
    <Field label={LABELS[k] || k}>
      <input type="number" value={settings[k] ?? ''} onChange={(e) => setS(k, e.target.value)} />
    </Field>
  );

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Parametry</h1>
          <p className="sub">Ustawienia globalne platformy.</p>
        </div>
        <button className="btn primary" onClick={save} disabled={busy}>
          <Save size={16} /> {busy ? 'Zapisywanie…' : 'Zapisz parametry'}
        </button>
      </div>

      {msg && <div className="alert info">✓ {msg}</div>}
      <ErrorAlert error={error} />

      <div className="grid cols-3">
        <div className="card pad">
          <h3 style={{ margin: '0 0 16px' }}>Waluta i dostęp</h3>
          <div className="grid">
            <SField k="jrExchangeRate" />
            <SField k="demoAccessDays" />
            <SField k="accessPrice" />
          </div>
        </div>

        <div className="card pad">
          <h3 style={{ margin: '0 0 16px' }}>Progi i ochrona</h3>
          <div className="grid">
            <SField k="minJrForVip" />
            <SField k="minJrForBonus" />
            <SField k="jrProtectionPeriodDays" />
            <SField k="jrWithdrawalPeriodDays" />
          </div>
        </div>

        <div className="card pad">
          <h3 style={{ margin: '0 0 16px' }}>Progi prowizji partnerskich</h3>
          <div className="grid">
            {thresholds.map((t, i) => (
              <Field key={i} label={`Poziom ${i + 1} (%)`}>
                <input type="number" value={t.value ?? ''} onChange={(e) => setT(i, 'value', e.target.value)} />
              </Field>
            ))}
            <SField k="partnerTerm" />
          </div>
        </div>
      </div>
    </div>
  );
}
