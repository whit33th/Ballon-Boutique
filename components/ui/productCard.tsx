"use client";

import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { ViewTransition } from "react";

import type { Doc } from "@/convex/_generated/dataModel";
import { balloonColors } from "../ProductGrid";

type ProductTag = "new" | "bestseller";

type ProductCardProduct = Doc<"products"> & {
  primaryImageUrl: string | null;
  imageUrls: string[];
  tags?: ProductTag[];
};

interface ProductCardProps {
  product: ProductCardProduct;
  index: number;
}

export default function ProductCard({ product, index }: ProductCardProps) {
  // Assign colors based on product - matching reference colorful balloon theme
  const colorIndex = index % balloonColors.length;
  const bgColor = balloonColors[colorIndex];
  const productHref = `/catalog/${product._id}` as Route;
  const transitionName = `product-image-${product._id}`;

  const fallbackImages = [
    "/baloons2.png",
    "/baloons3.png",
    "/img.jpg",
    "/baloons4.png",
  ];

  const displayImage =
    product.primaryImageUrl ?? fallbackImages[index % fallbackImages.length];

  const tags: ProductTag[] = product.tags ?? [];
  const formattedPrice = `${product.price.toFixed(2)} €`;

  return (
    <Link
      href={productHref}
      className="focus-visible:ring-accent focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      <div className="border-foreground flex h-full flex-col border-r border-b">
        {/* Product Image with colorful balloon background */}
        <div
          className="relative aspect-3/4 w-full"
          style={{ backgroundColor: bgColor }}
        >
          <ViewTransition name={transitionName}>
            <Image
              src={displayImage}
              alt={product.name}
              width={400}
              height={600}
              className="aspect-3/4 h-full w-full object-cover"
              loading={index < 2 ? "eager" : "lazy"}
            />
          </ViewTransition>
        </div>

        {/* Product Info */}
        <div className="border-foreground relative flex flex-col gap-1 border-t px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="bg-primary/20 rounded-full py-0.5 pr-2 text-xs font-medium tracking-wide text-red-500/90 uppercase"
              >
                {tag === "new" ? "New" : "Bestseller"}
              </span>
            ))}
          </div>
          <h3 className="text-sm leading-tight">{product.name}</h3>
          <span className="text-sm font-semibold">{formattedPrice}</span>
        </div>
      </div>
    </Link>
  );
}
