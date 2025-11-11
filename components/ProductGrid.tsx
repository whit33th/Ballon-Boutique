"use client";

import { usePaginatedQuery } from "convex/react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import { calculateItemsToLoad } from "@/lib/pagination";
import { Button } from "./ui/button";
import ProductCard from "./ui/productCard";

type ProductGridFilters = {
  search: string;
  minPrice?: string;
  maxPrice?: string;
  available?: string;
  sale?: string;
  category?: string;
  categoryGroup?: string;
  sort?: string;
  tag?: string;
  color?: string;
  size?: string;
};

interface ProductGridProps {
  filters: ProductGridFilters;
}

// Balloon colors for colorful backgrounds
export const balloonColors = [
  // 9 mid-tones in the same family — intentionally NOT near-white so they
  // keep the palette rich while still contrasting with deep (dark) text.
  "#8EC7F6",
  "#EF476F",
  "#F66E52",
  "#A1D99B",
  "#91E5CF",
  "#FFB5A7",
  "#FFD93D",
];

const SORT_OPTIONS = ["default", "name-asc", "name-desc"] as const;

type SortOption = (typeof SORT_OPTIONS)[number];

const SORT_OPTION_SET = new Set<SortOption>(SORT_OPTIONS);

const TAG_OPTIONS = ["new", "bestseller"] as const;
type TagOption = (typeof TAG_OPTIONS)[number];
const TAG_OPTION_SET = new Set<TagOption>(TAG_OPTIONS);

export function ProductGrid({ filters }: ProductGridProps) {
  const {
    search,
    minPrice,
    maxPrice,
    available,
    sale,
    category,
    categoryGroup,
    sort,
    tag,
    color,
    size,
  } = filters;

  // Calculate items to load based on viewport width
  const [itemsToLoad, setItemsToLoad] = useState<number | null>(null);

  useEffect(() => {
    const updateItemsToLoad = () => {
      setItemsToLoad(calculateItemsToLoad(window.innerWidth));
    };

    // Initial calculation
    updateItemsToLoad();

    // Update on resize
    window.addEventListener("resize", updateItemsToLoad);

    return () => window.removeEventListener("resize", updateItemsToLoad);
  }, []);

  const queryArgs = useMemo(() => {
    const parsePrice = (value?: string) => {
      if (!value) {
        return undefined;
      }
      const parsed = Number(value.trim());
      return Number.isFinite(parsed) ? parsed : undefined;
    };

    const normalizeString = (value?: string) => {
      if (!value) {
        return undefined;
      }

      const replaced = value.replace(/\+/g, " ");
      const trimmed = replaced.trim();
      if (trimmed.length === 0) {
        return undefined;
      }

      try {
        const decoded = decodeURIComponent(trimmed);
        return decoded.length > 0 ? decoded : undefined;
      } catch (_error) {
        return trimmed;
      }
    };

    const normalizeSort = (value?: string) => {
      if (!value) {
        return undefined;
      }
      return SORT_OPTION_SET.has(value as SortOption)
        ? (value as SortOption)
        : undefined;
    };

    const normalizeTag = (value?: string) => {
      if (!value) {
        return undefined;
      }
      return TAG_OPTION_SET.has(value as TagOption)
        ? (value as TagOption)
        : undefined;
    };

    const normalizeSize = (value?: string) => {
      if (!value) {
        return undefined;
      }
      const validSizes = ["30cm", "45cm", "80cm", "100cm"] as const;
      type ValidSize = (typeof validSizes)[number];
      return validSizes.includes(value as ValidSize)
        ? (value as ValidSize)
        : undefined;
    };

    return {
      search: normalizeString(search),
      minPrice: parsePrice(minPrice),
      maxPrice: parsePrice(maxPrice),
      available: available === "true" ? true : undefined,
      sale: sale === "true" ? true : undefined,
      category: normalizeString(category),
      categoryGroup: normalizeString(categoryGroup),
      sort: normalizeSort(sort),
      tag: normalizeTag(tag),
      color: normalizeString(color),
      size: normalizeSize(size),
    } as const;
  }, [
    search,
    minPrice,
    maxPrice,
    available,
    sale,
    category,
    categoryGroup,
    sort,
    tag,
    color,
    size,
  ]);

  const {
    results: products,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.products.list,
    itemsToLoad !== null ? queryArgs : "skip",
    {
      initialNumItems: itemsToLoad ?? 8,
    },
  );
  const isLoadingMore = status === "LoadingMore";

  // Show loading state while calculating viewport width
  if (itemsToLoad === null || status === "LoadingFirstPage") {
    return (
      <motion.div
        initial={{ opacity: 0.6 }}
        animate={{ opacity: 0.8 }}
        transition={{
          duration: 1.2,
          ease: "easeInOut",
          repeat: Infinity,
          repeatType: "reverse",
        }}
        className="border-foreground grid grid-cols-2 border-t sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]"
      >
        {Array.from({ length: 12 }).map((_, index) => (
          <div
            key={`skeleton-${index}`}
            className="border-foreground flex flex-col border-r border-b"
          >
            <div
              className="aspect-3/4 animate-pulse"
              style={{
                backgroundColor: balloonColors[index % balloonColors.length],
              }}
            />
            <div className="px-4 py-3">
              <div className="mb-2 h-4 w-3/4 bg-white/60" />
              <div className="h-4 w-20 bg-white/40" />
            </div>
          </div>
        ))}
      </motion.div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex h-full w-full flex-1 flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 text-6xl">🎈</div>
        <h3 className="mb-2 text-xl font-semibold text-black">
          No balloons found
        </h3>
        <p className="text-black">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Seamless Product Grid - no gaps */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className="border-foreground grid w-full grid-cols-2 border-t sm:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] 2xl:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]"
      >
        {products.map((product, index) => (
          <ProductCard index={index} key={product._id} product={product} />
        ))}
      </motion.section>

      {/* Load More Button */}
      {status === "CanLoadMore" && (
        <div className="px-8 py-12 text-center">
          <Button
            onClick={() => loadMore(itemsToLoad)}
            disabled={status !== "CanLoadMore"}
            className="btn-accent h-12 rounded-lg px-12 font-semibold tracking-wide uppercase transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Load More
          </Button>
        </div>
      )}
      {isLoadingMore && (
        <p
          className="text-deep flex items-center justify-center gap-2 px-8 pb-12 text-sm"
          aria-live="polite"
        >
          <span className="bg-deep h-2 w-2 animate-pulse rounded-full" />
          Loading more balloons…
        </p>
      )}
    </div>
  );
}
