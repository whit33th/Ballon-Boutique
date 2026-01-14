import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { CategoryGroupValue } from "@/constants/categories";
import { PRODUCT_CATEGORY_GROUPS } from "@/constants/categories";
import { STORE_INFO } from "@/constants/config";
import { routing } from "@/i18n/routing";
import { getKeywords } from "../keywords";
import {
  getBaseUrl,
  getCanonicalUrl,
  getDefaultDescription,
  getSiteName,
} from "../utils";

export async function generateCatalogMetadata(
  locale: string,
  categoryGroup?: CategoryGroupValue | null,
  category?: string | null,
): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "catalog" });
  const siteName = getSiteName();
  const baseUrl = getBaseUrl();

  let title: string;
  let description: string;
  let keywords: string[];

  if (categoryGroup) {
    const group = PRODUCT_CATEGORY_GROUPS.find(
      (g) => g.value === categoryGroup,
    );
    const groupName = group
      ? t(`categoryGroups.${group.value}`, { default: group.label })
      : categoryGroup;

    if (category) {
      const subcategory = group?.subcategories.find(
        (s) => s.value === category,
      );
      const subcategoryName = subcategory
        ? t(`subcategories.${subcategory.value}`, {
            default: subcategory.label,
          })
        : category;
      title = `${subcategoryName} - ${groupName} | ${siteName}`;
      const defaultDescription = getDefaultDescription(locale);
      description = t("metaDescription", {
        default: `Browse ${subcategoryName} in ${groupName} category. ${defaultDescription}`,
        subcategory: subcategoryName,
        category: groupName,
        defaultDescription,
      });
      // Use category keywords with subcategory name
      keywords = getKeywords(
        "category",
        locale as "de" | "en" | "ru" | "uk",
        subcategoryName,
      );
    } else {
      title = `${groupName} | ${siteName}`;
      const defaultDescription = getDefaultDescription(locale);
      description = t("metaDescription", {
        default: `Browse ${groupName} collection. ${defaultDescription}`,
        category: groupName,
        defaultDescription,
      });
      // Use category keywords
      keywords = getKeywords(
        "category",
        locale as "de" | "en" | "ru" | "uk",
        groupName,
      );
    }
  } else {
    title = `${t("title", { default: "Catalog" })} | ${siteName}`;
    const defaultDescription = getDefaultDescription(locale);
    description = t("metaDescription", {
      default: `Browse our complete catalog of balloons and decorations. ${defaultDescription}`,
      defaultDescription,
    });
    // Use catalog keywords
    keywords = getKeywords("catalog", locale as "de" | "en" | "ru" | "uk");
  }

  const catalogPath = "/catalog";
  const canonicalUrl = getCanonicalUrl(catalogPath, locale);

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
        "de-AT": getCanonicalUrl(catalogPath, "de"),
        "en-US": getCanonicalUrl(catalogPath, "en"),
        "ru-RU": getCanonicalUrl(catalogPath, "ru"),
        "uk-UA": getCanonicalUrl(catalogPath, "uk"),
        "x-default": getCanonicalUrl(catalogPath, routing.defaultLocale),
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
          url: `${baseUrl}/${locale}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: title,
          type: "image/png",
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
      images: [
        {
          url: `${baseUrl}/${locale}/twitter-image`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
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
    category: "E-commerce",

    // Custom meta tags
    other: {
      classification: "Catalog",
      // Catalog specific
      "og:type": "website",
      "og:section": "catalog",

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
      "DC.subject": "Balloons, Decorations, Party Supplies",
      "DC.description": description,
      "DC.type": "Catalog",
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
