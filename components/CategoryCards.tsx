"use client";

import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import type { CategoryGroup } from "@/constants/categories";

// We render category-like cards (styled similarly to ProductCard) but they
// should link to the catalog filtered by category, not product details.

interface CategoryCardsProps {
  group: CategoryGroup;
}

// No longer rendering ProductCard directly so these types are unused.

export default function CategoryCards({ group }: CategoryCardsProps) {
  const fallbackImages = [
    "/baloons2.png",
    "/baloons3.png",
    "/imgs/cat.png",
    "/baloons4.png",
  ];

  // Provide specific images for well-known subcategories for better clarity.
  // Keys are normalized (lowercase) subcategory values.
  const SUBCATEGORY_IMAGES: Record<string, string> = {
    "for kids boys": "/imgs/baloonsGif/1.jpg",
    "for kids girls": "/imgs/baloonsGif/2.jpg",
    "for her": "/imgs/categories/balloons.jpg",
    "for him": "/imgs/categories/balloon-in-toys.jpg",
    love: "/imgs/categories/mini-sets.jpg",
    mom: "/imgs/baloonsGif/3.jpg",
    anniversary: "/imgs/baloonsGif/4.jpg",
    "baby birth": "/imgs/cat.png",
    "surprise box": "/imgs/baloonsGif/3.jpg",
    "any event": "/imgs/categories/balloon-bouquets.jpg",
  };

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="border-foreground grid w-full grid-cols-2 border-t sm:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] 2xl:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]"
    >
      {group.subcategories.map((subcategory, index) => {
        const normalized = subcategory.value.toLowerCase();
        const imgFromMap = SUBCATEGORY_IMAGES[normalized];
        const img =
          imgFromMap ??
          (group.icon as string | undefined) ??
          fallbackImages[index % fallbackImages.length];
        const href = {
          pathname: "/catalog",
          query: {
            categoryGroup: group.value,
            category: subcategory.value,
          },
        } as const;

        return (
          <Link
            key={subcategory.value}
            href={href}
            className="focus-visible:ring-accent focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <div
              className={`border-foreground flex h-full flex-col border-r border-b`}
            >
              <div
                className="relative aspect-square w-full"
                style={{ backgroundColor: "#f6f7fb" }}
              >
                <Image
                  src={img}
                  alt={subcategory.label}
                  fill
                  className="object-cover"
                />
              </div>

              <div className="border-foreground relative flex flex-col gap-1 border-t px-4 py-3">
                <h3 className="text-sm leading-tight wrap-break-word">
                  {subcategory.label}
                </h3>
                <span className="text-sm font-semibold text-black/70">
                  Browse sets
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </motion.section>
  );
}
