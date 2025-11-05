"use client";

import { type Preloaded, usePreloadedQuery } from "convex/react";
import { Hero } from "@/components/Containers";
import { CategoriesCarousel } from "@/components/ui/categories-carousel";
import { ProductCarousel } from "@/components/ui/product-carousel";
import RainbowArcText from "@/components/ui/rainbow-text";
import { CATEGORIES } from "@/constants/config";
import type { api } from "@/convex/_generated/api";

interface HomePageClientProps {
  preloadedBestsellers: Preloaded<typeof api.products.list>;
}

export function HomePageClient({ preloadedBestsellers }: HomePageClientProps) {
  // Use preloaded query for instant data - no loading state!
  const bestsellersProduct = usePreloadedQuery(preloadedBestsellers);

  // Map categories from config for the carousel
  const categories = CATEGORIES.map((cat) => ({
    name: cat.name,
    image: cat.icon,
    link: "/catalog",
  }));

  return (
    <main className="flex min-h-screen flex-col">
      <Hero />

      {/* Bestsellers Carousel - Instant data from SSR */}
      {bestsellersProduct?.page && bestsellersProduct.page.length > 0 ? (
        <ProductCarousel
          data={bestsellersProduct.page}
          label="Bestselling"
          secondaryLabel="Products"
        />
      ) : (
        <div className="flex h-32 items-center justify-center">
          <div className="text-center text-gray-500">No products available</div>
        </div>
      )}

      {/* Categories Carousel */}
      <CategoriesCarousel categories={categories} />
      <RainbowArcText
        className="py-4 text-[10vw] sm:text-[8vw]"
        text="Lift Your Day"
      />
    </main>
  );
}
