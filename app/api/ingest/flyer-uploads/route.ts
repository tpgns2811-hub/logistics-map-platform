import { NextRequest, NextResponse } from 'next/server';
import { sql, dbEnabled } from '@/lib/db';
import { isIngestRequest } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

// 로컬 워커가 처리할 새 업로드를 폴링하는 전용 엔드포인트(기본: status=uploaded)
export async function GET(req: NextRequest) {
  if (!isIngestRequest(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!dbEnabled) return NextResponse.json({ uploads: [] });

  const status = req.nextUrl.searchParams.get('status') ?? 'uploaded';
  try {
    const rows = await sql!`
      SELECT id, filename, vendor_label, blob_url, status, uploaded_at
      FROM flyer_uploads WHERE status = ${status} ORDER BY uploaded_at ASC LIMIT 50
    `;
    return NextResponse.json({ uploads: rows });
  } catch (err) {
    console.error('[ingest/flyer-uploads GET]', err);
    return NextResponse.json({ uploads: [] });
  }
}
