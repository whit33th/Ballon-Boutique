import { STORE_INFO } from "@/constants/config";

export type AddressFields = {
  streetAddress: string;
  city: string;
  postalCode: string;
  deliveryNotes: string;
};

const defaultCity = STORE_INFO.address.city;

export const createEmptyAddressFields = (): AddressFields => ({
  streetAddress: "",
  city: defaultCity,
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
  const streetLine = fields.streetAddress.trim();
  const cityLine = [fields.postalCode.trim(), fields.city.trim()]
    .filter(Boolean)
    .join(" ")
    .trim();
  const notesLine = fields.deliveryNotes.trim();

  return [streetLine, cityLine, notesLine].filter(Boolean).join("\n").trim();
};
