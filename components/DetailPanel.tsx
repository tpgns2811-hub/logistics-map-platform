import type { LogisticsCenter, FloorInfo } from '@/types/logistics';
import { TEMP_META, STATUS_COLOR, fmtSqm, fmtPyeong, type Unit } from '@/lib/display';
import MemoSection from './MemoSection';

interface Props {
  center: LogisticsCenter | null;
  floors: FloorInfo[];
  floorsLoading: boolean;
  unit: Unit;
  onClose: () => void;
}

const lbl = (t: string) => (
  <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>{t}</div>
);
// 구조적으로 없어도 정상인 값(미착공 건물의 착공일, 상온센터의 저온임대료 등) - '-' 표시
const val = (v: string | number | null, unit = '') => (
  <div style={{ fontSize: '13px', color: '#0B2545', fontWeight: 500 }}>
    {v != null && v !== '' ? `${typeof v === 'number' ? v.toLocaleString() : v}${unit}` : '-'}
  </div>
);
// 원래 값이 있어야 정상인데 데이터를 못 채운 경우 - '확인중'으로 구분 표시(주차 0대 등 있을 수 없는 값 포함)
const valPending = (v: string | number | null, unit = '') => (
  <div style={{ fontSize: '13px', color: v ? '#0B2545' : '#94a3b8', fontWeight: 500, fontStyle: v ? 'normal' : 'italic' }}>
    {v != null && v !== '' ? `${typeof v === 'number' ? v.toLocaleString() : v}${unit}` : '확인중'}
  </div>
);

export default function DetailPanel({ center, floors, floorsLoading, unit, onClose }: Props) {
  const dot = center ? (STATUS_COLOR[center.status] ?? '#94a3b8') : '#94a3b8';
  const tm  = center ? (TEMP_META[center.temp_type] ?? TEMP_META['상온']) : TEMP_META['상온'];

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0,
      width: '340px', height: '100%',
      background: '#fff',
      borderLeft: '1px solid #E5E9F0',
      boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
      zIndex: 20, overflowY: 'auto',
      display: 'flex', flexDirection: 'column',
      transform: center ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 0.25s ease',
      pointerEvents: center ? 'auto' : 'none',
    }}>
      {center && <>
        {/* 헤더 */}
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
          <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
            <span style={{ background: `${tm.color}22`, color: tm.color, padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>
              {center.temp_type}
            </span>
            <span style={{ background: `${dot}22`, color: dot, padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>
              {center.status}
            </span>
          </div>
        </div>

        {/* 사진(배치도/전경) */}
        {center.image && (
          <div style={{ padding: '16px', borderBottom: '1px solid #F5F7FA' }}>
            <img
              src={center.image}
              alt={`${center.name} 사진`}
              loading="lazy"
              style={{ width: '100%', borderRadius: '8px', display: 'block', objectFit: 'cover', maxHeight: '220px' }}
              onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }}
            />
          </div>
        )}

        {/* 기본 정보 */}
        <Section title="기본 정보">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>{lbl('대지면적')}{valPending(center.land_area ? `${fmtSqm(center.land_area, unit)} ${unit}` : null)}</div>
            <div>{lbl('연면적')}{valPending(center.gfa ? `${fmtSqm(center.gfa, unit)} ${unit}` : null)}</div>
            <div>{lbl('규모')}{valPending(center.scale)}</div>
            <div>{lbl('주차')}{valPending(center.parking ? `${center.parking}대` : null)}</div>
            <div>{lbl('허가일')}{valPending(center.permit_date)}</div>
            <div>{lbl('착공일')}{center.status === '미착공' ? val(null) : valPending(center.construction_start_date)}</div>
            <div>{lbl('준공일')}{center.status !== '운영중' ? val(null) : valPending(center.completion_date)}</div>
            <div>{lbl('개발사')}{valPending(center.developer)}</div>
          </div>
        </Section>

        {/* 인접 IC */}
        {center.nearbyICs.length > 0 && (
          <Section title="인접 IC">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {center.nearbyICs.map((ic, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#0B2545', fontWeight: 500 }}>{ic.name}</span>
                  <span style={{ color: '#64748b' }}>{ic.distance_km.toFixed(1)}km</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* 임대 정보 */}
        <Section title="임대 정보">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
            <div>
              {lbl('상온 임대료')}
              {center.temp_type === '저온'
                ? val(null)
                : valPending(center.rental_price_warm ? `${center.rental_price_warm.toLocaleString()}원/평` : null)}
            </div>
            <div>
              {lbl('저온 임대료')}
              {center.temp_type === '상온'
                ? val(null)
                : valPending(center.rental_price_cold ? `${center.rental_price_cold.toLocaleString()}원/평` : null)}
            </div>
          </div>
          {lbl('임대 조건')}
          {(center.rental_price_warm || center.rental_price_cold) ? valPending(center.rental_conditions) : val(center.rental_conditions)}
        </Section>

        {/* 비고 */}
        {center.remarks && (
          <Section title="비고">
            <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {center.remarks}
            </div>
          </Section>
        )}

        {/* 내 메모 */}
        <Section title="내 메모">
          <MemoSection centerId={center.id} />
        </Section>

        {/* 층별 현황 */}
        <Section title="층별 현황">
          {floorsLoading ? (
            <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '16px 0' }}>
              불러오는 중...
            </div>
          ) : floors.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '16px 0' }}>
              데이터 준비 중
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ background: '#F5F7FA' }}>
                    {['층', '용도', `전용(${unit})`, `임대(${unit})`, '입주'].map(h => (
                      <th key={h} style={{ padding: '6px', textAlign: 'center', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #E5E9F0', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {floors.map((f, i) => {
                    const avBg   = f.available === '임대완료' ? '#fee2e2' : f.available === '즉시' ? '#dcfce7' : '#f5f7fa';
                    const avText = f.available === '임대완료' ? '#ef4444' : f.available === '즉시' ? '#16a34a' : '#64748b';
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #F5F7FA' }}>
                        <td style={{ padding: '6px', textAlign: 'center', fontWeight: 600, color: '#0B2545' }}>{f.floor}</td>
                        <td style={{ padding: '6px', textAlign: 'center', color: '#475569' }}>{f.usage}</td>
                        <td style={{ padding: '6px', textAlign: 'right', color: '#475569' }}>{fmtPyeong(f.exclusive_area, unit)}</td>
                        <td style={{ padding: '6px', textAlign: 'right', color: '#475569' }}>{fmtPyeong(f.rental_area, unit)}</td>
                        <td style={{ padding: '6px', textAlign: 'center' }}>
                          <span style={{ background: avBg, color: avText, padding: '2px 5px', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>
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
      </>}
    </div>
  );
}

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
