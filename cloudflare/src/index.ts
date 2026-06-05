type Env = {
  DB: D1Database;
  SYNC_BACKUPS: R2Bucket;
  WECHAT_APP_ID?: string;
  WECHAT_APP_SECRET?: string;
};

type AppContext = {
  env: Env;
  request: Request;
  url: URL;
};

type ApiError = {
  error: string;
};

type UserRecord = {
  account_id: string;
  display_name: string | null;
};

type CircleRecord = {
  circle_code: string;
  circle_name: string | null;
  created_by_account_id: string;
};

type LeaderboardRow = {
  accountId: string;
  deviceId: string;
  displayName: string;
  actualIntakeMl: number;
  targetMl: number;
  progressPercent: number;
};

type ReleaseRecord = {
  latest_version: string;
  release_url: string;
  notes: string | null;
  published_at: string;
};

type DailySnapshotPayload = {
  dayKey: string;
  snapshot: unknown;
  updatedAt: string;
  updatedByDeviceId: string;
};

type GardenSnapshotPayload = {
  snapshot: unknown;
  updatedAt: string;
  updatedByDeviceId: string;
};

type SettingsSnapshotPayload = {
  snapshot: unknown;
  updatedAt: string;
  updatedByDeviceId: string;
};

type BackupManifestRecord = {
  object_key: string;
  created_at: string;
  device_id: string;
  size_bytes: number;
};

type WeChatCode2SessionResponse = {
  openid?: string;
  session_key?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
};

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type"
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const ctx: AppContext = { env, request, url };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: JSON_HEADERS });
    }

    try {
      if (request.method === "GET" && url.pathname === "/health") {
        return json({ ok: true, service: "drink-water-leaderboard" });
      }

      if (url.pathname === "/api/wechat/session") {
        return json(await handleWeChatSession(ctx));
      }

      if (request.method === "POST" && url.pathname === "/api/bootstrap") {
        return json(await handleBootstrap(ctx));
      }

      if (request.method === "POST" && url.pathname === "/api/profile") {
        return json(await handleProfile(ctx));
      }

      if (request.method === "POST" && url.pathname === "/api/circle/create") {
        return json(await handleCreateCircle(ctx));
      }

      if (request.method === "POST" && url.pathname === "/api/circle/join") {
        return json(await handleJoinCircle(ctx));
      }

      if (request.method === "POST" && url.pathname === "/api/circle/remove-member") {
        return json(await handleRemoveCircleMember(ctx));
      }

      if (request.method === "POST" && url.pathname === "/api/circle/leave") {
        return json(await handleLeaveCircle(ctx));
      }

      if (request.method === "POST" && url.pathname === "/api/circle/disband") {
        return json(await handleDisbandCircle(ctx));
      }

      if (request.method === "GET" && url.pathname === "/api/circles") {
        return json(await handleListCircles(ctx));
      }

      if (request.method === "POST" && url.pathname === "/api/stats/upsert") {
        return json(await handleUpsertStats(ctx));
      }

      if (request.method === "GET" && url.pathname === "/api/leaderboard") {
        return json(await handleLeaderboard(ctx));
      }

      if (request.method === "GET" && url.pathname === "/api/update-check") {
        return json(await handleUpdateCheck(ctx));
      }

      if (request.method === "POST" && url.pathname === "/api/sync/bootstrap") {
        return json(await handleSyncBootstrap(ctx));
      }

      if (request.method === "POST" && url.pathname === "/api/sync/pair-code/create") {
        return json(await handleCreatePairCode(ctx));
      }

      if (request.method === "POST" && url.pathname === "/api/sync/pair-code/bind") {
        return json(await handleBindPairCode(ctx));
      }

      if (request.method === "POST" && url.pathname === "/api/sync/daily/push") {
        return json(await handlePushDailySnapshots(ctx));
      }

      if (request.method === "GET" && url.pathname === "/api/sync/daily/pull") {
        return json(await handlePullDailySnapshots(ctx));
      }

      if (request.method === "POST" && url.pathname === "/api/sync/garden/push") {
        return json(await handlePushGardenSnapshot(ctx));
      }

      if (request.method === "GET" && url.pathname === "/api/sync/garden") {
        return json(await handlePullGardenSnapshot(ctx));
      }

      if (request.method === "POST" && url.pathname === "/api/sync/settings/push") {
        return json(await handlePushSettingsSnapshot(ctx));
      }

      if (request.method === "GET" && url.pathname === "/api/sync/settings") {
        return json(await handlePullSettingsSnapshot(ctx));
      }

      if (request.method === "POST" && url.pathname === "/api/backup/upload") {
        return json(await handleUploadBackup(ctx));
      }

      if (request.method === "GET" && url.pathname === "/api/backup/latest") {
        return json(await handleLatestBackup(ctx));
      }

      if (request.method === "POST" && url.pathname === "/api/backup/restore") {
        return json(await handleRestoreBackup(ctx));
      }

      return json<ApiError>({ error: "Not found" }, 404);
    } catch (error) {
      console.error("[worker] request failed", {
        path: url.pathname,
        method: request.method,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : null
      });
      const message = error instanceof HttpError ? error.message : "Internal server error";
      const status = error instanceof HttpError ? error.status : 500;
      return json<ApiError>({ error: message }, status);
    }
  }
};

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function handleWeChatSession(ctx: AppContext) {
  if (ctx.request.method !== "POST") {
    throw new HttpError(405, "Method not allowed");
  }

  const body = await readBody<{ code?: string }>(ctx.request);
  const code = requireWeChatLoginCode(body.code);
  const appId = String(ctx.env.WECHAT_APP_ID ?? "").trim();
  const appSecret = String(ctx.env.WECHAT_APP_SECRET ?? "").trim();

  if (!appId || !appSecret) {
    console.error("[worker] WeChat login is not configured", {
      hasAppId: Boolean(appId),
      hasAppSecret: Boolean(appSecret)
    });
    throw new HttpError(500, "WeChat login is not configured");
  }

  const sessionUrl = new URL("https://api.weixin.qq.com/sns/jscode2session");
  sessionUrl.search = new URLSearchParams({
    appid: appId,
    secret: appSecret,
    js_code: code,
    grant_type: "authorization_code"
  }).toString();

  let response: Response;
  try {
    response = await fetch(sessionUrl);
  } catch (error) {
    console.error("[worker] WeChat jscode2session request failed", {
      error: error instanceof Error ? error.message : String(error)
    });
    throw new HttpError(502, "Failed to exchange WeChat login code");
  }

  if (!response.ok) {
    console.error("[worker] WeChat jscode2session HTTP error", {
      status: response.status
    });
    throw new HttpError(502, "Failed to exchange WeChat login code");
  }

  let payload: WeChatCode2SessionResponse;
  try {
    payload = (await response.json()) as WeChatCode2SessionResponse;
  } catch {
    console.error("[worker] WeChat jscode2session returned invalid JSON");
    throw new HttpError(502, "Failed to exchange WeChat login code");
  }

  if (payload.errcode !== undefined && Number(payload.errcode) !== 0) {
    console.error("[worker] WeChat jscode2session returned an error", {
      errcode: payload.errcode,
      errmsg: sanitizeLogMessage(payload.errmsg)
    });
    throw new HttpError(502, "Failed to exchange WeChat login code");
  }

  const openid = String(payload.openid ?? "").trim();
  if (!openid) {
    console.error("[worker] WeChat jscode2session response missed openid");
    throw new HttpError(502, "Failed to exchange WeChat login code");
  }

  return { openid };
}

async function handleBootstrap(ctx: AppContext) {
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

async function handleProfile(ctx: AppContext) {
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

async function handleCreateCircle(ctx: AppContext) {
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

async function handleJoinCircle(ctx: AppContext) {
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

async function handleListCircles(ctx: AppContext) {
  const deviceId = requireDeviceId(ctx.url.searchParams.get("deviceId"));
  const accountId = await ensureLeaderboardAccountForDevice(ctx.env.DB, deviceId, isoNow());
  await ensureUserExists(ctx.env.DB, accountId);
  return {
    circles: await listCirclesByAccountId(ctx.env.DB, accountId)
  };
}

async function handleRemoveCircleMember(ctx: AppContext) {
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

async function handleLeaveCircle(ctx: AppContext) {
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

async function handleDisbandCircle(ctx: AppContext) {
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

  await ctx.env.DB.prepare(`DELETE FROM daily_stats WHERE circle_code = ?1`).bind(circleCode).run();
  await ctx.env.DB.prepare(`DELETE FROM circle_members WHERE circle_code = ?1`).bind(circleCode).run();
  await ctx.env.DB.prepare(`DELETE FROM circles WHERE circle_code = ?1`).bind(circleCode).run();
  return { ok: true };
}

async function handleUpsertStats(ctx: AppContext) {
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

async function handleLeaderboard(ctx: AppContext) {
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
         COALESCE(ds.actual_intake_ml, 0) AS actual_intake_ml,
         COALESCE(ds.target_ml, 0) AS target_ml
       FROM circle_members cm
       LEFT JOIN users u
         ON u.account_id = cm.account_id
       LEFT JOIN daily_stats ds
         ON ds.circle_code = cm.circle_code
        AND ds.account_id = cm.account_id
        AND ds.day_key = ?2
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

async function handleUpdateCheck(ctx: AppContext) {
  const appId = normalizeAppId(ctx.url.searchParams.get("appId"));
  const platform = normalizePlatform(ctx.url.searchParams.get("platform"));
  const channel = normalizeChannel(ctx.url.searchParams.get("channel"));
  const currentVersion = normalizeVersion(ctx.url.searchParams.get("currentVersion"));

  const release = await ctx.env.DB
    .prepare(
      `SELECT latest_version, release_url, notes, published_at
       FROM app_releases
       WHERE app_id = ?1 AND platform = ?2 AND channel = ?3`
    )
    .bind(appId, platform, channel)
    .first<ReleaseRecord>();

  if (!release) {
    throw new HttpError(404, "Release channel not found");
  }

  return {
    appId,
    platform,
    channel,
    currentVersion,
    latestVersion: release.latest_version,
    hasUpdate: compareSemver(release.latest_version, currentVersion) > 0,
    releaseUrl: release.release_url,
    notes: release.notes,
    publishedAt: release.published_at
  };
}

async function handleSyncBootstrap(ctx: AppContext) {
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

async function handleCreatePairCode(ctx: AppContext) {
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

async function handleBindPairCode(ctx: AppContext) {
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

async function handlePushDailySnapshots(ctx: AppContext) {
  const body = await readBody<{
    accountId?: string;
    deviceId?: string;
    snapshots?: DailySnapshotPayload[];
  }>(ctx.request);
  const accountId = requireAccountId(body.accountId);
  const deviceId = requireDeviceId(body.deviceId);
  const snapshots = Array.isArray(body.snapshots) ? body.snapshots : [];

  await ensureSyncDeviceBound(ctx.env.DB, accountId, deviceId);

  for (const snapshot of snapshots) {
    const dayKey = requireDayKey(snapshot.dayKey);
    const updatedAt = requireIsoDateTime(snapshot.updatedAt, "updatedAt");
    const updatedByDeviceId = requireDeviceId(snapshot.updatedByDeviceId || deviceId);
    await ctx.env.DB
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

  await purgeOldDailySnapshots(ctx.env.DB, accountId, dayKeyDaysAgo(6));
  return { ok: true };
}

async function handlePullDailySnapshots(ctx: AppContext) {
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

async function handlePushGardenSnapshot(ctx: AppContext) {
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
  const updatedAt = requireIsoDateTime(snapshot.updatedAt, "updatedAt");
  const updatedByDeviceId = requireDeviceId(snapshot.updatedByDeviceId || deviceId);

  await ctx.env.DB
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

  return { ok: true };
}

async function handlePullGardenSnapshot(ctx: AppContext) {
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

async function handlePushSettingsSnapshot(ctx: AppContext) {
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
  const updatedAt = requireIsoDateTime(snapshot.updatedAt, "updatedAt");
  const updatedByDeviceId = requireDeviceId(snapshot.updatedByDeviceId || deviceId);

  await ctx.env.DB
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

  return { ok: true };
}

async function handlePullSettingsSnapshot(ctx: AppContext) {
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

async function handleUploadBackup(ctx: AppContext) {
  const body = await readBody<{ accountId?: string; deviceId?: string; content?: string }>(ctx.request);
  const accountId = requireAccountId(body.accountId);
  const deviceId = requireDeviceId(body.deviceId);
  const content = String(body.content ?? "");
  if (!content.trim()) {
    throw new HttpError(400, "content is required");
  }

  await ensureSyncDeviceBound(ctx.env.DB, accountId, deviceId);
  const now = isoNow();
  const objectKey = `backups/${accountId}/${now}-${deviceId}.json`;
  await ctx.env.SYNC_BACKUPS.put(objectKey, content, {
    httpMetadata: {
      contentType: "application/json; charset=utf-8"
    }
  });

  await ctx.env.DB
    .prepare(
      `INSERT INTO backup_manifests (object_key, account_id, created_at, device_id, size_bytes)
       VALUES (?1, ?2, ?3, ?4, ?5)`
    )
    .bind(objectKey, accountId, now, deviceId, content.length)
    .run();

  return {
    backup: {
      objectKey,
      createdAt: now,
      deviceId,
      sizeBytes: content.length
    }
  };
}

async function handleLatestBackup(ctx: AppContext) {
  const accountId = requireAccountId(ctx.url.searchParams.get("accountId"));
  const deviceId = requireDeviceId(ctx.url.searchParams.get("deviceId"));
  await ensureSyncDeviceBound(ctx.env.DB, accountId, deviceId);
  const backup = await getLatestBackupManifest(ctx.env.DB, accountId);
  return { backup };
}

async function handleRestoreBackup(ctx: AppContext) {
  const body = await readBody<{ accountId?: string; deviceId?: string }>(ctx.request);
  const accountId = requireAccountId(body.accountId);
  const deviceId = requireDeviceId(body.deviceId);
  await ensureSyncDeviceBound(ctx.env.DB, accountId, deviceId);

  const backup = await getLatestBackupManifest(ctx.env.DB, accountId);
  if (!backup) {
    throw new HttpError(404, "Cloud backup not found");
  }
  const object = await ctx.env.SYNC_BACKUPS.get(backup.object_key);
  if (!object) {
    throw new HttpError(404, "Cloud backup object not found");
  }

  return {
    backup: {
      objectKey: backup.object_key,
      createdAt: backup.created_at,
      deviceId: backup.device_id,
      sizeBytes: backup.size_bytes
    },
    content: await object.text()
  };
}

async function getUser(db: D1Database, deviceId: string) {
  const result = await db
    .prepare(`SELECT account_id, display_name FROM users WHERE account_id = ?1`)
    .bind(deviceId)
    .first<UserRecord>();
  return result ?? null;
}

async function ensureUserExists(db: D1Database, accountId: string) {
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

async function getCircle(db: D1Database, circleCode: string) {
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

async function listCirclesByAccountId(db: D1Database, accountId: string) {
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

async function ensureCircleMembership(db: D1Database, circleCode: string, accountId: string) {
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

async function getCircleMemberCount(db: D1Database, circleCode: string) {
  const row = await db
    .prepare(`SELECT COUNT(*) AS member_count FROM circle_members WHERE circle_code = ?1`)
    .bind(circleCode)
    .first<{ member_count: number }>();
  return Number(row?.member_count ?? 0);
}

async function removeCircleMembership(db: D1Database, circleCode: string, accountId: string) {
  await db
    .prepare(`DELETE FROM daily_stats WHERE circle_code = ?1 AND account_id = ?2`)
    .bind(circleCode, accountId)
    .run();
  await db
    .prepare(`DELETE FROM circle_members WHERE circle_code = ?1 AND account_id = ?2`)
    .bind(circleCode, accountId)
    .run();
}

async function ensureLeaderboardAccountForDevice(
  db: D1Database,
  deviceId: string,
  now: string
) {
  const existing = await getSyncAccountIdByDeviceId(db, deviceId);
  if (existing) {
    await bindDeviceToSyncAccount(db, existing, deviceId, now);
    return existing;
  }

  const accountId = crypto.randomUUID();
  await bindDeviceToSyncAccount(db, accountId, deviceId, now);
  return accountId;
}

async function ensureSyncAccountExists(db: D1Database, accountId: string, now: string) {
  await db
    .prepare(`INSERT OR IGNORE INTO sync_accounts (account_id, created_at) VALUES (?1, ?2)`)
    .bind(accountId, now)
    .run();
}

async function bindDeviceToSyncAccount(
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

async function reconcileLegacyDeviceAccount(
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

async function migrateAccountScopedSnapshot(
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

async function getSyncAccountIdByDeviceId(db: D1Database, deviceId: string) {
  const row = await db
    .prepare(`SELECT account_id FROM sync_devices WHERE device_id = ?1`)
    .bind(deviceId)
    .first<{ account_id: string }>();
  return row?.account_id ?? null;
}

async function ensureSyncDeviceBound(db: D1Database, accountId: string, deviceId: string) {
  const row = await db
    .prepare(`SELECT account_id FROM sync_devices WHERE device_id = ?1`)
    .bind(deviceId)
    .first<{ account_id: string }>();
  if (!row || row.account_id !== accountId) {
    throw new HttpError(403, "The device is not bound to this sync account");
  }
}

async function purgeExpiredPairCodes(db: D1Database, now: string) {
  await db.prepare(`DELETE FROM pair_codes WHERE expires_at < ?1 OR used_at IS NOT NULL`).bind(now).run();
}

async function purgeOldDailySnapshots(db: D1Database, accountId: string, cutoffDayKey: string) {
  await db
    .prepare(`DELETE FROM daily_snapshots WHERE account_id = ?1 AND day_key < ?2`)
    .bind(accountId, cutoffDayKey)
    .run();
}

async function getLatestBackupManifest(db: D1Database, accountId: string) {
  return (
    (await db
      .prepare(
        `SELECT object_key, created_at, device_id, size_bytes
         FROM backup_manifests
         WHERE account_id = ?1
         ORDER BY created_at DESC
         LIMIT 1`
      )
      .bind(accountId)
      .first<BackupManifestRecord>()) ?? null
  );
}

async function readBody<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
}

function requireDeviceId(value: unknown) {
  const deviceId = String(value ?? "").trim();
  if (!deviceId) {
    throw new HttpError(400, "deviceId is required");
  }
  if (deviceId.length > 128) {
    throw new HttpError(400, "deviceId is too long");
  }
  if (!/^[A-Za-z0-9_-]+$/.test(deviceId)) {
    throw new HttpError(400, "deviceId contains invalid characters");
  }
  return deviceId;
}

function requireWeChatLoginCode(value: unknown) {
  const code = String(value ?? "").trim();
  if (!code) {
    throw new HttpError(400, "code is required");
  }
  return code;
}

function requireDisplayName(value: unknown) {
  const displayName = normalizeDisplayName(value);
  if (!displayName) {
    throw new HttpError(400, "displayName is required");
  }
  return displayName;
}

function normalizeDisplayName(value: unknown) {
  const displayName = String(value ?? "").trim();
  return displayName.slice(0, 32) || null;
}

function normalizeCircleName(value: unknown) {
  const circleName = String(value ?? "").trim();
  return circleName.slice(0, 48) || null;
}

function normalizeCircleCode(value: unknown) {
  const circleCode = String(value ?? "")
    .trim()
    .toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(circleCode)) {
    throw new HttpError(400, "circleCode must be 6 letters or digits");
  }
  return circleCode;
}

function normalizePairCode(value: unknown) {
  const pairCode = String(value ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]{8}$/.test(pairCode)) {
    throw new HttpError(400, "pairCode must be 8 letters or digits");
  }
  return pairCode;
}

function requireDayKey(value: unknown) {
  const dayKey = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
    throw new HttpError(400, "dayKey must be YYYY-MM-DD");
  }
  return dayKey;
}

function requireNonNegativeInt(value: unknown, fieldName: string) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw new HttpError(400, `${fieldName} must be a non-negative integer`);
  }
  return number;
}

function requirePositiveInt(value: unknown, fieldName: string) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new HttpError(400, `${fieldName} must be a positive integer`);
  }
  return number;
}

function normalizeAppId(value: unknown) {
  const appId = String(value ?? "").trim();
  if (!appId || appId.length > 64) {
    throw new HttpError(400, "appId is required");
  }
  return appId;
}

function normalizePlatform(value: unknown) {
  const platform = String(value ?? "").trim();
  if (!platform || platform.length > 64) {
    throw new HttpError(400, "platform is required");
  }
  return platform;
}

function normalizeChannel(value: unknown) {
  const channel = String(value ?? "").trim() || "stable";
  if (channel.length > 32) {
    throw new HttpError(400, "channel is too long");
  }
  return channel;
}

function normalizeVersion(value: unknown) {
  const version = String(value ?? "").trim();
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new HttpError(400, "currentVersion must be x.y.z");
  }
  return version;
}

function normalizeOptionalAccountId(value: unknown) {
  const accountId = String(value ?? "").trim();
  return accountId ? accountId.slice(0, 128) : "";
}

function requireAccountId(value: unknown) {
  const accountId = normalizeOptionalAccountId(value);
  if (!accountId) {
    throw new HttpError(400, "accountId is required");
  }
  return accountId;
}

function requireIsoDateTime(value: unknown, fieldName: string) {
  const stringValue = String(value ?? "").trim();
  if (!stringValue || Number.isNaN(Date.parse(stringValue))) {
    throw new HttpError(400, `${fieldName} must be an ISO datetime string`);
  }
  return stringValue;
}

function generateCircleCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const random = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(random, (value) => alphabet[value % alphabet.length]).join("");
}

function generatePairCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const random = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(random, (value) => alphabet[value % alphabet.length]).join("");
}

function shortAccountId(accountId: string) {
  return `User-${accountId.slice(0, 6)}`;
}

function compareSemver(left: string, right: string) {
  const leftParts = left.split(".").map((part) => Number(part));
  const rightParts = right.split(".").map((part) => Number(part));

  for (let index = 0; index < 3; index += 1) {
    const diff = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }

  return 0;
}

function sanitizeLogMessage(value: unknown) {
  return String(value ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .slice(0, 160);
}

function serializeUser(user: UserRecord) {
  return {
    deviceId: user.account_id,
    accountId: user.account_id,
    displayName: user.display_name
  };
}

function isoNow() {
  return new Date().toISOString();
}

function dayKeyDaysAgo(days: number) {
  const date = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

function json<T>(value: T, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: JSON_HEADERS
  });
}
