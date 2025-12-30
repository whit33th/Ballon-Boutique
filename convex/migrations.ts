import { Migrations } from "@convex-dev/migrations";
import { components, internal } from "./_generated/api";
import type { DataModel, Doc } from "./_generated/dataModel";

const PERSONALIZATION_NONE = "__none__";

type CartItemDoc = Doc<"cartItems">;

const normalizePersonalization = (
  personalization: CartItemDoc["personalization"],
): CartItemDoc["personalization"] => {
  if (!personalization) {
    return undefined;
  }

  const normalized = {
    text: personalization.text?.trim() || undefined,
    color: personalization.color?.trim() || undefined,
    number: personalization.number?.trim() || undefined,
  } as const;

  if (!normalized.text && !normalized.color && !normalized.number) {
    return undefined;
  }

  return normalized;
};

const buildPersonalizationSignature = (
  personalization: CartItemDoc["personalization"],
) => {
  if (!personalization) {
    return PERSONALIZATION_NONE;
  }

  return JSON.stringify({
    text: personalization.text ?? null,
    color: personalization.color ?? null,
    number: personalization.number ?? null,
  });
};

export const migrations = new Migrations<DataModel>(components.migrations);

export const backfillCartPersonalizationSignature = migrations.define({
  table: "cartItems",
  migrateOne: async (_ctx, item) => {
    if (item.personalizationSignature) {
      return undefined;
    }

    const normalized = normalizePersonalization(item.personalization);

    return {
      personalization: normalized,
      personalizationSignature: buildPersonalizationSignature(normalized),
    };
  },
});

export const runBackfillCartPersonalizationSignature = migrations.runner(
  internal.migrations.backfillCartPersonalizationSignature,
);

export const migrateBouquetKidsCategories = migrations.define({
  table: "products",
  migrateOne: async (_ctx, product) => {
    if (product.categoryGroup !== "balloon-bouquets") {
      return undefined;
    }

    const currentCategories = Array.isArray(product.categories)
      ? product.categories
      : [];

    const hasLegacyKids = currentCategories.some(
      (category) =>
        category === "For Kids Boys" || category === "For Kids Girls",
    );

    if (!hasLegacyKids) {
      return undefined;
    }

    const nextCategories = currentCategories
      .map((category) =>
        category === "For Kids Boys" || category === "For Kids Girls"
          ? "For Kids"
          : category,
      )
      .filter((category) => Boolean(category && category.trim().length > 0));

    const deduped = Array.from(new Set(nextCategories));
    if (!deduped.includes("For Kids")) {
      deduped.push("For Kids");
    }

    const changed =
      deduped.length !== currentCategories.length ||
      deduped.some((category, index) => currentCategories[index] !== category);

    return changed ? { categories: deduped } : undefined;
  },
});

export const runMigrateBouquetKidsCategories = migrations.runner(
  internal.migrations.migrateBouquetKidsCategories,
);
