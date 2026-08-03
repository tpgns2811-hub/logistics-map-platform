-- LogiMap 운영자/메모 기능용 스키마 (Neon Postgres)
-- Neon SQL Editor 또는 psql로 한 번만 실행

-- 사용자 메모: 구글 로그인 계정(email)별로 구분 (device_id 컬럼명은 유지, 값은 이메일 저장)
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

-- 인허가/임대안내문 파이프라인이 자동 감지한 변경사항을 운영자 승인 전 보관하는 큐.
-- update: after_data는 바뀐 필드만 담은 patch(center_overrides.data와 같은 의미), before_data는 그 필드들의 기존값.
-- create: after_data에 신규 레코드 전체, before_data는 null.
-- content_hash 기준 유니크 제약으로 동일 제안 반복 수집을 막음(승인/거절 여부와 무관하게 영구적으로).
CREATE TABLE IF NOT EXISTS pending_changes (
  id SERIAL PRIMARY KEY,
  center_id TEXT NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('create', 'update')),
  source TEXT NOT NULL CHECK (source IN ('permit', 'leasing_flyer')),
  before_data JSONB,
  after_data JSONB NOT NULL,
  changed_fields TEXT[],
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  batch_id TEXT,
  content_hash TEXT NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewer TEXT,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS pending_changes_status_idx ON pending_changes(status);
CREATE INDEX IF NOT EXISTS pending_changes_center_id_idx ON pending_changes(center_id);
CREATE UNIQUE INDEX IF NOT EXISTS pending_changes_dedup_idx
  ON pending_changes(center_id, change_type, content_hash);

-- 운영자 페이지에서 업로드한 임대안내문 PDF 원본(Vercel Blob) 추적 및 로컬 처리 워커와의 상태 핸드오프.
CREATE TABLE IF NOT EXISTS flyer_uploads (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  vendor_label TEXT,
  blob_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'processed', 'failed')),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  error_message TEXT
);
CREATE INDEX IF NOT EXISTS flyer_uploads_status_idx ON flyer_uploads(status);
