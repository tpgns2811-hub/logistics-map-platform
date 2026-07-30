import type { TempType, CenterStatus } from '@/types/logistics';

/* ── 표시 단위 ── */
export type Unit = '평' | '㎡';
export const PYEONG = 3.3058; // 1평 = 3.3058㎡
export const gfaToPyeong = (sqm: number) => sqm / PYEONG;

/* ── 온도구분 색/글자 (마커·범례·리스트·상세 공통) ── */
export const TEMP_META: Record<TempType, { color: string; char: string }> = {
  '상온': { color: '#ea580c', char: '상' }, // 주황
  '저온': { color: '#2563eb', char: '저' }, // 파랑
  '복합': { color: '#7c3aed', char: '복' }, // 보라
};

/* ── 운영상태 색 ── */
export const STATUS_COLOR: Record<CenterStatus, string> = {
  '운영중': '#16a34a', '공사중': '#f59e0b', '미착공': '#94a3b8',
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

/* ── 연면적(평) 슬라이더 / 프리셋 ── */
export const GFA_SLIDER_MAX = 150000; // 평 (데이터 최대 ~13만평 커버)
export const GFA_STEP = 1000;         // 평
export type GfaRange = [number, number]; // [min, max] 평
export const GFA_PRESETS: { label: string; min: number; max: number }[] = [
  { label: '전체',    min: 0,     max: GFA_SLIDER_MAX },
  { label: '~1만평',  min: 0,     max: 10000 },
  { label: '1~3만평', min: 10000, max: 30000 },
  { label: '3만평+',  min: 30000, max: GFA_SLIDER_MAX },
];

/* ── 층별 임계값(평) 옵션 ── */
export const FLOOR_OPTIONS: { value: number; label: string }[] = [
  { value: 0,     label: '전체' },
  { value: 5000,  label: '층당 5천평↑' },
  { value: 10000, label: '층당 1만평↑' },
];

/* ── 준공연도 / 건축허가연도 필터 ── */
export const YEAR_MIN = 1988;
export const YEAR_MAX = 2027; // 데이터 최대연도(2026) + 1
export type YearRange = [number, number];

// "YYYY-MM-DD" / "YYYY" 문자열에서 연도만 추출, 없으면 null
export function getYear(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const y = parseInt(String(dateStr).slice(0, 4), 10);
  return isFinite(y) && y > 1900 && y < 2100 ? y : null;
}

// 연도 범위 필터 판정 - 날짜 데이터가 아예 없는 건(미착공 등)은 걸러내지 않고 항상 통과시킴
export function inYearRange(dateStr: string | null | undefined, range: YearRange): boolean {
  if (range[0] === YEAR_MIN && range[1] === YEAR_MAX) return true; // 필터 미적용 상태
  const y = getYear(dateStr);
  if (y == null) return true;
  return y >= range[0] && y <= range[1];
}

/* ── 층별 필터 판정 (floorSummary 기반 - 목록 응답에 항상 포함되는 요약값) ── */
// 한 층이라도 임대면적 ≥ threshold(평)
export function hasFloorOver(summary: { maxRentalArea: number }, threshold: number): boolean {
  if (!threshold) return true;
  return summary.maxRentalArea >= threshold;
}
// 한 층이라도 입주상담 가능(임대완료/공란이 아닌 값)
export function hasAvailableFloor(summary: { hasAvailable: boolean }): boolean {
  return summary.hasAvailable;
}