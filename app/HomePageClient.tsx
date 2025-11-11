"use client";

import { type Preloaded, usePreloadedQuery } from "convex/react";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { Hero } from "@/components/Containers";
import { ProductCarousel } from "@/components/ui/carousels/product-carousel";
import RainbowArcText from "@/components/ui/rainbow-text";
import { PRODUCT_CATEGORY_GROUPS } from "@/constants/categories";
import type { api } from "@/convex/_generated/api";

interface HomePageClientProps {
  preloadedBestsellers: Preloaded<typeof api.products.getNewProducts>;
  preloadedNewProducts: Preloaded<typeof api.products.getNewProducts>;
}

export function HomePageClient({
  preloadedBestsellers,
  preloadedNewProducts,
}: HomePageClientProps) {
  // Use preloaded query for instant data - no loading state!
  const bestsellersProduct = usePreloadedQuery(preloadedBestsellers);
  const newProducts = usePreloadedQuery(preloadedNewProducts);

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
            />
          ) : null}
        </motion.div>

        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative w-full overflow-hidden"
        >
          <div className="flex items-center justify-between p-4 px-4">
            <h2 className="flex max-w-2xl gap-1.5 truncate text-xl leading-tight md:text-2xl">
              <span>Shop by</span>
              <span>✧</span>
              <span>Category</span>
            </h2>
          </div>
          <div className="border-foreground grid w-full grid-cols-2 gap-0 border-t border-l sm:grid-cols-4">
            {PRODUCT_CATEGORY_GROUPS.map((group, index) => {
              const directCategory =
                group.subcategories.length === 0
                  ? group.categoryValue
                  : undefined;
              const query: Record<string, string> = {
                categoryGroup: group.value,
              };
              if (directCategory) {
                query.category = directCategory;
              }
              const href = { pathname: "/catalog" as const, query };

              // Assign colors based on category - matching product card theme
              const balloonColors = [
                "#FFB3BA", // pastel pink
                "#BAFFC9", // pastel green
                "#BAE1FF", // pastel blue
                "#FFFFBA", // pastel yellow
                "#FFD4BA", // pastel orange
                "#E0BBE4", // pastel purple
              ];
              const colorIndex = index % balloonColors.length;
              const bgColor = balloonColors[colorIndex];

              return (
                <Link
                  key={group.value}
                  href={href}
                  className="focus-visible:ring-accent focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  <div className="border-foreground flex h-full flex-col border-r border-b">
                    {/* Category Image with colorful background */}
                    <div
                      className="relative aspect-square w-full sm:aspect-3/4"
                      style={{ backgroundColor: bgColor }}
                    >
                      <Image
                        src={group.icon}
                        alt={group.label}
                        fill
                        className="object-cover"
                        sizes="(min-width: 640px) 25vw, 50vw"
                        priority={index < 2}
                      />
                    </div>

                    {/* Category Info */}
                    <div className="border-foreground relative flex flex-col gap-0.5 border-t px-3 py-2 sm:gap-1 sm:px-4 sm:py-3">
                      <h3 className="text-xs leading-tight font-semibold sm:text-sm">
                        {group.label}
                      </h3>
                      <span className="text-[10px] font-medium text-[rgba(var(--deep-rgb),0.55)] sm:text-xs">
                        {group.subcategories.length > 0
                          ? `${group.subcategories.length} collections`
                          : "View collection"}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </motion.section>
      </div>

      {/* Rainbow Text */}

      <RainbowArcText
        className="py-5 text-[10vw] sm:text-[8vw]"
        text="Lift Your Day"
      />
    </main>
  );
}
