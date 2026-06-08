import type { AppContext } from "./common.ts";
import { HttpError, isoNow, readBody, requireAccountId, requireDeviceId } from "./common.ts";
import { ensureSyncDeviceBound } from "./identity.ts";

export type BackupManifestRecord = {
  object_key: string;
  created_at: string;
  device_id: string;
  size_bytes: number;
};

export async function handleUploadBackup(ctx: AppContext) {
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

export async function handleLatestBackup(ctx: AppContext) {
  const accountId = requireAccountId(ctx.url.searchParams.get("accountId"));
  const deviceId = requireDeviceId(ctx.url.searchParams.get("deviceId"));
  await ensureSyncDeviceBound(ctx.env.DB, accountId, deviceId);
  const backup = await getLatestBackupManifest(ctx.env.DB, accountId);
  return { backup };
}

export async function handleRestoreBackup(ctx: AppContext) {
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

export async function getLatestBackupManifest(db: D1Database, accountId: string) {
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
