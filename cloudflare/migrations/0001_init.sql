CREATE TABLE IF NOT EXISTS users (
  device_id TEXT PRIMARY KEY,
  display_name TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS circles (
  circle_code TEXT PRIMARY KEY,
  circle_name TEXT,
  created_by_device_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS circle_members (
  circle_code TEXT NOT NULL,
  device_id TEXT NOT NULL,
  joined_at TEXT NOT NULL,
  PRIMARY KEY (circle_code, device_id)
);

CREATE TABLE IF NOT EXISTS daily_stats (
  circle_code TEXT NOT NULL,
  device_id TEXT NOT NULL,
  day_key TEXT NOT NULL,
  actual_intake_ml INTEGER NOT NULL,
  target_ml INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (circle_code, device_id, day_key)
);

CREATE INDEX IF NOT EXISTS idx_circle_members_device_id
  ON circle_members (device_id);

CREATE INDEX IF NOT EXISTS idx_daily_stats_circle_day
  ON daily_stats (circle_code, day_key);
