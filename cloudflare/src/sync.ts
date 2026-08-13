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

const ACHIEVEMENT_IDS = new Set([
  "first_sip",
  "first_goal",
  "first_reminder_answer",
  "drink_streak_7",
  "goal_streak_7",
  "drink_streak_30",
  "first_plant",
  "first_harvest",
  "harvest_10",
  "same_crop_5",
  "crop_varieties_3",
  "first_background"
] as const);

const ACHIEVEMENT_EVIDENCE_KINDS = new Set([
  "daily",
  "streak",
  "garden",
  "collection",
  "background"
] as const);

const ACHIEVEMENT_EVIDENCE_FIELDS = new Set([
  "kind",
  "startDay",
  "endDay",
  "cropType",
  "value"
]);

const ACHIEVEMENT_RECEIPT_FIELDS = new Set([
  "achievementId",
  "unlockedAt",
  "evidence"
]);

export type AchievementEvidencePayload = {
  kind: "daily" | "streak" | "garden" | "collection" | "background";
  startDay?: string;
  endDay?: string;
  cropType?: string;
  value?: number;
};

export type AchievementReceiptPayload = {
  achievementId: string;
  unlockedAt: string;
  evidence: AchievementEvidencePayload;
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
    achievementReceipts?: unknown;
  }>(ctx.request);
  const accountId = requireAccountId(body.accountId);
  const deviceId = requireDeviceId(body.deviceId);

  await ensureSyncDeviceBound(ctx.env.DB, accountId, deviceId);
  const achievementReceipts = validateAchievementReceipts(body.achievementReceipts);

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

  await persistAchievementReceipts(
    ctx.env.DB,
    accountId,
    deviceId,
    achievementReceipts
  );

  return { ok: true };
}

export async function handlePullSnapshotBundle(ctx: AppContext) {
  const dailyResult = await handlePullDailySnapshots(ctx);
  const gardenResult = await handlePullGardenSnapshot(ctx);
  const settingsResult = await handlePullSettingsSnapshot(ctx);
  const achievementResult = await handlePullAchievementReceipts(ctx);

  return {
    dailySnapshots: dailyResult.snapshots,
    gardenSnapshot: gardenResult.snapshot,
    settingsSnapshot: settingsResult.snapshot,
    achievementReceipts: achievementResult.achievementReceipts
  };
}

export async function handlePullAchievementReceipts(ctx: AppContext) {
  const accountId = requireAccountId(ctx.url.searchParams.get("accountId"));
  const deviceId = requireDeviceId(ctx.url.searchParams.get("deviceId"));
  await ensureSyncDeviceBound(ctx.env.DB, accountId, deviceId);

  const result = await ctx.env.DB
    .prepare(
      `SELECT achievement_id, unlocked_at, evidence_json
       FROM achievement_receipts
       WHERE account_id = ?1
       ORDER BY achievement_id ASC`
    )
    .bind(accountId)
    .all<{
      achievement_id: string;
      unlocked_at: string;
      evidence_json: string;
    }>();

  return {
    achievementReceipts: (result.results ?? []).map((row) => ({
      achievementId: row.achievement_id,
      unlockedAt: row.unlocked_at,
      evidence: JSON.parse(row.evidence_json) as AchievementEvidencePayload
    }))
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireStrictDayKey(value: unknown, fieldName: string) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new HttpError(400, `${fieldName} must be YYYY-MM-DD`);
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new HttpError(400, `${fieldName} must be a valid calendar day`);
  }
  return value;
}

function requireStrictIsoDateTime(value: unknown, fieldName: string) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
  ) {
    throw new HttpError(400, `${fieldName} must be an ISO datetime string`);
  }
  requireStrictDayKey(value.slice(0, 10), `${fieldName} date`);
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    throw new HttpError(400, `${fieldName} must be an ISO datetime string`);
  }
  return new Date(timestamp).toISOString();
}

export function validateAchievementReceipt(value: unknown): AchievementReceiptPayload {
  if (!isRecord(value)) {
    throw new HttpError(400, "achievement receipt must be an object");
  }
  for (const field of Object.keys(value)) {
    if (!ACHIEVEMENT_RECEIPT_FIELDS.has(field)) {
      throw new HttpError(400, `achievement receipt has unknown field: ${field}`);
    }
  }

  const achievementId = value.achievementId;
  if (typeof achievementId !== "string" || !ACHIEVEMENT_IDS.has(achievementId as never)) {
    throw new HttpError(400, "achievementId is not recognized");
  }
  const unlockedAt = requireStrictIsoDateTime(value.unlockedAt, "unlockedAt");
  const rawEvidence = value.evidence;
  if (!isRecord(rawEvidence)) {
    throw new HttpError(400, "evidence must be an object");
  }
  for (const field of Object.keys(rawEvidence)) {
    if (!ACHIEVEMENT_EVIDENCE_FIELDS.has(field)) {
      throw new HttpError(400, `evidence has unknown field: ${field}`);
    }
  }
  if (
    typeof rawEvidence.kind !== "string" ||
    !ACHIEVEMENT_EVIDENCE_KINDS.has(rawEvidence.kind as never)
  ) {
    throw new HttpError(400, "evidence.kind is not recognized");
  }

  const evidence: AchievementEvidencePayload = {
    kind: rawEvidence.kind as AchievementEvidencePayload["kind"]
  };
  if (rawEvidence.startDay !== undefined && rawEvidence.startDay !== null) {
    evidence.startDay = requireStrictDayKey(rawEvidence.startDay, "evidence.startDay");
  }
  if (rawEvidence.endDay !== undefined && rawEvidence.endDay !== null) {
    evidence.endDay = requireStrictDayKey(rawEvidence.endDay, "evidence.endDay");
  }
  if (rawEvidence.cropType !== undefined && rawEvidence.cropType !== null) {
    if (
      typeof rawEvidence.cropType !== "string" ||
      !rawEvidence.cropType.trim() ||
      rawEvidence.cropType.length > 128
    ) {
      throw new HttpError(400, "evidence.cropType must be a non-empty string");
    }
    evidence.cropType = rawEvidence.cropType;
  }
  if (rawEvidence.value !== undefined && rawEvidence.value !== null) {
    if (
      typeof rawEvidence.value !== "number" ||
      !Number.isSafeInteger(rawEvidence.value) ||
      rawEvidence.value < 0 ||
      rawEvidence.value > 4_294_967_295
    ) {
      throw new HttpError(400, "evidence.value must be a non-negative 32-bit integer");
    }
    evidence.value = rawEvidence.value;
  }

  const evidenceValue = evidence.value ?? 0;
  const streakDays = evidence.startDay && evidence.endDay
    ? (Date.parse(`${evidence.endDay}T00:00:00Z`) - Date.parse(`${evidence.startDay}T00:00:00Z`)) /
        86_400_000 +
      1
    : 0;
  const semanticMatch = (() => {
    switch (achievementId) {
      case "first_sip":
      case "first_goal":
      case "first_reminder_answer":
        return evidence.kind === "daily" && Boolean(evidence.endDay) && evidenceValue >= 1;
      case "drink_streak_7":
      case "goal_streak_7":
        return evidence.kind === "streak" && streakDays === 7 && evidenceValue >= 7;
      case "drink_streak_30":
        return evidence.kind === "streak" && streakDays === 30 && evidenceValue >= 30;
      case "first_plant":
        return (evidence.kind === "garden" || evidence.kind === "collection") && evidenceValue >= 1;
      case "first_harvest":
        return evidence.kind === "collection" && evidenceValue >= 1;
      case "harvest_10":
        return evidence.kind === "collection" && evidenceValue >= 10;
      case "same_crop_5":
        return evidence.kind === "collection" && Boolean(evidence.cropType) && evidenceValue >= 5;
      case "crop_varieties_3":
        return evidence.kind === "collection" && evidenceValue >= 3;
      case "first_background":
        return evidence.kind === "background" && evidenceValue >= 1;
      default:
        return false;
    }
  })();
  if (!semanticMatch) {
    throw new HttpError(400, "evidence does not satisfy the achievement");
  }

  return { achievementId, unlockedAt, evidence };
}

function validateAchievementReceipts(value: unknown) {
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value) || value.length > ACHIEVEMENT_IDS.size) {
    throw new HttpError(400, "achievementReceipts must be an array of at most 12 items");
  }
  return value.map(validateAchievementReceipt);
}

export async function persistAchievementReceipts(
  db: D1Database,
  accountId: string,
  deviceId: string,
  receipts: AchievementReceiptPayload[]
) {
  const updatedAt = isoNow();
  for (const receipt of receipts) {
    await db
      .prepare(
        `INSERT INTO achievement_receipts (
           account_id,
           achievement_id,
           unlocked_at,
           evidence_json,
           created_by_device_id,
           updated_at
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
         ON CONFLICT(account_id, achievement_id)
         DO UPDATE SET
           unlocked_at = excluded.unlocked_at,
           evidence_json = excluded.evidence_json,
           created_by_device_id = excluded.created_by_device_id,
           updated_at = excluded.updated_at
         WHERE excluded.unlocked_at < achievement_receipts.unlocked_at`
      )
      .bind(
        accountId,
        receipt.achievementId,
        receipt.unlockedAt,
        JSON.stringify(receipt.evidence),
        deviceId,
        updatedAt
      )
      .run();
  }
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
