"use client";

import { buildSrc, Image } from "@imagekit/next";
import type { Route } from "next";
import { type ReactNode, useMemo, useState, ViewTransition } from "react";
import type { ProductWithImage } from "@/convex/helpers/products";
import { Link } from "@/i18n/routing";
import { generateProductSlug } from "@/lib/catalog-utils";
import {
  DEFAULT_PRODUCT_IMAGE_TRANSFORMATION,
  imageKitConfig,
} from "@/lib/imagekit";
import { balloonColors } from "../ProductGrid";

interface ProductCardProps {
  product: ProductWithImage;
  index: number;
  transitionGroups?: string[];
  imageSizes?: string;
}

export default function ProductCard({
  product,
  index,
  transitionGroups,
  imageSizes,
}: ProductCardProps) {
  // Assign colors based on product - matching reference colorful balloon theme
  const colorIndex = index % balloonColors.length;
  const bgColor = balloonColors[colorIndex];
  const productSlug = generateProductSlug(product.name, product._id);
  const productHref = `/catalog/${productSlug}` as Route;
  const transitionNames =
    transitionGroups && transitionGroups.length > 0
      ? transitionGroups.map((group) => `product-image-${group}-${product._id}`)
      : [`product-image-${product._id}`];

  const displayImage = product.imageUrls[0] ?? null;

  const discountPct = product.discountPct ?? 0;
  const hasDiscount = typeof discountPct === "number" && discountPct > 0;

  const formattedPrice = useMemo(() => {
    const applyDiscount = (value: number) =>
      hasDiscount
        ? Math.round(value * (1 - discountPct / 100) * 100) / 100
        : value;
    const format = (value: number) => `${value.toFixed(2)} €`;
    const sizes = (product as { miniSetSizes?: { price: number }[] })
      .miniSetSizes;
    if (!sizes || sizes.length === 0) {
      return {
        primary: format(applyDiscount(product.price)),
        secondary: hasDiscount ? format(product.price) : null,
      } as const;
    }

    const prices = sizes
      .map((s) => s.price)
      .filter((price) => typeof price === "number" && Number.isFinite(price));
    if (prices.length === 0) {
      return {
        primary: format(applyDiscount(product.price)),
        secondary: hasDiscount ? format(product.price) : null,
      } as const;
    }

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min !== max) {
      return {
        primary: `${format(applyDiscount(min))}–${format(applyDiscount(max))}`,
        secondary: hasDiscount ? `${format(min)}–${format(max)}` : null,
      } as const;
    }
    return {
      primary: format(applyDiscount(min)),
      secondary: hasDiscount ? format(min) : null,
    } as const;
  }, [product, hasDiscount, discountPct]);

  const [showPlaceholder, setShowPlaceholder] = useState(true);

  const placeholderStyle = useMemo(() => {
    if (!showPlaceholder || !displayImage || !imageKitConfig.urlEndpoint) {
      return {};
    }

    const placeholderSrc = buildSrc({
      urlEndpoint: imageKitConfig.urlEndpoint,
      src: displayImage,
      transformation: [
        {
          width: 40,
          quality: 10,
          blur: 90,
        },
      ],
    });

    return {
      backgroundImage: `url(${placeholderSrc})`,
      backgroundSize: "cover",
      backgroundRepeat: "no-repeat",
    };
  }, [showPlaceholder, displayImage]);

  return (
    <Link
      href={productHref}
      data-testid="product-card"
      data-product-name={product.name}
      className="focus-visible:ring-accent focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      <div className="border-foreground flex h-full flex-col border-r border-b">
        {/* Product Image with colorful balloon background */}
        <div
          className="relative aspect-3/4 w-full"
          style={{ backgroundColor: bgColor }}
        >
          {hasDiscount ? (
            <span className="bg-accent text-on-accent absolute top-3 left-3 rounded-full px-3 py-1 text-xs font-semibold shadow-sm">
              -{discountPct}%
            </span>
          ) : null}
          {product.imageUrls[0]
            ? transitionNames.reduceRight<ReactNode>(
                (child, name) => (
                  <ViewTransition key={name} name={name}>
                    {child}
                  </ViewTransition>
                ),
                (
                  <Image
                    src={product.imageUrls[0]}
                    alt={product.name}
                    fill
                    className="aspect-3/4 h-full w-full object-cover"
                    transformation={DEFAULT_PRODUCT_IMAGE_TRANSFORMATION}
                    sizes={
                      imageSizes ??
                      "(max-width: 720px) 50vw, (min-width: 965px) 33vw, (min-width: 1200px) 25vw, (min-width: 1440px) 20vw, (min-width: 1680px) 17vw, 400px "
                    }
                    style={placeholderStyle}
                    onLoad={() => {
                      setShowPlaceholder(false);
                    }}
                  />
                ) as ReactNode,
              )
            : null}
        </div>

        {/* Product Info */}
        <div className="border-foreground relative flex h-full flex-col justify-between gap-1 border-t px-4 py-3">
          <h3 className="line-clamp-2 text-sm leading-tight wrap-break-word">
            {product.name}
          </h3>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-sm font-semibold">
              {formattedPrice.primary}
            </span>
            {formattedPrice.secondary ? (
              <span className="text-xs text-slate-500 line-through">
                {formattedPrice.secondary}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}
