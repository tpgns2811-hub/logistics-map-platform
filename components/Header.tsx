interface Props {
  onRefresh?: () => void;
  lastUpdated?: Date | null;
  refreshing?: boolean;
}

export default function Header({ onRefresh, lastUpdated, refreshing }: Props) {
  const timeStr = lastUpdated
    ? lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <header style={{
      height: '64px', backgroundColor: '#0B2545', color: 'white',
      display: 'flex', alignItems: 'center', padding: '0 24px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)', zIndex: 10, flexShrink: 0,
    }}>
      {/* 로고 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '6px',
          backgroundColor: '#8DA9C4', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontWeight: 'bold', fontSize: '14px', color: '#0B2545',
        }}>L</div>
        <h1 style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '-0.3px', margin: 0 }}>
          LogiMap
        </h1>
        <span style={{ fontSize: '11px', color: '#8DA9C4', marginLeft: '4px' }}>
          Logistics Real Estate Intelligence
        </span>
      </div>

      {/* 우측 — 업데이트 시간 + 새로고침 버튼 */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
        {timeStr && (
          <span style={{ fontSize: '11px', color: '#8DA9C4' }}>
            {timeStr} 갱신
          </span>
        )}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={refreshing}
            title="데이터 새로고침"
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              background: refreshing ? '#13315C' : '#13315C',
              border: '1px solid #8DA9C4',
              borderRadius: '6px', padding: '5px 10px',
              color: '#fff', fontSize: '12px', cursor: refreshing ? 'not-allowed' : 'pointer',
              opacity: refreshing ? 0.6 : 1, transition: 'opacity .2s',
            }}
          >
            <span style={{ display: 'inline-block', animation: refreshing ? 'spin .8s linear infinite' : 'none' }}>
              🔄
            </span>
            {refreshing ? '갱신 중...' : '새로고침'}
          </button>
        )}

        {/* 네비게이션 */}
        <nav style={{ display: 'flex', gap: '20px' }}>
          {['지도', '리스트', '리포트'].map(item => (
            <a key={item} href="#" style={{ color: '#8DA9C4', fontSize: '13px', textDecoration: 'none' }}>
              {item}
            </a>
          ))}
        </nav>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </header>
  );
}