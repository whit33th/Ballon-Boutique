"use client";

import type { PRODUCT_CATEGORY_GROUPS } from "@/constants/categories";

type CategoryGroup = (typeof PRODUCT_CATEGORY_GROUPS)[number];

interface MobileSubcategoryCarouselProps {
  group: CategoryGroup;
  activeCategory: string;
  activeGroup: string | null;
  onShowAll: (groupValue: CategoryGroup["value"]) => void;
  onSubcategorySelect: (
    value: string,
    groupValue: CategoryGroup["value"],
  ) => void;
}

export function MobileSubcategoryCarousel({
  group,
  activeCategory,
  activeGroup,
  onShowAll,
  onSubcategorySelect,
}: MobileSubcategoryCarouselProps) {
  if (group.subcategories.length === 0) {
    return null;
  }

  return (
    <div className="-mx-1 mt-2 sm:hidden">
      <div className="relative">
        <div className="pointer-events-none absolute top-0 left-0 h-full w-6 bg-linear-to-r from-[rgba(var(--primary-rgb),0.45)] to-transparent" />
        <div className="pointer-events-none absolute top-0 right-0 h-full w-6 bg-linear-to-l from-[rgba(var(--primary-rgb),0.45)] to-transparent" />
        <div className="flex gap-2 overflow-x-auto px-1 pb-2">
          <button
            type="button"
            onClick={() => onShowAll(group.value)}
            className={`shrink-0 rounded-full border px-3 py-1 text-sm transition-[background-color,border-color,color] duration-150 focus-visible:ring-2 focus-visible:ring-[rgba(var(--secondary-rgb),0.4)] focus-visible:ring-offset-2 focus-visible:outline-none ${
              activeGroup === group.value && !activeCategory
                ? "bg-secondary text-on-secondary border-transparent shadow-[0_8px_18px_rgba(var(--secondary-rgb),0.25)]"
                : "text-deep border-[rgba(var(--deep-rgb),0.18)] bg-white/80 hover:border-[rgba(var(--accent-rgb),0.45)]"
            }`}
          >
            All {group.label.toLowerCase()}
          </button>
          {group.subcategories.map((subcategory) => {
            const isActive =
              activeGroup === group.value &&
              activeCategory === subcategory.value;
            return (
              <button
                key={subcategory.value}
                type="button"
                onClick={() =>
                  onSubcategorySelect(subcategory.value, group.value)
                }
                className={`shrink-0 rounded-full border px-3 py-1 text-sm transition-[background-color,border-color,color] duration-150 focus-visible:ring-2 focus-visible:ring-[rgba(var(--secondary-rgb),0.4)] focus-visible:ring-offset-2 focus-visible:outline-none ${
                  isActive
                    ? "bg-secondary text-on-secondary border-transparent shadow-[0_8px_18px_rgba(var(--secondary-rgb),0.25)]"
                    : "text-deep border-[rgba(var(--deep-rgb),0.18)] bg-white/80 hover:border-[rgba(var(--accent-rgb),0.45)]"
                }`}
              >
                {subcategory.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
