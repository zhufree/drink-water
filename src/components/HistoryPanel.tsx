import { useEffect, useMemo, useState } from "react";
import type { GardenState, HistoryItem, RestState } from "../types";
import { useI18n } from "../i18n";
import { GardenCollectionCard } from "./historyPanel/GardenCollectionCard";
import { GardenInventoryCard } from "./historyPanel/GardenInventoryCard";
import { HistoryHeatmapCard } from "./historyPanel/HistoryHeatmapCard";
import { RecentHistoryCard } from "./historyPanel/RecentHistoryCard";
import { RestBoostCard } from "./historyPanel/RestBoostCard";
import { SeedExchangeModal } from "./historyPanel/SeedExchangeModal";
import {
  ADVANCED_CROP_TYPE,
  ADVANCED_SEED_TYPE,
  BASIC_CROP_TYPE,
  BASIC_SEED_TYPE,
  EXCHANGE_OPTIONS,
  RADISH_CROP_TYPE,
  buildHistoryGrid,
  getCropDefinitionByCrop,
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
  onExchangeProduce: (sourceCropType: string, targetSeedType: string) => void;
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
  onExchangeProduce,
  onRedeemBackgroundReward,
  onStartRest
}: HistoryPanelProps) {
  const { t } = useI18n();
  const gridCells = buildHistoryGrid(history, 28);
  const activeCrops = gardenState.crops.filter((crop) => !crop.harvestedAt);
  const cropsByDay = new Map(activeCrops.map((crop) => [crop.dayKey, crop]));
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
  const produceEntries = useMemo(
    () => Array.from(produceCountByType.entries()),
    [produceCountByType]
  );
  const selectableSeeds = useMemo(
    () => seedEntries.filter(([, count]) => count > 0),
    [seedEntries]
  );
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
  const [selectedSourceCropType, setSelectedSourceCropType] =
    useState<string>(BASIC_CROP_TYPE);
  const [selectedTargetSeedType, setSelectedTargetSeedType] =
    useState<string>(ADVANCED_SEED_TYPE);

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
  const selectedSeedCount = seedCountByType.get(selectedSeedType) ?? 0;
  const totalSeedCount = seedEntries.reduce((total, [, count]) => total + count, 0);
  const totalProduceCount = produceEntries.reduce((total, [, count]) => total + count, 0);
  const potatoCount = produceCountByType.get(BASIC_CROP_TYPE) ?? 0;
  const radishCount = produceCountByType.get(RADISH_CROP_TYPE) ?? 0;
  const backgroundUnlocked = gardenState.unlockedBackgrounds.includes("catCollage");
  const backgroundReady = potatoCount >= 6 && radishCount >= 6;
  const canConfirmExchange = Boolean(
    selectedSourceEntry &&
      selectedTargetOption &&
      selectedSourceEntry.count >= selectedTargetOption.cost
  );
  const upcomingBoostHours = getUpcomingBoostHours(restState, restCooldownRemainingSeconds);
  const harvestCount = gardenState.collection.reduce(
    (total, item) => total + item.harvestCount,
    0
  );
  const plantableCount = gridCells.filter(
    (cell) => cell.actualIntakeMl > 0 && !cropsByDay.has(cell.dayKey)
  ).length;
  const recentItems = [...history]
    .sort((left, right) => right.dayKey.localeCompare(left.dayKey))
    .slice(0, 7);

  return (
    <section className="flex flex-col gap-3">
      <div className="panel-surface panel-surface-flat rounded-[22px] p-4">
        <h2 className="m-0 text-lg font-semibold text-slate-50">{t("history.title")}</h2>
        <p className="mt-1 text-sm text-slate-300/78">{t("history.description")}</p>
      </div>

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
      <RecentHistoryCard recentItems={recentItems} />

      <SeedExchangeModal
        open={exchangeOpen}
        availableExchangeSources={availableExchangeSources}
        selectedSourceEntry={selectedSourceEntry}
        selectedTargetSeedType={selectedTargetSeedType}
        selectedTargetOption={selectedTargetOption}
        canConfirmExchange={canConfirmExchange}
        backgroundUnlocked={backgroundUnlocked}
        backgroundReady={backgroundReady}
        rewardPotatoCount={potatoCount}
        rewardRadishCount={radishCount}
        onClose={() => setExchangeOpen(false)}
        onSelectSource={setSelectedSourceCropType}
        onSelectTarget={setSelectedTargetSeedType}
        onRedeemBackgroundReward={() => onRedeemBackgroundReward("catCollage")}
        onConfirmExchange={() => {
          if (!selectedTargetOption) {
            return;
          }
          onExchangeProduce(
            selectedSourceEntry?.cropType ?? ADVANCED_CROP_TYPE,
            selectedTargetOption.targetSeedType
          );
          setExchangeOpen(false);
        }}
      />
    </section>
  );
}
