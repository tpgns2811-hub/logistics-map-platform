export type TempType = '저온' | '상온' | '복합';

export type CenterStatus = '운영중' | '공사중' | '미착공';

export interface FloorInfo {
  floor: string;          // 층 (예: "B1", "1F", "2F")
  usage: string;          // 용도 (예: "상온", "저온", "사무실")
  exclusive_area: string; // 전용면적 (평)
  rental_area: string;    // 임대면적 (평)
  available: string;      // 입주 가능 여부 (예: "즉시", "임대완료", "26.07")
}

export interface LogisticsCenter {
  id: string;
  name: string;
  province: string;         // 경기도 / 인천광역시
  city: string;             // 이천시 / 광주시
  district: string;         // 마장면 / 도척면
  address: string;          // province + city + district 합산
  latitude: number;
  longitude: number;
  developer: string;
  tenant: string;
  land_area: number;
  gfa: number;
  completion_date: string;
  status: CenterStatus;
  temp_type: TempType;
  scale: string;                    // 규모 (예: "B2/4F")
  parking: number | null;           // 주차 대수
  rental_price_warm: number | null; // 상온 임대료 (원/임대평)
  rental_price_cold: number | null; // 저온 임대료 (원/임대평)
  rental_conditions: string;        // 임대 조건
  floors?: FloorInfo[];             // 층별 상세 정보 (목록 응답엔 없음, 상세보기 시 별도 API로 조회)
  floorSummary: { maxRentalArea: number; hasAvailable: boolean }; // 필터용 요약(목록 응답에 항상 포함)
  image: string;
  permit_date: string;              // 허가일
  construction_start_date: string;  // 착공일
  remarks: string;                  // 비고
  history: string;                  // 변경 이력
}