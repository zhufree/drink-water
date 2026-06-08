import { HttpError } from "./common.ts";

export async function ensureLeaderboardAccountForDevice(
  db: D1Database,
  deviceId: string,
  now: string
) {
  const existing = await getSyncAccountIdByDeviceId(db, deviceId);
  if (existing) {
    return existing;
  }

  const accountId = crypto.randomUUID();
  await bindDeviceToSyncAccount(db, accountId, deviceId, now);
  return accountId;
}

export async function ensureSyncAccountExists(db: D1Database, accountId: string, now: string) {
  await db
    .prepare(`INSERT OR IGNORE INTO sync_accounts (account_id, created_at) VALUES (?1, ?2)`)
    .bind(accountId, now)
    .run();
}

export async function bindDeviceToSyncAccount(
  db: D1Database,
  accountId: string,
  deviceId: string,
  now: string
) {
  await ensureSyncAccountExists(db, accountId, now);
  await db
    .prepare(
      `INSERT INTO sync_devices (device_id, account_id, paired_at, last_seen_at)
       VALUES (?1, ?2, ?3, ?3)
       ON CONFLICT(device_id)
       DO UPDATE SET
         account_id = excluded.account_id,
         last_seen_at = excluded.last_seen_at`
    )
    .bind(deviceId, accountId, now)
    .run();

  await reconcileLegacyDeviceAccount(db, deviceId, accountId, now);
}

export async function reconcileLegacyDeviceAccount(
  db: D1Database,
  deviceId: string,
  accountId: string,
  now: string
) {
  if (deviceId === accountId) {
    return;
  }

  await ensureSyncAccountExists(db, accountId, now);

  await db
    .prepare(
      `INSERT OR IGNORE INTO users (account_id, display_name, created_at, updated_at)
       SELECT ?2, display_name, created_at, updated_at
       FROM users
       WHERE account_id = ?1`
    )
    .bind(deviceId, accountId)
    .run();

  await db
    .prepare(
      `UPDATE users
       SET
         display_name = COALESCE(
           display_name,
           (SELECT old_user.display_name FROM users old_user WHERE old_user.account_id = ?1)
         ),
         updated_at = MAX(
           updated_at,
           COALESCE(
             (SELECT old_user.updated_at FROM users old_user WHERE old_user.account_id = ?1),
             updated_at
           )
         )
       WHERE account_id = ?2`
    )
    .bind(deviceId, accountId)
    .run();

  await db
    .prepare(
      `UPDATE circles
       SET created_by_account_id = ?2
       WHERE created_by_account_id = ?1`
    )
    .bind(deviceId, accountId)
    .run();

  await db
    .prepare(
      `INSERT OR IGNORE INTO circle_members (circle_code, account_id, joined_at)
       SELECT circle_code, ?2, joined_at
       FROM circle_members
       WHERE account_id = ?1`
    )
    .bind(deviceId, accountId)
    .run();

  await db
    .prepare(
      `UPDATE circle_members
       SET joined_at = MIN(
         joined_at,
         COALESCE(
           (
             SELECT old_member.joined_at
             FROM circle_members old_member
             WHERE old_member.circle_code = circle_members.circle_code
               AND old_member.account_id = ?1
           ),
           joined_at
         )
       )
       WHERE account_id = ?2`
    )
    .bind(deviceId, accountId)
    .run();

  await db
    .prepare(
      `INSERT OR IGNORE INTO daily_stats (
         circle_code,
         account_id,
         day_key,
         actual_intake_ml,
         target_ml,
         updated_at
       )
       SELECT
         circle_code,
         ?2,
         day_key,
         actual_intake_ml,
         target_ml,
         updated_at
       FROM daily_stats
       WHERE account_id = ?1`
    )
    .bind(deviceId, accountId)
    .run();

  await db
    .prepare(
      `UPDATE daily_stats
       SET
         actual_intake_ml = (
           SELECT old_stats.actual_intake_ml
           FROM daily_stats old_stats
           WHERE old_stats.account_id = ?1
             AND old_stats.circle_code = daily_stats.circle_code
             AND old_stats.day_key = daily_stats.day_key
             AND old_stats.updated_at > daily_stats.updated_at
           ORDER BY old_stats.updated_at DESC
           LIMIT 1
         ),
         target_ml = (
           SELECT old_stats.target_ml
           FROM daily_stats old_stats
           WHERE old_stats.account_id = ?1
             AND old_stats.circle_code = daily_stats.circle_code
             AND old_stats.day_key = daily_stats.day_key
             AND old_stats.updated_at > daily_stats.updated_at
           ORDER BY old_stats.updated_at DESC
           LIMIT 1
         ),
         updated_at = (
           SELECT old_stats.updated_at
           FROM daily_stats old_stats
           WHERE old_stats.account_id = ?1
             AND old_stats.circle_code = daily_stats.circle_code
             AND old_stats.day_key = daily_stats.day_key
             AND old_stats.updated_at > daily_stats.updated_at
           ORDER BY old_stats.updated_at DESC
           LIMIT 1
         )
       WHERE account_id = ?2
         AND EXISTS (
           SELECT 1
           FROM daily_stats old_stats
           WHERE old_stats.account_id = ?1
             AND old_stats.circle_code = daily_stats.circle_code
             AND old_stats.day_key = daily_stats.day_key
             AND old_stats.updated_at > daily_stats.updated_at
         )`
    )
    .bind(deviceId, accountId)
    .run();

  await migrateAccountScopedSnapshot(
    db,
    "daily_snapshots",
    "account_id",
    deviceId,
    accountId
  );
  await migrateAccountScopedSnapshot(
    db,
    "garden_snapshots",
    "account_id",
    deviceId,
    accountId
  );
  await migrateAccountScopedSnapshot(
    db,
    "settings_snapshots",
    "account_id",
    deviceId,
    accountId
  );

  await db
    .prepare(
      `UPDATE backup_manifests
       SET account_id = ?2
       WHERE account_id = ?1`
    )
    .bind(deviceId, accountId)
    .run();

  await db.prepare(`DELETE FROM daily_stats WHERE account_id = ?1`).bind(deviceId).run();
  await db.prepare(`DELETE FROM circle_members WHERE account_id = ?1`).bind(deviceId).run();
  await db.prepare(`DELETE FROM users WHERE account_id = ?1`).bind(deviceId).run();
  await db
    .prepare(
      `DELETE FROM sync_accounts
       WHERE account_id = ?1
         AND NOT EXISTS (SELECT 1 FROM sync_devices WHERE account_id = ?1)
         AND NOT EXISTS (SELECT 1 FROM users WHERE account_id = ?1)
         AND NOT EXISTS (SELECT 1 FROM circles WHERE created_by_account_id = ?1)
         AND NOT EXISTS (SELECT 1 FROM circle_members WHERE account_id = ?1)`
    )
    .bind(deviceId)
    .run();
}

export async function migrateAccountScopedSnapshot(
  db: D1Database,
  tableName: "daily_snapshots" | "garden_snapshots" | "settings_snapshots",
  _accountColumn: "account_id",
  deviceId: string,
  accountId: string
) {
  if (tableName === "daily_snapshots") {
    await db
      .prepare(
        `INSERT INTO daily_snapshots (
           account_id,
           day_key,
           snapshot_json,
           updated_at,
           updated_by_device_id
         )
         SELECT
           ?2,
           day_key,
           snapshot_json,
           updated_at,
           updated_by_device_id
         FROM daily_snapshots
         WHERE account_id = ?1
         ON CONFLICT(account_id, day_key)
         DO UPDATE SET
           snapshot_json = excluded.snapshot_json,
           updated_at = excluded.updated_at,
           updated_by_device_id = excluded.updated_by_device_id
         WHERE excluded.updated_at > daily_snapshots.updated_at
            OR (excluded.updated_at = daily_snapshots.updated_at
                AND excluded.updated_by_device_id > daily_snapshots.updated_by_device_id)`
      )
      .bind(deviceId, accountId)
      .run();
    await db.prepare(`DELETE FROM daily_snapshots WHERE account_id = ?1`).bind(deviceId).run();
    return;
  }

  if (tableName === "garden_snapshots") {
    await db
      .prepare(
        `INSERT INTO garden_snapshots (
           account_id,
           snapshot_json,
           updated_at,
           updated_by_device_id
         )
         SELECT
           ?2,
           snapshot_json,
           updated_at,
           updated_by_device_id
         FROM garden_snapshots
         WHERE account_id = ?1
         ON CONFLICT(account_id)
         DO UPDATE SET
           snapshot_json = excluded.snapshot_json,
           updated_at = excluded.updated_at,
           updated_by_device_id = excluded.updated_by_device_id
         WHERE excluded.updated_at > garden_snapshots.updated_at
            OR (excluded.updated_at = garden_snapshots.updated_at
                AND excluded.updated_by_device_id > garden_snapshots.updated_by_device_id)`
      )
      .bind(deviceId, accountId)
      .run();
    await db.prepare(`DELETE FROM garden_snapshots WHERE account_id = ?1`).bind(deviceId).run();
    return;
  }

  await db
    .prepare(
      `INSERT INTO settings_snapshots (
         account_id,
         snapshot_json,
         updated_at,
         updated_by_device_id
       )
       SELECT
         ?2,
         snapshot_json,
         updated_at,
         updated_by_device_id
       FROM settings_snapshots
       WHERE account_id = ?1
       ON CONFLICT(account_id)
       DO UPDATE SET
         snapshot_json = excluded.snapshot_json,
         updated_at = excluded.updated_at,
         updated_by_device_id = excluded.updated_by_device_id
       WHERE excluded.updated_at > settings_snapshots.updated_at
          OR (excluded.updated_at = settings_snapshots.updated_at
              AND excluded.updated_by_device_id > settings_snapshots.updated_by_device_id)`
    )
    .bind(deviceId, accountId)
    .run();
  await db.prepare(`DELETE FROM settings_snapshots WHERE account_id = ?1`).bind(deviceId).run();
}

export async function getSyncAccountIdByDeviceId(db: D1Database, deviceId: string) {
  const row = await db
    .prepare(`SELECT account_id FROM sync_devices WHERE device_id = ?1`)
    .bind(deviceId)
    .first<{ account_id: string }>();
  return row?.account_id ?? null;
}

export async function ensureSyncDeviceBound(db: D1Database, accountId: string, deviceId: string) {
  const row = await db
    .prepare(`SELECT account_id FROM sync_devices WHERE device_id = ?1`)
    .bind(deviceId)
    .first<{ account_id: string }>();
  if (!row || row.account_id !== accountId) {
    throw new HttpError(403, "The device is not bound to this sync account");
  }
}

export async function purgeExpiredPairCodes(db: D1Database, now: string) {
  await db.prepare(`DELETE FROM pair_codes WHERE expires_at < ?1 OR used_at IS NOT NULL`).bind(now).run();
}

export async function purgeOldDailySnapshots(db: D1Database, accountId: string, cutoffDayKey: string) {
  await db
    .prepare(`DELETE FROM daily_snapshots WHERE account_id = ?1 AND day_key < ?2`)
    .bind(accountId, cutoffDayKey)
    .run();
}
