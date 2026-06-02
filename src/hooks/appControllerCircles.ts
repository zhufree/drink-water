import type { Dispatch, SetStateAction } from "react";
import {
  bootstrapLeaderboard,
  listLeaderboardCircles,
  updateLeaderboardProfile
} from "../leaderboardApi";
import { saveSettings } from "../api";
import type { CircleSummary, Settings } from "../types";

type CircleSyncDeps = {
  settings: Settings;
  draftSettings: Settings;
  setSettings: Dispatch<SetStateAction<Settings>>;
  setDraftSettings: Dispatch<SetStateAction<Settings>>;
  setCircles: Dispatch<SetStateAction<CircleSummary[]>>;
  setCirclesLoadState: Dispatch<SetStateAction<"loading" | "ready" | "error">>;
};

export function createCircleSyncApi({
  settings,
  draftSettings,
  setSettings,
  setDraftSettings,
  setCircles,
  setCirclesLoadState
}: CircleSyncDeps) {
  const syncCloudIdentity = async (nextSettings: Settings) => {
    if (!nextSettings.deviceId) {
      return { circles: [] as CircleSummary[] };
    }

    const result = await bootstrapLeaderboard(nextSettings.deviceId, nextSettings.displayName);
    if (nextSettings.displayName.trim()) {
      await updateLeaderboardProfile(nextSettings.deviceId, nextSettings.displayName.trim());
    }

    return result;
  };

  const applyCircleSnapshot = async (
    baseSettings: Settings,
    fetchedCircles: CircleSummary[]
  ) => {
    setCircles(fetchedCircles);
    setCirclesLoadState("ready");

    const activeCircle =
      fetchedCircles.find((circle) => circle.circleCode === baseSettings.activeCircleCode) ?? null;

    if (baseSettings.activeCircleCode && !activeCircle) {
      const fallbackCircle = fetchedCircles[0] ?? null;
      const saved = await saveSettings({
        ...baseSettings,
        activeCircleCode: fallbackCircle?.circleCode ?? "",
        activeCircleName: fallbackCircle?.circleName ?? ""
      });
      setSettings(saved);
      setDraftSettings(saved);
      return saved;
    }

    if (activeCircle && baseSettings.activeCircleName !== (activeCircle.circleName ?? "")) {
      const saved = await saveSettings({
        ...baseSettings,
        activeCircleName: activeCircle.circleName ?? ""
      });
      setSettings(saved);
      setDraftSettings(saved);
      return saved;
    }

    return baseSettings;
  };

  const refreshCirclesFromServer = async (deviceId: string) => {
    try {
      const fetchedCircles = await listLeaderboardCircles(deviceId);
      await applyCircleSnapshot(
        settings.deviceId === deviceId ? settings : draftSettings,
        fetchedCircles
      );
    } catch {
      setCirclesLoadState("error");
    }
  };

  return {
    syncCloudIdentity,
    applyCircleSnapshot,
    refreshCirclesFromServer
  };
}
