"use client";

import { motion } from "motion/react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { CategoryGroup } from "@/constants/categories";
import { Link } from "@/i18n/routing";

// We render category-like cards (styled similarly to ProductCard) but they
// should link to the catalog filtered by category, not product details.

interface CategoryCardsProps {
  group: CategoryGroup;
}

// No longer rendering ProductCard directly so these types are unused.
const SUBCATEGORY_IMAGES: Record<string, Record<string, string>> = {
  balloons: {
    "for kids boys": "/imgs/subcategories/balloons/kids-for-him.webp",
    "for kids girls": "/imgs/subcategories/balloons/kids-for-her.webp",
    "for her": "/imgs/subcategories/balloons/for-her.webp",
    "for him": "/imgs/subcategories/balloons/for-him.webp",
    love: "/imgs/subcategories/balloons/love.webp",
    mom: "/imgs/subcategories/balloons/mom.webp",
    anniversary: "/imgs/subcategories/balloons/anniversary.webp",
    "baby birth": "/imgs/subcategories/balloons/baby-birth.webp",
    "surprise box": "/imgs/subcategories/balloons/surprise-box.webp",
  },
  "balloon-bouquets": {
    "for kids boys": "/imgs/subcategories/balloons/kids-for-him.webp", // TODO: Add unique image
    "for kids girls": "/imgs/subcategories/balloons/kids-for-her.webp", // TODO: Add unique image
    "for her": "/imgs/subcategories/bouquets/for-her.webp",
    "for him": "/imgs/subcategories/bouquets/for-him.webp",
  },
  "mini-sets": {
    "mini sets · for kids": "/imgs/subcategories/mini-sets/mini-sets-kids.webp",
    "mini sets · for him":
      "/imgs/subcategories/mini-sets/mini-sets-for-him.webp",
    "mini sets · for her":
      "/imgs/subcategories/mini-sets/mini-sets-for-her.webp",
  },
};

export default function CategoryCards({ group }: CategoryCardsProps) {
  const tHome = useTranslations("home");
  const tCatalog = useTranslations("catalog");

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="border-foreground grid w-full grid-cols-2 border-t sm:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] 2xl:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]"
    >
      {group.subcategories.map((subcategory) => {
        const normalized = subcategory.value.toLowerCase();
        const imgFromMap =
          SUBCATEGORY_IMAGES[group.value]?.[normalized] ?? group.icon;

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
                  alt={tCatalog(`subcategories.${subcategory.value}`)}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, (max-width: 1280px) 260px, 300px"
                />
              </div>

              <div className="border-foreground relative flex flex-col gap-1 border-t px-4 py-3">
                <h3 className="text-sm leading-tight wrap-break-word">
                  {tCatalog(`subcategories.${subcategory.value}`)}
                </h3>
                <span className="text-sm font-semibold text-black/70">
                  {tHome("browseSets")}
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </motion.section>
  );
}
