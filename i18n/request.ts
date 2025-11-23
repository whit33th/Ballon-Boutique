import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";
import { isSupportedLocale } from "./utils";

// Map routing locale codes to message file names
const localeToMessageFile: Record<string, string> = {
  de: "de", // German uses de.json
  en: "en",
  uk: "uk", // Ukrainian uses uk.json
  ru: "ru",
};

export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale;

  // Ensure that a valid locale is used
  if (!isSupportedLocale(locale)) {
    locale = routing.defaultLocale;
  }

  // Get the correct message file name for this locale
  const messageFile = localeToMessageFile[locale] || locale;

  return {
    locale,
    messages: (await import(`../messages/${messageFile}.json`)).default,
  };
});
