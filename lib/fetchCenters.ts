import type { LogisticsCenter, FloorInfo, NearbyIC } from '@/types/logistics';
import localFloorsData from '@/data/floors.json';

const SHEET1_URL = process.env.GOOGLE_SHEET_CSV_URL    ?? ''; // 기본 정보
const SHEET2_URL = process.env.GOOGLE_SHEET_FLOORS_URL ?? ''; // 층별 현황

/* ── 따옴표·줄바꿈을 올바르게 처리하는 CSV 파서 ──
   - 따옴표 안의 콤마/줄바꿈은 셀 내용으로 취급
   - "" 는 escape 된 따옴표                                   */
function parseCSV(text: string): string[][] {
  const s = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQ = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inQ) {
      if (ch === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; } // escaped quote
        else inQ = false;
      } else field += ch;
    } else {
      if (ch === '"')       inQ = true;
      else if (ch === ',')  { row.push(field); field = ''; }
      else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else                  field += ch;
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/* 헤더 셀에서 \n(설명) 부분을 떼고 실제 컬럼명만 추출 */
function cleanHeader(cell: string): string {
  return (cell ?? '').split('\n')[0].trim();
}

/* ── 인접 IC 최대 3개(ic1_name/ic1_distance_km, ic2_*, ic3_*) 파싱 ── */
function parseNearbyICs(o: Record<string, string>): NearbyIC[] {
  const list: NearbyIC[] = [];
  for (let i = 1; i <= 3; i++) {
    const name = o[`ic${i}_name`];
    const dist = parseFloat(o[`ic${i}_distance_km`]);
    if (name && isFinite(dist)) list.push({ name, distance_km: dist });
  }
  return list;
}

/* ── Sheet1 파싱 → 기본 정보 ── */
function parseSheet1(csv: string): Omit<LogisticsCenter, 'floors' | 'floorSummary'>[] {
  const rows = parseCSV(csv);
  if (!rows.length) return [];
  const headers = rows[0].map(cleanHeader);

  return rows.slice(1)
    .filter(r => r.some(c => c.trim() !== ''))
    .map(r => {
      const o: Record<string, string> = {};
      headers.forEach((h, i) => { o[h] = (r[i] ?? '').trim(); });

      const province = o.province ?? '';
      const city     = o.city     ?? '';
      const district = o.district ?? '';
      return {
        id:                o.id,
        name:              o.name,
        province,
        city,
        district,
        // 시트에 정확 지번 주소(address)가 있으면 그걸 우선 사용, 없으면 기존처럼 조합
        address:           o.address || `${province} ${city} ${district}`.trim(),
        latitude:          parseFloat(o.latitude)  || 0,
        longitude:         parseFloat(o.longitude) || 0,
        developer:         o.developer,
        tenant:            o.tenant,
        land_area:         parseFloat(o.land_area) || 0,
        gfa:               parseFloat(o.gfa)       || 0,
        completion_date:   o.completion_date,
        status:            o.status    as LogisticsCenter['status'],
        temp_type:         o.temp_type as LogisticsCenter['temp_type'],
        scale:             o.scale,
        parking:           o.parking ? parseInt(o.parking) : null,
        rental_price_warm: o.rental_price_warm ? parseInt(o.rental_price_warm) : null,
        rental_price_cold: o.rental_price_cold ? parseInt(o.rental_price_cold) : null,
        // 헤더 콤마 누락(`rental_conditions image`) 보정
        rental_conditions: o.rental_conditions ?? o['rental_conditions image'] ?? '',
        image:                    o.image ?? '',
        permit_date:              o.permit_date ?? '',
        construction_start_date:  o.construction_start_date ?? '',
        remarks:                  o.remarks ?? '',
        history:                  o.history ?? '',
        nearbyICs:                parseNearbyICs(o),
      };
    })
    .filter(c => c.id);
}

/* ── Sheet2 파싱 → 층별 현황 (3줄 헤더 자동 처리) ── */
function parseSheet2(csv: string): Record<string, FloorInfo[]> {
  const rows = parseCSV(csv);
  const result: Record<string, FloorInfo[]> = {};
  if (!rows.length) return result;

  // 첫 셀이 'id'인 행을 실제 헤더로 (그룹행/설명행 무시)
  let hIdx = rows.findIndex(r => cleanHeader(r[0] ?? '') === 'id');
  if (hIdx < 0) hIdx = 0;
  const headers = rows[hIdx].map(cleanHeader);

  const idPattern = /^(s1_|pe_|lc[-_]|ap_)/;
  rows.slice(hIdx + 1).forEach(r => {
    const id = (r[0] ?? '').trim();
    if (!idPattern.test(id)) return; // 설명행/빈행 스킵

    const o: Record<string, string> = {};
    headers.forEach((h, i) => { o[h] = (r[i] ?? '').trim(); });

    (result[id] ??= []).push({
      floor:          o.floor          ?? '',
      usage:          o.usage          ?? '',
      exclusive_area: o.exclusive_area || '-',
      rental_area:    o.rental_area    || '-',
      available:      o.available      || '-',
    });
  });
  return result;
}

/* ── 필터용 요약값 계산 (전체 층 목록을 클라이언트에 보내지 않고도 필터링 가능하게) ── */
function summarizeFloors(floors: FloorInfo[]): LogisticsCenter['floorSummary'] {
  let maxRentalArea = 0;
  let hasAvailable = false;
  for (const f of floors) {
    const a = parseFloat(String(f.rental_area).replace(/,/g, ''));
    if (isFinite(a) && a > maxRentalArea) maxRentalArea = a;
    const v = (f.available ?? '').trim();
    if (v !== '' && v !== '-' && v !== '임대완료') hasAvailable = true;
  }
  return { maxRentalArea, hasAvailable };
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

/* 구글 시트 CSV는 자주 안 바뀌므로 짧은 기간(2분) 서버 캐시를 둔다.
   "새로고침" 버튼(force=true)만 캐시를 건너뛰고 즉시 최신본을 가져온다. */
const REVALIDATE_SECONDS = 120;

/* ── 메인 함수 ── */
export async function fetchCenters(force = false): Promise<LogisticsCenter[]> {
  const useSheets = !!SHEET1_URL;
  const fetchOpts = force
    ? { cache: 'no-store' as const }
    : { next: { revalidate: REVALIDATE_SECONDS } };

  if (!useSheets) {
    const raw = (await import('@/data/logisticsCenters.json')).default as any[];
    return raw.map(c => {
      const { province, city, district } = splitAddress(c.address ?? '');
      const floors: FloorInfo[] =
        (localFloorsData as Record<string, FloorInfo[]>)[c.id] ?? [];
      return {
        ...c, province, city, district, floors,
        floorSummary: summarizeFloors(floors),
        permit_date: c.permit_date ?? '',
        construction_start_date: c.construction_start_date ?? '',
        remarks: c.remarks ?? '',
        history: c.history ?? '',
        nearbyICs: c.nearbyICs ?? [],
      } as LogisticsCenter;
    });
  }

  try {
    const [csv1, csv2] = await Promise.all([
      fetch(SHEET1_URL, fetchOpts).then(r => r.text()),
      SHEET2_URL
        ? fetch(SHEET2_URL, fetchOpts).then(r => r.text())
        : Promise.resolve(''),
    ]);

    const centers   = parseSheet1(csv1);
    const floorsMap = csv2 ? parseSheet2(csv2) : (localFloorsData as Record<string, FloorInfo[]>);

    return centers.map(c => {
      const floors = floorsMap[c.id] ?? [];
      return { ...c, floors, floorSummary: summarizeFloors(floors) };
    });

  } catch (err) {
    console.error('[fetchCenters] Sheets 연결 실패 → 로컬 JSON 사용:', err);
    const raw = (await import('@/data/logisticsCenters.json')).default as any[];
    return raw.map(c => {
      const { province, city, district } = splitAddress(c.address ?? '');
      const floors: FloorInfo[] =
        (localFloorsData as Record<string, FloorInfo[]>)[c.id] ?? [];
      return {
        ...c, province, city, district, floors,
        permit_date: c.permit_date ?? '',
        construction_start_date: c.construction_start_date ?? '',
        remarks: c.remarks ?? '',
        history: c.history ?? '',
        nearbyICs: c.nearbyICs ?? [],
      } as LogisticsCenter;
    });
  }
}