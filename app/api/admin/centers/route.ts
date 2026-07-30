import { NextRequest, NextResponse } from 'next/server';
import { sql, dbEnabled } from '@/lib/db';
import { isAdminRequest } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

// 현재 적용 중인 오버레이(수정/추가/숨김) 목록 - 운영자 대시보드용
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!dbEnabled) return NextResponse.json({ overrides: [] });

  try {
    const rows = await sql!`SELECT center_id, action, data, updated_at FROM center_overrides ORDER BY updated_at DESC`;
    return NextResponse.json({ overrides: rows });
  } catch (err) {
    console.error('[admin/centers GET]', err);
    return NextResponse.json({ overrides: [] });
  }
}
