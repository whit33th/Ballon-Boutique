"use client";

import { type Preloaded, usePreloadedQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { AnimatedSection } from "@/components/ui/animated-section";
import { ProductCarousel } from "@/components/ui/carousels/product-carousel";
import type { api } from "@/convex/_generated/api";

interface ProductCarouselsProps {
  preloadedDiscounted: Preloaded<typeof api.products.listDiscounted>;
  preloadedBestsellers: Preloaded<typeof api.products.list>;
  preloadedNewArrivals: Preloaded<typeof api.products.list>;
}

export function ProductCarousels({
  preloadedDiscounted,
  preloadedBestsellers,
  preloadedNewArrivals,
}: ProductCarouselsProps) {
  const t = useTranslations("home");
  // Use preloaded query for instant data - no loading state!
  const discountedResult = usePreloadedQuery(preloadedDiscounted);
  const bestsellersResult = usePreloadedQuery(preloadedBestsellers);
  const newArrivalsResult = usePreloadedQuery(preloadedNewArrivals);

  const discountedProducts = discountedResult?.page ?? [];
  const bestsellersProducts = bestsellersResult?.page ?? [];
  const newArrivalsProducts = newArrivalsResult?.page ?? [];

  return (
    <>
      {/* Discounts Carousel */}
      <AnimatedSection>
        {discountedProducts.length > 0 ? (
          <ProductCarousel
            data={discountedProducts}
            label={t("discounts")}
            secondaryLabel={t("products")}
            transitionGroup="discounts"
            imageSizes="(max-width: 639px) 40vw, (max-width: 767px) 28.57vw, (max-width: 1023px) 22.22vw, (max-width: 1279px) 18.18vw, 15.38vw"
          />
        ) : null}
      </AnimatedSection>

      {/* Bestsellers Carousel */}
      <AnimatedSection>
        {bestsellersProducts.length > 0 ? (
          <ProductCarousel
            data={bestsellersProducts}
            label={t("bestselling")}
            secondaryLabel={t("products")}
            transitionGroup="bestseller"
            imageSizes="(max-width: 639px) 40vw, (max-width: 767px) 28.57vw, (max-width: 1023px) 22.22vw, (max-width: 1279px) 18.18vw, 15.38vw"
          />
        ) : (
          <div className="flex h-32 items-center justify-center">
            <div className="text-center text-gray-500">
              {t("noProductsAvailable")}
            </div>
          </div>
        )}
      </AnimatedSection>

      {/* New Products Carousel */}
      <AnimatedSection>
        {newArrivalsProducts.length > 0 ? (
          <ProductCarousel
            data={newArrivalsProducts}
            label={t("new")}
            secondaryLabel={t("arrivals")}
            transitionGroup="new-arrival"
            imageSizes="(max-width: 639px) 40vw, (max-width: 767px) 28.57vw, (max-width: 1023px) 22.22vw, (max-width: 1279px) 18.18vw, 15.38vw"
          />
        ) : (
          <div className="flex h-32 items-center justify-center">
            <div className="text-center text-gray-500">
              {t("noProductsAvailable")}
            </div>
          </div>
        )}
      </AnimatedSection>
    </>
  );
}
