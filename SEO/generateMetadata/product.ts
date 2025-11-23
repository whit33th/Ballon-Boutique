import type { Metadata } from "next";
import { STORE_INFO } from "@/constants/config";
import type { Doc } from "@/convex/_generated/dataModel";
import { routing } from "@/i18n/routing";
import { getKeywords } from "../keywords";
import {
  formatPrice,
  getBaseUrl,
  getCanonicalUrl,
  getSiteName,
  truncateText,
} from "../utils";

type Product = Doc<"products">;

export async function generateProductMetadata(
  locale: string,
  product: Product,
): Promise<Metadata> {
  const siteName = getSiteName();
  const baseUrl = getBaseUrl();
  const productPath = `/catalog/${product._id}`;
  const canonicalUrl = getCanonicalUrl(productPath, locale);

  const title = `${product.name} | ${siteName}`;
  const fullDescription =
    product.description || `${product.name} - ${formatPrice(product.price)}`;
  const description = truncateText(fullDescription, 160);
  const _price = formatPrice(product.price);
  const availability = product.inStock ? "in stock" : "out of stock";
  const availabilitySchema = product.inStock
    ? "https://schema.org/InStock"
    : "https://schema.org/OutOfStock";

  // Get product images
  const productImages =
    product.imageUrls && product.imageUrls.length > 0
      ? product.imageUrls
      : [`${baseUrl}${STORE_INFO.logo}`];

  // Get keywords for this product and locale
  const keywords = getKeywords(
    "product",
    locale as "de" | "en" | "ru" | "uk",
    product.name,
    product.categoryGroup,
    product.availableColors || [],
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
        "de-AT": `${baseUrl}/de${productPath}`,
        "en-US": `${baseUrl}/en${productPath}`,
        "ru-RU": `${baseUrl}/ru${productPath}`,
        "uk-UA": `${baseUrl}/uk${productPath}`,
        "x-default": `${baseUrl}${productPath}`,
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
      images: productImages.map((url) => ({
        url,
        width: 1200,
        height: 1200,
        alt: product.name,
        type: "image/jpeg",
      })),
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
      images: productImages.slice(0, 1).map((url) => ({
        url,
        width: 1200,
        height: 1200,
        alt: product.name,
      })),
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
    category: product.categoryGroup,
    classification: "Product",

    // Custom meta tags for products
    other: {
      // Product specific
      "product:price:amount": product.price.toString(),
      "product:price:currency": "EUR",
      "product:availability": availability,
      "product:condition": "new",
      "product:retailer": siteName,
      "product:retailer_id": STORE_INFO.legal.registrationNumber,
      "product:brand": siteName,
      "product:category": product.categoryGroup,
      "product:sku": product._id,
      "product:mpn": product._id,

      // Schema.org Product properties
      "og:type": "product",
      "product:price:standard_amount": product.price.toString(),
      "product:price:standard_currency": "EUR",

      // Availability
      "og:availability": availabilitySchema,

      // Images
      "og:image:width": "1200",
      "og:image:height": "1200",
      "og:image:type": "image/jpeg",

      // Business contact
      "business:contact_data:email": STORE_INFO.contact.email,
      "business:contact_data:phone_number": STORE_INFO.contact.phoneE164,
      "business:contact_data:website": baseUrl,

      // Geo
      "geo.region": `${STORE_INFO.address.countryCode}-${STORE_INFO.geo.regionCode}`,
      "geo.placename": STORE_INFO.address.city,

      // Dublin Core
      "DC.title": title,
      "DC.creator": siteName,
      "DC.subject": product.categoryGroup,
      "DC.description": description,
      "DC.type": "Product",
      "DC.identifier": product._id,
      "DC.language":
        locale === "de"
          ? "de"
          : locale === "uk"
            ? "uk"
            : locale === "ru"
              ? "ru"
              : "en",

      // Additional product metadata
      "itemprop:name": product.name,
      "itemprop:description": fullDescription,
      "itemprop:price": product.price.toString(),
      "itemprop:priceCurrency": "EUR",
      "itemprop:availability": availabilitySchema,
      "itemprop:image": productImages[0],
      "itemprop:brand": siteName,
      "itemprop:category": product.categoryGroup,
    },
  };
}
