import type { Dispatch, SetStateAction } from "react";
import {
  exportData,
  getTodayStatus,
  importData,
  logYesterdayDrink,
  saveSettings,
  toggleAutostart
} from "../api";
import type { CircleSummary, HistoryItem, Settings } from "../types";
import { extractErrorMessage } from "./appControllerUtils";

type AppUiActionDeps = {
  draftSettings: Settings;
  settings: Settings;
  yesterdayCatchUpItem: HistoryItem | null;
  yesterdayCatchUpAmount: number;
  i18n: ReturnType<typeof import("../i18n").createI18n>;
  refreshAll: () => Promise<unknown>;
  syncCloudIdentity: (settings: Settings) => Promise<{ circles: CircleSummary[] }>;
  applyCircleSnapshot: (
    baseSettings: Settings,
    fetchedCircles: CircleSummary[]
  ) => Promise<Settings>;
  syncDailyDayKeys: (dayKeys: string[]) => Promise<void>;
  setSettings: Dispatch<SetStateAction<Settings>>;
  setDraftSettings: Dispatch<SetStateAction<Settings>>;
  setQuickAmount: Dispatch<SetStateAction<number>>;
  setStatus: Dispatch<SetStateAction<import("../types").TodayStatus | null>>;
  setSaving: Dispatch<SetStateAction<boolean>>;
  setMessage: Dispatch<SetStateAction<string>>;
  setCloudIdentityState: Dispatch<SetStateAction<"loading" | "ready" | "error">>;
  setCloudIdentityError: Dispatch<SetStateAction<string | null>>;
  setCirclesLoadState: Dispatch<SetStateAction<"loading" | "ready" | "error">>;
  setYesterdayCatchUpItem: Dispatch<SetStateAction<HistoryItem | null>>;
  setYesterdayCatchUpAmount: Dispatch<SetStateAction<number>>;
  setNicknameSaveState: Dispatch<SetStateAction<"idle" | "success" | "error">>;
  setNicknameSaveMessage: Dispatch<SetStateAction<string | null>>;
};

export function createAppUiActions({
  draftSettings,
  settings,
  yesterdayCatchUpItem,
  yesterdayCatchUpAmount,
  i18n,
  refreshAll,
  syncCloudIdentity,
  applyCircleSnapshot,
  syncDailyDayKeys,
  setSettings,
  setDraftSettings,
  setQuickAmount,
  setStatus,
  setSaving,
  setMessage,
  setCloudIdentityState,
  setCloudIdentityError,
  setCirclesLoadState,
  setYesterdayCatchUpItem,
  setYesterdayCatchUpAmount,
  setNicknameSaveState,
  setNicknameSaveMessage
}: AppUiActionDeps) {
  const handleWindowAction = async (
    actionName: "minimize" | "hide",
    action: () => Promise<void>
  ) => {
    try {
      await action();
    } catch (error) {
      const detail =
        error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      setMessage(
        i18n.t("message.windowActionFailed", {
          action:
            actionName === "minimize"
              ? i18n.t("window.minimize")
              : i18n.t("window.hideToTray"),
          detail
        })
      );
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setMessage("");

    try {
      const saved = await saveSettings(draftSettings);
      setSettings(saved);
      setDraftSettings(saved);
      setQuickAmount(saved.cupSizeMl);
      setStatus(await getTodayStatus());
      setCloudIdentityState("loading");
      setCloudIdentityError(null);
      try {
        const bootstrapResult = await syncCloudIdentity(saved);
        await applyCircleSnapshot(saved, bootstrapResult.circles);
        setCloudIdentityState("ready");
      } catch (error) {
        setCloudIdentityState("error");
        setCloudIdentityError(extractErrorMessage(error));
        setCirclesLoadState("error");
      }
      setMessage(i18n.t("message.settingsSaved"));
    } finally {
      setSaving(false);
    }
  };

  const handleAutostartChange = async (enabled: boolean) => {
    const applied = await toggleAutostart(enabled);
    const next = { ...draftSettings, autostartEnabled: applied };
    setDraftSettings(next);
    setSettings((current) => ({ ...current, autostartEnabled: applied }));
    setStatus(await getTodayStatus());
  };

  const handleExportData = async () => {
    setMessage("");
    const exported = await exportData();
    if (exported) {
      setMessage(i18n.t("message.exportSuccess"));
    }
  };

  const handleImportData = async () => {
    setMessage("");
    const imported = await importData();
    if (!imported) {
      return;
    }

    await refreshAll();
    setMessage(i18n.t("message.importSuccess"));
  };

  const handleDismissYesterdayCatchUp = () => {
    setYesterdayCatchUpItem(null);
    setYesterdayCatchUpAmount(250);
  };

  const handleConfirmYesterdayCatchUp = async () => {
    if (!yesterdayCatchUpItem) {
      return;
    }

    const amount = yesterdayCatchUpAmount;
    setMessage("");
    await logYesterdayDrink(amount);
    handleDismissYesterdayCatchUp();
    await refreshAll();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const year = yesterdayDate.getFullYear();
    const month = String(yesterdayDate.getMonth() + 1).padStart(2, "0");
    const day = String(yesterdayDate.getDate()).padStart(2, "0");
    const yesterday = `${year}-${month}-${day}`;
    await syncDailyDayKeys([yesterday]);
    setMessage(
      i18n.t("message.yesterdayCatchUpSaved", {
        amount: i18n.formatMl(amount)
      })
    );
  };

  const resetNicknameSaveFeedback = () => {
    setNicknameSaveState("idle");
    setNicknameSaveMessage(null);
  };

  return {
    handleWindowAction,
    handleSaveSettings,
    handleAutostartChange,
    handleExportData,
    handleImportData,
    handleDismissYesterdayCatchUp,
    handleConfirmYesterdayCatchUp,
    resetNicknameSaveFeedback
  };
}
