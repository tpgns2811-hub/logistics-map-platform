import { NextRequest, NextResponse } from 'next/server';
import { get } from '@vercel/blob';
import { sql, dbEnabled } from '@/lib/db';
import { isIngestRequest } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

// 로컬 워커가 private blob의 PDF 원본을 내려받는 프록시.
// 스토어가 private 접근으로 설정돼 있어 blob_url을 직접 GET할 수 없고,
// 서버(BLOB_READ_WRITE_TOKEN 보유)를 통해서만 읽을 수 있음 - 로컬 워커에는
// 그 토큰을 아예 안 넘기고 ingest 토큰으로만 인증하도록 이 프록시를 둠.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isIngestRequest(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!dbEnabled) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

  try {
    const rows = (await sql!`SELECT blob_url FROM flyer_uploads WHERE id = ${numId}`) as { blob_url: string }[];
    const row = rows[0];
    if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });

    const result = await get(row.blob_url, { access: 'private' });
    if (!result || !result.stream) return NextResponse.json({ error: 'blob not found' }, { status: 404 });

    return new NextResponse(result.stream, {
      headers: { 'Content-Type': result.blob.contentType ?? 'application/pdf' },
    });
  } catch (err) {
    console.error('[ingest/flyer-uploads/[id]/download GET]', err);
    return NextResponse.json({ error: '다운로드 실패' }, { status: 500 });
  }
}
