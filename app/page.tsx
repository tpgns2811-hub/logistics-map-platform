import MapLayout from '@/components/MapLayout';
import centers from '@/data/logisticsCenters.json';
import type { LogisticsCenter } from '@/types/logistics';

export default function Home() {
  return <MapLayout centers={centers as LogisticsCenter[]} />;
}