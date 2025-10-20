BEGIN;

-- Status for report requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'report_request_status'
  ) THEN
    CREATE TYPE report_request_status AS ENUM ('pending','processing','completed','failed');
  END IF;
END$$;

-- Report type catalog
CREATE TABLE IF NOT EXISTS report_type (
  report_type_id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT
);

-- Report request storage
CREATE TABLE IF NOT EXISTS report_request (
  report_request_id BIGSERIAL PRIMARY KEY,
  report_type_id INTEGER NOT NULL REFERENCES report_type(report_type_id) ON DELETE RESTRICT,
  parameters JSONB NOT NULL,
  requested_by_user_id BIGINT REFERENCES users(user_id),
  manager_id BIGINT REFERENCES users(user_id),
  branch_id BIGINT REFERENCES branch(branch_id),
  status report_request_status NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_report_request_branch_status ON report_request(branch_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_request_type ON report_request(report_type_id);
CREATE INDEX IF NOT EXISTS idx_report_request_params ON report_request USING GIN (parameters);

COMMIT;
