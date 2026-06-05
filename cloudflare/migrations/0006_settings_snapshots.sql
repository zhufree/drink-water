CREATE TABLE IF NOT EXISTS settings_snapshots (
  account_id TEXT PRIMARY KEY,
  snapshot_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by_device_id TEXT NOT NULL
);
