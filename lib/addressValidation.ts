import { z } from "zod";

export const addressSchema = z.object({
  streetAddress: z
    .string()
    .min(1, "Street and house number is required.")
    .min(3, "Street and house number must be at least 3 characters.")
    .max(200, "Street and house number must be under 200 characters."),
  city: z
    .string()
    .min(1, "City is required.")
    .min(2, "City must be at least 2 characters.")
    .max(100, "City must be under 100 characters."),
  postalCode: z
    .string()
    .min(1, "Postal code is required.")
    .regex(/^\d{3,10}$/, "Postal code must be 3-10 digits."),
  deliveryNotes: z
    .string()
    .max(500, "Delivery notes must be under 500 characters.")
    .optional(),
});

