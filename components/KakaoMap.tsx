'use client';

import { useEffect, useRef, useState } from 'react';
import type { LogisticsCenter } from '@/types/logistics';

declare global { interface Window { kakao: any; } }

interface Props {
  centers:     LogisticsCenter[];         // 필터된 센터 (표시 제어)
  allCenters?: LogisticsCenter[];         // 전체 센터 (최초 마커 생성용)
  selectedId:  string | null;
  onSelect:    (id: string | null) => void;
  onReady?:    () => void;
}

const STATUS_DOT: Record<string, string> = {
  '운영중': '#16a34a', '공사중': '#f59e0b',
  '준공완료': '#ef4444', '미착공': '#94a3b8',
};
const TEMP_STYLE = {
  '저온': { bg: '#1d4ed8', icon: '❄'  },
  '상온': { bg: '#1d4ed8', icon: '🌡' },
  '복합': { bg: '#1d4ed8', icon: '🌡❄' },
} as const;

const MAP_FILTERS = {
  normal: 'none',
  simple: 'grayscale(0.8) brightness(1.08) contrast(0.95)',
} as const;
type StyleKey = keyof typeof MAP_FILTERS;

function markerHTML(c: LogisticsCenter, selected: boolean): string {
  const { bg, icon } = TEMP_STYLE[c.temp_type] ?? TEMP_STYLE['상온'];
  const dot = STATUS_DOT[c.status] ?? '#94a3b8';
  const sz  = selected ? 42 : 32;
  const fsz = c.temp_type === '복합' ? (selected ? 10 : 8) : (selected ? 15 : 11);
  return `
    <div style="position:relative;width:${sz}px;height:${sz}px;cursor:pointer;">
      <div style="width:${sz}px;height:${sz}px;background:${bg};border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);border:${selected ? 3 : 2}px solid #fff;
        box-shadow:${selected ? '0 4px 14px rgba(0,0,0,.45)' : '0 2px 6px rgba(0,0,0,.25)'};
        display:flex;align-items:center;justify-content:center;">
        <span style="transform:rotate(45deg);font-size:${fsz}px;color:#fff;line-height:1;letter-spacing:-1px">${icon}</span>
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

export default function KakaoMap({ centers, allCenters, selectedId, onSelect, onReady }: Props) {
  const mapRef        = useRef<HTMLDivElement>(null);
  const mapInst       = useRef<any>(null);
  const overlays      = useRef<Record<string, { ov: any; el: HTMLDivElement; center: LogisticsCenter }>>({});
  const infoWins      = useRef<Record<string, any>>({});
  const inited        = useRef(false);
  const selectedIdRef = useRef<string | null>(selectedId);
  const [mapStyle, setMapStyle] = useState<StyleKey>('simple');

  /* ── selectedIdRef 동기화 ── */
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

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

        // 전체 마커 생성 (allCenters 우선 사용)
        (allCenters ?? centers).forEach(c => addMarker(c, map));

        // 지도 클릭 → 팝업 닫기 + 선택 해제
        window.kakao.maps.event.addListener(map, 'click', () => {
          Object.values(infoWins.current).forEach(iw => iw.close());
          onSelect(null);
        });

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

  /* ── 필터 변경 → 핀 표시/숨김 ── */
  useEffect(() => {
    if (!mapInst.current) return;
    const visibleIds = new Set(centers.map(c => c.id));
    Object.entries(overlays.current).forEach(([id, { ov }]) => {
      ov.setMap(visibleIds.has(id) ? mapInst.current : null);
    });
  }, [centers]);

  /* ── selectedId 변경 ── */
  useEffect(() => {
    selectedIdRef.current = selectedId;
    if (!mapInst.current || !window.kakao) return;

    // 전체 마커 크기/스타일 갱신
    Object.entries(overlays.current).forEach(([id, { el, ov, center }]) => {
      el.innerHTML = markerHTML(center, id === selectedId);
      ov.setZIndex(id === selectedId ? 10 : 1);
    });

    // 선택 해제 시 모든 팝업 닫기
    if (!selectedId) {
      Object.values(infoWins.current).forEach(iw => iw.close());
      return;
    }

    // 선택된 센터로 이동 + 팝업 열기
    const target = overlays.current[selectedId]?.center;
    if (!target) return;
    mapInst.current.panTo(new window.kakao.maps.LatLng(target.latitude, target.longitude));
    Object.values(infoWins.current).forEach(iw => iw.close());
    infoWins.current[selectedId]?.open(mapInst.current);
  }, [selectedId]);

  function addMarker(c: LogisticsCenter, map: any) {
    const pos = new window.kakao.maps.LatLng(c.latitude, c.longitude);
    const el  = document.createElement('div');
    el.innerHTML = markerHTML(c, false);

    // 호버 → 팝업 임시 표시
    el.addEventListener('mouseenter', () => {
      el.style.transform = 'scale(1.15)';
      el.style.transition = 'transform .15s ease';
      if (selectedIdRef.current !== c.id) {
        Object.entries(infoWins.current).forEach(([id, iw]) => {
          if (id !== selectedIdRef.current) iw.close();
        });
        infoWins.current[c.id]?.open(map);
      }
    });

    // 호버 해제 → 팝업 닫기 (고정된 게 아닌 경우)
    el.addEventListener('mouseleave', () => {
      el.style.transform = 'scale(1)';
      if (selectedIdRef.current !== c.id) {
        infoWins.current[c.id]?.close();
      }
    });

    // 클릭 → 팝업 고정
    el.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation();
      onSelect(c.id);
      Object.values(infoWins.current).forEach(iw => iw.close());
      infoWins.current[c.id]?.open(map);
    });

    const ov = new window.kakao.maps.CustomOverlay({ position: pos, content: el, yAnchor: 1, zIndex: 1 });
    ov.setMap(map);
    overlays.current[c.id] = { ov, el, center: c };

    const iw = new window.kakao.maps.InfoWindow({ content: infoHTML(c), removable: true, zIndex: 20, position: pos });
    infoWins.current[c.id] = iw;
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* 지도 (스타일 필터 적용) */}
      <div
        ref={mapRef}
        style={{ width: '100%', height: '100%', filter: MAP_FILTERS[mapStyle], transition: 'filter .3s ease' }}
      />

      {/* 지도 스타일 토글 */}
      <div style={{
        position: 'absolute', top: '16px', right: '50px', zIndex: 16,
        display: 'flex', background: 'rgba(255,255,255,0.95)',
        border: '1px solid #E5E9F0', borderRadius: '6px', overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}>
        {(['normal', 'simple'] as StyleKey[]).map((s, i) => (
          <button key={s} onClick={() => setMapStyle(s)} style={{
            padding: '5px 11px', fontSize: '11px', fontWeight: 600,
            background: mapStyle === s ? '#0B2545' : 'transparent',
            color: mapStyle === s ? '#fff' : '#64748b',
            border: 'none',
            borderLeft: i > 0 ? '1px solid #E5E9F0' : 'none',
            cursor: 'pointer',
          }}>
            {s === 'normal' ? '기본' : '심플'}
          </button>
        ))}
      </div>
    </div>
  );
}