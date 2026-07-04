import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, jr } from '../api';
import { Spinner, Empty, Bg, keywordFor } from '../ui';
import { Gift, ArrowRight } from 'lucide-react';

export default function Bonuses() {
  const { tab = 'available' } = useParams();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const url = tab === 'my' ? '/profile/bonuses' : '/bonuses';
    api.get(url).then((d) => setItems(tab === 'my' ? d.map((p: any) => p.program || p) : d)).finally(() => setLoading(false));
  }, [tab]);

  return (
    <div>
      <div className="screen-head">
        <h1 className="screen-title dy-h">Bonusy</h1>
        <p className="screen-sub">Jednorazowe oferty dodatkowe. Zakup realizujesz w Kreatorze.</p>
      </div>

      <div className="tabs" style={{ marginBottom: 20 }}>
        <Link to="/bonuses/available" className={`tab${tab === 'available' ? ' active' : ''}`}>Dostępne</Link>
        <Link to="/bonuses/my" className={`tab${tab === 'my' ? ' active' : ''}`}>Moje</Link>
      </div>

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Empty>{tab === 'my' ? 'Nie masz jeszcze żadnych bonusów.' : 'Brak dostępnych bonusów.'}</Empty>
      ) : (
        <div className="prog-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {items.map((b) => <BonusCard key={b.id} b={b} />)}
        </div>
      )}
    </div>
  );
}

function BonusCard({ b }: { b: any }) {
  const nav = useNavigate();
  return (
    <div className="prog-card" onClick={() => nav(`/bonus/${b.id}`)}>
      <Bg q={keywordFor(b.name, 'gift,voucher')} seed={b.id} w={800} h={300} className="prog-media" style={{ height: 96 }}>
        <span className="prog-badges">
          <span className="badge" style={{ background: 'rgba(255,255,255,.9)', color: 'var(--brand-600)' }}>
            <Gift size={13} /> BONUS
          </span>
        </span>
      </Bg>
      <div className="prog-body">
        <div className="prog-cat">Bonus</div>
        <div className="prog-name">{b.name}</div>
        <div className="prog-loc" style={{ marginTop: 4 }}>Min. saldo: {jr(b.minimalJrForView)}</div>
        <div className="prog-foot">
          <div className="stack">
            <span className="k">Cena</span>
            <span className="v dy-num">{jr(b.entryFee)}</span>
          </div>
          <button
            className="btn btn-primary btn-sm"
            style={{ marginLeft: 'auto', alignSelf: 'center' }}
            onClick={(e) => { e.stopPropagation(); nav(`/bonus/${b.id}`); }}
          >
            Kup <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
