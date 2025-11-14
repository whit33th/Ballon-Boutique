"use client";

import Image from "next/image";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import type { PRODUCT_CATEGORY_GROUPS } from "@/constants/categories";
import { SubcategoryMenu } from "./SubcategoryMenu";

type CategoryGroup = (typeof PRODUCT_CATEGORY_GROUPS)[number];

interface CategoryGroupCardProps {
  group: CategoryGroup;
  isActive: boolean;
  isOpen: boolean;
  activeCategory: string;
  activeGroup: string | null;
  isDesktop: boolean;
  setOpenPopover: (
    value: string | null | ((prev: string | null) => string | null),
  ) => void;
  onGroupSelect: (groupValue: CategoryGroup["value"]) => void;
  onShowAll: (groupValue: CategoryGroup["value"]) => void;
  onSubcategorySelect: (
    value: string,
    groupValue: CategoryGroup["value"],
  ) => void;
}

export function CategoryGroupCard({
  group,
  isActive,
  isOpen,
  activeCategory,
  activeGroup,
  isDesktop,
  setOpenPopover,
  onGroupSelect,
  onShowAll,
  onSubcategorySelect,
}: CategoryGroupCardProps) {
  const hasSubcategories = group.subcategories.length > 0;
  const isHighlighted = isActive || isOpen;

  return (
    <div>
      <Popover
        key={group.value}
        open={isOpen}
        onOpenChange={(open) => {
          if (!hasSubcategories || !isDesktop) {
            setOpenPopover(null);
            return;
          }
          setOpenPopover(open ? group.value : null);
        }}
        modal={false}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            onClick={(event) => {
              if (!hasSubcategories) {
                onGroupSelect(group.value);
                return;
              }

              if (isDesktop) {
                event.preventDefault();
                setOpenPopover((previous: string | null) =>
                  previous === group.value ? null : group.value,
                );
                return;
              }

              onShowAll(group.value);
            }}
            className={`relative h-full min-h-18 w-full rounded-2xl border px-3 py-3 text-left transition-[background-color,box-shadow,border-color] duration-200 ${
              isHighlighted
                ? "bg-accent text-on-accent border-transparent shadow-[0_18px_28px_rgba(var(--accent-rgb),0.28)]"
                : "text-deep border-[rgba(var(--deep-rgb),0.1)] bg-[rgba(var(--primary-rgb),0.92)] hover:border-[rgba(var(--accent-rgb),0.4)]"
            }`}
            aria-expanded={hasSubcategories ? isOpen : undefined}
          >
            {group.icon ? (
              <div className="pointer-events-none absolute top-1/2 right-3 z-0 -translate-y-1/2">
                <div className="relative aspect-square overflow-hidden rounded-lg opacity-90">
                  <Image
                    src={group.icon}
                    alt={group.label}
                    width={48}
                    height={48}
                    className="aspect-square object-cover object-center"
                  />
                </div>
              </div>
            ) : null}

            <div className="relative z-10 flex min-h-12 flex-col justify-center pr-14">
              <span className="text-[0.95rem] leading-tight font-semibold">
                {group.label}
              </span>
              {group.description ? (
                <span
                  className={`mt-0.5 text-xs ${
                    isHighlighted
                      ? "text-white/80"
                      : "text-[rgba(var(--deep-rgb),0.6)]"
                  }`}
                >
                  {group.description}
                </span>
              ) : null}
            </div>
          </button>
        </PopoverTrigger>

        {hasSubcategories ? (
          <SubcategoryMenu
            group={group}
            isOpen={isOpen}
            activeCategory={activeCategory}
            activeGroup={activeGroup}
            onShowAllClick={() => onShowAll(group.value)}
            onSubcategoryClick={(value) =>
              onSubcategorySelect(value, group.value)
            }
          />
        ) : null}
      </Popover>
    </div>
  );
}
