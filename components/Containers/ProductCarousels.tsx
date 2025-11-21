"use client";

import { type Preloaded, usePreloadedQuery } from "convex/react";
import { AnimatedSection } from "@/components/ui/animated-section";
import { ProductCarousel } from "@/components/ui/carousels/product-carousel";
import type { api } from "@/convex/_generated/api";

interface ProductCarouselsProps {
  preloadedBestsellers: Preloaded<typeof api.products.list>;
  preloadedNewArrivals: Preloaded<typeof api.products.list>;
}

export function ProductCarousels({
  preloadedBestsellers,
  preloadedNewArrivals,
}: ProductCarouselsProps) {
  // Use preloaded query for instant data - no loading state!
  const bestsellersResult = usePreloadedQuery(preloadedBestsellers);
  const newArrivalsResult = usePreloadedQuery(preloadedNewArrivals);

  const bestsellersProducts = bestsellersResult?.page ?? [];
  const newArrivalsProducts = newArrivalsResult?.page ?? [];

  return (
    <>
      {/* Bestsellers Carousel */}
      <AnimatedSection>
        {bestsellersProducts.length > 0 ? (
          <ProductCarousel
            data={bestsellersProducts}
            label="Bestselling"
            secondaryLabel="Products"
            transitionGroup="bestseller"
          />
        ) : (
          <div className="flex h-32 items-center justify-center">
            <div className="text-center text-gray-500">
              No products available
            </div>
          </div>
        )}
      </AnimatedSection>

      {/* New Products Carousel */}
      <AnimatedSection>
        {newArrivalsProducts.length > 0 ? (
          <ProductCarousel
            data={newArrivalsProducts}
            label="New"
            secondaryLabel="Arrivals"
            transitionGroup="new-arrival"
          />
        ) : (
          <div className="flex h-32 items-center justify-center">
            <div className="text-center text-gray-500">
              No products available
            </div>
          </div>
        )}
      </AnimatedSection>
    </>
  );
}
