import type { LogisticsCenter, FloorInfo } from '@/types/logistics';
import localFloorsData from '@/data/floors.json';

const SHEET1_URL = process.env.GOOGLE_SHEET_CSV_URL    ?? ''; // 기본 정보
const SHEET2_URL = process.env.GOOGLE_SHEET_FLOORS_URL ?? ''; // 층별 현황

/* ── CSV 한 줄 파싱 (따옴표 처리 포함) ── */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = '', inQ = false;
  for (const ch of line) {
    if (ch === '"')              { inQ = !inQ; }
    else if (ch === ',' && !inQ) { result.push(cur.trim()); cur = ''; }
    else                         { cur += ch; }
  }
  result.push(cur.trim());
  return result;
}

/* ── CSV 전처리 공통 ── */
function csvToObjects(csv: string): Record<string, string>[] {
  const lines = csv.split('\n').filter(l => l.trim());
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1)
    .filter(l => l.trim())
    .map(line => {
      const vals = parseCSVLine(line);
      const o: Record<string, string> = {};
      headers.forEach((h, i) => { o[h.trim()] = vals[i] ?? ''; });
      return o;
    });
}

/* ── Sheet1 파싱 → 기본 정보 ── */
function parseSheet1(csv: string): Omit<LogisticsCenter, 'floors'>[] {
  return csvToObjects(csv).map(o => {
    const province = o.province ?? '';
    const city     = o.city     ?? '';
    const district = o.district ?? '';
    return {
      id:                o.id,
      name:              o.name,
      province,
      city,
      district,
      address:           `${province} ${city} ${district}`.trim(),
      latitude:          parseFloat(o.latitude)  || 0,
      longitude:         parseFloat(o.longitude) || 0,
      developer:         o.developer,
      tenant:            o.tenant,
      land_area:         parseInt(o.land_area)   || 0,
      gfa:               parseInt(o.gfa)         || 0,
      completion_date:   o.completion_date,
      status:            o.status    as LogisticsCenter['status'],
      temp_type:         o.temp_type as LogisticsCenter['temp_type'],
      scale:             o.scale,
      parking:           o.parking ? parseInt(o.parking) : null,
      rental_price_warm: o.rental_price_warm ? parseInt(o.rental_price_warm) : null,
      rental_price_cold: o.rental_price_cold ? parseInt(o.rental_price_cold) : null,
      rental_conditions: o.rental_conditions,
      image:             o.image,
    };
  });
}

/* ── Sheet2 파싱 → 층별 현황 (id 기준으로 그룹핑) ── */
function parseSheet2(csv: string): Record<string, FloorInfo[]> {
  const result: Record<string, FloorInfo[]> = {};
  csvToObjects(csv).forEach(o => {
    const id = o.id;
    if (!id) return;
    if (!result[id]) result[id] = [];
    result[id].push({
      floor:          o.floor          ?? '',
      usage:          o.usage          ?? '',
      exclusive_area: o.exclusive_area ?? '-',
      rental_area:    o.rental_area    ?? '-',
      available:      o.available      ?? '-',
    });
  });
  return result;
}

/* ── 로컬 JSON fallback 에서 province/city/district 분리 ── */
function splitAddress(full: string) {
  const parts = full.split(' ');
  return {
    province: parts[0] ?? '',
    city:     parts[1] ?? '',
    district: parts.slice(2).join(' '),
  };
}

/* ── 메인 함수 ── */
export async function fetchCenters(): Promise<LogisticsCenter[]> {
  const useSheets = !!SHEET1_URL;

  if (!useSheets) {
    // ── 로컬 JSON 사용 (개발 환경 fallback) ──
    const raw = (await import('@/data/logisticsCenters.json')).default as any[];
    return raw.map(c => {
      const { province, city, district } = splitAddress(c.address ?? '');
      const floors: FloorInfo[] =
        (localFloorsData as Record<string, FloorInfo[]>)[c.id] ?? [];
      return { ...c, province, city, district, floors } as LogisticsCenter;
    });
  }

  try {
    // ── Sheet1 + Sheet2 병렬 fetch (캐시 없이 항상 최신 데이터) ──
    const [csv1, csv2] = await Promise.all([
      fetch(SHEET1_URL, { cache: 'no-store' }).then(r => r.text()),
      SHEET2_URL
        ? fetch(SHEET2_URL, { cache: 'no-store' }).then(r => r.text())
        : Promise.resolve(''),
    ]);

    const centers = parseSheet1(csv1);
    const floorsMap = csv2 ? parseSheet2(csv2) : (localFloorsData as Record<string, FloorInfo[]>);

    return centers.map(c => ({
      ...c,
      floors: floorsMap[c.id] ?? [],
    }));

  } catch (err) {
    console.error('[fetchCenters] Sheets 연결 실패 → 로컬 JSON 사용:', err);
    const raw = (await import('@/data/logisticsCenters.json')).default as any[];
    return raw.map(c => {
      const { province, city, district } = splitAddress(c.address ?? '');
      const floors: FloorInfo[] =
        (localFloorsData as Record<string, FloorInfo[]>)[c.id] ?? [];
      return { ...c, province, city, district, floors } as LogisticsCenter;
    });
  }
}