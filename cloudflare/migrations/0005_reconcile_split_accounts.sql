-- Reconcile accounts that were split when a device already had leaderboard data
-- under account_id = device_id, but sync bootstrap later bound that device to a
-- different account_id. The active source of truth is sync_devices.

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
