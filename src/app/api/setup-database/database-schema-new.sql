-- 1. Branches
CREATE TABLE branch (
    branch_id SERIAL PRIMARY KEY,
    branch_code VARCHAR(10) UNIQUE NOT NULL,
    branch_name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    phone_number VARCHAR(15) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Administrators (System Admins)
CREATE TABLE administrator (
    admin_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(15) NOT NULL,
    role VARCHAR(20) DEFAULT 'admin',
    status VARCHAR(20) DEFAULT 'active',
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Employers (Agents & Managers)
CREATE TABLE employer (
    employer_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('agent', 'manager')),
    phone_number VARCHAR(15) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    branch_id INTEGER NOT NULL REFERENCES branch(branch_id),
    created_by_admin_id INTEGER NOT NULL REFERENCES administrator(admin_id),
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Account Plans (Savings Account Types)
CREATE TABLE account_plan (
    plan_id SERIAL PRIMARY KEY,
    plan_name VARCHAR(50) UNIQUE NOT NULL,
    min_balance DECIMAL(15, 2) NOT NULL,
    interest_rate DECIMAL(5, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    description TEXT,
    last_update_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Customers
CREATE TABLE customer (
    customer_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    nic_number VARCHAR(20) UNIQUE NOT NULL,
    date_of_birth DATE NOT NULL,
    phone_number VARCHAR(15),
    address TEXT NOT NULL,
    email VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    created_by_agent_id INTEGER NOT NULL REFERENCES employer(employer_id),
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Savings Accounts
CREATE TABLE savings_account (
    account_id SERIAL PRIMARY KEY,
    account_number VARCHAR(20) UNIQUE NOT NULL,
    current_balance DECIMAL(15, 2) DEFAULT 0.00,
    account_plan_id INTEGER NOT NULL REFERENCES account_plan(plan_id),
    branch_id INTEGER NOT NULL REFERENCES branch(branch_id),
    status VARCHAR(20) DEFAULT 'active',
    created_by_agent_id INTEGER NOT NULL REFERENCES employer(employer_id),
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Customer Account Link (for Joint Accounts)
CREATE TABLE customer_account (
    customer_account_id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customer(customer_id),
    account_id INTEGER NOT NULL REFERENCES savings_account(account_id),
    ownership_type VARCHAR(20) DEFAULT 'primary',
    added_date DATE DEFAULT CURRENT_DATE
);

-- 8. Fixed Deposit Plans
CREATE TABLE fixed_deposit_plan (
    fd_plan_id SERIAL PRIMARY KEY,
    plan_name VARCHAR(50) UNIQUE NOT NULL,
    duration VARCHAR(20) NOT NULL CHECK (duration IN ('6_months', '1_year', '3_years')),
    interest_rate DECIMAL(5, 2) NOT NULL,
    minimum_amount DECIMAL(15, 2) NOT NULL,
    description TEXT
);

-- 9. Fixed Deposits
CREATE TABLE fixed_deposit (
    fd_id SERIAL PRIMARY KEY,
    savings_account_id INTEGER NOT NULL REFERENCES savings_account(account_id),
    fd_plan_id INTEGER NOT NULL REFERENCES fixed_deposit_plan(fd_plan_id),
    amount DECIMAL(15, 2) NOT NULL,
    start_date DATE NOT NULL,
    next_interest_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_by_agent_id INTEGER NOT NULL REFERENCES employer(employer_id),
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Transactions (renamed from transaction to avoid reserved keyword issues)
CREATE TABLE transactions (
    transaction_id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES savings_account(account_id),
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'interest')),
    amount DECIMAL(15, 2) NOT NULL,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    performed_by_agent_id INTEGER NOT NULL REFERENCES employer(employer_id),
    status VARCHAR(20) DEFAULT 'completed',
    reference_number VARCHAR(100)
);

-- 11. Login Details
CREATE TABLE login_details (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user', -- can be admin/employer/customer
    last_updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Login History
CREATE TABLE login (
    login_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES login_details(user_id),
    last_login_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. Reports
CREATE TABLE report (
    report_id SERIAL PRIMARY KEY,
    report_type VARCHAR(50) NOT NULL,
    requested_by_employer_id INTEGER NOT NULL REFERENCES employer(employer_id),
    generated_date DATE DEFAULT CURRENT_DATE,
    date_range VARCHAR(100),
    description TEXT,
    file_path VARCHAR(500),
    status VARCHAR(20) DEFAULT 'completed'
);

-- 14. Logs/Audit Table
CREATE TABLE audit_log (
    audit_id SERIAL PRIMARY KEY,
    employer_id INTEGER REFERENCES employer(employer_id),
    admin_id INTEGER REFERENCES administrator(admin_id),
    table_name VARCHAR(100) NOT NULL,
    record_id INTEGER,
    operation VARCHAR(200) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_customer_nic ON customer(nic_number);
CREATE INDEX idx_savings_account_number ON savings_account(account_number);
CREATE INDEX idx_transaction_account_id ON transactions(account_id);
