"use client";

import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useLayoutEffect, useState } from "react";
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
  image: string;
  link: string;
}

export interface CategoriesCarouselProps {
  categories: Category[];
}

export function CategoriesCarousel({ categories }: CategoriesCarouselProps) {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(mql.matches);
    update();
    if (mql.addEventListener) mql.addEventListener("change", update);
    else mql.addListener(update);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", update);
      else mql.removeListener(update);
    };
  }, []);

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
    <section className="flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex justify-between gap-2 p-4 px-4">
        <h2 className="flex max-w-2xl gap-1.5 truncate text-2xl leading-tight md:text-2xl">
          Explore Categories
        </h2>
      </div>

      {/* Carousel */}
      <div className="border-foreground relative border-t">
        <Carousel
          setApi={setApi}
          className="group"
          opts={{
            dragFree: isMobile,
            align: "start",
          }}
        >
          <CarouselContent className="ml-0">
            {categories.map((category) => (
              <CarouselItem
                key={category.name}
                className="basis-2/5 pl-0 sm:basis-2/7 md:basis-2/9 lg:basis-2/11 xl:basis-2/13"
              >
                <Link
                  href={category.link as Route}
                  className="group border-foreground block border-r"
                >
                  <article className="relative aspect-square overflow-hidden bg-linear-to-br from-green-100 to-yellow-100">
                    <Image
                      src={category.image}
                      alt={category.name}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <h3 className="text-center text-lg font-black tracking-tight uppercase backdrop-invert transition-transform group-hover:scale-105 lg:text-xl 2xl:text-2xl">
                        {category.name}
                      </h3>
                    </div>
                  </article>
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="z-50 opacity-0 group-hover:flex lg:hidden lg:group-hover:opacity-100">
            <CarouselPrevious
              disabled={disabled}
              className="left-0 z-50 h-12 w-12 -translate-x-2/5 disabled:opacity-0 lg:left-6 lg:h-9 lg:w-9 lg:translate-x-0"
            />
            <CarouselNext
              disabled={disabled}
              className="right-0 z-50 h-12 w-12 translate-x-2/5 disabled:opacity-0 lg:right-6 lg:h-9 lg:w-9 lg:translate-x-0"
            />
          </div>
        </Carousel>
      </div>
    </section>
  );
}
