BEGIN;

-- Speed up agent-wise transaction lookups
CREATE INDEX IF NOT EXISTS idx_tx_by_agent_time ON transaction(performed_by_user_id, transaction_time DESC);

-- Helpful when filtering by account transactions recently
CREATE INDEX IF NOT EXISTS idx_tx_by_account_time ON transaction(savings_account_id, transaction_time DESC);

COMMIT;
