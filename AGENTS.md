# Project instructions

## 项目定位

Drink Water 是 Tauri 2 桌面饮水提醒应用；本仓库同时包含 React 前端、Rust 本地核心和 Cloudflare Worker API。桌面本地 JSON 是主状态源，D1/R2 用于近期同步、排行榜和云备份。

## 启动与门禁

- 安装：`corepack pnpm install`
- 桌面开发：`corepack pnpm tauri dev`
- 前端构建：`corepack pnpm build`
- Node 测试：`corepack pnpm test`
- Rust 测试：`cargo test --manifest-path src-tauri/Cargo.toml`
- Worker 开发：先从 `cloudflare/wrangler.example.jsonc` 和 `cloudflare/.dev.vars.example` 创建本地私有配置，再运行 `corepack pnpm cf:dev`

## 技术栈与目录

- `src/`：React 18、TypeScript、Vite、Tailwind CSS 4
- `src-tauri/`：Rust、Tauri 2、本地状态与系统集成
- `cloudflare/`：Worker、D1 migrations、R2 备份
- `docs/`：现役机制与消费方规格；README 是入口，不复制完整实现

## 约定与边界

- 当前使用 package.json 固定的 pnpm；`pnpm-lock.yaml` 是唯一锁文件。不要手工编辑锁文件或生成目录。
- 保持 `package.json`、`src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json` 的版本一致。
- API/schema/设置字段变化要同步核对 `src/`、`src-tauri/`、`cloudflare/` 与 `docs/`。
- `cloudflare/wrangler.jsonc`、`.dev.vars`、`.env.local` 和用户状态不得提交；示例只写占位符。
- 生产 Worker 必须设置 `DRINK_WATER_CONFIG_TOKEN`，并分别验证部署、迁移、更新元数据和公开 API。
- 不把 Git tag、构建成功或 Worker 健康检查单独当成完整发布凭证。
- 小程序不在本仓库；无法从本仓库验证的小程序状态标为 `pending` 或 `out-of-scope`。
- 任务完成后，使用系统扬声器播报“quest done”。

## 当前状态与下一步

- 当前桌面端、Worker 和 tracked 文档可在本仓库核对；生成日志与临时产物不属于现役真相。
- 每次发布前运行全部门禁，并让 D1 `app_releases`、GitHub Release 与三处版本号对齐。
