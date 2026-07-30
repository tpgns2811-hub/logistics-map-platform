import { NextRequest, NextResponse } from 'next/server';
import { sql, dbEnabled } from '@/lib/db';
import { isAdminRequest } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

// 운영자 전용: 전체 메모 조회(기기 구분 없이 다 보임)
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!dbEnabled) return NextResponse.json({ memos: [] });

  try {
    const rows = await sql!`
      SELECT id, center_id, device_id, content, created_at, updated_at
      FROM memos ORDER BY created_at DESC LIMIT 500
    `;
    return NextResponse.json({ memos: rows });
  } catch (err) {
    console.error('[admin/memos GET]', err);
    return NextResponse.json({ memos: [] });
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!dbEnabled) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  try {
    await sql!`DELETE FROM memos WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[admin/memos DELETE]', err);
    return NextResponse.json({ error: '삭제 실패' }, { status: 500 });
  }
}
