INSERT OR IGNORE INTO sync_accounts (account_id, created_at)
SELECT device_id, COALESCE(created_at, updated_at, CURRENT_TIMESTAMP)
FROM users;

INSERT OR IGNORE INTO sync_accounts (account_id, created_at)
SELECT created_by_device_id, COALESCE(created_at, CURRENT_TIMESTAMP)
FROM circles;

INSERT OR IGNORE INTO sync_accounts (account_id, created_at)
SELECT device_id, COALESCE(joined_at, CURRENT_TIMESTAMP)
FROM circle_members;

INSERT OR IGNORE INTO sync_accounts (account_id, created_at)
SELECT device_id, COALESCE(updated_at, CURRENT_TIMESTAMP)
FROM daily_stats;

INSERT OR IGNORE INTO sync_devices (device_id, account_id, paired_at, last_seen_at)
SELECT device_id, device_id, COALESCE(created_at, updated_at, CURRENT_TIMESTAMP), COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)
FROM users;

INSERT OR IGNORE INTO sync_devices (device_id, account_id, paired_at, last_seen_at)
SELECT created_by_device_id, created_by_device_id, COALESCE(created_at, CURRENT_TIMESTAMP), COALESCE(created_at, CURRENT_TIMESTAMP)
FROM circles;

INSERT OR IGNORE INTO sync_devices (device_id, account_id, paired_at, last_seen_at)
SELECT device_id, device_id, COALESCE(joined_at, CURRENT_TIMESTAMP), COALESCE(joined_at, CURRENT_TIMESTAMP)
FROM circle_members;

INSERT OR IGNORE INTO sync_devices (device_id, account_id, paired_at, last_seen_at)
SELECT device_id, device_id, COALESCE(updated_at, CURRENT_TIMESTAMP), COALESCE(updated_at, CURRENT_TIMESTAMP)
FROM daily_stats;

ALTER TABLE users RENAME TO users_device_legacy;
ALTER TABLE circles RENAME TO circles_device_legacy;
ALTER TABLE circle_members RENAME TO circle_members_device_legacy;
ALTER TABLE daily_stats RENAME TO daily_stats_device_legacy;

CREATE TABLE users (
  account_id TEXT PRIMARY KEY,
  display_name TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE circles (
  circle_code TEXT PRIMARY KEY,
  circle_name TEXT,
  created_by_account_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE circle_members (
  circle_code TEXT NOT NULL,
  account_id TEXT NOT NULL,
  joined_at TEXT NOT NULL,
  PRIMARY KEY (circle_code, account_id)
);

CREATE TABLE daily_stats (
  circle_code TEXT NOT NULL,
  account_id TEXT NOT NULL,
  day_key TEXT NOT NULL,
  actual_intake_ml INTEGER NOT NULL,
  target_ml INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (circle_code, account_id, day_key)
);

CREATE INDEX IF NOT EXISTS idx_circle_members_account_id
  ON circle_members (account_id);

CREATE INDEX IF NOT EXISTS idx_daily_stats_circle_day
  ON daily_stats (circle_code, day_key);

INSERT INTO users (account_id, display_name, created_at, updated_at)
SELECT
  sd.account_id,
  MAX(udl.display_name) AS display_name,
  MIN(udl.created_at) AS created_at,
  MAX(udl.updated_at) AS updated_at
FROM users_device_legacy udl
INNER JOIN sync_devices sd
  ON sd.device_id = udl.device_id
GROUP BY sd.account_id;

INSERT INTO circles (circle_code, circle_name, created_by_account_id, created_at)
SELECT
  cdl.circle_code,
  cdl.circle_name,
  COALESCE(sd.account_id, cdl.created_by_device_id) AS created_by_account_id,
  cdl.created_at
FROM circles_device_legacy cdl
LEFT JOIN sync_devices sd
  ON sd.device_id = cdl.created_by_device_id;

INSERT INTO circle_members (circle_code, account_id, joined_at)
SELECT
  cmdl.circle_code,
  sd.account_id,
  MIN(cmdl.joined_at) AS joined_at
FROM circle_members_device_legacy cmdl
INNER JOIN sync_devices sd
  ON sd.device_id = cmdl.device_id
GROUP BY cmdl.circle_code, sd.account_id;

INSERT INTO daily_stats (circle_code, account_id, day_key, actual_intake_ml, target_ml, updated_at)
SELECT
  ranked.circle_code,
  ranked.account_id,
  ranked.day_key,
  ranked.actual_intake_ml,
  ranked.target_ml,
  ranked.updated_at
FROM (
  SELECT
    dsdl.circle_code,
    sd.account_id,
    dsdl.day_key,
    dsdl.actual_intake_ml,
    dsdl.target_ml,
    dsdl.updated_at,
    ROW_NUMBER() OVER (
      PARTITION BY dsdl.circle_code, sd.account_id, dsdl.day_key
      ORDER BY dsdl.updated_at DESC, dsdl.device_id DESC
    ) AS row_num
  FROM daily_stats_device_legacy dsdl
  INNER JOIN sync_devices sd
    ON sd.device_id = dsdl.device_id
) ranked
WHERE ranked.row_num = 1;
