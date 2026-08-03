import { NextRequest, NextResponse } from 'next/server';
import { dbEnabled } from '@/lib/db';
import { isIngestRequest } from '@/lib/adminAuth';
import { insertPendingChanges, type ChangeSource, type IncomingChange } from '@/lib/pendingChanges';

export const dynamic = 'force-dynamic';

const MAX_BATCH_SIZE = 500;
const VALID_SOURCES: ChangeSource[] = ['permit', 'leasing_flyer'];
const VALID_CHANGE_TYPES = ['create', 'update'];

// 로컬 파이프라인 스크립트가 인허가/임대안내문에서 감지한 변경 제안을 큐에 올리는 전용 엔드포인트.
// 브라우저 세션이 아니라 기계 간 호출이라 Bearer 토큰(INGEST_API_TOKEN)으로 인증.
export async function POST(req: NextRequest) {
  if (!isIngestRequest(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!dbEnabled) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  let body: { source?: string; batch_id?: string; changes?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const { source, batch_id, changes } = body;
  if (!source || !VALID_SOURCES.includes(source as ChangeSource)) {
    return NextResponse.json({ error: `source must be one of ${VALID_SOURCES.join(', ')}` }, { status: 400 });
  }
  if (!Array.isArray(changes) || changes.length === 0) {
    return NextResponse.json({ error: 'changes must be a non-empty array' }, { status: 400 });
  }
  if (changes.length > MAX_BATCH_SIZE) {
    return NextResponse.json({ error: `changes exceeds max batch size of ${MAX_BATCH_SIZE}` }, { status: 400 });
  }

  const valid: IncomingChange[] = [];
  const rejected: string[] = [];
  for (const c of changes as Record<string, unknown>[]) {
    if (!c || typeof c !== 'object' || !c.center_id || !c.change_type || !c.after_data) {
      rejected.push(`invalid row (missing center_id/change_type/after_data): ${JSON.stringify(c).slice(0, 200)}`);
      continue;
    }
    if (!VALID_CHANGE_TYPES.includes(c.change_type as string)) {
      rejected.push(`${c.center_id}: invalid change_type "${c.change_type}"`);
      continue;
    }
    valid.push(c as unknown as IncomingChange);
  }

  try {
    const result = await insertPendingChanges(source as ChangeSource, batch_id ?? null, valid);
    return NextResponse.json({
      inserted: result.inserted,
      skipped: result.skipped,
      errors: [...rejected, ...result.errors],
    });
  } catch (err) {
    console.error('[ingest/pending-changes POST]', err);
    return NextResponse.json({ error: '저장 실패' }, { status: 500 });
  }
}
