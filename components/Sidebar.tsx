import type { LogisticsCenter, CenterStatus, TempType } from '@/types/logistics';

interface Props {
  centers: LogisticsCenter[];
  total: number;
  search: string;
  onSearch: (v: string) => void;
  suggestions: LogisticsCenter[];          // 유지 (MapLayout 호환), 미사용
  onSuggestionSelect: (id: string) => void; // 유지 (MapLayout 호환), 미사용
  tempFilter: 'all' | TempType;
  onTempFilter: (v: 'all' | TempType) => void;
  statusFilter: 'all' | CenterStatus;
  onStatusFilter: (v: 'all' | CenterStatus) => void;
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

const STATUS_COLOR: Record<string, string> = {
  '운영중': '#16a34a', '공사중': '#f59e0b', '준공완료': '#ef4444', '미착공': '#94a3b8',
};
const TEMP_ICON: Record<string, string> = { '저온': '❄', '상온': '🌡', '복합': '🌡❄' };

export default function Sidebar({
  centers, total, search, onSearch,
  tempFilter, onTempFilter, statusFilter, onStatusFilter,
  selectedId, onSelect,
}: Props) {
  return (
    <aside style={{
      width: '280px', height: '100%', flexShrink: 0,
      background: '#fff', borderRight: '1px solid #E5E9F0',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* 검색 (자동완성 제거) */}
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
        <div style={{ display: 'flex', gap: '5px', marginTop: '8px', flexWrap: 'wrap' }}>
          {(['all', '저온', '상온', '복합'] as const).map(v => (
            <button key={v} onClick={() => onTempFilter(v)} style={chip(tempFilter === v)}>
              {v === 'all' ? '전체' : `${TEMP_ICON[v]} ${v}`}
            </button>
          ))}
        </div>

        {/* 상태 필터 */}
        <div style={{ display: 'flex', gap: '5px', marginTop: '6px', flexWrap: 'wrap' }}>
          {(['all', '운영중', '공사중', '준공완료', '미착공'] as const).map(v => (
            <button key={v} onClick={() => onStatusFilter(v)} style={chip(statusFilter === v)}>
              {v === 'all' ? '전체 상태' : v}
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
        ) : centers.map(c => (
          <div key={c.id} onClick={() => onSelect(c.id)} style={{
            padding: '12px', borderBottom: '1px solid #E5E9F0', cursor: 'pointer',
            background: selectedId === c.id ? '#EEF3F9' : '#fff',
            borderLeft: `3px solid ${selectedId === c.id ? '#0B2545' : 'transparent'}`,
            transition: 'background .1s',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0B2545', marginBottom: '2px' }}>{c.name}</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>{c.address}</div>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <span style={{ background: '#1d4ed822', color: '#1d4ed8', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>
                {TEMP_ICON[c.temp_type]} {c.temp_type}
              </span>
              <span style={{ background: `${STATUS_COLOR[c.status]}22`, color: STATUS_COLOR[c.status], padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>
                {c.status}
              </span>
              <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: 'auto' }}>{c.gfa.toLocaleString()}㎡</span>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}