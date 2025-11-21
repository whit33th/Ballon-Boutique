import { v } from "convex/values";

export const addressValidator = v.object({
  streetAddress: v.string(),
  city: v.string(),
  postalCode: v.string(),
  deliveryNotes: v.string(),
});

export const optionalAddressValidator = v.optional(addressValidator);

