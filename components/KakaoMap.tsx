'use client';

import { useEffect, useRef, useState } from 'react';
import type { LogisticsCenter } from '@/types/logistics';

declare global { interface Window { kakao: any; } }

interface Props {
  centers:     LogisticsCenter[];
  allCenters?: LogisticsCenter[];
  selectedId:  string | null;
  onSelect:    (id: string | null) => void;
  onReady?:    () => void;
}

const STATUS_DOT: Record<string, string> = {
  '운영중': '#16a34a', '공사중': '#f59e0b',
  '준공완료': '#ef4444', '미착공': '#94a3b8',
};

/* ── 온도구분: 색으로 1차 구분(위성지도에서도 식별) + 한글 1글자 ── */
const TEMP_STYLE = {
  '상온': { bg: '#ea580c', label: '상' }, // 주황
  '저온': { bg: '#2563eb', label: '저' }, // 파랑
  '복합': { bg: '#7c3aed', label: '복' }, // 보라
} as const;

/* ── 지도 버전(맵타입) ── */
const MAP_TYPES = [
  { key: 'ROADMAP', label: '기본'    },
  { key: 'SKYVIEW', label: '스카이뷰' },
  { key: 'HYBRID',  label: '하이브리드' },
] as const;
type MapTypeKey = typeof MAP_TYPES[number]['key'];

/* ── 핀 HTML (크기·선택 상태 반영) ── */
function pinHTML(c: LogisticsCenter, selected: boolean): string {
  const { bg, label } = TEMP_STYLE[c.temp_type] ?? TEMP_STYLE['상온'];
  const dot = STATUS_DOT[c.status] ?? '#94a3b8';
  const sz  = selected ? 42 : 32;
  const fsz = selected ? 16 : 12;
  return `
    <div style="position:relative;width:${sz}px;height:${sz}px;">
      <div style="width:${sz}px;height:${sz}px;background:${bg};
        border-radius:50% 50% 50% 0;transform:rotate(-45deg);
        border:${selected ? 3 : 2}px solid #fff;
        box-shadow:${selected ? '0 4px 14px rgba(0,0,0,.45)' : '0 2px 6px rgba(0,0,0,.25)'};
        display:flex;align-items:center;justify-content:center;">
        <span style="transform:rotate(45deg);font-size:${fsz}px;font-weight:700;color:#fff;line-height:1;">${label}</span>
      </div>
      <div style="position:absolute;top:-3px;right:-3px;width:11px;height:11px;
        background:${dot};border-radius:50%;border:1.5px solid #fff;
        box-shadow:0 1px 3px rgba(0,0,0,.2);"></div>
    </div>`;
}

/* ── 팝업 HTML (마커 DOM 내부 embed) ── */
function popupHTML(c: LogisticsCenter): string {
  const { bg } = TEMP_STYLE[c.temp_type] ?? TEMP_STYLE['상온'];
  const dot = STATUS_DOT[c.status] ?? '#94a3b8';
  return `
    <div style="font-size:13px;font-weight:600;color:#0B2545;margin-bottom:3px;">${c.name}</div>
    <div style="font-size:11px;color:#64748b;margin-bottom:5px;">${c.address}</div>
    <div style="display:flex;gap:5px;">
      <span style="background:${bg}22;color:${bg};padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;">${c.temp_type}</span>
      <span style="background:${dot}22;color:${dot};padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;">${c.status}</span>
    </div>
    <div style="font-size:10px;color:#94a3b8;margin-top:4px;">${c.gfa.toLocaleString()}㎡ · ${c.developer}</div>
    <div style="position:absolute;bottom:-6px;left:50%;
      width:10px;height:10px;background:#fff;
      border-right:1px solid #E5E9F0;border-bottom:1px solid #E5E9F0;
      transform:translateX(-50%) rotate(45deg);"></div>`;
}

type OverlayData = {
  ov:     any;
  el:     HTMLDivElement;
  pin:    HTMLDivElement;
  popup:  HTMLDivElement;
  center: LogisticsCenter;
};

export default function KakaoMap({ centers, allCenters, selectedId, onSelect, onReady }: Props) {
  const mapRef        = useRef<HTMLDivElement>(null);
  const mapInst       = useRef<any>(null);
  const overlays      = useRef<Record<string, OverlayData>>({});
  const inited        = useRef(false);
  const selectedIdRef = useRef<string | null>(selectedId);
  const [mapType, setMapType] = useState<MapTypeKey>('ROADMAP');

  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

  /* ── 지도 영역 위에서의 페이지 줌 방지 (트랙패드 핀치/Ctrl+휠) ──
     지도 자체 줌은 Kakao SDK가 처리하고, 브라우저 페이지 줌만 차단 */
  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault();   // Ctrl+휠 = 트랙패드 핀치 → 페이지 줌
    };
    const onGesture = (e: Event) => e.preventDefault(); // Safari 핀치 줌
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('gesturestart', onGesture as EventListener);
    el.addEventListener('gesturechange', onGesture as EventListener);
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('gesturestart', onGesture as EventListener);
      el.removeEventListener('gesturechange', onGesture as EventListener);
    };
  }, []);

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
        (allCenters ?? centers).forEach(c => addMarker(c, map));

        // 지도 클릭 → 선택 해제 (팝업도 같이 닫힘)
        window.kakao.maps.event.addListener(map, 'click', () => onSelect(null));
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

  /* ── 맵타입 변경 → 핀(CustomOverlay)은 지도 위에 그대로 유지됨 ── */
  useEffect(() => {
    if (!mapInst.current || !window.kakao) return;
    mapInst.current.setMapTypeId(window.kakao.maps.MapTypeId[mapType]);
  }, [mapType]);

  /* ── 필터 변경 → 핀 표시/숨김 ── */
  useEffect(() => {
    if (!mapInst.current) return;
    const visible = new Set(centers.map(c => c.id));
    Object.entries(overlays.current).forEach(([id, { ov }]) => {
      ov.setMap(visible.has(id) ? mapInst.current : null);
    });
  }, [centers]);

  /* ── selectedId 변경 ── */
  useEffect(() => {
    selectedIdRef.current = selectedId;
    if (!mapInst.current) return;

    Object.entries(overlays.current).forEach(([id, { pin, ov, center, popup }]) => {
      const sel = id === selectedId;
      pin.innerHTML = pinHTML(center, sel);
      ov.setZIndex(sel ? 10 : 1);
      // 선택 시 팝업 고정, 아니면 숨김
      popup.style.display = sel ? 'block' : 'none';
    });

    if (!selectedId) return;
    const target = overlays.current[selectedId]?.center;
    if (target) {
      mapInst.current.panTo(new window.kakao.maps.LatLng(target.latitude, target.longitude));
    }
  }, [selectedId]);

  /* ── 마커 생성 ── */
  function addMarker(c: LogisticsCenter, map: any) {
    const pos = new window.kakao.maps.LatLng(c.latitude, c.longitude);

    // 루트 컨테이너
    const el = document.createElement('div');
    el.style.cssText = 'position:relative;display:inline-block;cursor:pointer;';

    // 핀
    const pin = document.createElement('div');
    pin.innerHTML = pinHTML(c, false);
    el.appendChild(pin);

    // 팝업 (마커 DOM 내부에 embed → 마우스 이동시 이벤트 끊김 없음)
    const popup = document.createElement('div');
    popup.style.cssText = [
      'position:absolute',
      'bottom:110%',
      'left:50%',
      'transform:translateX(-50%)',
      'background:#fff',
      'border:1px solid #E5E9F0',
      'border-radius:8px',
      'padding:10px 12px',
      'min-width:200px',
      'box-shadow:0 4px 16px rgba(0,0,0,.12)',
      'pointer-events:none',
      'z-index:50',
      'display:none',
      'white-space:nowrap',
      'line-height:1.45',
    ].join(';');
    popup.innerHTML = popupHTML(c);
    el.appendChild(popup);

    el.addEventListener('mouseover', (e: MouseEvent) => {
      if (el.contains(e.relatedTarget as Node)) return; // 자식으로 이동 → 무시
      el.style.transform = 'scale(1.15)';
      el.style.transition = 'transform .15s ease';
      if (selectedIdRef.current !== c.id) popup.style.display = 'block';
    });

    el.addEventListener('mouseout', (e: MouseEvent) => {
      if (el.contains(e.relatedTarget as Node)) return; // 자식에서 이동 → 무시
      el.style.transform = 'scale(1)';
      if (selectedIdRef.current !== c.id) popup.style.display = 'none';
    });

    // 클릭 → 팝업 고정 (지도 click 이벤트 버블 차단)
    el.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation();
      onSelect(c.id);
    });

    const ov = new window.kakao.maps.CustomOverlay({
      position: pos, content: el, yAnchor: 1, zIndex: 1,
    });
    ov.setMap(map);
    overlays.current[c.id] = { ov, el, pin, popup, center: c };
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: '100%',
          touchAction: 'none',          // 지도 위 제스처가 페이지로 새지 않게
          overscrollBehavior: 'contain',
        }}
      />

      {/* 지도 버전 토글 */}
      <div style={{
        position: 'absolute', top: '16px', right: '50px', zIndex: 16,
        display: 'flex', background: 'rgba(255,255,255,0.95)',
        border: '1px solid #E5E9F0', borderRadius: '6px', overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}>
        {MAP_TYPES.map(({ key, label }, i) => (
          <button key={key} onClick={() => setMapType(key)} style={{
            padding: '5px 11px', fontSize: '11px', fontWeight: 600,
            whiteSpace: 'nowrap',
            background: mapType === key ? '#0B2545' : 'transparent',
            color: mapType === key ? '#fff' : '#64748b',
            border: 'none',
            borderLeft: i > 0 ? '1px solid #E5E9F0' : 'none',
            cursor: 'pointer',
          }}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}