"use client";

import { type Preloaded, usePreloadedQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import { ProductFilters } from "@/components/Containers/ProductFilters/ProductFilters";
import { ProductGrid } from "@/components/ProductGrid";
import type { api } from "@/convex/_generated/api";

interface CatalogClientProps {
  preloaded: Preloaded<typeof api.products.list>;
}

export default function CatalogClient({ preloaded }: CatalogClientProps) {
  usePreloadedQuery(preloaded);
  const searchParams = useSearchParams();

  const filters = {
    search: searchParams.get("search") || "",
    minPrice: searchParams.get("minPrice") || "",
    maxPrice: searchParams.get("maxPrice") || "",
    available: searchParams.get("available") || "",
    sale: searchParams.get("sale") || "",
    category: searchParams.get("category") || "",
    sort: searchParams.get("sort") || "",
    tag: searchParams.get("tag") || "",
    color: searchParams.get("color") || "",
    size: searchParams.get("size") || "",
  };

  return (
    <div className="flex h-full w-full flex-1 flex-col">
      <ProductFilters />
      <ProductGrid filters={filters} />
    </div>
  );
}
