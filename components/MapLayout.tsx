'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import KakaoMap from './KakaoMap';
import DetailPanel from './DetailPanel';
import Legend from './Legend';
import type { LogisticsCenter, CenterStatus, TempType } from '@/types/logistics';
import {
  TEMP_META, type Unit, type GfaRange,
  GFA_SLIDER_MAX, gfaToPyeong, hasFloorOver, hasAvailableFloor,
} from '@/lib/display';

const AUTO_REFRESH_MS = 5 * 60 * 1000;

export default function MapLayout() {
  const [centers,      setCenters]      = useState<LogisticsCenter[]>([]);
  const [dataLoading,  setDataLoading]  = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [lastUpdated,  setLastUpdated]  = useState<Date | null>(null);
  const [search,       setSearch]       = useState('');
  const [tempFilter,   setTempFilter]   = useState<'all' | TempType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | CenterStatus>('all');
  const [gfaRange,     setGfaRange]     = useState<GfaRange>([0, GFA_SLIDER_MAX]);
  const [floorMin,     setFloorMin]     = useState(0);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [unit,         setUnit]         = useState<Unit>('평');
  const [selectedId,   setSelectedId]   = useState<string | null>(null);
  const [sidebarOpen,  setSidebarOpen]  = useState(true);
  const [mapReady,     setMapReady]     = useState(false);
  const [isMobile,     setIsMobile]     = useState(false);

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

  const loadData = useCallback(async (silent = false, force = false) => {
    if (silent) { setRefreshing(true); }
    else        { setDataLoading(true); }
    try {
      const res = await fetch(force ? '/api/centers?force=1' : '/api/centers');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { centers: data, updatedAt } = await res.json();
      setCenters(data);
      setLastUpdated(new Date(updatedAt));
    } catch (err) {
      console.error('[MapLayout] 데이터 로드 실패:', err);
    } finally {
      setDataLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const timer = setInterval(() => loadData(true), AUTO_REFRESH_MS);
    return () => clearInterval(timer);
  }, [loadData]);

  const filtered = useMemo(() => centers.filter(c => {
    const matchSearch    = search === '' || c.name.includes(search) || c.address.includes(search);
    const matchTemp      = tempFilter   === 'all' || c.temp_type === tempFilter;
    const matchStatus    = statusFilter === 'all' || c.status    === statusFilter;
    const p              = gfaToPyeong(c.gfa);
    const matchGfa       = p >= gfaRange[0] && p <= gfaRange[1];
    const matchFloor     = floorMin === 0 || hasFloorOver(c.floors, floorMin);
    const matchAvailable = !availableOnly || hasAvailableFloor(c.floors);
    return matchSearch && matchTemp && matchStatus && matchGfa && matchFloor && matchAvailable;
  }), [centers, search, tempFilter, statusFilter, gfaRange, floorMin, availableOnly]);

  const selectedCenter = useMemo(
    () => centers.find(c => c.id === selectedId) ?? null,
    [centers, selectedId],
  );

  const suggestions = useMemo(() => {
    if (search.length < 1) return [];
    return centers
      .filter(c => c.name.includes(search) || c.address.includes(search))
      .slice(0, 5);
  }, [centers, search]);

  const stats = useMemo(() => ({
    total: filtered.length,
    warm:  filtered.filter(c => c.temp_type === '상온').length,
    cold:  filtered.filter(c => c.temp_type === '저온').length,
    mixed: filtered.filter(c => c.temp_type === '복합').length,
  }), [filtered]);

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

      <Header
        onRefresh={() => loadData(true, true)}
        lastUpdated={lastUpdated}
        refreshing={refreshing}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>

        {isMobile && sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 30 }}
          />
        )}

        <div style={{
          flexShrink: 0, overflow: 'hidden', transition: 'width 0.25s ease',
          width: sidebarOpen ? '280px' : '0',
          ...(isMobile ? { position: 'absolute', top: 0, left: 0, height: '100%', zIndex: 31 } : {}),
        }}>
          <Sidebar
            centers={filtered} total={centers.length}
            search={search} onSearch={setSearch}
            suggestions={suggestions}
            onSuggestionSelect={id => {
              setSelectedId(id);
              setSearch(centers.find(c => c.id === id)?.name ?? '');
            }}
            tempFilter={tempFilter} onTempFilter={setTempFilter}
            statusFilter={statusFilter} onStatusFilter={setStatusFilter}
            gfaRange={gfaRange} onGfaRange={setGfaRange}
            floorMin={floorMin} onFloorMin={setFloorMin}
            availableOnly={availableOnly} onAvailableOnly={setAvailableOnly}
            unit={unit}
            selectedId={selectedId} onSelect={setSelectedId}
          />
        </div>

        <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
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
              zIndex: 16, background: '#fff', border: '1px solid #E5E9F0', borderRadius: '6px',
              width: '22px', height: '44px', cursor: 'pointer', color: '#64748b', fontSize: '11px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>

          {/* 통계 카드 */}
          <div style={{
            position: 'absolute', top: '16px', left: '44px',
            background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
            border: '1px solid #E5E9F0', borderRadius: '10px',
            padding: '10px 14px', zIndex: 16,
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)', minWidth: '140px',
          }}>
            <div style={{ fontSize: '10px', color: '#8DA9C4', textTransform: 'uppercase', letterSpacing: '0.5px' }}>표시 중</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#0B2545', lineHeight: 1.1 }}>{stats.total}</div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '10px', fontWeight: 600, color: TEMP_META['상온'].color }}>{TEMP_META['상온'].char} {stats.warm}</span>
              <span style={{ fontSize: '10px', fontWeight: 600, color: TEMP_META['저온'].color }}>{TEMP_META['저온'].char} {stats.cold}</span>
              <span style={{ fontSize: '10px', fontWeight: 600, color: TEMP_META['복합'].color }}>{TEMP_META['복합'].char} {stats.mixed}</span>
            </div>
          </div>

          <KakaoMap
            allCenters={centers}
            centers={filtered}
            unit={unit}
            onUnit={setUnit}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onReady={() => setMapReady(true)}
          />
          <Legend />
          <DetailPanel center={selectedCenter} unit={unit} onClose={() => setSelectedId(null)} />
        </main>
      </div>
    </div>
  );
}
