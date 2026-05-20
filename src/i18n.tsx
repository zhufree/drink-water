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
  | "window.subtitle"
  | "window.openSettings"
  | "window.minimize"
  | "window.hideToTray"
  | "tabs.navigation"
  | "tabs.today"
  | "tabs.history"
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
  | "settings.title"
  | "settings.description"
  | "settings.dailyTarget"
  | "settings.cupSize"
  | "settings.interval"
  | "settings.intervalHelp"
  | "settings.startHour"
  | "settings.endHour"
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
  | "settings.save"
  | "settings.saving"
  | "settings.languageZhCn"
  | "settings.languageEnUs"
  | "settings.version"
  | "settings.downloadLatest"
  | "history.title"
  | "history.description"
  | "history.heatmapTitle"
  | "history.heatmapDescription"
  | "history.tooltip"
  | "history.goalMet"
  | "history.nearGoal"
  | "history.low"
  | "history.veryLow"
  | "history.recentTitle"
  | "history.recentAmounts"
  | "history.met"
  | "history.notMet"
  | "history.debtTotal"
  | "notification.drinkNowTitle"
  | "notification.drinkNowBody"
  | "notification.snoozeTitle"
  | "notification.snoozeBody"
  | "common.notScheduled";

type TranslationParams = Record<string, string | number>;
type TranslationTable = Record<TranslationKey, string>;

const translations: Record<Locale, TranslationTable> = {
  "zh-CN": {
    "app.loading": "\u6b63\u5728\u51c6\u5907\u4f60\u7684\u8865\u6c34\u52a9\u624b...",
    "message.logged": "\u5df2\u8bb0\u5f55 {amount}\u3002",
    "message.undo": "\u5df2\u64a4\u9500\u4e0a\u6b21\u8bb0\u5f55\u7684 {amount}\u3002",
    "message.windowActionFailed":
      "\u7a97\u53e3\u64cd\u4f5c\u5931\u8d25\uff1a{action} \u672a\u6267\u884c\u6210\u529f\uff0c{detail}",
    "message.settingsSaved":
      "\u8bbe\u7f6e\u5df2\u4fdd\u5b58\uff0c\u63d0\u9192\u8282\u594f\u548c\u8bed\u8a00\u5df2\u66f4\u65b0\u3002",
    "message.exportSuccess": "\u6570\u636e\u5df2\u5bfc\u51fa\u3002",
    "message.importSuccess": "\u6570\u636e\u5df2\u5bfc\u5165\u5e76\u5237\u65b0\u3002",
    "window.subtitle": "\u684c\u9762\u8865\u6c34\u52a9\u624b",
    "window.openSettings": "\u6253\u5f00\u8bbe\u7f6e",
    "window.minimize": "\u6700\u5c0f\u5316",
    "window.hideToTray": "\u6536\u8d77\u5230\u6258\u76d8",
    "tabs.navigation": "\u529f\u80fd\u5207\u6362",
    "tabs.today": "\u4eca\u65e5",
    "tabs.history": "\u5386\u53f2",
    "today.title": "\u4eca\u65e5\u996e\u6c34\u6982\u89c8",
    "today.nextReminder": "\u4e0b\u6b21\u63d0\u9192",
    "today.progress": "\u4eca\u65e5\u8fdb\u5ea6",
    "today.target": "\u4eca\u65e5\u76ee\u6807 {amount}",
    "today.expected": "\u5f53\u524d\u5e94\u559d {amount}",
    "today.actual": "\u5b9e\u9645\u5df2\u559d {amount}",
    "today.debt": "\u5f53\u524d\u6b20\u91cf {amount}",
    "today.remaining": "\u5269\u4f59\u76ee\u6807 {amount}",
    "today.quickLog": "\u5feb\u901f\u8bb0\u5f55",
    "today.quickLogHelp":
      "\u9ed8\u8ba4\u4e00\u952e\u8bb0\u4e00\u676f\uff0c\u4e5f\u53ef\u4ee5\u5fae\u8c03\u8fd9\u6b21\u5b9e\u9645\u559d\u4e86\u591a\u5c11\u3002",
    "today.snooze": "\u7a0d\u540e\u63d0\u9192",
    "today.resetToCup": "\u6062\u590d\u5355\u676f",
    "today.logOneCup": "\u8bb0\u4e00\u676f {amount}",
    "today.logAmount": "\u8bb0\u5f55 {amount}",
    "today.undoAmount": "\u64a4\u9500\u4e0a\u6b21 {amount}",
    "today.undoLastLog": "\u64a4\u9500\u4e0a\u6b21\u8bb0\u5f55",
    "settings.title": "\u5e38\u89c4\u8bbe\u7f6e",
    "settings.description":
      "\u63d0\u9192\u8282\u594f\u4f1a\u6839\u636e\u76ee\u6807\u91cf\u3001\u5355\u676f\u5bb9\u91cf\u548c\u63d0\u9192\u65f6\u95f4\u81ea\u52a8\u8ba1\u7b97\u3002",
    "settings.dailyTarget": "\u6bcf\u65e5\u76ee\u6807 (ml)",
    "settings.cupSize": "\u5355\u676f\u5bb9\u91cf (ml)",
    "settings.interval": "\u63d0\u9192\u95f4\u9694 (\u5206\u949f)",
    "settings.intervalHelp":
      "\u81ea\u52a8\u8ba1\u7b97\uff1a\u6bcf\u5929 {drinksPerDay} \u676f\uff0c\u7ea6\u6bcf {minutes} \u5206\u949f\u63d0\u9192\u4e00\u6b21",
    "settings.startHour": "\u5f00\u59cb\u63d0\u9192\u65f6\u95f4 (\u5c0f\u65f6)",
    "settings.endHour": "\u7ed3\u675f\u63d0\u9192\u65f6\u95f4 (\u5c0f\u65f6)",
    "settings.language": "\u754c\u9762\u8bed\u8a00",
    "settings.notifications": "\u7cfb\u7edf\u901a\u77e5",
    "settings.autostart": "\u5f00\u673a\u81ea\u542f",
    "settings.permissionTitle": "\u901a\u77e5\u6743\u9650",
    "settings.permissionStatus": "\u5f53\u524d\u72b6\u6001\uff1a{status}",
    "settings.permissionGranted": "\u5df2\u5141\u8bb8",
    "settings.permissionDenied":
      "\u5df2\u62d2\u7edd\uff0c\u63d0\u9192\u53ef\u80fd\u65e0\u6cd5\u5f39\u51fa",
    "settings.permissionUnsupported":
      "\u5f53\u524d\u73af\u5883\u4e0d\u652f\u6301\u524d\u7aef\u6743\u9650\u68c0\u6d4b",
    "settings.permissionPrompt": "\u7b49\u5f85\u7cfb\u7edf\u786e\u8ba4",
    "settings.notificationNote":
      "\u5728 Windows \u4e0a\uff0c\u5b89\u88c5\u540e\u7684\u5e94\u7528\u901a\u5e38\u6bd4\u5f00\u53d1\u8c03\u8bd5\u8fdb\u7a0b\u66f4\u5bb9\u6613\u7a33\u5b9a\u663e\u793a\u7cfb\u7edf\u901a\u77e5\u3002",
    "settings.dataTitle": "\u6570\u636e\u7ba1\u7406",
    "settings.dataDescription":
      "\u53ef\u5bfc\u51fa\u5907\u4efd\u6587\u4ef6\uff0c\u4e5f\u53ef\u5728\u65b0\u7535\u8111\u4e0a\u5bfc\u5165\u6062\u590d\u5386\u53f2\u8bb0\u5f55\u548c\u8bbe\u7f6e\u3002",
    "settings.exportData": "\u5bfc\u51fa\u6570\u636e",
    "settings.importData": "\u5bfc\u5165\u6570\u636e",
    "settings.save": "\u4fdd\u5b58\u8bbe\u7f6e",
    "settings.saving": "\u6b63\u5728\u4fdd\u5b58...",
    "settings.languageZhCn": "\u7b80\u4f53\u4e2d\u6587",
    "settings.languageEnUs": "English",
    "settings.version": "\u7248\u672c\u53f7\uff1a{version}",
    "settings.downloadLatest": "\u4e0b\u8f7d\u65b0\u7248\u672c",
    "history.title": "\u996e\u6c34\u5386\u53f2",
    "history.description":
      "\u7528\u989c\u8272\u5feb\u901f\u67e5\u770b\u6bcf\u5929\u7684\u996e\u6c34\u60c5\u51b5\uff0c\u989c\u8272\u8d8a\u5065\u5eb7\u8bf4\u660e\u8d8a\u63a5\u8fd1\u76ee\u6807\u3002",
    "history.heatmapTitle": "\u8fc7\u53bb 8 \u5468\u70ed\u529b\u683c",
    "history.heatmapDescription":
      "\u7eff\u8272\u4ee3\u8868\u8fbe\u6807\uff0c\u84dd\u8272\u4ee3\u8868\u559d\u5f97\u4e0d\u9519\uff0c\u6696\u8272\u4ee3\u8868\u559d\u5f97\u504f\u5c11\u3002",
    "history.tooltip": "{day} | \u5b9e\u9645 {actual}{target}",
    "history.goalMet": "\u8fbe\u6807",
    "history.nearGoal": "\u63a5\u8fd1\u8fbe\u6807",
    "history.low": "\u559d\u5f97\u504f\u5c11",
    "history.veryLow": "\u559d\u5f97\u5f88\u5c11",
    "history.recentTitle": "\u6700\u8fd1 7 \u5929\u660e\u7ec6",
    "history.recentAmounts": "\u5b9e\u9645 {actual} / \u8ba1\u5165 {consumed}",
    "history.met": "\u5df2\u8fbe\u6807",
    "history.notMet": "\u672a\u8fbe\u6807",
    "history.debtTotal": "\u6b20\u91cf\u7d2f\u8ba1 {amount}",
    "notification.drinkNowTitle": "\u8be5\u559d\u6c34\u4e86",
    "notification.drinkNowBody":
      "\u65b0\u7684\u559d\u6c34\u63d0\u9192\u7a97\u53e3\u5df2\u7ecf\u5f00\u59cb\uff0c\u8bb0\u5f97\u6309\u65f6\u8865\u4e00\u676f\u6c34\u3002",
    "notification.snoozeTitle": "\u518d\u6b21\u63d0\u9192\u4f60",
    "notification.snoozeBody":
      "\u7a0d\u540e\u63d0\u9192\u65f6\u95f4\u5230\u4e86\uff0c\u73b0\u5728\u53ef\u4ee5\u987a\u624b\u628a\u8fd9\u676f\u6c34\u8865\u4e0a\u3002",
    "common.notScheduled": "\u672a\u5b89\u6392"
  },
  "en-US": {
    "app.loading": "Loading your hydration assistant...",
    "message.logged": "Logged {amount}.",
    "message.undo": "Undid the last {amount} log.",
    "message.windowActionFailed":
      "Window action failed: {action} was not completed, {detail}",
    "message.settingsSaved":
      "Settings saved. Reminder pacing and language have been updated.",
    "message.exportSuccess": "Data exported.",
    "message.importSuccess": "Data imported and refreshed.",
    "window.subtitle": "Desktop hydration assistant",
    "window.openSettings": "Open settings",
    "window.minimize": "Minimize",
    "window.hideToTray": "Hide to tray",
    "tabs.navigation": "Switch sections",
    "tabs.today": "Today",
    "tabs.history": "History",
    "today.title": "Today's hydration",
    "today.nextReminder": "Next reminder",
    "today.progress": "Progress",
    "today.target": "Target {amount}",
    "today.expected": "Should be at {amount}",
    "today.actual": "Actually drank {amount}",
    "today.debt": "Behind by {amount}",
    "today.remaining": "Remaining {amount}",
    "today.quickLog": "Quick log",
    "today.quickLogHelp":
      "Log one cup fast, or fine-tune how much you actually drank.",
    "today.snooze": "Snooze",
    "today.resetToCup": "Reset to cup",
    "today.logOneCup": "Log one cup {amount}",
    "today.logAmount": "Log {amount}",
    "today.undoAmount": "Undo {amount}",
    "today.undoLastLog": "Undo last log",
    "settings.title": "General settings",
    "settings.description":
      "Reminder pacing is calculated automatically from the target, cup size, and active hours.",
    "settings.dailyTarget": "Daily target (ml)",
    "settings.cupSize": "Cup size (ml)",
    "settings.interval": "Reminder interval (minutes)",
    "settings.intervalHelp":
      "Auto-calculated: {drinksPerDay} drinks per day, about every {minutes} minutes",
    "settings.startHour": "Start hour",
    "settings.endHour": "End hour",
    "settings.language": "Interface language",
    "settings.notifications": "System notifications",
    "settings.autostart": "Launch at startup",
    "settings.permissionTitle": "Notification permission",
    "settings.permissionStatus": "Current status: {status}",
    "settings.permissionGranted": "Granted",
    "settings.permissionDenied": "Denied, reminders may not appear",
    "settings.permissionUnsupported":
      "This environment does not support frontend permission checks",
    "settings.permissionPrompt": "Waiting for system confirmation",
    "settings.notificationNote":
      "On Windows, system notifications are usually more reliable in the installed app than in a dev process.",
    "settings.dataTitle": "Data management",
    "settings.dataDescription":
      "Export a backup file, or import it on a new computer to restore your history and settings.",
    "settings.exportData": "Export data",
    "settings.importData": "Import data",
    "settings.save": "Save settings",
    "settings.saving": "Saving...",
    "settings.languageZhCn": "Simplified Chinese",
    "settings.languageEnUs": "English",
    "settings.version": "Version: {version}",
    "settings.downloadLatest": "Download new version",
    "history.title": "Hydration history",
    "history.description":
      "Use color to scan how each day went. Healthier colors mean you were closer to the goal.",
    "history.heatmapTitle": "Last 8 weeks",
    "history.heatmapDescription":
      "Green means goal met, blue means pretty good, warm colors mean you drank less.",
    "history.tooltip": "{day} | actual {actual}{target}",
    "history.goalMet": "Goal met",
    "history.nearGoal": "Near goal",
    "history.low": "Below target",
    "history.veryLow": "Far below target",
    "history.recentTitle": "Last 7 days",
    "history.recentAmounts": "Actual {actual} / Counted {consumed}",
    "history.met": "Met goal",
    "history.notMet": "Missed goal",
    "history.debtTotal": "Accumulated debt {amount}",
    "notification.drinkNowTitle": "Time to drink water",
    "notification.drinkNowBody":
      "A new reminder window has started. Try to drink a cup now.",
    "notification.snoozeTitle": "Reminder again",
    "notification.snoozeBody":
      "Your snooze has ended. This is a good time to catch up on that cup.",
    "common.notScheduled": "Not scheduled"
  }
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
