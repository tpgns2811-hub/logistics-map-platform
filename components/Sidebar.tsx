import type { LogisticsCenter, CenterStatus, TempType } from '@/types/logistics';
import {
  TEMP_META, STATUS_COLOR, fmtSqm,
  GFA_BUCKETS, type GfaBucket, type Unit,
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
  gfaBucket: GfaBucket;
  onGfaBucket: (v: GfaBucket) => void;
  perFloor10k: boolean;
  onPerFloor10k: (v: boolean) => void;
  availableOnly: boolean;
  onAvailableOnly: (v: boolean) => void;
  unit: Unit;
  onUnit: (v: Unit) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

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

export default function Sidebar({
  centers, total, search, onSearch,
  tempFilter, onTempFilter, statusFilter, onStatusFilter,
  gfaBucket, onGfaBucket, perFloor10k, onPerFloor10k,
  availableOnly, onAvailableOnly, unit, onUnit,
  selectedId, onSelect,
}: Props) {
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

        {/* 연면적 필터 */}
        <div style={sectionLabel}>연면적</div>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          {GFA_BUCKETS.map(b => (
            <button key={b.key} onClick={() => onGfaBucket(b.key)} style={chip(gfaBucket === b.key)}>
              {b.label}
            </button>
          ))}
        </div>

        {/* 토글 필터 */}
        <div style={sectionLabel}>조건</div>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          <button onClick={() => onPerFloor10k(!perFloor10k)} style={chip(perFloor10k)}>
            층당 1만평↑
          </button>
          <button onClick={() => onAvailableOnly(!availableOnly)} style={chip(availableOnly)}>
            입주상담 가능
          </button>
        </div>

        {/* 단위 토글 */}
        <div style={sectionLabel}>면적 단위</div>
        <div style={{
          display: 'inline-flex', border: '1px solid #E5E9F0', borderRadius: '6px', overflow: 'hidden',
        }}>
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

      {/* 리스트 */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {centers.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
            검색 결과가 없습니다
          </div>
        ) : centers.map(c => {
          const tm = TEMP_META[c.temp_type] ?? TEMP_META['상온'];
          const sc = STATUS_COLOR[c.status] ?? '#94a3b8';
          return (
            <div key={c.id} onClick={() => onSelect(c.id)} style={{
              padding: '12px', borderBottom: '1px solid #E5E9F0', cursor: 'pointer',
              background: selectedId === c.id ? '#EEF3F9' : '#fff',
              borderLeft: `3px solid ${selectedId === c.id ? '#0B2545' : 'transparent'}`,
              transition: 'background .1s',
            }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0B2545', marginBottom: '2px' }}>{c.name}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>{c.address}</div>
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
    </aside>
  );
}
