import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { ensureAdmin } from "./helpers/admin";
import { loadActiveDiscounts } from "./helpers/discounts";
import {
  discountDocumentFields,
  discountScopeTypeValidator,
} from "./validators/discount";

const discountInputValidator = v.object({
  name: v.string(),
  percentage: v.number(),
  scopeType: discountScopeTypeValidator,
  productId: v.optional(v.id("products")),
  categoryGroup: v.optional(v.string()),
  category: v.optional(v.string()),
  startsAt: v.optional(v.number()),
  endsAt: v.optional(v.number()),
  isActive: v.boolean(),
});

const discountWithProductValidator = v.object({
  ...discountDocumentFields,
  productName: v.optional(v.string()),
});

const publicDiscountValidator = v.object({
  _id: v.id("discounts"),
  name: v.string(),
  percentage: v.number(),
  scopeType: discountScopeTypeValidator,
  productId: v.optional(v.id("products")),
  categoryGroup: v.optional(v.string()),
  category: v.optional(v.string()),
  productName: v.optional(v.string()),
});

const assertDiscountInput = (input: {
  percentage: number;
  scopeType: "product" | "group" | "category";
  productId?: Id<"products">;
  categoryGroup?: string;
  category?: string;
}) => {
  if (input.percentage <= 0 || input.percentage > 100) {
    throw new Error("Discount percentage must be between 0 and 100");
  }

  if (input.scopeType === "product" && !input.productId) {
    throw new Error("Product discount requires a product");
  }

  if (input.scopeType === "group" && !input.categoryGroup) {
    throw new Error("Group discount requires a category group");
  }

  if (input.scopeType === "category" && !input.category) {
    throw new Error("Category discount requires a category");
  }
};

export const list = query({
  args: {
    includeInactive: v.optional(v.boolean()),
  },
  returns: v.array(discountWithProductValidator),
  handler: async (ctx, args) => {
    await ensureAdmin(ctx);

    const discounts = await ctx.db.query("discounts").collect();
    const filtered = args.includeInactive
      ? discounts
      : discounts.filter((discount) => discount.isActive);

    const results: Array<Doc<"discounts"> & { productName?: string }> = [];
    for (const discount of filtered) {
      let productName: string | undefined;
      if (discount.scopeType === "product" && discount.productId) {
        const product = await ctx.db.get(discount.productId);
        productName = product?.name;
      }
      results.push({ ...discount, productName });
    }

    return results;
  },
});

export const listActivePublic = query({
  args: {},
  returns: v.array(publicDiscountValidator),
  handler: async (ctx) => {
    const discounts = await loadActiveDiscounts(ctx);
    const results: Array<Doc<"discounts"> & { productName?: string }> = [];

    for (const discount of discounts) {
      let productName: string | undefined;
      if (discount.scopeType === "product" && discount.productId) {
        const product = await ctx.db.get(discount.productId);
        productName = product?.name;
      }

      results.push({ ...discount, productName });
    }

    return results.map((discount) => ({
      _id: discount._id,
      name: discount.name,
      percentage: discount.percentage,
      scopeType: discount.scopeType,
      productId: discount.productId,
      categoryGroup: discount.categoryGroup,
      category: discount.category,
      productName: discount.productName,
    }));
  },
});

export const create = mutation({
  args: discountInputValidator,
  returns: v.id("discounts"),
  handler: async (ctx, args) => {
    await ensureAdmin(ctx);
    assertDiscountInput(args);

    return ctx.db.insert("discounts", {
      name: args.name.trim(),
      percentage: args.percentage,
      scopeType: args.scopeType,
      productId: args.productId,
      categoryGroup: args.categoryGroup?.trim() || undefined,
      category: args.category?.trim() || undefined,
      startsAt: args.startsAt,
      endsAt: args.endsAt,
      isActive: args.isActive,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("discounts"),
    name: v.optional(v.string()),
    percentage: v.optional(v.number()),
    scopeType: v.optional(discountScopeTypeValidator),
    productId: v.optional(v.id("products")),
    categoryGroup: v.optional(v.string()),
    category: v.optional(v.string()),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ensureAdmin(ctx);

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Discount not found");
    }

    const next = {
      name: args.name?.trim() ?? existing.name,
      percentage: args.percentage ?? existing.percentage,
      scopeType: args.scopeType ?? existing.scopeType,
      productId: args.productId ?? existing.productId,
      categoryGroup: args.categoryGroup?.trim() ?? existing.categoryGroup,
      category: args.category?.trim() ?? existing.category,
      startsAt: args.startsAt ?? existing.startsAt,
      endsAt: args.endsAt ?? existing.endsAt,
      isActive: args.isActive ?? existing.isActive,
    };

    assertDiscountInput({
      percentage: next.percentage,
      scopeType: next.scopeType,
      productId: next.productId,
      categoryGroup: next.categoryGroup,
      category: next.category,
    });

    await ctx.db.patch(args.id, next);
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("discounts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ensureAdmin(ctx);
    await ctx.db.delete(args.id);
    return null;
  },
});

export const setProductDiscount = mutation({
  args: {
    productId: v.id("products"),
    productName: v.string(),
    percentage: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ensureAdmin(ctx);

    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    const existing = await ctx.db
      .query("discounts")
      .withIndex("by_product", (q) =>
        q.eq("scopeType", "product").eq("productId", args.productId),
      )
      .first();

    if (args.percentage <= 0) {
      if (existing) {
        await ctx.db.delete(existing._id);
      }
      return null;
    }

    if (args.percentage > 100) {
      throw new Error("Discount percentage must be between 0 and 100");
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: existing.name || args.productName,
        percentage: args.percentage,
        isActive: true,
      });
      return null;
    }

    await ctx.db.insert("discounts", {
      name: args.productName,
      percentage: args.percentage,
      scopeType: "product",
      productId: args.productId,
      categoryGroup: undefined,
      category: undefined,
      startsAt: undefined,
      endsAt: undefined,
      isActive: true,
    });

    return null;
  },
});
