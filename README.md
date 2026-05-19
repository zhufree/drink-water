# Drink Water

一个基于 `Tauri + React + TypeScript + Rust` 的桌面饮水提醒应用。

## 当前已实现

- 固定间隔饮水提醒
- 系统托盘显示 / 收起主窗口
- 开机自启开关
- 每日目标、单杯容量、提醒时段、通知开关等设置
- 欠水量机制：
  错过一轮提醒后，会按当前单杯容量累计欠量；后续记录喝水时，优先冲抵欠量，再计入今日净进度
- 最近 14 天历史视图

## 本地开发

```bash
npm install
npm run tauri dev
```

## 构建

```bash
npm run build
npm exec tauri build -- --debug
```

如果在 Windows 上打包安装包时遇到 WiX 下载或权限问题，可以先确认本机的 WiX 依赖、下载权限和 Rust 工具链权限是否正常。
