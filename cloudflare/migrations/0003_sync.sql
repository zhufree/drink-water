CREATE TABLE IF NOT EXISTS sync_accounts (
  account_id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_devices (
  device_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  paired_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_devices_account_id
  ON sync_devices (account_id);

CREATE TABLE IF NOT EXISTS pair_codes (
  code TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  created_by_device_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pair_codes_account_id
  ON pair_codes (account_id);

CREATE TABLE IF NOT EXISTS daily_snapshots (
  account_id TEXT NOT NULL,
  day_key TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by_device_id TEXT NOT NULL,
  PRIMARY KEY (account_id, day_key)
);

CREATE INDEX IF NOT EXISTS idx_daily_snapshots_account_id
  ON daily_snapshots (account_id);

CREATE TABLE IF NOT EXISTS garden_snapshots (
  account_id TEXT PRIMARY KEY,
  snapshot_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by_device_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS backup_manifests (
  object_key TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  device_id TEXT NOT NULL,
  size_bytes INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_backup_manifests_account_id_created_at
  ON backup_manifests (account_id, created_at DESC);
