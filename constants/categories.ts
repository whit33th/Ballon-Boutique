export type CategoryGroupValue =
  | "balloons"
  | "toy-in-balloon"
  | "balloon-bouquets"
  | "mini-sets";

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

export const PRODUCT_CATEGORY_GROUPS: readonly CategoryGroup[] = [
  {
    value: "balloons",
    label: "Balloons",
    icon: "/imgs/categories/balloons.avif",
    // description: "Pick the occasion first",
    subcategories: BALLOON_SUBCATEGORIES,
  },
  {
    value: "toy-in-balloon",
    label: "Toy in a Balloon",
    icon: "/imgs/categories/toys.jpg",
    categoryValue: "Toy in a Balloon",
    subcategories: [],
  },
  {
    value: "balloon-bouquets",
    label: "Bouquets",
    icon: "/imgs/categories/bouquets.jpg",
    categoryValue: "Balloon Bouquets",
    subcategories: [],
  },
  {
    value: "mini-sets",
    label: "Mini Sets",
    icon: "/img.jpg",
    categoryValue: "Mini Sets",
    subcategories: [],
  },
] as const;

export const PRODUCT_CATEGORIES = [
  ...BALLOON_SUBCATEGORIES.map((subcategory) => subcategory.value),
  "Toy in a Balloon",
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
