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

export default function KakaoMap({ centers, selectedId, onSelect }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const infoWindowsRef = useRef<Record<string, any>>({});
  const initializedRef = useRef(false);

  // 지도 초기화 (최초 1회)
  useEffect(() => {
    if (initializedRef.current) return;

    const init = () => {
      if (!mapRef.current || !window.kakao) return;

      window.kakao.maps.load(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        const map = new window.kakao.maps.Map(mapRef.current!, {
          center: new window.kakao.maps.LatLng(37.3595, 127.1052),
          level: 10,
        });
        mapInstanceRef.current = map;

        map.addControl(
          new window.kakao.maps.ZoomControl(),
          window.kakao.maps.ControlPosition.RIGHT
        );

        centers.forEach((center) => buildMarker(center, map));
      });
    };

    if (window.kakao) {
      init();
    } else {
      const script = document.createElement('script');
      script.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=1218f10d9e846d77e85cbcd1ea7f2495&autoload=false';
      script.async = true;
      script.onload = init;
      document.head.appendChild(script);
    }
  }, []);

  // selectedId 변경 시 지도 연동
  useEffect(() => {
    if (!selectedId || !mapInstanceRef.current || !window.kakao) return;

    const center = centers.find((c) => c.id === selectedId);
    if (!center) return;

    // 모든 인포윈도우 닫기
    Object.values(infoWindowsRef.current).forEach((iw) => iw.close());

    // 해당 위치로 이동
    const position = new window.kakao.maps.LatLng(center.latitude, center.longitude);
    mapInstanceRef.current.panTo(position);

    // 인포윈도우 열기
    const marker = markersRef.current[selectedId];
    const infoWindow = infoWindowsRef.current[selectedId];
    if (marker && infoWindow) {
      infoWindow.open(mapInstanceRef.current, marker);
    }
  }, [selectedId]);

  function buildMarker(center: LogisticsCenter, map: any) {
    const position = new window.kakao.maps.LatLng(center.latitude, center.longitude);
    const marker = new window.kakao.maps.Marker({ position, map, title: center.name });

    const statusColor =
      center.status === '운영중' ? '#16a34a' :
      center.status === '공사중' ? '#f59e0b' : '#64748b';

    const tempBadge = center.cold_storage
      ? '<span style="background:#dbeafe;color:#1d4ed8;padding:2px 6px;border-radius:4px;font-size:11px;">❄ 냉동</span>'
      : '<span style="background:#f1f5f9;color:#475569;padding:2px 6px;border-radius:4px;font-size:11px;">상온</span>';

    const content = `
      <div style="padding:14px 16px;min-width:240px;font-family:system-ui,sans-serif;line-height:1.5;">
        <div style="font-size:15px;font-weight:600;color:#0B2545;margin-bottom:4px;">${center.name}</div>
        <div style="font-size:12px;color:#64748b;margin-bottom:8px;">${center.address}</div>
        <div style="display:flex;gap:6px;margin-bottom:8px;">
          ${tempBadge}
          <span style="background:${statusColor}22;color:${statusColor};padding:2px 6px;border-radius:4px;font-size:11px;">${center.status}</span>
        </div>
        <div style="font-size:11px;color:#475569;">
          연면적 ${center.gfa.toLocaleString()}㎡ · ${center.developer}
        </div>
      </div>
    `;

    const infoWindow = new window.kakao.maps.InfoWindow({ content, removable: true });

    markersRef.current[center.id] = marker;
    infoWindowsRef.current[center.id] = infoWindow;

    window.kakao.maps.event.addListener(marker, 'click', () => {
      Object.values(infoWindowsRef.current).forEach((iw) => iw.close());
      infoWindow.open(map, marker);
      onSelect(center.id);
    });
  }

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}