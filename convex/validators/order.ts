import { v } from "convex/values";

const personalizationValidator = v.object({
  text: v.optional(v.string()),
  color: v.optional(v.string()),
  number: v.optional(v.string()),
});

export const orderItemValidator = v.object({
  productId: v.id("products"),
  productName: v.string(),
  quantity: v.number(),
  price: v.number(),
  variant: v.optional(
    v.object({
      size: v.string(),
    }),
  ),
  productImageUrl: v.optional(v.union(v.string(), v.null())),
  personalization: v.optional(personalizationValidator),
});

export const orderStatusValidator = v.union(
  v.literal("pending"),
  v.literal("confirmed"),
  v.literal("shipped"),
  v.literal("delivered"),
  v.literal("canceled"),
);
