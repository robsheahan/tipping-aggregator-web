-- Migration: accuracy tracking tables
-- Tracks match results and provider prediction accuracy (Brier scores)

-- =============================================================================
-- 1. match_results — final scores for completed matches
-- =============================================================================
CREATE TABLE match_results (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  match_id   TEXT NOT NULL UNIQUE REFERENCES sport_matches(id) ON DELETE CASCADE,
  league     TEXT NOT NULL,
  home_score INTEGER NOT NULL,
  away_score INTEGER NOT NULL,
  winner     TEXT NOT NULL,
  margin     INTEGER NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL,
  source     TEXT NOT NULL DEFAULT 'theoddsapi',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT winner_values CHECK (winner IN ('home', 'away', 'draw'))
);

CREATE INDEX idx_match_results_league ON match_results (league);
CREATE INDEX idx_match_results_completed_at ON match_results (completed_at);

-- =============================================================================
-- 2. provider_accuracy — rolling accuracy stats per provider + league
-- =============================================================================
CREATE TABLE provider_accuracy (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  provider_name     TEXT NOT NULL,
  provider_type     TEXT NOT NULL CHECK (provider_type IN ('bookmaker', 'expert')),
  league            TEXT NOT NULL,
  total_predictions INTEGER NOT NULL DEFAULT 0,
  total_correct     INTEGER NOT NULL DEFAULT 0,
  brier_score_sum   DOUBLE PRECISION NOT NULL DEFAULT 0,
  brier_score_avg   DOUBLE PRECISION,
  accuracy_pct      DOUBLE PRECISION,
  last_match_id     TEXT,
  last_updated      TIMESTAMPTZ DEFAULT NOW(),
  created_at        TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (provider_name, provider_type, league)
);

CREATE INDEX idx_provider_accuracy_league ON provider_accuracy (league);
CREATE INDEX idx_provider_accuracy_type ON provider_accuracy (provider_type);
CREATE INDEX idx_provider_accuracy_brier ON provider_accuracy (brier_score_avg);

-- =============================================================================
-- 3. RLS policies — public read, service_role write
-- =============================================================================
ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_accuracy ENABLE ROW LEVEL SECURITY;

-- match_results
CREATE POLICY "Public read access on match_results"
  ON match_results FOR SELECT
  USING (true);

CREATE POLICY "Service role write access on match_results"
  ON match_results FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- provider_accuracy
CREATE POLICY "Public read access on provider_accuracy"
  ON provider_accuracy FOR SELECT
  USING (true);

CREATE POLICY "Service role write access on provider_accuracy"
  ON provider_accuracy FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- =============================================================================
-- 4. Add probability columns to sport_expert_tips
-- =============================================================================
ALTER TABLE sport_expert_tips
  ADD COLUMN IF NOT EXISTS home_prob DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS away_prob DOUBLE PRECISION;
