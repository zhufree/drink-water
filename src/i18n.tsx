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
  | "message.seedPlanted"
  | "message.cropHarvested"
  | "message.exchangeSuccess"
  | "message.restStarted"
  | "message.restCancelled"
  | "message.restCompleted"
  | "message.circleCreated"
  | "message.circleJoined"
  | "message.circleSelected"
  | "leaderboard.identityReconnectSuccess"
  | "window.subtitle"
  | "window.openSettings"
  | "window.minimize"
  | "window.hideToTray"
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
  | "settings.updateAvailable"
  | "settings.downloadUpdate"
  | "settings.downloadLatest"
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
  | "leaderboard.metricIntake"
  | "leaderboard.metricProgress"
  | "leaderboard.intakeValue"
  | "leaderboard.progressValue"
  | "leaderboard.targetValue"
  | "leaderboard.noData"
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
  | "garden.produceEmpty"
  | "garden.exchangeTitle"
  | "garden.exchangeRule"
  | "garden.exchangeAction"
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

const translations: Record<Locale, TranslationTable> = {
  "zh-CN": {
    "app.loading": "正在准备你的补水助手...",
    "message.logged": "已记录 {amount}。",
    "message.undo": "已撤销上次记录的 {amount}。",
    "message.windowActionFailed":
      "窗口操作失败：{action} 未执行成功，{detail}",
    "message.settingsSaved":
      "设置已保存，提醒节奏和语言已更新。",
    "message.exportSuccess": "数据已导出。",
    "message.importSuccess": "数据已导入并刷新。",
    "message.yesterdayCatchUpSaved":
      "已为昨天补记 {amount}。",
    "message.seedPlanted": "已在 {day} 播种。",
    "message.cropHarvested": "已收获 {day} 的小青菜。",
    "message.exchangeSuccess": "已兑换到一颗卷心菜种子。",
    "message.restStarted": "休息时间开始了。",
    "message.restCancelled": "本次休息已取消，没有获得加成。",
    "message.restCompleted": "休息完成，作物获得成长加速。",
    "message.circleCreated": "已创建圈子 {code}。",
    "message.circleJoined": "已加入圈子 {code}。",
    "message.circleSelected": "已切换到圈子 {code}。",
    "leaderboard.identityReconnectSuccess": "已重新连接排行榜服务。",
    "window.subtitle": "桌面补水助手",
    "window.openSettings": "打开设置",
    "window.minimize": "最小化",
    "window.hideToTray": "收起到托盘",
    "tabs.navigation": "功能切换",
    "tabs.today": "今日",
    "tabs.history": "历史",
    "tabs.leaderboard": "排行榜",
    "today.title": "今日饮水概览",
    "today.nextReminder": "下次提醒",
    "today.progress": "今日进度",
    "today.target": "今日目标 {amount}",
    "today.expected": "当前应喝 {amount}",
    "today.actual": "实际已喝 {amount}",
    "today.debt": "当前欠量 {amount}",
    "today.remaining": "剩余目标 {amount}",
    "today.quickLog": "快速记录",
    "today.quickLogHelp":
      "默认一键记一杯，也可以微调这次实际喝了多少。",
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
    "rest.overlayEyebrow": "REST MODE",
    "rest.overlayDescription": "保持离开屏幕一小会儿，完成后全部在种作物都会获得加速。",
    "rest.overlayBoost": "本次成长加速",
    "rest.overlayBoostValue": "{hours} 小时",
    "rest.cancel": "提前结束",
    "settings.title": "常规设置",
    "settings.description":
      "提醒节奏会根据目标量、单杯容量和提醒时间自动计算。",
    "settings.dailyTarget": "每日目标 (ml)",
    "settings.cupSize": "单杯容量 (ml)",
    "settings.cupStep": "杯量调整步进 (ml)",
    "settings.interval": "提醒间隔 (分钟)",
    "settings.intervalHelp":
      "自动计算：每天 {drinksPerDay} 杯，约每 {minutes} 分钟提醒一次",
    "settings.startHour": "开始提醒时间 (小时)",
    "settings.endHour": "结束提醒时间 (小时)",
    "settings.language": "界面语言",
    "settings.notifications": "系统通知",
    "settings.autostart": "开机自启",
    "settings.permissionTitle": "通知权限",
    "settings.permissionStatus": "当前状态：{status}",
    "settings.permissionGranted": "已允许",
    "settings.permissionDenied":
      "已拒绝，提醒可能无法弹出",
    "settings.permissionUnsupported":
      "当前环境不支持前端权限检测",
    "settings.permissionPrompt": "等待系统确认",
    "settings.notificationNote":
      "在 Windows 上，安装后的应用通常比开发调试进程更容易稳定显示系统通知。",
    "settings.dataTitle": "数据管理",
    "settings.dataDescription":
      "可导出备份文件，也可在新电脑上导入恢复历史记录和设置。",
    "settings.exportData": "导出数据",
    "settings.importData": "导入数据",
    "settings.save": "保存设置",
    "settings.saving": "正在保存...",
    "settings.languageZhCn": "简体中文",
    "settings.languageEnUs": "English",
    "settings.version": "版本号：{version}",
    "settings.updateAvailable": "发现新版本 {version}",
    "settings.downloadUpdate": "下载这个更新",
    "settings.downloadLatest": "下载新版本",
    "leaderboard.title": "饮水排行榜",
    "leaderboard.description":
      "加入喝水圈子，与朋友一起打卡喝水（请勿刷榜哦）",
    "leaderboard.loading": "正在刷新...",
    "leaderboard.refresh": "刷新榜单",
    "leaderboard.displayName": "我的昵称",
    "leaderboard.displayNameSave": "保存",
    "leaderboard.displayNameSaving": "保存中...",
    "leaderboard.displayNameSaved": "昵称已保存并同步。",
    "leaderboard.displayNameSaveFailed": "昵称保存失败：",
    "leaderboard.identityStatusTitle": "云端连接状态",
    "leaderboard.identityLoading": "正在建立或检查你的云端身份...",
    "leaderboard.identityReady": "云端连接已就绪，可以正常使用圈子功能。",
    "leaderboard.identityError": "云端连接建立失败，圈子功能可能无法正常使用。",
    "leaderboard.identityRetry": "重试连接",
    "leaderboard.identityHint": "保存昵称后，会同步到当前设备的云端身份。",
    "leaderboard.activeCircle": "当前圈子：{name}",
    "leaderboard.circleCode": "邀请码 {code}",
    "leaderboard.empty":
      "还没有加入任何圈子。先创建一个，或者输入别人的邀请码吧。",
    "leaderboard.circleTitle": "圈子管理",
    "leaderboard.circleDescription":
      "创建一个小圈子，或用 6 位邀请码加入别人的圈子。",
    "leaderboard.circleCreateName": "新圈子名称",
    "leaderboard.circleCreate": "创建圈子",
    "leaderboard.circleJoinCode": "输入邀请码",
    "leaderboard.circleJoin": "加入圈子",
    "leaderboard.circleSwitchHint": "点击下面的圈子标签，可以立即切换当前排行榜。",
    "leaderboard.circleEmpty": "还没有已加入的圈子。",
    "leaderboard.circleLoading": "正在同步已加入的圈子...",
    "leaderboard.circleLoadFailed": "圈子列表暂时同步失败，可以稍后再试。",
    "leaderboard.metricIntake": "按饮水量",
    "leaderboard.metricProgress": "按完成率",
    "leaderboard.intakeValue": "已喝 {amount}",
    "leaderboard.progressValue": "完成 {percent}%",
    "leaderboard.targetValue": "目标 {amount}",
    "leaderboard.noData": "今天还没有同圈子成员同步数据。",
    "history.title": "饮水历史",
    "history.description":
      "用颜色快速查看每天的饮水情况，颜色越健康说明越接近目标。",
    "history.heatmapTitle": "过去 8 周热力格",
    "history.heatmapDescription":
      "左上角是最新一天，往后依次更早。绿色代表达标，暖色代表距离目标还有差距。",
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
    "garden.plantAction": "播种小青菜",
    "garden.readyToHarvest": "可以收获",
    "garden.growing": "成长 {percent}%",
    "garden.harvestedCell": "已收获",
    "garden.noSeeds": "种子不足",
    "garden.emptyPlot": "先记录喝水才能种",
    "garden.inventoryTitle": "种子与果实",
    "garden.inventoryDescription": "这里显示当前还能继续播种或兑换的库存。",
    "garden.produceEmpty": "还没有可兑换果实。收获后会先进入这里。",
    "garden.collectionTitle": "图鉴累计",
    "garden.collectionDescription": "这里记录历史累计收获次数，不会因为兑换而减少。",
    "garden.collectionEmpty": "还没有收获。先在有喝水记录的格子里播种。",
    "garden.exchangeTitle": "兑换升级",
    "garden.exchangeRule": "消耗 3 个小青菜，可换 1 颗卷心菜种子。",
    "garden.exchangeAction": "立即兑换",
    "notification.drinkNowTitle": "该喝水了",
    "notification.drinkNowBody":
      "新的喝水提醒窗口已经开始，记得按时补一杯水。",
    "notification.snoozeTitle": "再次提醒你",
    "notification.snoozeBody":
      "稍后提醒时间到了，现在可以顺手把这杯水补上。",
    "startupCatchUp.badge": "昨天还可以补记",
    "startupCatchUp.title": "要不要补记昨天的饮水量？",
    "startupCatchUp.description":
      "如果你昨晚还喝了水，可以在这里补一条，让 {day} 的记录更接近真实情况。",
    "startupCatchUp.yesterdaySummary": "昨天当前记录",
    "startupCatchUp.actual": "已喝 {amount}",
    "startupCatchUp.target": "目标 {amount}",
    "startupCatchUp.amountTitle": "补记多少？",
    "startupCatchUp.amountHelp":
      "默认从 250 ml 开始，可以用 +50 / -50 微调。",
    "startupCatchUp.dismiss": "先不补记",
    "startupCatchUp.confirm": "补记 {amount}",
    "common.notScheduled": "未安排"
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
    "message.yesterdayCatchUpSaved": "Added {amount} to yesterday's log.",
    "message.seedPlanted": "Planted on {day}.",
    "message.cropHarvested": "Harvested bok choy from {day}.",
    "message.exchangeSuccess": "Exchanged for one cabbage seed.",
    "message.restStarted": "Rest break started.",
    "message.restCancelled": "Rest break cancelled. No boost was granted.",
    "message.restCompleted": "Rest complete. Your crops received a growth boost.",
    "message.circleCreated": "Created circle {code}.",
    "message.circleJoined": "Joined circle {code}.",
    "message.circleSelected": "Switched to circle {code}.",
    "leaderboard.identityReconnectSuccess": "Reconnected to the leaderboard service.",
    "window.subtitle": "Desktop hydration assistant",
    "window.openSettings": "Open settings",
    "window.minimize": "Minimize",
    "window.hideToTray": "Hide to tray",
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
    "today.quickLogHelp":
      "Log one cup fast, or fine-tune how much you actually drank.",
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
    "settings.description":
      "Reminder pacing is calculated automatically from the target, cup size, and active hours.",
    "settings.dailyTarget": "Daily target (ml)",
    "settings.cupSize": "Cup size (ml)",
    "settings.cupStep": "Cup adjustment step (ml)",
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
    "settings.updateAvailable": "Version {version} is available here if you want to update.",
    "settings.downloadUpdate": "Download this update",
    "settings.downloadLatest": "Download new version",
    "leaderboard.title": "Hydration leaderboard",
    "leaderboard.description":
      "Use a circle code to bring a few people into one small group and compare today's hydration at a glance.",
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
    "leaderboard.empty":
      "You have not joined a circle yet. Create one first, or enter someone else's circle code.",
    "leaderboard.circleTitle": "Circle management",
    "leaderboard.circleDescription":
      "Create a small circle, or join someone else's leaderboard with a 6-character circle code.",
    "leaderboard.circleCreateName": "New circle name",
    "leaderboard.circleCreate": "Create circle",
    "leaderboard.circleJoinCode": "Enter circle code",
    "leaderboard.circleJoin": "Join circle",
    "leaderboard.circleSwitchHint": "Tap a circle chip below to switch the active leaderboard right away.",
    "leaderboard.circleEmpty": "No joined circles yet.",
    "leaderboard.circleLoading": "Syncing joined circles...",
    "leaderboard.circleLoadFailed": "Couldn't sync the joined circles right now. Please try again later.",
    "leaderboard.metricIntake": "By intake",
    "leaderboard.metricProgress": "By progress",
    "leaderboard.intakeValue": "Drank {amount}",
    "leaderboard.progressValue": "{percent}% complete",
    "leaderboard.targetValue": "Target {amount}",
    "leaderboard.noData": "No one in this circle has synced data for today yet.",
    "history.title": "Hydration history",
    "history.description":
      "Use color to scan how each day went. Healthier colors mean you were closer to the goal.",
    "history.heatmapTitle": "Last 8 weeks",
    "history.heatmapDescription":
      "The top-left cell is the newest day, and later cells move backward in time. Green means goal met, while warmer colors mean you were further from the goal.",
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
    "garden.plantAction": "Plant bok choy",
    "garden.readyToHarvest": "Ready to harvest",
    "garden.growing": "Growing {percent}%",
    "garden.harvestedCell": "Harvested",
    "garden.noSeeds": "No seeds left",
    "garden.emptyPlot": "Log water first",
    "garden.inventoryTitle": "Seeds and produce",
    "garden.inventoryDescription": "This shows what you can still plant or exchange right now.",
    "garden.produceEmpty": "No exchangeable produce yet. Harvests will appear here first.",
    "garden.collectionTitle": "Collection totals",
    "garden.collectionDescription": "This tracks lifetime harvests and does not go down when you exchange produce.",
    "garden.collectionEmpty": "No harvests yet. Plant on a day with a water record first.",
    "garden.exchangeTitle": "Exchange upgrade",
    "garden.exchangeRule": "Spend 3 bok choy to get 1 cabbage seed.",
    "garden.exchangeAction": "Exchange",
    "notification.drinkNowTitle": "Time to drink water",
    "notification.drinkNowBody":
      "A new reminder window has started. Try to drink a cup now.",
    "notification.snoozeTitle": "Reminder again",
    "notification.snoozeBody":
      "Your snooze has ended. This is a good time to catch up on that cup.",
    "startupCatchUp.badge": "Yesterday can still be updated",
    "startupCatchUp.title": "Do you want to add water to yesterday?",
    "startupCatchUp.description":
      "If you drank more water after shutting down or forgot to record it, you can add it here so {day} stays accurate.",
    "startupCatchUp.yesterdaySummary": "Yesterday's current record",
    "startupCatchUp.actual": "Drank {amount}",
    "startupCatchUp.target": "Target {amount}",
    "startupCatchUp.amountTitle": "How much should we add?",
    "startupCatchUp.amountHelp":
      "Start from 250 ml and fine-tune with +50 / -50.",
    "startupCatchUp.dismiss": "Not now",
    "startupCatchUp.confirm": "Add {amount}",
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
