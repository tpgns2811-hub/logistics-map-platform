import { NextRequest, NextResponse } from 'next/server';
import { fetchCenters } from '@/lib/fetchCenters';

export const dynamic = 'force-dynamic'; // 라우트 자체는 항상 실행(구글 시트 fetch는 내부적으로 2분 캐시)

export async function GET(req: NextRequest) {
  try {
    const force = req.nextUrl.searchParams.get('force') === '1';
    const centers = await fetchCenters(force);
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