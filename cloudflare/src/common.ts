export type Env = {
  DB: D1Database;
  SYNC_BACKUPS: R2Bucket;
  WECHAT_APP_ID?: string;
  WECHAT_APP_SECRET?: string;
};

export type AppContext = {
  env: Env;
  request: Request;
  url: URL;
};

export type ApiError = {
  error: string;
};

export const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type"
};


export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function readBody<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
}

export function requireDeviceId(value: unknown) {
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

export function requireWeChatLoginCode(value: unknown) {
  const code = String(value ?? "").trim();
  if (!code) {
    throw new HttpError(400, "code is required");
  }
  return code;
}

export function requireDisplayName(value: unknown) {
  const displayName = normalizeDisplayName(value);
  if (!displayName) {
    throw new HttpError(400, "displayName is required");
  }
  return displayName;
}

export function normalizeDisplayName(value: unknown) {
  const displayName = String(value ?? "").trim();
  return displayName.slice(0, 32) || null;
}

export function normalizeCircleName(value: unknown) {
  const circleName = String(value ?? "").trim();
  return circleName.slice(0, 48) || null;
}

export function normalizeCircleCode(value: unknown) {
  const circleCode = String(value ?? "")
    .trim()
    .toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(circleCode)) {
    throw new HttpError(400, "circleCode must be 6 letters or digits");
  }
  return circleCode;
}

export function normalizePairCode(value: unknown) {
  const pairCode = String(value ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]{8}$/.test(pairCode)) {
    throw new HttpError(400, "pairCode must be 8 letters or digits");
  }
  return pairCode;
}

export function requireDayKey(value: unknown) {
  const dayKey = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
    throw new HttpError(400, "dayKey must be YYYY-MM-DD");
  }
  return dayKey;
}

export function requireNonNegativeInt(value: unknown, fieldName: string) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw new HttpError(400, `${fieldName} must be a non-negative integer`);
  }
  return number;
}

export function requirePositiveInt(value: unknown, fieldName: string) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new HttpError(400, `${fieldName} must be a positive integer`);
  }
  return number;
}

export function normalizeAppId(value: unknown) {
  const appId = String(value ?? "").trim();
  if (!appId || appId.length > 64) {
    throw new HttpError(400, "appId is required");
  }
  return appId;
}

export function normalizePlatform(value: unknown) {
  const platform = String(value ?? "").trim();
  if (!platform || platform.length > 64) {
    throw new HttpError(400, "platform is required");
  }
  return platform;
}

export function normalizeChannel(value: unknown) {
  const channel = String(value ?? "").trim() || "stable";
  if (channel.length > 32) {
    throw new HttpError(400, "channel is too long");
  }
  return channel;
}

export function normalizeVersion(value: unknown) {
  const version = String(value ?? "").trim();
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new HttpError(400, "currentVersion must be x.y.z");
  }
  return version;
}

export function normalizeOptionalAccountId(value: unknown) {
  const accountId = String(value ?? "").trim();
  return accountId ? accountId.slice(0, 128) : "";
}

export function requireAccountId(value: unknown) {
  const accountId = normalizeOptionalAccountId(value);
  if (!accountId) {
    throw new HttpError(400, "accountId is required");
  }
  return accountId;
}

export function requireIsoDateTime(value: unknown, fieldName: string) {
  const stringValue = String(value ?? "").trim();
  if (!stringValue || Number.isNaN(Date.parse(stringValue))) {
    throw new HttpError(400, `${fieldName} must be an ISO datetime string`);
  }
  return stringValue;
}

export function generateCircleCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const random = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(random, (value) => alphabet[value % alphabet.length]).join("");
}

export function generatePairCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const random = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(random, (value) => alphabet[value % alphabet.length]).join("");
}

export function shortAccountId(accountId: string) {
  return `User-${accountId.slice(0, 6)}`;
}

export function compareSemver(left: string, right: string) {
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

export function sanitizeLogMessage(value: unknown) {
  return String(value ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .slice(0, 160);
}

export function serializeUser(user: UserRecord) {
  return {
    deviceId: user.account_id,
    accountId: user.account_id,
    displayName: user.display_name
  };
}

export function isoNow() {
  return new Date().toISOString();
}

export function dayKeyDaysAgo(days: number) {
  const date = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

export function json<T>(value: T, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: JSON_HEADERS
  });
}
