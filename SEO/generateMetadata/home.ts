import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { STORE_INFO } from "@/constants/config";
import { routing } from "@/i18n/routing";
import { getKeywords } from "../keywords";
import {
  getBaseUrl,
  getCanonicalUrl,
  getDefaultDescription,
  getSiteName,
} from "../utils";

export async function generateHomeMetadata(locale: string): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "home" });
  const siteName = getSiteName();
  const baseUrl = getBaseUrl();
  const canonicalUrl = getCanonicalUrl("/", locale);
  const description = getDefaultDescription(locale);

  const title = `${siteName} | ${t("title", { default: "Balloons for every occasion" })}`;
  const titleTemplate = `${siteName} | %s`;

  // Get locale-specific slogan
  const slogans: Record<string, string> = {
    de: STORE_INFO.slogan,
    en: STORE_INFO.sloganEn || STORE_INFO.slogan,
    ru: STORE_INFO.sloganRu,
    uk: STORE_INFO.sloganUa || STORE_INFO.sloganRu,
  };
  const slogan = slogans[locale] || STORE_INFO.slogan;

  // Get keywords for this page and locale
  const keywords = getKeywords("home", locale as "de" | "en" | "ru" | "uk");

  return {
    // Basic metadata
    title: {
      default: title,
      template: titleTemplate,
    },
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
      icon: [
        { url: STORE_INFO.favicon, sizes: "any" },
        {
          url: "/web-app-manifest-192x192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          url: "/web-app-manifest-512x512.png",
          sizes: "512x512",
          type: "image/png",
        },
      ],
      apple: [
        { url: STORE_INFO.appleIcon, sizes: "180x180", type: "image/png" },
      ],
      shortcut: STORE_INFO.favicon,
    },

    // Manifest
    manifest: STORE_INFO.manifest,

    // Apple Web App
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: siteName,
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
        "de-AT": getCanonicalUrl("/", "de"),
        "en-US": getCanonicalUrl("/", "en"),
        "ru-RU": getCanonicalUrl("/", "ru"),
        "uk-UA": getCanonicalUrl("/", "uk"),
        "x-default": getCanonicalUrl("/", routing.defaultLocale),
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
          url: `${baseUrl}${STORE_INFO.logo}`,
          width: 1200,
          height: 630,
          alt: `${siteName} - ${slogan}`,
          type: "image/png",
        },
        {
          url: `${baseUrl}/web-app-manifest-512x512.png`,
          width: 512,
          height: 512,
          alt: siteName,
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
          url: `${baseUrl}${STORE_INFO.logo}`,
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

    // Verification
    verification: {
      google: "fix", // Google Search Console verification code
      yandex: "fix", // Yandex Webmaster verification code
      yahoo: "fix", // Yahoo verification code
      other: {
        "facebook-domain-verification": "fix", // Facebook Domain Verification
      },
    },

    // Additional metadata
    category: STORE_INFO.industry,

    // Custom meta tags
    other: {
      classification: "Business",
      "geo.region": `${STORE_INFO.address.countryCode}-${STORE_INFO.geo.regionCode}`,
      "geo.placename": STORE_INFO.address.city,
      "geo.position":
        STORE_INFO.geo.latitude !== "fix" && STORE_INFO.geo.longitude !== "fix"
          ? `${STORE_INFO.geo.latitude};${STORE_INFO.geo.longitude}`
          : "fix",
      ICBM:
        STORE_INFO.geo.latitude !== "fix" && STORE_INFO.geo.longitude !== "fix"
          ? `${STORE_INFO.geo.latitude}, ${STORE_INFO.geo.longitude}`
          : "fix",
      "contact:email": STORE_INFO.contact.email,
      "contact:phone_number": STORE_INFO.contact.phoneE164,
      "contact:website": baseUrl,
      "business:contact_data:street_address": STORE_INFO.address.street,
      "business:contact_data:locality": STORE_INFO.address.city,
      "business:contact_data:postal_code": STORE_INFO.address.postalCode,
      "business:contact_data:country_name": STORE_INFO.address.country,
      "business:contact_data:email": STORE_INFO.contact.email,
      "business:contact_data:phone_number": STORE_INFO.contact.phoneE164,
      "business:contact_data:website": baseUrl,
      "og:email": STORE_INFO.contact.email,
      "og:phone_number": STORE_INFO.contact.phoneE164,
      "og:latitude":
        STORE_INFO.geo.latitude !== "fix" ? STORE_INFO.geo.latitude : "fix",
      "og:longitude":
        STORE_INFO.geo.longitude !== "fix" ? STORE_INFO.geo.longitude : "fix",
      "og:street-address": STORE_INFO.address.street,
      "og:locality": STORE_INFO.address.city,
      "og:postal-code": STORE_INFO.address.postalCode,
      "og:country-name": STORE_INFO.address.country,
      "og:region": STORE_INFO.geo.region,
      "article:author": STORE_INFO.legal.owner,
      "article:publisher": siteName,
      "DC.title": title,
      "DC.creator": siteName,
      "DC.subject": STORE_INFO.industry,
      "DC.description": description,
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
    },
  };
}
