"use client";

import { type Preloaded, usePreloadedQuery, useQuery } from "convex/react";
import { motion } from "motion/react";
import Link from "next/link";
import { Hero } from "@/components/Containers";
import { ProductCarousel } from "@/components/ui/carousels/product-carousel";
import ImageKitPicture from "@/components/ui/ImageKitPicture";
import RainbowArcText from "@/components/ui/rainbow-text";
import { PRODUCT_CATEGORY_GROUPS } from "@/constants/categories";
import { api } from "@/convex/_generated/api";
import { DEFAULT_PRODUCT_IMAGE_TRANSFORMATION } from "@/lib/imagekit";
import Image from "next/image";
import { CategorySection } from "@/components/CategorySection";

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

      {/* Bestsellers Carousel - Instant data from SSR */}
      <div className="flex flex-col gap-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
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
          animate={{ opacity: 1 }}
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

        <CategorySection />
      </div>

      {/* Rainbow Text */}

      <RainbowArcText
        className="py-5 text-[10vw] sm:text-[8vw]"
        text="Lift Your Day"
      />
    </main>
  );
}
