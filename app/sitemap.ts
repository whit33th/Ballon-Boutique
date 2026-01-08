import { fetchQuery } from "convex/nextjs";
import type { MetadataRoute } from "next";
import { PRODUCT_CATEGORY_GROUPS } from "@/constants/categories";
import { STORE_INFO } from "@/constants/config";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { routing } from "@/i18n/routing";
import { generateProductSlug } from "@/lib/catalog-utils";

export const dynamic = "force-dynamic";
export const revalidate = 86400;

const baseUrl = STORE_INFO.website.replace(/\/$/, "");
const locales = routing.locales;

const staticPages = [
  {
    path: "",
    priority: 1.0,
    changeFrequency: "daily" as const,
  },
  { path: "catalog", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "legal/terms", priority: 0.5, changeFrequency: "yearly" as const },
  { path: "legal/privacy", priority: 0.5, changeFrequency: "yearly" as const },
  { path: "legal/imprint", priority: 0.5, changeFrequency: "yearly" as const },
  {
    path: "legal/withdrawal",
    priority: 0.5,
    changeFrequency: "yearly" as const,
  },
];

/**
 * Generate sitemap entries for all pages
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  for (const page of staticPages) {
    for (const locale of locales) {
      const url = `${baseUrl}/${locale}${page.path ? `/${page.path}` : ""}`;
      const alternates: Record<string, string> = {};

      for (const altLocale of locales) {
        if (altLocale !== locale) {
          alternates[altLocale] =
            `${baseUrl}/${altLocale}${page.path ? `/${page.path}` : ""}`;
        }
      }

      entries.push({
        url,
        lastModified: new Date(),
        changeFrequency: page.changeFrequency,
        priority: page.priority,
        alternates: {
          languages: alternates,
        },
      });
    }
  }

  // Add category pages with localization
  for (const categoryGroup of PRODUCT_CATEGORY_GROUPS) {
    for (const locale of locales) {
      const url = `${baseUrl}/${locale}/${categoryGroup.value}`;
      const alternates: Record<string, string> = {};

      for (const altLocale of locales) {
        if (altLocale !== locale) {
          alternates[altLocale] =
            `${baseUrl}/${altLocale}/${categoryGroup.value}`;
        }
      }

      entries.push({
        url,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
        alternates: {
          languages: alternates,
        },
      });
    }
  }

  // Add product pages with images and localization
  try {
    // Fetch all products
    let cursor = "";
    let hasMore = true;
    const products: Array<{
      _id: string;
      name: string;
      imageUrls?: string[];
      _creationTime: number;
    }> = [];

    while (hasMore) {
      const result = await fetchQuery(api.products.list, {
        paginationOpts: { numItems: 1000, cursor },
        available: true,
      });

      for (const product of result.page) {
        products.push({
          _id: product._id,
          name: product.name,
          imageUrls: product.imageUrls,
          _creationTime: product._creationTime,
        });
      }

      cursor = result.continueCursor;
      hasMore = !result.isDone && cursor !== "";
    }

    // Add product entries with images and localization
    for (const product of products) {
      // Get product images - up to 1000 per URL according to Google
      const images =
        product.imageUrls && product.imageUrls.length > 0
          ? product.imageUrls.slice(0, 1000).map((imageUrl) => {
              // Ensure absolute URL
              if (imageUrl.startsWith("http")) {
                return imageUrl;
              }
              return imageUrl.startsWith("/")
                ? `${baseUrl}${imageUrl}`
                : `${baseUrl}/${imageUrl}`;
            })
          : [];

      for (const locale of locales) {
        const productSlug = generateProductSlug(
          product.name,
          product._id as Id<"products">,
        );
        const url = `${baseUrl}/${locale}/catalog/${productSlug}`;
        const alternates: Record<string, string> = {};

        for (const altLocale of locales) {
          if (altLocale !== locale) {
            alternates[altLocale] =
              `${baseUrl}/${altLocale}/catalog/${productSlug}`;
          }
        }

        entries.push({
          url,
          lastModified: new Date(product._creationTime),
          changeFrequency: "weekly" as const,
          priority: 0.7,
          alternates: {
            languages: alternates,
          },
          images: images.length > 0 ? images : undefined,
        });
      }
    }
  } catch (error) {
    // If there's an error fetching products, continue with static pages
    console.error("Error fetching products for sitemap:", error);
  }

  return entries;
}
