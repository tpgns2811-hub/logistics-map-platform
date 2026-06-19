import type { TempType, CenterStatus } from '@/types/logistics';

/* ── 표시 단위 ── */
export type Unit = '평' | '㎡';
export const PYEONG = 3.3058; // 1평 = 3.3058㎡

/* ── 온도구분 색/글자 (마커·범례·리스트·상세 공통) ── */
export const TEMP_META: Record<TempType, { color: string; char: string }> = {
  '상온': { color: '#ea580c', char: '상' }, // 주황
  '저온': { color: '#2563eb', char: '저' }, // 파랑
  '복합': { color: '#7c3aed', char: '복' }, // 보라
};

/* ── 운영상태 색 ── */
export const STATUS_COLOR: Record<CenterStatus, string> = {
  '운영중': '#16a34a', '준공완료': '#ef4444', '공사중': '#f59e0b', '미착공': '#94a3b8',
};

/* ── ㎡로 저장된 값(LM_Data: land_area/gfa) 표시 ── */
export function fmtSqm(sqm: number, unit: Unit): string {
  if (!sqm || !isFinite(sqm)) return '-';
  const v = unit === '㎡' ? sqm : sqm / PYEONG;
  return Math.round(v).toLocaleString();
}

/* ── 평으로 저장된 값(Floors: rental_area/exclusive_area, 문자열) 표시 ── */
export function fmtPyeong(raw: string | number, unit: Unit): string {
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/,/g, ''));
  if (!isFinite(n)) return String(raw ?? '') || '-';
  const v = unit === '평' ? n : n * PYEONG;
  return (Math.round(v * 10) / 10).toLocaleString();
}

/* ── 전체 연면적 버킷 (평 기준 — 물류 업계 관용) ── */
export type GfaBucket = 'all' | 'u1' | '1to3' | 'o3';
export const GFA_BUCKETS: { key: GfaBucket; label: string }[] = [
  { key: 'all',  label: '전체'    },
  { key: 'u1',   label: '~1만평'  },
  { key: '1to3', label: '1~3만평' },
  { key: 'o3',   label: '3만평+'  },
];
export function inGfaBucket(gfaSqm: number, bucket: GfaBucket): boolean {
  if (bucket === 'all') return true;
  const pyeong = gfaSqm / PYEONG;
  if (bucket === 'u1')   return pyeong < 10000;
  if (bucket === '1to3') return pyeong >= 10000 && pyeong < 30000;
  return pyeong >= 30000; // 'o3'
}

/* ── 층별 필터 판정 (Floors 기반) ── */
// 한 층이라도 임대면적 ≥ 10,000평
export function hasFloorOver10k(floors: { rental_area: string }[]): boolean {
  return floors.some(f => {
    const a = parseFloat(String(f.rental_area).replace(/,/g, ''));
    return isFinite(a) && a >= 10000;
  });
}
// 한 층이라도 입주상담 가능(임대완료/공란이 아닌 값)
export function hasAvailableFloor(floors: { available: string }[]): boolean {
  return floors.some(f => {
    const v = (f.available ?? '').trim();
    return v !== '' && v !== '-' && v !== '임대완료';
  });
}