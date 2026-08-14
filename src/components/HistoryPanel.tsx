import { useEffect, useMemo, useState } from "react";
import type { GardenState, HistoryItem, RestState } from "../types";
import { useI18n } from "../i18n";
import { HoldToConfirmButton } from "./HoldToConfirmButton";
import { GardenCollectionCard } from "./historyPanel/GardenCollectionCard";
import { GardenInventoryCard } from "./historyPanel/GardenInventoryCard";
import { HistoryHeatmapCard } from "./historyPanel/HistoryHeatmapCard";
import { RecentHistoryCard } from "./historyPanel/RecentHistoryCard";
import { RestBoostCard } from "./historyPanel/RestBoostCard";
import { SeedExchangeModal } from "./historyPanel/SeedExchangeModal";
import { BACKGROUND_REWARDS } from "../config/backgroundRewards";
import {
  ADVANCED_CROP_TYPE,
  ADVANCED_SEED_TYPE,
  BASIC_CROP_TYPE,
  BASIC_SEED_TYPE,
  EXCHANGE_OPTIONS,
  buildHistoryGrid,
  getCropDefinitionByCrop,
  getCropGrowth,
  getUpcomingBoostHours,
  sumInventoryByKey
} from "./historyPanel/historyPanelData";

type HistoryPanelProps = {
  history: HistoryItem[];
  gardenState: GardenState;
  restState: RestState;
  restCooldownRemainingSeconds: number;
  onPlantSeed: (dayKey: string, seedType: string) => void;
  onHarvestCrop: (dayKey: string) => void;
  onHarvestAllCrops: () => void;
  onExchangeProduce: (sourceCropType: string, targetSeedType: string, quantity: number) => void;
  onRedeemBackgroundReward: (rewardId: string) => void;
  onStartRest: () => void;
};

export function HistoryPanel({
  history,
  gardenState,
  restState,
  restCooldownRemainingSeconds,
  onPlantSeed,
  onHarvestCrop,
  onHarvestAllCrops,
  onExchangeProduce,
  onRedeemBackgroundReward,
  onStartRest
}: HistoryPanelProps) {
  const { t } = useI18n();
  const gridCells = buildHistoryGrid(history, 28);
  const maturityGridCells = buildHistoryGrid(history, 56);
  const activeCrops = gardenState.crops.filter((crop) => !crop.harvestedAt);
  const cropsByDay = new Map(activeCrops.map((crop) => [crop.dayKey, crop]));
  const matureCropCount = activeCrops.reduce((count, crop) => {
    const cell = maturityGridCells.find((item) => item.dayKey === crop.dayKey);
    return cell && getCropGrowth(cell, crop).mature ? count + 1 : count;
  }, 0);
  const seedCountByType = useMemo(
    () =>
      sumInventoryByKey(gardenState.seeds.map((seed) => ({ key: seed.seedType, count: seed.count }))),
    [gardenState.seeds]
  );
  const produceCountByType = useMemo(
    () =>
      sumInventoryByKey(
        gardenState.produce.map((produce) => ({ key: produce.cropType, count: produce.count }))
      ),
    [gardenState.produce]
  );

  const seedEntries = useMemo(() => Array.from(seedCountByType.entries()), [seedCountByType]);
  const produceEntries = useMemo(() => Array.from(produceCountByType.entries()), [produceCountByType]);
  const selectableSeeds = useMemo(() => seedEntries.filter(([, count]) => count > 0), [seedEntries]);
  const availableExchangeSources = useMemo(
    () =>
      produceEntries
        .filter(([, count]) => count > 0)
        .map(([cropType, count]) => ({
          cropType,
          count,
          definition: getCropDefinitionByCrop(cropType),
          options: EXCHANGE_OPTIONS.filter((option) => option.sourceCropType === cropType)
        }))
        .filter((entry) => entry.options.length > 0),
    [produceEntries]
  );

  const [selectedSeedType, setSelectedSeedType] = useState<string>(BASIC_SEED_TYPE);
  const [exchangeOpen, setExchangeOpen] = useState(false);
  const [selectedSourceCropType, setSelectedSourceCropType] = useState<string>(BASIC_CROP_TYPE);
  const [selectedTargetSeedType, setSelectedTargetSeedType] = useState<string>(ADVANCED_SEED_TYPE);
  const [exchangeQuantity, setExchangeQuantity] = useState(1);

  useEffect(() => {
    if (selectableSeeds.length === 0) {
      return;
    }
    if (!selectableSeeds.some(([seedType]) => seedType === selectedSeedType)) {
      setSelectedSeedType(selectableSeeds[0][0]);
    }
  }, [selectableSeeds, selectedSeedType]);

  useEffect(() => {
    if (!availableExchangeSources.some((entry) => entry.cropType === selectedSourceCropType)) {
      if (availableExchangeSources.length > 0) {
        setSelectedSourceCropType(availableExchangeSources[0].cropType);
      }
    }
  }, [availableExchangeSources, selectedSourceCropType]);

  const selectedSourceEntry =
    availableExchangeSources.find((entry) => entry.cropType === selectedSourceCropType) ?? null;
  const targetOptions = selectedSourceEntry?.options ?? [];

  useEffect(() => {
    if (targetOptions.length === 0) {
      return;
    }
    if (!targetOptions.some((option) => option.targetSeedType === selectedTargetSeedType)) {
      setSelectedTargetSeedType(targetOptions[0].targetSeedType);
    }
  }, [targetOptions, selectedTargetSeedType]);

  const selectedTargetOption =
    targetOptions.find((option) => option.targetSeedType === selectedTargetSeedType) ?? null;
  const maxExchangeQuantity =
    selectedSourceEntry && selectedTargetOption
      ? Math.max(1, Math.floor(selectedSourceEntry.count / selectedTargetOption.cost))
      : 1;
  const selectedSeedCount = seedCountByType.get(selectedSeedType) ?? 0;
  const totalSeedCount = seedEntries.reduce((total, [, count]) => total + count, 0);
  const totalProduceCount = produceEntries.reduce((total, [, count]) => total + count, 0);
  const backgroundRewards = useMemo(
    () =>
      BACKGROUND_REWARDS.map((reward) => {
        const unlocked = gardenState.unlockedBackgrounds.includes(reward.id);
        const requirementProgress = reward.requirements.map((requirement) => ({
          ...requirement,
          current: produceCountByType.get(requirement.cropType) ?? 0
        }));
        const ready = reward.redeemable && requirementProgress.every((item) => item.current >= item.count);
        return {
          ...reward,
          unlocked,
          ready,
          requirementProgress
        };
      }),
    [gardenState.unlockedBackgrounds, produceCountByType]
  );
  const canConfirmExchange = Boolean(
    selectedSourceEntry &&
      selectedTargetOption &&
      exchangeQuantity >= 1 &&
      selectedSourceEntry.count >= selectedTargetOption.cost * exchangeQuantity
  );

  useEffect(() => {
    setExchangeQuantity((current) => Math.min(Math.max(1, current), maxExchangeQuantity));
  }, [maxExchangeQuantity, selectedSourceCropType, selectedTargetSeedType]);
  const upcomingBoostHours = getUpcomingBoostHours(restState, restCooldownRemainingSeconds);
  const harvestCount = gardenState.collection.reduce((total, item) => total + item.harvestCount, 0);
  const plantableCount = gridCells.filter((cell) => cell.actualIntakeMl > 0 && !cropsByDay.has(cell.dayKey)).length;

  return (
    <section className="flex flex-col gap-3">
      <HistoryHeatmapCard
        gridCells={gridCells}
        history={history}
        cropsByDay={cropsByDay}
        selectableSeeds={selectableSeeds}
        selectedSeedType={selectedSeedType}
        selectedSeedCount={selectedSeedCount}
        harvestCount={harvestCount}
        plantableCount={plantableCount}
        onSelectSeed={setSelectedSeedType}
        onPlantSeed={onPlantSeed}
        onHarvestCrop={onHarvestCrop}
      />

      <HoldToConfirmButton
        onComplete={onHarvestAllCrops}
        disabled={matureCropCount === 0}
        ariaLabel={t("garden.harvestAll")}
        progressClassName="bg-gradient-to-r from-amber-500/75 via-orange-400/60 to-amber-200/32"
        className="relative w-full touch-none overflow-hidden rounded-[18px] border border-amber-200/20 bg-amber-300/12 px-4 py-3 text-left text-amber-50 transition hover:bg-amber-300/18 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span className="block text-sm font-semibold">{t("garden.harvestAll")}</span>
        <span className="mt-1 block text-[11px] text-amber-100/70">
          {t("garden.holdToHarvestAll")} · {matureCropCount}
        </span>
      </HoldToConfirmButton>

      <RestBoostCard
        restState={restState}
        restCooldownRemainingSeconds={restCooldownRemainingSeconds}
        upcomingBoostHours={upcomingBoostHours}
        onStartRest={onStartRest}
      />

      <GardenInventoryCard
        seedEntries={seedEntries}
        produceEntries={produceEntries}
        totalSeedCount={totalSeedCount}
        totalProduceCount={totalProduceCount}
        onOpenExchange={() => setExchangeOpen(true)}
      />

      <GardenCollectionCard collection={gardenState.collection} />
      <RecentHistoryCard history={history} />

      <SeedExchangeModal
        open={exchangeOpen}
        availableExchangeSources={availableExchangeSources}
        selectedSourceEntry={selectedSourceEntry}
        selectedTargetSeedType={selectedTargetSeedType}
        selectedTargetOption={selectedTargetOption}
        exchangeQuantity={exchangeQuantity}
        maxExchangeQuantity={maxExchangeQuantity}
        canConfirmExchange={canConfirmExchange}
        backgroundRewards={backgroundRewards}
        onClose={() => setExchangeOpen(false)}
        onSelectSource={setSelectedSourceCropType}
        onSelectTarget={setSelectedTargetSeedType}
        onQuantityChange={setExchangeQuantity}
        onRedeemBackgroundReward={onRedeemBackgroundReward}
        onConfirmExchange={() => {
          if (!selectedTargetOption) {
            return;
          }
          onExchangeProduce(
            selectedSourceEntry?.cropType ?? ADVANCED_CROP_TYPE,
            selectedTargetOption.targetSeedType,
            exchangeQuantity
          );
          setExchangeOpen(false);
        }}
      />
    </section>
  );
}
