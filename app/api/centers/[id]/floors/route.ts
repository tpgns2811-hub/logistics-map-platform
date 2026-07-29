import { NextRequest, NextResponse } from 'next/server';
import { fetchCenters } from '@/lib/fetchCenters';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    // fetchCenters()는 내부적으로 구글 시트 CSV를 2분 캐시로 재사용하므로
    // 매 상세보기 클릭마다 외부 네트워크 요청이 새로 나가지는 않는다.
    const centers = await fetchCenters(false);
    const center = centers.find(c => c.id === id);
    if (!center) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    return NextResponse.json({ floors: center.floors ?? [] });
  } catch (err) {
    console.error('[API] 층별 데이터 로드 실패:', err);
    return NextResponse.json({ error: '층별 데이터를 불러오지 못했습니다.' }, { status: 500 });
  }
}
