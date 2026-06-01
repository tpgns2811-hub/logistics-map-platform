import MapLayout from '@/components/MapLayout';
import { fetchCenters } from '@/lib/fetchCenters';

export default async function Home() {
  const centers = await fetchCenters();
  return <MapLayout centers={centers} />;
}