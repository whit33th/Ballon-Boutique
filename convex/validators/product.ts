import { v } from "convex/values";

export const productDocumentFields = {
  _id: v.id("products"),
  _creationTime: v.number(),
  name: v.string(),
  description: v.string(),
  price: v.number(),
  miniSetSizes: v.optional(
    v.array(
      v.object({
        label: v.string(),
        price: v.number(),
      }),
    ),
  ),
  categoryGroup: v.string(),
  categories: v.array(v.string()),
  imageUrls: v.array(v.string()),
  inStock: v.boolean(),
  soldCount: v.optional(v.number()),
  isPersonalizable: v.optional(
    v.object({
      name: v.boolean(),
      number: v.boolean(),
    }),
  ),
  availableColors: v.optional(v.array(v.string())),
};

export const productWithImageValidator = v.object({
  ...productDocumentFields,
  imageUrls: v.array(v.string()),
  primaryImageUrl: v.union(v.string(), v.null()),
});
