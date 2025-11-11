"use client";

import Image from "next/image";
import { useLayoutEffect, useState } from "react";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousels/carousel";

export interface Category {
  name: string;
  icon: string;
  value?: string;
}

export interface CategoriesCarouselProps {
  categories: Category[];
  className?: string;
  activeCategory?: string;
  onCategorySelect?: (categoryValue: string) => void;
}

export function CategoriesIconCarousel({
  categories,
  className,
  activeCategory,
  onCategorySelect,
}: CategoriesCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [disabled, setDisabled] = useState(false);

  useLayoutEffect(() => {
    if (!api) return;
    const onSelect = () => {
      setDisabled(!api.canScrollNext() && !api.canScrollPrev());
    };
    api.on("select", onSelect);
    onSelect();
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  return (
    <div className={className}>
      <Carousel
        setApi={setApi}
        className="group"
        opts={{
          dragFree: false,
          align: "start",
          slidesToScroll: 5,
        }}
      >
        <CarouselContent className="ml-0 flex justify-around">
          {categories.map((category, index) => {
            const categoryValue = category.value ?? category.name;
            const isAllCategory = categoryValue === "";
            const isActive = isAllCategory
              ? !activeCategory
              : activeCategory === categoryValue;

            return (
              <CarouselItem
                key={category.name}
                className={index === 0 ? "pl-0" : ""}
                style={{ maxWidth: "max-content" }}
              >
                <button
                  type="button"
                  onClick={() => onCategorySelect?.(categoryValue)}
                  className={`focus-visible:ring-secondary/70 flex flex-col items-center rounded-xl px-1 py-1 transition-[transform,box-shadow,opacity] duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
                    isActive ? "opacity-100" : "opacity-80 hover:opacity-100"
                  }`}
                  aria-pressed={isActive}
                >
                  <div
                    className={`relative flex aspect-square h-15 w-15 items-center justify-center rounded-xl ${
                      isActive ? "ring-secondary ring-2" : "ring-border ring-1"
                    }`}
                  >
                    <Image
                      src={category.icon}
                      alt={`${category.name} category`}
                      height={48}
                      width={48}
                      className="aspect-square h-full w-full rounded-xl object-cover text-gray-500 drop-shadow"
                    />
                  </div>
                  <div className="mt-3 truncate text-center text-xs font-medium text-black lg:text-[0.8rem]">
                    {category.name}
                  </div>
                </button>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <div className="pointer-events-none z-50 opacity-0 group-hover:pointer-events-auto group-hover:flex focus-within:pointer-events-auto focus-within:opacity-100 lg:hidden lg:group-hover:opacity-100">
          <CarouselPrevious
            disabled={disabled}
            aria-label="Scroll categories backward"
            className="left-0 z-50 h-9 w-9 -translate-x-2/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-0 lg:left-4 lg:h-8 lg:w-8 lg:translate-x-0"
          />
          <CarouselNext
            disabled={disabled}
            aria-label="Scroll categories forward"
            className="right-0 z-50 h-9 w-9 translate-x-2/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-0 lg:right-4 lg:h-8 lg:w-8 lg:translate-x-0"
          />
        </div>
      </Carousel>
    </div>
  );
}
