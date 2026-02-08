import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { getProductCategories } from "./products";

export type DiscountScopeType = "product" | "group" | "category";

export type ActiveDiscount = Doc<"discounts">;

type ProductLike = {
  _id: Id<"products">;
  categoryGroup: string;
  categories?: string[] | string;
};

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

const isDiscountActive = (discount: ActiveDiscount, now: number) => {
  if (!discount.isActive) {
    return false;
  }
  if (typeof discount.startsAt === "number" && now < discount.startsAt) {
    return false;
  }
  if (typeof discount.endsAt === "number" && now > discount.endsAt) {
    return false;
  }
  return discount.percentage > 0;
};

const sortByBestDiscount = (a: ActiveDiscount, b: ActiveDiscount) => {
  if (a.percentage !== b.percentage) {
    return b.percentage - a.percentage;
  }
  return b._creationTime - a._creationTime;
};

export const applyDiscountToAmount = (
  amount: number,
  percentage?: number,
): number => {
  if (!percentage || percentage <= 0) {
    return roundCurrency(amount);
  }
  const factor = Math.max(0, 1 - percentage / 100);
  return roundCurrency(amount * factor);
};

export const loadActiveDiscounts = async (
  ctx: QueryCtx | MutationCtx,
): Promise<ActiveDiscount[]> => {
  const now = Date.now();
  const all = await ctx.db.query("discounts").collect();
  return all.filter((discount) => isDiscountActive(discount, now));
};

const pickBestDiscount = (discounts: ActiveDiscount[]) => {
  if (discounts.length === 0) {
    return null;
  }
  const sorted = [...discounts].sort(sortByBestDiscount);
  return sorted[0] ?? null;
};

export const resolveDiscountForProduct = (
  product: ProductLike,
  discounts: ActiveDiscount[],
) => {
  if (discounts.length === 0) {
    return null;
  }

  const productMatches = discounts.filter(
    (discount) =>
      discount.scopeType === "product" && discount.productId === product._id,
  );
  const bestProduct = pickBestDiscount(productMatches);
  if (bestProduct) {
    return bestProduct;
  }

  const groupMatches = discounts.filter(
    (discount) =>
      discount.scopeType === "group" &&
      discount.categoryGroup === product.categoryGroup,
  );
  const bestGroup = pickBestDiscount(groupMatches);
  if (bestGroup) {
    return bestGroup;
  }

  const categories = getProductCategories(product as Doc<"products">);
  const categoryMatches = discounts.filter((discount) => {
    if (discount.scopeType !== "category") {
      return false;
    }
    if (discount.category && !categories.includes(discount.category)) {
      return false;
    }
    if (
      discount.categoryGroup &&
      discount.categoryGroup !== product.categoryGroup
    ) {
      return false;
    }
    return true;
  });

  return pickBestDiscount(categoryMatches);
};
