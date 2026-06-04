import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useI18n } from "../../i18n";
import type { BackgroundReward } from "../../config/backgroundRewards";
import { PixelIcon } from "./PixelIcon";
import { getCropDefinitionByCrop, getCropDefinitionBySeed } from "./historyPanelData";

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
      }
    | null;
  canConfirmExchange: boolean;
  backgroundRewards: RewardState[];
  onClose: () => void;
  onSelectSource: (cropType: string) => void;
  onSelectTarget: (seedType: string) => void;
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
  canConfirmExchange,
  backgroundRewards,
  onClose,
  onSelectSource,
  onSelectTarget,
  onRedeemBackgroundReward,
  onConfirmExchange
}: SeedExchangeModalProps) {
  const { locale } = useI18n();
  const [view, setView] = useState<ExchangeView>("seed");
  const [previewImage, setPreviewImage] = useState<RewardState | null>(null);

  const isZh = locale === "zh-CN";
  const targetOptions = selectedSourceEntry?.options ?? [];

  const footerHint = useMemo(() => {
    if (view === "background") {
      return isZh
        ? "点击图片可以放大预览，是否可兑换和所需资源都来自当前背景配置。"
        : "Click an image to preview it larger. Availability and costs come from the background config.";
    }

    if (selectedSourceEntry && selectedTargetOption) {
      return null;
    }

    return isZh ? "请先选择上面的作物和下面的种子。" : "Select a produce source and a seed target first.";
  }, [isZh, selectedSourceEntry, selectedTargetOption, view]);

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
                      {isZh ? "可兑换种子" : "Seed targets"}
                    </strong>
                    <p className="mt-1 text-xs text-slate-400">
                      {isZh
                        ? "会根据当前作物的等级，列出可兑换的目标种子。"
                        : "Targets are filtered by the selected produce tier."}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {targetOptions.map((option) => {
                      const definition = getCropDefinitionBySeed(option.targetSeedType);
                      const selected = option.targetSeedType === selectedTargetSeedType;
                      return (
                        <button
                          key={option.targetSeedType}
                          type="button"
                          title={definition.seedLabel}
                          aria-label={`${definition.seedLabel} cost ${option.cost}`}
                          onClick={() => onSelectTarget(option.targetSeedType)}
                          className={`rounded-full border px-3 py-2 text-left transition ${
                            selected
                              ? "border-amber-200/70 bg-amber-200/12 text-amber-50"
                              : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/8"
                          }`}
                        >
                          <span className="flex min-h-[40px] items-center justify-between gap-2">
                            <PixelIcon src={definition.seedIcon} size={30} />
                            <span className="text-xs tabular-nums text-slate-300/78">{`x1 / ${option.cost}`}</span>
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
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {backgroundRewards.map((reward) => {
                  const title = reward.title[locale] ?? reward.title["en-US"];
                  const description = reward.description[locale] ?? reward.description["en-US"];

                  return (
                    <article
                      key={reward.id}
                      className="rounded-[20px] border border-white/10 bg-white/5 p-3"
                    >
                      <button
                        type="button"
                        onClick={() => setPreviewImage(reward)}
                        className="block w-full rounded-[16px] border border-white/10 bg-black/20 p-2 text-left transition hover:border-white/20 hover:bg-white/6"
                      >
                        <div className="aspect-[520/935] overflow-hidden rounded-[12px] bg-slate-900/60">
                          <img
                            src={reward.preview}
                            alt={title}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <strong className="text-sm font-semibold text-slate-50">{title}</strong>
                          <span className="rounded-full bg-white/8 px-2.5 py-1 text-xs text-slate-200/80">
                            {isZh ? "查看大图" : "Preview"}
                          </span>
                        </div>
                      </button>

                      <div className="mt-3">
                        <p className="m-0 text-xs leading-5 text-slate-300/80">{description}</p>
                        {reward.redeemable ? (
                          <>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {reward.requirementProgress.map((requirement) => {
                                const definition = getCropDefinitionByCrop(requirement.cropType);
                                return (
                                  <span
                                    key={`${reward.id}-${requirement.cropType}`}
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
                            <div className="mt-3">
                              <button
                                type="button"
                                onClick={() => onRedeemBackgroundReward(reward.id)}
                                disabled={!reward.ready || reward.unlocked}
                                className={`rounded-[14px] px-3 py-2 text-sm font-semibold transition ${
                                  reward.unlocked
                                    ? "cursor-default bg-emerald-200/18 text-emerald-100"
                                    : reward.ready
                                      ? "bg-sky-300 text-slate-950 hover:-translate-y-px hover:bg-sky-200"
                                      : "cursor-not-allowed bg-white/10 text-slate-400"
                                }`}
                              >
                                {reward.unlocked
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
                          <div className="mt-3">
                            <span className="inline-flex rounded-[14px] bg-white/10 px-3 py-2 text-sm font-semibold text-slate-400">
                              {isZh ? "暂不支持兑换" : "Not supported yet"}
                            </span>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 rounded-[16px] bg-white/5 px-3 py-2.5">
            <div className="text-sm text-slate-300/82">
              {selectedSourceEntry && selectedTargetOption && view === "seed" ? (
                <span className="inline-flex items-center gap-2">
                  <PixelIcon src={selectedSourceEntry.definition.cropIcon} size={24} />
                  <span className="tabular-nums">x {selectedTargetOption.cost}</span>
                  <span>→</span>
                  <PixelIcon
                    src={getCropDefinitionBySeed(selectedTargetOption.targetSeedType).seedIcon}
                    size={24}
                  />
                  <span className="tabular-nums">x 1</span>
                </span>
              ) : (
                <span>{footerHint}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
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
