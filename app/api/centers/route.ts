import { NextResponse } from 'next/server';
import { fetchCenters } from '@/lib/fetchCenters';

export const dynamic = 'force-dynamic'; // 캐시 없이 항상 최신 데이터

export async function GET() {
  try {
    const centers = await fetchCenters();
    return NextResponse.json({
      centers,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[API] 데이터 로드 실패:', err);
    return NextResponse.json(
      { error: '데이터를 불러오지 못했습니다.' },
      { status: 500 },
    );
  }
}