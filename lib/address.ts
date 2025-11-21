import { z } from "zod";
import { STORE_INFO } from "@/constants/config";

export type AddressFields = {
  streetAddress: string;
  city: string;
  postalCode: string;
  deliveryNotes: string;
};

// Base address schema with required fields (for checkout)
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
    .default("")
    .transform((val) => val || ""),
});

// Optional address schema for profile (all fields optional, but validated)
export const optionalAddressSchema = z
  .object({
    streetAddress: z
      .string()
      .refine(
        (val) =>
          !val ||
          val.trim().length === 0 ||
          (val.trim().length >= 3 && val.trim().length <= 200),
        {
          message: "Street and house number must be 3-200 characters.",
        },
      )
      .optional()
      .or(z.literal("")),
    city: z
      .string()
      .refine(
        (val) =>
          !val ||
          val.trim().length === 0 ||
          (val.trim().length >= 2 && val.trim().length <= 100),
        {
          message: "City must be 2-100 characters.",
        },
      )
      .optional()
      .or(z.literal("")),
    postalCode: z
      .string()
      .refine(
        (val) =>
          !val || val.trim().length === 0 || /^\d{3,10}$/.test(val.trim()),
        {
          message: "Postal code must be 3-10 digits.",
        },
      )
      .optional()
      .or(z.literal("")),
    deliveryNotes: z
      .string()
      .refine(
        (val) => !val || val.trim().length === 0 || val.trim().length <= 500,
        {
          message: "Delivery notes must be under 500 characters.",
        },
      )
      .optional()
      .or(z.literal("")),
  })
  .transform((data) => ({
    streetAddress: data.streetAddress ?? "",
    city: data.city ?? "",
    postalCode: data.postalCode ?? "",
    deliveryNotes: data.deliveryNotes ?? "",
  }));

const defaultCity = STORE_INFO.address.city;

export const createEmptyAddressFields = (): AddressFields => ({
  streetAddress: "",
  city: "",
  postalCode: "",
  deliveryNotes: "",
});

export const parseAddress = (
  address: string | null | undefined,
): AddressFields => {
  if (!address) {
    return createEmptyAddressFields();
  }

  const tokens = address
    .split("\n")
    .flatMap((segment) => segment.split(","))
    .map((segment) => segment.trim())
    .filter(Boolean);

  const [streetAddress = "", secondLine = "", ...rest] = tokens;

  let postalCode = "";
  let city = defaultCity;

  if (secondLine) {
    const match = secondLine.match(/^(\d{3,10})\s*(.*)$/);
    if (match) {
      postalCode = match[1];
      city = match[2]?.trim() || defaultCity;
    } else {
      city = secondLine;
    }
  }

  if (!city && rest.length > 0) {
    city = rest.shift() ?? defaultCity;
  }

  const deliveryNotes = rest.join("\n").trim();

  return {
    streetAddress,
    city: city || defaultCity,
    postalCode,
    deliveryNotes,
  };
};

export const composeAddress = (fields: AddressFields): string => {
  const streetLine = (fields.streetAddress || "").trim();
  const postalCode = (fields.postalCode || "").trim();
  const city = (fields.city || "").trim();
  const notesLine = (fields.deliveryNotes || "").trim();

  // Build city line: postal code + city (both optional, but at least one should be present)
  const cityLineParts: string[] = [];
  if (postalCode) {
    cityLineParts.push(postalCode);
  }
  if (city) {
    cityLineParts.push(city);
  }
  const cityLine = cityLineParts.join(" ").trim();

  // Build final address lines
  const lines: string[] = [];
  if (streetLine) {
    lines.push(streetLine);
  }
  if (cityLine) {
    lines.push(cityLine);
  }
  if (notesLine) {
    lines.push(notesLine);
  }

  return lines.join("\n").trim();
};
