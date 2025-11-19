"use client";

import { ArrowRight } from "lucide-react";
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
import type { ProductWithImage } from "@/convex/helpers/products";
import ProductCard from "../productCard";

export interface ProductCarouselProps {
  data: ProductWithImage[];
  label: string;
  secondaryLabel?: string;

  count?: number;
  transitionGroup?: string;
}

export function ProductCarousel({
  data,
  label,
  secondaryLabel,
  transitionGroup,
}: ProductCarouselProps) {
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

  // Check state
  const _currentSlide = api?.selectedScrollSnap();
  return (
    <section className="flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 px-4">
        <h2 className="flex max-w-2xl gap-1.5 truncate text-xl leading-tight md:text-2xl">
          <span>{label}</span>
          {secondaryLabel ? (
            <>
              <span>✧</span>
              <span>{secondaryLabel}</span>
            </>
          ) : null}
        </h2>
        <Link
          href="/catalog"
          className="flex items-center gap-2 text-sm transition-[gap] duration-200 hover:gap-3"
        >
          More products
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Carousel */}
      <div className="border-foreground relative border-t">
        <Carousel
          setApi={setApi}
          className="group"
          opts={{
            dragFree: isMobile,
            // skipSnaps: true,
            align: "start",
          }}
        >
          <CarouselContent className="ml-0">
            {data.map((product, index) => (
              <CarouselItem
                key={product._id}
                className="basis-2/5 pl-0 sm:basis-2/7 md:basis-2/9 lg:basis-2/11 xl:basis-2/13"
              >
                <ProductCard
                  index={index}
                  product={product}
                  transitionGroups={
                    transitionGroup ? [transitionGroup] : undefined
                  }
                />
              </CarouselItem>
            ))}
          </CarouselContent>

          <div className="pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:flex focus-within:pointer-events-auto focus-within:opacity-100 lg:hidden lg:group-hover:opacity-100">
            <CarouselPrevious
              disabled={disabled}
              aria-label="Scroll products backward"
              className="left-0 z-50 h-12 w-12 -translate-x-2/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-0 lg:left-6 lg:h-9 lg:w-9 lg:translate-x-0"
            />
            <CarouselNext
              disabled={disabled}
              aria-label="Scroll products forward"
              className="right-0 z-50 h-12 w-12 translate-x-2/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-0 lg:right-6 lg:h-9 lg:w-9 lg:translate-x-0"
            />
          </div>
        </Carousel>
      </div>
    </section>
  );
}
