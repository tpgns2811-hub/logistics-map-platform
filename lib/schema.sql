-- LogiMap 운영자/메모 기능용 스키마 (Neon Postgres)
-- Neon SQL Editor 또는 psql로 한 번만 실행

-- 사용자 메모: 로그인 없이 기기별(쿠키 device_id)로 구분
CREATE TABLE IF NOT EXISTS memos (
  id SERIAL PRIMARY KEY,
  center_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS memos_center_id_idx ON memos(center_id);
CREATE INDEX IF NOT EXISTS memos_device_id_idx ON memos(device_id);

-- 운영자가 Google Sheet 원본 데이터 위에 덮어쓰는 오버레이
-- action='update': data(JSONB)에 있는 필드만 원본 위에 덮어씀
-- action='delete': 그 center_id를 목록에서 숨김
-- action='create': Sheet에 없는 신규 건물, data에 전체 필드 저장
CREATE TABLE IF NOT EXISTS center_overrides (
  center_id TEXT PRIMARY KEY,
  action TEXT NOT NULL CHECK (action IN ('update', 'delete', 'create')),
  data JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
