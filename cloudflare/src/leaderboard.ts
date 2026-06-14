import {
  HttpError,
  compareSemver,
  dayKeyDaysAgo,
  isoNow,
  normalizeCircleCode,
  normalizeCircleName,
  normalizeDisplayName,
  requireAccountId,
  requireDayKey,
  requireDeviceId,
  requireDisplayName,
  requireNonNegativeInt,
  requirePositiveInt,
  serializeUser,
  shortAccountId,
  readBody
} from "./common.ts";
import type { AppContext } from "./common.ts";
import { ensureLeaderboardAccountForDevice } from "./identity.ts";

export type UserRecord = {
  account_id: string;
  display_name: string | null;
};

export type CircleRecord = {
  circle_code: string;
  circle_name: string | null;
  created_by_account_id: string;
};

export type LeaderboardRow = {
  accountId: string;
  deviceId: string;
  displayName: string;
  actualIntakeMl: number;
  targetMl: number;
  progressPercent: number;
};


export async function handleBootstrap(ctx: AppContext) {
  const body = await readBody<{ deviceId?: string; displayName?: string }>(ctx.request);
  const deviceId = requireDeviceId(body.deviceId);
  const displayName = normalizeDisplayName(body.displayName);
  const now = isoNow();
  const accountId = await ensureLeaderboardAccountForDevice(ctx.env.DB, deviceId, now);

  const existing = await getUser(ctx.env.DB, accountId);
  if (!existing) {
    await ctx.env.DB
      .prepare(
        `INSERT INTO users (account_id, display_name, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?3)`
      )
      .bind(accountId, displayName, now)
      .run();
  } else if (displayName && displayName !== existing.display_name) {
    await ctx.env.DB
      .prepare(`UPDATE users SET display_name = ?2, updated_at = ?3 WHERE account_id = ?1`)
      .bind(accountId, displayName, now)
      .run();
  }

  const user = await getUser(ctx.env.DB, accountId);
  const circles = await listCirclesByAccountId(ctx.env.DB, accountId);

  return {
    user: serializeUser(user ?? { account_id: accountId, display_name: displayName }),
    circles
  };
}

export async function handleProfile(ctx: AppContext) {
  const body = await readBody<{ deviceId?: string; displayName?: string }>(ctx.request);
  const deviceId = requireDeviceId(body.deviceId);
  const displayName = requireDisplayName(body.displayName);
  const now = isoNow();
  const accountId = await ensureLeaderboardAccountForDevice(ctx.env.DB, deviceId, now);

  await ensureUserExists(ctx.env.DB, accountId);
  await ctx.env.DB
    .prepare(`UPDATE users SET display_name = ?2, updated_at = ?3 WHERE account_id = ?1`)
    .bind(accountId, displayName, now)
    .run();

  return {
    user: serializeUser({
      account_id: accountId,
      display_name: displayName
    })
  };
}

export async function handleCreateCircle(ctx: AppContext) {
  const body = await readBody<{ deviceId?: string; circleName?: string }>(ctx.request);
  const deviceId = requireDeviceId(body.deviceId);
  const circleName = normalizeCircleName(body.circleName);
  const now = isoNow();
  const accountId = await ensureLeaderboardAccountForDevice(ctx.env.DB, deviceId, now);

  await ensureUserExists(ctx.env.DB, accountId);

  let circleCode = "";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    circleCode = generateCircleCode();
    const exists = await getCircle(ctx.env.DB, circleCode);
    if (!exists) {
      break;
    }
    circleCode = "";
  }

  if (!circleCode) {
    throw new HttpError(500, "Failed to allocate a circle code");
  }

    await ctx.env.DB
    .prepare(
      `INSERT INTO circles (circle_code, circle_name, created_by_account_id, created_at)
       VALUES (?1, ?2, ?3, ?4)`
    )
    .bind(circleCode, circleName, accountId, now)
    .run();

  await ctx.env.DB
    .prepare(
      `INSERT OR IGNORE INTO circle_members (circle_code, account_id, joined_at)
       VALUES (?1, ?2, ?3)`
    )
    .bind(circleCode, accountId, now)
    .run();

  return {
    circleCode,
    circleName
  };
}

export async function handleJoinCircle(ctx: AppContext) {
  const body = await readBody<{ deviceId?: string; circleCode?: string }>(ctx.request);
  const deviceId = requireDeviceId(body.deviceId);
  const circleCode = normalizeCircleCode(body.circleCode);
  const now = isoNow();
  const accountId = await ensureLeaderboardAccountForDevice(ctx.env.DB, deviceId, now);

  await ensureUserExists(ctx.env.DB, accountId);
  const circle = await getCircle(ctx.env.DB, circleCode);
  if (!circle) {
    throw new HttpError(404, "Circle not found");
  }

  await ctx.env.DB
    .prepare(
      `INSERT OR IGNORE INTO circle_members (circle_code, account_id, joined_at)
       VALUES (?1, ?2, ?3)`
    )
    .bind(circleCode, accountId, now)
    .run();

  return {
    circleCode: circle.circle_code,
    circleName: circle.circle_name
  };
}

export async function handleListCircles(ctx: AppContext) {
  const deviceId = requireDeviceId(ctx.url.searchParams.get("deviceId"));
  const accountId = await ensureLeaderboardAccountForDevice(ctx.env.DB, deviceId, isoNow());
  await ensureUserExists(ctx.env.DB, accountId);
  return {
    circles: await listCirclesByAccountId(ctx.env.DB, accountId)
  };
}

export async function handleRemoveCircleMember(ctx: AppContext) {
  const body = await readBody<{ deviceId?: string; circleCode?: string; targetAccountId?: string }>(
    ctx.request
  );
  const deviceId = requireDeviceId(body.deviceId);
  const circleCode = normalizeCircleCode(body.circleCode);
  const targetAccountId = requireAccountId(body.targetAccountId);
  const now = isoNow();
  const accountId = await ensureLeaderboardAccountForDevice(ctx.env.DB, deviceId, now);
  const circle = await getCircle(ctx.env.DB, circleCode);

  if (!circle) {
    throw new HttpError(404, "Circle not found");
  }
  if (circle.created_by_account_id !== accountId) {
    throw new HttpError(403, "Only the circle owner can remove members");
  }
  if (targetAccountId === accountId) {
    throw new HttpError(400, "The circle owner cannot remove themselves");
  }

  await ensureCircleMembership(ctx.env.DB, circleCode, targetAccountId);
  await removeCircleMembership(ctx.env.DB, circleCode, targetAccountId);
  return { ok: true };
}

export async function handleLeaveCircle(ctx: AppContext) {
  const body = await readBody<{ deviceId?: string; circleCode?: string }>(ctx.request);
  const deviceId = requireDeviceId(body.deviceId);
  const circleCode = normalizeCircleCode(body.circleCode);
  const now = isoNow();
  const accountId = await ensureLeaderboardAccountForDevice(ctx.env.DB, deviceId, now);
  const circle = await getCircle(ctx.env.DB, circleCode);

  if (!circle) {
    throw new HttpError(404, "Circle not found");
  }
  await ensureCircleMembership(ctx.env.DB, circleCode, accountId);
  if (circle.created_by_account_id === accountId) {
    throw new HttpError(403, "The circle owner cannot leave directly");
  }

  await removeCircleMembership(ctx.env.DB, circleCode, accountId);
  return { ok: true };
}

export async function handleDisbandCircle(ctx: AppContext) {
  const body = await readBody<{ deviceId?: string; circleCode?: string }>(ctx.request);
  const deviceId = requireDeviceId(body.deviceId);
  const circleCode = normalizeCircleCode(body.circleCode);
  const now = isoNow();
  const accountId = await ensureLeaderboardAccountForDevice(ctx.env.DB, deviceId, now);
  const circle = await getCircle(ctx.env.DB, circleCode);

  if (!circle) {
    throw new HttpError(404, "Circle not found");
  }
  if (circle.created_by_account_id !== accountId) {
    throw new HttpError(403, "Only the circle owner can disband the circle");
  }

  const memberCount = await getCircleMemberCount(ctx.env.DB, circleCode);
  if (memberCount !== 1) {
    throw new HttpError(403, "Remove other members before disbanding the circle");
  }

  await ctx.env.DB.prepare(`DELETE FROM circle_members WHERE circle_code = ?1`).bind(circleCode).run();
  await ctx.env.DB.prepare(`DELETE FROM circles WHERE circle_code = ?1`).bind(circleCode).run();
  return { ok: true };
}

export async function handleUpsertStats(ctx: AppContext) {
  const body = await readBody<{
    deviceId?: string;
    circleCode?: string;
    dayKey?: string;
    actualIntakeMl?: number;
    targetMl?: number;
  }>(ctx.request);

  const deviceId = requireDeviceId(body.deviceId);
  const circleCode = normalizeCircleCode(body.circleCode);
  const dayKey = requireDayKey(body.dayKey);
  const actualIntakeMl = requireNonNegativeInt(body.actualIntakeMl, "actualIntakeMl");
  const targetMl = requirePositiveInt(body.targetMl, "targetMl");
  const now = isoNow();
  const accountId = await ensureLeaderboardAccountForDevice(ctx.env.DB, deviceId, now);

  await ensureCircleMembership(ctx.env.DB, circleCode, accountId);

  await ctx.env.DB
    .prepare(
      `INSERT INTO daily_stats (
         circle_code,
         account_id,
         day_key,
         actual_intake_ml,
         target_ml,
         updated_at
       ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
       ON CONFLICT(circle_code, account_id, day_key)
       DO UPDATE SET
         actual_intake_ml = excluded.actual_intake_ml,
         target_ml = excluded.target_ml,
         updated_at = excluded.updated_at`
    )
    .bind(circleCode, accountId, dayKey, actualIntakeMl, targetMl, now)
    .run();

  return {
    ok: true
  };
}

export async function handleLeaderboard(ctx: AppContext) {
  const circleCode = normalizeCircleCode(ctx.url.searchParams.get("circleCode"));
  const dayKey = requireDayKey(ctx.url.searchParams.get("dayKey"));
  const metric = ctx.url.searchParams.get("metric") === "progress" ? "progress" : "intake";

  const circle = await getCircle(ctx.env.DB, circleCode);
  if (!circle) {
    throw new HttpError(404, "Circle not found");
  }

  const result = await ctx.env.DB
    .prepare(
      `SELECT
         cm.account_id AS account_id,
         u.display_name AS display_name,
         COALESCE(CAST(json_extract(snapshot.snapshot_json, '$.actualIntakeMl') AS INTEGER), 0) AS actual_intake_ml,
         COALESCE(CAST(json_extract(snapshot.snapshot_json, '$.targetMl') AS INTEGER), 0) AS target_ml
       FROM circle_members cm
       LEFT JOIN users u
         ON u.account_id = cm.account_id
       LEFT JOIN daily_snapshots snapshot
         ON snapshot.account_id = cm.account_id
        AND snapshot.day_key = ?2
       WHERE cm.circle_code = ?1`
    )
    .bind(circleCode, dayKey)
    .all<{
      account_id: string;
      display_name: string | null;
      actual_intake_ml: number;
      target_ml: number;
    }>();

  const rows = (result.results ?? []).map<LeaderboardRow>((row) => {
    const progressPercent =
      row.target_ml > 0
        ? Math.min(999, Math.round((row.actual_intake_ml / row.target_ml) * 100))
        : 0;

    return {
      accountId: row.account_id,
      deviceId: row.account_id,
      displayName: row.display_name?.trim() || shortAccountId(row.account_id),
      actualIntakeMl: row.actual_intake_ml,
      targetMl: row.target_ml,
      progressPercent
    };
  });

  rows.sort((left, right) => {
    if (metric === "progress") {
      if (right.progressPercent !== left.progressPercent) {
        return right.progressPercent - left.progressPercent;
      }
      return right.actualIntakeMl - left.actualIntakeMl;
    }

    if (right.actualIntakeMl !== left.actualIntakeMl) {
      return right.actualIntakeMl - left.actualIntakeMl;
    }

    return right.progressPercent - left.progressPercent;
  });

  return {
    circleCode,
    circleName: circle.circle_name,
    dayKey,
    metric,
    ownerAccountId: circle.created_by_account_id,
    memberCount: rows.length,
    leaderboard: rows.map((row, index) => ({
      rank: index + 1,
      ...row
    }))
  };
}

export async function handleDailyActivity(ctx: AppContext) {
  const dayKey = requireDayKey(ctx.url.searchParams.get("dayKey"));
  const row = await ctx.env.DB
    .prepare(
      `SELECT COUNT(*) AS active_count
       FROM daily_snapshots
       WHERE day_key = ?1`
    )
    .bind(dayKey)
    .first<{ active_count: number }>();

  return {
    dayKey,
    activeCount: row?.active_count ?? 0
  };
}

export async function handleCircleMemberGarden(ctx: AppContext) {
  const deviceId = requireDeviceId(ctx.url.searchParams.get("deviceId"));
  const circleCode = normalizeCircleCode(ctx.url.searchParams.get("circleCode"));
  const targetAccountId = requireAccountId(ctx.url.searchParams.get("targetAccountId"));
  const rawRangeDays = Number(ctx.url.searchParams.get("rangeDays") ?? 28);
  const rangeDays = Number.isFinite(rawRangeDays)
    ? Math.min(28, Math.max(1, Math.floor(rawRangeDays)))
    : 28;
  const accountId = await ensureLeaderboardAccountForDevice(ctx.env.DB, deviceId, isoNow());

  await ensureCircleMembership(ctx.env.DB, circleCode, accountId);
  await ensureCircleMembership(ctx.env.DB, circleCode, targetAccountId);

  const cutoffDayKey = dayKeyDaysAgo(rangeDays - 1);
  const dailyResult = await ctx.env.DB
    .prepare(
      `SELECT snapshot_json
       FROM daily_snapshots
       WHERE account_id = ?1
         AND day_key >= ?2
       ORDER BY day_key DESC`
    )
    .bind(targetAccountId, cutoffDayKey)
    .all<{ snapshot_json: string }>();
  const gardenRow = await ctx.env.DB
    .prepare(
      `SELECT snapshot_json, updated_at
       FROM garden_snapshots
       WHERE account_id = ?1`
    )
    .bind(targetAccountId)
    .first<{ snapshot_json: string; updated_at: string }>();

  return {
    accountId: targetAccountId,
    history: (dailyResult.results ?? []).map((row) => JSON.parse(row.snapshot_json)),
    garden: gardenRow ? JSON.parse(gardenRow.snapshot_json) : null,
    gardenUpdatedAt: gardenRow?.updated_at ?? null
  };
}


export async function getUser(db: D1Database, deviceId: string) {
  const result = await db
    .prepare(`SELECT account_id, display_name FROM users WHERE account_id = ?1`)
    .bind(deviceId)
    .first<UserRecord>();
  return result ?? null;
}

export async function ensureUserExists(db: D1Database, accountId: string) {
  const existing = await getUser(db, accountId);
  if (existing) {
    return;
  }

  const now = isoNow();
  await db
    .prepare(
      `INSERT INTO users (account_id, display_name, created_at, updated_at)
       VALUES (?1, NULL, ?2, ?2)`
    )
    .bind(accountId, now)
    .run();
}

export async function getCircle(db: D1Database, circleCode: string) {
  const result = await db
    .prepare(
      `SELECT circle_code, circle_name, created_by_account_id
       FROM circles
       WHERE circle_code = ?1`
    )
    .bind(circleCode)
    .first<CircleRecord>();
  return result ?? null;
}

export async function listCirclesByAccountId(db: D1Database, accountId: string) {
  const result = await db
    .prepare(
      `SELECT c.circle_code, c.circle_name
       FROM circle_members cm
       INNER JOIN circles c
         ON c.circle_code = cm.circle_code
       WHERE cm.account_id = ?1
       ORDER BY c.created_at DESC`
    )
    .bind(accountId)
    .all<{ circle_code: string; circle_name: string | null }>();

  return (result.results ?? []).map((row) => ({
    circleCode: row.circle_code,
    circleName: row.circle_name
  }));
}

export async function ensureCircleMembership(db: D1Database, circleCode: string, accountId: string) {
  const result = await db
    .prepare(
      `SELECT 1
       FROM circle_members
       WHERE circle_code = ?1 AND account_id = ?2`
    )
    .bind(circleCode, accountId)
    .first();

  if (!result) {
    throw new HttpError(403, "The account has not joined this circle");
  }
}

export async function getCircleMemberCount(db: D1Database, circleCode: string) {
  const row = await db
    .prepare(`SELECT COUNT(*) AS member_count FROM circle_members WHERE circle_code = ?1`)
    .bind(circleCode)
    .first<{ member_count: number }>();
  return Number(row?.member_count ?? 0);
}

export async function removeCircleMembership(db: D1Database, circleCode: string, accountId: string) {
  await db
    .prepare(`DELETE FROM circle_members WHERE circle_code = ?1 AND account_id = ?2`)
    .bind(circleCode, accountId)
    .run();
}
