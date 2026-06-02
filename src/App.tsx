import { HistoryPanel } from "./components/HistoryPanel";
import { LeaderboardPanel } from "./components/LeaderboardPanel";
import { PrimaryTabs } from "./components/PrimaryTabs";
import { RestOverlay } from "./components/RestOverlay";
import { SettingsPanel } from "./components/SettingsPanel";
import { StartupCatchUpModal } from "./components/StartupCatchUpModal";
import { Toast } from "./components/Toast";
import { TodayPanel } from "./components/TodayPanel";
import { WindowChrome } from "./components/WindowChrome";
import { I18nProvider } from "./i18n";
import {
  APP_VERSION,
  COPYRIGHT,
  RELEASE_URL,
  useAppController
} from "./hooks/useAppController";

export default function App() {
  const controller = useAppController();

  return (
    <I18nProvider locale={controller.locale}>
      {controller.loading || !controller.status ? (
        <main className="grid h-screen place-items-center px-[14px] py-[12px] text-slate-200/80">
          {controller.i18n.t("app.loading")}
        </main>
      ) : (
        <main className="flex h-screen flex-col overflow-hidden px-[14px] py-[12px]">
          {controller.gardenState.rest.active ? (
            <RestOverlay
              i18n={controller.i18n}
              remainingSeconds={controller.restRemainingSeconds}
              plannedBoostSeconds={controller.gardenState.rest.plannedBoostSeconds}
              onCancel={() => void controller.handleCancelRestBreak()}
            />
          ) : null}

          {controller.yesterdayCatchUpItem ? (
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

          {controller.message ? <Toast message={controller.message} /> : null}

          <div className="app-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
            <PrimaryTabs
              activeTab={controller.activeTab}
              onChange={controller.setActiveTab}
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
                onExchangeProduce={(sourceCropType, targetSeedType) =>
                  void controller.handleExchangeProduce(sourceCropType, targetSeedType)
                }
                onStartRest={() => void controller.handleStartRestBreak()}
              />
            ) : null}

            {controller.activeTab === "leaderboard" ? (
              <LeaderboardPanel
                displayName={controller.draftSettings.displayName}
                nicknameSaving={controller.nicknameSaving}
                nicknameSaveState={controller.nicknameSaveState}
                nicknameSaveMessage={controller.nicknameSaveMessage}
                cloudIdentityState={controller.cloudIdentityState}
                cloudIdentityError={controller.cloudIdentityError}
                activeCircleCode={controller.settings.activeCircleCode}
                activeCircleName={controller.settings.activeCircleName}
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
                onReconnectIdentity={() => void controller.handleReconnectLeaderboard()}
                onSelectCircle={(circle) => void controller.handleSelectCircle(circle)}
                onMetricChange={controller.setLeaderboardMetric}
                onRefresh={() => void controller.refreshLeaderboard()}
              />
            ) : null}

            {controller.activeTab === "settings" ? (
              <SettingsPanel
                draftSettings={controller.draftSettings}
                reminderIntervalMinutes={controller.reminderMeta.reminderIntervalMinutes}
                drinksPerDay={controller.reminderMeta.drinksPerDay}
                version={APP_VERSION}
                updateInfo={controller.updateInfo}
                copyright={COPYRIGHT}
                releaseUrl={RELEASE_URL}
                saving={controller.saving}
                notificationState={controller.notificationState}
                setDraftSettings={controller.setDraftSettings}
                onAutostartChange={(enabled) =>
                  void controller.handleAutostartChange(enabled)
                }
                onExportData={() => void controller.handleExportData()}
                onImportData={() => void controller.handleImportData()}
                onSave={() => void controller.handleSaveSettings()}
              />
            ) : null}
          </div>
        </main>
      )}
    </I18nProvider>
  );
}
