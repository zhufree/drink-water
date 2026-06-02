import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  isPermissionGranted,
  requestPermission
} from "@tauri-apps/plugin-notification";
import { saveSettings } from "../api";
import { checkForAppUpdate, upsertLeaderboardStats } from "../leaderboardApi";
import type {
  AppUpdateInfo,
  CircleSummary,
  HistoryItem,
  LeaderboardEntry,
  NotificationPermissionState,
  Settings,
  TodayStatus
} from "../types";
import { APP_VERSION } from "./appControllerConfig";
import { currentDayKey, extractErrorMessage, findYesterdayCatchUpCandidate } from "./appControllerUtils";

type BootstrapResult = {
  nextSettings: Settings;
  nextHistory: HistoryItem[];
};

type UseAppControllerEffectsParams = {
  refreshAll: () => Promise<BootstrapResult>;
  settings: Settings;
  draftSettings: Settings;
  status: TodayStatus | null;
  message: string;
  leaderboardMetric: "intake" | "progress";
  gardenRestActive: boolean;
  gardenRestEndsAt: string | null;
  restTick: number;
  startupPromptCheckedRef: MutableRefObject<boolean>;
  lastSyncedStatsKeyRef: MutableRefObject<string>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setNotificationState: Dispatch<SetStateAction<NotificationPermissionState>>;
  setCloudIdentityState: Dispatch<SetStateAction<"loading" | "ready" | "error">>;
  setCloudIdentityError: Dispatch<SetStateAction<string | null>>;
  setCirclesLoadState: Dispatch<SetStateAction<"loading" | "ready" | "error">>;
  setUpdateInfo: Dispatch<SetStateAction<AppUpdateInfo | null>>;
  setYesterdayCatchUpItem: Dispatch<SetStateAction<HistoryItem | null>>;
  setYesterdayCatchUpAmount: Dispatch<SetStateAction<number>>;
  setMessage: Dispatch<SetStateAction<string>>;
  setLeaderboardEntries: Dispatch<SetStateAction<LeaderboardEntry[]>>;
  setRestTick: Dispatch<SetStateAction<number>>;
  syncCloudIdentity: (settings: Settings) => Promise<{ circles: CircleSummary[] }>;
  applyCircleSnapshot: (
    baseSettings: Settings,
    fetchedCircles: CircleSummary[]
  ) => Promise<Settings>;
  refreshLeaderboard: () => Promise<void>;
  handleCompleteRestBreak: () => Promise<void>;
};

export function useAppControllerEffects({
  refreshAll,
  settings,
  draftSettings,
  status,
  message,
  leaderboardMetric,
  gardenRestActive,
  gardenRestEndsAt,
  restTick,
  startupPromptCheckedRef,
  lastSyncedStatsKeyRef,
  setLoading,
  setNotificationState,
  setCloudIdentityState,
  setCloudIdentityError,
  setCirclesLoadState,
  setUpdateInfo,
  setYesterdayCatchUpItem,
  setYesterdayCatchUpAmount,
  setMessage,
  setLeaderboardEntries,
  setRestTick,
  syncCloudIdentity,
  applyCircleSnapshot,
  refreshLeaderboard,
  handleCompleteRestBreak
}: UseAppControllerEffectsParams) {
  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;

    const bootstrap = async () => {
      try {
        const granted = await isPermissionGranted();
        if (granted) {
          setNotificationState("granted");
        } else {
          const result = await requestPermission();
          setNotificationState(result);
        }
      } catch {
        setNotificationState("unsupported");
      }

      try {
        let { nextSettings, nextHistory } = await refreshAll();

        if (!nextSettings.deviceId) {
          const saved = await saveSettings({
            ...nextSettings,
            deviceId: crypto.randomUUID()
          });
          nextSettings = saved;
          await refreshAll();
        }

        setCloudIdentityState("loading");
        setCloudIdentityError(null);
        try {
          const bootstrapResult = await syncCloudIdentity(nextSettings);
          await applyCircleSnapshot(nextSettings, bootstrapResult.circles);
          setCloudIdentityState("ready");
        } catch (error) {
          setCloudIdentityState("error");
          setCloudIdentityError(extractErrorMessage(error));
          setCirclesLoadState("error");
        }

        try {
          const nextUpdateInfo = await checkForAppUpdate({
            appId: "drink-water",
            platform: "desktop-windows",
            currentVersion: APP_VERSION
          });
          setUpdateInfo(nextUpdateInfo);
        } catch {
          setUpdateInfo(null);
        }

        if (!startupPromptCheckedRef.current) {
          startupPromptCheckedRef.current = true;
          const yesterdayCandidate = findYesterdayCatchUpCandidate(nextHistory);
          if (yesterdayCandidate) {
            setYesterdayCatchUpItem(yesterdayCandidate);
            setYesterdayCatchUpAmount(250);
          }
        }
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }

      unlisten = await listen("state-updated", async () => {
        if (!disposed) {
          await refreshAll();
        }
      });
    };

    void bootstrap();

    const timer = window.setInterval(() => {
      void refreshAll();
    }, 30000);

    return () => {
      disposed = true;
      window.clearInterval(timer);
      if (unlisten) {
        void unlisten();
      }
    };
  }, []);

  useEffect(() => {
    if (!settings.deviceId || !settings.activeCircleCode || !status) {
      return;
    }

    const syncKey = [
      settings.deviceId,
      settings.activeCircleCode,
      currentDayKey(),
      status.actualIntakeMl,
      status.targetMl
    ].join("|");

    if (lastSyncedStatsKeyRef.current === syncKey) {
      return;
    }

    lastSyncedStatsKeyRef.current = syncKey;

    void upsertLeaderboardStats({
      deviceId: settings.deviceId,
      circleCode: settings.activeCircleCode,
      dayKey: currentDayKey(),
      actualIntakeMl: status.actualIntakeMl,
      targetMl: status.targetMl
    }).catch(() => {
      lastSyncedStatsKeyRef.current = "";
    });
  }, [settings.deviceId, settings.activeCircleCode, status]);

  useEffect(() => {
    if (!settings.activeCircleCode) {
      setLeaderboardEntries([]);
      return;
    }

    void refreshLeaderboard();
  }, [settings.activeCircleCode, leaderboardMetric]);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timer = window.setTimeout(() => {
      setMessage("");
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (!gardenRestActive) {
      return;
    }

    const timer = window.setInterval(() => {
      setRestTick(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [gardenRestActive]);

  useEffect(() => {
    if (!gardenRestActive || !gardenRestEndsAt) {
      return;
    }

    const remainingMs = new Date(gardenRestEndsAt).getTime() - restTick;
    if (remainingMs > 0) {
      return;
    }

    void handleCompleteRestBreak();
  }, [gardenRestActive, gardenRestEndsAt, restTick]);
}
