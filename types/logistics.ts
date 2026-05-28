export type CenterStatus = '운영중' | '공사중' | '계획중' | '준공완료';

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
  cold_storage: boolean;
  image: string;
}