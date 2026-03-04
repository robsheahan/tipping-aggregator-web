-- Sport Matches: stores aggregated odds, predicted scores, and raw bookmaker JSON
CREATE TABLE IF NOT EXISTS sport_matches (
    id TEXT PRIMARY KEY,                        -- TheOddsAPI event ID
    sport TEXT NOT NULL,                         -- 'afl' or 'nrl'
    league TEXT NOT NULL,                        -- 'AFL' or 'NRL'
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    commence_time TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled',

    -- Aggregated probabilities (normalized, vig-removed)
    home_prob DOUBLE PRECISION,
    away_prob DOUBLE PRECISION,
    draw_prob DOUBLE PRECISION,

    -- Tip derived from probabilities
    tip TEXT,                                    -- 'home' or 'away'
    confidence DOUBLE PRECISION,                 -- 0-1

    -- Spread / handicap consensus
    home_spread DOUBLE PRECISION,                -- e.g. -6.5
    away_spread DOUBLE PRECISION,                -- e.g. +6.5

    -- Totals consensus
    total_points DOUBLE PRECISION,               -- e.g. 168.5

    -- Predicted scores (derived from spread + total)
    home_predicted_score DOUBLE PRECISION,
    away_predicted_score DOUBLE PRECISION,
    predicted_margin DOUBLE PRECISION,           -- absolute margin

    -- Provider metadata
    contributing_providers INTEGER DEFAULT 0,
    last_updated TIMESTAMPTZ,

    -- Raw bookmaker data for detailed breakdown
    bookmaker_odds JSONB DEFAULT '[]'::jsonb,    -- full bookmaker odds array

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sport_matches_sport ON sport_matches(sport);
CREATE INDEX idx_sport_matches_league ON sport_matches(league);
CREATE INDEX idx_sport_matches_commence ON sport_matches(commence_time);

-- Sport Expert Tips: one row per expert tip per match
CREATE TABLE IF NOT EXISTS sport_expert_tips (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    match_id TEXT NOT NULL REFERENCES sport_matches(id) ON DELETE CASCADE,
    source TEXT NOT NULL,                         -- 'squiggle', 'afl.com.au', 'nrl.com', 'punters.com.au'
    expert_name TEXT,                             -- individual tipster name if available
    tipped_team TEXT NOT NULL,                    -- team name that was tipped
    predicted_margin DOUBLE PRECISION,            -- expert's predicted margin (if available)
    sport TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(match_id, source, expert_name)
);

CREATE INDEX idx_sport_expert_tips_match ON sport_expert_tips(match_id);

-- Sport Tip Consensus: one row per match — aggregated expert tip counts
CREATE TABLE IF NOT EXISTS sport_tip_consensus (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    match_id TEXT NOT NULL REFERENCES sport_matches(id) ON DELETE CASCADE UNIQUE,
    home_tips INTEGER DEFAULT 0,
    away_tips INTEGER DEFAULT 0,
    total_tips INTEGER DEFAULT 0,
    consensus_team TEXT,                          -- team name with most tips
    consensus_pct DOUBLE PRECISION,              -- percentage agreement (0-1)
    consensus_strength TEXT,                      -- 'unanimous', 'strong', 'lean', 'split'
    avg_predicted_margin DOUBLE PRECISION,        -- average margin from expert tips
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sport_tip_consensus_match ON sport_tip_consensus(match_id);

-- Enable RLS
ALTER TABLE sport_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE sport_expert_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE sport_tip_consensus ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "sport_matches_public_read" ON sport_matches
    FOR SELECT USING (true);

CREATE POLICY "sport_expert_tips_public_read" ON sport_expert_tips
    FOR SELECT USING (true);

CREATE POLICY "sport_tip_consensus_public_read" ON sport_tip_consensus
    FOR SELECT USING (true);

-- Service role write policies
CREATE POLICY "sport_matches_service_write" ON sport_matches
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "sport_expert_tips_service_write" ON sport_expert_tips
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "sport_tip_consensus_service_write" ON sport_tip_consensus
    FOR ALL USING (auth.role() = 'service_role');

-- Auto-update updated_at triggers
CREATE OR REPLACE FUNCTION update_sport_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sport_matches_updated_at
    BEFORE UPDATE ON sport_matches
    FOR EACH ROW EXECUTE FUNCTION update_sport_updated_at();

CREATE TRIGGER sport_tip_consensus_updated_at
    BEFORE UPDATE ON sport_tip_consensus
    FOR EACH ROW EXECUTE FUNCTION update_sport_updated_at();
