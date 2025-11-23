"use client";

import { AnimatePresence, motion } from "motion/react";
import { PopoverContent } from "@/components/ui/popover";
import type { PRODUCT_CATEGORY_GROUPS } from "@/constants/categories";

type CategoryGroup = (typeof PRODUCT_CATEGORY_GROUPS)[number];

interface SubcategoryMenuProps {
  group: CategoryGroup;
  isOpen: boolean;
  activeCategory: string;
  activeGroup: string | null;
  onShowAllClick: () => void;
  onSubcategoryClick: (value: string) => void;
}

export function SubcategoryMenu({
  group,
  isOpen,
  activeCategory,
  activeGroup,
  onShowAllClick,
  onSubcategoryClick,
}: SubcategoryMenuProps) {
  return (
    <AnimatePresence mode="wait">
      {isOpen ? (
        <PopoverContent
          asChild
          side="bottom"
          align="center"
          sideOffset={12}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <motion.div
            key={`${group.value}-content`}
            className="hidden flex-col gap-3 sm:flex"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-[0.7rem] font-semibold tracking-[0.35em] text-[rgba(var(--deep-rgb),0.70)] uppercase">
                {group.label}
              </span>
              <button
                type="button"
                onClick={onShowAllClick}
                className="bg-secondary text-on-secondary rounded-full border border-transparent px-3 py-1 text-xs font-semibold shadow-[0_10px_20px_rgba(var(--secondary-rgb),0.25)] transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-[rgba(var(--secondary-rgb),0.4)] focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                All {group.label.toLowerCase()}
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {group.subcategories
                .filter((subcategory) => subcategory.value !== "Any Event")
                .map((subcategory: CategoryGroup["subcategories"][number]) => {
                  const isActiveSubcategory =
                    activeGroup === group.value &&
                    activeCategory === subcategory.value;

                  return (
                    <button
                      key={subcategory.value}
                      type="button"
                      onClick={() => onSubcategoryClick(subcategory.value)}
                      className={`rounded-full border px-3 py-1 text-sm transition-[background-color,border-color,color] duration-150 focus-visible:ring-2 focus-visible:ring-[rgba(var(--secondary-rgb),0.4)] focus-visible:ring-offset-2 focus-visible:outline-none ${
                        isActiveSubcategory
                          ? "bg-secondary text-on-secondary border-transparent shadow-[0_8px_18px_rgba(var(--secondary-rgb),0.25)]"
                          : "text-deep border-[rgba(var(--deep-rgb),0.18)] bg-white/80 hover:border-[rgba(var(--accent-rgb),0.45)]"
                      }`}
                    >
                      {subcategory.label}
                    </button>
                  );
                })}
            </div>
          </motion.div>
        </PopoverContent>
      ) : null}
    </AnimatePresence>
  );
}
