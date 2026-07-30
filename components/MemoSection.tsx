'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';

interface Memo {
  id: number;
  content: string;
  created_at: string;
}

export default function MemoSection({ centerId }: { centerId: string }) {
  const { data: session, status } = useSession();
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session?.user) { setMemos([]); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/memos?centerId=${encodeURIComponent(centerId)}`)
      .then(r => r.json())
      .then(({ memos }) => { if (!cancelled) setMemos(memos ?? []); })
      .catch(() => { if (!cancelled) setMemos([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [centerId, session?.user]);

  if (status === 'loading') return null;

  if (!session?.user) {
    return (
      <div style={{ textAlign: 'center', padding: '10px 0' }}>
        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>Google 로그인 후 메모를 남길 수 있습니다</div>
        <button
          onClick={() => signIn('google')}
          style={{ fontSize: '12px', fontWeight: 600, padding: '7px 14px', borderRadius: '6px', border: '1px solid #E5E9F0', background: '#fff', color: '#0B2545', cursor: 'pointer' }}
        >Google로 로그인</button>
      </div>
    );
  }

  const add = async () => {
    if (!draft.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/memos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ centerId, content: draft.trim() }),
      });
      if (res.ok) {
        const { memo } = await res.json();
        setMemos(prev => [memo, ...prev]);
        setDraft('');
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    setMemos(prev => prev.filter(m => m.id !== id));
    await fetch(`/api/memos?id=${id}`, { method: 'DELETE' });
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') add(); }}
          placeholder="메모 남기기..."
          style={{
            flex: 1, fontSize: '12px', padding: '7px 10px', borderRadius: '6px',
            border: '1px solid #E5E9F0', outline: 'none', color: '#0B2545',
          }}
        />
        <button
          onClick={add}
          disabled={!draft.trim() || saving}
          style={{
            fontSize: '12px', fontWeight: 600, padding: '0 12px', borderRadius: '6px',
            border: 'none', background: '#0B2545', color: '#fff',
            cursor: draft.trim() ? 'pointer' : 'not-allowed', opacity: draft.trim() ? 1 : 0.5,
          }}
        >추가</button>
      </div>

      {loading ? (
        <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', padding: '8px 0' }}>불러오는 중...</div>
      ) : memos.length === 0 ? (
        <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', padding: '8px 0' }}>남긴 메모가 없습니다</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {memos.map(m => (
            <div key={m.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px',
              background: '#F5F7FA', borderRadius: '6px', padding: '8px 10px',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', color: '#0B2545', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{m.content}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '3px' }}>
                  {new Date(m.created_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <button
                onClick={() => remove(m.id)}
                style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '12px', padding: 0, flexShrink: 0 }}
              >✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
