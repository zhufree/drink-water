import type { AppUpdateInfo, CircleSummary, LeaderboardEntry } from "./types";

function getApiBase() {
  const configured = (import.meta.env.VITE_LEADERBOARD_API_BASE as string | undefined)?.trim();
  if (!configured) {
    throw new Error("Leaderboard API base is not configured.");
  }

  return configured.replace(/\/+$/, "");
}

const API_BASE = getApiBase();

type BootstrapResponse = {
  user: {
    deviceId: string;
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  const data = (await response.json()) as T | { error?: string };
  if (!response.ok) {
    throw new Error(
      typeof data === "object" && data && "error" in data && data.error
        ? data.error || "Request failed"
        : "Request failed"
    );
  }

  return data as T;
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

export async function upsertLeaderboardStats(input: {
  deviceId: string;
  circleCode: string;
  dayKey: string;
  actualIntakeMl: number;
  targetMl: number;
}) {
  return request<{ ok: true }>("/api/stats/upsert", {
    method: "POST",
    body: JSON.stringify(input)
  });
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
