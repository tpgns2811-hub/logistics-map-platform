import { NextRequest, NextResponse } from 'next/server';
import { sql, dbEnabled } from '@/lib/db';
import { isIngestRequest } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

const VALID_STATUSES = ['uploaded', 'processing', 'processed', 'failed'];

// 로컬 워커가 처리 진행 상태를 갱신(uploaded -> processing -> processed|failed)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isIngestRequest(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!dbEnabled) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

  const { status, error_message } = await req.json();
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: `status must be one of ${VALID_STATUSES.join(', ')}` }, { status: 400 });
  }

  try {
    const processedAt = ['processed', 'failed'].includes(status) ? new Date().toISOString() : null;
    await sql!`
      UPDATE flyer_uploads
      SET status = ${status}, error_message = ${error_message ?? null}, processed_at = COALESCE(${processedAt}, processed_at)
      WHERE id = ${numId}
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[ingest/flyer-uploads/[id] PUT]', err);
    return NextResponse.json({ error: '갱신 실패' }, { status: 500 });
  }
}
