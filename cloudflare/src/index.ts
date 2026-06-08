import type { ApiError, AppContext, Env } from "./common.ts";
import { HttpError, JSON_HEADERS, json } from "./common.ts";
import { handleWeChatSession } from "./wechat.ts";
import {
  handleBootstrap,
  handleCreateCircle,
  handleDisbandCircle,
  handleJoinCircle,
  handleLeaderboard,
  handleLeaveCircle,
  handleListCircles,
  handleProfile,
  handleRemoveCircleMember,
  handleUpsertStats
} from "./leaderboard.ts";
import { handleUpdateCheck } from "./updates.ts";
import {
  handleBindPairCode,
  handleCreatePairCode,
  handlePullDailySnapshots,
  handlePullGardenSnapshot,
  handlePullSettingsSnapshot,
  handlePullSnapshotBundle,
  handlePushDailySnapshots,
  handlePushGardenSnapshot,
  handlePushSettingsSnapshot,
  handlePushSnapshotBundle,
  handleSyncBootstrap
} from "./sync.ts";
import { handleLatestBackup, handleRestoreBackup, handleUploadBackup } from "./backup.ts";

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

      if (request.method === "POST" && url.pathname === "/api/sync/snapshots/push") {
        return json(await handlePushSnapshotBundle(ctx));
      }

      if (request.method === "GET" && url.pathname === "/api/sync/snapshots") {
        return json(await handlePullSnapshotBundle(ctx));
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
