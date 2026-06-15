-- =============================================================================
-- FreeLedger Database Schema (PostgreSQL)
-- Privacy-focused: NO wallet addresses stored in database
-- =============================================================================

-- Create database first: CREATE DATABASE freeledger;

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE user_role AS ENUM ('client', 'freelancer', 'admin');

CREATE TYPE contract_status AS ENUM (
    'draft', 
    'pending', 
    'signed', 
    'active', 
    'completed', 
    'disputed',
    'cancelled'
);

CREATE TYPE milestone_status AS ENUM (
    'pending', 
    'funded',
    'submitted', 
    'approved', 
    'rejected',
    'paid'
);

CREATE TYPE dispute_status AS ENUM (
    'pending_review', 
    'under_review', 
    'resolved'
);

CREATE TYPE dispute_decision AS ENUM (
    'freelancer_wins', 
    'client_wins'
);

-- =============================================================================
-- USERS TABLE (Pseudonymous - NO wallet address!)
-- =============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pseudonymous_id VARCHAR(50) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255),
    display_name VARCHAR(100),
    role user_role NOT NULL DEFAULT 'freelancer',
    bio TEXT,
    skills TEXT, -- JSON array of skills
    hourly_rate DECIMAL(10, 4),
    profile_image VARCHAR(500),
    location VARCHAR(255),
    website VARCHAR(500),
    github VARCHAR(255),
    linkedin VARCHAR(255),
    rating DECIMAL(3, 2) DEFAULT 0.00,
    total_jobs_completed INT DEFAULT 0,
    total_earned DECIMAL(20, 8) DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_pseudonym ON users(pseudonymous_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_username ON users(username);

-- =============================================================================
-- JOBS TABLE
-- =============================================================================

CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pseudonymous_id VARCHAR(50) UNIQUE NOT NULL,
    client_pseudonym VARCHAR(50) REFERENCES users(pseudonymous_id),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    skills_required TEXT, -- JSON array
    budget_min DECIMAL(20, 8),
    budget_max DECIMAL(20, 8),
    budget_type VARCHAR(20) DEFAULT 'fixed',
    duration VARCHAR(100),
    experience_level VARCHAR(20) DEFAULT 'intermediate',
    status VARCHAR(20) DEFAULT 'open',
    assigned_freelancer VARCHAR(50),
    contract_id UUID,
    visibility VARCHAR(20) DEFAULT 'public',
    proposals_count INT DEFAULT 0,
    views_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deadline TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_jobs_client ON jobs(client_pseudonym);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_category ON jobs(category);

-- =============================================================================
-- PROPOSALS TABLE
-- =============================================================================

CREATE TABLE proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pseudonymous_id VARCHAR(50) UNIQUE NOT NULL,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    freelancer_pseudonym VARCHAR(50) REFERENCES users(pseudonymous_id),
    cover_letter TEXT,
    bid_amount DECIMAL(20, 8) NOT NULL,
    estimated_duration VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_proposals_job ON proposals(job_id);
CREATE INDEX idx_proposals_freelancer ON proposals(freelancer_pseudonym);

-- =============================================================================
-- CONTRACTS TABLE
-- =============================================================================

CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pseudonymous_id VARCHAR(50) UNIQUE NOT NULL,
    terms_cid VARCHAR(60) NOT NULL,
    client_pseudonym VARCHAR(50) REFERENCES users(pseudonymous_id),
    freelancer_pseudonym VARCHAR(50) REFERENCES users(pseudonymous_id),
    job_id UUID REFERENCES jobs(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    total_value DECIMAL(20, 8) NOT NULL,
    status contract_status DEFAULT 'draft',
    on_chain_id VARCHAR(100),
    tx_hash VARCHAR(66),
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    signed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_contracts_pseudonym ON contracts(pseudonymous_id);
CREATE INDEX idx_contracts_client ON contracts(client_pseudonym);
CREATE INDEX idx_contracts_freelancer ON contracts(freelancer_pseudonym);
CREATE INDEX idx_contracts_status ON contracts(status);

-- =============================================================================
-- MILESTONES TABLE
-- =============================================================================

CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    milestone_index INTEGER NOT NULL,
    description VARCHAR(255) NOT NULL,
    deliverable_cid VARCHAR(60),
    amount DECIMAL(20, 8) NOT NULL,
    deadline TIMESTAMP WITH TIME ZONE,
    status milestone_status DEFAULT 'pending',
    submission_time TIMESTAMP WITH TIME ZONE,
    approved_time TIMESTAMP WITH TIME ZONE,
    paid_time TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(contract_id, milestone_index)
);

CREATE INDEX idx_milestones_contract ON milestones(contract_id);

-- =============================================================================
-- DISPUTES TABLE
-- =============================================================================

CREATE TABLE disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pseudonymous_id VARCHAR(50) UNIQUE NOT NULL,
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    raised_by_pseudonym VARCHAR(50) REFERENCES users(pseudonymous_id),
    reason VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    status dispute_status DEFAULT 'pending_review',
    decision dispute_decision,
    resolution_notes TEXT,
    tx_hash VARCHAR(66),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_disputes_contract ON disputes(contract_id);
CREATE INDEX idx_disputes_status ON disputes(status);

-- =============================================================================
-- SIGNATURES TABLE
-- =============================================================================

CREATE TABLE signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    signer_pseudonym VARCHAR(50) REFERENCES users(pseudonymous_id),
    signature_hash VARCHAR(130) NOT NULL,
    signed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_signatures_contract ON signatures(contract_id);

-- =============================================================================
-- MESSAGES TABLE
-- =============================================================================

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_pseudonym VARCHAR(50) REFERENCES users(pseudonymous_id),
    receiver_pseudonym VARCHAR(50) REFERENCES users(pseudonymous_id),
    contract_id UUID REFERENCES contracts(id),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_sender ON messages(sender_pseudonym);
CREATE INDEX idx_messages_receiver ON messages(receiver_pseudonym);
CREATE INDEX idx_messages_contract ON messages(contract_id);

-- =============================================================================
-- ADMIN ACCOUNTS TABLE
-- =============================================================================

CREATE TABLE admin_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pseudonymous_id VARCHAR(50) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    permissions TEXT, -- JSON array of permissions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_admin_username ON admin_accounts(username);

-- =============================================================================
-- SESSION AUDIT TABLE
-- =============================================================================

CREATE TABLE session_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(100) NOT NULL,
    user_pseudonym VARCHAR(50),
    ip_address VARCHAR(45),
    user_agent TEXT,
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_session_audit_session ON session_audit(session_id);
CREATE INDEX idx_session_audit_created ON session_audit(created_at);