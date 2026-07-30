import { neon } from '@neondatabase/serverless';

// DATABASE_URL(Neon 연결 문자열)이 없으면 메모/운영자 기능은 비활성화된 채로 동작
// (지도 조회 자체는 DB 없이도 항상 정상 동작해야 함)
const DATABASE_URL = process.env.DATABASE_URL ?? '';

export const dbEnabled = !!DATABASE_URL;

export const sql = dbEnabled ? neon(DATABASE_URL) : null;

export function requireDb() {
  if (!sql) throw new Error('DATABASE_URL이 설정되지 않았습니다');
  return sql;
}
