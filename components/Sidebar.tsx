'use client';

import { useRef, useState, useEffect } from 'react';
import type { LogisticsCenter, CenterStatus, TempType } from '@/types/logistics';
import {
  TEMP_META, STATUS_COLOR, fmtSqm,
  GFA_PRESETS, GFA_SLIDER_MAX, GFA_STEP, FLOOR_OPTIONS,
  type GfaRange, type Unit,
} from '@/lib/display';

interface Props {
  centers: LogisticsCenter[];
  total: number;
  search: string;
  onSearch: (v: string) => void;
  suggestions: LogisticsCenter[];           // 유지 (MapLayout 호환), 미사용
  onSuggestionSelect: (id: string) => void; // 유지 (MapLayout 호환), 미사용
  tempFilter: 'all' | TempType;
  onTempFilter: (v: 'all' | TempType) => void;
  statusFilter: 'all' | CenterStatus;
  onStatusFilter: (v: 'all' | CenterStatus) => void;
  gfaRange: GfaRange;
  onGfaRange: (v: GfaRange) => void;
  floorMin: number;
  onFloorMin: (v: number) => void;
  availableOnly: boolean;
  onAvailableOnly: (v: boolean) => void;
  unit: Unit;
  onUnit: (v: Unit) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const ROW_H = 76;
const OVERSCAN = 6;

const chip = (active: boolean): React.CSSProperties => ({
  padding: '4px 10px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer',
  border: `1px solid ${active ? '#0B2545' : '#E5E9F0'}`,
  background: active ? '#0B2545' : '#fff',
  color: active ? '#fff' : '#64748b',
  fontWeight: active ? 600 : 400,
  whiteSpace: 'nowrap',
});

const sectionLabel: React.CSSProperties = {
  fontSize: '10px', color: '#94a3b8', fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.4px', margin: '10px 0 5px',
};

const gfaText = (p: number) =>
  p >= GFA_SLIDER_MAX ? '최대' : `${p.toLocaleString()}평`;

export default function Sidebar({
  centers, total, search, onSearch,
  tempFilter, onTempFilter, statusFilter, onStatusFilter,
  gfaRange, onGfaRange, floorMin, onFloorMin,
  availableOnly, onAvailableOnly, unit, onUnit,
  selectedId, onSelect,
}: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewH, setViewH] = useState(600);

  useEffect(() => {
    const measure = () => { if (listRef.current) setViewH(listRef.current.clientHeight); };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
    setScrollTop(0);
  }, [centers.length]);

  const start = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
  const end   = Math.min(centers.length, Math.ceil((scrollTop + viewH) / ROW_H) + OVERSCAN);
  const slice = centers.slice(start, end);

  return (
    <aside style={{
      width: '280px', height: '100%', flexShrink: 0,
      background: '#fff', borderRight: '1px solid #E5E9F0',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* 검색 + 필터 */}
      <div style={{ padding: '12px', borderBottom: '1px solid #E5E9F0' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: '#F5F7FA', borderRadius: '8px',
          padding: '8px 12px', border: '1px solid #E5E9F0',
        }}>
          <span style={{ color: '#94a3b8', fontSize: '14px' }}>🔍</span>
          <input
            type="text"
            placeholder="지역 또는 센터명 검색..."
            value={search}
            onChange={e => onSearch(e.target.value)}
            style={{ border: 'none', background: 'none', outline: 'none', fontSize: '12px', color: '#0B2545', width: '100%' }}
          />
          {search && (
            <button onClick={() => onSearch('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '14px', padding: 0 }}>✕</button>
          )}
        </div>

        {/* 온도 필터 */}
        <div style={sectionLabel}>온도구분</div>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          {(['all', '상온', '저온', '복합'] as const).map(v => (
            <button key={v} onClick={() => onTempFilter(v)} style={chip(tempFilter === v)}>
              {v === 'all' ? '전체' : v}
            </button>
          ))}
        </div>

        {/* 상태 필터 */}
        <div style={sectionLabel}>운영상태</div>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          {(['all', '운영중', '준공완료', '공사중', '미착공'] as const).map(v => (
            <button key={v} onClick={() => onStatusFilter(v)} style={chip(statusFilter === v)}>
              {v === 'all' ? '전체' : v}
            </button>
          ))}
        </div>

        {/* 연면적 필터: 프리셋 칩 + 슬라이더 */}
        <div style={sectionLabel}>연면적</div>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          {GFA_PRESETS.map(p => {
            const active = gfaRange[0] === p.min && gfaRange[1] === p.max;
            return (
              <button key={p.label} onClick={() => onGfaRange([p.min, p.max])} style={chip(active)}>
                {p.label}
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: '8px', padding: '0 2px' }}>
          <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', textAlign: 'center' }}>
            {gfaText(gfaRange[0])} ~ {gfaText(gfaRange[1])}
          </div>
          {/* 최소 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '9px', color: '#94a3b8', width: '20px' }}>최소</span>
            <input
              type="range" min={0} max={GFA_SLIDER_MAX} step={GFA_STEP} value={gfaRange[0]}
              onChange={e => onGfaRange([Math.min(+e.target.value, gfaRange[1]), gfaRange[1]])}
              style={{ flex: 1, accentColor: '#0B2545' }}
            />
          </div>
          {/* 최대 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
            <span style={{ fontSize: '9px', color: '#94a3b8', width: '20px' }}>최대</span>
            <input
              type="range" min={0} max={GFA_SLIDER_MAX} step={GFA_STEP} value={gfaRange[1]}
              onChange={e => onGfaRange([gfaRange[0], Math.max(+e.target.value, gfaRange[0])])}
              style={{ flex: 1, accentColor: '#0B2545' }}
            />
          </div>
        </div>

        {/* 조건: 층 임계값(택1) + 입주상담 */}
        <div style={sectionLabel}>조건</div>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          {FLOOR_OPTIONS.map(o => (
            <button key={o.value} onClick={() => onFloorMin(o.value)} style={chip(floorMin === o.value)}>
              {o.label}
            </button>
          ))}
          <button onClick={() => onAvailableOnly(!availableOnly)} style={chip(availableOnly)}>
            입주상담 가능
          </button>
        </div>

        {/* 단위 토글 */}
        <div style={sectionLabel}>면적 단위</div>
        <div style={{ display: 'inline-flex', border: '1px solid #E5E9F0', borderRadius: '6px', overflow: 'hidden' }}>
          {(['평', '㎡'] as Unit[]).map((u, i) => (
            <button key={u} onClick={() => onUnit(u)} style={{
              padding: '4px 14px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
              border: 'none', borderLeft: i > 0 ? '1px solid #E5E9F0' : 'none',
              background: unit === u ? '#0B2545' : '#fff',
              color: unit === u ? '#fff' : '#64748b',
            }}>
              {u}
            </button>
          ))}
        </div>
      </div>

      {/* 결과 수 */}
      <div style={{ padding: '8px 12px', fontSize: '11px', color: '#94a3b8', borderBottom: '1px solid #E5E9F0' }}>
        {centers.length}개 표시 중 (전체 {total}개)
      </div>

      {/* 리스트 (가상화) */}
      <div ref={listRef} onScroll={e => setScrollTop(e.currentTarget.scrollTop)} style={{ overflowY: 'auto', flex: 1 }}>
        {centers.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
            검색 결과가 없습니다
          </div>
        ) : (
          <div style={{ height: centers.length * ROW_H, position: 'relative' }}>
            {slice.map((c, i) => {
              const tm = TEMP_META[c.temp_type] ?? TEMP_META['상온'];
              const sc = STATUS_COLOR[c.status] ?? '#94a3b8';
              return (
                <div key={c.id} onClick={() => onSelect(c.id)} style={{
                  position: 'absolute', top: (start + i) * ROW_H, left: 0, right: 0, height: ROW_H,
                  padding: '12px', borderBottom: '1px solid #E5E9F0', cursor: 'pointer',
                  background: selectedId === c.id ? '#EEF3F9' : '#fff',
                  borderLeft: `3px solid ${selectedId === c.id ? '#0B2545' : 'transparent'}`,
                  overflow: 'hidden', boxSizing: 'border-box',
                }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0B2545', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.address}</div>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <span style={{ background: `${tm.color}22`, color: tm.color, padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>
                      {c.temp_type}
                    </span>
                    <span style={{ background: `${sc}22`, color: sc, padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>
                      {c.status}
                    </span>
                    <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: 'auto' }}>{fmtSqm(c.gfa, unit)} {unit}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
