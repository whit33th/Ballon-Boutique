import { ProductFilters } from "@/components/Containers/ProductFilters/ProductFilters";
import { ProductGrid } from "@/components/ProductGrid";
import {
  type CategoryGroupValue,
  PRODUCT_CATEGORY_GROUPS,
} from "@/constants/categories";

const normalizeGroup = (value?: string | null): CategoryGroupValue | null => {
  if (!value) return null;
  let normalized = value;
  try {
    normalized = decodeURIComponent(value);
  } catch {
    normalized = value;
  }
  normalized = normalized
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");

  const byValue = PRODUCT_CATEGORY_GROUPS.find((c) => c.value === normalized);
  if (byValue) return byValue.value;

  const byLabel = PRODUCT_CATEGORY_GROUPS.find(
    (c) => c.label.toLowerCase().replace(/[_\s]+/g, "-") === normalized,
  );
  if (byLabel) return byLabel.value;

  const byCategoryValue = PRODUCT_CATEGORY_GROUPS.find(
    (c) =>
      (c.categoryValue ?? "").toLowerCase().replace(/[_\s]+/g, "-") ===
      normalized,
  );
  if (byCategoryValue) return byCategoryValue.value;

  const partial = PRODUCT_CATEGORY_GROUPS.find((c) =>
    normalized.includes(c.value),
  );
  if (partial) return partial.value;

  return null;
};

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  const filters = {
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
  const group = PRODUCT_CATEGORY_GROUPS.find(
    (candidate) => candidate.value === normalizedGroup,
  );

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
      <div className="relative">
        <div className="grid grid-cols-1 items-center gap-6 p-4 pb-0 sm:grid-cols-[1fr_auto] sm:p-8 sm:pb-0">
          <div className="relative z-10 flex flex-col gap-3 sm:pr-6">
            <div className="text-deep/50 flex flex-wrap items-center gap-3 text-xs font-semibold tracking-[0.35em] uppercase">
              <span>Catalog</span>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-4 sm:flex-nowrap">
                <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
                  {group ? group.label : "All Products"}
                </h1>
                {group && subcategory ? (
                  <span className="inline-flex items-center gap-3 self-center">
                    <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 shadow-sm ring-1 ring-slate-100">
                      <span className="h-2 w-2 rounded-full bg-slate-500" />
                      <span className="text-lg font-medium text-slate-700 sm:text-xl">
                        {subcategory.label}
                      </span>
                    </span>
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* {group.icon ? (
            <div className="relative z-10 hidden aspect-square w-24 flex-none justify-self-end overflow-hidden rounded-2xl border border-white/60 bg-linear-to-br from-white to-slate-50 shadow-inner sm:block sm:w-36">
              <Image
                src={group.icon}
                alt={group.label}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 40vw"
                priority
              />
            </div>
          ) : null} */}
      </div>
      <ProductFilters />
      <ProductGrid filters={filters} />
    </div>
  );
}
