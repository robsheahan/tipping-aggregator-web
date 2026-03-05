-- Tip Submissions: tracks auto-submitted tips to tipping platforms
CREATE TABLE IF NOT EXISTS sport_tip_submissions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    match_id TEXT NOT NULL REFERENCES sport_matches(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,                          -- 'afl_tipping', 'nrl_tipping', 'superbru', 'espn_footytips'
    submitted_team TEXT,                             -- team name that was submitted
    consensus_team TEXT,                             -- consensus at time of submission
    consensus_strength TEXT,                         -- 'unanimous', 'strong', 'lean', 'split'
    status TEXT NOT NULL DEFAULT 'pending',           -- 'pending', 'submitted', 'failed', 'skipped'
    error_message TEXT,                              -- error details if failed
    screenshot_path TEXT,                            -- path to confirmation screenshot
    submitted_at TIMESTAMPTZ,                        -- when successfully submitted
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(match_id, platform)
);

CREATE INDEX idx_tip_submissions_match ON sport_tip_submissions(match_id);
CREATE INDEX idx_tip_submissions_platform ON sport_tip_submissions(platform);
CREATE INDEX idx_tip_submissions_status ON sport_tip_submissions(status);

-- Enable RLS
ALTER TABLE sport_tip_submissions ENABLE ROW LEVEL SECURITY;

-- Public read policy
CREATE POLICY "tip_submissions_public_read" ON sport_tip_submissions
    FOR SELECT USING (true);

-- Service role write policy
CREATE POLICY "tip_submissions_service_write" ON sport_tip_submissions
    FOR ALL USING (auth.role() = 'service_role');

-- Auto-update updated_at trigger
CREATE TRIGGER tip_submissions_updated_at
    BEFORE UPDATE ON sport_tip_submissions
    FOR EACH ROW EXECUTE FUNCTION update_sport_updated_at();
