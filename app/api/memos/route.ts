import { NextRequest, NextResponse } from 'next/server';
import { sql, dbEnabled } from '@/lib/db';
import { getOrCreateDeviceId, DEVICE_COOKIE } from '@/lib/deviceId';

export const dynamic = 'force-dynamic';

// 이 기기(브라우저)가 남긴 메모만 조회 - 로그인 없이 기기별로 분리
export async function GET(req: NextRequest) {
  if (!dbEnabled) return NextResponse.json({ memos: [] });
  const centerId = req.nextUrl.searchParams.get('centerId');
  if (!centerId) return NextResponse.json({ error: 'centerId required' }, { status: 400 });

  const { id: deviceId } = getOrCreateDeviceId(req);
  try {
    const rows = await sql!`
      SELECT id, content, created_at, updated_at FROM memos
      WHERE center_id = ${centerId} AND device_id = ${deviceId}
      ORDER BY created_at DESC
    `;
    const res = NextResponse.json({ memos: rows });
    res.cookies.set(DEVICE_COOKIE, deviceId, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 * 2 });
    return res;
  } catch (err) {
    console.error('[memos GET]', err);
    return NextResponse.json({ memos: [] });
  }
}

export async function POST(req: NextRequest) {
  if (!dbEnabled) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });
  const { centerId, content } = await req.json();
  if (!centerId || !content?.trim()) return NextResponse.json({ error: 'centerId, content required' }, { status: 400 });

  const { id: deviceId } = getOrCreateDeviceId(req);
  try {
    const rows = await sql!`
      INSERT INTO memos (center_id, device_id, content)
      VALUES (${centerId}, ${deviceId}, ${content.trim()})
      RETURNING id, content, created_at, updated_at
    `;
    const res = NextResponse.json({ memo: rows[0] });
    res.cookies.set(DEVICE_COOKIE, deviceId, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 * 2 });
    return res;
  } catch (err) {
    console.error('[memos POST]', err);
    return NextResponse.json({ error: '저장 실패' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!dbEnabled) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { id: deviceId } = getOrCreateDeviceId(req);
  try {
    // device_id까지 같이 조건으로 걸어서 남의 메모는 못 지우게 함
    await sql!`DELETE FROM memos WHERE id = ${id} AND device_id = ${deviceId}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[memos DELETE]', err);
    return NextResponse.json({ error: '삭제 실패' }, { status: 500 });
  }
}
