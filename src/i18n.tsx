import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Locale } from "./types";

type TranslationKey =
  | "app.loading"
  | "message.logged"
  | "message.undo"
  | "message.windowActionFailed"
  | "message.settingsSaved"
  | "message.exportSuccess"
  | "message.importSuccess"
  | "message.yesterdayCatchUpSaved"
  | "message.initialSeedsGranted"
  | "initialSeeds.badge"
  | "initialSeeds.title"
  | "initialSeeds.description"
  | "initialSeeds.seedCount"
  | "initialSeeds.confirm"
  | "message.seedPlanted"
  | "message.cropHarvested"
  | "message.exchangeSuccess"
  | "message.restStarted"
  | "message.restCancelled"
  | "message.restCompleted"
  | "message.circleCreated"
  | "message.circleJoined"
  | "message.circleSelected"
  | "message.circleMemberRemoved"
  | "message.circleLeft"
  | "message.circleDisbanded"
  | "leaderboard.identityReconnectSuccess"
  | "window.subtitle"
  | "window.openSettings"
  | "window.minimize"
  | "window.hideToTray"
  | "window.activeDrinkers"
  | "tabs.navigation"
  | "tabs.today"
  | "tabs.history"
  | "tabs.leaderboard"
  | "today.title"
  | "today.nextReminder"
  | "today.progress"
  | "today.target"
  | "today.expected"
  | "today.actual"
  | "today.debt"
  | "today.remaining"
  | "today.quickLog"
  | "today.quickLogHelp"
  | "today.snooze"
  | "today.resetToCup"
  | "today.logOneCup"
  | "today.logAmount"
  | "today.undoAmount"
  | "today.undoLastLog"
  | "rest.title"
  | "rest.description"
  | "rest.start"
  | "rest.ready"
  | "rest.cooldown"
  | "rest.nextBoost"
  | "rest.overlayEyebrow"
  | "rest.overlayDescription"
  | "rest.overlayBoost"
  | "rest.overlayBoostValue"
  | "rest.cancel"
  | "settings.title"
  | "settings.description"
  | "settings.dailyTarget"
  | "settings.cupSize"
  | "settings.cupStep"
  | "settings.interval"
  | "settings.intervalHelp"
  | "settings.startHour"
  | "settings.endHour"
  | "settings.panelOpacity"
  | "settings.panelOpacityHelp"
  | "settings.panelBlur"
  | "settings.panelBlurHelp"
  | "settings.backgroundTitle"
  | "settings.backgroundDescription"
  | "settings.backgroundDefault"
  | "settings.backgroundHint"
  | "settings.language"
  | "settings.notifications"
  | "settings.autostart"
  | "settings.permissionTitle"
  | "settings.permissionStatus"
  | "settings.permissionGranted"
  | "settings.permissionDenied"
  | "settings.permissionUnsupported"
  | "settings.permissionPrompt"
  | "settings.notificationNote"
  | "settings.dataTitle"
  | "settings.dataDescription"
  | "settings.exportData"
  | "settings.importData"
  | "settings.cloudSyncTitle"
  | "settings.cloudSyncDescription"
  | "settings.cloudSyncPullNow"
  | "settings.cloudSyncAccount"
  | "settings.cloudSyncAccountMissing"
  | "settings.cloudSyncLastPull"
  | "settings.cloudSyncPairCode"
  | "settings.cloudSyncPairCodeMissing"
  | "settings.cloudSyncCreatePairCode"
  | "settings.cloudSyncPairCodePlaceholder"
  | "settings.cloudSyncBindDevice"
  | "settings.cloudBackupUpload"
  | "settings.cloudBackupRestore"
  | "settings.cloudBackupLast"
  | "settings.syncHelpTitle"
  | "settings.syncHelpDescription"
  | "settings.syncHelpClose"
  | "settings.syncHelpView"
  | "settings.syncHelpRecentTitle"
  | "settings.syncHelpRecentDescription"
  | "settings.syncHelpBackupTitle"
  | "settings.syncHelpBackupDescription"
  | "settings.syncHelpPreferencesTitle"
  | "settings.syncHelpPreferencesDescription"
  | "settings.syncSettings"
  | "settings.save"
  | "settings.saving"
  | "settings.languageZhCn"
  | "settings.languageEnUs"
  | "settings.version"
  | "settings.updateAvailable"
  | "settings.downloadUpdate"
  | "settings.downloadLatest"
  | "message.syncGapWarning"
  | "message.backgroundSynced"
  | "message.backgroundSelected"
  | "message.pairCodeCreated"
  | "message.deviceBound"
  | "message.snapshotsPulled"
  | "message.syncDeferred"
  | "message.settingsSynced"
  | "message.cloudBackupUploaded"
  | "message.cloudBackupRestored"
  | "leaderboard.title"
  | "leaderboard.description"
  | "leaderboard.loading"
  | "leaderboard.refresh"
  | "leaderboard.displayName"
  | "leaderboard.displayNameSave"
  | "leaderboard.displayNameSaving"
  | "leaderboard.displayNameSaved"
  | "leaderboard.displayNameSaveFailed"
  | "leaderboard.identityStatusTitle"
  | "leaderboard.identityLoading"
  | "leaderboard.identityReady"
  | "leaderboard.identityError"
  | "leaderboard.identityRetry"
  | "leaderboard.identityHint"
  | "leaderboard.activeCircle"
  | "leaderboard.circleCode"
  | "leaderboard.empty"
  | "leaderboard.circleTitle"
  | "leaderboard.circleDescription"
  | "leaderboard.circleCreateName"
  | "leaderboard.circleCreate"
  | "leaderboard.circleJoinCode"
  | "leaderboard.circleJoin"
  | "leaderboard.circleSwitchHint"
  | "leaderboard.circleEmpty"
  | "leaderboard.circleLoading"
  | "leaderboard.circleLoadFailed"
  | "leaderboard.memberRemove"
  | "leaderboard.leaveCircle"
  | "leaderboard.disbandCircle"
  | "leaderboard.ownerLeaveBlocked"
  | "leaderboard.metricIntake"
  | "leaderboard.metricProgress"
  | "leaderboard.intakeValue"
  | "leaderboard.progressValue"
  | "leaderboard.targetValue"
  | "leaderboard.noData"
  | "leaderboard.memberGardenTitle"
  | "leaderboard.memberGardenDescription"
  | "leaderboard.memberGardenLoading"
  | "leaderboard.memberGardenError"
  | "leaderboard.memberGardenEmpty"
  | "leaderboard.memberGardenRemove"
  | "leaderboard.memberGardenActiveCrops"
  | "history.title"
  | "history.description"
  | "history.heatmapTitle"
  | "history.heatmapDescription"
  | "history.newestFirst"
  | "history.oldestLast"
  | "history.tooltip"
  | "history.goalMet"
  | "history.nearGoal"
  | "history.low"
  | "history.veryLow"
  | "history.recentTitle"
  | "history.recentAmounts"
  | "history.met"
  | "history.notMet"
  | "history.shortfall"
  | "history.missedReminders"
  | "history.debtExplanation"
  | "garden.seedStock"
  | "garden.seedCount"
  | "garden.harvested"
  | "garden.harvestCount"
  | "garden.plantable"
  | "garden.plotCount"
  | "garden.plantAction"
  | "garden.readyToHarvest"
  | "garden.growing"
  | "garden.harvestedCell"
  | "garden.noSeeds"
  | "garden.emptyPlot"
  | "garden.collectionTitle"
  | "garden.collectionDescription"
  | "garden.collectionEmpty"
  | "garden.inventoryTitle"
  | "garden.inventoryDescription"
  | "garden.inventorySeeds"
  | "garden.inventoryProduce"
  | "garden.produceEmpty"
  | "garden.exchangeTitle"
  | "garden.exchangeRule"
  | "garden.exchangeAction"
  | "garden.exchangeHub"
  | "exchange.footerHint"
  | "exchange.description"
  | "exchange.seedTab"
  | "exchange.backgroundTab"
  | "exchange.availableProduce"
  | "exchange.availableProduceHelp"
  | "exchange.noAvailableProduce"
  | "exchange.allSeeds"
  | "exchange.allSeedsHelp"
  | "exchange.seedUnavailable"
  | "exchange.noTargetSeeds"
  | "exchange.previousBackground"
  | "exchange.nextBackground"
  | "exchange.viewBackground"
  | "exchange.unlocked"
  | "exchange.redeemBackground"
  | "exchange.notSupported"
  | "exchange.noBackgroundRewards"
  | "exchange.decreaseQuantity"
  | "exchange.increaseQuantity"
  | "exchange.back"
  | "exchange.close"
  | "leaderboard.actionRemoveMemberTitle"
  | "leaderboard.actionLeaveCircleTitle"
  | "leaderboard.actionDisbandCircleTitle"
  | "leaderboard.actionRemoveMemberDescription"
  | "leaderboard.actionLeaveCircleDescription"
  | "leaderboard.actionDisbandCircleDescription"
  | "leaderboard.actionClose"
  | "leaderboard.actionCancel"
  | "leaderboard.actionConfirm"
  | "onboarding.badge"
  | "onboarding.title"
  | "onboarding.description"
  | "onboarding.viewSlide"
  | "onboarding.previous"
  | "onboarding.next"
  | "onboarding.coreTitle"
  | "onboarding.drinkTitle"
  | "onboarding.drinkCopy"
  | "onboarding.logTitle"
  | "onboarding.logCopy"
  | "onboarding.reminderTitle"
  | "onboarding.reminderCopy"
  | "onboarding.gardenTitle"
  | "onboarding.plantTitle"
  | "onboarding.plantCopy"
  | "onboarding.backgroundTitle"
  | "onboarding.backgroundCopy"
  | "onboarding.syncTitle"
  | "onboarding.multiDeviceTitle"
  | "onboarding.multiDeviceCopy"
  | "onboarding.syncOneLine"
  | "onboarding.syncFlowOld"
  | "onboarding.syncFlowNew"
  | "onboarding.recentSync"
  | "onboarding.backupSync"
  | "onboarding.syncDetailsTitle"
  | "onboarding.syncDetails"
  | "onboarding.learnSync"
  | "onboarding.hideSyncDetails"
  | "onboarding.start"
  | "notification.drinkNowTitle"
  | "notification.drinkNowBody"
  | "notification.snoozeTitle"
  | "notification.snoozeBody"
  | "startupCatchUp.badge"
  | "startupCatchUp.title"
  | "startupCatchUp.description"
  | "startupCatchUp.yesterdaySummary"
  | "startupCatchUp.actual"
  | "startupCatchUp.target"
  | "startupCatchUp.amountTitle"
  | "startupCatchUp.amountHelp"
  | "startupCatchUp.dismiss"
  | "startupCatchUp.confirm"
  | "common.notScheduled";

type TranslationParams = Record<string, string | number>;
type TranslationTable = Record<TranslationKey, string>;

const enUs: TranslationTable = {
  "app.loading": "Loading your hydration assistant...",
  "message.logged": "Logged {amount}.",
  "message.undo": "Undid the last {amount} log.",
  "message.windowActionFailed": "Window action failed: {action} was not completed, {detail}",
  "message.settingsSaved": "Settings saved. Reminder pacing and language have been updated.",
  "message.exportSuccess": "Data exported.",
  "message.importSuccess": "Data imported and refreshed.",
  "message.yesterdayCatchUpSaved": "Added {amount} to yesterday's log.",
  "message.initialSeedsGranted": "Initial seeds granted: one of each tier-one seed.",
  "initialSeeds.badge": "Starter pack",
  "initialSeeds.title": "Seeds are ready",
  "initialSeeds.description": "You received one of each tier-one seed. Log water, pick a day, and start planting.",
  "initialSeeds.seedCount": "x {count}",
  "initialSeeds.confirm": "Got it",
  "message.seedPlanted": "Planted on {day}.",
  "message.cropHarvested": "Harvested crops from {day}.",
  "message.exchangeSuccess": "Exchanged for {count} {seed} seeds.",
  "message.restStarted": "Rest break started.",
  "message.restCancelled": "Rest break cancelled. No boost was granted.",
  "message.restCompleted": "Rest complete. Your crops received a growth boost.",
  "message.circleCreated": "Created circle {code}.",
  "message.circleJoined": "Joined circle {code}.",
  "message.circleSelected": "Switched to circle {code}.",
  "message.circleMemberRemoved": "Member removed from the circle.",
  "message.circleLeft": "Left the current circle.",
  "message.circleDisbanded": "The current circle has been disbanded.",
  "leaderboard.identityReconnectSuccess": "Reconnected to the leaderboard service.",
  "window.subtitle": "Desktop hydration assistant",
  "window.openSettings": "Open settings",
  "window.minimize": "Minimize",
  "window.hideToTray": "Hide to tray",
  "window.activeDrinkers": "{count} people are drinking too",
  "tabs.navigation": "Switch sections",
  "tabs.today": "Today",
  "tabs.history": "History",
  "tabs.leaderboard": "Leaderboard",
  "today.title": "Today's hydration",
  "today.nextReminder": "Next reminder",
  "today.progress": "Progress",
  "today.target": "Target {amount}",
  "today.expected": "Should be at {amount}",
  "today.actual": "Actually drank {amount}",
  "today.debt": "Behind by {amount}",
  "today.remaining": "Remaining {amount}",
  "today.quickLog": "Quick log",
  "today.quickLogHelp": "Log one cup fast, or fine-tune how much you actually drank.",
  "today.snooze": "Snooze",
  "today.resetToCup": "Reset to cup",
  "today.logOneCup": "Log one cup {amount}",
  "today.logAmount": "Log {amount}",
  "today.undoAmount": "Undo {amount}",
  "today.undoLastLog": "Undo last log",
  "rest.title": "Active rest boost",
  "rest.description": "No timed nagging. You choose when to take a short break and boost every growing crop.",
  "rest.start": "Start break",
  "rest.ready": "Ready now",
  "rest.cooldown": "Cooling down, about {minutes} min left",
  "rest.nextBoost": "Complete a break to boost {hours} hours",
  "rest.overlayEyebrow": "REST MODE",
  "rest.overlayDescription": "Step away for a bit. When this finishes, all growing crops get a time boost.",
  "rest.overlayBoost": "This break will grant",
  "rest.overlayBoostValue": "{hours} hours",
  "rest.cancel": "End early",
  "settings.title": "General settings",
  "settings.description": "Reminder pacing is calculated automatically from the target, cup size, and active hours.",
  "settings.dailyTarget": "Daily target (ml)",
  "settings.cupSize": "Cup size (ml)",
  "settings.cupStep": "Cup adjustment step (ml)",
  "settings.interval": "Reminder interval (minutes)",
  "settings.intervalHelp": "Auto-calculated: {drinksPerDay} drinks per day, about every {minutes} minutes",
  "settings.startHour": "Start hour",
  "settings.endHour": "End hour",
  "settings.panelOpacity": "Panel opacity",
  "settings.panelOpacityHelp": "Higher values make cards more solid and easier to read over the wallpaper.",
  "settings.panelBlur": "Panel blur",
  "settings.panelBlurHelp": "Lower values reduce the frosted glass effect. Set it to 0 for a crisp background.",
  "settings.backgroundTitle": "Background",
  "settings.backgroundDescription": "Choose an unlocked wallpaper, or return to the default interface.",
  "settings.backgroundDefault": "Default UI",
  "settings.backgroundHint": "Locked backgrounds can be redeemed in the History exchange center.",
  "settings.language": "Interface language",
  "settings.notifications": "System notifications",
  "settings.autostart": "Launch at startup",
  "settings.permissionTitle": "Notification permission",
  "settings.permissionStatus": "Current status: {status}",
  "settings.permissionGranted": "Granted",
  "settings.permissionDenied": "Denied, reminders may not appear",
  "settings.permissionUnsupported": "This environment does not support frontend permission checks",
  "settings.permissionPrompt": "Waiting for system confirmation",
  "settings.notificationNote": "On Windows, system notifications are usually more reliable in the installed app than in a dev process.",
  "settings.dataTitle": "Data management",
  "settings.dataDescription": "Export a backup file, or import it on a new computer to restore your history and settings.",
  "settings.exportData": "Export data",
  "settings.importData": "Import data",
  "settings.cloudSyncTitle": "Cloud sync",
  "settings.cloudSyncDescription": "Use this for everyday switching between devices. It keeps the last 7 days, garden, and account-level preferences fresh automatically.",
  "settings.cloudSyncPullNow": "Sync recent state",
  "settings.cloudSyncAccount": "Sync account",
  "settings.cloudSyncAccountMissing": "Not created yet",
  "settings.cloudSyncLastPull": "Last pull",
  "settings.cloudSyncPairCode": "Current pair code",
  "settings.cloudSyncPairCodeMissing": "Not generated",
  "settings.cloudSyncCreatePairCode": "Create pair code",
  "settings.cloudSyncPairCodePlaceholder": "Enter a pair code from another device",
  "settings.cloudSyncBindDevice": "Bind device",
  "settings.cloudBackupUpload": "Upload full backup",
  "settings.cloudBackupRestore": "Restore full backup",
  "settings.cloudBackupLast": "Last cloud backup",
  "settings.syncHelpTitle": "When to sync manually",
  "settings.syncHelpDescription": "Most sync happens automatically. These two cases are worth checking yourself.",
  "settings.syncHelpClose": "Close help",
  "settings.syncHelpView": "View sync help",
  "settings.syncHelpRecentTitle": "You just used another device",
  "settings.syncHelpRecentDescription": "The app auto-pulls the last 7 days, garden, and settings on launch and when you visit Today or History. Use Sync recent state when you want to check immediately.",
  "settings.syncHelpBackupTitle": "New device or more than 7 days",
  "settings.syncHelpBackupDescription": "Recent sync only covers the last 7 days. For migration or a long gap, upload a cloud backup on the old device, then restore it on the new one.",
  "settings.syncHelpPreferencesTitle": "Settings preferences",
  "settings.syncHelpPreferencesDescription": "Daily target, cup size, reminder hours, and language pull with recent sync. Window appearance, launch at startup, and notification permission stay device-specific.",
  "settings.syncSettings": "Sync settings",
  "settings.save": "Save settings",
  "settings.saving": "Saving...",
  "settings.languageZhCn": "Simplified Chinese",
  "settings.languageEnUs": "English",
  "settings.version": "Version: {version}",
  "settings.updateAvailable": "Version {version} is available here if you want to update.",
  "settings.downloadUpdate": "Download this update",
  "settings.downloadLatest": "Download new version",
  "message.syncGapWarning": "This device has been away for more than 7 days. Recent sync may miss older history; restore a full cloud backup if this is a new or stale device.",
  "message.backgroundSynced": "Unlocked the cat collage background and synced it to the cloud.",
  "message.backgroundSelected": "Background updated.",
  "message.pairCodeCreated": "Pair code created: {code}",
  "message.deviceBound": "Device paired successfully.",
  "message.snapshotsPulled": "Recent state is up to date.",
  "message.syncDeferred": "Saved locally. Cloud sync did not finish; try Sync recent state again when the connection is steadier.",
  "message.settingsSynced": "Settings are synced.",
  "message.cloudBackupUploaded": "Cloud backup uploaded.",
  "message.cloudBackupRestored": "Restored data from cloud backup.",
  "leaderboard.title": "Hydration leaderboard",
  "leaderboard.description": "Use a circle code to bring a few people into one small group and compare today's hydration at a glance.",
  "leaderboard.loading": "Refreshing...",
  "leaderboard.refresh": "Refresh",
  "leaderboard.displayName": "My display name",
  "leaderboard.displayNameSave": "Save name",
  "leaderboard.displayNameSaving": "Saving...",
  "leaderboard.displayNameSaved": "Name saved and synced.",
  "leaderboard.displayNameSaveFailed": "Couldn't save the name:",
  "leaderboard.identityStatusTitle": "Cloud leaderboard connection",
  "leaderboard.identityLoading": "Creating or checking your cloud identity...",
  "leaderboard.identityReady": "Your cloud identity is ready and circle features should work.",
  "leaderboard.identityError": "Your cloud identity could not be established, so circle features may fail.",
  "leaderboard.identityRetry": "Retry connection",
  "leaderboard.identityHint": "Save the name to sync it with this device's cloud identity.",
  "leaderboard.activeCircle": "Active circle: {name}",
  "leaderboard.circleCode": "Circle code {code}",
  "leaderboard.empty": "You have not joined a circle yet. Create one first, or enter someone else's circle code.",
  "leaderboard.circleTitle": "Circle management",
  "leaderboard.circleDescription": "Create a small circle, or join someone else's leaderboard with a 6-character circle code.",
  "leaderboard.circleCreateName": "New circle name",
  "leaderboard.circleCreate": "Create circle",
  "leaderboard.circleJoinCode": "Enter circle code",
  "leaderboard.circleJoin": "Join circle",
  "leaderboard.circleSwitchHint": "Tap a circle chip below to switch the active leaderboard right away.",
  "leaderboard.circleEmpty": "No joined circles yet.",
  "leaderboard.circleLoading": "Syncing joined circles...",
  "leaderboard.circleLoadFailed": "Couldn't sync the joined circles right now. Please try again later.",
  "leaderboard.memberRemove": "Remove",
  "leaderboard.leaveCircle": "Leave circle",
  "leaderboard.disbandCircle": "Disband circle",
  "leaderboard.ownerLeaveBlocked": "As the circle owner, remove other members first before disbanding.",
  "leaderboard.metricIntake": "By intake",
  "leaderboard.metricProgress": "By progress",
  "leaderboard.intakeValue": "Drank {amount}",
  "leaderboard.progressValue": "{percent}% complete",
  "leaderboard.targetValue": "Target {amount}",
  "leaderboard.noData": "No one in this circle has synced data for today yet.",
  "leaderboard.memberGardenTitle": "{name}'s garden",
  "leaderboard.memberGardenDescription": "View this member's recent garden.",
  "leaderboard.memberGardenLoading": "Loading this garden...",
  "leaderboard.memberGardenError": "Could not load this garden right now.",
  "leaderboard.memberGardenEmpty": "This member has not synced a garden yet.",
  "leaderboard.memberGardenRemove": "Remove member",
  "leaderboard.memberGardenActiveCrops": "Growing",
  "history.title": "Hydration history",
  "history.description": "Use color to scan how each day went. Healthier colors mean you were closer to the goal.",
  "history.heatmapTitle": "Last 8 weeks",
  "history.heatmapDescription": "The top-left cell is the newest day, and later cells move backward in time. Green means goal met, while warmer colors mean you were further from the goal.",
  "history.newestFirst": "Newest: {day}",
  "history.oldestLast": "Older: {day}",
  "history.tooltip": "{day} | actual {actual}{target}",
  "history.goalMet": "Goal met",
  "history.nearGoal": "Near goal",
  "history.low": "Below target",
  "history.veryLow": "Far below target",
  "history.recentTitle": "Last 7 days",
  "history.recentAmounts": "Actual {actual} / Counted {consumed}",
  "history.met": "Met goal",
  "history.notMet": "Missed goal",
  "history.shortfall": "Short by {amount}",
  "history.missedReminders": "Missed {count} reminders",
  "history.debtExplanation": "Reminder-based debt {amount}",
  "garden.seedStock": "Seed stock",
  "garden.seedCount": "{count} seeds",
  "garden.harvested": "Harvested",
  "garden.harvestCount": "{count} times",
  "garden.plantable": "Plantable",
  "garden.plotCount": "{count} plots",
  "garden.plantAction": "Plant seed",
  "garden.readyToHarvest": "Ready to harvest",
  "garden.growing": "Growing {percent}%",
  "garden.harvestedCell": "Harvested",
  "garden.noSeeds": "No seeds left",
  "garden.emptyPlot": "Log water first",
  "garden.inventoryTitle": "Seeds and produce",
  "garden.inventoryDescription": "This shows what you can still plant or exchange right now.",
  "garden.inventorySeeds": "Seeds",
  "garden.inventoryProduce": "Produce",
  "garden.produceEmpty": "No exchangeable produce yet. Harvests will appear here first.",
  "garden.collectionTitle": "Collection totals",
  "garden.collectionDescription": "This tracks lifetime harvests and does not go down when you exchange produce.",
  "garden.collectionEmpty": "No harvests yet. Plant on a day with a water record first.",
  "garden.exchangeTitle": "Seed exchange",
  "garden.exchangeRule": "Use your produce to exchange for other seeds.",
  "garden.exchangeAction": "Exchange",
  "garden.exchangeHub": "Exchange hub",
  "exchange.footerHint": "Select a produce source and a seed target first.",
  "exchange.description": "This modal contains both seed exchanges and background rewards. Background titles, descriptions, and costs are config-driven.",
  "exchange.seedTab": "Seed exchange",
  "exchange.backgroundTab": "Background rewards",
  "exchange.availableProduce": "Available produce",
  "exchange.availableProduceHelp": "Only produce that you currently own appears here.",
  "exchange.noAvailableProduce": "You do not have produce available for seed exchanges yet.",
  "exchange.allSeeds": "All seeds",
  "exchange.allSeedsHelp": "10 total. Targets unavailable for the selected produce are disabled.",
  "exchange.seedUnavailable": "{seed} unavailable",
  "exchange.noTargetSeeds": "This produce does not have exchangeable seed targets right now.",
  "exchange.previousBackground": "Previous background",
  "exchange.nextBackground": "Next background",
  "exchange.viewBackground": "View background {index}",
  "exchange.unlocked": "Unlocked",
  "exchange.redeemBackground": "Redeem background",
  "exchange.notSupported": "Not supported yet",
  "exchange.noBackgroundRewards": "No background rewards configured.",
  "exchange.decreaseQuantity": "Decrease exchange quantity",
  "exchange.increaseQuantity": "Increase exchange quantity",
  "exchange.back": "Back",
  "exchange.close": "Close",
  "leaderboard.actionRemoveMemberTitle": "Remove member",
  "leaderboard.actionLeaveCircleTitle": "Leave circle",
  "leaderboard.actionDisbandCircleTitle": "Disband circle",
  "leaderboard.actionRemoveMemberDescription": "Remove \"{name}\" from this circle?",
  "leaderboard.actionLeaveCircleDescription": "Leave the current circle? You will no longer appear on this circle leaderboard.",
  "leaderboard.actionDisbandCircleDescription": "Disband this circle? Membership and leaderboard records for this circle will be deleted.",
  "leaderboard.actionClose": "Close",
  "leaderboard.actionCancel": "Cancel",
  "leaderboard.actionConfirm": "Confirm",
  "onboarding.badge": "Welcome",
  "onboarding.title": "A quiet water reminder and tracker",
  "onboarding.description": "The desktop app handles reminders, quick logging, and history. A mobile mini program is in development and will work with the desktop app.",
  "onboarding.viewSlide": "View slide {index}",
  "onboarding.previous": "Previous",
  "onboarding.next": "Next",
  "onboarding.coreTitle": "Start with the three essentials",
  "onboarding.drinkTitle": "Drink water",
  "onboarding.drinkCopy": "See today's target and what is still left.",
  "onboarding.logTitle": "Log quickly",
  "onboarding.logCopy": "Record one cup, fine-tune the amount, or undo the last log.",
  "onboarding.reminderTitle": "Stay reminded",
  "onboarding.reminderCopy": "Reminders follow your active hours and daily target.",
  "onboarding.gardenTitle": "A little extra motivation",
  "onboarding.plantTitle": "Plant in daily cells",
  "onboarding.plantCopy": "Use water records as plots and grow crops over time.",
  "onboarding.backgroundTitle": "Redeem backgrounds",
  "onboarding.backgroundCopy": "Harvest crops and exchange them for wallpapers.",
  "onboarding.syncTitle": "Use it across devices",
  "onboarding.multiDeviceTitle": "Multi-device sync",
  "onboarding.multiDeviceCopy": "Desktop and mini program data can stay in sync.",
  "onboarding.syncOneLine": "Pair devices, sync recent data, back up full history.",
  "onboarding.syncFlowOld": "Old device creates code",
  "onboarding.syncFlowNew": "New device enters it",
  "onboarding.recentSync": "Recent sync covers the latest 7 days automatically.",
  "onboarding.backupSync": "Use cloud backup for complete history.",
  "onboarding.syncDetailsTitle": "Which sync should I use?",
  "onboarding.syncDetails": "Pair devices with a code. Recent sync covers 7 days; cloud backup restores full history.",
  "onboarding.learnSync": "Learn sync",
  "onboarding.hideSyncDetails": "Hide sync details",
  "onboarding.start": "Start using",
  "notification.drinkNowTitle": "Time to drink water",
  "notification.drinkNowBody": "A new reminder window has started. Try to drink a cup now.",
  "notification.snoozeTitle": "Reminder again",
  "notification.snoozeBody": "Your snooze has ended. This is a good time to catch up on that cup.",
  "startupCatchUp.badge": "Yesterday can still be updated",
  "startupCatchUp.title": "Do you want to add water to yesterday?",
  "startupCatchUp.description": "If you drank more water after shutting down or forgot to record it, you can add it here so {day} stays accurate.",
  "startupCatchUp.yesterdaySummary": "Yesterday's current record",
  "startupCatchUp.actual": "Drank {amount}",
  "startupCatchUp.target": "Target {amount}",
  "startupCatchUp.amountTitle": "How much should we add?",
  "startupCatchUp.amountHelp": "Start from 250 ml and fine-tune with +50 / -50.",
  "startupCatchUp.dismiss": "Not now",
  "startupCatchUp.confirm": "Add {amount}",
  "common.notScheduled": "Not scheduled"
};

const zhCn: TranslationTable = {
  ...enUs,
  "app.loading": "正在加载谁是吨吨大王...",
  "message.logged": "已记录 {amount}。",
  "message.undo": "已撤销上次记录 {amount}。",
  "message.windowActionFailed": "窗口操作失败：{action}，{detail}",
  "message.settingsSaved": "设置已保存。",
  "message.exportSuccess": "数据已导出。",
  "message.importSuccess": "数据已导入并刷新。",
  "message.yesterdayCatchUpSaved": "已为昨天补记 {amount}。",
  "message.initialSeedsGranted": "已发放初始种子：一级种子每样 1 颗。",
  "initialSeeds.badge": "新手种子包",
  "initialSeeds.title": "种子已发放",
  "initialSeeds.description": "记录喝水后，第二天就可以种下种子，水量多少会影响作物生长速度哦。",
  "initialSeeds.seedCount": "x {count}",
  "initialSeeds.confirm": "知道了",
  "message.seedPlanted": "已在 {day} 播种。",
  "message.cropHarvested": "已收获 {day} 的作物。",
  "message.exchangeSuccess": "已兑换 {count} 颗 {seed} 种子。",
  "message.restStarted": "休息已开始。",
  "message.restCancelled": "本次休息已取消，没有获得加成。",
  "message.restCompleted": "休息完成，作物获得成长加速。",
  "message.circleCreated": "已创建圈子 {code}。",
  "message.circleJoined": "已加入圈子 {code}。",
  "message.circleSelected": "已切换到圈子 {code}。",
  "leaderboard.identityReconnectSuccess": "已重新连接排行榜服务。",
  "window.subtitle": "吨吨大王",
  "window.openSettings": "打开设置",
  "window.minimize": "最小化",
  "window.hideToTray": "隐藏到托盘",
  "window.activeDrinkers": "{count} 人也在喝水",
  "tabs.navigation": "页面切换",
  "tabs.today": "今日",
  "tabs.history": "历史",
  "tabs.leaderboard": "排行榜",
  "today.title": "今日饮水",
  "today.nextReminder": "下次提醒",
  "today.progress": "进度",
  "today.target": "目标 {amount}",
  "today.expected": "当前应喝 {amount}",
  "today.actual": "实际已喝 {amount}",
  "today.debt": "当前欠量 {amount}",
  "today.remaining": "剩余 {amount}",
  "today.quickLog": "快速记录",
  "today.quickLogHelp": "默认一键记一杯，也可以微调本次实际喝了多少。",
  "today.snooze": "稍后提醒",
  "today.resetToCup": "恢复单杯",
  "today.logOneCup": "记一杯 {amount}",
  "today.logAmount": "记录 {amount}",
  "today.undoAmount": "撤销上次 {amount}",
  "today.undoLastLog": "撤销上次记录",
  "rest.title": "主动休息 Boost",
  "rest.description": "主动开始一次短暂休息，让田里的作物一起加速成长。",
  "rest.start": "开始休息",
  "rest.ready": "现在可以开始",
  "rest.cooldown": "冷却中，还需约 {minutes} 分钟",
  "rest.nextBoost": "休息完成可加速 {hours} 小时",
  "rest.overlayDescription": "保持离开屏幕一小会儿，完成后全部在种作物都会获得加速。",
  "rest.overlayBoost": "本次成长加速",
  "rest.overlayBoostValue": "{hours} 小时",
  "rest.cancel": "提前结束",
  "settings.title": "常规设置",
  "settings.description": "提醒节奏会根据目标量、单杯容量和提醒时间自动计算。",
  "settings.dailyTarget": "每日目标 (ml)",
  "settings.cupSize": "单杯容量 (ml)",
  "settings.cupStep": "杯量调整步进 (ml)",
  "settings.interval": "提醒间隔 (分钟)",
  "settings.intervalHelp": "自动计算：每天 {drinksPerDay} 杯，约每 {minutes} 分钟提醒一次",
  "settings.startHour": "开始提醒时间",
  "settings.endHour": "结束提醒时间",
  "settings.language": "界面语言",
  "settings.notifications": "系统通知",
  "settings.autostart": "开机自启",
  "settings.permissionTitle": "通知权限",
  "settings.permissionStatus": "当前状态：{status}",
  "settings.permissionGranted": "已允许",
  "settings.permissionDenied": "已拒绝，提醒可能无法弹出",
  "settings.permissionUnsupported": "当前环境不支持前端权限检测",
  "settings.permissionPrompt": "等待系统确认",
  "settings.notificationNote": "在 Windows 上，安装后的应用通常比开发调试进程更稳定地显示系统通知。",
  "settings.dataTitle": "数据管理",
  "settings.dataDescription": "可导出备份文件，也可在新电脑上导入恢复历史记录和设置。",
  "settings.exportData": "导出数据",
  "settings.importData": "导入数据",
  "settings.cloudSyncTitle": "云端同步",
  "settings.cloudSyncDescription": "用于日常在多台设备之间切换。应用会自动同步最近 7 天、农场和账户级偏好。",
  "settings.cloudSyncPullNow": "同步近7天数据状态",
  "settings.cloudSyncAccount": "同步账户",
  "settings.cloudSyncAccountMissing": "尚未创建",
  "settings.cloudSyncLastPull": "最近拉取",
  "settings.cloudSyncPairCode": "当前配对码",
  "settings.cloudSyncPairCodeMissing": "尚未生成",
  "settings.cloudSyncCreatePairCode": "生成配对码",
  "settings.cloudSyncPairCodePlaceholder": "输入另一台设备上的配对码",
  "settings.cloudSyncBindDevice": "绑定设备",
  "settings.cloudBackupUpload": "上传完整备份",
  "settings.cloudBackupRestore": "恢复完整备份",
  "settings.cloudBackupLast": "最近云备份",
  "settings.syncHelpTitle": "什么时候需要手动同步",
  "settings.syncHelpDescription": "大多数时候应用会自动同步。下面两种情况需要你确认一下。",
  "settings.syncHelpClose": "关闭说明",
  "settings.syncHelpView": "查看同步说明",
  "settings.syncHelpRecentTitle": "刚在另一台设备记录过",
  "settings.syncHelpRecentDescription": "打开应用、切到今日或历史页时会自动拉取最近 7 天、农场和设置。想立刻确认最新状态时，点击顶部的同步按钮即可。",
  "settings.syncHelpBackupTitle": "新设备或超过 7 天没同步",
  "settings.syncHelpBackupDescription": "近期同步只保留最近 7 天。换新设备或很久没打开时，先在旧设备上传云备份，再在新设备从云端恢复。",
  "settings.syncHelpPreferencesTitle": "设置偏好",
  "settings.syncHelpPreferencesDescription": "每日目标、杯量、提醒时间和语言会随近期同步一起拉取。桌面窗口效果、开机启动和通知权限仍然按设备单独保存。",
  "settings.syncSettings": "同步设置",
  "settings.save": "保存设置",
  "settings.saving": "正在保存...",
  "settings.languageZhCn": "简体中文",
  "settings.languageEnUs": "English",
  "settings.version": "版本：{version}",
  "settings.updateAvailable": "发现新版本 {version}",
  "settings.downloadUpdate": "下载这个更新",
  "settings.downloadLatest": "下载新版本",
  "message.syncGapWarning": "这台设备已超过 7 天没有同步。近期同步可能补不齐更早历史；如果是新设备或久未打开的设备，请恢复完整云备份。",
  "message.backgroundSynced": "已兑换背景。",
  "message.pairCodeCreated": "配对码已生成：{code}",
  "message.deviceBound": "设备配对成功。",
  "message.snapshotsPulled": "近期状态已同步。",
  "message.syncDeferred": "已保存到本地。云端同步暂时没有完成，网络稳定后可再点“同步近期状态”。",
  "message.settingsSynced": "设置已同步。",
  "message.cloudBackupUploaded": "云备份已上传。",
  "message.cloudBackupRestored": "已从云备份恢复数据。",
  "leaderboard.title": "饮水排行榜",
  "leaderboard.description": "加入喝水圈子，和朋友一起比较今天的喝水进度。",
  "leaderboard.loading": "正在刷新...",
  "leaderboard.refresh": "刷新快照",
  "leaderboard.displayName": "我的昵称",
  "leaderboard.displayNameSave": "保存",
  "leaderboard.displayNameSaving": "保存中...",
  "leaderboard.displayNameSaved": "昵称已保存并同步。",
  "leaderboard.displayNameSaveFailed": "昵称保存失败：",
  "leaderboard.identityStatusTitle": "云端连接状态",
  "leaderboard.identityLoading": "正在建立或检查云端身份...",
  "leaderboard.identityReady": "云端连接已就绪，可以正常使用圈子功能。",
  "leaderboard.identityError": "云端连接建立失败，圈子功能可能无法正常使用。",
  "leaderboard.identityRetry": "重试连接",
  "leaderboard.identityHint": "保存昵称后，会同步到当前设备的云端身份。",
  "leaderboard.activeCircle": "当前圈子：{name}",
  "leaderboard.circleCode": "邀请码 {code}",
  "leaderboard.empty": "还没有加入任何圈子。先创建一个，或者输入别人的邀请码。",
  "leaderboard.circleTitle": "圈子管理",
  "leaderboard.circleDescription": "创建一个小圈子，或用 6 位邀请码加入别人的圈子。",
  "leaderboard.circleCreateName": "新圈子名称",
  "leaderboard.circleCreate": "创建圈子",
  "leaderboard.circleJoinCode": "输入邀请码",
  "leaderboard.circleJoin": "加入圈子",
  "leaderboard.circleSwitchHint": "点击下面的圈子标签，可以立即切换当前排行榜。",
  "leaderboard.circleEmpty": "还没有已加入的圈子。",
  "leaderboard.circleLoading": "正在同步已加入的圈子...",
  "leaderboard.circleLoadFailed": "圈子列表暂时同步失败，可以稍后再试。",
  "leaderboard.memberRemove": "移出",
  "leaderboard.leaveCircle": "退出圈子",
  "leaderboard.disbandCircle": "解散圈子",
  "leaderboard.ownerLeaveBlocked": "你是圈主，请先移除其他成员后再解散圈子。",
  "leaderboard.metricIntake": "按饮水量",
  "leaderboard.metricProgress": "按完成率",
  "leaderboard.intakeValue": "已喝 {amount}",
  "leaderboard.progressValue": "完成 {percent}%",
  "leaderboard.targetValue": "目标 {amount}",
  "leaderboard.noData": "今天还没有同圈子成员同步数据。",
  "leaderboard.memberGardenTitle": "{name} 的田",
  "leaderboard.memberGardenDescription": "查看这位成员最近的种田情况。",
  "leaderboard.memberGardenLoading": "正在加载这片田...",
  "leaderboard.memberGardenError": "暂时无法加载这片田。",
  "leaderboard.memberGardenEmpty": "这位成员还没有同步田地。",
  "leaderboard.memberGardenRemove": "移出成员",
  "leaderboard.memberGardenActiveCrops": "种植中",
  "history.title": "饮水历史",
  "history.description": "用颜色快速查看每天的饮水情况，颜色越健康说明越接近目标。",
  "history.heatmapTitle": "过去 8 周热力格",
  "history.heatmapDescription": "左上角是最新一天，往后依次更早。绿色代表达标，暖色代表距离目标还有差距。",
  "history.newestFirst": "最新：{day}",
  "history.oldestLast": "更早：{day}",
  "history.tooltip": "{day} | 实际 {actual}{target}",
  "history.goalMet": "达标",
  "history.nearGoal": "接近达标",
  "history.low": "喝得偏少",
  "history.veryLow": "喝得很少",
  "history.recentTitle": "最近 7 天明细",
  "history.recentAmounts": "实际 {actual} / 计入 {consumed}",
  "history.met": "已达标",
  "history.notMet": "未达标",
  "history.shortfall": "距目标还差 {amount}",
  "history.missedReminders": "错过 {count} 次提醒",
  "history.debtExplanation": "提醒折算缺口 {amount}",
  "garden.seedStock": "种子库存",
  "garden.seedCount": "{count} 颗",
  "garden.harvested": "已收获",
  "garden.harvestCount": "{count} 次",
  "garden.plantable": "可播种",
  "garden.plotCount": "{count} 格",
  "garden.plantAction": "播种",
  "garden.readyToHarvest": "可以收获",
  "garden.growing": "成长 {percent}%",
  "garden.harvestedCell": "已收获",
  "garden.noSeeds": "种子不足",
  "garden.emptyPlot": "先记录喝水才能种",
  "garden.inventoryTitle": "种子与果实",
  "garden.inventoryDescription": "这里显示当前还能继续播种或兑换的库存。",
  "garden.inventorySeeds": "种子",
  "garden.inventoryProduce": "果实",
  "garden.produceEmpty": "还没有可兑换果实。收获后会先进入这里。",
  "garden.collectionTitle": "图鉴累计",
  "garden.collectionDescription": "这里记录历史累计收获次数，不会因为兑换而减少。",
  "garden.collectionEmpty": "还没有收获。先在有喝水记录的格子里播种。",
  "garden.exchangeTitle": "种子兑换",
  "garden.exchangeRule": "消耗果实，可兑换其他种子。",
  "garden.exchangeAction": "立即兑换",
  "notification.drinkNowTitle": "该喝水了",
  "notification.drinkNowBody": "新的喝水提醒窗口已经开始，记得按时补一杯水。",
  "notification.snoozeTitle": "再次提醒你",
  "notification.snoozeBody": "稍后提醒时间到了，现在可以顺手把这杯水补上。",
  "startupCatchUp.badge": "昨天还可以补记",
  "startupCatchUp.title": "要不要补记昨天的饮水量？",
  "startupCatchUp.description": "如果你昨晚还喝了水，可以在这里补一条，让 {day} 的记录更接近真实情况。",
  "startupCatchUp.yesterdaySummary": "昨天当前记录",
  "startupCatchUp.actual": "已喝 {amount}",
  "startupCatchUp.target": "目标 {amount}",
  "startupCatchUp.amountTitle": "补记多少？",
  "startupCatchUp.amountHelp": "默认从 250 ml 开始，可以用 +50 / -50 微调。",
  "startupCatchUp.dismiss": "先不补记",
  "startupCatchUp.confirm": "补记 {amount}",
  "common.notScheduled": "未安排"
};

Object.assign(zhCn, {
  "garden.exchangeHub": "兑换中心",
  "exchange.footerHint": "请先选择上面的作物和下面的种子。",
  "exchange.description": "这里同时包含种子兑换和背景兑换。背景的标题、描述和资源需求都由配置驱动。",
  "exchange.seedTab": "种子兑换",
  "exchange.backgroundTab": "背景兑换",
  "exchange.availableProduce": "可用作物",
  "exchange.availableProduceHelp": "这里只显示当前背包里确实拥有的果实库存。",
  "exchange.noAvailableProduce": "暂时还没有可用于种子兑换的作物。",
  "exchange.allSeeds": "全部种子",
  "exchange.allSeedsHelp": "共 10 种。当前作物无法兑换的目标会置灰。",
  "exchange.seedUnavailable": "{seed} 当前不可兑换",
  "exchange.noTargetSeeds": "这个作物暂时没有可兑换的目标种子。",
  "exchange.previousBackground": "上一张背景",
  "exchange.nextBackground": "下一张背景",
  "exchange.viewBackground": "查看第 {index} 张背景",
  "exchange.unlocked": "已解锁",
  "exchange.redeemBackground": "兑换背景",
  "exchange.notSupported": "暂不支持兑换",
  "exchange.noBackgroundRewards": "暂时没有背景配置。",
  "exchange.decreaseQuantity": "减少兑换数量",
  "exchange.increaseQuantity": "增加兑换数量",
  "exchange.back": "返回",
  "exchange.close": "关闭",
  "leaderboard.actionRemoveMemberTitle": "移出成员",
  "leaderboard.actionLeaveCircleTitle": "退出圈子",
  "leaderboard.actionDisbandCircleTitle": "解散圈子",
  "leaderboard.actionRemoveMemberDescription": "确认将成员“{name}”移出当前圈子吗？",
  "leaderboard.actionLeaveCircleDescription": "确认退出当前圈子吗？退出后将不再参与这个圈子的排行榜。",
  "leaderboard.actionDisbandCircleDescription": "确认解散当前圈子吗？解散后该圈子的成员关系和排行榜记录都会被删除。",
  "leaderboard.actionClose": "关闭",
  "leaderboard.actionCancel": "取消",
  "leaderboard.actionConfirm": "确认",
  "message.circleMemberRemoved": "成员已移出圈子。",
  "message.circleLeft": "已退出当前圈子。",
  "message.circleDisbanded": "当前圈子已解散。",
  "settings.backgroundTitle": "背景设置",
  "settings.backgroundDescription": "选择已解锁背景，或切回默认界面。",
  "settings.backgroundDefault": "默认 UI",
  "settings.backgroundHint": "未解锁的背景可在历史页兑换中心获取。",
  "message.backgroundSelected": "背景已更新。",
  "onboarding.badge": "轻量的喝水提醒和记录工具",
  "onboarding.title": "欢迎使用谁是吨吨大王",
  "onboarding.description": "桌面端目前功能包括常驻提醒、快速记录、查看历史等。移动端小程序正在开发中，外出也可以记录。",
  "onboarding.viewSlide": "查看第 {index} 张卡片",
  "onboarding.previous": "上一张",
  "onboarding.next": "还有什么？",
  "onboarding.coreTitle": "在这里你可以",
  "onboarding.drinkTitle": "喝水",
  "onboarding.drinkCopy": "设置每日喝水量，实时看到目标和进度。",
  "onboarding.logTitle": "记录",
  "onboarding.logCopy": "点击即可记录，也能微调或撤销，还有历史数据热力图。",
  "onboarding.reminderTitle": "提醒",
  "onboarding.reminderCopy": "轻量桌面提醒，按目标量和活跃时间自动计算提醒时间。",
  "onboarding.gardenTitle": "喝水也可以变有趣",
  "onboarding.plantTitle": "热力图里种菜",
  "onboarding.plantCopy": "有喝水记录的日子可以变成田地。",
  "onboarding.backgroundTitle": "兑换背景",
  "onboarding.backgroundCopy": "收获作物后，可兑换图片背景。",
  "onboarding.syncTitle": "多端同步",
  "onboarding.multiDeviceTitle": "电脑和小程序同步",
  "onboarding.multiDeviceCopy": "桌面端与小程序端数据可实时同步。",
  "onboarding.syncOneLine": "绑定设备，实时刷新近7天数据，完整历史可云端备份。",
  "onboarding.syncFlowOld": "旧设备生成绑定码码",
  "onboarding.syncFlowNew": "新设备输入即可绑定",
  "onboarding.recentSync": "自动同步最近 7 天内容。",
  "onboarding.backupSync": "完整历史请用云备份。",
  "onboarding.syncDetailsTitle": "如何在设备间同步数据？",
  "onboarding.syncDetails": "旧设备生成绑定码，新设备输入即可绑定。近期同步只覆盖 7 天；完整历史请用云备份。",
  "onboarding.learnSync": "了解同步",
  "onboarding.hideSyncDetails": "收起同步说明",
  "onboarding.start": "开始使用"
} satisfies Partial<TranslationTable>);

const translations: Record<Locale, TranslationTable> = {
  "zh-CN": zhCn,
  "en-US": enUs
};

function normalizeLocale(locale: string): Locale {
  return locale === "en-US" ? "en-US" : "zh-CN";
}

function interpolate(template: string, params?: TranslationParams) {
  if (!params) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    String(params[key] ?? `{${key}}`)
  );
}

export type I18nApi = {
  locale: Locale;
  t: (key: TranslationKey, params?: TranslationParams) => string;
  formatMl: (value: number) => string;
  formatDateTime: (value: string | null) => string;
  formatShortDay: (value: string) => string;
};

export function createI18n(locale: Locale): I18nApi {
  const resolvedLocale = normalizeLocale(locale);
  const table = translations[resolvedLocale];

  return {
    locale: resolvedLocale,
    t: (key, params) => interpolate(table[key], params),
    formatMl: (value) => `${new Intl.NumberFormat(resolvedLocale).format(value)} ml`,
    formatDateTime: (value) => {
      if (!value) {
        return table["common.notScheduled"];
      }

      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return value;
      }

      return new Intl.DateTimeFormat(resolvedLocale, {
        hour: "2-digit",
        minute: "2-digit"
      }).format(date);
    },
    formatShortDay: (value) => {
      const [year, month, day] = value.split("-").map(Number);
      const date = new Date(year, (month ?? 1) - 1, day ?? 1);
      return new Intl.DateTimeFormat(resolvedLocale, {
        month: "numeric",
        day: "numeric"
      }).format(date);
    }
  };
}

const I18nContext = createContext<I18nApi | null>(null);

export function I18nProvider({
  locale,
  children
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const value = useMemo(() => createI18n(locale), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error("useI18n must be used within I18nProvider");
  }

  return value;
}
