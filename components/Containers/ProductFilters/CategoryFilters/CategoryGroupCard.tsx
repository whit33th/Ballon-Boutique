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
  setOpenPopover: (
    value: string | null | ((prev: string | null) => string | null),
  ) => void;
  setHoveredGroup: (value: string | null) => void;
  onHoverStart: (groupValue: CategoryGroup["value"]) => void;
  onHoverEnd: () => void;
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
  setOpenPopover,
  setHoveredGroup,
  onHoverStart,
  onHoverEnd,
  onGroupSelect,
  onShowAll,
  onSubcategorySelect,
}: CategoryGroupCardProps) {
  const hasSubcategories = group.subcategories.length > 0;

  return (
    <div>
      <Popover
        key={group.value}
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setOpenPopover(null);
            setHoveredGroup(null);
          }
        }}
        modal={false}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            onMouseEnter={() => {
              if (hasSubcategories) {
                onHoverStart(group.value);
              }
            }}
            onMouseLeave={() => {
              if (hasSubcategories) {
                onHoverEnd();
              }
            }}
            onClick={(event) => {
              if (!hasSubcategories) {
                onGroupSelect(group.value);
              } else {
                const shouldKeepPopoverOpen = event.detail === 0;
                onShowAll(group.value);
                if (shouldKeepPopoverOpen) {
                  setOpenPopover((previous: string | null) =>
                    previous === group.value ? null : group.value,
                  );
                }
              }
            }}
            className={`relative h-full min-h-18 w-full rounded-2xl border px-3 py-3 text-left transition-[background-color,box-shadow,border-color] duration-200 ${
              isActive
                ? "bg-accent text-on-accent border-transparent shadow-[0_18px_28px_rgba(var(--accent-rgb),0.28)]"
                : "text-deep border-[rgba(var(--deep-rgb),0.1)] bg-[rgba(var(--primary-rgb),0.92)] hover:border-[rgba(var(--accent-rgb),0.4)]"
            }`}
            aria-expanded={hasSubcategories ? isOpen : undefined}
          >
            {/* Icon positioned absolutely on the right */}
            {group.icon && (
              <div className="pointer-events-none absolute top-1/2 right-3 z-0 -translate-y-1/2">
                <div className="relative h-12 w-12 overflow-hidden rounded-lg opacity-90">
                  <Image
                    src={group.icon}
                    alt={group.label}
                    fill
                    className="object-contain object-center"
                    sizes="48px"
                    priority={false}
                  />
                </div>
              </div>
            )}

            {/* Content */}
            <div className="relative z-10 flex min-h-12 flex-col justify-center pr-14">
              <span className="text-[0.95rem] leading-tight font-semibold">
                {group.label}
              </span>
              {group.description ? (
                <span
                  className={`mt-0.5 text-xs ${
                    isActive
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

        {hasSubcategories && (
          <SubcategoryMenu
            group={group}
            isOpen={isOpen}
            activeCategory={activeCategory}
            activeGroup={activeGroup}
            onHoverStart={onHoverStart}
            onHoverEnd={onHoverEnd}
            onShowAllClick={() => onShowAll(group.value)}
            onSubcategoryClick={(value) =>
              onSubcategorySelect(value, group.value)
            }
          />
        )}
      </Popover>
    </div>
  );
}
