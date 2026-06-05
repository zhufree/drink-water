import potatoCropIcon from "../assets/garden/potato-crop.png";
import potatoSeedIcon from "../assets/garden/potato-seed.png";
import bellPepperCropIcon from "../assets/garden/bell-pepper-crop.png";
import bellPepperSeedIcon from "../assets/garden/bell-pepper-seed.png";
import broccoliCropIcon from "../assets/garden/broccoli-crop.png";
import broccoliSeedIcon from "../assets/garden/broccoli-seed.png";
import carrotCropIcon from "../assets/garden/carrot-crop.png";
import carrotSeedIcon from "../assets/garden/carrot-seed.png";
import radishCropIcon from "../assets/garden/radish-crop.png";
import radishSeedIcon from "../assets/garden/radish-seed.png";
import pumpkinCropIcon from "../assets/garden/pumpkin-crop.png";
import pumpkinSeedIcon from "../assets/garden/pumpkin-seed.png";
import napaCabbageCropIcon from "../assets/garden/napa-cabbage-crop.png";
import napaCabbageSeedIcon from "../assets/garden/napa-cabbage-seed.png";
import onionCropIcon from "../assets/garden/onion-crop.png";
import onionSeedIcon from "../assets/garden/onion-seed.png";
import eggplantCropIcon from "../assets/garden/eggplant-crop.png";
import eggplantSeedIcon from "../assets/garden/eggplant-seed.png";
import peaCropIcon from "../assets/garden/pea-crop.png";
import peaSeedIcon from "../assets/garden/pea-seed.png";
import seedExchangeJson from "./seedExchange.json";
import type { Locale } from "../types";

export type SeedExchangeSeedConfig = {
  seedType: string;
  cropType: string;
  tier: number;
  label: Record<Locale, string>;
  seedAsset: string;
  cropAsset: string;
  seedAliases: string[];
  cropAliases: string[];
};

export type SeedExchangeRuleConfig = {
  tierGap: number;
  sourceCost: number;
  targetSeedCount: number;
};

export type SeedExchangeConfig = {
  seeds: SeedExchangeSeedConfig[];
  exchangeRules: SeedExchangeRuleConfig[];
};

export type CropDefinition = {
  cropType: string;
  seedType: string;
  tier: number;
  cropLabel: string;
  seedLabel: string;
  cropIcon: string;
  seedIcon: string;
};

export type ExchangeOption = {
  sourceCropType: string;
  targetSeedType: string;
  cost: number;
  targetSeedCount: number;
};

const seedAssetMap: Record<string, string> = {
  potatoSeed: potatoSeedIcon,
  bellPepperSeed: bellPepperSeedIcon,
  broccoliSeed: broccoliSeedIcon,
  carrotSeed: carrotSeedIcon,
  radishSeed: radishSeedIcon,
  pumpkinSeed: pumpkinSeedIcon,
  napaCabbageSeed: napaCabbageSeedIcon,
  onionSeed: onionSeedIcon,
  eggplantSeed: eggplantSeedIcon,
  peaSeed: peaSeedIcon
};

const cropAssetMap: Record<string, string> = {
  potatoCrop: potatoCropIcon,
  bellPepperCrop: bellPepperCropIcon,
  broccoliCrop: broccoliCropIcon,
  carrotCrop: carrotCropIcon,
  radishCrop: radishCropIcon,
  pumpkinCrop: pumpkinCropIcon,
  napaCabbageCrop: napaCabbageCropIcon,
  onionCrop: onionCropIcon,
  eggplantCrop: eggplantCropIcon,
  peaCrop: peaCropIcon
};

export const SEED_EXCHANGE_CONFIG = seedExchangeJson as SeedExchangeConfig;

export const CROP_DEFINITIONS: CropDefinition[] = SEED_EXCHANGE_CONFIG.seeds.map((seed) => ({
  cropType: seed.cropType,
  seedType: seed.seedType,
  tier: seed.tier,
  cropLabel: seed.label["zh-CN"],
  seedLabel: seed.label["zh-CN"],
  cropIcon: cropAssetMap[seed.cropAsset] ?? potatoCropIcon,
  seedIcon: seedAssetMap[seed.seedAsset] ?? potatoSeedIcon
}));

export const EXCHANGE_OPTIONS: ExchangeOption[] = CROP_DEFINITIONS.flatMap((source) =>
  CROP_DEFINITIONS.flatMap((target) => {
    if (target.seedType === source.seedType) {
      return [];
    }

    const rule = SEED_EXCHANGE_CONFIG.exchangeRules.find(
      (item) => item.tierGap === target.tier - source.tier
    );
    if (!rule) {
      return [];
    }

    return [
      {
        sourceCropType: source.cropType,
        targetSeedType: target.seedType,
        cost: rule.sourceCost,
        targetSeedCount: rule.targetSeedCount
      }
    ];
  })
);

