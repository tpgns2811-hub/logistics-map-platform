'use client';

import { useState, useMemo } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import KakaoMap from './KakaoMap';
import DetailPanel from './DetailPanel';
import type { LogisticsCenter, CenterStatus, TempType } from '@/types/logistics';

export default function MapLayout({ centers }: { centers: LogisticsCenter[] }) {
  const [search,       setSearch]       = useState('');
  const [tempFilter,   setTempFilter]   = useState<'all' | TempType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | CenterStatus>('all');
  const [selectedId,   setSelectedId]   = useState<string | null>(null);

  const filtered = useMemo(() => centers.filter(c => {
    const matchSearch = search === '' || c.name.includes(search) || c.address.includes(search);
    const matchTemp   = tempFilter === 'all' || c.temp_type === tempFilter;
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchTemp && matchStatus;
  }), [centers, search, tempFilter, statusFilter]);

  const selectedCenter = useMemo(
    () => centers.find(c => c.id === selectedId) ?? null,
    [centers, selectedId],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          centers={filtered}
          total={centers.length}
          search={search}
          onSearch={setSearch}
          tempFilter={tempFilter}
          onTempFilter={setTempFilter}
          statusFilter={statusFilter}
          onStatusFilter={setStatusFilter}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <KakaoMap
            centers={filtered}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          <DetailPanel
            center={selectedCenter}
            onClose={() => setSelectedId(null)}
          />
        </main>
      </div>
    </div>
  );
}