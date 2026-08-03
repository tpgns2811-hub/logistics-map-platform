import { NextRequest, NextResponse } from 'next/server';
import { dbEnabled } from '@/lib/db';
import { isAdminRequest } from '@/lib/adminAuth';
import { approvePendingChange, rejectPendingChange } from '@/lib/pendingChanges';

export const dynamic = 'force-dynamic';

// 검토 대기 항목 승인('approve': center_overrides에 실제 반영) / 거절('reject': 상태만 변경)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!dbEnabled) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

  const { action, reviewer, notes } = await req.json();
  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'invalid action' }, { status: 400 });
  }

  try {
    const result = action === 'approve'
      ? await approvePendingChange(numId, reviewer ?? 'admin')
      : await rejectPendingChange(numId, reviewer ?? 'admin', notes);

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[admin/pending-changes/[id] PUT]', err);
    return NextResponse.json({ error: '처리 실패' }, { status: 500 });
  }
}
