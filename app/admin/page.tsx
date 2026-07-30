'use client';

import { useEffect, useState } from 'react';
import type { LogisticsCenter, TempType, CenterStatus } from '@/types/logistics';

type Tab = 'centers' | 'memos';

const EDIT_FIELDS: { key: keyof LogisticsCenter; label: string; type: 'text' | 'number' }[] = [
  { key: 'name', label: '건물명', type: 'text' },
  { key: 'developer', label: '개발사', type: 'text' },
  { key: 'tenant', label: '임차인', type: 'text' },
  { key: 'land_area', label: '대지면적(㎡)', type: 'number' },
  { key: 'gfa', label: '연면적(㎡)', type: 'number' },
  { key: 'scale', label: '규모', type: 'text' },
  { key: 'parking', label: '주차대수', type: 'number' },
  { key: 'permit_date', label: '허가일(YYYY-MM-DD)', type: 'text' },
  { key: 'construction_start_date', label: '착공일(YYYY-MM-DD)', type: 'text' },
  { key: 'completion_date', label: '준공일(YYYY-MM-DD)', type: 'text' },
  { key: 'rental_price_warm', label: '상온 임대료', type: 'number' },
  { key: 'rental_price_cold', label: '저온 임대료', type: 'number' },
  { key: 'rental_conditions', label: '임대 조건', type: 'text' },
  { key: 'remarks', label: '비고', type: 'text' },
  { key: 'image', label: '사진 URL', type: 'text' },
];

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [dbEnabled, setDbEnabled] = useState(true);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    fetch('/api/admin/session').then(r => r.json()).then(({ loggedIn, dbEnabled }) => {
      setLoggedIn(loggedIn); setDbEnabled(dbEnabled);
    });
  }, []);

  const login = async () => {
    setLoginError('');
    const res = await fetch('/api/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) setLoggedIn(true);
    else setLoginError('비밀번호가 올바르지 않습니다');
  };

  if (loggedIn === null) return <Centered>확인 중...</Centered>;

  if (!loggedIn) {
    return (
      <Centered>
        <div style={{ background: '#fff', padding: '32px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', width: '280px' }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#0B2545', marginBottom: '16px' }}>운영자 로그인</div>
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') login(); }}
            placeholder="비밀번호" autoFocus
            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E5E9F0', fontSize: '13px', boxSizing: 'border-box', marginBottom: '10px' }}
          />
          {loginError && <div style={{ fontSize: '12px', color: '#ef4444', marginBottom: '10px' }}>{loginError}</div>}
          <button onClick={login} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', background: '#0B2545', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
            로그인
          </button>
        </div>
      </Centered>
    );
  }

  if (!dbEnabled) {
    return <Centered>DATABASE_URL이 설정되지 않아 운영자 기능을 쓸 수 없습니다.</Centered>;
  }

  return <AdminDashboard onLogout={() => { fetch('/api/admin/logout', { method: 'POST' }); setLoggedIn(false); }} />;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F7FA', fontSize: '13px', color: '#64748b' }}>
      {children}
    </div>
  );
}

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>('centers');
  const [centers, setCenters] = useState<LogisticsCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<LogisticsCenter | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = () => {
    setLoading(true);
    fetch('/api/centers?force=1').then(r => r.json()).then(({ centers }) => setCenters(centers)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = centers.filter(c => !search || c.name.includes(search) || c.address.includes(search));

  const saveEdit = async (patch: Partial<LogisticsCenter>) => {
    if (!editing) return;
    await fetch(`/api/admin/centers/${encodeURIComponent(editing.id)}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', data: patch }),
    });
    setEditing(null);
    load();
  };

  const hideCenter = async (id: string) => {
    if (!confirm('이 건물을 목록에서 숨길까요? (원본 데이터는 지워지지 않습니다)')) return;
    await fetch(`/api/admin/centers/${encodeURIComponent(id)}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete' }),
    });
    load();
  };

  const refreshSheet = async () => {
    setRefreshing(true);
    await fetch('/api/centers?force=1');
    load();
    setRefreshing(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F5F7FA' }}>
      <header style={{ height: '56px', background: '#0B2545', color: '#fff', display: 'flex', alignItems: 'center', padding: '0 20px', gap: '20px' }}>
        <span style={{ fontWeight: 700, fontSize: '15px' }}>LogiMap 운영자</span>
        <nav style={{ display: 'flex', gap: '4px', marginLeft: '10px' }}>
          {(['centers', 'memos'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px',
              background: tab === t ? '#13315C' : 'transparent', color: '#fff', fontWeight: tab === t ? 600 : 400,
            }}>{t === 'centers' ? '건물 관리' : '메모 관리'}</button>
          ))}
        </nav>
        <button onClick={onLogout} style={{ marginLeft: 'auto', background: 'none', border: '1px solid #8DA9C4', color: '#fff', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', cursor: 'pointer' }}>
          로그아웃
        </button>
      </header>

      {tab === 'centers' ? (
        <div style={{ padding: '20px', maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="건물명/주소 검색..."
              style={{ flex: 1, padding: '9px 12px', borderRadius: '8px', border: '1px solid #E5E9F0', fontSize: '13px' }}
            />
            <button onClick={refreshSheet} disabled={refreshing} style={{
              padding: '9px 16px', borderRadius: '8px', border: 'none', background: '#0B2545', color: '#fff',
              fontSize: '13px', fontWeight: 600, cursor: refreshing ? 'not-allowed' : 'pointer', opacity: refreshing ? 0.6 : 1,
            }}>{refreshing ? '동기화 중...' : 'Sheet 새로고침'}</button>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>불러오는 중...</div>
          ) : (
            <div style={{ background: '#fff', borderRadius: '10px', overflow: 'hidden', border: '1px solid #E5E9F0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#F5F7FA' }}>
                    {['건물명', '주소', '상태', '온도', '', ''].map((h, i) => (
                      <th key={i} style={{ padding: '10px', textAlign: 'left', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #E5E9F0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 300).map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #F5F7FA' }}>
                      <td style={{ padding: '9px 10px', color: '#0B2545', fontWeight: 500 }}>{c.name}</td>
                      <td style={{ padding: '9px 10px', color: '#64748b' }}>{c.address}</td>
                      <td style={{ padding: '9px 10px', color: '#64748b' }}>{c.status}</td>
                      <td style={{ padding: '9px 10px', color: '#64748b' }}>{c.temp_type}</td>
                      <td style={{ padding: '9px 10px' }}>
                        <button onClick={() => setEditing(c)} style={{ border: 'none', background: 'none', color: '#0B2545', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>수정</button>
                      </td>
                      <td style={{ padding: '9px 10px' }}>
                        <button onClick={() => hideCenter(c.id)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px' }}>숨김</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length > 300 && (
                <div style={{ padding: '10px', textAlign: 'center', fontSize: '11px', color: '#94a3b8' }}>검색으로 좁혀보세요 (상위 300건만 표시 중)</div>
              )}
            </div>
          )}
        </div>
      ) : (
        <MemoAdmin />
      )}

      {editing && <EditModal center={editing} onClose={() => setEditing(null)} onSave={saveEdit} />}
    </div>
  );
}

function EditModal({ center, onClose, onSave }: { center: LogisticsCenter; onClose: () => void; onSave: (patch: Partial<LogisticsCenter>) => void }) {
  const [form, setForm] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    EDIT_FIELDS.forEach(f => { init[f.key] = (center as any)[f.key] ?? ''; });
    return init;
  });
  const [status, setStatus] = useState<CenterStatus>(center.status);
  const [tempType, setTempType] = useState<TempType>(center.temp_type);

  const submit = () => {
    const patch: Record<string, any> = { status, temp_type: tempType };
    EDIT_FIELDS.forEach(f => {
      const raw = form[f.key];
      patch[f.key] = f.type === 'number' ? (raw === '' ? null : Number(raw)) : raw;
    });
    onSave(patch);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: '#fff', borderRadius: '12px', width: '440px', maxHeight: '85vh', overflowY: 'auto', padding: '20px' }}>
        <div style={{ fontSize: '15px', fontWeight: 700, color: '#0B2545', marginBottom: '14px' }}>{center.name} 수정</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
          <label style={{ fontSize: '11px', color: '#64748b' }}>
            상태
            <select value={status} onChange={e => setStatus(e.target.value as CenterStatus)} style={selStyle}>
              {(['운영중', '공사중', '미착공'] as const).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label style={{ fontSize: '11px', color: '#64748b' }}>
            온도구분
            <select value={tempType} onChange={e => setTempType(e.target.value as TempType)} style={selStyle}>
              {(['상온', '저온', '복합'] as const).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </div>

        {EDIT_FIELDS.map(f => (
          <label key={f.key} style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>
            {f.label}
            <input
              type={f.type} value={form[f.key]}
              onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
              style={{ width: '100%', padding: '7px 9px', borderRadius: '6px', border: '1px solid #E5E9F0', fontSize: '12px', boxSizing: 'border-box', marginTop: '3px', color: '#0B2545' }}
            />
          </label>
        ))}

        <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #E5E9F0', background: '#fff', cursor: 'pointer', fontSize: '13px' }}>취소</button>
          <button onClick={submit} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#0B2545', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>저장</button>
        </div>
      </div>
    </div>
  );
}

const selStyle: React.CSSProperties = { width: '100%', padding: '7px 9px', borderRadius: '6px', border: '1px solid #E5E9F0', fontSize: '12px', marginTop: '3px', color: '#0B2545', boxSizing: 'border-box' };

function MemoAdmin() {
  const [memos, setMemos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch('/api/admin/memos').then(r => r.json()).then(({ memos }) => setMemos(memos ?? [])).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const remove = async (id: number) => {
    setMemos(prev => prev.filter(m => m.id !== id));
    await fetch(`/api/admin/memos?id=${id}`, { method: 'DELETE' });
  };

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>불러오는 중...</div>
      ) : memos.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>등록된 메모가 없습니다</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {memos.map(m => (
            <div key={m.id} style={{ background: '#fff', border: '1px solid #E5E9F0', borderRadius: '8px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                  건물 ID: {m.center_id} · 기기: {String(m.device_id).slice(0, 8)}... · {new Date(m.created_at).toLocaleString('ko-KR')}
                </div>
                <div style={{ fontSize: '13px', color: '#0B2545', whiteSpace: 'pre-wrap' }}>{m.content}</div>
              </div>
              <button onClick={() => remove(m.id)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', flexShrink: 0 }}>삭제</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
