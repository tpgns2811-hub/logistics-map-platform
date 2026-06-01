'use client';

import { useEffect, useRef } from 'react';
import type { LogisticsCenter } from '@/types/logistics';

declare global {
  interface Window { kakao: any; }
}

interface Props {
  centers: LogisticsCenter[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

// 온도 구분 → 마커 색상 & 아이콘 (모두 파란 핀)
const TEMP_STYLE = {
  '저온': { bg: '#1d4ed8', icon: '❄' },
  '상온': { bg: '#1d4ed8', icon: '🌡' },
  '복합': { bg: '#1d4ed8', icon: '🌡❄' },
} as const;

// 상태 → 점 색상
const STATUS_DOT: Record<string, string> = {
  '운영중':  '#16a34a',
  '공사중':  '#f59e0b',
  '준공완료': '#ef4444',
  '미착공':  '#94a3b8',
};

function markerHTML(c: LogisticsCenter, selected: boolean): string {
  const { bg, icon } = TEMP_STYLE[c.temp_type] ?? TEMP_STYLE['상온'];
  const dot  = STATUS_DOT[c.status] ?? '#94a3b8';
  const sz   = selected ? 42 : 32;
  const fsz  = c.temp_type === '복합' ? (selected ? 10 : 8) : (selected ? 15 : 11);
  const border = selected ? '3px solid #fff' : '2px solid #fff';
  const shadow = selected ? '0 4px 14px rgba(0,0,0,.45)' : '0 2px 6px rgba(0,0,0,.25)';
  return `
    <div style="position:relative;width:${sz}px;height:${sz}px;cursor:pointer;">
      <div style="
        width:${sz}px;height:${sz}px;background:${bg};
        border-radius:50% 50% 50% 0;transform:rotate(-45deg);
        border:${border};box-shadow:${shadow};
        display:flex;align-items:center;justify-content:center;">
        <span style="transform:rotate(45deg);font-size:${fsz}px;color:#fff;line-height:1">${icon}</span>
      </div>
      <div style="
        position:absolute;top:-3px;right:-3px;
        width:11px;height:11px;background:${dot};
        border-radius:50%;border:1.5px solid #fff;
        box-shadow:0 1px 3px rgba(0,0,0,.2);"></div>
    </div>`;
}

function infoHTML(c: LogisticsCenter): string {
  const dot = STATUS_DOT[c.status] ?? '#94a3b8';
  const { bg, icon } = TEMP_STYLE[c.temp_type] ?? TEMP_STYLE['상온'];
  const tempBadge = `<span style="background:${bg}22;color:${bg};padding:2px 6px;border-radius:4px;font-size:11px;">${icon} ${c.temp_type}</span>`;
  const stBadge   = `<span style="background:${dot}22;color:${dot};padding:2px 6px;border-radius:4px;font-size:11px;">${c.status}</span>`;
  return `
    <div style="padding:14px 16px;min-width:240px;font-family:system-ui,sans-serif;line-height:1.5;">
      <div style="font-size:15px;font-weight:600;color:#0B2545;margin-bottom:4px;">${c.name}</div>
      <div style="font-size:12px;color:#64748b;margin-bottom:8px;">${c.address}</div>
      <div style="display:flex;gap:6px;margin-bottom:8px;">${tempBadge}${stBadge}</div>
      <div style="font-size:11px;color:#475569;">
        연면적 ${c.gfa.toLocaleString()}㎡ · ${c.developer}
      </div>
    </div>`;
}

export default function KakaoMap({ centers, selectedId, onSelect }: Props) {
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

  function addMarker(c: LogisticsCenter, map: any) {
    const pos = new window.kakao.maps.LatLng(c.latitude, c.longitude);
    const el  = document.createElement('div');
    el.innerHTML = markerHTML(c, false);
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

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}