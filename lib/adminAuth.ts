import crypto from 'crypto';
import type { NextRequest } from 'next/server';

// 별도 회원가입/계정 없이 공유 비밀번호 하나로 운영자 인증.
// 쿠키 위조를 막기 위해 비밀번호 자체를 쿠키에 넣지 않고, 비밀번호로 서명한 토큰만 저장.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '';
export const ADMIN_COOKIE = 'logimap_admin';
const SESSION_DAYS = 7;

function sign(payload: string): string {
  return crypto.createHmac('sha256', ADMIN_PASSWORD).update(payload).digest('hex');
}

export function checkPassword(input: string): boolean {
  if (!ADMIN_PASSWORD) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(ADMIN_PASSWORD);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function createSessionToken(): string {
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${expires}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token || !ADMIN_PASSWORD) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  if (sign(payload) !== sig) return false;
  return Date.now() < Number(payload);
}

export function isAdminRequest(req: NextRequest): boolean {
  return verifySessionToken(req.cookies.get(ADMIN_COOKIE)?.value);
}

// 로컬 파이프라인 스크립트가 호출하는 ingest 전용 엔드포인트 인증.
// 브라우저 세션(쿠키)이 없는 기계 간 호출이라 ADMIN_PASSWORD와 별개의 토큰을 씀.
const INGEST_API_TOKEN = process.env.INGEST_API_TOKEN ?? '';

export function isIngestRequest(req: NextRequest): boolean {
  if (!INGEST_API_TOKEN) return false;
  const auth = req.headers.get('authorization') ?? '';
  const [scheme, token] = auth.split(' ');
  if (scheme !== 'Bearer' || !token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(INGEST_API_TOKEN);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
