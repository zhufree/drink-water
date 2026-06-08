import {
  compareSemver,
  normalizeAppId,
  normalizeChannel,
  normalizePlatform,
  normalizeVersion
} from "./common.ts";
import type { AppContext } from "./common.ts";

export type ReleaseRecord = {
  latest_version: string;
  release_url: string;
  notes: string | null;
  published_at: string;
};

export async function handleUpdateCheck(ctx: AppContext) {
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
