import { randomUUID } from 'crypto';
import type { NextRequest } from 'next/server';

export const DEVICE_COOKIE = 'logimap_device';

// 로그인 없이 "내 메모"를 구분하기 위한 기기별 익명 ID. 쿠키가 없으면 새로 발급.
export function getOrCreateDeviceId(req: NextRequest): { id: string; isNew: boolean } {
  const existing = req.cookies.get(DEVICE_COOKIE)?.value;
  if (existing) return { id: existing, isNew: false };
  return { id: randomUUID(), isNew: true };
}
