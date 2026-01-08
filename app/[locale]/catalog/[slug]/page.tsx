import { fetchQuery, preloadedQueryResult, preloadQuery } from "convex/nextjs";
import type { Preloaded } from "convex/react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { api } from "@/convex/_generated/api";
import { extractProductIdFromSlug } from "@/lib/catalog-utils";
import {
  BreadcrumbJsonLd,
  generateProductMetadata,
  ProductJsonLd,
} from "@/SEO";
import { ProductAddToCartWrapper } from "./_components/ProductAddToCartWrapper";
import { ProductGalleryWrapper } from "./_components/ProductGalleryWrapper";
import { ProductInfoDisplay } from "./_components/ProductInfoDisplay";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug, locale } = await params;
  if (!slug) return {};

  const id = extractProductIdFromSlug(slug);
  if (!id) return {};

  try {
    const product = await fetchQuery(api.products.get, { id });
    if (!product) return {};

    return generateProductMetadata(locale, product, slug);
  } catch {
    return {};
  }
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug, locale } = await params;
  if (!slug) return notFound();

  const id = extractProductIdFromSlug(slug);
  if (!id) return notFound();

  // Preload for client components that need reactive data
  let preloaded: Preloaded<typeof api.products.get>;
  try {
    preloaded = await preloadQuery(api.products.get, { id });
  } catch (_err) {
    return notFound();
  }

  // Use preloadedQueryResult to get the same data on server without redundant query
  // This ensures consistency between server-rendered content and client preloaded data
  const product = preloadedQueryResult(preloaded);

  if (!product) {
    return notFound();
  }

  const t = await getTranslations({ locale, namespace: "catalog" });
  const tCommon = await getTranslations({ locale, namespace: "common" });

  const breadcrumbItems = [
    { name: tCommon("home", { default: "Home" }), url: `/${locale}` },
    { name: t("title", { default: "Catalog" }), url: `/${locale}/catalog` },
  ];

  breadcrumbItems.push({
    name: product.name,
    url: `/${locale}/catalog/${slug}`,
  });

  // Prepare gallery images
  const galleryImages = product.primaryImageUrl
    ? [product.primaryImageUrl, ...product.imageUrls.slice(1)]
    : product.imageUrls.length > 0
      ? product.imageUrls
      : [];

  // Only require color selection if there are multiple colors to choose from
  const requiresColorSelection = (product.availableColors?.length ?? 0) > 0;

  const miniSetPrices =
    product.miniSetSizes
      ?.map((s) => s.price)
      .filter((value) => typeof value === "number" && Number.isFinite(value)) ??
    [];

  const priceRange =
    miniSetPrices.length > 0
      ? {
          min: Math.min(...miniSetPrices),
          max: Math.max(...miniSetPrices),
        }
      : undefined;
  return (
    <>
      <ProductJsonLd product={product} locale={locale} slug={slug} />
      <BreadcrumbJsonLd locale={locale} items={breadcrumbItems} />
      <section className="flex w-full flex-col lg:flex-row">
        {/* Gallery Section - Client Component for interactivity */}
        <ProductGalleryWrapper
          images={galleryImages}
          productName={product.name}
          productId={product._id}
        />

        {/* Product Info Section - Server + Client Components */}
        <div className="to-primary/20 flex flex-col justify-between bg-linear-to-br from-white/50 px-8 py-6 lg:w-1/2">
          <div className="flex h-full flex-col justify-between gap-6">
            <div className="space-y-6">
              {/* Server Component - Static Product Info */}
              <ProductInfoDisplay
                locale={locale}
                name={product.name}
                description={product.description}
                price={product.price}
                inStock={product.inStock}
                priceRange={priceRange}
              />

              {/* Client Component - Interactive Add to Cart */}
              <ProductAddToCartWrapper
                preloaded={preloaded}
                availableColors={product.availableColors ?? []}
                isPersonalizable={product.isPersonalizable}
                requiresColorSelection={requiresColorSelection}
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
