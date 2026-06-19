'use client';

import { useEffect, useRef, useState } from 'react';
import type { LogisticsCenter } from '@/types/logistics';
import { TEMP_META, STATUS_COLOR, fmtSqm, type Unit } from '@/lib/display';

declare global { interface Window { kakao: any; } }

interface Props {
  centers:     LogisticsCenter[];   // 필터링된 표시 대상
  allCenters?: LogisticsCenter[];   // 전체 (id 조회용)
  unit:        Unit;
  onUnit:      (u: Unit) => void;
  selectedId:  string | null;
  onSelect:    (id: string | null) => void;
  onReady?:    () => void;
}

/* ── 지도 버전(맵타입) ── */
const MAP_TYPES = [
  { key: 'ROADMAP', label: '기본'    },
  { key: 'SKYVIEW', label: '스카이뷰' },
  { key: 'HYBRID',  label: '하이브리드' },
] as const;
type MapTypeKey = typeof MAP_TYPES[number]['key'];

const Z_HOVER = 1000; // 호버 시 다른 핀보다 무조건 위

/* ── 핀 HTML ── */
function pinHTML(c: LogisticsCenter, selected: boolean): string {
  const { color, char } = TEMP_META[c.temp_type] ?? TEMP_META['상온'];
  const dot = STATUS_COLOR[c.status] ?? '#94a3b8';
  const sz  = selected ? 42 : 32;
  const fsz = selected ? 16 : 12;
  return `
    <div style="position:relative;width:${sz}px;height:${sz}px;">
      <div style="width:${sz}px;height:${sz}px;background:${color};
        border-radius:50% 50% 50% 0;transform:rotate(-45deg);
        border:${selected ? 3 : 2}px solid #fff;
        box-shadow:${selected ? '0 4px 14px rgba(0,0,0,.45)' : '0 2px 6px rgba(0,0,0,.25)'};
        display:flex;align-items:center;justify-content:center;">
        <span style="transform:rotate(45deg);font-size:${fsz}px;font-weight:700;color:#fff;line-height:1;">${char}</span>
      </div>
      <div style="position:absolute;top:-3px;right:-3px;width:11px;height:11px;
        background:${dot};border-radius:50%;border:1.5px solid #fff;
        box-shadow:0 1px 3px rgba(0,0,0,.2);"></div>
    </div>`;
}

/* ── 팝업 HTML ── */
function popupHTML(c: LogisticsCenter, unit: Unit): string {
  const { color } = TEMP_META[c.temp_type] ?? TEMP_META['상온'];
  const dot = STATUS_COLOR[c.status] ?? '#94a3b8';
  return `
    <div style="font-size:13px;font-weight:600;color:#0B2545;margin-bottom:3px;">${c.name}</div>
    <div style="font-size:11px;color:#64748b;margin-bottom:5px;">${c.address}</div>
    <div style="display:flex;gap:5px;">
      <span style="background:${color}22;color:${color};padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;">${c.temp_type}</span>
      <span style="background:${dot}22;color:${dot};padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;">${c.status}</span>
    </div>
    <div style="font-size:10px;color:#94a3b8;margin-top:4px;">${fmtSqm(c.gfa, unit)}${unit} · ${c.developer}</div>
    <div style="position:absolute;bottom:-6px;left:50%;
      width:10px;height:10px;background:#fff;
      border-right:1px solid #E5E9F0;border-bottom:1px solid #E5E9F0;
      transform:translateX(-50%) rotate(45deg);"></div>`;
}

type OverlayData = {
  ov: any; el: HTMLDivElement; pin: HTMLDivElement; popup: HTMLDivElement; center: LogisticsCenter;
};

export default function KakaoMap({ centers, allCenters, unit, onUnit, selectedId, onSelect, onReady }: Props) {
  const mapRef        = useRef<HTMLDivElement>(null);
  const mapInst       = useRef<any>(null);
  const overlays      = useRef<Record<string, OverlayData>>({});
  const inited        = useRef(false);
  const selectedIdRef = useRef<string | null>(selectedId);
  const unitRef       = useRef<Unit>(unit);
  const filteredRef   = useRef<LogisticsCenter[]>(centers);
  const centerByIdRef = useRef<Record<string, LogisticsCenter>>({});
  const [mapType, setMapType] = useState<MapTypeKey>('ROADMAP');

  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
  useEffect(() => { unitRef.current = unit; }, [unit]);

  useEffect(() => {
    const src = allCenters ?? centers;
    const m: Record<string, LogisticsCenter> = {};
    src.forEach(c => { m[c.id] = c; });
    centerByIdRef.current = m;
  }, [allCenters, centers]);

  // 선택 아닌 핀의 기본 zIndex 복원값
  const baseZ = (id: string) => (id === selectedIdRef.current ? 10 : 1);

  /* ── 오버레이 lazy 생성 ── */
  function ensureOverlay(c: LogisticsCenter): OverlayData {
    const existing = overlays.current[c.id];
    if (existing) return existing;

    const el = document.createElement('div');
    el.style.cssText = 'position:relative;display:inline-block;cursor:pointer;';

    const pin = document.createElement('div');
    pin.innerHTML = pinHTML(c, c.id === selectedIdRef.current);
    el.appendChild(pin);

    const popup = document.createElement('div');
    popup.style.cssText = [
      'position:absolute', 'bottom:110%', 'left:50%', 'transform:translateX(-50%)',
      'background:#fff', 'border:1px solid #E5E9F0', 'border-radius:8px',
      'padding:10px 12px', 'min-width:200px', 'box-shadow:0 4px 16px rgba(0,0,0,.12)',
      'pointer-events:none', 'z-index:50', 'display:none', 'white-space:nowrap', 'line-height:1.45',
    ].join(';');
    popup.innerHTML = popupHTML(c, unitRef.current);
    el.appendChild(popup);

    el.addEventListener('mouseover', (e: MouseEvent) => {
      if (el.contains(e.relatedTarget as Node)) return;
      el.style.transform = 'scale(1.15)';
      el.style.transition = 'transform .15s ease';
      overlays.current[c.id]?.ov.setZIndex(Z_HOVER); // 미리보기 가림 방지: 최상단
      if (selectedIdRef.current !== c.id) popup.style.display = 'block';
    });
    el.addEventListener('mouseout', (e: MouseEvent) => {
      if (el.contains(e.relatedTarget as Node)) return;
      el.style.transform = 'scale(1)';
      overlays.current[c.id]?.ov.setZIndex(baseZ(c.id)); // 복원
      if (selectedIdRef.current !== c.id) popup.style.display = 'none';
    });
    el.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation();
      onSelect(c.id);
    });

    const ov = new window.kakao.maps.CustomOverlay({
      position: new window.kakao.maps.LatLng(c.latitude, c.longitude),
      content: el, yAnchor: 1, zIndex: 1,
    });
    const data: OverlayData = { ov, el, pin, popup, center: c };
    overlays.current[c.id] = data;
    return data;
  }

  /* ── 화면 안 마커만 표시 (뷰포트 컬링) ── */
  function refreshMarkers() {
    const map = mapInst.current;
    if (!map || !window.kakao) return;
    const bounds = map.getBounds();
    const inBounds = (c: LogisticsCenter) =>
      bounds.contain(new window.kakao.maps.LatLng(c.latitude, c.longitude));

    const filteredIds = new Set<string>();
    filteredRef.current.forEach(c => {
      filteredIds.add(c.id);
      if (inBounds(c)) ensureOverlay(c).ov.setMap(map);
    });
    Object.entries(overlays.current).forEach(([id, o]) => {
      if (id === selectedIdRef.current) { o.ov.setMap(map); return; }
      o.ov.setMap(filteredIds.has(id) && inBounds(o.center) ? map : null);
    });
  }

  /* ── 페이지 줌 방지 ── */
  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => { if (e.ctrlKey) e.preventDefault(); };
    const onGesture = (e: Event) => e.preventDefault();
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

        filteredRef.current = centers;
        window.kakao.maps.event.addListener(map, 'idle', refreshMarkers);
        window.kakao.maps.event.addListener(map, 'click', () => onSelect(null));
        refreshMarkers();
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

  /* ── 맵타입 변경 ── */
  useEffect(() => {
    if (!mapInst.current || !window.kakao) return;
    mapInst.current.setMapTypeId(window.kakao.maps.MapTypeId[mapType]);
  }, [mapType]);

  /* ── 단위 변경 → 생성된 팝업만 갱신 ── */
  useEffect(() => {
    Object.values(overlays.current).forEach(({ popup, center }) => {
      popup.innerHTML = popupHTML(center, unit);
    });
  }, [unit]);

  /* ── 필터 변경 → 표시 마커 갱신 ── */
  useEffect(() => {
    filteredRef.current = centers;
    refreshMarkers();
  }, [centers]);

  /* ── selectedId 변경 ── */
  useEffect(() => {
    selectedIdRef.current = selectedId;
    const map = mapInst.current;
    if (!map) return;

    Object.entries(overlays.current).forEach(([id, { pin, ov, center, popup }]) => {
      const sel = id === selectedId;
      pin.innerHTML = pinHTML(center, sel);
      ov.setZIndex(sel ? 10 : 1);
      popup.style.display = sel ? 'block' : 'none';
    });

    if (!selectedId) return;
    const c = centerByIdRef.current[selectedId];
    if (!c) return;
    if (!c.latitude || !c.longitude) return; // 좌표 없는 센터는 맵 점프 방지
    const o = ensureOverlay(c);
    o.ov.setMap(map);
    o.pin.innerHTML = pinHTML(c, true);
    o.ov.setZIndex(10);
    o.popup.innerHTML = popupHTML(c, unitRef.current);
    o.popup.style.display = 'block';
    map.panTo(new window.kakao.maps.LatLng(c.latitude, c.longitude));
  }, [selectedId]);

  const toggleBox: React.CSSProperties = {
    position: 'absolute', right: '50px', zIndex: 16, display: 'inline-flex',
    background: 'rgba(255,255,255,0.95)', border: '1px solid #E5E9F0',
    borderRadius: '6px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        ref={mapRef}
        style={{ width: '100%', height: '100%', touchAction: 'none', overscrollBehavior: 'contain' }}
      />

      {/* 면적 단위 토글 (새로고침 ↔ 지도 사이, 최상단) */}
      <div style={{ ...toggleBox, top: '16px' }}>
        {(['평', '㎡'] as Unit[]).map((u, i) => (
          <button key={u} onClick={() => onUnit(u)} style={{
            padding: '5px 12px', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap',
            background: unit === u ? '#0B2545' : 'transparent',
            color: unit === u ? '#fff' : '#64748b',
            border: 'none', borderLeft: i > 0 ? '1px solid #E5E9F0' : 'none', cursor: 'pointer',
          }}>
            {u}
          </button>
        ))}
      </div>

      {/* 지도 버전 토글 (단위 토글 아래) */}
      <div style={{ ...toggleBox, top: '54px' }}>
        {MAP_TYPES.map(({ key, label }, i) => (
          <button key={key} onClick={() => setMapType(key)} style={{
            padding: '5px 11px', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap',
            background: mapType === key ? '#0B2545' : 'transparent',
            color: mapType === key ? '#fff' : '#64748b',
            border: 'none', borderLeft: i > 0 ? '1px solid #E5E9F0' : 'none', cursor: 'pointer',
          }}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
