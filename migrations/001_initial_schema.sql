-- Initial database migration for Agent Arena
-- Creates tables: users, agents, rooms, matches, transactions, daily_rewards

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    wallet_address VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    secret_hash VARCHAR(255) NOT NULL,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    balance INTEGER DEFAULT 10000 NOT NULL CHECK (balance >= 0),
    elo INTEGER DEFAULT 1000 NOT NULL,
    rank VARCHAR(20) DEFAULT 'bronze' CHECK (rank IN ('bronze', 'silver', 'gold', 'diamond', 'master')),
    total_games INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    draws INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'in_game', 'suspended')),
    last_challenge_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on api_key for fast lookup
CREATE INDEX IF NOT EXISTS idx_agents_api_key ON agents(api_key);
CREATE INDEX IF NOT EXISTS idx_agents_owner_id ON agents(owner_id);
CREATE INDEX IF NOT EXISTS idx_agents_elo ON agents(elo);

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_type VARCHAR(50) NOT NULL,
    level VARCHAR(20) NOT NULL,
    entry_fee INTEGER NOT NULL CHECK (entry_fee > 0),
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'ended', 'closed')),
    winner_id UUID REFERENCES agents(id),
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    game_state JSONB,
    event_log JSONB DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_game_type ON rooms(game_type);

-- Room players (many-to-many relationship)
CREATE TABLE IF NOT EXISTS room_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    ready BOOLEAN DEFAULT FALSE,
    frozen_fee INTEGER DEFAULT 0,
    final_rank INTEGER,
    final_reward INTEGER DEFAULT 0,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(room_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_room_players_room_id ON room_players(room_id);
CREATE INDEX IF NOT EXISTS idx_room_players_agent_id ON room_players(agent_id);

-- Matches table (historical record)
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id),
    game_type VARCHAR(50) NOT NULL,
    level VARCHAR(20) NOT NULL,
    winner_id UUID REFERENCES agents(id),
    entry_fee INTEGER NOT NULL,
    total_pool INTEGER NOT NULL,
    prize_pool INTEGER NOT NULL,
    house_fee INTEGER NOT NULL,
    duration_seconds INTEGER,
    game_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matches_winner_id ON matches(winner_id);
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches(created_at);

-- Match participants
CREATE TABLE IF NOT EXISTS match_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id),
    rank INTEGER NOT NULL,
    reward INTEGER DEFAULT 0,
    elo_before INTEGER,
    elo_after INTEGER,
    stats JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_match_participants_match_id ON match_participants(match_id);
CREATE INDEX IF NOT EXISTS idx_match_participants_agent_id ON match_participants(agent_id);

-- Transactions table (economy)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'entry_fee', 'prize', 'refund', 'daily_reward', 'referral')),
    amount INTEGER NOT NULL,
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    reference_id UUID, -- room_id or match_id
    reference_type VARCHAR(50), -- 'room', 'match', 'system'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_agent_id ON transactions(agent_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- Daily rewards tracking
CREATE TABLE IF NOT EXISTS daily_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    reward_date DATE NOT NULL,
    amount INTEGER NOT NULL,
    streak INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(agent_id, reward_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_rewards_agent_id ON daily_rewards(agent_id);
CREATE INDEX IF NOT EXISTS idx_daily_rewards_date ON daily_rewards(reward_date);

-- Update trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default test users and agents
INSERT INTO users (id, username, email) 
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'test_user', 'test@example.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO agents (id, name, api_key, secret_hash, owner_id, balance, elo)
VALUES 
    ('22222222-2222-2222-2222-222222222222', 'TestAgent_A', 'test_key_001', 'test_secret_001', '11111111-1111-1111-1111-111111111111', 10000, 1000),
    ('33333333-3333-3333-3333-333333333333', 'TestAgent_B', 'test_key_002', 'test_secret_002', '11111111-1111-1111-1111-111111111111', 10000, 1050)
ON CONFLICT (id) DO NOTHING;
