import bg1 from "../assets/bg/1.jpg";
import bg2 from "../assets/bg/2.jpg";
import bg3 from "../assets/bg/3.jpg";
import backgroundRewardsJson from "./backgroundRewards.json";
import type { Locale } from "../types";

export type BackgroundRewardRequirement = {
  cropType: string;
  count: number;
};

export type BackgroundRewardConfig = {
  id: string;
  title: Record<Locale, string>;
  description: Record<Locale, string>;
  previewAsset: string;
  redeemable: boolean;
  requirements: BackgroundRewardRequirement[];
};

export type BackgroundReward = BackgroundRewardConfig & {
  preview: string;
};

const previewAssetMap: Record<string, string> = {
  bg1,
  bg2,
  bg3
};

export const BACKGROUND_REWARDS: BackgroundReward[] =
  (backgroundRewardsJson as BackgroundRewardConfig[]).map((reward) => ({
    ...reward,
    preview: previewAssetMap[reward.previewAsset] ?? bg1
  }));

export function getBackgroundRewardById(rewardId: string) {
  return BACKGROUND_REWARDS.find((reward) => reward.id === rewardId) ?? null;
}
