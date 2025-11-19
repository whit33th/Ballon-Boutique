export type CategoryGroupValue = "balloons" | "balloon-bouquets" | "mini-sets";

export interface CategoryDescriptor {
  label: string;
  value: string;
}

export interface CategoryGroup {
  value: CategoryGroupValue;
  label: string;
  icon: string;
  description?: string;
  subcategories: readonly CategoryDescriptor[];
  categoryValue?: string;
}

export const BALLOON_SUBCATEGORIES: readonly CategoryDescriptor[] = [
  { value: "For Kids Boys", label: "Kids · Boys" },
  { value: "For Kids Girls", label: "Kids · Girls" },
  { value: "For Her", label: "For Her" },
  { value: "For Him", label: "For Him" },
  { value: "Love", label: "Love" },
  { value: "Mom", label: "Mom" },
  { value: "Anniversary", label: "Anniversary" },
  { value: "Baby Birth", label: "Baby Birth" },
  { value: "Surprise Box", label: "Surprise Box" },
  { value: "Any Event", label: "Any Event" },
] as const;

const BOUQUET_CATEGORY_VALUES = [
  "For Kids Boys",
  "For Kids Girls",
  "For Her",
  "For Him",

  "Any Event",
] as const;

type BouquetCategoryValue = (typeof BOUQUET_CATEGORY_VALUES)[number];

const BOUQUET_SUBCATEGORIES: readonly CategoryDescriptor[] =
  BALLOON_SUBCATEGORIES.filter(
    (
      subcategory,
    ): subcategory is CategoryDescriptor & {
      value: BouquetCategoryValue;
    } =>
      BOUQUET_CATEGORY_VALUES.includes(
        subcategory.value as BouquetCategoryValue,
      ),
  );

export const PRODUCT_CATEGORY_GROUPS: readonly CategoryGroup[] = [
  {
    value: "balloons",
    label: "Balloons",
    icon: "/imgs/categories/balloons.jpg",
    // description: "Pick the occasion first",
    subcategories: BALLOON_SUBCATEGORIES,
  },
  {
    value: "balloon-bouquets",
    label: "Bouquets",
    icon: "/imgs/categories/balloon-bouquets.jpg",
    categoryValue: "Balloon Bouquets",
    subcategories: BOUQUET_SUBCATEGORIES,
  },
  {
    value: "mini-sets",
    label: "Mini Sets",
    icon: "/imgs/categories/mini-sets.jpg",
    categoryValue: "Mini Sets",
    subcategories: [],
  },
] as const;

export const PRODUCT_CATEGORIES = [
  ...BALLOON_SUBCATEGORIES.map((subcategory) => subcategory.value),
  "Balloon Bouquets",
  "Mini Sets",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const CATEGORY_TO_GROUP: Record<string, CategoryGroupValue> =
  PRODUCT_CATEGORY_GROUPS.reduce(
    (acc, group) => {
      if (group.subcategories.length === 0) {
        const key = group.categoryValue ?? group.label;
        acc[key] = group.value;
      }
      for (const subcategory of group.subcategories) {
        acc[subcategory.value] = group.value;
      }
      return acc;
    },
    {} as Record<string, CategoryGroupValue>,
  );

export const PRIMARY_CATEGORY_CARDS = PRODUCT_CATEGORY_GROUPS.map(
  ({ value, label, icon, description }) => ({
    value,
    label,
    icon,
    description,
  }),
);

export const CATEGORY_GROUP_SLUGS = {
  balloons: "balloons",
  "balloon-bouquets": "balloon-bouquets",
  "mini-sets": "mini-sets",
} as const satisfies Record<CategoryGroupValue, string>;

export type CategorySlug = (typeof CATEGORY_GROUP_SLUGS)[CategoryGroupValue];

export const SLUG_TO_CATEGORY_GROUP: Record<string, CategoryGroupValue> =
  Object.entries(CATEGORY_GROUP_SLUGS).reduce(
    (acc, [group, slug]) => {
      acc[slug] = group as CategoryGroupValue;
      acc[group] = group as CategoryGroupValue;
      return acc;
    },
    {} as Record<string, CategoryGroupValue>,
  );

export const buildCategoryPagePath = (group: CategoryGroupValue) =>
  `/${CATEGORY_GROUP_SLUGS[group]}`;

export const buildCatalogLink = (
  group: CategoryGroupValue,
  params?: Record<string, string>,
) => {
  const query: Record<string, string> = {
    categoryGroup: group,
    ...(params ?? {}),
  };
  return { pathname: "/catalog", query } as const;
};
