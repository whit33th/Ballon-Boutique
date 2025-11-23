import { STORE_INFO } from "@/constants/config";
import { routing } from "@/i18n/routing";

/**
 * Get the base URL for the site
 */
export function getBaseUrl(locale?: string): string {
  // In production, use the actual domain
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (locale && locale !== routing.defaultLocale) {
      return `${baseUrl}/${locale}`;
    }
    return baseUrl;
  }

  // In development, use localhost
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const host = process.env.VERCEL_URL || "localhost:3000";
  const baseUrl = `${protocol}://${host}`;
  if (locale && locale !== routing.defaultLocale) {
    return `${baseUrl}/${locale}`;
  }
  return baseUrl;
}

/**
 * Get the canonical URL for a page
 */
export function getCanonicalUrl(path: string, locale?: string): string {
  const baseUrl = getBaseUrl();
  const localePrefix =
    locale && locale !== routing.defaultLocale ? `/${locale}` : "";
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${localePrefix}${cleanPath}`;
}

/**
 * Get the site name
 */
export function getSiteName(): string {
  return STORE_INFO.name;
}

/**
 * Get the default description
 */
export function getDefaultDescription(locale: string): string {
  const descriptions: Record<string, string> = {
    de: "Ballons für jeden Anlass. Wenn Momente zu Emotionen werden.",
    en: "Balloons for every occasion. When moments become memories.",
    ru: "Шары на любой случай. Когда мгновения становятся воспоминаниями.",
    uk: "Кульки на будь-яку нагоду. Коли миті стають спогадами.",
  };
  return descriptions[locale] || descriptions.en;
}

/**
 * Format price for display
 */
export function formatPrice(price: number, currency: string = "EUR"): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
  }).format(price);
}

/**
 * Truncate text to a specific length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}
