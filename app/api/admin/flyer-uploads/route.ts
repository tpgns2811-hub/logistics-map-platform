import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { sql, dbEnabled } from '@/lib/db';
import { isAdminRequest } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

// 운영자가 올린 임대안내문 PDF 목록(처리 상태 포함) - 검토 탭 근처 업로드 섹션용
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

// PDF 업로드 - Vercel Blob에 저장하고 처리 대기 큐(flyer_uploads)에 등록.
// 실제 표/가격 추출은 이 세션에서 만든 로컬 Python 워커가 담당(무거운 PDF 파싱은 서버리스에서 안 함).
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!dbEnabled) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  const form = await req.formData();
  const file = form.get('file');
  const vendorLabel = (form.get('vendor_label') as string) ?? '';

  if (!(file instanceof File) || file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'PDF 파일을 선택하세요' }, { status: 400 });
  }

  try {
    const blob = await put(`flyer-uploads/${Date.now()}-${file.name}`, file, { access: 'public' });
    const rows = await sql!`
      INSERT INTO flyer_uploads (filename, vendor_label, blob_url, status)
      VALUES (${file.name}, ${vendorLabel}, ${blob.url}, 'uploaded')
      RETURNING id
    `;
    return NextResponse.json({ ok: true, id: rows[0].id });
  } catch (err) {
    console.error('[admin/flyer-uploads POST]', err);
    return NextResponse.json({ error: '업로드 실패' }, { status: 500 });
  }
}
