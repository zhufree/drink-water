import { invoke } from "@tauri-apps/api/core";
import type {
  AppUpdateInfo,
  CircleSummary,
  LeaderboardCircleMeta,
  LeaderboardEntry,
  LeaderboardMemberGarden
} from "./types";

type BootstrapResponse = {
  user: {
    accountId: string;
    displayName: string | null;
  };
  circles: CircleSummary[];
};

type CreateCircleResponse = {
  circleCode: string;
  circleName: string | null;
};

type LeaderboardResponse = {
  circleCode: string;
  circleName: string | null;
  dayKey: string;
  metric: "intake" | "progress";
  ownerAccountId: string | null;
  memberCount: number;
  leaderboard: LeaderboardEntry[];
};

type UpdateCheckResponse = {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  releaseUrl: string;
  notes: string | null;
  publishedAt: string;
};

type DailyActivityResponse = {
  dayKey: string;
  activeCount: number;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const retries = init?.method === "GET" || !init?.method ? 2 : 1;
  let lastError: Error | null = null;
  const method = init?.method ?? "GET";
  const [pathname, rawQuery] = path.split("?");
  const query = rawQuery
    ? Array.from(new URLSearchParams(rawQuery).entries())
    : undefined;
  const body = init?.body ? JSON.parse(String(init.body)) : null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const data = await invoke<T>("leaderboard_request", {
        method,
        path: pathname,
        query,
        body
      });
      return data;
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error(typeof error === "string" ? error : "Request failed");
      console.error("[leaderboardApi] request error", {
        method,
        path,
        attempt: attempt + 1,
        name: lastError.name,
        message: lastError.message
      });
      if (attempt >= retries) {
        break;
      }
      await delay(350 * (attempt + 1));
    }
  }

  throw lastError ?? new Error("Request failed");
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export async function bootstrapLeaderboard(deviceId: string, displayName: string) {
  return request<BootstrapResponse>("/api/bootstrap", {
    method: "POST",
    body: JSON.stringify({
      deviceId,
      displayName: displayName || undefined
    })
  });
}

export async function updateLeaderboardProfile(deviceId: string, displayName: string) {
  return request<BootstrapResponse["user"]>("/api/profile", {
    method: "POST",
    body: JSON.stringify({
      deviceId,
      displayName
    })
  });
}

export async function createLeaderboardCircle(deviceId: string, circleName: string) {
  return request<CreateCircleResponse>("/api/circle/create", {
    method: "POST",
    body: JSON.stringify({
      deviceId,
      circleName: circleName || undefined
    })
  });
}

export async function joinLeaderboardCircle(deviceId: string, circleCode: string) {
  return request<CreateCircleResponse>("/api/circle/join", {
    method: "POST",
    body: JSON.stringify({
      deviceId,
      circleCode
    })
  });
}

export async function listLeaderboardCircles(deviceId: string) {
  const result = await request<{ circles: CircleSummary[] }>(
    `/api/circles?deviceId=${encodeURIComponent(deviceId)}`
  );
  return result.circles;
}

export async function getLeaderboard(input: {
  circleCode: string;
  dayKey: string;
  metric?: "intake" | "progress";
}) {
  const metric = input.metric ?? "intake";
  const params = new URLSearchParams({
    circleCode: input.circleCode,
    dayKey: input.dayKey,
    metric
  });

  return request<LeaderboardResponse>(`/api/leaderboard?${params.toString()}`);
}

export async function getDailyActivity(dayKey: string) {
  const params = new URLSearchParams({ dayKey });
  return request<DailyActivityResponse>(`/api/activity/daily?${params.toString()}`);
}

export async function getCircleMemberGarden(input: {
  deviceId: string;
  circleCode: string;
  targetAccountId: string;
  rangeDays?: number;
}) {
  const params = new URLSearchParams({
    deviceId: input.deviceId,
    circleCode: input.circleCode,
    targetAccountId: input.targetAccountId,
    rangeDays: String(input.rangeDays ?? 28)
  });

  return request<LeaderboardMemberGarden>(`/api/circle/member-garden?${params.toString()}`);
}

export async function removeLeaderboardMember(input: {
  deviceId: string;
  circleCode: string;
  targetAccountId: string;
}) {
  return request<{ ok: true }>("/api/circle/remove-member", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function leaveLeaderboardCircle(input: { deviceId: string; circleCode: string }) {
  return request<{ ok: true }>("/api/circle/leave", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function disbandLeaderboardCircle(input: {
  deviceId: string;
  circleCode: string;
}) {
  return request<{ ok: true }>("/api/circle/disband", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export type { LeaderboardResponse, LeaderboardCircleMeta };

export async function checkForAppUpdate(input: {
  appId: string;
  platform: string;
  channel?: string;
  currentVersion: string;
}) {
  const params = new URLSearchParams({
    appId: input.appId,
    platform: input.platform,
    channel: input.channel ?? "stable",
    currentVersion: input.currentVersion
  });

  const result = await request<UpdateCheckResponse>(`/api/update-check?${params.toString()}`);
  return result as AppUpdateInfo;
}
