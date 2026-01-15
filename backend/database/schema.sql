-- =============================================
-- Supabase Database Schema
-- Australian Horse Racing Odds Aggregator
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- MEETS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS meets (
    id VARCHAR(255) PRIMARY KEY,
    date DATE NOT NULL,
    venue VARCHAR(255) NOT NULL,
    country VARCHAR(10) DEFAULT 'AUS',
    region VARCHAR(100),
    num_races INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_meets_date ON meets(date);
CREATE INDEX idx_meets_venue ON meets(venue);

-- =============================================
-- RACES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS races (
    id VARCHAR(255) PRIMARY KEY,
    meet_id VARCHAR(255) REFERENCES meets(id) ON DELETE CASCADE,
    venue VARCHAR(255) NOT NULL,
    race_number INTEGER NOT NULL,
    race_name VARCHAR(255),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    distance VARCHAR(50),
    race_class VARCHAR(100),
    track_condition VARCHAR(50),
    weather VARCHAR(50),
    status VARCHAR(20) DEFAULT 'upcoming',
    runners JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_race UNIQUE (meet_id, race_number)
);

CREATE INDEX idx_races_meet ON races(meet_id);
CREATE INDEX idx_races_start_time ON races(start_time);
CREATE INDEX idx_races_status ON races(status);

-- =============================================
-- RACE_ODDS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS race_odds (
    id SERIAL PRIMARY KEY,
    race_id VARCHAR(255) REFERENCES races(id) ON DELETE CASCADE,
    runner_number INTEGER NOT NULL,
    bookmaker VARCHAR(100) NOT NULL,
    odds DECIMAL(10, 2) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_odds UNIQUE (race_id, runner_number, bookmaker, timestamp)
);

CREATE INDEX idx_odds_race ON race_odds(race_id);
CREATE INDEX idx_odds_runner ON race_odds(runner_number);
CREATE INDEX idx_odds_bookmaker ON race_odds(bookmaker);
CREATE INDEX idx_odds_timestamp ON race_odds(timestamp DESC);

-- =============================================
-- EXPERT_TIPS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS expert_tips (
    id SERIAL PRIMARY KEY,
    race_id VARCHAR(255) REFERENCES races(id) ON DELETE CASCADE,
    runner_name VARCHAR(255) NOT NULL,
    runner_number INTEGER NOT NULL,
    source VARCHAR(255) NOT NULL,  -- "Sky Racing", "Racing.com", etc.
    expert_name VARCHAR(255),
    confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
    category VARCHAR(20) CHECK (category IN ('best_bet', 'value', 'avoid', 'neutral')),
    raw_text TEXT NOT NULL,
    ai_summary TEXT,  -- Claude-generated summary
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_tip UNIQUE (race_id, source, runner_number)
);

CREATE INDEX idx_tips_race ON expert_tips(race_id);
CREATE INDEX idx_tips_runner ON expert_tips(runner_number);
CREATE INDEX idx_tips_source ON expert_tips(source);
CREATE INDEX idx_tips_category ON expert_tips(category);

-- =============================================
-- CONSENSUS_SCORES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS consensus_scores (
    id SERIAL PRIMARY KEY,
    race_id VARCHAR(255) REFERENCES races(id) ON DELETE CASCADE,
    runner_number INTEGER NOT NULL,
    runner_name VARCHAR(255) NOT NULL,
    consensus_score INTEGER CHECK (consensus_score >= 0 AND consensus_score <= 100),
    num_tips INTEGER DEFAULT 0,
    best_odds DECIMAL(10, 2),
    best_bookmaker VARCHAR(100),
    ai_verdict TEXT,  -- Claude-generated 1-sentence summary
    tip_breakdown JSONB DEFAULT '{}',  -- {source: confidence}
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_consensus UNIQUE (race_id, runner_number)
);

CREATE INDEX idx_consensus_race ON consensus_scores(race_id);
CREATE INDEX idx_consensus_runner ON consensus_scores(runner_number);
CREATE INDEX idx_consensus_score ON consensus_scores(consensus_score DESC);

-- =============================================
-- AFFILIATE_CLICKS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS affiliate_clicks (
    id SERIAL PRIMARY KEY,
    bookmaker VARCHAR(100) NOT NULL,
    race_id VARCHAR(255),
    runner_number INTEGER,
    ip_address VARCHAR(45),
    user_agent TEXT,
    clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_clicks_bookmaker ON affiliate_clicks(bookmaker);
CREATE INDEX idx_clicks_race ON affiliate_clicks(race_id);
CREATE INDEX idx_clicks_timestamp ON affiliate_clicks(clicked_at DESC);

-- =============================================
-- UPDATE TRIGGERS
-- =============================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_meets_updated_at BEFORE UPDATE ON meets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_races_updated_at BEFORE UPDATE ON races
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_consensus_updated_at BEFORE UPDATE ON consensus_scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE meets ENABLE ROW LEVEL SECURITY;
ALTER TABLE races ENABLE ROW LEVEL SECURITY;
ALTER TABLE race_odds ENABLE ROW LEVEL SECURITY;
ALTER TABLE expert_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE consensus_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;

-- Public read access for frontend
CREATE POLICY "Allow public read access" ON meets FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON races FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON race_odds FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON expert_tips FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON consensus_scores FOR SELECT USING (true);

-- Service role full access (for backend worker)
CREATE POLICY "Service role full access" ON meets FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON races FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON race_odds FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON expert_tips FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON consensus_scores FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON affiliate_clicks FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Get today's races with consensus scores
CREATE OR REPLACE FUNCTION get_todays_races_with_consensus()
RETURNS TABLE (
    race_id VARCHAR,
    venue VARCHAR,
    race_number INTEGER,
    start_time TIMESTAMP WITH TIME ZONE,
    runners_with_consensus JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.id,
        r.venue,
        r.race_number,
        r.start_time,
        jsonb_agg(
            jsonb_build_object(
                'number', cs.runner_number,
                'name', cs.runner_name,
                'consensus_score', cs.consensus_score,
                'best_odds', cs.best_odds,
                'best_bookmaker', cs.best_bookmaker,
                'ai_verdict', cs.ai_verdict,
                'num_tips', cs.num_tips
            )
            ORDER BY cs.consensus_score DESC
        ) as runners_with_consensus
    FROM races r
    LEFT JOIN consensus_scores cs ON r.id = cs.race_id
    WHERE DATE(r.start_time) = CURRENT_DATE
        AND r.status = 'upcoming'
    GROUP BY r.id, r.venue, r.race_number, r.start_time
    ORDER BY r.start_time;
END;
$$ LANGUAGE plpgsql;
