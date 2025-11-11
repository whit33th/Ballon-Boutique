"use client";

import { useSearchParams } from "next/navigation";
import { ProductFilters } from "@/components/Containers/ProductFilters/ProductFilters";
import { ProductGrid } from "@/components/ProductGrid";

export default function CatalogClient() {
  const searchParams = useSearchParams();

  const filters = {
    search: searchParams.get("search") || "",
    minPrice: searchParams.get("minPrice") || "",
    maxPrice: searchParams.get("maxPrice") || "",
    available: searchParams.get("available") || "",
    sale: searchParams.get("sale") || "",
    category: searchParams.get("category") || "",
    categoryGroup: searchParams.get("categoryGroup") || "",
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
