CREATE TABLE IF NOT EXISTS achievement_receipts (
  account_id TEXT NOT NULL,
  achievement_id TEXT NOT NULL,
  unlocked_at TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  created_by_device_id TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (account_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_achievement_receipts_account_id
  ON achievement_receipts (account_id);
