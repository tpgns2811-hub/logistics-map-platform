export type TempType = '저온' | '상온' | '복합';

export type CenterStatus = '운영중' | '공사중' | '준공완료' | '미착공';

export interface LogisticsCenter {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  developer: string;
  tenant: string;
  land_area: number;
  gfa: number;
  completion_date: string;
  status: CenterStatus;
  temp_type: TempType;
  image: string;
}