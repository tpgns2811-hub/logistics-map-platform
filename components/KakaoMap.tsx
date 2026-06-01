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

const STATUS_COLOR: Record<string, string> = {
  '운영중':  '#16a34a',
  '공사중':  '#f59e0b',
  '계획중':  '#94a3b8',
  '준공완료': '#3b82f6',
};

// 마커 HTML 생성
function markerHTML(center: LogisticsCenter, selected: boolean): string {
  const bg   = center.cold_storage ? '#1d4ed8' : '#0B2545';
  const dot  = STATUS_COLOR[center.status] ?? '#94a3b8';
  const sz   = selected ? 42 : 32;
  const fsz  = selected ? 15 : 11;
  const icon = center.cold_storage ? '❄' : '▪';
  const shadow = selected
    ? '0 4px 14px rgba(0,0,0,0.45)'
    : '0 2px 6px rgba(0,0,0,0.25)';
  const border = selected ? '3px solid #fff' : '2px solid #fff';

  return `
    <div style="position:relative;width:${sz}px;height:${sz}px;cursor:pointer;">
      <div style="
        width:${sz}px;height:${sz}px;
        background:${bg};
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        border:${border};
        box-shadow:${shadow};
        display:flex;align-items:center;justify-content:center;
        transition:all .15s;
      ">
        <span style="transform:rotate(45deg);font-size:${fsz}px;color:#fff;line-height:1">
          ${icon}
        </span>
      </div>
      <div style="
        position:absolute;top:-3px;right:-3px;
        width:11px;height:11px;
        background:${dot};
        border-radius:50%;
        border:1.5px solid #fff;
        box-shadow:0 1px 3px rgba(0,0,0,.2);
      "></div>
    </div>
  `;
}

// 인포윈도우 HTML 생성
function infoHTML(center: LogisticsCenter): string {
  const dot  = STATUS_COLOR[center.status] ?? '#94a3b8';
  const tempBadge = center.cold_storage
    ? '<span style="background:#dbeafe;color:#1d4ed8;padding:2px 6px;border-radius:4px;font-size:11px;">❄ 냉동</span>'
    : '<span style="background:#f1f5f9;color:#475569;padding:2px 6px;border-radius:4px;font-size:11px;">상온</span>';
  const stBadge = `<span style="background:${dot}22;color:${dot};padding:2px 6px;border-radius:4px;font-size:11px;">${center.status}</span>`;

  return `
    <div style="padding:14px 16px;min-width:240px;font-family:system-ui,sans-serif;line-height:1.5;">
      <div style="font-size:15px;font-weight:600;color:#0B2545;margin-bottom:4px;">${center.name}</div>
      <div style="font-size:12px;color:#64748b;margin-bottom:8px;">${center.address}</div>
      <div style="display:flex;gap:6px;margin-bottom:8px;">${tempBadge}${stBadge}</div>
      <div style="font-size:11px;color:#475569;">
        연면적 ${center.gfa.toLocaleString()}㎡ · ${center.developer}
      </div>
    </div>
  `;
}

export default function KakaoMap({ centers, selectedId, onSelect }: Props) {
  const mapRef      = useRef<HTMLDivElement>(null);
  const mapInst     = useRef<any>(null);
  const overlays    = useRef<Record<string, { ov: any; el: HTMLDivElement }>>({});
  const infoWindows = useRef<Record<string, any>>({});
  const initialized = useRef(false);

  /* ── 지도 초기화 (최초 1회) ── */
  useEffect(() => {
    if (initialized.current) return;

    const init = () => {
      if (!mapRef.current || !window.kakao) return;
      window.kakao.maps.load(() => {
        if (initialized.current) return;
        initialized.current = true;

        const map = new window.kakao.maps.Map(mapRef.current!, {
          center: new window.kakao.maps.LatLng(37.3595, 127.1052),
          level: 10,
        });
        mapInst.current = map;
        map.addControl(
          new window.kakao.maps.ZoomControl(),
          window.kakao.maps.ControlPosition.RIGHT,
        );

        centers.forEach(c => addMarker(c, map));
      });
    };

    if (window.kakao) {
      init();
    } else {
      const s = document.createElement('script');
      s.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=1218f10d9e846d77e85cbcd1ea7f2495&autoload=false';
      s.async = true;
      s.onload = init;
      document.head.appendChild(s);
    }
  }, []);

  /* ── selectedId 변경 → 마커 강조 + 이동 + 팝업 ── */
  useEffect(() => {
    if (!mapInst.current || !window.kakao) return;

    // 모든 마커 외형 업데이트
    centers.forEach(c => {
      const item = overlays.current[c.id];
      if (item) item.el.innerHTML = markerHTML(c, c.id === selectedId);
      item?.ov.setZIndex(c.id === selectedId ? 10 : 1);
    });

    if (!selectedId) return;

    const center = centers.find(c => c.id === selectedId);
    if (!center) return;

    // 지도 이동
    mapInst.current.panTo(
      new window.kakao.maps.LatLng(center.latitude, center.longitude),
    );

    // 인포윈도우 열기
    Object.values(infoWindows.current).forEach(iw => iw.close());
    infoWindows.current[selectedId]?.open(mapInst.current);
  }, [selectedId]);

  /* ── 마커 & 인포윈도우 생성 헬퍼 ── */
  function addMarker(center: LogisticsCenter, map: any) {
    const pos = new window.kakao.maps.LatLng(center.latitude, center.longitude);

    // CustomOverlay 엘리먼트
    const el = document.createElement('div');
    el.innerHTML = markerHTML(center, false);
    el.addEventListener('click', () => {
      onSelect(center.id);
      Object.values(infoWindows.current).forEach(iw => iw.close());
      infoWindows.current[center.id]?.open(map);
    });

    const ov = new window.kakao.maps.CustomOverlay({
      position: pos,
      content: el,
      yAnchor: 1,
      zIndex: 1,
    });
    ov.setMap(map);
    overlays.current[center.id] = { ov, el };

    // InfoWindow
    const iw = new window.kakao.maps.InfoWindow({
      content: infoHTML(center),
      removable: true,
      zIndex: 20,
      position: pos,
    });
    infoWindows.current[center.id] = iw;
  }

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}