import { NextRequest, NextResponse } from 'next/server';
import { sql, dbEnabled } from '@/lib/db';
import { isAdminRequest } from '@/lib/adminAuth';
import { fetchCenters } from '@/lib/fetchCenters';

export const dynamic = 'force-dynamic';

// 건물 하나를 수정('update')/추가('create')/숨김('delete') 오버레이로 저장.
// 'update'/'create'는 data(부분 또는 전체 필드)를 JSONB로 저장해뒀다가
// fetchCenters()가 Google Sheet 원본 위에 덮어씀. 'delete'는 목록에서 숨기기만 함(원본 삭제 아님).
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!dbEnabled) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  const { id } = await params;
  const { action, data } = await req.json();
  if (!['update', 'delete', 'create'].includes(action)) {
    return NextResponse.json({ error: 'invalid action' }, { status: 400 });
  }

  if (action === 'create') {
    // applyOverrides()는 이미 시트에 있는 id로 create 오버레이가 들어오면 조용히 무시하므로,
    // 저장 시점에 미리 막아서 그 상태를 명확히 알림
    const centers = await fetchCenters();
    if (centers.some(c => c.id === id)) {
      return NextResponse.json({ error: '이미 존재하는 건물 ID입니다' }, { status: 409 });
    }
  }

  try {
    await sql!`
      INSERT INTO center_overrides (center_id, action, data, updated_at)
      VALUES (${id}, ${action}, ${data ? JSON.stringify(data) : null}, now())
      ON CONFLICT (center_id) DO UPDATE SET action = ${action}, data = ${data ? JSON.stringify(data) : null}, updated_at = now()
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[admin/centers PUT]', err);
    return NextResponse.json({ error: '저장 실패' }, { status: 500 });
  }
}

// 오버레이 제거 - Sheet 원본 상태로 되돌림('create'로 만든 건물이면 완전히 사라짐)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!dbEnabled) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  const { id } = await params;
  try {
    await sql!`DELETE FROM center_overrides WHERE center_id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[admin/centers/[id] DELETE]', err);
    return NextResponse.json({ error: '삭제 실패' }, { status: 500 });
  }
}
