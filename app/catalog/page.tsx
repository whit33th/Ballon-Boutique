import { Suspense } from "react";
import { CatalogHeader } from "@/components/catalog/CatalogHeader";
import { PRODUCT_CATEGORY_GROUPS } from "@/constants/categories";
import { normalizeGroup } from "@/lib/catalog-utils";
import CatalogPage from "./ClientPage";

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

export default async function CatalogPageServer({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  const filters: ProductGridFilters = {
    search: (params.search as string) || "",
    minPrice: (params.minPrice as string) || "",
    maxPrice: (params.maxPrice as string) || "",
    available: (params.available as string) || "",
    sale: (params.sale as string) || "",
    category: (params.category as string) || "",
    categoryGroup: (params.categoryGroup as string) || "",
    sort: (params.sort as string) || "",
    order: (params.order as string) || "",
    tag: (params.tag as string) || "",
    color: (params.color as string) || "",
  };

  const normalizedGroup = normalizeGroup(filters.categoryGroup);
  const group = normalizedGroup
    ? (PRODUCT_CATEGORY_GROUPS.find(
        (candidate) => candidate.value === normalizedGroup,
      ) ?? null)
    : null;

  const categoryParam = filters.category;
  const normalizedCategory = categoryParam
    ? categoryParam.toLowerCase().trim()
    : "";
  const subcategory =
    group?.subcategories.find(
      (s) => s.value.toLowerCase() === normalizedCategory,
    ) ?? null;

  return (
    <div className="flex h-full w-full flex-1 flex-col">
      <CatalogHeader group={group} subcategory={subcategory} />
      <Suspense>
        <CatalogPage filters={filters} />
      </Suspense>
    </div>
  );
}
