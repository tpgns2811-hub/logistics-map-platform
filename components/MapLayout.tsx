'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import KakaoMap from './KakaoMap';
import DetailPanel from './DetailPanel';
import Legend from './Legend';
import type { LogisticsCenter, CenterStatus, TempType } from '@/types/logistics';

const AUTO_REFRESH_MS = 5 * 60 * 1000; // 5분 자동 갱신

function formatTime(d: Date) {
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

export default function MapLayout() {
  const [centers,      setCenters]      = useState<LogisticsCenter[]>([]);
  const [dataLoading,  setDataLoading]  = useState(true);
  const [lastUpdated,  setLastUpdated]  = useState<Date | null>(null);
  const [search,       setSearch]       = useState('');
  const [tempFilter,   setTempFilter]   = useState<'all' | TempType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | CenterStatus>('all');
  const [selectedId,   setSelectedId]   = useState<string | null>(null);
  const [sidebarOpen,  setSidebarOpen]  = useState(true);
  const [mapReady,     setMapReady]     = useState(false);
  const [isMobile,     setIsMobile]     = useState(false);

  /* ── 모바일 감지 ── */
  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  /* ── 데이터 fetch ── */
  const loadData = useCallback(async (silent = false) => {
    if (!silent) setDataLoading(true);
    try {
      const res = await fetch('/api/centers');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { centers: data, updatedAt } = await res.json();
      setCenters(data);
      setLastUpdated(new Date(updatedAt));
    } catch (err) {
      console.error('[MapLayout] 데이터 로드 실패:', err);
    } finally {
      setDataLoading(false);
    }
  }, []);

  /* 최초 로드 + 5분 자동갱신 */
  useEffect(() => {
    loadData();
    const timer = setInterval(() => loadData(true), AUTO_REFRESH_MS);
    return () => clearInterval(timer);
  }, [loadData]);

  /* ── 필터링 ── */
  const filtered = useMemo(() => centers.filter(c => {
    const matchSearch = search === '' || c.name.includes(search) || c.address.includes(search);
    const matchTemp   = tempFilter   === 'all' || c.temp_type === tempFilter;
    const matchStatus = statusFilter === 'all' || c.status    === statusFilter;
    return matchSearch && matchTemp && matchStatus;
  }), [centers, search, tempFilter, statusFilter]);

  const selectedCenter = useMemo(
    () => centers.find(c => c.id === selectedId) ?? null,
    [centers, selectedId],
  );

  const suggestions = useMemo(() => {
    if (search.length < 1) return [];
    return centers.filter(c => c.name.includes(search) || c.address.includes(search)).slice(0, 5);
  }, [centers, search]);

  const stats = useMemo(() => ({
    total: filtered.length,
    warm:  filtered.filter(c => c.temp_type === '상온').length,
    cold:  filtered.filter(c => c.temp_type === '저온').length,
    mixed: filtered.filter(c => c.temp_type === '복합').length,
  }), [filtered]);

  /* ── 전체 로딩 화면 ── */
  if (dataLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F5F7FA', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #c5d5e8', borderTopColor: '#0B2545', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
        <div style={{ fontSize: '14px', color: '#8DA9C4', fontWeight: 500 }}>데이터 불러오는 중...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>

        {/* 모바일 dimmer */}
        {isMobile && sidebarOpen && (
          <div onClick={() => setSidebarOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 30 }} />
        )}

        {/* 사이드바 */}
        <div style={{
          flexShrink: 0, overflow: 'hidden', transition: 'width 0.25s ease',
          width: sidebarOpen ? '280px' : '0',
          ...(isMobile ? { position: 'absolute', top: 0, left: 0, height: '100%', zIndex: 31 } : {}),
        }}>
          <Sidebar
            centers={filtered} total={centers.length}
            search={search} onSearch={setSearch}
            suggestions={suggestions}
            onSuggestionSelect={id => { setSelectedId(id); setSearch(centers.find(c => c.id === id)?.name ?? ''); }}
            tempFilter={tempFilter}   onTempFilter={setTempFilter}
            statusFilter={statusFilter} onStatusFilter={setStatusFilter}
            selectedId={selectedId} onSelect={setSelectedId}
          />
        </div>

        {/* 지도 영역 */}
        <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

          {/* 지도 로딩 스켈레톤 */}
          {!mapReady && (
            <div style={{ position: 'absolute', inset: 0, background: '#e8eff7', zIndex: 15, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', border: '3px solid #c5d5e8', borderTopColor: '#0B2545', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
              <div style={{ fontSize: '13px', color: '#8DA9C4' }}>지도 로딩 중...</div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* 사이드바 토글 */}
          <button
            onClick={() => setSidebarOpen(v => !v)}
            style={{
              position: 'absolute', top: '50%', left: '10px', transform: 'translateY(-50%)',
              zIndex: 12, background: '#fff', border: '1px solid #E5E9F0', borderRadius: '6px',
              width: '22px', height: '44px', cursor: 'pointer', color: '#64748b', fontSize: '11px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>

          {/* 통계 카드 + 새로고침 */}
          <div style={{
            position: 'absolute', top: '16px', left: '44px',
            background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
            border: '1px solid #E5E9F0', borderRadius: '10px',
            padding: '10px 14px', zIndex: 11,
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          }}>
            <div style={{ fontSize: '10px', color: '#8DA9C4', textTransform: 'uppercase', letterSpacing: '0.5px' }}>표시 중</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#0B2545', lineHeight: 1.1 }}>{stats.total}</div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '10px', color: '#1d4ed8' }}>🌡 {stats.warm}</span>
              <span style={{ fontSize: '10px', color: '#1d4ed8' }}>❄ {stats.cold}</span>
              <span style={{ fontSize: '10px', color: '#1d4ed8' }}>🌡❄ {stats.mixed}</span>
            </div>

            {/* 업데이트 시간 + 새로고침 버튼 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', borderTop: '1px solid #F1F5F9', paddingTop: '6px' }}>
              <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                {lastUpdated ? `${formatTime(lastUpdated)} 갱신` : '-'}
              </span>
              <button
                onClick={() => loadData()}
                title="데이터 새로고침"
                style={{
                  marginLeft: 'auto', border: 'none', background: '#F5F7FA',
                  borderRadius: '4px', padding: '2px 6px', cursor: 'pointer',
                  fontSize: '11px', color: '#0B2545',
                }}
              >
                🔄
              </button>
            </div>
          </div>

          <KakaoMap
            centers={filtered}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onReady={() => setMapReady(true)}
          />
          <Legend />
          <DetailPanel
            center={selectedCenter}
            onClose={() => setSelectedId(null)}
          />
        </main>
      </div>
    </div>
  );
}