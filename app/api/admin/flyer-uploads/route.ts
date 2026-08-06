import { NextRequest, NextResponse } from 'next/server';
import { sql, dbEnabled } from '@/lib/db';
import { isAdminRequest } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

// 운영자가 올린 임대안내문 PDF 목록(처리 상태 포함) - 검토 탭 근처 업로드 섹션용.
// 실제 업로드는 이 라우트가 아니라 /api/admin/flyer-uploads/upload-handler(클라이언트
// 업로드 방식)가 처리함 - 서버를 거쳐 파일 바이트를 전달하면 Vercel 서버리스 함수의
// 요청 본문 크기 제한(~4.5MB)에 걸려서 실제 임대안내문 PDF가 항상 실패했음.
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!dbEnabled) return NextResponse.json({ uploads: [] });

  try {
    const rows = await sql!`
      SELECT id, filename, vendor_label, status, uploaded_at, processed_at, error_message
      FROM flyer_uploads ORDER BY uploaded_at DESC LIMIT 100
    `;
    return NextResponse.json({ uploads: rows });
  } catch (err) {
    console.error('[admin/flyer-uploads GET]', err);
    return NextResponse.json({ uploads: [] });
  }
}
