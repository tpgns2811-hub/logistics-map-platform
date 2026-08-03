import { NextRequest, NextResponse } from 'next/server';
import { sql, dbEnabled } from '@/lib/db';
import { isAdminRequest } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

// 검토 대기 중인(기본값) 또는 지정된 상태의 자동 감지 변경 제안 목록 - 운영자 검토 페이지용
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!dbEnabled) return NextResponse.json({ changes: [] });

  const status = req.nextUrl.searchParams.get('status') ?? 'pending';

  try {
    const rows = await sql!`
      SELECT id, center_id, change_type, source, before_data, after_data, changed_fields,
             status, batch_id, detected_at, reviewed_at, reviewer, notes
      FROM pending_changes
      WHERE status = ${status}
      ORDER BY detected_at DESC
      LIMIT 300
    `;
    return NextResponse.json({ changes: rows });
  } catch (err) {
    console.error('[admin/pending-changes GET]', err);
    return NextResponse.json({ changes: [] });
  }
}
