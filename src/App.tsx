import type { CSSProperties } from "react";
import { HistoryPanel } from "./components/HistoryPanel";
import { FirstRunOnboardingModal } from "./components/FirstRunOnboardingModal";
import { LeaderboardPanel } from "./components/LeaderboardPanel";
import { PrimaryTabs } from "./components/PrimaryTabs";
import { RestOverlay } from "./components/RestOverlay";
import { SettingsPanel } from "./components/SettingsPanel";
import { StartupCatchUpModal } from "./components/StartupCatchUpModal";
import { Toast, type ToastTone } from "./components/Toast";
import { TodayPanel } from "./components/TodayPanel";
import { WindowChrome } from "./components/WindowChrome";
import { I18nProvider } from "./i18n";
import {
  APP_VERSION,
  COPYRIGHT,
  RELEASE_URL,
  useAppController
} from "./hooks/useAppController";

const TEMPLATE_VALUE = "__toast_value__";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesToastTemplate(template: string, message: string) {
  const parts = template.split(TEMPLATE_VALUE).map(escapeRegex);
  const pattern = `^${parts.join(".+")}$`;
  return new RegExp(pattern).test(message);
}

export default function App() {
  const controller = useAppController();
  const panelOpacity = controller.draftSettings.panelOpacityPercent / 100;
  const shellStyle = {
    "--panel-opacity": `${panelOpacity}`,
    "--panel-blur": `${controller.draftSettings.panelBlurPx}px`
  } as CSSProperties;
  const activeBackground = controller.gardenState.activeBackground || "default";
  const showOnboarding = !controller.syncMeta.onboardingSeenAt;
  const infoMessages = new Set([
    controller.i18n.t("message.syncDeferred"),
    controller.i18n.t("message.syncGapWarning")
  ]);
  const successMessages = new Set([
    controller.i18n.t("message.settingsSaved"),
    controller.i18n.t("message.exportSuccess"),
    controller.i18n.t("message.importSuccess"),
    controller.i18n.t("message.restStarted"),
    controller.i18n.t("message.restCancelled"),
    controller.i18n.t("message.restCompleted"),
    controller.i18n.t("message.backgroundSynced"),
    controller.i18n.t("message.backgroundSelected"),
    controller.i18n.t("message.circleMemberRemoved"),
    controller.i18n.t("message.circleLeft"),
    controller.i18n.t("message.circleDisbanded"),
    controller.i18n.t("leaderboard.identityReconnectSuccess"),
    controller.i18n.t("message.snapshotsPulled"),
    controller.i18n.t("message.settingsSynced"),
    controller.i18n.t("message.cloudBackupUploaded"),
    controller.i18n.t("message.cloudBackupRestored"),
    controller.i18n.t("message.deviceBound")
  ]);
  const successMessageTemplates = [
    controller.i18n.t("message.logged", { amount: TEMPLATE_VALUE }),
    controller.i18n.t("message.undo", { amount: TEMPLATE_VALUE }),
    controller.i18n.t("message.yesterdayCatchUpSaved", { amount: TEMPLATE_VALUE }),
    controller.i18n.t("message.seedPlanted", { day: TEMPLATE_VALUE }),
    controller.i18n.t("message.cropHarvested", { day: TEMPLATE_VALUE }),
    controller.i18n.t("message.exchangeSuccess", {
      count: TEMPLATE_VALUE,
      seed: TEMPLATE_VALUE
    }),
    controller.i18n.t("message.circleCreated", { code: TEMPLATE_VALUE }),
    controller.i18n.t("message.circleJoined", { code: TEMPLATE_VALUE }),
    controller.i18n.t("message.circleSelected", { code: TEMPLATE_VALUE }),
    controller.i18n.t("message.pairCodeCreated", { code: TEMPLATE_VALUE })
  ];
  const toastTone: ToastTone =
    infoMessages.has(controller.message)
      ? "info"
      : successMessages.has(controller.message) ||
          successMessageTemplates.some((template) =>
            matchesToastTemplate(template, controller.message)
          )
        ? "success"
        : "info";

  return (
    <I18nProvider locale={controller.locale}>
      {controller.loading || !controller.status ? (
        <main
          className="app-shell grid h-screen place-items-center px-[14px] py-[12px] text-slate-100"
          style={shellStyle}
          data-background-theme={activeBackground}
        >
          <div className="app-shell__overlay" />
          <div className="relative z-10">{controller.i18n.t("app.loading")}</div>
        </main>
      ) : (
        <main
          className="app-shell relative flex h-screen flex-col overflow-hidden px-[14px] py-[12px]"
          style={shellStyle}
          data-background-theme={activeBackground}
        >
          <div className="app-shell__overlay" />
          <div className="relative z-10 flex min-h-0 flex-1 flex-col">
            {controller.gardenState.rest.active ? (
              <RestOverlay
                i18n={controller.i18n}
                remainingSeconds={controller.restRemainingSeconds}
                plannedBoostSeconds={controller.gardenState.rest.plannedBoostSeconds}
                onCancel={() => void controller.handleCancelRestBreak()}
              />
            ) : null}

            {showOnboarding ? (
              <FirstRunOnboardingModal
                onDone={() => void controller.handleDismissOnboarding()}
              />
            ) : null}

            {!showOnboarding && controller.yesterdayCatchUpItem ? (
              <StartupCatchUpModal
                historyItem={controller.yesterdayCatchUpItem}
                amountMl={controller.yesterdayCatchUpAmount}
                onChangeAmount={controller.setYesterdayCatchUpAmount}
                onDismiss={controller.handleDismissYesterdayCatchUp}
                onConfirm={() => void controller.handleConfirmYesterdayCatchUp()}
              />
            ) : null}

            <div className="shrink-0">
              <WindowChrome
                activeTab={controller.activeTab}
                syncBusy={controller.syncBusy}
                onRefreshSnapshots={() => void controller.handleRefreshSnapshotsNow()}
                onOpenSettings={() => controller.setActiveTab("settings")}
                onMinimize={() =>
                  void controller.handleWindowAction("minimize", () =>
                    controller.appWindow.minimize()
                  )
                }
                onHide={() =>
                  void controller.handleWindowAction("hide", () =>
                    controller.appWindow.hide()
                  )
                }
              />
            </div>

            {controller.message ? (
              <Toast message={controller.message} tone={toastTone} />
            ) : null}

            <div className="app-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
              <PrimaryTabs
                activeTab={controller.activeTab}
                onChange={controller.handleTabChange}
              />

              {controller.activeTab === "today" ? (
                <TodayPanel
                  settings={controller.settings}
                  status={controller.status}
                  quickAmount={controller.quickAmount}
                  setQuickAmount={controller.setQuickAmount}
                  onLog={(amountMl) => void controller.handleLog(amountMl)}
                  onUndo={() => void controller.handleUndoLastDrink()}
                />
              ) : null}

              {controller.activeTab === "history" ? (
                <HistoryPanel
                  history={controller.history}
                  gardenState={controller.gardenState}
                  restState={controller.gardenState.rest}
                  restCooldownRemainingSeconds={controller.restCooldownRemainingSeconds}
                  onPlantSeed={(dayKey, seedType) =>
                    void controller.handlePlantSeed(dayKey, seedType)
                  }
                  onHarvestCrop={(dayKey) => void controller.handleHarvestCrop(dayKey)}
                  onExchangeProduce={(sourceCropType, targetSeedType, quantity) =>
                    void controller.handleExchangeProduce(sourceCropType, targetSeedType, quantity)
                  }
                  onRedeemBackgroundReward={(rewardId) =>
                    void controller.handleRedeemBackgroundReward(rewardId)
                  }
                  onStartRest={() => void controller.handleStartRestBreak()}
                />
              ) : null}

              {controller.activeTab === "leaderboard" ? (
                <LeaderboardPanel
                  deviceId={controller.settings.deviceId}
                  displayName={controller.draftSettings.displayName}
                  nicknameSaving={controller.nicknameSaving}
                  nicknameSaveState={controller.nicknameSaveState}
                  nicknameSaveMessage={controller.nicknameSaveMessage}
                  cloudIdentityState={controller.cloudIdentityState}
                  cloudIdentityError={controller.cloudIdentityError}
                  activeCircleCode={controller.settings.activeCircleCode}
                  activeCircleName={controller.settings.activeCircleName}
                  viewerAccountId={controller.syncMeta.accountId}
                  circleMeta={{
                    ownerAccountId: controller.activeCircleOwnerAccountId,
                    memberCount: controller.activeCircleMemberCount
                  }}
                  circles={controller.circles}
                  circlesLoadState={controller.circlesLoadState}
                  circleCodeInput={controller.circleCodeInput}
                  circleNameInput={controller.circleNameInput}
                  metric={controller.leaderboardMetric}
                  leaderboard={controller.leaderboardEntries}
                  loading={controller.leaderboardLoading}
                  onDisplayNameChange={(value) => {
                    controller.setDraftSettings((current) => ({
                      ...current,
                      displayName: value
                    }));
                    controller.resetNicknameSaveFeedback();
                  }}
                  onSaveDisplayName={() => void controller.handleSaveDisplayName()}
                  onCircleCodeInputChange={controller.setCircleCodeInput}
                  onCircleNameInputChange={controller.setCircleNameInput}
                  onCreateCircle={() => void controller.handleCreateCircle()}
                  onJoinCircle={() => void controller.handleJoinCircle()}
                  onReconnectIdentity={() =>
                    void controller.handleReconnectLeaderboard()
                  }
                  onSelectCircle={(circle) => void controller.handleSelectCircle(circle)}
                  onMetricChange={controller.setLeaderboardMetric}
                  onRemoveMember={(targetAccountId, displayName) =>
                    void controller.handleRemoveCircleMember(targetAccountId, displayName)
                  }
                  onLeaveCircle={() => void controller.handleLeaveCurrentCircle()}
                  onDisbandCircle={() => void controller.handleDisbandCurrentCircle()}
                  onRefresh={() => void controller.refreshLeaderboard()}
                />
              ) : null}

              {controller.activeTab === "settings" ? (
                <SettingsPanel
                  draftSettings={controller.draftSettings}
                  activeBackground={activeBackground}
                  unlockedBackgrounds={controller.gardenState.unlockedBackgrounds}
                  reminderIntervalMinutes={controller.reminderMeta.reminderIntervalMinutes}
                  drinksPerDay={controller.reminderMeta.drinksPerDay}
                  version={APP_VERSION}
                  updateInfo={controller.updateInfo}
                  copyright={COPYRIGHT}
                  releaseUrl={RELEASE_URL}
                  saving={controller.saving}
                  notificationState={controller.notificationState}
                  syncMeta={controller.syncMeta}
                  pairCode={controller.pairCode}
                  pairCodeInput={controller.pairCodeInput}
                  syncBusy={controller.syncBusy}
                  setDraftSettings={controller.setDraftSettings}
                  onAutostartChange={(enabled) =>
                    void controller.handleAutostartChange(enabled)
                  }
                  onExportData={() => void controller.handleExportData()}
                  onImportData={() => void controller.handleImportData()}
                  onCreatePairCode={() => void controller.handleCreatePairCode()}
                  onPairCodeInputChange={controller.setPairCodeInput}
                  onBindPairCode={() => void controller.handleBindPairCode()}
                  onPullSyncNow={() => void controller.handlePullSyncNow()}
                  onPullSettingsNow={() => void controller.handlePullSettingsNow()}
                  onUploadCloudBackup={() => void controller.handleUploadCloudBackup()}
                  onRestoreCloudBackup={() => void controller.handleRestoreCloudBackup()}
                  onActiveBackgroundChange={(backgroundId) =>
                    void controller.handleActiveBackgroundChange(backgroundId)
                  }
                  onSave={() => void controller.handleSaveSettings()}
                />
              ) : null}
            </div>
          </div>
        </main>
      )}
    </I18nProvider>
  );
}
