BEGIN;

INSERT INTO report_type (key, name, description) VALUES
  ('agent_transactions', 'Agent-wise Transactions', 'Total number and value of transactions for an agent in a date range'),
  ('account_summary', 'Account Transaction Summary', 'Summary of transactions and current balance for an account'),
  ('active_fds', 'Active Fixed Deposits', 'Active FDs and next interest payout dates'),
  ('monthly_interest_summary', 'Monthly Interest Distribution', 'Monthly interest distribution summary by account type'),
  ('customer_activity', 'Customer Activity', 'Customer deposits, withdrawals, and net balance over a period')
ON CONFLICT (key) DO NOTHING;

COMMIT;
