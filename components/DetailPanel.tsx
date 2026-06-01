import type { LogisticsCenter } from '@/types/logistics';

interface Props {
  center: LogisticsCenter | null;
  onClose: () => void;
}

const TEMP_COLOR: Record<string, string> = {
  '저온': '#1d4ed8', '상온': '#1d4ed8', '복합': '#1d4ed8',
};
const TEMP_ICON: Record<string, string> = {
  '저온': '❄ 저온', '상온': '🌡 상온', '복합': '🌡❄ 복합',
};
const STATUS_COLOR: Record<string, string> = {
  '운영중': '#16a34a', '공사중': '#f59e0b', '준공완료': '#ef4444', '미착공': '#94a3b8',
};

const label = (text: string) => (
  <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
    {text}
  </div>
);
const value = (text: string | number | null, unit = '') => (
  <div style={{ fontSize: '13px', color: '#0B2545', fontWeight: 500 }}>
    {text != null && text !== '' ? `${typeof text === 'number' ? text.toLocaleString() : text}${unit}` : '-'}
  </div>
);

export default function DetailPanel({ center, onClose }: Props) {
  if (!center) return null;

  const dot  = STATUS_COLOR[center.status] ?? '#94a3b8';
  const tc   = TEMP_COLOR[center.temp_type] ?? '#1d4ed8';

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0,
      width: '340px', height: '100%',
      background: '#fff',
      borderLeft: '1px solid #E5E9F0',
      boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
      zIndex: 20, overflowY: 'auto',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* ── 헤더 ── */}
      <div style={{ padding: '16px', borderBottom: '1px solid #E5E9F0', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, paddingRight: '8px' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#0B2545', lineHeight: 1.3, marginBottom: '4px' }}>
              {center.name}
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{center.address}</div>
          </div>
          <button onClick={onClose} style={{
            border: 'none', background: '#F5F7FA', borderRadius: '6px',
            width: '28px', height: '28px', cursor: 'pointer',
            fontSize: '14px', color: '#64748b', flexShrink: 0,
          }}>✕</button>
        </div>

        {/* 배지 */}
        <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
          <span style={{ background: `${tc}22`, color: tc, padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>
            {TEMP_ICON[center.temp_type]}
          </span>
          <span style={{ background: `${dot}22`, color: dot, padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>
            {center.status}
          </span>
        </div>
      </div>

      {/* ── 기본 정보 ── */}
      <Section title="기본 정보">
        <Grid2>
          <Cell>{label('대지면적')}{value(center.land_area, ' ㎡')}</Cell>
          <Cell>{label('연면적')}{value(center.gfa, ' ㎡')}</Cell>
          <Cell>{label('규모')}{value(center.scale)}</Cell>
          <Cell>{label('주차')}{value(center.parking, '대')}</Cell>
          <Cell>{label('준공일')}{value(center.completion_date)}</Cell>
          <Cell>{label('개발사')}{value(center.developer)}</Cell>
        </Grid2>
      </Section>

      {/* ── 임대 정보 ── */}
      <Section title="임대 정보">
        <Grid2>
          <Cell>
            {label('상온 임대료')}
            {value(center.rental_price_warm ? `${center.rental_price_warm.toLocaleString()}원/임대평` : null)}
          </Cell>
          <Cell>
            {label('저온 임대료')}
            {value(center.rental_price_cold ? `${center.rental_price_cold.toLocaleString()}원/임대평` : null)}
          </Cell>
        </Grid2>
        <div style={{ marginTop: '8px' }}>
          {label('임대 조건')}
          {value(center.rental_conditions)}
        </div>
      </Section>

      {/* ── 층별 현황 ── */}
      <Section title="층별 현황">
        {center.floors.length === 0 ? (
          <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '16px 0' }}>
            데이터 준비 중
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ background: '#F5F7FA' }}>
                  {['층', '용도', '전용(평)', '임대(평)', '입주'].map(h => (
                    <th key={h} style={{ padding: '6px 6px', textAlign: 'center', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #E5E9F0', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {center.floors.map((f, i) => {
                  const avColor = f.available === '임대완료' ? '#ef444466' : f.available === '즉시' ? '#16a34a22' : '#f5f7fa';
                  const avText  = f.available === '임대완료' ? '#ef4444'  : f.available === '즉시' ? '#16a34a'  : '#64748b';
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #F5F7FA' }}>
                      <td style={{ padding: '6px', textAlign: 'center', fontWeight: 600, color: '#0B2545' }}>{f.floor}</td>
                      <td style={{ padding: '6px', textAlign: 'center', color: '#475569' }}>{f.usage}</td>
                      <td style={{ padding: '6px', textAlign: 'right', color: '#475569' }}>{f.exclusive_area}</td>
                      <td style={{ padding: '6px', textAlign: 'right', color: '#475569' }}>{f.rental_area}</td>
                      <td style={{ padding: '6px', textAlign: 'center' }}>
                        <span style={{ background: avColor, color: avText, padding: '2px 5px', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>
                          {f.available}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

// ── 헬퍼 컴포넌트 ──
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '14px 16px', borderBottom: '1px solid #F5F7FA' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: '#0B2545', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
        {title}
      </div>
      {children}
    </div>
  );
}
function Grid2({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>{children}</div>;
}
function Cell({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}