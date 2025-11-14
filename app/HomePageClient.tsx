"use client";

import { type Preloaded, usePreloadedQuery } from "convex/react";
import { motion } from "motion/react";
import { CategorySection } from "@/components/CategorySection";
import { Hero } from "@/components/Containers";
import { ProductCarousel } from "@/components/ui/carousels/product-carousel";
import RainbowArcText from "@/components/ui/rainbow-text";
import type { api } from "@/convex/_generated/api";

interface HomePageClientProps {
  preloadedBestsellers: Preloaded<typeof api.products.list>;
  preloadedNewArrivals: Preloaded<typeof api.products.getNewProducts>;
}

export function HomePageClient({
  preloadedBestsellers,
  preloadedNewArrivals,
}: HomePageClientProps) {
  // Use preloaded query for instant data - no loading state!
  const bestsellersProduct = usePreloadedQuery(preloadedBestsellers);
  const newProducts = usePreloadedQuery(preloadedNewArrivals);

  return (
    <main className="flex min-h-screen flex-col">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <Hero />
      </motion.div>

      <div className="flex flex-col gap-6">
        <CategorySection />

        {/* Bestsellers Carousel - Instant data from SSR */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {bestsellersProduct?.page && bestsellersProduct.page.length > 0 ? (
            <ProductCarousel
              data={bestsellersProduct.page}
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
        </motion.div>

        {/* New Products Carousel */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {newProducts?.page && newProducts.page.length > 0 ? (
            <ProductCarousel
              data={newProducts.page}
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
        </motion.div>
      </div>

      {/* Rainbow Text */}

      <RainbowArcText
        className="py-5 text-[10vw] sm:text-[8vw]"
        text="Lift Your Day"
      />
    </main>
  );
}
