import { NextRequest, NextResponse } from 'next/server';
import { fetchCenters } from '@/lib/fetchCenters';

export const dynamic = 'force-dynamic'; // 라우트 자체는 항상 실행(구글 시트 fetch는 내부적으로 2분 캐시)

export async function GET(req: NextRequest) {
  try {
    const force = req.nextUrl.searchParams.get('force') === '1';
    const centers = await fetchCenters(force);
    // 목록 응답에는 층별 상세(floors)·병합이력(history)을 뺀다 - 필터링은 floorSummary로 충분하고,
    // 층별 상세는 상세 패널을 열 때 /api/centers/[id]/floors 로 그때그때 가져온다.
    // (996건 전체에 5,773행 층별 데이터를 매번 실어보내면 응답이 크게 부풀어 로딩이 느려짐)
    const slim = centers.map(({ history, floors, ...c }) => c);
    return NextResponse.json({
      centers: slim,
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