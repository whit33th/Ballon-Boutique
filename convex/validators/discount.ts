import { v } from "convex/values";

export const discountScopeTypeValidator = v.union(
  v.literal("product"),
  v.literal("group"),
  v.literal("category"),
);

export const discountDocumentFields = {
  _id: v.id("discounts"),
  _creationTime: v.number(),
  name: v.string(),
  percentage: v.number(),
  scopeType: discountScopeTypeValidator,
  productId: v.optional(v.id("products")),
  categoryGroup: v.optional(v.string()),
  category: v.optional(v.string()),
  startsAt: v.optional(v.number()),
  endsAt: v.optional(v.number()),
  isActive: v.boolean(),
};

export const discountDocumentValidator = v.object(discountDocumentFields);
