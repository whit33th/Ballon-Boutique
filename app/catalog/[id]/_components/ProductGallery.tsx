"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  ViewTransition,
} from "react";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

interface ProductGalleryProps {
  images: string[];
  productName: string;
  activeImage: number;
  onImageChange: (index: number) => void;
  transitionId?: string;
}

export const ProductGallery = memo(function ProductGallery({
  images,
  productName,
  activeImage,
  onImageChange,
  transitionId,
}: ProductGalleryProps) {
  const canNavigate = images.length > 1;
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  // Use transition name only for the first image to match product card
  const transitionName = transitionId
    ? `product-image-${transitionId}`
    : undefined;
  const slides = useMemo(
    () =>
      images.map((src, index) => ({
        src,
        index,
        key: `${productName}-${index}-${src}`,
      })),
    [images, productName],
  );

  useEffect(() => {
    if (!carouselApi) {
      return;
    }

    const syncFromCarousel = () => {
      const selected = carouselApi.selectedScrollSnap();
      if (selected !== activeImage) {
        onImageChange(selected);
      }
    };

    carouselApi.on("select", syncFromCarousel);
    return () => {
      carouselApi.off("select", syncFromCarousel);
    };
  }, [carouselApi, activeImage, onImageChange]);

  useEffect(() => {
    if (!carouselApi) {
      return;
    }

    if (activeImage === carouselApi.selectedScrollSnap()) {
      return;
    }

    carouselApi.scrollTo(activeImage, true);
  }, [carouselApi, activeImage]);

  const handlePreviousImage = useCallback(() => {
    if (!canNavigate) {
      return;
    }
    const nextIndex = (activeImage - 1 + images.length) % images.length;
    onImageChange(nextIndex);
  }, [activeImage, canNavigate, images.length, onImageChange]);

  const handleNextImage = useCallback(() => {
    if (!canNavigate) {
      return;
    }
    const nextIndex = (activeImage + 1) % images.length;
    onImageChange(nextIndex);
  }, [activeImage, canNavigate, images.length, onImageChange]);

  return (
    <div className="border-border relative flex max-h-[calc(100vh-57px-55px)] flex-1 flex-col border-b md:flex-row md:items-center md:justify-center">
      <ViewTransition name={transitionName}>
        <Carousel
          setApi={setCarouselApi}
          opts={{ align: "start", loop: canNavigate }}
          className="relative h-full w-full flex-1"
        >
          <CarouselContent className="ml-0 h-full">
            {slides.map((slide) => (
              <CarouselItem key={slide.key} className="h-full basis-full pl-0">
                <button
                  type="button"
                  style={{ opacity: 100 }}
                  tabIndex={0}
                  className="relative aspect-3/4 h-full max-h-[calc(100vh-57px-55px)] w-full overflow-hidden hover:opacity-100"
                  onKeyDown={(event) => {
                    if (!canNavigate) return;
                    if (
                      event.key === "ArrowRight" ||
                      event.key === "ArrowDown"
                    ) {
                      event.preventDefault();
                      handleNextImage();
                    }
                    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                      event.preventDefault();
                      handlePreviousImage();
                    }
                  }}
                  onClick={() => handleNextImage()}
                >
                  <Image
                    src={slide.src}
                    alt={productName}
                    fill
                    priority={slide.index === 0}
                    loading={slide.index === 0 ? "eager" : "lazy"}
                    className="z-50 aspect-3/4 h-full w-full object-contain drop-shadow"
                    sizes="(min-width: 640px) 800px, 100vw"
                  />
                </button>
              </CarouselItem>
            ))}
          </CarouselContent>

          {canNavigate && (
            <>
              <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-2 md:hidden">
                {slides.map((slide) => (
                  <span
                    key={`${slide.key}-dot`}
                    className={`h-2 rounded-full transition-[width,background-color] duration-300 ${
                      slide.index === activeImage
                        ? "bg-accent w-8"
                        : "w-2 backdrop-invert"
                    }`}
                  />
                ))}
              </div>

              <div className="absolute inset-y-0 left-0 flex items-center md:flex">
                <button
                  type="button"
                  onClick={handlePreviousImage}
                  className="text-deep hover:bg-secondary ml-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow-lg transition-[transform,background-color,color] duration-200 hover:scale-110 hover:text-white md:flex"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              </div>

              <div className="absolute inset-y-0 right-0 flex items-center md:flex">
                <button
                  type="button"
                  onClick={handleNextImage}
                  className="text-deep hover:bg-secondary mr-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow-lg transition-[transform,background-color,color] duration-200 hover:scale-110 hover:text-white md:flex"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </div>
            </>
          )}
        </Carousel>
      </ViewTransition>

      <div className="border-border flex snap-x gap-3 overflow-x-auto border-t p-4 md:absolute md:bottom-2 md:left-1/2 md:-translate-x-1/2 md:border-t-0">
        {slides.map((slide) => (
          <button
            key={slide.key}
            type="button"
            onClick={() => onImageChange(slide.index)}
            className={`group relative aspect-3/4 h-20 w-auto shrink-0 overflow-hidden rounded transition-[transform,box-shadow,ring] duration-200 md:h-24 2xl:h-28 ${
              activeImage === slide.index
                ? "ring-secondary scale-105 shadow-lg ring-2"
                : "ring-border hover:ring-secondary/50 ring-1 hover:shadow-md"
            }`}
          >
            <Image
              src={slide.src}
              width={100}
              height={100}
              alt={`${productName} ${slide.index + 1}`}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {activeImage === slide.index && (
              <div className="bg-secondary/10 absolute inset-0" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
});
