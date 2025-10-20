-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE status_enum AS ENUM (
  'active',
  'inactive'
);

CREATE TYPE user_type AS ENUM (
  'admin',
  'agent',
  'manager'
);

CREATE TYPE gender_type AS ENUM (
  'male',
  'female',
  'other'
);

CREATE TYPE ownership_type AS ENUM (
  'primary',
  'joint'
);

CREATE TYPE transaction_type_enum AS ENUM (
  'deposit',
  'withdrawal',
  'interest'
);

CREATE TYPE report_type_enum AS ENUM (
  'customer_summary',
  'transaction_history',
  'fixed_deposit_summary',
  'audit'
);

CREATE TYPE report_status AS ENUM (
  'completed',
  'failed',
  'archived'
);

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE branch (
  branch_id BIGSERIAL PRIMARY KEY,
  branch_name text UNIQUE NOT NULL,
  address text,
  phone_number text,
  status status_enum NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE users (
  user_id BIGSERIAL PRIMARY KEY,
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  role user_type NOT NULL,
  status status_enum NOT NULL DEFAULT 'active',
  email text,
  created_by_user_id BIGINT REFERENCES users(user_id),
  branch_id BIGINT REFERENCES branch(branch_id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE login_log (
  login_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(user_id),
  username_used text NOT NULL,
  success boolean NOT NULL,
  ip_address text,
  user_agent text,
  logged_in_at timestamptz DEFAULT now()
);

CREATE TABLE customer (
  customer_id BIGSERIAL PRIMARY KEY,
  first_name text,
  last_name text,
  nic_number text UNIQUE,
  gender gender_type,
  address text,
  phone_number text,
  email text,
  date_of_birth date,
  status status_enum DEFAULT 'active',
  created_by_user_id BIGINT REFERENCES users(user_id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE savings_account_plan (
  savings_account_plan_id BIGSERIAL PRIMARY KEY,
  name text UNIQUE NOT NULL,
  min_balance_required NUMERIC(30,10) DEFAULT 0,
  minimum_age_required integer,
  interest_rate NUMERIC(12,6),
  description text,
  status status_enum DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE savings_account (
  savings_account_id BIGSERIAL PRIMARY KEY,
  savings_account_plan_id BIGINT REFERENCES savings_account_plan(savings_account_plan_id),
  balance NUMERIC(30,10) DEFAULT 0,
  branch_id BIGINT REFERENCES branch(branch_id),
  status status_enum DEFAULT 'active',
  created_by_user_id BIGINT REFERENCES users(user_id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE fixed_deposit_account_plan (
  fixed_deposit_account_plan_id BIGSERIAL PRIMARY KEY,
  name text UNIQUE NOT NULL,
  duration NUMERIC NOT NULL,
  interest_rate NUMERIC(12,6),
  minimum_amount_required NUMERIC(30,10),
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE fixed_deposit_account (
  fixed_deposit_account_id BIGSERIAL PRIMARY KEY,
  savings_account_id BIGINT REFERENCES savings_account(savings_account_id),
  fixed_deposit_account_plan_id BIGINT REFERENCES fixed_deposit_account_plan(fixed_deposit_account_plan_id),
  amount NUMERIC(30,10) NOT NULL,
  start_date date,
  next_interest_date date,
  closing_date date,
  status status_enum DEFAULT 'active',
  created_by_user_id BIGINT REFERENCES users(user_id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE customer_account (
  customer_account_id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT REFERENCES customer(customer_id) NOT NULL,
  savings_account_id BIGINT REFERENCES savings_account(savings_account_id) NOT NULL,
  ownership ownership_type,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE transaction (
  transaction_id BIGSERIAL PRIMARY KEY,
  savings_account_id BIGINT REFERENCES savings_account(savings_account_id),
  fixed_deposit_account_id BIGINT REFERENCES fixed_deposit_account(fixed_deposit_account_id),
  transaction_type transaction_type_enum NOT NULL,
  amount NUMERIC(30,10) NOT NULL,
  description varchar(25),
  transaction_time timestamptz DEFAULT now(),
  performed_by_user_id BIGINT REFERENCES users(user_id),
  status status_enum DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT transaction_account_check CHECK (
    (savings_account_id IS NOT NULL)::int +
    (fixed_deposit_account_id IS NOT NULL)::int = 1
  )
);

CREATE TABLE report (
  report_id BIGSERIAL PRIMARY KEY,
  report_type report_type_enum,
  requested_by_user_id BIGINT REFERENCES users(user_id),
  generated_by_user_id BIGINT REFERENCES users(user_id),
  generated_time timestamptz DEFAULT now(),
  date_range daterange,
  description text,
  file_path text,
  status report_status,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE audit_log (
  audit_log_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(user_id),
  table_name text,
  operation text,
  row_before jsonb,
  row_after jsonb,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Updated_at trigger
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach updated_at triggers
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT IN ('login_log','audit_log')
  LOOP
    EXECUTE format(
      'CREATE TRIGGER %I_set_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at()',
      t, t
    );
  END LOOP;
END$$;

-- Audit trigger
CREATE OR REPLACE FUNCTION audit_trigger_fn()
RETURNS trigger AS $$
DECLARE
  current_user_id BIGINT;
BEGIN
  BEGIN
    current_user_id := current_setting('app.current_user_id')::BIGINT;
  EXCEPTION WHEN others THEN
    current_user_id := NULL;
  END;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log(user_id, table_name, operation, row_after)
    VALUES (current_user_id, TG_TABLE_NAME, TG_OP, row_to_json(NEW)::jsonb);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log(user_id, table_name, operation, row_before, row_after)
    VALUES (current_user_id, TG_TABLE_NAME, TG_OP, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log(user_id, table_name, operation, row_before)
    VALUES (current_user_id, TG_TABLE_NAME, TG_OP, row_to_json(OLD)::jsonb);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Attach audit triggers
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT IN ('login_log','audit_log')
  LOOP
    EXECUTE format(
      'CREATE TRIGGER %I_audit
       AFTER INSERT OR UPDATE OR DELETE ON %I
       FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn()',
      t, t
    );
  END LOOP;
END$$;

-- admin user
INSERT INTO users (username, password_hash, first_name, last_name, role, status)
VALUES ('admin', '<adminhash>', 'AdminUserPerson', 'Btrustable', 'admin', 'active');

-- agent user
INSERT INTO users (username, password_hash, first_name, last_name, role, status)
VALUES ('agent', '<agenthash>', 'AgentUserPerson', 'Btrustable', 'agent', 'active');

-- manager user
INSERT INTO users (username, password_hash, first_name, last_name, role, status)
VALUES ('manager', '<managerhash>', 'ManagerUserPerson', 'Btrustable', 'manager', 'active');

