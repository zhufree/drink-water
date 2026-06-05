# 同步数据系统实现说明

## 1. 文档目的

本文档说明当前版本的多端同步与云端备份实现细节，重点包括：

- 哪些数据会参与同步
- 什么时候触发同步
- 不同数据分别写入哪些云端存储
- 本地状态如何与云端状态交互
- 云端备份的上传、索引、恢复流程
- 当前版本的覆盖策略与限制

本文档对应当前项目中的“快照优先版：近 7 天增量快照同步 + R2 全量云备份”实现。

---

## 2. 设计目标

当前版本的目标不是“全量实时双向同步所有历史数据”，而是：

1. 解决桌面端与移动端之间近期使用切换时的数据衔接问题
2. 让用户在最近几天内切换设备时，尽量不需要做全量恢复
3. 保留完整本地数据作为主状态源
4. 用云端备份承担长期历史迁移和灾难恢复

因此系统被拆成两层：

- 近 7 天增量同步：使用 `D1`
- 全量云备份：使用 `R2`

---

## 3. 总体架构

### 3.1 本地层

本地仍然使用 Tauri 后端持久化的完整 `PersistedState` JSON 作为主状态源。

本地状态包括：

- `settings`
- `today`
- `history`
- `garden`
- `syncMeta`

其中 `syncMeta` 是这次新增的同步元数据，用于记录：

- 当前设备所属的同步账户 `accountId`
- 最近一次拉取快照时间
- 最近一次云备份时间
- 最近若干天每个日快照的 `updatedAt`
- 农场快照的 `updatedAt`
- 对应的设备标识等

### 3.2 云端同步层

云端同步层使用 `Cloudflare Worker + D1`。

这一层只负责：

- 维护设备与同步账户的绑定关系
- 保存最近 7 天的日快照
- 保存当前农场快照
- 保存云备份的元信息索引

### 3.3 云端备份层

云端备份层使用 `Cloudflare R2`。

这一层负责保存完整本地 JSON 备份文件，不负责高频实时同步。

---

## 4. 数据分类与落库位置

### 4.1 同步账户与设备绑定相关

这部分数据保存在 `D1` 中，用于识别“哪些设备属于同一个用户同步空间”。

#### 表：`sync_accounts`

用途：

- 表示一个同步账户
- 一个用户的多个设备会绑定到同一个 `account_id`

主要字段：

- `account_id`
- `created_at`

#### 表：`sync_devices`

用途：

- 记录设备和同步账户的绑定关系

主要字段：

- `device_id`
- `account_id`
- `paired_at`
- `last_seen_at`

#### 表：`pair_codes`

用途：

- 用于新设备通过配对码加入已有同步账户

主要字段：

- `code`
- `account_id`
- `created_by_device_id`
- `expires_at`
- `used_at`
- `created_at`

### 4.2 近 7 天饮水日快照

#### 表：`daily_snapshots`

用途：

- 保存某个同步账户最近 7 天内、按天拆分的饮水快照
- 每个账户每天最多一条记录

主键：

- `(account_id, day_key)`

主要字段：

- `account_id`
- `day_key`
- `snapshot_json`
- `updated_at`
- `updated_by_device_id`

说明：

- `snapshot_json` 对应本地某一天的 `HistoryItem` 形态数据
- 这部分用于多设备之间追平近期饮水记录
- 当前实现保留最近 7 天，不做长期全量在线历史同步

### 4.3 农场快照

#### 表：`garden_snapshots`

用途：

- 保存当前最新的农场状态快照
- 每个同步账户只有一条记录

主键：

- `account_id`

主要字段：

- `account_id`
- `snapshot_json`
- `updated_at`
- `updated_by_device_id`

说明：

- `snapshot_json` 对应完整 `GardenState`
- 当前版本使用快照覆盖，不做细粒度合并

### 4.4 云备份元信息

#### 表：`backup_manifests`

用途：

- 记录已经上传到 `R2` 的完整备份文件索引
- 数据库存的是“备份记录”，不是备份文件本体

主要字段：

- `object_key`
- `account_id`
- `created_at`
- `device_id`
- `size_bytes`

说明：

- `object_key` 指向 `R2` 中的具体对象路径
- 真正的完整备份内容不保存在 `D1` 表里，而是在 `R2` 中

---

## 5. R2 云备份存储方式

### 5.1 存储位置

完整备份文件保存在 `R2` bucket：

- `drink-water-backups`

### 5.2 对象路径

当前对象键格式：

```text
backups/{accountId}/{timestamp}-{deviceId}.json
```

例如：

```text
backups/xxxxxxxx/2026-06-04T09:35:00.000Z-DEVICE_ID.json
```

### 5.3 文件内容

备份内容是完整的本地状态 JSON，也就是完整的 `PersistedState`。

它包括：

- `settings`
- `today`
- `history`
- `garden`
- `syncMeta`

---

## 6. 同步接口与职责

### 6.1 同步账户初始化与配对

#### `POST /api/sync/bootstrap`

用途：

- 为当前设备获取或创建同步账户
- 如果本地已有 `accountId`，则继续使用
- 如果没有，则创建新账户并绑定当前设备

#### `POST /api/sync/pair-code/create`

用途：

- 为当前同步账户生成一个一次性配对码

#### `POST /api/sync/pair-code/bind`

用途：

- 让新设备通过配对码绑定到已有同步账户

### 6.2 近 7 天日快照同步

#### `POST /api/sync/daily/push`

用途：

- 把本地某些天的日快照上传到 `daily_snapshots`

#### `GET /api/sync/daily/pull`

用途：

- 拉取当前账户最近可用的日快照

### 6.3 农场快照同步

#### `POST /api/sync/garden/push`

用途：

- 把当前本地农场状态上传到 `garden_snapshots`

#### `GET /api/sync/garden`

用途：

- 拉取当前账户最新农场快照

### 6.4 云备份

#### `POST /api/backup/upload`

用途：

- 上传完整本地 JSON 到 `R2`
- 同时在 `backup_manifests` 中写入一条索引记录

#### `GET /api/backup/latest`

用途：

- 获取最新云备份的元信息

#### `POST /api/backup/restore`

用途：

- 获取最新云备份内容
- 由客户端导入并恢复到本地

---

## 7. 本地命令与职责

Tauri 侧新增了若干命令，用于让前端组装快照、应用快照、导入导出云备份。

关键命令包括：

- `get_sync_meta`
- `set_sync_account`
- `get_recent_daily_snapshots`
- `get_garden_snapshot`
- `apply_remote_snapshots`
- `export_cloud_backup_payload`
- `import_cloud_backup_payload`
- `mark_cloud_backup_uploaded`

它们的职责分别是：

### `get_sync_meta`

- 获取本地同步元数据 `syncMeta`

### `set_sync_account`

- 把当前设备绑定到指定 `accountId`
- 并把该信息写入本地持久化状态

### `get_recent_daily_snapshots`

- 从本地完整 `history` 中裁切出最近若干天的日快照
- 用于上传到 `daily_snapshots`

### `get_garden_snapshot`

- 读取当前本地农场快照
- 用于上传到 `garden_snapshots`

### `apply_remote_snapshots`

- 把从云端拉到的日快照和农场快照应用到本地 JSON
- 按 `updated_at` 比较后决定是否覆盖本地对应内容

### `export_cloud_backup_payload`

- 导出完整本地 `PersistedState` 为 JSON 字符串
- 作为上传到 `R2` 的备份内容

### `import_cloud_backup_payload`

- 把从云端取回的完整备份 JSON 导入本地
- 直接恢复本地完整状态

### `mark_cloud_backup_uploaded`

- 在本地 `syncMeta` 中记录最新一次备份上传时间

---

## 8. 什么时候会触发同步

### 8.1 应用启动时

应用启动后，会先执行一次同步初始化和拉取：

1. 读取本地 `syncMeta`
2. 检查当前设备是否已有 `accountId`
3. 如果没有，则通过 `/api/sync/bootstrap` 创建或获取同步账户
4. 拉取云端日快照和农场快照
5. 通过 `apply_remote_snapshots` 按规则应用到本地

这一步的目标是：

- 在用户开始使用当前设备前，尽量先把云端较新的近期数据拉下来

### 8.2 配对成功后

新设备通过配对码绑定成功后，会立刻执行一次拉取：

1. 配对码绑定到已有同步账户
2. 拉取当前账户云端近期快照
3. 覆盖本地较旧的对应快照数据

### 8.3 用户手动点击“立即拉取”时

用户在设置页点击“立即拉取”后：

1. 先弹出二次确认
2. 用户确认后，拉取云端日快照和农场快照
3. 如果云端 `updated_at` 更新，则覆盖本地对应数据

这是一个“覆盖式同步”动作，不是合并式同步。

### 8.4 本地写操作之后

当前版本中，以下操作会触发后台同步：

- 记录喝水 `log_drink`
- 撤销最近一次喝水 `undo_last_drink`
- 补记昨天喝水 `log_yesterday_drink`
- 种植 `plant_seed`
- 收获 `harvest_crop`
- 兑换 `exchange_produce`
- 兑换背景奖励 `redeem_background_reward`
- 开始休息 `start_rest_break`
- 取消休息 `cancel_rest_break`
- 完成休息 `complete_rest_break`

### 8.5 当前同步顺序

为了避免用户点击按钮后 UI 卡顿，当前实现已经改为：

1. 先执行本地写入
2. 先刷新本地 UI
3. 再在后台异步同步到云端

也就是说，云端同步现在不会阻塞“记录喝水”等本地操作的界面反馈。

### 8.6 后台同步前的预拉取

在后台上传快照前，系统会做一次轻量判断：

- 如果距离上一次成功拉取云端快照已经超过阈值（当前约 `45` 秒）
- 则先拉取一次云端最新快照，再上传本地新快照

这样做的目的是：

- 减少用户频繁切换设备时，用较旧本地状态直接覆盖云端的概率

---

## 9. 哪些操作会同步到哪些表

### 9.1 饮水相关

#### 记录喝水 `log_drink`

同步内容：

- 当天日快照

写入表：

- `daily_snapshots`

#### 撤销最近一次喝水 `undo_last_drink`

同步内容：

- 当天日快照

写入表：

- `daily_snapshots`

#### 补记昨天喝水 `log_yesterday_drink`

同步内容：

- 昨天对应的日快照

写入表：

- `daily_snapshots`

### 9.2 农场相关

#### 种植 / 收获 / 兑换 / 背景奖励 / 休息状态变更

同步内容：

- 当前农场快照

写入表：

- `garden_snapshots`

说明：

- 当前版本农场同步采用完整快照覆盖
- 不做更细粒度的库存级合并

### 9.3 云备份相关

#### 上传云备份

同步内容：

- 完整本地 `PersistedState`

写入位置：

- 文件本体写入 `R2`：`drink-water-backups`
- 索引元信息写入 `D1`：`backup_manifests`

#### 从云端恢复

读取位置：

- 从 `backup_manifests` 找到账户最新一条备份记录
- 再从 `R2` 下载对应 JSON
- 最后导入本地完整状态

---

## 10. 覆盖规则与冲突策略

当前版本明确采用 `Last-Write-Wins`，即“较新的快照覆盖较旧的快照”。

### 10.1 日快照覆盖规则

对最近 7 天的每个 `day_key`：

- 如果云端 `updated_at` 晚于本地对应天的快照时间，则使用云端覆盖本地
- 否则保留本地

### 10.2 农场快照覆盖规则

- 如果云端农场快照 `updated_at` 晚于本地农场快照时间，则用云端覆盖本地
- 否则保留本地

### 10.3 极端情况下的稳定顺序

如果出现极少见的时间戳完全相同情况：

- 服务端还会结合 `updated_by_device_id` 做稳定排序
- 确保结果可重复、可确定

### 10.4 当前版本不做的事情

当前版本不做：

- 同一天两端数值智能相加
- 农场库存的自动合并
- 全量历史实时在线同步
- 长期离线设备的增量无限追平

---

## 11. 云备份系统实现细节

### 11.1 上传流程

当用户点击“上传云备份”时：

1. 前端调用本地命令 `export_cloud_backup_payload`
2. Tauri 将完整本地 `PersistedState` 导出为 JSON 字符串
3. 前端调用 `POST /api/backup/upload`
4. Worker 将 JSON 写入 `R2`
5. Worker 同时在 `backup_manifests` 中插入一条记录
6. 前端再调用 `mark_cloud_backup_uploaded` 更新本地 `syncMeta.lastBackupAt`

### 11.2 恢复流程

当用户点击“从云端恢复”时：

1. 前端调用 `POST /api/backup/restore`
2. Worker 从 `backup_manifests` 找到当前账户最新备份
3. Worker 根据 `object_key` 从 `R2` 读取备份 JSON
4. 前端拿到 JSON 后调用 `import_cloud_backup_payload`
5. Tauri 用该 JSON 恢复本地完整状态
6. 前端刷新本地状态显示

### 11.3 为什么要分成 R2 + D1 两层

原因是：

- `R2` 适合存完整大对象文件
- `D1` 适合查“最新一份备份是谁、什么时候传的、大小多少”这类结构化信息

所以当前实现中：

- 完整备份内容在 `R2`
- 备份索引在 `D1.backup_manifests`

---

## 12. 本地状态与云端状态的关系

当前版本中，本地始终是主状态源。

也就是说：

- 用户所有日常操作都先改本地
- 云端只保存近期快照和备份
- 本地不会因为云端只保留 7 天而裁掉自己的完整历史

这样设计的好处是：

- 本地交互快
- 云端压力小
- 实现复杂度可控
- 用户长期完整历史仍然保留在本地和云备份中

---

## 13. 当前实现的已知限制

### 13.1 近期同步窗口有限

当前只保留最近 7 天的日快照。

这意味着：

- 如果某设备长时间未打开
- 并且缺失时间超过 7 天
- 仅靠近期快照不一定能自动追平

这时更适合使用“从云端恢复”。

### 13.2 同步不是合并型，而是覆盖型

当前版本不是事件流同步，而是快照同步。

因此：

- 如果两个设备真的在非常接近的时间离线修改同一天数据
- 最终会按照较新的快照覆盖较旧快照
- 不保证两个结果会自动合并

### 13.3 农场同步同样是快照覆盖

农场状态没有做事件级同步，因此：

- 多设备同时操作时
- 仍然存在后写覆盖前写的可能

这属于当前版本有意接受的简化。

---

## 14. 关键实现文件

### 云端 Worker

- `cloudflare/src/index.ts`
- `cloudflare/migrations/0003_sync.sql`
- `cloudflare/wrangler.jsonc`

### 前端同步调用

- `src/syncApi.ts`
- `src/api.ts`
- `src/hooks/useAppController.ts`
- `src/components/SettingsPanel.tsx`

### Tauri 本地状态与命令

- `src-tauri/src/commands.rs`
- `src-tauri/src/models.rs`
- `src-tauri/src/ui.rs`

---

## 15. 总结

当前这套同步系统的本质是：

- 本地保存完整状态
- 云端用 `D1` 保存最近 7 天的日快照与农场快照
- 云端用 `R2` 保存完整 JSON 备份
- 多设备切换时优先通过近 7 天快照自动追平
- 时间跨度过大时通过云备份恢复

这是一套偏“实用型、轻量型”的实现：

- 优先解决近期跨设备衔接
- 优先保证本地操作体验
- 避免一开始就做复杂的全量事件流同步系统

后续如果产品对“真正并发合并”提出更高要求，再考虑把近期同步从快照进一步演进为事件流会更合适。
