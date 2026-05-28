import type { LogisticsCenter, CenterStatus } from '@/types/logistics';

interface SidebarProps {
  centers: LogisticsCenter[];
  total: number;
  search: string;
  onSearch: (v: string) => void;
  coldFilter: 'all' | 'cold' | 'warm';
  onColdFilter: (v: 'all' | 'cold' | 'warm') => void;
  statusFilter: 'all' | '운영중' | '공사중' | '계획중';
  onStatusFilter: (v: 'all' | '운영중' | '공사중' | '계획중') => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const chip = (active: boolean) => ({
  padding: '4px 10px',
  borderRadius: '20px',
  fontSize: '11px',
  cursor: 'pointer',
  border: `1px solid ${active ? '#0B2545' : '#E5E9F0'}`,
  background: active ? '#0B2545' : '#fff',
  color: active ? '#fff' : '#64748b',
  fontWeight: active ? 600 : 400,
} as React.CSSProperties);

const statusColor: Record<string, string> = {
  '운영중': '#16a34a',
  '공사중': '#f59e0b',
  '계획중': '#64748b',
  '준공완료': '#3b82f6',
};

export default function Sidebar({
  centers, total, search, onSearch,
  coldFilter, onColdFilter,
  statusFilter, onStatusFilter,
  selectedId, onSelect,
}: SidebarProps) {
  return (
    <aside style={{
      width: '280px',
      flexShrink: 0,
      background: '#fff',
      borderRight: '1px solid #E5E9F0',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* 검색 */}
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
            onChange={(e) => onSearch(e.target.value)}
            style={{
              border: 'none', background: 'none', outline: 'none',
              fontSize: '12px', color: '#0B2545', width: '100%',
            }}
          />
        </div>

        {/* 온도 필터 */}
        <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
          {(['all', 'cold', 'warm'] as const).map((v) => (
            <button key={v} onClick={() => onColdFilter(v)} style={chip(coldFilter === v)}>
              {v === 'all' ? '전체' : v === 'cold' ? '❄ 냉동' : '상온'}
            </button>
          ))}
        </div>

        {/* 상태 필터 */}
        <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
          {(['all', '운영중', '공사중', '계획중'] as const).map((v) => (
            <button key={v} onClick={() => onStatusFilter(v)} style={chip(statusFilter === v)}>
              {v === 'all' ? '전체 상태' : v}
            </button>
          ))}
        </div>
      </div>

      {/* 결과 수 */}
      <div style={{
        padding: '8px 12px',
        fontSize: '11px', color: '#94a3b8',
        borderBottom: '1px solid #E5E9F0',
      }}>
        {centers.length}개 표시 중 (전체 {total}개)
      </div>

      {/* 리스트 */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {centers.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
            검색 결과가 없습니다
          </div>
        ) : (
          centers.map((c) => (
            <div
              key={c.id}
              onClick={() => onSelect(c.id)}
              style={{
                padding: '12px',
                borderBottom: '1px solid #E5E9F0',
                cursor: 'pointer',
                background: selectedId === c.id ? '#EEF3F9' : '#fff',
                borderLeft: selectedId === c.id ? '3px solid #0B2545' : '3px solid transparent',
                transition: 'background 0.15s',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0B2545', marginBottom: '2px' }}>
                {c.name}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>
                {c.address}
              </div>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                {c.cold_storage ? (
                  <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>❄ 냉동</span>
                ) : (
                  <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>상온</span>
                )}
                <span style={{
                  background: `${statusColor[c.status]}22`,
                  color: statusColor[c.status],
                  padding: '2px 6px', borderRadius: '4px', fontSize: '10px',
                }}>
                  {c.status}
                </span>
                <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: 'auto' }}>
                  {c.gfa.toLocaleString()}㎡
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}