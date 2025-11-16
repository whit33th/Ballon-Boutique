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
  personalization: v.optional(personalizationValidator),
});

export const orderStatusValidator = v.union(
  v.literal("pending"),
  v.literal("confirmed"),
  v.literal("shipped"),
  v.literal("delivered"),
);
