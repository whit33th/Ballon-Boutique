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
  const SUBCATEGORY_IMAGES: Record<string, string> = {
    "for kids boys": "/imgs/subcategories/balloons/kids-for-him.jpg",
    "for kids girls": "/imgs/subcategories/balloons/kids-for-her.jpg",
    "for her": "/imgs/subcategories/balloons/for-her.jpg",
    "for him": "/imgs/subcategories/balloons/for-him.jpg",
    love: "/imgs/subcategories/balloons/love.jpg",
    mom: "/imgs/subcategories/balloons/mom.jpg",
    anniversary: "/imgs/subcategories/balloons/anniversary.jpg",
    "baby birth": "/imgs/subcategories/balloons/baby-birth.jpg",
    "surprise box": "/imgs/subcategories/balloons/surprise-box.jpg",
  };

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="border-foreground grid w-full grid-cols-2 border-t sm:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] 2xl:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]"
    >
      {group.subcategories.map((subcategory) => {
        const normalized = subcategory.value.toLowerCase();
        const imgFromMap = SUBCATEGORY_IMAGES[normalized];

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
                  src={imgFromMap}
                  alt={subcategory.label}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, (max-width: 1280px) 260px, 300px"
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
