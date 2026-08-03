import crypto from 'crypto';
import { requireDb } from '@/lib/db';
import { fetchCenters } from '@/lib/fetchCenters';

export type ChangeType = 'create' | 'update';
export type ChangeSource = 'permit' | 'leasing_flyer';

export interface IncomingChange {
  center_id: string;
  change_type: ChangeType;
  before_data?: Record<string, unknown> | null;
  after_data: Record<string, unknown>;
  changed_fields?: string[];
}

// 키를 정렬한 뒤 문자열화 - JS 객체 키 순서에 의존하지 않는 안정적인 해시 입력값을 만들기 위함
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return `{${keys.map(k => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`).join(',')}}`;
}

export function computeContentHash(data: Record<string, unknown>): string {
  return crypto.createHash('sha256').update(stableStringify(data)).digest('hex');
}

export async function insertPendingChanges(
  source: ChangeSource,
  batchId: string | null,
  changes: IncomingChange[]
): Promise<{ inserted: number; skipped: number; errors: string[] }> {
  const db = requireDb();
  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const c of changes) {
    try {
      const contentHash = computeContentHash(c.after_data);
      const changedFields = c.changed_fields ?? Object.keys(c.after_data);
      const rows = await db`
        INSERT INTO pending_changes (center_id, change_type, source, before_data, after_data, changed_fields, batch_id, content_hash)
        VALUES (${c.center_id}, ${c.change_type}, ${source}, ${c.before_data ? JSON.stringify(c.before_data) : null}::jsonb,
                ${JSON.stringify(c.after_data)}::jsonb, ${changedFields}, ${batchId}, ${contentHash})
        ON CONFLICT (center_id, change_type, content_hash) DO NOTHING
        RETURNING id
      `;
      if (rows.length > 0) inserted++;
      else skipped++;
    } catch (err) {
      errors.push(`${c.center_id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { inserted, skipped, errors };
}

interface PendingChangeRow {
  id: number;
  center_id: string;
  change_type: ChangeType;
  after_data: Record<string, unknown>;
  status: string;
}

export async function approvePendingChange(
  id: number,
  reviewer: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const db = requireDb();

  const rows = (await db`SELECT id, center_id, change_type, after_data, status FROM pending_changes WHERE id = ${id}`) as PendingChangeRow[];
  const row = rows[0];
  if (!row) return { ok: false, status: 404, error: '해당 항목을 찾을 수 없습니다' };
  if (row.status !== 'pending') return { ok: false, status: 409, error: `이미 처리됨(${row.status})` };

  if (row.change_type === 'create') {
    // applyOverrides()는 이미 존재하는 id로 create 오버레이가 들어오면 조용히 무시하므로,
    // 승인 시점에 명시적으로 막아서 그 경우를 드러냄
    const centers = await fetchCenters();
    if (centers.some(c => c.id === row.center_id)) {
      return { ok: false, status: 409, error: '이미 존재하는 건물 ID입니다 — 승인 불가, 거절하거나 다시 제안해주세요' };
    }
  } else {
    const existing = (await db`SELECT action FROM center_overrides WHERE center_id = ${row.center_id}`) as { action: string }[];
    if (existing[0]?.action === 'delete') {
      return { ok: false, status: 409, error: '이 건물은 숨김 처리되어 있습니다 — 먼저 복원 후 다시 검토해주세요' };
    }
  }

  const overrideAction = row.change_type === 'create' ? 'create' : 'update';
  const afterDataJson = JSON.stringify(row.after_data);
  await db`
    INSERT INTO center_overrides (center_id, action, data, updated_at)
    VALUES (${row.center_id}, ${overrideAction}, ${afterDataJson}::jsonb, now())
    ON CONFLICT (center_id) DO UPDATE
      SET action = ${overrideAction},
          data = COALESCE(center_overrides.data, '{}'::jsonb) || ${afterDataJson}::jsonb,
          updated_at = now()
  `;

  await db`UPDATE pending_changes SET status = 'approved', reviewed_at = now(), reviewer = ${reviewer} WHERE id = ${id}`;
  return { ok: true };
}

export async function rejectPendingChange(
  id: number,
  reviewer: string,
  notes?: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const db = requireDb();
  const rows = (await db`
    UPDATE pending_changes SET status = 'rejected', reviewed_at = now(), reviewer = ${reviewer}, notes = ${notes ?? null}
    WHERE id = ${id} AND status = 'pending'
    RETURNING id
  `) as { id: number }[];
  if (rows.length === 0) return { ok: false, status: 409, error: '이미 처리되었거나 존재하지 않는 항목입니다' };
  return { ok: true };
}
