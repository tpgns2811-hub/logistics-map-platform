import { NextRequest, NextResponse } from 'next/server';
import { checkPassword, createSessionToken, ADMIN_COOKIE } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (!checkPassword(password ?? '')) {
    return NextResponse.json({ error: '비밀번호가 올바르지 않습니다' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, createSessionToken(), {
    httpOnly: true, sameSite: 'lax', secure: true, maxAge: 60 * 60 * 24 * 7, path: '/',
  });
  return res;
}
