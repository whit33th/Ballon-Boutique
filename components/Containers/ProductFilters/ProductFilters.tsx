"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { CategoriesIconCarousel } from "@/app/catalog/_components/CategoriesIconCarousel";
import { CATEGORIES } from "@/constants/config";
import { FiltersDrawer } from "./FiltersDrawer";
import { SearchInput } from "./SearchInput";
import { SortByButton } from "./SortByButton";

export function ProductFilters() {
  // Массив категорий для карусели из конфигурации
  const router = useRouter();
  const searchParams = useSearchParams();
  const categories = [...CATEGORIES];
  const activeCategory = searchParams.get("category") ?? undefined;

  const handleCategorySelect = useCallback(
    (categoryValue: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (!categoryValue) {
        params.delete("category");
      } else if (categoryValue === activeCategory) {
        params.delete("category");
      } else {
        params.set("category", categoryValue);
      }

      const queryString = params.toString();
      router.push(queryString ? `/catalog?${queryString}` : "/catalog");
    },
    [activeCategory, router, searchParams],
  );

  return (
    <div className="py-BALLOON_CATEGORIES2 flex flex-col gap-1.5 px-4 py-1 sm:gap-3 sm:px-8 sm:py-3">
      <CategoriesIconCarousel
        categories={categories}
        activeCategory={activeCategory}
        onCategorySelect={handleCategorySelect}
      />
      <div className="block sm:hidden">
        <SearchInput />
      </div>
      <div className="grid w-full grid-cols-[auto_1fr_auto] gap-10 overflow-x-visible">
        <div className="justify-self-start">
          <SortByButton />
        </div>

        <div className="w-full max-w-xl justify-self-center">
          <div className="hidden sm:block">
            <SearchInput />
          </div>
        </div>

        <div className="justify-self-end">
          <FiltersDrawer />
        </div>
      </div>
    </div>
  );
}
