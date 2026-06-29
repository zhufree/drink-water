import type { Locale } from "./types";

export type BeverageCategory = "common" | "teaCoffee" | "sweet" | "milkOther";

export type BeverageOption = {
  id: string;
  category: BeverageCategory;
  ratio: number;
  labels: Record<Locale, string>;
  descriptions: Record<Locale, string>;
};

export type LocalizedBeverageOption = Omit<BeverageOption, "labels" | "descriptions"> & {
  label: string;
  description: string;
};

export type BeverageCategoryGroup = {
  id: BeverageCategory;
  label: string;
  options: LocalizedBeverageOption[];
};

const CATEGORY_LABELS: Record<BeverageCategory, Record<Locale, string>> = {
  common: { "zh-CN": "常用", "en-US": "Common" },
  teaCoffee: { "zh-CN": "茶和咖啡", "en-US": "Tea & coffee" },
  sweet: { "zh-CN": "甜饮料", "en-US": "Sweet drinks" },
  milkOther: { "zh-CN": "奶/豆/其他", "en-US": "Milk & other" }
};

const CATEGORY_ORDER: BeverageCategory[] = ["common", "teaCoffee", "sweet", "milkOther"];

export const BEVERAGE_OPTIONS: BeverageOption[] = [
  {
    id: "water",
    category: "common",
    ratio: 1,
    labels: { "zh-CN": "白水", "en-US": "Water" },
    descriptions: { "zh-CN": "按 100% 计入，日常补水首选", "en-US": "Counts at 100%; the default hydration choice." }
  },
  {
    id: "tea",
    category: "common",
    ratio: 0.95,
    labels: { "zh-CN": "绿茶/乌龙茶", "en-US": "Tea" },
    descriptions: { "zh-CN": "无糖茶饮，按 95% 计入", "en-US": "Unsweetened tea counts at 95%." }
  },
  {
    id: "coffee",
    category: "common",
    ratio: 0.9,
    labels: { "zh-CN": "咖啡", "en-US": "Coffee" },
    descriptions: { "zh-CN": "美式、拿铁等按 90% 计入", "en-US": "Coffee drinks count at 90%." }
  },
  {
    id: "milkTea",
    category: "common",
    ratio: 0.75,
    labels: { "zh-CN": "奶茶", "en-US": "Milk tea" },
    descriptions: { "zh-CN": "含奶和糖的茶饮，按 75% 计入", "en-US": "Milk tea counts at 75%." }
  },
  {
    id: "soda",
    category: "common",
    ratio: 0.75,
    labels: { "zh-CN": "可乐/汽水", "en-US": "Soda" },
    descriptions: { "zh-CN": "可乐、雪碧、气泡饮料，按 75% 计入", "en-US": "Soda counts at 75%." }
  },
  {
    id: "herbalTea",
    category: "teaCoffee",
    ratio: 0.95,
    labels: { "zh-CN": "菊花茶/花果茶", "en-US": "Herbal tea" },
    descriptions: { "zh-CN": "不加糖时接近茶水，按 95% 计入", "en-US": "Unsweetened herbal tea counts at 95%." }
  },
  {
    id: "sweetTea",
    category: "teaCoffee",
    ratio: 0.75,
    labels: { "zh-CN": "冰红茶/甜茶", "en-US": "Sweet tea" },
    descriptions: { "zh-CN": "加糖茶饮，按 75% 计入", "en-US": "Sweetened tea counts at 75%." }
  },
  {
    id: "milk",
    category: "milkOther",
    ratio: 0.9,
    labels: { "zh-CN": "牛奶", "en-US": "Milk" },
    descriptions: { "zh-CN": "纯牛奶或低糖奶，按 90% 计入", "en-US": "Milk counts at 90%." }
  },
  {
    id: "soyMilk",
    category: "milkOther",
    ratio: 0.9,
    labels: { "zh-CN": "豆浆", "en-US": "Soy milk" },
    descriptions: { "zh-CN": "无糖或少糖豆浆，按 90% 计入", "en-US": "Soy milk counts at 90%." }
  },
  {
    id: "sportsDrink",
    category: "milkOther",
    ratio: 0.9,
    labels: { "zh-CN": "运动饮料", "en-US": "Sports drink" },
    descriptions: { "zh-CN": "电解质饮料，按 90% 计入", "en-US": "Sports drinks count at 90%." }
  },
  {
    id: "juice",
    category: "sweet",
    ratio: 0.8,
    labels: { "zh-CN": "果汁", "en-US": "Juice" },
    descriptions: { "zh-CN": "果汁或果味饮料，按 80% 计入", "en-US": "Juice counts at 80%." }
  },
  {
    id: "sweetSoyMilk",
    category: "sweet",
    ratio: 0.8,
    labels: { "zh-CN": "甜豆浆", "en-US": "Sweet soy milk" },
    descriptions: { "zh-CN": "加糖豆浆，按 80% 计入", "en-US": "Sweet soy milk counts at 80%." }
  },
  {
    id: "energyDrink",
    category: "sweet",
    ratio: 0.7,
    labels: { "zh-CN": "能量饮料", "en-US": "Energy drink" },
    descriptions: { "zh-CN": "咖啡因和糖分更高，按 70% 计入", "en-US": "Energy drinks count at 70%." }
  },
  {
    id: "alcohol",
    category: "milkOther",
    ratio: 0.3,
    labels: { "zh-CN": "啤酒/酒", "en-US": "Alcohol" },
    descriptions: { "zh-CN": "酒精饮品不适合补水，按 30% 计入", "en-US": "Alcohol is a poor hydration choice and counts at 30%." }
  }
];

export function localizeBeverage(option: BeverageOption, locale: Locale): LocalizedBeverageOption {
  return {
    id: option.id,
    category: option.category,
    ratio: option.ratio,
    label: option.labels[locale] ?? option.labels["zh-CN"],
    description: option.descriptions[locale] ?? option.descriptions["zh-CN"]
  };
}

export function findBeverageOption(beverageId: string, locale: Locale): LocalizedBeverageOption {
  const option = BEVERAGE_OPTIONS.find((item) => item.id === beverageId) ?? BEVERAGE_OPTIONS[0];
  return localizeBeverage(option, locale);
}

export function formatBeverageRatio(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

export function calculateEffectiveHydrationMl(amountMl: number, beverageId: string): number {
  const amount = Math.max(Math.floor(Number(amountMl) || 0), 1);
  const beverage = BEVERAGE_OPTIONS.find((item) => item.id === beverageId) ?? BEVERAGE_OPTIONS[0];
  return Math.max(Math.round(amount * beverage.ratio), 1);
}

export function getBeverageCategoryGroups(locale: Locale): BeverageCategoryGroup[] {
  return CATEGORY_ORDER.map((category) => ({
    id: category,
    label: CATEGORY_LABELS[category][locale] ?? CATEGORY_LABELS[category]["zh-CN"],
    options: BEVERAGE_OPTIONS.filter((option) => option.category === category).map((option) =>
      localizeBeverage(option, locale)
    )
  }));
}
