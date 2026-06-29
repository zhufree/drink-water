# 小程序兑换中心功能说明

本文档用于给小程序端实现“兑换种子”和“兑换背景”两个功能做参考。当前桌面端已实现这两个能力，入口位于历史农场页的“兑换中心”，同一个弹层内分为两个页签：

- 种子兑换
- 背景兑换

小程序端建议沿用同一套配置、库存字段和兑换规则，保证与桌面端、云端农场快照兼容。

## 1. 相关数据

### 1.1 农场状态 `GardenState`

兑换中心主要依赖 `GardenState` 中的以下字段：

```ts
type GardenState = {
  seeds: Array<{ seedType: string; count: number }>;
  produce: Array<{ cropType: string; count: number }>;
  activeBackground: string;
  unlockedBackgrounds: string[];
};
```

字段说明：

| 字段 | 说明 |
| --- | --- |
| `seeds` | 当前种子库存。种子兑换成功后增加目标种子数量。 |
| `produce` | 当前作物/果实库存。种子兑换和背景兑换都会消耗这里的库存。 |
| `activeBackground` | 当前正在使用的背景 id。默认值为 `default`。 |
| `unlockedBackgrounds` | 已解锁背景 id 列表。背景兑换成功后写入这里。 |

### 1.2 配置入口

桌面端通过 `get_drink_water_config` 获取运行时配置。小程序端也建议从服务端拉取同等配置，避免把兑换规则写死在客户端。

配置结构：

```ts
type DrinkWaterConfig = {
  seedExchange: SeedExchangeConfig;
  backgroundRewards: BackgroundRewardConfig[];
};
```

## 2. 种子与作物配置

每个配置项同时定义一种种子、它种出来的作物、显示名称、资源 key 和等级。

```ts
type SeedExchangeSeedConfig = {
  seedType: string;
  cropType: string;
  tier: number;
  label: {
    "zh-CN": string;
    "en-US": string;
  };
  seedAsset: string;
  cropAsset: string;
};
```

当前种子/作物列表：

| 等级 | 种子 `seedType` | 作物 `cropType` | 中文名 | 资源 key |
| --- | --- | --- | --- | --- |
| 1 | `potatoSeed` | `potato` | 土豆 | `potatoSeed` / `potatoCrop` |
| 1 | `bellPepperSeed` | `bellPepper` | 青椒 | `bellPepperSeed` / `bellPepperCrop` |
| 1 | `carrotSeed` | `carrot` | 胡萝卜 | `carrotSeed` / `carrotCrop` |
| 1 | `napaCabbageSeed` | `napaCabbage` | 大白菜 | `napaCabbageSeed` / `napaCabbageCrop` |
| 2 | `broccoliSeed` | `broccoli` | 西兰花 | `broccoliSeed` / `broccoliCrop` |
| 2 | `radishSeed` | `radish` | 白萝卜 | `radishSeed` / `radishCrop` |
| 2 | `redRadishSeed` | `redRadish` | 红萝卜 | `redRadishSeed` / `redRadishCrop` |
| 2 | `pumpkinSeed` | `pumpkin` | 南瓜 | `pumpkinSeed` / `pumpkinCrop` |
| 2 | `onionSeed` | `onion` | 洋葱 | `onionSeed` / `onionCrop` |
| 2 | `watermelonSeed` | `watermelon` | 西瓜 | `watermelonSeed` / `watermelonCrop` |
| 3 | `eggplantSeed` | `eggplant` | 茄子 | `eggplantSeed` / `eggplantCrop` |

小程序端只需要使用上表中的当前 id。历史版本遗留的旧 id 归一化属于后端或数据迁移层职责，不建议暴露到小程序功能实现里。

## 3. 兑换种子

### 3.1 功能目标

用户用已经收获并存入背包的作物，兑换其他种子。兑换会消耗来源作物库存，并增加目标种子库存。

### 3.2 页面入口

桌面端入口：

1. 进入历史农场页。
2. 在“种子与果实”卡片点击“兑换中心”。
3. 默认进入“种子兑换”页签。

小程序端建议入口：

- 历史/农场页增加“兑换中心”按钮。
- 打开后用 tab 切换“种子兑换”和“背景兑换”。

### 3.3 页面元素

种子兑换页签包含：

| 区域 | 说明 |
| --- | --- |
| 可用作物 | 只展示 `produce` 中 `count > 0`，且至少存在一个可兑换目标的作物。 |
| 全部种子 | 展示全部配置种子。当前来源作物可兑换的目标可点击，不可兑换的目标置灰。 |
| 兑换数量 | 选择来源作物和目标种子后显示步进器，最小为 1，最大由库存决定。 |
| 兑换摘要 | 展示本次消耗作物数量和获得种子数量。 |
| 立即兑换按钮 | 只有选择完整且库存足够时可点击。 |

空状态：

- 没有可用作物时，提示“暂时还没有可用于种子兑换的作物”。
- 选中的作物没有可兑换目标时，提示“这个作物暂时没有可兑换的目标种子”。

### 3.4 兑换规则

规则由配置 `seedExchange.exchangeRules` 决定：

```json
[
  { "tierGap": 0, "sourceCost": 1, "targetSeedCount": 1 },
  { "tierGap": 1, "sourceCost": 3, "targetSeedCount": 1 }
]
```

计算方式：

```ts
tierGap = targetSeed.tier - sourceCrop.tier;
```

只有配置中存在对应 `tierGap` 的兑换才允许。当前规则含义：

| 兑换类型 | 条件 | 消耗 | 获得 |
| --- | --- | --- | --- |
| 同级兑换 | 目标种子等级 = 来源作物等级 | 1 个来源作物 | 1 颗目标种子 |
| 升 1 级兑换 | 目标种子等级 = 来源作物等级 + 1 | 3 个来源作物 | 1 颗目标种子 |

不支持：

- 兑换成同一种作物对应的种子。例如 `potato` 不能兑换 `potatoSeed`。
- 降级兑换。例如 2 级作物兑换 1 级种子。
- 跨超过 1 级兑换。例如 1 级作物直接兑换 3 级种子。
- 配置中不存在的来源作物或目标种子。

### 3.5 可兑换目标生成逻辑

伪代码：

```ts
function buildExchangeOptions(seeds, rules) {
  const options = [];

  for (const source of seeds) {
    for (const target of seeds) {
      if (source.seedType === target.seedType) continue;

      const tierGap = target.tier - source.tier;
      const rule = rules.find((item) => item.tierGap === tierGap);
      if (!rule) continue;

      options.push({
        sourceCropType: source.cropType,
        targetSeedType: target.seedType,
        cost: rule.sourceCost,
        targetSeedCount: rule.targetSeedCount
      });
    }
  }

  return options;
}
```

### 3.6 数量计算

用户选择来源作物和目标种子后：

```ts
maxExchangeQuantity = Math.max(1, Math.floor(sourceProduceCount / option.cost));
totalCost = option.cost * exchangeQuantity;
totalSeedCount = option.targetSeedCount * exchangeQuantity;
```

确认按钮可点击条件：

```ts
selectedSourceEntry != null &&
selectedTargetOption != null &&
exchangeQuantity >= 1 &&
sourceProduceCount >= selectedTargetOption.cost * exchangeQuantity
```

### 3.7 提交参数

桌面端命令：

```ts
exchangeProduce(sourceCropType, targetSeedType, quantity)
```

小程序端建议请求体：

```json
{
  "sourceCropType": "potato",
  "targetSeedType": "bellPepperSeed",
  "quantity": 1
}
```

服务端/本地状态变更：

1. 校验 `sourceCropType` 是否是已知作物。
2. 校验 `targetSeedType` 是否是已知种子。
3. 校验不能兑换成同作物对应的种子。
4. 根据 `tierGap` 找兑换规则。
5. 计算总消耗和总获得数量。
6. 从 `garden.produce` 扣除来源作物。
7. 向 `garden.seeds` 增加目标种子。
8. 保存并同步新的 `GardenState`。

兑换成功后，桌面端提示：

```text
已兑换 {count} 颗 {seed} 种子。
```

注意：当前提示里的 `{count}` 是用户选择的兑换次数，不是最终获得种子数。由于当前规则每次都获得 1 颗，两者暂时相等；如果以后配置 `targetSeedCount > 1`，文案需要同步调整。

### 3.8 错误场景

| 场景 | 当前错误含义 |
| --- | --- |
| 目标种子不存在 | `unknown seed type` |
| 来源作物不存在 | `unknown exchange source` |
| 目标种子不可兑换 | `unknown exchange target` |
| 兑换成同作物种子 | `cannot exchange into the same crop` |
| 作物库存不足 | 扣库存失败，表现为兑换失败 |
| 数量过大导致溢出 | `exchange quantity is too large` |

小程序端建议把技术错误转为用户可理解文案，例如：

- “库存不足，暂时无法兑换。”
- “当前作物不能兑换这个种子。”
- “兑换失败，请稍后重试。”

## 4. 兑换背景

### 4.1 功能目标

用户用指定作物库存兑换图片背景。兑换成功后：

1. 扣除配置中要求的作物库存。
2. 将背景 id 加入 `unlockedBackgrounds`。
3. 自动把 `activeBackground` 设置为刚兑换的背景。
4. 保存并同步新的 `GardenState`。

### 4.2 背景配置

```ts
type BackgroundRewardConfig = {
  id: string;
  title: {
    "zh-CN": string;
    "en-US": string;
  };
  description: {
    "zh-CN": string;
    "en-US": string;
  };
  previewAsset: string;
  redeemable: boolean;
  requirements: Array<{
    cropType: string;
    count: number;
  }>;
};
```

当前背景配置：

| 背景 id | 中文标题 | 说明 | 预览资源 | 是否可兑换 | 兑换需求 |
| --- | --- | --- | --- | --- | --- |
| `catCollage` | 奶盖乌龙 | by 北极圈 | `bg1` | 是 | `potato` x 6、`carrot` x 6 |
| `bg2` | 三发猎鱼弓 | 当前仅作预览展示，暂不开放兑换。 | `bg2` | 否 | 无 |
| `bg3` | 斯普拉顿三周年 | 当前仅作预览展示，暂不开放兑换。 | `bg3` | 否 | 无 |

### 4.3 页面元素

背景兑换页签包含：

| 元素 | 说明 |
| --- | --- |
| 背景预览图 | 展示当前选中背景。点击可进入大图预览。 |
| 上一张/下一张 | 在背景配置列表中循环切换。 |
| 指示点 | 显示背景数量和当前背景位置，点击可直接切换。 |
| 标题和描述 | 使用当前语言显示 `title` 和 `description`。 |
| 需求进度 | 对可兑换背景展示每项作物需求的 `当前数量 / 需求数量`。 |
| 兑换按钮 | 可兑换且库存满足时可点击。 |
| 已解锁状态 | 已解锁背景显示“已解锁”，按钮禁用。 |
| 暂不支持状态 | `redeemable = false` 时显示“暂不支持兑换”。 |

空状态：

- 如果没有背景配置，提示“暂时没有背景配置”。

### 4.4 可兑换状态计算

对每个背景计算：

```ts
unlocked = gardenState.unlockedBackgrounds.includes(reward.id);

requirementProgress = reward.requirements.map((requirement) => ({
  cropType: requirement.cropType,
  count: requirement.count,
  current: produceCountByType.get(requirement.cropType) ?? 0
}));

ready =
  reward.redeemable &&
  requirementProgress.every((item) => item.current >= item.count);
```

按钮状态：

| 条件 | 展示 |
| --- | --- |
| `redeemable = false` | “暂不支持兑换”，不可点击 |
| 已在 `unlockedBackgrounds` 中 | “已解锁”，不可点击 |
| `ready = false` | “兑换背景”，不可点击 |
| `ready = true` 且未解锁 | “兑换背景”，可点击 |

### 4.5 提交参数

桌面端命令：

```ts
redeemBackgroundReward(rewardId)
```

小程序端建议请求体：

```json
{
  "rewardId": "catCollage"
}
```

服务端/本地状态变更：

1. 根据 `rewardId` 查找背景配置。
2. 校验背景存在。
3. 校验 `redeemable = true`。
4. 校验尚未解锁。
5. 对每个 requirement 检查作物库存是否足够。
6. 逐项扣除作物库存。
7. 把 `reward.id` 加入 `garden.unlockedBackgrounds`。
8. 设置 `garden.activeBackground = reward.id`。
9. 保存并同步新的 `GardenState`。

兑换成功后，桌面端提示：

```text
已兑换背景。
```

### 4.6 错误场景

| 场景 | 当前错误含义 |
| --- | --- |
| 背景 id 不存在 | `unknown background reward` |
| 背景暂不开放兑换 | `background reward is not redeemable` |
| 背景已解锁 | `background reward already unlocked` |
| 作物库存不足 | `not enough produce to exchange` |

小程序端建议文案：

- “作物数量不足，暂时无法兑换。”
- “该背景已经解锁。”
- “该背景暂未开放兑换。”
- “兑换失败，请稍后重试。”

## 5. 背景使用与设置

兑换背景之外，桌面端还提供已解锁背景的切换能力：

```ts
setActiveBackground(backgroundId)
```

规则：

- `backgroundId = "default"` 时，切回默认界面，不要求已解锁。
- 非默认背景必须存在于背景配置中。
- 非默认背景必须已经在 `unlockedBackgrounds` 中。
- 切换成功后更新 `activeBackground` 并同步农场快照。

小程序端如果只做兑换中心，至少需要在兑换成功后尊重 `activeBackground` 的变化。若同时做背景设置页，可复用以上规则。

## 6. 同步要求

这两个功能都属于农场状态变更。桌面端本地写入成功后会同步完整 `garden` 快照：

- 种子兑换：`exchange_produce`
- 背景兑换：`redeem_background_reward`
- 背景切换：`set_active_background`

小程序端建议：

1. 调用兑换接口成功后，用服务端返回的最新 `GardenState` 刷新页面。
2. 如果采用本地乐观更新，也必须以服务端最终返回为准。
3. 农场快照同步采用完整快照覆盖，不做库存级局部合并。

## 7. 资源映射建议

小程序端需要准备以下资源：

### 7.1 种子图标

| `seedAsset` | 对应种子 |
| --- | --- |
| `potatoSeed` | 土豆种子 |
| `bellPepperSeed` | 青椒种子 |
| `carrotSeed` | 胡萝卜种子 |
| `napaCabbageSeed` | 大白菜种子 |
| `broccoliSeed` | 西兰花种子 |
| `radishSeed` | 白萝卜种子 |
| `redRadishSeed` | 红萝卜种子 |
| `pumpkinSeed` | 南瓜种子 |
| `onionSeed` | 洋葱种子 |
| `watermelonSeed` | 西瓜种子 |
| `eggplantSeed` | 茄子种子 |

### 7.2 作物图标

| `cropAsset` | 对应作物 |
| --- | --- |
| `potatoCrop` | 土豆 |
| `bellPepperCrop` | 青椒 |
| `carrotCrop` | 胡萝卜 |
| `napaCabbageCrop` | 大白菜 |
| `broccoliCrop` | 西兰花 |
| `radishCrop` | 白萝卜 |
| `redRadishCrop` | 红萝卜 |
| `pumpkinCrop` | 南瓜 |
| `onionCrop` | 洋葱 |
| `watermelonCrop` | 西瓜 |
| `eggplantCrop` | 茄子 |

### 7.3 背景预览图

| `previewAsset` | 说明 |
| --- | --- |
| `bg1` | 奶盖乌龙 / catCollage |
| `bg2` | 三发猎鱼弓 |
| `bg3` | 斯普拉顿三周年 |

## 8. 推荐验收用例

### 8.1 种子兑换

1. 用户没有任何 `produce`，打开兑换中心，应显示无可用作物空状态。
2. 用户有 `potato` x 1，选择 `bellPepperSeed`，可兑换 1 次，成功后 `potato` 变为 0，`bellPepperSeed` 增加 1。
3. 用户有 `potato` x 2，选择任意 2 级种子，应因库存不足无法兑换。
4. 用户有 `potato` x 3，选择 `watermelonSeed`，可兑换 1 次，成功后 `potato` 变为 0，`watermelonSeed` 增加 1。
5. 用户选择与来源作物相同的种子，例如 `potato` -> `potatoSeed`，目标应置灰且不能提交。
6. 用户有 `bellPepper` x 6，选择 `broccoliSeed`，兑换数量设为 2，成功后 `bellPepper` 变为 0，`broccoliSeed` 增加 2。

### 8.2 背景兑换

1. 用户 `potato` x 6、`carrot` x 5，查看 `catCollage`，按钮不可点击，进度显示 `6/6`、`5/6`。
2. 用户 `potato` x 6、`carrot` x 6，兑换 `catCollage` 成功后，两个作物库存都扣为 0。
3. `catCollage` 兑换成功后，`unlockedBackgrounds` 包含 `catCollage`，`activeBackground` 等于 `catCollage`。
4. 已解锁的 `catCollage` 再次进入背景兑换，应显示“已解锁”且不可再次兑换。
5. `bg2` 和 `bg3` 显示“暂不支持兑换”，不能提交兑换。
6. 背景列表可以左右切换，点击预览图可以查看大图。

## 9. 实现注意事项

- 兑换规则、背景奖励、资源 key 都应以配置为准，不建议在页面里硬编码可兑换关系。
- 客户端可以提前置灰不可兑换项，但服务端仍必须完整校验库存和规则。
- `produce` 可能存在重复项，展示前应按 `cropType` 汇总。
- `seeds` 也可能存在重复项，展示前应按 `seedType` 汇总。
- `quantity` 最小按 1 处理，异常输入不能导致扣负数或库存溢出。
- 背景兑换扣的是当前作物库存 `produce`，不是历史收获记录 `collection`。
- 历史收获记录不会因为兑换而减少，只用于展示累计收获。
- 新配置增加背景或种子时，小程序端应能通过配置自动展示，除非缺少对应图片资源。
