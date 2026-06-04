import { invoke } from "@tauri-apps/api/core";
import type {
  CloudBackupMeta,
  DailySnapshotRecord,
  GardenSnapshotRecord
} from "./types";

type SyncBootstrapResponse = {
  accountId: string;
};

type PairCodeResponse = {
  pairCode: string;
  expiresAt: string;
};

type DailyPullResponse = {
  snapshots: DailySnapshotRecord[];
};

type GardenPullResponse = {
  snapshot: GardenSnapshotRecord | null;
};

type BackupUploadResponse = {
  backup: CloudBackupMeta;
};

type BackupRestoreResponse = {
  backup: CloudBackupMeta;
  content: string;
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
      return await invoke<T>("leaderboard_request", {
        method,
        path: pathname,
        query,
        body
      });
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error(typeof error === "string" ? error : "Request failed");
      if (attempt >= retries) {
        break;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 350 * (attempt + 1)));
    }
  }

  throw lastError ?? new Error("Request failed");
}

export async function bootstrapSnapshotSync(deviceId: string, accountId?: string | null) {
  return request<SyncBootstrapResponse>("/api/sync/bootstrap", {
    method: "POST",
    body: JSON.stringify({
      deviceId,
      accountId: accountId || undefined
    })
  });
}

export async function createPairCode(accountId: string, deviceId: string) {
  return request<PairCodeResponse>("/api/sync/pair-code/create", {
    method: "POST",
    body: JSON.stringify({ accountId, deviceId })
  });
}

export async function bindPairCode(deviceId: string, pairCode: string) {
  return request<SyncBootstrapResponse>("/api/sync/pair-code/bind", {
    method: "POST",
    body: JSON.stringify({ deviceId, pairCode })
  });
}

export async function pushDailySnapshots(
  accountId: string,
  deviceId: string,
  snapshots: DailySnapshotRecord[]
) {
  return request<{ ok: true }>("/api/sync/daily/push", {
    method: "POST",
    body: JSON.stringify({ accountId, deviceId, snapshots })
  });
}

export async function pullDailySnapshots(accountId: string, deviceId: string) {
  const params = new URLSearchParams({ accountId, deviceId });
  return request<DailyPullResponse>(`/api/sync/daily/pull?${params.toString()}`);
}

export async function pushGardenSnapshot(
  accountId: string,
  deviceId: string,
  snapshot: GardenSnapshotRecord
) {
  return request<{ ok: true }>("/api/sync/garden/push", {
    method: "POST",
    body: JSON.stringify({ accountId, deviceId, snapshot })
  });
}

export async function pullGardenSnapshot(accountId: string, deviceId: string) {
  const params = new URLSearchParams({ accountId, deviceId });
  return request<GardenPullResponse>(`/api/sync/garden?${params.toString()}`);
}

export async function uploadCloudBackup(
  accountId: string,
  deviceId: string,
  content: string
) {
  return request<BackupUploadResponse>("/api/backup/upload", {
    method: "POST",
    body: JSON.stringify({ accountId, deviceId, content })
  });
}

export async function restoreCloudBackup(accountId: string, deviceId: string) {
  return request<BackupRestoreResponse>("/api/backup/restore", {
    method: "POST",
    body: JSON.stringify({ accountId, deviceId })
  });
}
