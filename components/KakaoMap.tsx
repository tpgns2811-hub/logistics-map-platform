'use client';

import { useEffect, useRef } from 'react';
import type { LogisticsCenter } from '@/types/logistics';

declare global { interface Window { kakao: any; } }

interface Props {
  centers: LogisticsCenter[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReady?: () => void;
}

const STATUS_DOT: Record<string, string> = {
  '운영중': '#16a34a', '공사중': '#f59e0b',
  '준공완료': '#ef4444', '미착공': '#94a3b8',
};
const TEMP_STYLE = {
  '저온': { bg: '#1d4ed8', icon: '❄' },
  '상온': { bg: '#1d4ed8', icon: '🌡' },
  '복합': { bg: '#1d4ed8', icon: '🌡❄' },
} as const;

function markerHTML(c: LogisticsCenter, selected: boolean): string {
  const { bg, icon } = TEMP_STYLE[c.temp_type] ?? TEMP_STYLE['상온'];
  const dot = STATUS_DOT[c.status] ?? '#94a3b8';
  const sz  = selected ? 42 : 32;
  const fsz = c.temp_type === '복합' ? (selected ? 10 : 8) : (selected ? 15 : 11);
  return `
    <div style="position:relative;width:${sz}px;height:${sz}px;cursor:pointer;transition:transform .15s ease;">
      <div style="width:${sz}px;height:${sz}px;background:${bg};border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);border:${selected ? 3 : 2}px solid #fff;
        box-shadow:${selected ? '0 4px 14px rgba(0,0,0,.45)' : '0 2px 6px rgba(0,0,0,.25)'};
        display:flex;align-items:center;justify-content:center;">
        <span style="transform:rotate(45deg);font-size:${fsz}px;color:#fff;line-height:1">${icon}</span>
      </div>
      <div style="position:absolute;top:-3px;right:-3px;width:11px;height:11px;
        background:${dot};border-radius:50%;border:1.5px solid #fff;
        box-shadow:0 1px 3px rgba(0,0,0,.2);"></div>
    </div>`;
}

function infoHTML(c: LogisticsCenter): string {
  const { bg, icon } = TEMP_STYLE[c.temp_type] ?? TEMP_STYLE['상온'];
  const dot = STATUS_DOT[c.status] ?? '#94a3b8';
  return `
    <div style="padding:14px 16px;min-width:240px;font-family:system-ui,sans-serif;line-height:1.5;">
      <div style="font-size:15px;font-weight:600;color:#0B2545;margin-bottom:4px;">${c.name}</div>
      <div style="font-size:12px;color:#64748b;margin-bottom:8px;">${c.address}</div>
      <div style="display:flex;gap:6px;margin-bottom:8px;">
        <span style="background:${bg}22;color:${bg};padding:2px 6px;border-radius:4px;font-size:11px;">${icon} ${c.temp_type}</span>
        <span style="background:${dot}22;color:${dot};padding:2px 6px;border-radius:4px;font-size:11px;">${c.status}</span>
      </div>
      <div style="font-size:11px;color:#475569;">연면적 ${c.gfa.toLocaleString()}㎡ · ${c.developer}</div>
    </div>`;
}

export default function KakaoMap({ centers, selectedId, onSelect, onReady }: Props) {
  const mapRef   = useRef<HTMLDivElement>(null);
  const mapInst  = useRef<any>(null);
  const overlays = useRef<Record<string, { ov: any; el: HTMLDivElement }>>({});
  const infoWins = useRef<Record<string, any>>({});
  const inited   = useRef(false);

  /* ── 지도 초기화 ── */
  useEffect(() => {
    if (inited.current) return;
    const init = () => {
      if (!mapRef.current || !window.kakao) return;
      window.kakao.maps.load(() => {
        if (inited.current) return;
        inited.current = true;
        const map = new window.kakao.maps.Map(mapRef.current!, {
          center: new window.kakao.maps.LatLng(37.3595, 127.1052),
          level: 10,
        });
        mapInst.current = map;
        map.addControl(new window.kakao.maps.ZoomControl(), window.kakao.maps.ControlPosition.RIGHT);
        centers.forEach(c => addMarker(c, map));
        onReady?.();
      });
    };
    if (window.kakao) { init(); }
    else {
      const s = document.createElement('script');
      s.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=1218f10d9e846d77e85cbcd1ea7f2495&autoload=false';
      s.async = true; s.onload = init;
      document.head.appendChild(s);
    }
  }, []);

  /* ── selectedId 변경 ── */
  useEffect(() => {
    if (!mapInst.current || !window.kakao) return;
    centers.forEach(c => {
      const item = overlays.current[c.id];
      if (!item) return;
      item.el.innerHTML = markerHTML(c, c.id === selectedId);
      item.ov.setZIndex(c.id === selectedId ? 10 : 1);
    });
    if (!selectedId) return;
    const center = centers.find(c => c.id === selectedId);
    if (!center) return;
    mapInst.current.panTo(new window.kakao.maps.LatLng(center.latitude, center.longitude));
    Object.values(infoWins.current).forEach(iw => iw.close());
    infoWins.current[selectedId]?.open(mapInst.current);
  }, [selectedId]);

  /* ── 전체 보기 (fit bounds) ── */
  function handleReset() {
    if (!mapInst.current || !window.kakao || centers.length === 0) return;
    const bounds = new window.kakao.maps.LatLngBounds();
    centers.forEach(c => bounds.extend(new window.kakao.maps.LatLng(c.latitude, c.longitude)));
    mapInst.current.setBounds(bounds);
  }

  function addMarker(c: LogisticsCenter, map: any) {
    const pos = new window.kakao.maps.LatLng(c.latitude, c.longitude);
    const el  = document.createElement('div');
    el.innerHTML = markerHTML(c, false);

    // 호버 효과
    el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.15)'; el.style.transition = 'transform .15s ease'; });
    el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });

    el.addEventListener('click', () => {
      onSelect(c.id);
      Object.values(infoWins.current).forEach(iw => iw.close());
      infoWins.current[c.id]?.open(map);
    });

    const ov = new window.kakao.maps.CustomOverlay({ position: pos, content: el, yAnchor: 1, zIndex: 1 });
    ov.setMap(map);
    overlays.current[c.id] = { ov, el };

    const iw = new window.kakao.maps.InfoWindow({ content: infoHTML(c), removable: true, zIndex: 20, position: pos });
    infoWins.current[c.id] = iw;
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      {/* 전체 보기 버튼 */}
      <button
        onClick={handleReset}
        title="전체 마커 보기"
        style={{
          position: 'absolute', bottom: '80px', right: '10px',
          background: '#fff', border: '1px solid #E5E9F0',
          borderRadius: '6px', padding: '6px 10px',
          fontSize: '11px', color: '#0B2545', cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          fontWeight: 600, zIndex: 10,
        }}
      >
        전체 보기
      </button>
    </div>
  );
}