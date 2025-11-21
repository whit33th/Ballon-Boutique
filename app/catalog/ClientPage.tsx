"use client";

import { ProductFilters } from "@/components/Containers/ProductFilters/ProductFilters";
import { ProductGrid } from "@/components/ProductGrid";

type ProductGridFilters = {
  search: string;
  minPrice: string;
  maxPrice: string;
  available: string;
  sale: string;
  category: string;
  categoryGroup: string;
  sort: string;
  order: string;
  tag: string;
  color: string;
};

interface CatalogPageProps {
  filters: ProductGridFilters;
}

export default function CatalogPage({ filters }: CatalogPageProps) {
  return (
    <>
      <ProductFilters />
      <ProductGrid filters={filters} />
    </>
  );
}
