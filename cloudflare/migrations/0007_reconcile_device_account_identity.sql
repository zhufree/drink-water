-- Re-run account reconciliation after pair-code binding can remap a legacy
-- account_id that was originally equal to device_id onto a newer sync account.

INSERT OR IGNORE INTO users (account_id, display_name, created_at, updated_at)
SELECT
  sd.account_id,
  old_user.display_name,
  old_user.created_at,
  old_user.updated_at
FROM sync_devices sd
INNER JOIN users old_user
  ON old_user.account_id = sd.device_id
WHERE sd.account_id <> sd.device_id;

UPDATE users
SET
  display_name = COALESCE(
    display_name,
    (
      SELECT old_user.display_name
      FROM sync_devices sd
      INNER JOIN users old_user
        ON old_user.account_id = sd.device_id
      WHERE sd.account_id = users.account_id
        AND sd.account_id <> sd.device_id
        AND old_user.display_name IS NOT NULL
      LIMIT 1
    )
  ),
  updated_at = MAX(
    updated_at,
    COALESCE(
      (
        SELECT old_user.updated_at
        FROM sync_devices sd
        INNER JOIN users old_user
          ON old_user.account_id = sd.device_id
        WHERE sd.account_id = users.account_id
          AND sd.account_id <> sd.device_id
        LIMIT 1
      ),
      updated_at
    )
  )
WHERE account_id IN (
  SELECT account_id
  FROM sync_devices
  WHERE account_id <> device_id
);

UPDATE circles
SET created_by_account_id = (
  SELECT sd.account_id
  FROM sync_devices sd
  WHERE sd.device_id = circles.created_by_account_id
    AND sd.account_id <> sd.device_id
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1
  FROM sync_devices sd
  WHERE sd.device_id = circles.created_by_account_id
    AND sd.account_id <> sd.device_id
);

INSERT OR IGNORE INTO circle_members (circle_code, account_id, joined_at)
SELECT
  cm.circle_code,
  sd.account_id,
  cm.joined_at
FROM circle_members cm
INNER JOIN sync_devices sd
  ON sd.device_id = cm.account_id
WHERE sd.account_id <> sd.device_id;

INSERT OR IGNORE INTO daily_stats (
  circle_code,
  account_id,
  day_key,
  actual_intake_ml,
  target_ml,
  updated_at
)
SELECT
  ds.circle_code,
  sd.account_id,
  ds.day_key,
  ds.actual_intake_ml,
  ds.target_ml,
  ds.updated_at
FROM daily_stats ds
INNER JOIN sync_devices sd
  ON sd.device_id = ds.account_id
WHERE sd.account_id <> sd.device_id;

UPDATE daily_stats
SET
  actual_intake_ml = (
    SELECT old_stats.actual_intake_ml
    FROM sync_devices sd
    INNER JOIN daily_stats old_stats
      ON old_stats.account_id = sd.device_id
    WHERE sd.account_id = daily_stats.account_id
      AND sd.account_id <> sd.device_id
      AND old_stats.circle_code = daily_stats.circle_code
      AND old_stats.day_key = daily_stats.day_key
      AND old_stats.updated_at > daily_stats.updated_at
    ORDER BY old_stats.updated_at DESC
    LIMIT 1
  ),
  target_ml = (
    SELECT old_stats.target_ml
    FROM sync_devices sd
    INNER JOIN daily_stats old_stats
      ON old_stats.account_id = sd.device_id
    WHERE sd.account_id = daily_stats.account_id
      AND sd.account_id <> sd.device_id
      AND old_stats.circle_code = daily_stats.circle_code
      AND old_stats.day_key = daily_stats.day_key
      AND old_stats.updated_at > daily_stats.updated_at
    ORDER BY old_stats.updated_at DESC
    LIMIT 1
  ),
  updated_at = (
    SELECT old_stats.updated_at
    FROM sync_devices sd
    INNER JOIN daily_stats old_stats
      ON old_stats.account_id = sd.device_id
    WHERE sd.account_id = daily_stats.account_id
      AND sd.account_id <> sd.device_id
      AND old_stats.circle_code = daily_stats.circle_code
      AND old_stats.day_key = daily_stats.day_key
      AND old_stats.updated_at > daily_stats.updated_at
    ORDER BY old_stats.updated_at DESC
    LIMIT 1
  )
WHERE EXISTS (
  SELECT 1
  FROM sync_devices sd
  INNER JOIN daily_stats old_stats
    ON old_stats.account_id = sd.device_id
  WHERE sd.account_id = daily_stats.account_id
    AND sd.account_id <> sd.device_id
    AND old_stats.circle_code = daily_stats.circle_code
    AND old_stats.day_key = daily_stats.day_key
    AND old_stats.updated_at > daily_stats.updated_at
);

INSERT INTO daily_snapshots (
  account_id,
  day_key,
  snapshot_json,
  updated_at,
  updated_by_device_id
)
SELECT
  sd.account_id,
  old_snapshot.day_key,
  old_snapshot.snapshot_json,
  old_snapshot.updated_at,
  old_snapshot.updated_by_device_id
FROM daily_snapshots old_snapshot
INNER JOIN sync_devices sd
  ON sd.device_id = old_snapshot.account_id
WHERE sd.account_id <> sd.device_id
ON CONFLICT(account_id, day_key)
DO UPDATE SET
  snapshot_json = excluded.snapshot_json,
  updated_at = excluded.updated_at,
  updated_by_device_id = excluded.updated_by_device_id
WHERE excluded.updated_at > daily_snapshots.updated_at
   OR (excluded.updated_at = daily_snapshots.updated_at
       AND excluded.updated_by_device_id > daily_snapshots.updated_by_device_id);

INSERT INTO garden_snapshots (
  account_id,
  snapshot_json,
  updated_at,
  updated_by_device_id
)
SELECT
  sd.account_id,
  old_snapshot.snapshot_json,
  old_snapshot.updated_at,
  old_snapshot.updated_by_device_id
FROM garden_snapshots old_snapshot
INNER JOIN sync_devices sd
  ON sd.device_id = old_snapshot.account_id
WHERE sd.account_id <> sd.device_id
ON CONFLICT(account_id)
DO UPDATE SET
  snapshot_json = excluded.snapshot_json,
  updated_at = excluded.updated_at,
  updated_by_device_id = excluded.updated_by_device_id
WHERE excluded.updated_at > garden_snapshots.updated_at
   OR (excluded.updated_at = garden_snapshots.updated_at
       AND excluded.updated_by_device_id > garden_snapshots.updated_by_device_id);

INSERT INTO settings_snapshots (
  account_id,
  snapshot_json,
  updated_at,
  updated_by_device_id
)
SELECT
  sd.account_id,
  old_snapshot.snapshot_json,
  old_snapshot.updated_at,
  old_snapshot.updated_by_device_id
FROM settings_snapshots old_snapshot
INNER JOIN sync_devices sd
  ON sd.device_id = old_snapshot.account_id
WHERE sd.account_id <> sd.device_id
ON CONFLICT(account_id)
DO UPDATE SET
  snapshot_json = excluded.snapshot_json,
  updated_at = excluded.updated_at,
  updated_by_device_id = excluded.updated_by_device_id
WHERE excluded.updated_at > settings_snapshots.updated_at
   OR (excluded.updated_at = settings_snapshots.updated_at
       AND excluded.updated_by_device_id > settings_snapshots.updated_by_device_id);

UPDATE backup_manifests
SET account_id = (
  SELECT sd.account_id
  FROM sync_devices sd
  WHERE sd.device_id = backup_manifests.account_id
    AND sd.account_id <> sd.device_id
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1
  FROM sync_devices sd
  WHERE sd.device_id = backup_manifests.account_id
    AND sd.account_id <> sd.device_id
);

DELETE FROM daily_snapshots
WHERE account_id IN (
  SELECT device_id
  FROM sync_devices
  WHERE account_id <> device_id
);

DELETE FROM garden_snapshots
WHERE account_id IN (
  SELECT device_id
  FROM sync_devices
  WHERE account_id <> device_id
);

DELETE FROM settings_snapshots
WHERE account_id IN (
  SELECT device_id
  FROM sync_devices
  WHERE account_id <> device_id
);

DELETE FROM daily_stats
WHERE account_id IN (
  SELECT device_id
  FROM sync_devices
  WHERE account_id <> device_id
);

DELETE FROM circle_members
WHERE account_id IN (
  SELECT device_id
  FROM sync_devices
  WHERE account_id <> device_id
);

DELETE FROM users
WHERE account_id IN (
  SELECT device_id
  FROM sync_devices
  WHERE account_id <> device_id
);

DELETE FROM sync_accounts
WHERE account_id IN (
  SELECT device_id
  FROM sync_devices
  WHERE account_id <> device_id
)
AND NOT EXISTS (
  SELECT 1 FROM sync_devices sd WHERE sd.account_id = sync_accounts.account_id
)
AND NOT EXISTS (
  SELECT 1 FROM users u WHERE u.account_id = sync_accounts.account_id
)
AND NOT EXISTS (
  SELECT 1 FROM circles c WHERE c.created_by_account_id = sync_accounts.account_id
)
AND NOT EXISTS (
  SELECT 1 FROM circle_members cm WHERE cm.account_id = sync_accounts.account_id
);
