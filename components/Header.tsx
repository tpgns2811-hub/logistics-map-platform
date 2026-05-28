export default function Header() {
    return (
      <header style={{
        height: '64px',
        backgroundColor: '#0B2545',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        zIndex: 10,
      }}>
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
        <nav style={{ marginLeft: 'auto', display: 'flex', gap: '24px' }}>
          {['지도', '리스트', '리포트'].map((item) => (
            <a key={item} href="#" style={{ color: '#8DA9C4', fontSize: '13px', textDecoration: 'none' }}>
              {item}
            </a>
          ))}
        </nav>
      </header>
    );
  }