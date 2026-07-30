import { NextRequest, NextResponse } from 'next/server';
import { sql, dbEnabled } from '@/lib/db';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

// 이 구글 계정으로 남긴 메모만 조회 - 로그인 필수
export async function GET(req: NextRequest) {
  if (!dbEnabled) return NextResponse.json({ memos: [] });
  const centerId = req.nextUrl.searchParams.get('centerId');
  if (!centerId) return NextResponse.json({ error: 'centerId required' }, { status: 400 });

  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: 'login required' }, { status: 401 });

  try {
    const rows = await sql!`
      SELECT id, content, created_at, updated_at FROM memos
      WHERE center_id = ${centerId} AND device_id = ${email}
      ORDER BY created_at DESC
    `;
    return NextResponse.json({ memos: rows });
  } catch (err) {
    console.error('[memos GET]', err);
    return NextResponse.json({ memos: [] });
  }
}

export async function POST(req: NextRequest) {
  if (!dbEnabled) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });
  const { centerId, content } = await req.json();
  if (!centerId || !content?.trim()) return NextResponse.json({ error: 'centerId, content required' }, { status: 400 });

  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: 'login required' }, { status: 401 });

  try {
    const rows = await sql!`
      INSERT INTO memos (center_id, device_id, content)
      VALUES (${centerId}, ${email}, ${content.trim()})
      RETURNING id, content, created_at, updated_at
    `;
    return NextResponse.json({ memo: rows[0] });
  } catch (err) {
    console.error('[memos POST]', err);
    return NextResponse.json({ error: '저장 실패' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!dbEnabled) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: 'login required' }, { status: 401 });

  try {
    // 이메일까지 같이 조건으로 걸어서 남의 메모는 못 지우게 함
    await sql!`DELETE FROM memos WHERE id = ${id} AND device_id = ${email}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[memos DELETE]', err);
    return NextResponse.json({ error: '삭제 실패' }, { status: 500 });
  }
}
