"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
  CATEGORY_TO_GROUP,
  PRODUCT_CATEGORY_GROUPS,
} from "@/constants/categories";
import { FiltersDrawer } from "./FiltersDrawer";
import { SearchInput } from "./SearchInput";
import { SortByButton } from "./SortByButton";

type CategoryGroupValue = (typeof PRODUCT_CATEGORY_GROUPS)[number]["value"];

const CATEGORY_ALIASES: Record<string, string> = {
  "For Kids": "For Kids Boys",
  "For Any Event": "Any Event",
  "Surprise in a Balloon": "Toy in a Balloon",
  "Mini Gift Sets": "Mini Sets",
};

const ALLOWED_GROUP_VALUES = new Set(
  PRODUCT_CATEGORY_GROUPS.map((group) => group.value),
);

const normalizeGroupValue = (
  value: string | null,
): CategoryGroupValue | null => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim().toLowerCase();
  return ALLOWED_GROUP_VALUES.has(trimmed as CategoryGroupValue)
    ? (trimmed as CategoryGroupValue)
    : null;
};

export function ProductFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawGroupParam = searchParams.get("categoryGroup");
  const rawCategoryParam = searchParams.get("category");

  const normalizedCategory = useMemo(() => {
    if (!rawCategoryParam) {
      return undefined;
    }
    const trimmed = rawCategoryParam.trim();
    return CATEGORY_ALIASES[trimmed] ?? trimmed;
  }, [rawCategoryParam]);

  const normalizedGroup = normalizeGroupValue(rawGroupParam);
  const derivedGroup = normalizedCategory
    ? (CATEGORY_TO_GROUP[normalizedCategory] ?? null)
    : null;
  const activeGroup = normalizedGroup ?? derivedGroup ?? null;
  const _activeCategory = normalizedCategory ?? "";
  const selectedGroup = useMemo(() => {
    if (activeGroup) {
      return (
        PRODUCT_CATEGORY_GROUPS.find((group) => group.value === activeGroup) ??
        PRODUCT_CATEGORY_GROUPS[0] ??
        null
      );
    }
    return PRODUCT_CATEGORY_GROUPS[0] ?? null;
  }, [activeGroup]);

  const _shouldShowMobileCarousel = Boolean(
    selectedGroup && selectedGroup.subcategories.length > 0,
  );

  const _handleNavigate = useCallback(
    (params: URLSearchParams) => {
      const queryString = params.toString();
      router.push(queryString ? `/catalog?${queryString}` : "/catalog");
    },
    [router],
  );

  // const _handleGroupSelect = useCallback(
  //   (groupValue: CategoryGroupValue) => {
  //     const params = new URLSearchParams(searchParams.toString());

  //     // Если кликаем на ту же группу и нет выбранной подкатегории (или выбрана, но мы хотим очистить)
  //     if (activeGroup === groupValue && !activeCategory) {
  //       params.delete("categoryGroup");
  //       params.delete("category");
  //       params.delete("search");
  //       handleNavigate(params);
  //       return;
  //     }

  //     // Если кликаем на ту же группу, но есть выбранная подкатегория - очищаем и категорию
  //     if (activeGroup === groupValue && activeCategory) {
  //       params.delete("categoryGroup");
  //       params.delete("category");
  //       params.delete("search");
  //       handleNavigate(params);
  //       return;
  //     }

  //     params.set("categoryGroup", groupValue);

  //     const group = PRODUCT_CATEGORY_GROUPS.find(
  //       (candidate) => candidate.value === groupValue,
  //     );

  //     if (group && group.subcategories.length === 0 && group.categoryValue) {
  //       params.set("category", group.categoryValue);
  //     } else {
  //       params.delete("category");
  //     }

  //     handleNavigate(params);
  //   },
  //   [activeGroup, activeCategory, handleNavigate, searchParams],
  // );

  // const _handleShowAllInGroup = useCallback(
  //   (groupValue?: CategoryGroupValue) => {
  //     const targetGroup = groupValue ?? activeGroup;
  //     if (!targetGroup) {
  //       return;
  //     }
  //     const params = new URLSearchParams(searchParams.toString());

  //     // Если это та же группа и нет категории - убираем группу полностью
  //     if (activeGroup === targetGroup && !activeCategory) {
  //       params.delete("categoryGroup");
  //       params.delete("category");
  //       params.delete("search");
  //     } else {
  //       // Иначе показываем все в группе (удаляем категорию и поиск)
  //       params.delete("category");
  //       params.delete("search");
  //       params.set("categoryGroup", targetGroup);
  //     }

  //     handleNavigate(params);
  //   },
  //   [activeGroup, activeCategory, handleNavigate, searchParams],
  // );

  // const _handleSubcategorySelect = useCallback(
  //   (subcategoryValue: string, groupValue?: CategoryGroupValue) => {
  //     const targetGroup = groupValue ?? activeGroup;
  //     if (!targetGroup) {
  //       return;
  //     }
  //     const params = new URLSearchParams(searchParams.toString());
  //     const isSameGroup = targetGroup === activeGroup;

  //     // Если кликаем на ту же подкатегорию - очищаем её
  //     if (isSameGroup && activeCategory === subcategoryValue) {
  //       params.delete("category");
  //       params.delete("categoryGroup");
  //       params.delete("search");
  //     } else {
  //       // Если выбираем другую подкатегорию
  //       params.set("category", subcategoryValue);
  //       params.set("categoryGroup", targetGroup);
  //     }

  //     handleNavigate(params);
  //   },
  //   [activeCategory, activeGroup, handleNavigate, searchParams],
  // );

  return (
    <div className="relative flex flex-col gap-3 rounded-3xl px-4 py-4 shadow-[0_12px_40px_rgba(var(--deep-rgb),0.04)] sm:gap-4 sm:px-7 sm:py-6">
      {/* <div className="grid auto-rows-fr grid-cols-2 gap-2 sm:grid-cols-4">
        {PRODUCT_CATEGORY_GROUPS.map((group) => {
          const isActiveGroup = activeGroup === group.value;

          return (
            <CategoryGroupCard
              key={group.value}
              group={group}
              isActive={isActiveGroup}
              activeCategory={activeCategory}
              activeGroup={activeGroup}
              onGroupSelect={handleGroupSelect}
              onShowAll={handleShowAllInGroup}
              onSubcategorySelect={handleSubcategorySelect}
            />
          );
        })}
      </div> */}

      {/* {shouldShowMobileCarousel && selectedGroup ? (
        <MobileSubcategoryCarousel
          group={selectedGroup}
          activeCategory={activeCategory}
          activeGroup={activeGroup}
          onShowAll={handleShowAllInGroup}
          onSubcategorySelect={handleSubcategorySelect}
        />
      ) : null} */}

      <div className="block sm:hidden">
        <SearchInput />
      </div>

      <div className="grid w-full grid-cols-[auto_1fr_auto] gap-6 overflow-x-visible sm:gap-8">
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
