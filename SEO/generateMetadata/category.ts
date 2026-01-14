import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { CategoryGroup } from "@/constants/categories";
import { STORE_INFO } from "@/constants/config";
import { routing } from "@/i18n/routing";
import { getKeywords } from "../keywords";
import {
  getBaseUrl,
  getCanonicalUrl,
  getDefaultDescription,
  getSiteName,
} from "../utils";

export async function generateCategoryMetadata(
  locale: string,
  category: CategoryGroup,
): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "catalog" });
  const siteName = getSiteName();
  const baseUrl = getBaseUrl();
  const categoryPath = `/${category.value}`;
  const canonicalUrl = getCanonicalUrl(categoryPath, locale);

  const categoryName = t(`categoryGroups.${category.value}`, {
    default: category.label,
  });
  const title = `${categoryName} | ${siteName}`;
  const description = category.description || getDefaultDescription(locale);

  // Get keywords for this category and locale
  const keywords = getKeywords(
    "category",
    locale as "de" | "en" | "ru" | "uk",
    categoryName,
  );

  const categoryImage = category.icon
    ? `${baseUrl}${category.icon}`
    : `${baseUrl}${STORE_INFO.logo}`;

  return {
    // Basic metadata
    title,
    description,
    keywords: keywords,
    authors: [
      {
        name: siteName,
        url: baseUrl,
      },
    ],
    creator: siteName,
    publisher: siteName,
    applicationName: siteName,
    generator: "Next.js",
    referrer: "origin-when-cross-origin",

    metadataBase: new URL(baseUrl),

    // Format detection
    formatDetection: {
      telephone: true,
      date: true,
      address: true,
      email: true,
      url: true,
    },

    // Alternates & Languages
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "de-AT": getCanonicalUrl(categoryPath, "de"),
        "en-US": getCanonicalUrl(categoryPath, "en"),
        "ru-RU": getCanonicalUrl(categoryPath, "ru"),
        "uk-UA": getCanonicalUrl(categoryPath, "uk"),
        "x-default": getCanonicalUrl(categoryPath, routing.defaultLocale),
      },
    },

    // Open Graph
    openGraph: {
      type: "website",
      locale:
        locale === "de"
          ? "de_AT"
          : locale === "uk"
            ? "uk_UA"
            : locale === "ru"
              ? "ru_RU"
              : "en_US",
      alternateLocale: routing.locales
        .filter((l) => l !== locale)
        .map((l) =>
          l === "de"
            ? "de_AT"
            : l === "uk"
              ? "uk_UA"
              : l === "ru"
                ? "ru_RU"
                : "en_US",
        ),
      url: canonicalUrl,
      siteName,
      title,
      description,
      images: [
        {
          url: categoryImage,
          width: 1200,
          height: 630,
          alt: categoryName,
          type: "image/webp",
        },
      ],
    },

    // Twitter Card
    twitter: {
      card: "summary_large_image",
      title,
      description,
      site:
        STORE_INFO.social.twitter !== "fix"
          ? STORE_INFO.social.twitter
          : undefined,
      creator:
        STORE_INFO.social.twitter !== "fix"
          ? `@${STORE_INFO.social.twitter.split("/").pop()}`
          : undefined,
      images: [categoryImage],
    },

    // Robots
    robots: {
      index: true,
      follow: true,
      nocache: false,
      googleBot: {
        index: true,
        follow: true,
        noimageindex: false,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },

    // Category
    category: category.value,

    // Custom meta tags
    other: {
      classification: "Category",
      // Category specific
      "og:type": "website",
      "og:section": category.value,

      // Business contact
      "business:contact_data:email": STORE_INFO.contact.email,
      "business:contact_data:phone_number": STORE_INFO.contact.phoneE164,
      "business:contact_data:website": baseUrl,
      "business:contact_data:street_address": STORE_INFO.address.street,
      "business:contact_data:locality": STORE_INFO.address.city,
      "business:contact_data:postal_code": STORE_INFO.address.postalCode,
      "business:contact_data:country_name": STORE_INFO.address.country,

      // Geo
      "geo.region": `${STORE_INFO.address.countryCode}-${STORE_INFO.geo.regionCode}`,
      "geo.placename": STORE_INFO.address.city,
      "geo.position":
        STORE_INFO.geo.latitude !== "fix" && STORE_INFO.geo.longitude !== "fix"
          ? `${STORE_INFO.geo.latitude};${STORE_INFO.geo.longitude}`
          : "fix",

      // Dublin Core
      "DC.title": title,
      "DC.creator": siteName,
      "DC.subject": category.value,
      "DC.description": description,
      "DC.type": "Category",
      "DC.language":
        locale === "de"
          ? "de"
          : locale === "uk"
            ? "uk"
            : locale === "ru"
              ? "ru"
              : "en",
      "DC.coverage": STORE_INFO.address.country,
    },
  };
}
