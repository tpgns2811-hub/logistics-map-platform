export default function Legend() {
  const markers = [
    { icon: '❄',   label: '저온' },
    { icon: '🌡',  label: '상온' },
    { icon: '🌡❄', label: '복합' },
  ];
  const dots = [
    { color: '#16a34a', label: '운영중'  },
    { color: '#f59e0b', label: '공사중'  },
    { color: '#ef4444', label: '준공완료' },
    { color: '#94a3b8', label: '미착공'  },
  ];

  return (
    <div style={{
      position: 'absolute', bottom: '24px', left: '16px',
      background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
      border: '1px solid #E5E9F0', borderRadius: '10px',
      padding: '12px 14px', zIndex: 10,
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)', minWidth: '110px',
    }}>
      <div style={{ fontSize: '10px', fontWeight: 700, color: '#0B2545', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
        범례
      </div>

      {markers.map(({ icon, label }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '5px' }}>
          <div style={{
            width: '18px', height: '18px', background: '#1d4ed8', flexShrink: 0,
            borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)',
            border: '1.5px solid #fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {/* ✅ [...icon] spread로 emoji 올바르게 렌더링 */}
            <span style={{
              transform: 'rotate(45deg)',
              color: '#fff',
              fontSize: label === '복합' ? '5px' : '8px',
              lineHeight: 1,
              letterSpacing: '-1px',
            }}>
              {[...icon].join('')}
            </span>
          </div>
          <span style={{ fontSize: '11px', color: '#475569' }}>{label}</span>
        </div>
      ))}

      <div style={{ borderTop: '1px solid #F1F5F9', margin: '8px 0' }} />

      {dots.map(({ color, label }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '4px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
          <span style={{ fontSize: '11px', color: '#475569' }}>{label}</span>
        </div>
      ))}
    </div>
  );
}