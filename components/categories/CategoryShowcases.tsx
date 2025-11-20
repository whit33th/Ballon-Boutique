import Link from "next/link";
import CategoryCards from "@/components/CategoryCards";
import {
  buildCatalogLink,
  type PRODUCT_CATEGORY_GROUPS,
} from "@/constants/categories";

type CategoryGroup = (typeof PRODUCT_CATEGORY_GROUPS)[number];

export function SelectedGroupShowcase({ group }: { group: CategoryGroup }) {
  const displayGroup =
    group.value === "balloons" || group.value === "balloon-bouquets"
      ? {
          ...group,
          subcategories: group.subcategories.filter(
            (s) => s.value !== "Any Event",
          ),
        }
      : group;

  return (
    <section className="">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="space-y-3 sm:text-left">
          <p className="text-deep/50 flex flex-wrap items-center gap-3 text-xs font-semibold tracking-[0.35em] uppercase">
            Category
          </p>
          <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
            {displayGroup.label}
          </h1>
          <p className="text-sm text-slate-600 sm:text-base">
            {group.description ??
              `Pick a subcollection to jump straight into the catalog.`}
          </p>
        </div>
        <Link
          href={buildCatalogLink(displayGroup.value)}
          className="btn-accent inline-flex items-center justify-center rounded-full px-6 py-2 text-sm font-semibold tracking-wide uppercase"
        >
          View All {displayGroup.label}
        </Link>
      </div>

      <CategoryCards group={displayGroup} />
    </section>
  );
}
