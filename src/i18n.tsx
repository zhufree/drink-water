import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Locale } from "./types";

type TranslationKey =
  | "app.loading"
  | "message.logged"
  | "message.undo"
  | "message.windowActionFailed"
  | "message.settingsSaved"
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
  | "notification.testTitle"
  | "notification.testBody"
  | "common.notScheduled";

type TranslationParams = Record<string, string | number>;
type TranslationTable = Record<TranslationKey, string>;

const translations: Record<Locale, TranslationTable> = {
  "zh-CN": {
    "app.loading": "正在准备你的补水助手...",
    "message.logged": "已记录 {amount}。",
    "message.undo": "已撤销上次记录的 {amount}。",
    "message.windowActionFailed": "窗口操作失败：{action} 未执行成功，{detail}",
    "message.settingsSaved": "设置已保存，提醒节奏和语言已更新。",
    "window.subtitle": "桌面补水助手",
    "window.openSettings": "打开设置",
    "window.minimize": "最小化",
    "window.hideToTray": "收起到托盘",
    "tabs.navigation": "功能切换",
    "tabs.today": "今日",
    "tabs.history": "历史",
    "today.title": "今日饮水概览",
    "today.nextReminder": "下次提醒",
    "today.progress": "今日进度",
    "today.target": "今日目标 {amount}",
    "today.expected": "当前应喝 {amount}",
    "today.actual": "实际已喝 {amount}",
    "today.debt": "当前欠量 {amount}",
    "today.remaining": "剩余目标 {amount}",
    "today.quickLog": "快速记录",
    "today.quickLogHelp": "默认一键记一杯，也可以微调这次实际喝了多少。",
    "today.snooze": "稍后提醒",
    "today.resetToCup": "恢复单杯",
    "today.logOneCup": "记一杯 {amount}",
    "today.logAmount": "记录 {amount}",
    "today.undoAmount": "撤销上次 {amount}",
    "today.undoLastLog": "撤销上次记录",
    "settings.title": "常规设置",
    "settings.description": "提醒节奏会根据目标量、单杯容量和提醒时间自动计算。",
    "settings.dailyTarget": "每日目标（ml）",
    "settings.cupSize": "单杯容量（ml）",
    "settings.interval": "提醒间隔（分钟）",
    "settings.intervalHelp": "自动计算：{drinksPerDay} 次喝水，约每 {minutes} 分钟提醒一次",
    "settings.startHour": "开始提醒时间（小时）",
    "settings.endHour": "结束提醒时间（小时）",
    "settings.language": "界面语言",
    "settings.notifications": "系统通知",
    "settings.autostart": "开机自启",
    "settings.permissionTitle": "通知权限",
    "settings.permissionStatus": "当前状态：{status}",
    "settings.permissionGranted": "已允许",
    "settings.permissionDenied": "已拒绝，提醒可能无法弹出",
    "settings.permissionUnsupported": "当前环境不支持前端检测",
    "settings.permissionPrompt": "等待系统确认",
    "settings.notificationNote": "在 Windows 上，安装后的应用比开发调试进程更容易稳定显示系统通知。",
    "settings.save": "保存设置",
    "settings.saving": "正在保存...",
    "settings.languageZhCn": "简体中文",
    "settings.languageEnUs": "English",
    "settings.version": "版本号：{version}",
    "settings.downloadLatest": "下载新版本",
    "history.title": "饮水历史",
    "history.description": "用颜色快速查看每天的饮水情况，颜色越健康说明越接近目标。",
    "history.heatmapTitle": "近 8 周热力格",
    "history.heatmapDescription": "绿色代表达标，蓝色代表喝得不错，暖色代表喝得偏少。",
    "history.tooltip": "{day} · 实际 {actual}{target}",
    "history.goalMet": "达标",
    "history.nearGoal": "接近达标",
    "history.low": "喝得偏少",
    "history.veryLow": "喝得很少",
    "history.recentTitle": "最近 7 天明细",
    "history.recentAmounts": "实际 {actual} / 计入进度 {consumed}",
    "history.met": "已达标",
    "history.notMet": "未达标",
    "history.debtTotal": "欠量累计 {amount}",
    "notification.drinkNowTitle": "该喝水了",
    "notification.drinkNowBody": "新的喝水提醒已经开始了，记得按时补一杯水。",
    "notification.snoozeTitle": "再次提醒你",
    "notification.snoozeBody": "稍后提醒时间到了，现在可以顺手把这杯水补上。",
    "notification.testTitle": "测试通知",
    "notification.testBody": "如果你能看到这条消息，说明系统通知链路是正常的。",
    "common.notScheduled": "未安排"
  },
  "en-US": {
    "app.loading": "Loading your hydration assistant...",
    "message.logged": "Logged {amount}.",
    "message.undo": "Undid the last {amount} log.",
    "message.windowActionFailed": "Window action failed: {action} was not completed, {detail}",
    "message.settingsSaved": "Settings saved. Reminder pacing and language have been updated.",
    "window.subtitle": "Desktop hydration assistant",
    "window.openSettings": "Open settings",
    "window.minimize": "Minimize",
    "window.hideToTray": "Hide to tray",
    "tabs.navigation": "Switch sections",
    "tabs.today": "Today",
    "tabs.history": "History",
    "today.title": "Today's Hydration",
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
    "settings.title": "General settings",
    "settings.description": "Reminder pacing is calculated automatically from the target, cup size, and active hours.",
    "settings.dailyTarget": "Daily target (ml)",
    "settings.cupSize": "Cup size (ml)",
    "settings.interval": "Reminder interval (minutes)",
    "settings.intervalHelp": "Auto-calculated: {drinksPerDay} drinks per day, about every {minutes} minutes",
    "settings.startHour": "Start hour",
    "settings.endHour": "End hour",
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
    "settings.save": "Save settings",
    "settings.saving": "Saving...",
    "settings.languageZhCn": "Simplified Chinese",
    "settings.languageEnUs": "English",
    "settings.version": "Version: {version}",
    "settings.downloadLatest": "Download new version",
    "history.title": "Hydration history",
    "history.description": "Use color to scan how each day went. Healthier colors mean you were closer to the goal.",
    "history.heatmapTitle": "Last 8 weeks",
    "history.heatmapDescription": "Green means goal met, blue means pretty good, warm colors mean you drank less.",
    "history.tooltip": "{day} · actual {actual}{target}",
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
    "notification.drinkNowBody": "A new reminder window has started. Try to drink a cup now.",
    "notification.snoozeTitle": "Reminder again",
    "notification.snoozeBody": "Your snooze has ended. This is a good time to catch up on that cup.",
    "notification.testTitle": "Test notification",
    "notification.testBody": "If you can see this, the notification pipeline is working.",
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
