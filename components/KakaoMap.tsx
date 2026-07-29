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

type TempCounts = { 상온: number; 저온: number; 복합: number };
type ClusterData = { ov: any; el: HTMLDivElement; count: number; temp: TempCounts; polys: any[] };

type BoundaryFeature = { name: string; rings: number[][][] };

// 지도 레벨(클수록 축소): PROVINCE_LEVEL 이상 = 도(서울/경기도/인천) 단위,
// REGION_LEVEL~PROVINCE_LEVEL-1 = 시/군/구 단위, DISTRICT_LEVEL~REGION_LEVEL-1 = 구/읍면 단위(분리 가능한 시만), 그 미만 = 개별 핀
const PROVINCE_LEVEL = 10;
const REGION_LEVEL = 8;
const DISTRICT_LEVEL = 6;

// 구/군으로 나뉘어 있고 경계 데이터도 있는 시 — 이 시들만 중간 축척에서 한 단계 더 쪼갬
const SPLIT_CITIES = new Set(['수원시', '성남시', '안양시', '안산시', '고양시', '용인시']);

// 한 단계 확대: 도 -> 시/군/구 -> 구/읍면 -> 개별 건물 순으로 정확히 다음 단계까지만 줌인
function stepDownLevel(level: number): number {
  if (level >= PROVINCE_LEVEL) return PROVINCE_LEVEL - 1;
  if (level >= REGION_LEVEL) return REGION_LEVEL - 1;
  if (level >= DISTRICT_LEVEL) return DISTRICT_LEVEL - 1;
  return Math.max(1, level - 2);
}

// 도(서울특별시/경기도/인천광역시) 단위
function provinceKey(c: LogisticsCenter): string {
  return c.province || '기타';
}

// 시(이천시/여주시 등)가 있으면 시 단위로, 서울처럼 city===province인 경우엔 구 단위로 묶음
function regionKey(c: LogisticsCenter): string {
  return c.city && c.city !== c.province ? c.city : (c.district || c.city || c.province || '기타');
}

// 중간 축척: 구/군 분리 가능한 시는 "시+구" 단위로, 그 외에는 regionKey와 동일(더 쪼갤 경계 데이터가 없음)
function districtKey(c: LogisticsCenter): string {
  if (c.city && c.city !== c.province && SPLIT_CITIES.has(c.city) && c.district) return `${c.city}${c.district}`;
  return regionKey(c);
}

// 경계 lookup·그룹핑엔 붙여쓴 key를 쓰되, 배지에 보여줄 땐 "시 구"처럼 띄어서 표시
function regionLabel(key: string): string {
  for (const city of SPLIT_CITIES) {
    if (key.startsWith(city) && key.length > city.length) return `${city} ${key.slice(city.length)}`;
  }
  return key;
}

// data/regionBoundaries.json은 수도권 시/군/구 경계만 추려둔 정적 자산(호버 시에만 필요해서 지연 로드)
let boundariesPromise: Promise<BoundaryFeature[]> | null = null;
function loadBoundaries(): Promise<BoundaryFeature[]> {
  if (!boundariesPromise) {
    boundariesPromise = import('@/data/regionBoundaries.json').then(m => (m as any).default ?? (m as any));
  }
  return boundariesPromise;
}
// "용인시" -> 용인시 전체(구 3개 폴리곤 합), "용인시처인구" -> 그 구 하나만, 둘 다 startsWith로 커버됨
function getBoundaryRings(list: BoundaryFeature[], key: string): number[][][] {
  return list.filter(f => f.name === key || f.name.startsWith(key)).flatMap(f => f.rings);
}

// 도넛 링 = 그 지역 건물들의 온도구성(상온/저온/복합) 비율 — 개별 핀·범례와 같은 TEMP_META 색상 사용
function clusterPinHTML(temp: TempCounts, label: string): string {
  const count = temp.상온 + temp.저온 + temp.복합;
  const p1 = (temp.상온 / count) * 100;
  const p2 = p1 + (temp.저온 / count) * 100;
  const sz  = count >= 100 ? 58 : count >= 30 ? 50 : 42;
  const inner = sz - 14;
  const fsz = count >= 100 ? 17 : count >= 30 ? 15 : 13;
  return `
    <div style="display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer;">
      <div style="width:${sz}px;height:${sz}px;border-radius:50%;
        background:conic-gradient(${TEMP_META['상온'].color} 0% ${p1}%, ${TEMP_META['저온'].color} ${p1}% ${p2}%, ${TEMP_META['복합'].color} ${p2}% 100%);
        border:2px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.35);
        display:flex;align-items:center;justify-content:center;">
        <div style="width:${inner}px;height:${inner}px;border-radius:50%;background:#fff;
          display:flex;align-items:center;justify-content:center;">
          <span style="font-size:${fsz}px;font-weight:700;color:#0B2545;line-height:1;">${count}</span>
        </div>
      </div>
      <span style="font-size:11px;font-weight:700;color:#0B2545;background:#fff;
        padding:1px 8px;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.2);white-space:nowrap;">${label}</span>
    </div>`;
}

export default function KakaoMap({ centers, allCenters, unit, onUnit, selectedId, onSelect, onReady }: Props) {
  const mapRef        = useRef<HTMLDivElement>(null);
  const mapInst       = useRef<any>(null);
  const overlays      = useRef<Record<string, OverlayData>>({});
  const clusters      = useRef<Record<string, ClusterData>>({});
  const shownIds      = useRef<Set<string>>(new Set());
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

  /* ── 클러스터 오버레이 lazy 생성/재사용 ──
     호버 시 loadBoundaries()로 해당 지역 행정경계 폴리곤을 지도 위에 그려서 강조,
     마우스가 벗어나면 지움 (경계 데이터는 첫 호버 때 한 번만 지연 로드) */
  function ensureCluster(key: string, lat: number, lng: number, temp: TempCounts): ClusterData {
    const count = temp.상온 + temp.저온 + temp.복합;
    const existing = clusters.current[key];
    if (existing) {
      if (existing.count !== count) {
        existing.count = count; existing.temp = temp;
        existing.el.innerHTML = clusterPinHTML(temp, regionLabel(key));
      }
      existing.ov.setPosition(new window.kakao.maps.LatLng(lat, lng));
      return existing;
    }
    const el = document.createElement('div');
    el.innerHTML = clusterPinHTML(temp, regionLabel(key));
    const data: ClusterData = { ov: null, el, count, temp, polys: [] };

    el.addEventListener('mouseover', () => {
      el.style.transform = 'scale(1.08)';
      el.style.transition = 'transform .15s ease';
      loadBoundaries().then(list => {
        data.polys.forEach(p => p.setMap(null));
        data.polys = getBoundaryRings(list, key).map(ring => {
          const poly = new window.kakao.maps.Polygon({
            path: ring.map(([lat2, lng2]) => new window.kakao.maps.LatLng(lat2, lng2)),
            strokeWeight: 3, strokeColor: '#0B2545', strokeOpacity: 0.85,
            fillColor: '#0B2545', fillOpacity: 0.16,
          });
          poly.setMap(mapInst.current);
          return poly;
        });
      });
    });
    el.addEventListener('mouseout', () => {
      el.style.transform = 'scale(1)';
      data.polys.forEach(p => p.setMap(null));
      data.polys = [];
    });
    el.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation();
      const map = mapInst.current;
      if (!map) return;
      map.setLevel(stepDownLevel(map.getLevel()), { anchor: new window.kakao.maps.LatLng(lat, lng) });
    });

    const ov = new window.kakao.maps.CustomOverlay({
      position: new window.kakao.maps.LatLng(lat, lng), content: el, yAnchor: 0.5, zIndex: 5,
    });
    data.ov = ov;
    clusters.current[key] = data;
    return data;
  }

  function groupAndShowClusters(map: any, visible: LogisticsCenter[], keyFn: (c: LogisticsCenter) => string) {
    const groups = new Map<string, LogisticsCenter[]>();
    visible.forEach(c => {
      if (c.id === selectedIdRef.current) return; // 선택 건물은 아래서 항상 단독 처리
      const key = keyFn(c);
      const arr = groups.get(key);
      if (arr) arr.push(c); else groups.set(key, [c]);
    });
    const nextClusterKeys = new Set<string>();
    groups.forEach((members, key) => {
      const lat = members.reduce((s, m) => s + m.latitude, 0) / members.length;
      const lng = members.reduce((s, m) => s + m.longitude, 0) / members.length;
      const temp: TempCounts = { 상온: 0, 저온: 0, 복합: 0 };
      members.forEach(m => { temp[m.temp_type] = (temp[m.temp_type] ?? 0) + 1; });
      ensureCluster(key, lat, lng, temp).ov.setMap(map);
      nextClusterKeys.add(key);
    });
    return nextClusterKeys;
  }

  /* ── 화면 안 마커만 표시 + 시/군/구(→구/읍면) 단계적 클러스터링 (뷰포트 컬링) ──
     축소 상태에서 수백 개 핀이 동시에 DOM 오버레이로 뜨는 게 렉의 주 원인이라
     PROVINCE_LEVEL 이상은 도(서울/경기도/인천) 단위, REGION_LEVEL~PROVINCE_LEVEL-1은 시/군/구 단위,
     DISTRICT_LEVEL~REGION_LEVEL-1은 구/읍면 단위(분리 가능한 시만)로 묶어서 "지역명 개수" 배지로 표시하고,
     그보다 확대하면 건물별 개별 핀으로 전환 */
  function refreshMarkers() {
    const map = mapInst.current;
    if (!map || !window.kakao) return;
    const bounds = map.getBounds();
    const level = map.getLevel();
    const inBounds = (c: LogisticsCenter) =>
      bounds.contain(new window.kakao.maps.LatLng(c.latitude, c.longitude));

    const visible = filteredRef.current.filter(c => c.latitude && c.longitude && inBounds(c));

    const nextShownIds = new Set<string>();
    let nextClusterKeys = new Set<string>();

    if (level >= PROVINCE_LEVEL) {
      nextClusterKeys = groupAndShowClusters(map, visible, provinceKey);
    } else if (level >= REGION_LEVEL) {
      nextClusterKeys = groupAndShowClusters(map, visible, regionKey);
    } else if (level >= DISTRICT_LEVEL) {
      nextClusterKeys = groupAndShowClusters(map, visible, districtKey);
    } else {
      visible.forEach(c => {
        if (c.id === selectedIdRef.current) return;
        ensureOverlay(c).ov.setMap(map);
        nextShownIds.add(c.id);
      });
    }

    // 선택된 건물은 줌레벨/필터/화면범위와 무관하게 항상 단독 핀으로 유지
    const selId = selectedIdRef.current;
    if (selId && !nextShownIds.has(selId)) {
      const c = centerByIdRef.current[selId];
      if (c && c.latitude && c.longitude) {
        ensureOverlay(c).ov.setMap(map);
        nextShownIds.add(selId);
      }
    }

    // 직전에 보이던 것 중 이번에 안 보이는 것만 정리(전체 오버레이 순회 안 함 — 세션이 길어져도 비용 고정)
    shownIds.current.forEach(id => {
      if (!nextShownIds.has(id) && overlays.current[id]) overlays.current[id].ov.setMap(null);
    });
    Object.keys(clusters.current).forEach(key => {
      if (!nextClusterKeys.has(key)) {
        const c = clusters.current[key];
        c.ov.setMap(null);
        c.polys.forEach(p => p.setMap(null));
        c.polys = [];
      }
    });
    shownIds.current = nextShownIds;
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
