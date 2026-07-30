import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL not set'); process.exit(1); }

const sql = neon(url);
const schema = readFileSync(join(__dirname, '..', 'lib', 'schema.sql'), 'utf-8');

// 줄 단위로 -- 주석 제거 후 세미콜론 기준으로 문 단위 분리 실행
// (neon serverless HTTP 드라이버는 다중 statement를 한 번에 실행 못 함)
const noComments = schema
  .split('\n')
  .filter(line => !line.trim().startsWith('--'))
  .join('\n');
const statements = noComments
  .split(';')
  .map(s => s.trim())
  .filter(Boolean);

for (const stmt of statements) {
  console.log('실행:', stmt.slice(0, 60).replace(/\n/g, ' ') + '...');
  await sql.query(stmt);
}
console.log('완료. 테이블 목록:');
const tables = await sql.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
console.log(tables);
