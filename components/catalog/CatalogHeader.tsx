import type { CategoryDescriptor, CategoryGroup } from "@/constants/categories";

interface CatalogHeaderProps {
  group: CategoryGroup | null;
  subcategory: CategoryDescriptor | null;
}

export function CatalogHeader({ group, subcategory }: CatalogHeaderProps) {
  return (
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
    </div>
  );
}

