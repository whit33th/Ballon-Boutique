"use client";

import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import {
  buildCatalogLink,
  buildCategoryPagePath,
  PRODUCT_CATEGORY_GROUPS,
} from "@/constants/categories";

export function CategorySection() {
  return (
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
      <div className="border-foreground grid w-full grid-cols-2 gap-0 border-t md:grid-cols-4">
        {PRODUCT_CATEGORY_GROUPS.map((group, index) => {
          const hasSubcategories = group.subcategories.length > 0;
          const href = hasSubcategories
            ? buildCategoryPagePath(group.value)
            : group.categoryValue
              ? buildCatalogLink(group.value, { category: group.categoryValue })
              : buildCatalogLink(group.value);

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
              href={typeof href === "string" ? { pathname: href } : href}
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
                    priority
                    sizes="(max-width: 768px) 50vw, 33vw"
                    loading="eager"
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

        <Link
          href="/catalog"
          className="focus-visible:ring-accent focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <div className="border-foreground flex h-full flex-col border-r border-b">
            <div
              className="relative aspect-square w-full sm:aspect-3/4"
              style={{ backgroundColor: "#f6f7fb" }}
            >
              <Image
                src="/imgs/categories/all-products.webp"
                alt="All Products"
                fill
                className="object-cover"
                priority
                loading="eager"
                sizes="(max-width: 768px) 50vw, 33vw"
              />
            </div>

            <div className="border-foreground relative flex flex-col gap-0.5 border-t px-3 py-2 sm:gap-1 sm:px-4 sm:py-3">
              <h3 className="text-xs leading-tight font-semibold sm:text-sm">
                All Products
              </h3>
              <span className="text-[10px] font-medium text-[rgba(var(--deep-rgb),0.55)] sm:text-xs">
                View all items
              </span>
            </div>
          </div>
        </Link>
      </div>
    </motion.section>
  );
}
