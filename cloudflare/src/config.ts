import { HttpError, isoNow, readBody } from "./common.ts";
import type { AppContext } from "./common.ts";

const DRINK_WATER_CONFIG_KEY = "drink-water";

export async function handleDrinkWaterConfig(ctx: AppContext) {
  const row = await ctx.env.DB
    .prepare(
      `SELECT config_json, updated_at
       FROM app_configs
       WHERE config_key = ?1`
    )
    .bind(DRINK_WATER_CONFIG_KEY)
    .first<{ config_json: string; updated_at: string }>();

  if (!row) {
    throw new HttpError(404, "Drink Water config not found");
  }

  return JSON.parse(row.config_json);
}

export async function handleUpdateDrinkWaterConfig(ctx: AppContext) {
  requireConfigWriteToken(ctx);
  const body = await readBody<unknown>(ctx.request);
  const config = normalizeDrinkWaterConfig(body);
  const now = isoNow();

  await ctx.env.DB
    .prepare(
      `INSERT INTO app_configs (config_key, config_json, updated_at)
       VALUES (?1, ?2, ?3)
       ON CONFLICT(config_key)
       DO UPDATE SET
         config_json = excluded.config_json,
         updated_at = excluded.updated_at`
    )
    .bind(DRINK_WATER_CONFIG_KEY, JSON.stringify(config), now)
    .run();

  return {
    success: true,
    config,
    updatedAt: now
  };
}

function requireConfigWriteToken(ctx: AppContext) {
  const expectedToken = ctx.env.DRINK_WATER_CONFIG_TOKEN?.trim();
  if (!expectedToken) {
    return;
  }

  const authorization = ctx.request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (token !== expectedToken) {
    throw new HttpError(401, "Invalid config token");
  }
}

function normalizeDrinkWaterConfig(value: unknown) {
  if (!isRecord(value)) {
    throw new HttpError(400, "config must be an object");
  }

  const seedExchange = value.seedExchange;
  const backgroundRewards = value.backgroundRewards;
  if (!isRecord(seedExchange)) {
    throw new HttpError(400, "seedExchange must be an object");
  }
  if (!Array.isArray(backgroundRewards)) {
    throw new HttpError(400, "backgroundRewards must be a list");
  }

  const seeds = seedExchange.seeds;
  const exchangeRules = seedExchange.exchangeRules;
  if (!Array.isArray(seeds)) {
    throw new HttpError(400, "seedExchange.seeds must be a list");
  }
  if (!Array.isArray(exchangeRules)) {
    throw new HttpError(400, "seedExchange.exchangeRules must be a list");
  }

  return {
    seedExchange: {
      seeds: seeds.map(normalizeSeed),
      exchangeRules: exchangeRules.map(normalizeExchangeRule)
    },
    backgroundRewards: backgroundRewards.map(normalizeBackgroundReward)
  };
}

function normalizeSeed(value: unknown, index: number) {
  const seed = requireRecord(value, `seed ${index + 1}`);
  return {
    seedType: requireString(seed.seedType, `seed ${index + 1} seedType`),
    cropType: requireString(seed.cropType, `seed ${index + 1} cropType`),
    tier: requireInteger(seed.tier, `seed ${index + 1} tier`),
    label: normalizeLocaleMap(seed.label, `seed ${index + 1} label`),
    seedAsset: requireString(seed.seedAsset, `seed ${index + 1} seedAsset`),
    cropAsset: requireString(seed.cropAsset, `seed ${index + 1} cropAsset`),
    seedAliases: normalizeStringList(seed.seedAliases),
    cropAliases: normalizeStringList(seed.cropAliases)
  };
}

function normalizeExchangeRule(value: unknown, index: number) {
  const rule = requireRecord(value, `exchange rule ${index + 1}`);
  return {
    tierGap: requireInteger(rule.tierGap, `exchange rule ${index + 1} tierGap`),
    sourceCost: requireInteger(rule.sourceCost, `exchange rule ${index + 1} sourceCost`),
    targetSeedCount: requireInteger(rule.targetSeedCount, `exchange rule ${index + 1} targetSeedCount`)
  };
}

function normalizeBackgroundReward(value: unknown, index: number) {
  const reward = requireRecord(value, `background ${index + 1}`);
  return {
    id: requireString(reward.id, `background ${index + 1} id`),
    title: normalizeLocaleMap(reward.title, `background ${index + 1} title`),
    description: normalizeLocaleMap(reward.description, `background ${index + 1} description`),
    previewAsset: requireString(reward.previewAsset, `background ${index + 1} previewAsset`),
    redeemable: Boolean(reward.redeemable),
    requirements: Array.isArray(reward.requirements)
      ? reward.requirements.map((requirement, requirementIndex) =>
          normalizeBackgroundRequirement(requirement, index, requirementIndex)
        )
      : []
  };
}

function normalizeBackgroundRequirement(value: unknown, backgroundIndex: number, index: number) {
  const requirement = requireRecord(value, `background ${backgroundIndex + 1} requirement ${index + 1}`);
  return {
    cropType: requireString(
      requirement.cropType,
      `background ${backgroundIndex + 1} requirement ${index + 1} cropType`
    ),
    count: requireInteger(
      requirement.count,
      `background ${backgroundIndex + 1} requirement ${index + 1} count`
    )
  };
}

function normalizeLocaleMap(value: unknown, label: string) {
  const map = requireRecord(value, label);
  return {
    "zh-CN": String(map["zh-CN"] ?? "").trim(),
    "en-US": String(map["en-US"] ?? "").trim()
  };
}

function normalizeStringList(value: unknown) {
  if (value == null) {
    return [];
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  throw new HttpError(400, "aliases must be a list or comma-separated string");
}

function requireRecord(value: unknown, label: string) {
  if (!isRecord(value)) {
    throw new HttpError(400, `${label} must be an object`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, label: string) {
  const text = String(value ?? "").trim();
  if (!text) {
    throw new HttpError(400, `${label} is required`);
  }
  return text;
}

function requireInteger(value: unknown, label: string) {
  const number = Number(value);
  if (!Number.isInteger(number)) {
    throw new HttpError(400, `${label} must be an integer`);
  }
  return number;
}
