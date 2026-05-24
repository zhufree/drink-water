type Env = {
  DB: D1Database;
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
  device_id: string;
  display_name: string | null;
};

type CircleRecord = {
  circle_code: string;
  circle_name: string | null;
  created_by_device_id: string;
};

type LeaderboardRow = {
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

      return json<ApiError>({ error: "Not found" }, 404);
    } catch (error) {
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

async function handleBootstrap(ctx: AppContext) {
  const body = await readBody<{ deviceId?: string; displayName?: string }>(ctx.request);
  const deviceId = requireDeviceId(body.deviceId);
  const displayName = normalizeDisplayName(body.displayName);
  const now = isoNow();

  const existing = await getUser(ctx.env.DB, deviceId);
  if (!existing) {
    await ctx.env.DB
      .prepare(
        `INSERT INTO users (device_id, display_name, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?3)`
      )
      .bind(deviceId, displayName, now)
      .run();
  } else if (displayName && displayName !== existing.display_name) {
    await ctx.env.DB
      .prepare(`UPDATE users SET display_name = ?2, updated_at = ?3 WHERE device_id = ?1`)
      .bind(deviceId, displayName, now)
      .run();
  }

  const user = await getUser(ctx.env.DB, deviceId);
  const circles = await listCirclesByDeviceId(ctx.env.DB, deviceId);

  return {
    user: serializeUser(user ?? { device_id: deviceId, display_name: displayName }),
    circles
  };
}

async function handleProfile(ctx: AppContext) {
  const body = await readBody<{ deviceId?: string; displayName?: string }>(ctx.request);
  const deviceId = requireDeviceId(body.deviceId);
  const displayName = requireDisplayName(body.displayName);
  const now = isoNow();

  await ensureUserExists(ctx.env.DB, deviceId);
  await ctx.env.DB
    .prepare(`UPDATE users SET display_name = ?2, updated_at = ?3 WHERE device_id = ?1`)
    .bind(deviceId, displayName, now)
    .run();

  return {
    user: serializeUser({
      device_id: deviceId,
      display_name: displayName
    })
  };
}

async function handleCreateCircle(ctx: AppContext) {
  const body = await readBody<{ deviceId?: string; circleName?: string }>(ctx.request);
  const deviceId = requireDeviceId(body.deviceId);
  const circleName = normalizeCircleName(body.circleName);
  const now = isoNow();

  await ensureUserExists(ctx.env.DB, deviceId);

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
      `INSERT INTO circles (circle_code, circle_name, created_by_device_id, created_at)
       VALUES (?1, ?2, ?3, ?4)`
    )
    .bind(circleCode, circleName, deviceId, now)
    .run();

  await ctx.env.DB
    .prepare(
      `INSERT OR IGNORE INTO circle_members (circle_code, device_id, joined_at)
       VALUES (?1, ?2, ?3)`
    )
    .bind(circleCode, deviceId, now)
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

  await ensureUserExists(ctx.env.DB, deviceId);
  const circle = await getCircle(ctx.env.DB, circleCode);
  if (!circle) {
    throw new HttpError(404, "Circle not found");
  }

  await ctx.env.DB
    .prepare(
      `INSERT OR IGNORE INTO circle_members (circle_code, device_id, joined_at)
       VALUES (?1, ?2, ?3)`
    )
    .bind(circleCode, deviceId, now)
    .run();

  return {
    circleCode: circle.circle_code,
    circleName: circle.circle_name
  };
}

async function handleListCircles(ctx: AppContext) {
  const deviceId = requireDeviceId(ctx.url.searchParams.get("deviceId"));
  await ensureUserExists(ctx.env.DB, deviceId);
  return {
    circles: await listCirclesByDeviceId(ctx.env.DB, deviceId)
  };
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

  await ensureCircleMembership(ctx.env.DB, circleCode, deviceId);

  await ctx.env.DB
    .prepare(
      `INSERT INTO daily_stats (
         circle_code,
         device_id,
         day_key,
         actual_intake_ml,
         target_ml,
         updated_at
       ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
       ON CONFLICT(circle_code, device_id, day_key)
       DO UPDATE SET
         actual_intake_ml = excluded.actual_intake_ml,
         target_ml = excluded.target_ml,
         updated_at = excluded.updated_at`
    )
    .bind(circleCode, deviceId, dayKey, actualIntakeMl, targetMl, now)
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
         cm.device_id AS device_id,
         u.display_name AS display_name,
         COALESCE(ds.actual_intake_ml, 0) AS actual_intake_ml,
         COALESCE(ds.target_ml, 0) AS target_ml
       FROM circle_members cm
       LEFT JOIN users u
         ON u.device_id = cm.device_id
       LEFT JOIN daily_stats ds
         ON ds.circle_code = cm.circle_code
        AND ds.device_id = cm.device_id
        AND ds.day_key = ?2
       WHERE cm.circle_code = ?1`
    )
    .bind(circleCode, dayKey)
    .all<{
      device_id: string;
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
      deviceId: row.device_id,
      displayName: row.display_name?.trim() || shortDeviceId(row.device_id),
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

async function getUser(db: D1Database, deviceId: string) {
  const result = await db
    .prepare(`SELECT device_id, display_name FROM users WHERE device_id = ?1`)
    .bind(deviceId)
    .first<UserRecord>();
  return result ?? null;
}

async function ensureUserExists(db: D1Database, deviceId: string) {
  const existing = await getUser(db, deviceId);
  if (existing) {
    return;
  }

  const now = isoNow();
  await db
    .prepare(
      `INSERT INTO users (device_id, display_name, created_at, updated_at)
       VALUES (?1, NULL, ?2, ?2)`
    )
    .bind(deviceId, now)
    .run();
}

async function getCircle(db: D1Database, circleCode: string) {
  const result = await db
    .prepare(
      `SELECT circle_code, circle_name, created_by_device_id
       FROM circles
       WHERE circle_code = ?1`
    )
    .bind(circleCode)
    .first<CircleRecord>();
  return result ?? null;
}

async function listCirclesByDeviceId(db: D1Database, deviceId: string) {
  const result = await db
    .prepare(
      `SELECT c.circle_code, c.circle_name
       FROM circle_members cm
       INNER JOIN circles c
         ON c.circle_code = cm.circle_code
       WHERE cm.device_id = ?1
       ORDER BY c.created_at DESC`
    )
    .bind(deviceId)
    .all<{ circle_code: string; circle_name: string | null }>();

  return (result.results ?? []).map((row) => ({
    circleCode: row.circle_code,
    circleName: row.circle_name
  }));
}

async function ensureCircleMembership(db: D1Database, circleCode: string, deviceId: string) {
  const result = await db
    .prepare(
      `SELECT 1
       FROM circle_members
       WHERE circle_code = ?1 AND device_id = ?2`
    )
    .bind(circleCode, deviceId)
    .first();

  if (!result) {
    throw new HttpError(403, "The device has not joined this circle");
  }
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
  return deviceId;
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

function generateCircleCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const random = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(random, (value) => alphabet[value % alphabet.length]).join("");
}

function shortDeviceId(deviceId: string) {
  return `User-${deviceId.slice(0, 6)}`;
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

function serializeUser(user: UserRecord) {
  return {
    deviceId: user.device_id,
    displayName: user.display_name
  };
}

function isoNow() {
  return new Date().toISOString();
}

function json<T>(value: T, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: JSON_HEADERS
  });
}
