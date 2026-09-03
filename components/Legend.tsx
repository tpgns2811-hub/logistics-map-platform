'use client';

import { useState } from 'react';

interface Props {
  isMobile?: boolean;
}

export default function Legend({ isMobile }: Props) {
  const [open, setOpen] = useState(false);

  // 온도구분: 상온 → 저온 → 복합 (마커와 동일한 색/글자)
  const markers = [
    { color: '#ea580c', char: '상', label: '상온' },
    { color: '#2563eb', char: '저', label: '저온' },
    { color: '#7c3aed', char: '복', label: '복합' },
  ];
  // 운영상태: 운영중 → 공사중 → 미착공
  const dots = [
    { color: '#16a34a', label: '운영중'  },
    { color: '#f59e0b', label: '공사중'  },
    { color: '#94a3b8', label: '미착공'  },
  ];

  const content = (
    <>
      <div style={{ fontSize: '10px', fontWeight: 700, color: '#0B2545', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
        범례
      </div>

      {markers.map(({ color, char, label }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '5px' }}>
          <div style={{
            width: '18px', height: '18px', background: color, flexShrink: 0,
            borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)',
            border: '1.5px solid #fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              transform: 'rotate(45deg)',
              color: '#fff',
              fontSize: '9px',
              fontWeight: 700,
              lineHeight: 1,
            }}>
              {char}
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
    </>
  );

  if (!isMobile) {
    return (
      <div style={{
        position: 'absolute', bottom: '24px', left: '16px',
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
        border: '1px solid #E5E9F0', borderRadius: '10px',
        padding: '12px 14px', zIndex: 10,
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)', minWidth: '110px',
      }}>
        {content}
      </div>
    );
  }

  // 모바일: 기본은 작은 아이콘 버튼만 노출, 탭하면 팝오버로 펼침(화면을 덜 가리도록)
  return (
    <div style={{ position: 'absolute', bottom: '24px', left: '16px', zIndex: 10 }}>
      {open && (
        <div style={{
          position: 'absolute', bottom: '40px', left: 0,
          background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(8px)',
          border: '1px solid #E5E9F0', borderRadius: '10px',
          padding: '12px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: '110px',
        }}>
          {content}
        </div>
      )}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="범례 보기"
        style={{
          width: '32px', height: '32px', borderRadius: '50%',
          background: open ? '#0B2545' : 'rgba(255,255,255,0.95)',
          color: open ? '#fff' : '#0B2545',
          border: '1px solid #E5E9F0', boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          fontSize: '14px', fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        ⓘ
      </button>
    </div>
  );
}
