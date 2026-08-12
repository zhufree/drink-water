# 成就系统规格

## 产品目标

在排行榜页加入“我的成就”入口。成就只能由本地历史、今日状态或农场累计数据提供可验证证据；解锁后生成永久收据，不因历史滑窗、撤销后续饮水、库存消耗或换设备而重新上锁。

简单成就使用 `badge-frame-blue-v2-gloss.png`，困难成就使用 `badge-frame-blue.png`。两种外框和所有内芯图统一采用左上柔光、右下轻暗的光照方向。

## 数据契约

```ts
type AchievementEvidence = {
  kind: "daily" | "streak" | "garden" | "collection" | "background";
  startDay?: string;
  endDay?: string;
  cropType?: string;
  value?: number;
};

type AchievementReceipt = {
  achievementId: AchievementId;
  unlockedAt: string;
  evidence: AchievementEvidence;
};
```

本地 `PersistedState` 保存 `achievements: AchievementReceipt[]`，旧数据缺少此字段时默认为空并从当前可见证据补发。云端 D1 表 `achievement_receipts` 以 `(account_id, achievement_id)` 为主键，按 ID 做单调并集；同一 ID 保留较早的合法解锁时间及其证据。

## 成就目录

自然日以现有 `dayKey` 为准。喝水日为 `actualIntakeMl > 0`；达标日为 `targetMl > 0 && actualIntakeMl >= targetMl`；连续成就要求中间没有缺失自然日。

| ID | 名称 | 可验证条件 | 难度 |
| --- | --- | --- | --- |
| `first_sip` | 第一滴清泉 | 任一可见日有饮水 | 简单 |
| `first_goal` | 满杯而归 | 任一可见日完成当天目标 | 简单 |
| `first_reminder_answer` | 与提醒击掌 | 任一可见日完成提醒槽至少 1 次 | 简单 |
| `first_plant` | 第一颗芽 | 有活跃作物，或累计收获大于 0 | 简单 |
| `first_harvest` | 初熟之喜 | 累计收获至少 1 次 | 简单 |
| `first_background` | 水境初开 | 至少解锁一个奖励背景 | 简单 |
| `drink_streak_7` | 七日清流 | 连续 7 天有饮水 | 困难 |
| `goal_streak_7` | 七日满盈 | 连续 7 天达标 | 困难 |
| `drink_streak_30` | 月轮长流 | 连续 30 天有饮水 | 困难 |
| `harvest_10` | 十篮丰收 | 累计收获至少 10 次 | 困难 |
| `same_crop_5` | 拿手作物 | 同一种作物累计收获至少 5 次 | 困难 |
| `crop_varieties_3` | 三色菜园 | 收获过至少 3 种作物 | 困难 |

## 证据边界

- “第一次”只表示在当前可见历史中已经发生，不伪造已丢失的精确首次日期。
- `first_plant` 在只剩收获集合时使用 `kind: "collection"` 反推曾经种植。
- `drink_streak_30` 只在某台设备确实持有连续 30 天日记录时补发，不能用云端 7 天日快照猜测。
- 旧设备解锁后会同步永久收据，因此新设备不需要保存 30 天明细也能继承。
- 外部收据在 Worker 和 Tauri 边界均校验 ID、ISO 时间、证据类型、日期跨度和数值门槛。

## 判定与同步

饮水、补记、撤销、种植、收获、兑换、背景解锁、导入备份以及应用远端日/农场快照后都会重新判定；查询成就时也会执行一次补发。判定只新增收据，从不删除。

组合快照接口可携带 `achievementReceipts`。日快照与农场快照仍使用各自的覆盖策略；成就收据独立使用幂等、顺序无关的集合并集，避免并发设备互相覆盖。

## UI 与素材

- 排行榜内容卡片之前显示独立入口栏、已解锁数量和最近三枚徽章。
- 点击整个入口栏切换折叠与展开；展开后不增加重复标题或容器，直接以两列网格展示全部成就、描述、进度或解锁时间。
- 未解锁状态同时使用降饱和、透明度和锁图标，不只依靠颜色。
- 入口使用原生按钮并通过 `aria-expanded` 与内容区域建立可访问关系。
- 12 个稳定 ID 各映射一张 `src/assets/achievements/icons/{id}.png`，均为独立 512×512 PNG，无文字、数字、水印或外框。
- 简单内芯以浅蓝、青绿和暖白为主；困难内芯使用深蓝、靛蓝和少量冷金。
- 内芯采用人工插画感明确的 2D 卡通游戏图标语言：圆润深蓝描边、少量平涂色块、轻微手绘不对称和单层赛璐璐阴影；避免写实材质、复杂景深、水彩笔触、体积光、粒子堆叠和 3D 塑料质感。
- 中英文名称和描述统一进入现有 i18n 词典。

## 验证门禁

- Node 测试覆盖目录、进度、难度映射、Worker 严格验证和并集行为。
- Rust 测试覆盖 12 个判定、连续日缺口、旧 JSON 补发、永久性及远端合并。
- 最终运行 `corepack pnpm test`、`cargo test --manifest-path src-tauri/Cargo.toml` 和 `corepack pnpm build`。

## 不在本期范围

- 不公开其他圈子成员的成就。
- 不扩展现有 7 天日快照窗口。
- 不以单日超量饮水、当前库存或已消失的休息状态推断成就。
