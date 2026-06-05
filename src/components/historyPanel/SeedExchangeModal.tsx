import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react";
import { useI18n } from "../../i18n";
import type { BackgroundReward } from "../../config/backgroundRewards";
import { PixelIcon } from "./PixelIcon";
import { CROP_DEFINITIONS, getCropDefinitionByCrop, getCropDefinitionBySeed } from "./historyPanelData";

type SourceEntry = {
  cropType: string;
  count: number;
  definition: {
    cropLabel: string;
    cropIcon: string;
  };
  options: Array<{
    sourceCropType: string;
    targetSeedType: string;
    cost: number;
    targetSeedCount: number;
  }>;
};

type RewardState = BackgroundReward & {
  unlocked: boolean;
  ready: boolean;
  requirementProgress: Array<{
    cropType: string;
    count: number;
    current: number;
  }>;
};

type SeedExchangeModalProps = {
  open: boolean;
  availableExchangeSources: SourceEntry[];
  selectedSourceEntry: SourceEntry | null;
  selectedTargetSeedType: string;
  selectedTargetOption:
    | {
        sourceCropType: string;
        targetSeedType: string;
        cost: number;
        targetSeedCount: number;
      }
    | null;
  exchangeQuantity: number;
  maxExchangeQuantity: number;
  canConfirmExchange: boolean;
  backgroundRewards: RewardState[];
  onClose: () => void;
  onSelectSource: (cropType: string) => void;
  onSelectTarget: (seedType: string) => void;
  onQuantityChange: (quantity: number) => void;
  onRedeemBackgroundReward: (rewardId: string) => void;
  onConfirmExchange: () => void;
};

type ExchangeView = "seed" | "background";

export function SeedExchangeModal({
  open,
  availableExchangeSources,
  selectedSourceEntry,
  selectedTargetSeedType,
  selectedTargetOption,
  exchangeQuantity,
  maxExchangeQuantity,
  canConfirmExchange,
  backgroundRewards,
  onClose,
  onSelectSource,
  onSelectTarget,
  onQuantityChange,
  onRedeemBackgroundReward,
  onConfirmExchange
}: SeedExchangeModalProps) {
  const { locale } = useI18n();
  const [view, setView] = useState<ExchangeView>("seed");
  const [previewImage, setPreviewImage] = useState<RewardState | null>(null);
  const [activeBackgroundIndex, setActiveBackgroundIndex] = useState(0);

  const isZh = locale === "zh-CN";
  const targetOptions = selectedSourceEntry?.options ?? [];
  const clampedQuantity = Math.min(Math.max(1, exchangeQuantity), maxExchangeQuantity);
  const activeBackground = backgroundRewards[activeBackgroundIndex] ?? backgroundRewards[0] ?? null;

  useEffect(() => {
    if (activeBackgroundIndex > Math.max(0, backgroundRewards.length - 1)) {
      setActiveBackgroundIndex(Math.max(0, backgroundRewards.length - 1));
    }
  }, [activeBackgroundIndex, backgroundRewards.length]);

  const showPreviousBackground = () => {
    setActiveBackgroundIndex((current) =>
      backgroundRewards.length > 0 ? (current - 1 + backgroundRewards.length) % backgroundRewards.length : 0
    );
  };

  const showNextBackground = () => {
    setActiveBackgroundIndex((current) =>
      backgroundRewards.length > 0 ? (current + 1) % backgroundRewards.length : 0
    );
  };

  const footerHint = useMemo(() => {
    if (selectedSourceEntry && selectedTargetOption) {
      return null;
    }

    return isZh ? "请先选择上面的作物和下面的种子。" : "Select a produce source and a seed target first.";
  }, [
    isZh,
    selectedSourceEntry,
    selectedTargetOption
  ]);

  if (!open) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/72 p-4 backdrop-blur-sm">
        <div className="flex max-h-[min(88vh,820px)] w-full max-w-2xl flex-col overflow-hidden rounded-[26px] border border-white/10 bg-[rgba(7,13,24,0.96)] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="m-0 text-xl font-semibold text-slate-50">
                {isZh ? "兑换中心" : "Exchange hub"}
              </h3>
              <p className="mt-1 text-sm text-slate-300/78">
                {isZh
                  ? "这里同时包含种子兑换和背景兑换。背景的标题、描述和资源需求都由配置驱动。"
                  : "This modal contains both seed exchanges and background rewards. Background titles, descriptions, and costs are config-driven."}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={isZh ? "关闭" : "Close"}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
            >
              <X className="h-4 w-4" strokeWidth={2.1} />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setView("seed")}
              className={`rounded-[16px] px-4 py-3 text-sm font-semibold transition ${
                view === "seed"
                  ? "bg-sky-300 text-slate-950"
                  : "bg-white/6 text-slate-200 hover:bg-white/10"
              }`}
            >
              {isZh ? "种子兑换" : "Seed exchange"}
            </button>
            <button
              type="button"
              onClick={() => setView("background")}
              className={`rounded-[16px] px-4 py-3 text-sm font-semibold transition ${
                view === "background"
                  ? "bg-sky-300 text-slate-950"
                  : "bg-white/6 text-slate-200 hover:bg-white/10"
              }`}
            >
              {isZh ? "背景兑换" : "Background rewards"}
            </button>
          </div>

          <div className="mt-3 flex-1 overflow-y-auto pr-1">
            {view === "seed" ? (
              <div className="flex flex-col gap-2.5">
                <div className="rounded-[18px] bg-white/5 p-2.5">
                  <div className="mb-3">
                    <strong className="text-sm font-semibold text-slate-50">
                      {isZh ? "可用作物" : "Available produce"}
                    </strong>
                    <p className="mt-1 text-xs text-slate-400">
                      {isZh
                        ? "这里显示当前背包里确实拥有的果实库存。"
                        : "Only produce that you currently own appears here."}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {availableExchangeSources.map((entry) => {
                      const selected = entry.cropType === selectedSourceEntry?.cropType;
                      return (
                        <button
                          key={entry.cropType}
                          type="button"
                          title={entry.definition.cropLabel}
                          aria-label={`${entry.definition.cropLabel} x ${entry.count}`}
                          onClick={() => onSelectSource(entry.cropType)}
                          className={`flex min-h-[56px] items-center justify-between rounded-full border px-3 py-2 text-left transition ${
                            selected
                              ? "border-emerald-200/60 bg-emerald-300/15 text-emerald-50"
                              : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/8"
                          }`}
                        >
                          <PixelIcon src={entry.definition.cropIcon} size={30} />
                          <span className="text-sm tabular-nums">{`x ${entry.count}`}</span>
                        </button>
                      );
                    })}
                    {availableExchangeSources.length === 0 ? (
                      <div className="col-span-3 rounded-[14px] border border-dashed border-white/10 bg-white/4 px-3 py-4 text-sm text-slate-400">
                        {isZh
                          ? "暂时还没有可用于种子兑换的作物。"
                          : "You do not have produce available for seed exchanges yet."}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-[18px] bg-white/5 p-2.5">
                  <div className="mb-3">
                    <strong className="text-sm font-semibold text-slate-50">
                      {isZh ? "全部种子" : "All seeds"}
                    </strong>
                    <p className="mt-1 text-xs text-slate-400">
                      {isZh
                        ? "共 10 种。当前作物无法兑换的目标会置灰。"
                        : "10 total. Targets unavailable for the selected produce are disabled."}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {CROP_DEFINITIONS.map((definition) => {
                      const option =
                        targetOptions.find((item) => item.targetSeedType === definition.seedType) ?? null;
                      const selected = Boolean(option && option.targetSeedType === selectedTargetSeedType);
                      const disabled = !option;
                      return (
                        <button
                          key={definition.seedType}
                          type="button"
                          title={definition.seedLabel}
                          aria-label={
                            option
                              ? `${definition.seedLabel} cost ${option.cost}`
                              : isZh
                                ? `${definition.seedLabel} 当前不可兑换`
                                : `${definition.seedLabel} unavailable`
                          }
                          disabled={disabled}
                          onClick={() => {
                            if (option) {
                              onSelectTarget(option.targetSeedType);
                            }
                          }}
                          className={`rounded-full border px-3 py-2 text-left transition ${
                            selected
                              ? "border-amber-200/70 bg-amber-200/12 text-amber-50"
                              : disabled
                                ? "cursor-not-allowed border-white/6 bg-white/[0.03] text-slate-500 opacity-55"
                                : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/8"
                          }`}
                        >
                          <span className="flex min-h-[40px] items-center justify-between gap-2">
                            <PixelIcon src={definition.seedIcon} size={30} />
                            <span
                              className={`text-xs tabular-nums ${
                                disabled ? "text-slate-500" : "text-slate-300/78"
                              }`}
                            >
                              {option ? `x${option.targetSeedCount} / ${option.cost}` : "--"}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                    {targetOptions.length === 0 ? (
                      <div className="col-span-3 rounded-[14px] border border-dashed border-white/10 bg-white/4 px-3 py-4 text-sm text-slate-400">
                        {isZh
                          ? "这个作物暂时没有可兑换的目标种子。"
                          : "This produce does not have exchangeable seed targets right now."}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : activeBackground ? (
              <div className="flex flex-col gap-3">
                <div className="relative overflow-hidden rounded-[20px] border border-white/10 bg-black/20 p-2">
                  <button
                    type="button"
                    onClick={showPreviousBackground}
                    aria-label={isZh ? "上一张背景" : "Previous background"}
                    className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-slate-950/62 text-slate-50 shadow-[0_10px_28px_rgba(0,0,0,0.35)] backdrop-blur-md transition hover:bg-slate-900/82"
                  >
                    <ChevronLeft className="h-5 w-5" strokeWidth={2.3} />
                  </button>
                  <button
                    type="button"
                    onClick={showNextBackground}
                    aria-label={isZh ? "下一张背景" : "Next background"}
                    className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-slate-950/62 text-slate-50 shadow-[0_10px_28px_rgba(0,0,0,0.35)] backdrop-blur-md transition hover:bg-slate-900/82"
                  >
                    <ChevronRight className="h-5 w-5" strokeWidth={2.3} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewImage(activeBackground)}
                    className="block w-full overflow-hidden rounded-[16px] bg-slate-900/70"
                  >
                    <img
                      src={activeBackground.preview}
                      alt={activeBackground.title[locale] ?? activeBackground.title["en-US"]}
                      className="mx-auto h-[min(48vh,470px)] w-full object-contain"
                    />
                  </button>
                </div>

                <section className="rounded-[18px] bg-white/5 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <strong className="text-base font-semibold text-slate-50">
                        {activeBackground.title[locale] ?? activeBackground.title["en-US"]}
                      </strong>
                      <p className="mt-1 text-xs leading-5 text-slate-300/80">
                        {activeBackground.description[locale] ?? activeBackground.description["en-US"]}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {backgroundRewards.map((reward, index) => (
                        <button
                          key={reward.id}
                          type="button"
                          onClick={() => setActiveBackgroundIndex(index)}
                          aria-label={
                            isZh ? `查看第 ${index + 1} 张背景` : `View background ${index + 1}`
                          }
                          className={`h-2 rounded-full transition ${
                            index === activeBackgroundIndex
                              ? "w-6 bg-sky-300"
                              : "w-2 bg-white/20 hover:bg-white/35"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {activeBackground.redeemable ? (
                    <>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {activeBackground.requirementProgress.map((requirement) => {
                          const definition = getCropDefinitionByCrop(requirement.cropType);
                          return (
                            <span
                              key={`${activeBackground.id}-${requirement.cropType}`}
                              className="inline-flex items-center gap-2 rounded-full bg-white/7 px-3 py-2 text-sm text-slate-100"
                            >
                              <PixelIcon src={definition.cropIcon} size={26} />
                              <span className="tabular-nums text-slate-300/85">
                                {requirement.current} / {requirement.count}
                              </span>
                            </span>
                          );
                        })}
                      </div>
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => onRedeemBackgroundReward(activeBackground.id)}
                          disabled={!activeBackground.ready || activeBackground.unlocked}
                          className={`rounded-[14px] px-4 py-2 text-sm font-semibold transition ${
                            activeBackground.unlocked
                              ? "cursor-default bg-emerald-200/18 text-emerald-100"
                              : activeBackground.ready
                                ? "bg-sky-300 text-slate-950 hover:-translate-y-px hover:bg-sky-200"
                                : "cursor-not-allowed bg-white/10 text-slate-400"
                          }`}
                        >
                          {activeBackground.unlocked
                            ? isZh
                              ? "已解锁"
                              : "Unlocked"
                            : isZh
                              ? "兑换背景"
                              : "Redeem background"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="mt-3 flex justify-end">
                      <span className="inline-flex rounded-[14px] bg-white/10 px-3 py-2 text-sm font-semibold text-slate-400">
                        {isZh ? "暂不支持兑换" : "Not supported yet"}
                      </span>
                    </div>
                  )}
                </section>
              </div>
            ) : (
              <div className="rounded-[18px] border border-dashed border-white/10 bg-white/4 px-3 py-8 text-center text-sm text-slate-400">
                {isZh ? "暂时没有背景配置。" : "No background rewards configured."}
              </div>
            )}
          </div>

          {view === "seed" ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[16px] bg-white/5 px-3 py-2.5">
            <div className="text-sm text-slate-300/82">
              {selectedSourceEntry && selectedTargetOption && view === "seed" ? (
                <span className="inline-flex items-center gap-2">
                  <PixelIcon src={selectedSourceEntry.definition.cropIcon} size={24} />
                  <span className="tabular-nums">x {selectedTargetOption.cost * clampedQuantity}</span>
                  <span>→</span>
                  <PixelIcon
                    src={getCropDefinitionBySeed(selectedTargetOption.targetSeedType).seedIcon}
                    size={24}
                  />
                  <span className="tabular-nums">
                    x {selectedTargetOption.targetSeedCount * clampedQuantity}
                  </span>
                </span>
              ) : (
                <span>{footerHint}</span>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {view === "seed" && selectedSourceEntry && selectedTargetOption ? (
                <div className="flex h-9 items-center rounded-[14px] border border-white/10 bg-white/5">
                  <button
                    type="button"
                    onClick={() => onQuantityChange(Math.max(1, clampedQuantity - 1))}
                    disabled={clampedQuantity <= 1}
                    aria-label={isZh ? "减少兑换数量" : "Decrease exchange quantity"}
                    className="flex h-9 w-9 items-center justify-center rounded-l-[14px] text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:text-slate-500"
                  >
                    <Minus className="h-4 w-4" strokeWidth={2.2} />
                  </button>
                  <span className="min-w-9 px-2 text-center text-sm tabular-nums text-slate-50">
                    {clampedQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => onQuantityChange(Math.min(maxExchangeQuantity, clampedQuantity + 1))}
                    disabled={clampedQuantity >= maxExchangeQuantity}
                    aria-label={isZh ? "增加兑换数量" : "Increase exchange quantity"}
                    className="flex h-9 w-9 items-center justify-center rounded-r-[14px] text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:text-slate-500"
                  >
                    <Plus className="h-4 w-4" strokeWidth={2.2} />
                  </button>
                </div>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                className="rounded-[14px] border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
              >
                {isZh ? "返回" : "Back"}
              </button>
              {view === "seed" ? (
                <button
                  type="button"
                  onClick={onConfirmExchange}
                  disabled={!canConfirmExchange}
                  className={`rounded-[14px] px-4 py-2 text-sm font-semibold transition ${
                    canConfirmExchange
                      ? "bg-amber-200 text-slate-950 hover:-translate-y-px hover:bg-amber-100"
                      : "cursor-not-allowed bg-white/10 text-slate-400"
                  }`}
                >
                  {isZh ? "立即兑换" : "Exchange"}
                </button>
              ) : null}
            </div>
          </div>
          ) : null}
        </div>
      </div>

      {previewImage ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/88 p-4 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="w-full max-w-[520px] rounded-[24px] border border-white/10 bg-[rgba(7,13,24,0.96)] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <strong className="text-base font-semibold text-slate-50">
                {previewImage.title[locale] ?? previewImage.title["en-US"]}
              </strong>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                aria-label={isZh ? "关闭" : "Close"}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
              >
                <X className="h-4 w-4" strokeWidth={2.1} />
              </button>
            </div>
            <div className="aspect-[520/935] overflow-hidden rounded-[18px] bg-slate-900/70">
              <img
                src={previewImage.preview}
                alt={previewImage.title[locale] ?? previewImage.title["en-US"]}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
