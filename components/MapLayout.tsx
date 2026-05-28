'use client';

import { useState, useMemo } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import KakaoMap from './KakaoMap';
import type { LogisticsCenter } from '@/types/logistics';

export default function MapLayout({ centers }: { centers: LogisticsCenter[] }) {
  const [search, setSearch] = useState('');
  const [coldFilter, setColdFilter] = useState<'all' | 'cold' | 'warm'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | '운영중' | '공사중' | '계획중'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return centers.filter((c) => {
      const matchSearch =
        search === '' ||
        c.name.includes(search) ||
        c.address.includes(search);
      const matchCold =
        coldFilter === 'all' ||
        (coldFilter === 'cold' && c.cold_storage) ||
        (coldFilter === 'warm' && !c.cold_storage);
      const matchStatus =
        statusFilter === 'all' || c.status === statusFilter;
      return matchSearch && matchCold && matchStatus;
    });
  }, [centers, search, coldFilter, statusFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          centers={filtered}
          total={centers.length}
          search={search}
          onSearch={setSearch}
          coldFilter={coldFilter}
          onColdFilter={setColdFilter}
          statusFilter={statusFilter}
          onStatusFilter={setStatusFilter}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        <main style={{ flex: 1, position: 'relative' }}>
          <KakaoMap
            centers={filtered}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </main>
      </div>
    </div>
  );
}