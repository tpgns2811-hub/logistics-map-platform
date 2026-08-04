'use client';

import { useEffect, useRef, useState } from 'react';
import type { LogisticsCenter, TempType, CenterStatus } from '@/types/logistics';
import type { PendingChange } from '@/types/pendingChange';

type Tab = 'centers' | 'memos' | 'review';

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

const TAB_LABEL: Record<Tab, string> = { centers: '건물 관리', memos: '메모 관리', review: '검토' };

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
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [hiddenOverrides, setHiddenOverrides] = useState<{ center_id: string; data: Record<string, unknown> | null }[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  const load = () => {
    setLoading(true);
    fetch('/api/centers?force=1').then(r => r.json()).then(({ centers }) => setCenters(centers)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const loadPendingCount = () => {
    fetch('/api/admin/pending-changes?status=pending').then(r => r.json()).then(({ changes }) => setPendingCount((changes ?? []).length));
  };
  useEffect(loadPendingCount, []);

  const loadHidden = () => {
    fetch('/api/admin/centers').then(r => r.json()).then(({ overrides }) => {
      setHiddenOverrides((overrides ?? []).filter((o: { action: string }) => o.action === 'delete'));
    });
  };
  useEffect(() => { if (showHidden) loadHidden(); }, [showHidden]);

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

  const [createError, setCreateError] = useState('');
  const saveCreate = async (id: string, patch: Record<string, unknown>) => {
    setCreateError('');
    if (centers.some(c => c.id === id)) { setCreateError('이미 존재하는 건물 ID입니다'); return; }
    const res = await fetch(`/api/admin/centers/${encodeURIComponent(id)}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', data: patch }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: '저장 실패' }));
      setCreateError(error ?? '저장 실패');
      return;
    }
    setCreating(false);
    load();
  };

  const hideCenter = async (c: LogisticsCenter) => {
    if (!confirm('이 건물을 목록에서 숨길까요? (원본 데이터는 지워지지 않습니다)')) return;
    await fetch(`/api/admin/centers/${encodeURIComponent(c.id)}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', data: { name: c.name, address: c.address } }),
    });
    load();
  };

  const restoreCenter = async (centerId: string) => {
    await fetch(`/api/admin/centers/${encodeURIComponent(centerId)}`, { method: 'DELETE' });
    loadHidden();
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
          {(['centers', 'memos', 'review'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px',
              background: tab === t ? '#13315C' : 'transparent', color: '#fff', fontWeight: tab === t ? 600 : 400,
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              {TAB_LABEL[t]}
              {t === 'review' && pendingCount > 0 && (
                <span style={{ background: '#ef4444', color: '#fff', fontSize: '10px', fontWeight: 700, borderRadius: '9px', padding: '1px 6px', minWidth: '14px', textAlign: 'center' }}>
                  {pendingCount}
                </span>
              )}
            </button>
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
            <button onClick={() => setCreating(true)} style={{
              padding: '9px 16px', borderRadius: '8px', border: 'none', background: '#16794f', color: '#fff',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}>+ 건물 추가</button>
            <button onClick={refreshSheet} disabled={refreshing} style={{
              padding: '9px 16px', borderRadius: '8px', border: 'none', background: '#0B2545', color: '#fff',
              fontSize: '13px', fontWeight: 600, cursor: refreshing ? 'not-allowed' : 'pointer', opacity: refreshing ? 0.6 : 1,
            }}>{refreshing ? '동기화 중...' : 'Sheet 새로고침'}</button>
          </div>

          <button onClick={() => setShowHidden(v => !v)} style={{
            border: 'none', background: 'none', color: '#64748b', cursor: 'pointer', fontSize: '12px', marginBottom: '10px', textDecoration: 'underline',
          }}>{showHidden ? '숨김 목록 닫기 ▲' : '숨김 목록 보기 ▼'}</button>

          {showHidden && (
            <div style={{ background: '#fff', border: '1px solid #E5E9F0', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px' }}>
              {hiddenOverrides.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#94a3b8', padding: '6px 0' }}>숨긴 건물이 없습니다</div>
              ) : hiddenOverrides.map(o => (
                <div key={o.center_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #F5F7FA', fontSize: '12px' }}>
                  <span style={{ color: '#0B2545' }}>
                    {(o.data as { name?: string })?.name ?? '(이름 정보 없음 - 이 기능 추가 전 숨김)'}
                    <span style={{ color: '#94a3b8', marginLeft: '8px' }}>{o.center_id}</span>
                  </span>
                  <button onClick={() => restoreCenter(o.center_id)} style={{ border: 'none', background: 'none', color: '#16794f', cursor: 'pointer', fontWeight: 600 }}>복원</button>
                </div>
              ))}
            </div>
          )}

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
                        <button onClick={() => hideCenter(c)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px' }}>숨김</button>
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
      ) : tab === 'memos' ? (
        <MemoAdmin />
      ) : (
        <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
          <FlyerUploads />
          <PendingChangesAdmin onCountChange={setPendingCount} />
        </div>
      )}

      {editing && <EditModal center={editing} onClose={() => setEditing(null)} onSave={saveEdit} />}
      {creating && <CreateModal error={createError} onClose={() => { setCreating(false); setCreateError(''); }} onSave={saveCreate} />}
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

function CreateModal({ error, onClose, onSave }: { error: string; onClose: () => void; onSave: (id: string, patch: Record<string, unknown>) => void }) {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [form, setForm] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    EDIT_FIELDS.forEach(f => { if (f.key !== 'name') init[f.key] = ''; });
    return init;
  });
  const [status, setStatus] = useState<CenterStatus>('미착공');
  const [tempType, setTempType] = useState<TempType>('상온');

  const submit = () => {
    if (!id.trim()) { alert('건물 ID를 입력하세요'); return; }
    if (!name.trim()) { alert('건물명을 입력하세요'); return; }
    const lat = Number(latitude), lng = Number(longitude);
    if (!latitude || !longitude || isNaN(lat) || isNaN(lng)) { alert('위도/경도를 숫자로 입력하세요'); return; }

    const patch: Record<string, unknown> = {
      name, address, latitude: lat, longitude: lng,
      province: '', city: '', district: '', history: '', nearbyICs: [],
      status, temp_type: tempType,
    };
    EDIT_FIELDS.forEach(f => {
      if (f.key === 'name') return;
      const raw = form[f.key];
      patch[f.key] = f.type === 'number' ? (raw === '' ? null : Number(raw)) : raw;
    });
    onSave(id.trim(), patch);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: '#fff', borderRadius: '12px', width: '440px', maxHeight: '85vh', overflowY: 'auto', padding: '20px' }}>
        <div style={{ fontSize: '15px', fontWeight: 700, color: '#0B2545', marginBottom: '14px' }}>신규 건물 추가</div>
        {error && <div style={{ fontSize: '12px', color: '#ef4444', marginBottom: '10px' }}>{error}</div>}

        <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>
          건물 ID(고유값, 기존 시트와 겹치면 안 됨)
          <input value={id} onChange={e => setId(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>
          건물명
          <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>
          주소
          <input value={address} onChange={e => setAddress(e.target.value)} style={inputStyle} />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
          <label style={{ fontSize: '11px', color: '#64748b' }}>
            위도
            <input value={latitude} onChange={e => setLatitude(e.target.value)} style={inputStyle} />
          </label>
          <label style={{ fontSize: '11px', color: '#64748b' }}>
            경도
            <input value={longitude} onChange={e => setLongitude(e.target.value)} style={inputStyle} />
          </label>
        </div>

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

        {EDIT_FIELDS.filter(f => f.key !== 'name').map(f => (
          <label key={f.key} style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>
            {f.label}
            <input
              type={f.type} value={form[f.key]}
              onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
              style={inputStyle}
            />
          </label>
        ))}

        <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #E5E9F0', background: '#fff', cursor: 'pointer', fontSize: '13px' }}>취소</button>
          <button onClick={submit} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#16794f', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>추가</button>
        </div>
      </div>
    </div>
  );
}

const selStyle: React.CSSProperties = { width: '100%', padding: '7px 9px', borderRadius: '6px', border: '1px solid #E5E9F0', fontSize: '12px', marginTop: '3px', color: '#0B2545', boxSizing: 'border-box' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '7px 9px', borderRadius: '6px', border: '1px solid #E5E9F0', fontSize: '12px', boxSizing: 'border-box', marginTop: '3px', color: '#0B2545' };

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
                  건물 ID: {m.center_id} · 계정: {m.device_id} · {new Date(m.created_at).toLocaleString('ko-KR')}
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

const SOURCE_LABEL: Record<string, string> = { permit: '인허가', leasing_flyer: '임대안내문' };
const SOURCE_COLOR: Record<string, string> = { permit: '#2563eb', leasing_flyer: '#d97706' };

const UPLOAD_STATUS_LABEL: Record<string, string> = { uploaded: '처리 대기', processing: '처리 중', processed: '처리 완료', failed: '처리 실패' };
const UPLOAD_STATUS_COLOR: Record<string, string> = { uploaded: '#94a3b8', processing: '#2563eb', processed: '#16794f', failed: '#ef4444' };

function FlyerUploads() {
  const [uploads, setUploads] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [vendorLabel, setVendorLabel] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    fetch('/api/admin/flyer-uploads').then(r => r.json()).then(({ uploads }) => setUploads(uploads ?? []));
  };
  useEffect(load, []);

  const pickFile = (f: File | null) => {
    setError('');
    if (f && f.type !== 'application/pdf') { setError('PDF 파일만 업로드할 수 있습니다'); return; }
    setFile(f);
  };

  const upload = async () => {
    if (!file) { setError('PDF 파일을 선택하세요'); return; }
    setUploading(true);
    setError('');
    const form = new FormData();
    form.append('file', file);
    form.append('vendor_label', vendorLabel);
    const res = await fetch('/api/admin/flyer-uploads', { method: 'POST', body: form });
    setUploading(false);
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: '업로드 실패' }));
      setError(error ?? '업로드 실패');
      return;
    }
    setFile(null);
    setVendorLabel('');
    load();
  };

  return (
    <div style={{ background: '#fff', border: '1px solid #E5E9F0', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0B2545', marginBottom: '10px' }}>임대안내문 업로드</div>

      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault();
          setDragOver(false);
          pickFile(e.dataTransfer.files?.[0] ?? null);
        }}
        style={{
          border: `2px dashed ${dragOver ? '#0B2545' : '#E5E9F0'}`, borderRadius: '8px', padding: '18px',
          textAlign: 'center', cursor: 'pointer', marginBottom: '8px',
          background: dragOver ? '#F5F7FA' : 'transparent', transition: 'background 0.15s, border-color 0.15s',
        }}
      >
        <input
          ref={fileInputRef}
          type="file" accept="application/pdf"
          onChange={e => pickFile(e.target.files?.[0] ?? null)}
          style={{ display: 'none' }}
        />
        {file ? (
          <div style={{ fontSize: '12px', color: '#0B2545', fontWeight: 600 }}>선택된 파일: {file.name}</div>
        ) : (
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>PDF 파일을 여기로 드래그하거나 클릭해서 선택하세요</div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
        <input
          value={vendorLabel} onChange={e => setVendorLabel(e.target.value)}
          placeholder="벤더 라벨 (예: PineEstate, 에스원)"
          style={{ flex: 1, minWidth: '160px', padding: '7px 9px', borderRadius: '6px', border: '1px solid #E5E9F0', fontSize: '12px' }}
        />
        <button onClick={upload} disabled={uploading} style={{
          padding: '7px 14px', borderRadius: '6px', border: 'none', background: '#0B2545', color: '#fff',
          fontSize: '12px', fontWeight: 600, cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1,
        }}>{uploading ? '업로드 중...' : '업로드'}</button>
      </div>
      {error && <div style={{ fontSize: '12px', color: '#ef4444', marginBottom: '8px' }}>{error}</div>}
      {uploads.length === 0 ? (
        <div style={{ fontSize: '12px', color: '#94a3b8' }}>업로드된 파일이 없습니다</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {uploads.map(u => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', padding: '4px 0', borderBottom: '1px solid #F5F7FA' }}>
              <span style={{ background: UPLOAD_STATUS_COLOR[u.status], color: '#fff', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', fontWeight: 700 }}>
                {UPLOAD_STATUS_LABEL[u.status] ?? u.status}
              </span>
              <span style={{ color: '#0B2545' }}>{u.filename}</span>
              {u.vendor_label && <span style={{ color: '#94a3b8' }}>({u.vendor_label})</span>}
              <span style={{ color: '#94a3b8', marginLeft: 'auto' }}>{new Date(u.uploaded_at).toLocaleString('ko-KR')}</span>
              {u.error_message && <span style={{ color: '#ef4444' }}>{u.error_message}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PendingChangesAdmin({ onCountChange }: { onCountChange: (n: number) => void }) {
  const [changes, setChanges] = useState<PendingChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<number, string>>({});

  const load = () => {
    setLoading(true);
    fetch('/api/admin/pending-changes?status=pending')
      .then(r => r.json())
      .then(({ changes }) => { setChanges(changes ?? []); onCountChange((changes ?? []).length); })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const act = async (id: number, action: 'approve' | 'reject') => {
    setErrors(prev => { const n = { ...prev }; delete n[id]; return n; });
    const res = await fetch(`/api/admin/pending-changes/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: '처리 실패' }));
      setErrors(prev => ({ ...prev, [id]: error ?? '처리 실패' }));
      return;
    }
    setChanges(prev => {
      const next = prev.filter(c => c.id !== id);
      onCountChange(next.length);
      return next;
    });
  };

  return (
    <div>
      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0B2545', margin: '4px 0 10px' }}>검토 대기 목록</div>
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>불러오는 중...</div>
      ) : changes.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>검토 대기 중인 변경사항이 없습니다</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {changes.map(c => (
            <div key={c.id} style={{ background: '#fff', border: '1px solid #E5E9F0', borderRadius: '8px', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ background: SOURCE_COLOR[c.source], color: '#fff', fontSize: '10px', fontWeight: 700, borderRadius: '4px', padding: '2px 7px' }}>
                  {SOURCE_LABEL[c.source] ?? c.source}
                </span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>{c.change_type === 'create' ? '신규 건물' : '정보 수정'}</span>
                <span style={{ fontSize: '12px', color: '#0B2545', fontWeight: 600 }}>{c.center_id}</span>
                <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: 'auto' }}>{new Date(c.detected_at).toLocaleString('ko-KR')}</span>
              </div>

              <div style={{ background: '#F5F7FA', borderRadius: '6px', padding: '8px 10px', marginBottom: '10px' }}>
                {c.change_type === 'update' ? (
                  (c.changed_fields ?? Object.keys(c.after_data)).map(k => (
                    <div key={k} style={{ display: 'flex', gap: '8px', fontSize: '12px', padding: '3px 0' }}>
                      <span style={{ color: '#64748b', minWidth: '90px' }}>{k}</span>
                      <span style={{ color: '#ef4444', textDecoration: 'line-through' }}>{String(c.before_data?.[k] ?? '(없음)')}</span>
                      <span style={{ color: '#94a3b8' }}>→</span>
                      <span style={{ color: '#16794f', fontWeight: 600 }}>{String(c.after_data[k])}</span>
                    </div>
                  ))
                ) : (
                  Object.entries(c.after_data).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', gap: '8px', fontSize: '12px', padding: '3px 0' }}>
                      <span style={{ color: '#64748b', minWidth: '90px' }}>{k}</span>
                      <span style={{ color: '#16794f' }}>{String(v)}</span>
                    </div>
                  ))
                )}
              </div>

              {errors[c.id] && <div style={{ fontSize: '12px', color: '#ef4444', marginBottom: '8px' }}>{errors[c.id]}</div>}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => act(c.id, 'approve')} style={{ padding: '7px 14px', borderRadius: '6px', border: 'none', background: '#16794f', color: '#fff', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>승인</button>
                <button onClick={() => act(c.id, 'reject')} style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid #E5E9F0', background: '#fff', color: '#ef4444', fontSize: '12px', cursor: 'pointer' }}>거절</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
