import {
  dayKeyDaysAgo,
  isoNow,
  readBody,
  requireAccountId,
  requireDayKey,
  requireDeviceId,
  requireIsoDateTime,
  normalizeOptionalAccountId,
  normalizePairCode,
  generatePairCode,
  HttpError
} from "./common.ts";
import type { AppContext } from "./common.ts";
import {
  bindDeviceToSyncAccount,
  ensureSyncAccountExists,
  ensureSyncDeviceBound,
  getSyncAccountIdByDeviceId,
  purgeExpiredPairCodes,
  purgeOldDailySnapshots
} from "./identity.ts";

export type DailySnapshotPayload = {
  dayKey: string;
  snapshot: unknown;
  updatedAt: string;
  updatedByDeviceId: string;
};

export type GardenSnapshotPayload = {
  snapshot: unknown;
  updatedAt: string;
  updatedByDeviceId: string;
};

export type SettingsSnapshotPayload = {
  snapshot: unknown;
  updatedAt: string;
  updatedByDeviceId: string;
};

export async function handleSyncBootstrap(ctx: AppContext) {
  const body = await readBody<{ deviceId?: string; accountId?: string }>(ctx.request);
  const deviceId = requireDeviceId(body.deviceId);
  const now = isoNow();
  let accountId = normalizeOptionalAccountId(body.accountId);

  if (!accountId) {
    accountId = await getSyncAccountIdByDeviceId(ctx.env.DB, deviceId);
  }

  if (!accountId) {
    accountId = crypto.randomUUID();
    await ensureSyncAccountExists(ctx.env.DB, accountId, now);
  } else {
    await ensureSyncAccountExists(ctx.env.DB, accountId, now);
  }

  await bindDeviceToSyncAccount(ctx.env.DB, accountId, deviceId, now);
  return { accountId };
}

export async function handleCreatePairCode(ctx: AppContext) {
  const body = await readBody<{ accountId?: string; deviceId?: string }>(ctx.request);
  const accountId = requireAccountId(body.accountId);
  const deviceId = requireDeviceId(body.deviceId);
  const now = isoNow();
  await ensureSyncDeviceBound(ctx.env.DB, accountId, deviceId);
  await purgeExpiredPairCodes(ctx.env.DB, now);

  const code = generatePairCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await ctx.env.DB
    .prepare(
      `INSERT INTO pair_codes (code, account_id, created_by_device_id, expires_at, used_at, created_at)
       VALUES (?1, ?2, ?3, ?4, NULL, ?5)`
    )
    .bind(code, accountId, deviceId, expiresAt, now)
    .run();

  return {
    pairCode: code,
    expiresAt
  };
}

export async function handleBindPairCode(ctx: AppContext) {
  const body = await readBody<{ deviceId?: string; pairCode?: string }>(ctx.request);
  const deviceId = requireDeviceId(body.deviceId);
  const pairCode = normalizePairCode(body.pairCode);
  const now = isoNow();

  const row = await ctx.env.DB
    .prepare(
      `SELECT account_id, expires_at, used_at
       FROM pair_codes
       WHERE code = ?1`
    )
    .bind(pairCode)
    .first<{ account_id: string; expires_at: string; used_at: string | null }>();

  if (!row) {
    throw new HttpError(404, "Pair code not found");
  }
  if (row.used_at) {
    throw new HttpError(409, "Pair code has already been used");
  }
  if (row.expires_at <= now) {
    throw new HttpError(410, "Pair code has expired");
  }

  await bindDeviceToSyncAccount(ctx.env.DB, row.account_id, deviceId, now);
  await ctx.env.DB
    .prepare(`UPDATE pair_codes SET used_at = ?2 WHERE code = ?1`)
    .bind(pairCode, now)
    .run();

  return {
    accountId: row.account_id
  };
}

export async function handlePushDailySnapshots(ctx: AppContext) {
  const body = await readBody<{
    accountId?: string;
    deviceId?: string;
    snapshots?: DailySnapshotPayload[];
  }>(ctx.request);
  const accountId = requireAccountId(body.accountId);
  const deviceId = requireDeviceId(body.deviceId);
  const snapshots = Array.isArray(body.snapshots) ? body.snapshots : [];

  await ensureSyncDeviceBound(ctx.env.DB, accountId, deviceId);
  await persistDailySnapshots(ctx.env.DB, accountId, deviceId, snapshots);
  return { ok: true };
}

export async function handlePullDailySnapshots(ctx: AppContext) {
  const accountId = requireAccountId(ctx.url.searchParams.get("accountId"));
  const deviceId = requireDeviceId(ctx.url.searchParams.get("deviceId"));
  await ensureSyncDeviceBound(ctx.env.DB, accountId, deviceId);

  const result = await ctx.env.DB
    .prepare(
      `SELECT day_key, snapshot_json, updated_at, updated_by_device_id
       FROM daily_snapshots
       WHERE account_id = ?1 AND day_key >= ?2
       ORDER BY day_key DESC`
    )
    .bind(accountId, dayKeyDaysAgo(6))
    .all<{
      day_key: string;
      snapshot_json: string;
      updated_at: string;
      updated_by_device_id: string;
    }>();

  return {
    snapshots: (result.results ?? []).map((row) => ({
      dayKey: row.day_key,
      snapshot: JSON.parse(row.snapshot_json),
      updatedAt: row.updated_at,
      updatedByDeviceId: row.updated_by_device_id
    }))
  };
}

export async function handlePushGardenSnapshot(ctx: AppContext) {
  const body = await readBody<{
    accountId?: string;
    deviceId?: string;
    snapshot?: GardenSnapshotPayload;
  }>(ctx.request);
  const accountId = requireAccountId(body.accountId);
  const deviceId = requireDeviceId(body.deviceId);
  const snapshot = body.snapshot;
  if (!snapshot) {
    throw new HttpError(400, "snapshot is required");
  }

  await ensureSyncDeviceBound(ctx.env.DB, accountId, deviceId);
  await persistGardenSnapshot(ctx.env.DB, accountId, deviceId, snapshot);

  return { ok: true };
}

export async function handlePullGardenSnapshot(ctx: AppContext) {
  const accountId = requireAccountId(ctx.url.searchParams.get("accountId"));
  const deviceId = requireDeviceId(ctx.url.searchParams.get("deviceId"));
  await ensureSyncDeviceBound(ctx.env.DB, accountId, deviceId);

  const row = await ctx.env.DB
    .prepare(
      `SELECT snapshot_json, updated_at, updated_by_device_id
       FROM garden_snapshots
       WHERE account_id = ?1`
    )
    .bind(accountId)
    .first<{
      snapshot_json: string;
      updated_at: string;
      updated_by_device_id: string;
    }>();

  return {
    snapshot: row
      ? {
          snapshot: JSON.parse(row.snapshot_json),
          updatedAt: row.updated_at,
          updatedByDeviceId: row.updated_by_device_id
        }
      : null
  };
}

export async function handlePushSettingsSnapshot(ctx: AppContext) {
  const body = await readBody<{
    accountId?: string;
    deviceId?: string;
    snapshot?: SettingsSnapshotPayload;
  }>(ctx.request);
  const accountId = requireAccountId(body.accountId);
  const deviceId = requireDeviceId(body.deviceId);
  const snapshot = body.snapshot;
  if (!snapshot) {
    throw new HttpError(400, "snapshot is required");
  }

  await ensureSyncDeviceBound(ctx.env.DB, accountId, deviceId);
  await persistSettingsSnapshot(ctx.env.DB, accountId, deviceId, snapshot);

  return { ok: true };
}

export async function handlePullSettingsSnapshot(ctx: AppContext) {
  const accountId = requireAccountId(ctx.url.searchParams.get("accountId"));
  const deviceId = requireDeviceId(ctx.url.searchParams.get("deviceId"));
  await ensureSyncDeviceBound(ctx.env.DB, accountId, deviceId);

  const row = await ctx.env.DB
    .prepare(
      `SELECT snapshot_json, updated_at, updated_by_device_id
       FROM settings_snapshots
       WHERE account_id = ?1`
    )
    .bind(accountId)
    .first<{
      snapshot_json: string;
      updated_at: string;
      updated_by_device_id: string;
    }>();

  return {
    snapshot: row
      ? {
          snapshot: JSON.parse(row.snapshot_json),
          updatedAt: row.updated_at,
          updatedByDeviceId: row.updated_by_device_id
        }
      : null
  };
}

export async function handlePushSnapshotBundle(ctx: AppContext) {
  const body = await readBody<{
    accountId?: string;
    deviceId?: string;
    dailySnapshots?: DailySnapshotPayload[];
    gardenSnapshot?: GardenSnapshotPayload | null;
    settingsSnapshot?: SettingsSnapshotPayload | null;
  }>(ctx.request);
  const accountId = requireAccountId(body.accountId);
  const deviceId = requireDeviceId(body.deviceId);

  await ensureSyncDeviceBound(ctx.env.DB, accountId, deviceId);

  await persistDailySnapshots(
    ctx.env.DB,
    accountId,
    deviceId,
    Array.isArray(body.dailySnapshots) ? body.dailySnapshots : []
  );

  if (body.gardenSnapshot) {
    await persistGardenSnapshot(ctx.env.DB, accountId, deviceId, body.gardenSnapshot);
  }

  if (body.settingsSnapshot) {
    await persistSettingsSnapshot(ctx.env.DB, accountId, deviceId, body.settingsSnapshot);
  }

  return { ok: true };
}

export async function handlePullSnapshotBundle(ctx: AppContext) {
  const dailyResult = await handlePullDailySnapshots(ctx);
  const gardenResult = await handlePullGardenSnapshot(ctx);
  const settingsResult = await handlePullSettingsSnapshot(ctx);

  return {
    dailySnapshots: dailyResult.snapshots,
    gardenSnapshot: gardenResult.snapshot,
    settingsSnapshot: settingsResult.snapshot
  };
}

export async function persistDailySnapshots(
  db: D1Database,
  accountId: string,
  deviceId: string,
  snapshots: DailySnapshotPayload[]
) {
  for (const snapshot of snapshots) {
    const dayKey = requireDayKey(snapshot.dayKey);
    const updatedAt = requireIsoDateTime(snapshot.updatedAt, "updatedAt");
    const updatedByDeviceId = requireDeviceId(snapshot.updatedByDeviceId || deviceId);
    await db
      .prepare(
        `INSERT INTO daily_snapshots (
           account_id,
           day_key,
           snapshot_json,
           updated_at,
           updated_by_device_id
         ) VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(account_id, day_key)
         DO UPDATE SET
           snapshot_json = excluded.snapshot_json,
           updated_at = excluded.updated_at,
           updated_by_device_id = excluded.updated_by_device_id
         WHERE excluded.updated_at > daily_snapshots.updated_at
            OR (excluded.updated_at = daily_snapshots.updated_at
                AND excluded.updated_by_device_id > daily_snapshots.updated_by_device_id)`
      )
      .bind(
        accountId,
        dayKey,
        JSON.stringify(snapshot.snapshot ?? null),
        updatedAt,
        updatedByDeviceId
      )
      .run();
  }

  await purgeOldDailySnapshots(db, accountId, dayKeyDaysAgo(6));
}

export async function persistGardenSnapshot(
  db: D1Database,
  accountId: string,
  deviceId: string,
  snapshot: GardenSnapshotPayload
) {
  const updatedAt = requireIsoDateTime(snapshot.updatedAt, "updatedAt");
  const updatedByDeviceId = requireDeviceId(snapshot.updatedByDeviceId || deviceId);

  await db
    .prepare(
      `INSERT INTO garden_snapshots (account_id, snapshot_json, updated_at, updated_by_device_id)
       VALUES (?1, ?2, ?3, ?4)
       ON CONFLICT(account_id)
       DO UPDATE SET
         snapshot_json = excluded.snapshot_json,
         updated_at = excluded.updated_at,
         updated_by_device_id = excluded.updated_by_device_id
       WHERE excluded.updated_at > garden_snapshots.updated_at
          OR (excluded.updated_at = garden_snapshots.updated_at
              AND excluded.updated_by_device_id > garden_snapshots.updated_by_device_id)`
    )
    .bind(accountId, JSON.stringify(snapshot.snapshot ?? null), updatedAt, updatedByDeviceId)
    .run();
}

export async function persistSettingsSnapshot(
  db: D1Database,
  accountId: string,
  deviceId: string,
  snapshot: SettingsSnapshotPayload
) {
  const updatedAt = requireIsoDateTime(snapshot.updatedAt, "updatedAt");
  const updatedByDeviceId = requireDeviceId(snapshot.updatedByDeviceId || deviceId);

  await db
    .prepare(
      `INSERT INTO settings_snapshots (account_id, snapshot_json, updated_at, updated_by_device_id)
       VALUES (?1, ?2, ?3, ?4)
       ON CONFLICT(account_id)
       DO UPDATE SET
         snapshot_json = excluded.snapshot_json,
         updated_at = excluded.updated_at,
         updated_by_device_id = excluded.updated_by_device_id
       WHERE excluded.updated_at > settings_snapshots.updated_at
          OR (excluded.updated_at = settings_snapshots.updated_at
              AND excluded.updated_by_device_id > settings_snapshots.updated_by_device_id)`
    )
    .bind(accountId, JSON.stringify(snapshot.snapshot ?? null), updatedAt, updatedByDeviceId)
    .run();
}
