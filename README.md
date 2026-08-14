# Drink Water

Drink Water 是一个基于 Tauri 2、React、TypeScript 与 Rust 的桌面饮水提醒应用。桌面端以本地 JSON 为主状态源，并通过 Cloudflare Worker、D1 与 R2 提供近期快照同步、排行榜和完整云备份。

## 当前能力

- 按每日目标、杯量和活跃时段派生提醒间隔；支持通知、稍后提醒、托盘和开机自启。
- 记录白水、茶、咖啡等饮品，并按饮品系数折算有效补水量；支持撤销最近一次记录和补记昨天。
- 展示历史、热力图与欠水情况；本地历史最长保留 90 天。
- 农场玩法：种植、收获、作物图鉴、种子/背景兑换、休息加速，以及水宝宝每日探险和固定家园修缮。
- 圈子与排行榜：昵称、创建/加入/退出/解散圈子、移除成员、查看成员农场。
- 多端数据：配对码、最近 7 天饮水快照、农场/设置快照、导入导出和 R2 完整云备份。
- 中英文界面、首次使用引导和启动时版本检查。

近期同步采用 Last-Write-Wins。它适合设备间追平近期状态，不会智能合并两台离线设备的并发修改；超过 7 天的迁移应使用完整云备份。

## 项目结构

```text
src/                 React 前端、Tauri 调用与本地配置回退
src-tauri/           Rust 状态模型、提醒/农场逻辑和系统集成
cloudflare/src/      Worker API（同步、备份、排行榜、配置、微信登录）
cloudflare/migrations/ D1 schema 与迁移
docs/                同步、更新检查和小程序消费方规格
```

关键现役文档：

- [同步数据系统实现说明](docs/sync-system.md)
- [小程序兑换中心功能说明](docs/mini-program-exchange-center-spec.md)
- [Cloudflare 更新检查维护](docs/cloudflare-update-check.md)
- [水宝宝远行与家园修缮 MVP](docs/ideas/water-baby-expedition-mvp.md)

## 本地开发

前置条件：Node.js 22.18+（测试直接加载 TypeScript）、Corepack、Rust stable，以及 Tauri 2 对应平台的系统依赖。项目固定使用 pnpm 9.15.0。

```powershell
corepack pnpm install
corepack pnpm tauri dev
```

只启动前端 Vite（端口固定为 `1420`）：

```powershell
corepack pnpm dev
```

## 验证与构建

```powershell
corepack pnpm test
corepack pnpm build
cargo test --manifest-path src-tauri/Cargo.toml
corepack pnpm exec tauri build --debug
```

`pnpm` 与 `pnpm-lock.yaml` 是唯一依赖入口。不要手工编辑锁文件、生成目录 `dist/`、`src-tauri/target/` 或 Tauri 生成物。

## Cloudflare Worker

实际 `cloudflare/wrangler.jsonc` 包含本地账户/资源标识并被 Git 忽略。新环境先复制模板，再填写自己的 Cloudflare 资源：

```powershell
Copy-Item cloudflare/wrangler.example.jsonc cloudflare/wrangler.jsonc
Copy-Item cloudflare/.dev.vars.example cloudflare/.dev.vars
corepack pnpm cf:dev
```

Worker 需要 `DB`（D1）和 `SYNC_BACKUPS`（R2）绑定。微信登录还需要 `WECHAT_APP_ID`、`WECHAT_APP_SECRET`。生产环境必须设置 `DRINK_WATER_CONFIG_TOKEN`，否则配置写接口不会要求 Bearer token。

部署命令：

```powershell
corepack pnpm cf:deploy
```

部署代码、应用 D1 迁移、更新 `app_releases` 和发布桌面安装包是四个独立步骤；完成其中一步不能推导其余步骤已经完成。

## 配置与数据边界

- 桌面 API 基址当前由 `src-tauri/src/shared.rs` 固定；根目录不读取 `VITE_LEADERBOARD_API_BASE`。
- 农场兑换配置优先从 Worker 拉取，失败时回退到 `src/config/*.json` 的内置配置。
- 本地状态保存在 Tauri 应用数据目录的 `drink-water-state.json`，不要提交真实用户状态、`.env.local`、`.dev.vars` 或密钥。
- 小程序代码不在本仓库；`docs/` 中的小程序材料是消费方规格，不能单独证明小程序已经部署。
