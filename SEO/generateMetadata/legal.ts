import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { STORE_INFO } from "@/constants/config";
import { routing } from "@/i18n/routing";
import { getKeywords } from "../keywords";
import { getBaseUrl, getCanonicalUrl, getSiteName } from "../utils";

type LegalPageType =
  | "terms"
  | "privacy"
  | "imprint"
  | "withdrawal"
  | "cancellation";

export async function generateLegalMetadata(
  locale: string,
  pageType: LegalPageType,
): Promise<Metadata> {
  const siteName = getSiteName();
  const baseUrl = getBaseUrl();
  const pagePath = `/legal/${pageType}`;
  const canonicalUrl = getCanonicalUrl(pagePath, locale);

  // Try to get translations, but provide defaults
  let title: string;
  let description: string;

  try {
    const t = await getTranslations({ locale, namespace: `legal.${pageType}` });
    title = t("header.title", { default: `${pageType} | ${siteName}` });
    description = t("header.description", {
      default: `Read our ${pageType} policy`,
      companyName: siteName,
    });
  } catch {
    // Fallback if translations don't exist
    const pageTitles: Record<LegalPageType, string> = {
      terms: "Terms & Conditions",
      privacy: "Privacy Policy",
      imprint: "Imprint",
      withdrawal: "Withdrawal Policy",
      cancellation: "Cancellation Policy",
    };
    title = `${pageTitles[pageType]} | ${siteName}`;
    description = `Read our ${pageTitles[pageType].toLowerCase()} at ${siteName}`;
  }

  // Get keywords for this legal page and locale
  const keywords = getKeywords(
    "legal",
    locale as "de" | "en" | "ru" | "uk",
    pageType,
  );

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
      {
        name: STORE_INFO.legal.owner,
      },
    ],
    creator: siteName,
    publisher: siteName,
    applicationName: siteName,
    generator: "Next.js",
    referrer: "origin-when-cross-origin",

    metadataBase: new URL(baseUrl),

    // Icons
    icons: {
      icon: [{ url: STORE_INFO.favicon, sizes: "any" }],
      apple: [
        { url: STORE_INFO.appleIcon, sizes: "180x180", type: "image/png" },
      ],
    },

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
        "de-AT": getCanonicalUrl(pagePath, "de"),
        "en-US": getCanonicalUrl(pagePath, "en"),
        "ru-RU": getCanonicalUrl(pagePath, "ru"),
        "uk-UA": getCanonicalUrl(pagePath, "uk"),
        "x-default": getCanonicalUrl(pagePath, routing.defaultLocale),
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
      card: "summary",
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
    category: "Legal",

    // Custom meta tags
    other: {
      classification: "Legal Document",
      // Legal page specific
      "og:type": "website",
      "og:section": "legal",

      // Business information
      "business:contact_data:email": STORE_INFO.contact.email,
      "business:contact_data:phone_number": STORE_INFO.contact.phoneE164,
      "business:contact_data:website": baseUrl,
      "business:contact_data:street_address": STORE_INFO.address.street,
      "business:contact_data:locality": STORE_INFO.address.city,
      "business:contact_data:postal_code": STORE_INFO.address.postalCode,
      "business:contact_data:country_name": STORE_INFO.address.country,
      "business:contact_data:region": STORE_INFO.geo.region,

      // Company legal info
      "business:registration_number": STORE_INFO.legal.registrationNumber,
      "business:vat_number": STORE_INFO.legal.vatNumber,
      "business:company_name": STORE_INFO.legal.companyName,
      "business:owner": STORE_INFO.legal.owner,

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
      "DC.subject": pageType,
      "DC.description": description,
      "DC.type": "Text",
      "DC.format": "text/html",
      "DC.language":
        locale === "de"
          ? "de"
          : locale === "uk"
            ? "uk"
            : locale === "ru"
              ? "ru"
              : "en",
      "DC.coverage": STORE_INFO.address.country,
      "DC.rights": `© ${new Date().getFullYear()} ${siteName}. All rights reserved.`,
      "DC.publisher": siteName,
    },
  };
}
