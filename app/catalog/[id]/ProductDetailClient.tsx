"use client";

import { type Preloaded, useMutation, usePreloadedQuery } from "convex/react";
import { useQuery } from "convex-helpers/react/cache";
import { motion } from "motion/react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { snapshotFromProduct, useGuestCart } from "@/lib/guestCart";
import { ProductGallery, ProductHeader, ProductInfo } from "./_components";
import { ProductPersonalization } from "./_components/ProductPersonalization";

interface Props {
  preloaded: Preloaded<typeof api.products.get>;
}

const FALLBACK_IMAGES = [
  "/baloons2.png",
  "/baloons3.png",
  "/img.jpg",
  "/baloons4.png",
];

export default function ProductDetailClient({ preloaded }: Props) {
  const product = usePreloadedQuery(preloaded);
  const addToCart = useMutation(api.cart.add);
  const user = useQuery(api.auth.loggedInUser);
  const { addItem: addGuestItem } = useGuestCart();
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [personalization, setPersonalization] = useState<{
    text?: string;
    color?: string;
    number?: string;
  }>({});

  const galleryImages = useMemo(() => {
    if (!product) {
      return [];
    }
    // Use primaryImageUrl if available, otherwise use imageUrls array
    // If neither exists, use fallback
    if (product.primaryImageUrl) {
      return [product.primaryImageUrl, ...product.imageUrls.slice(1)];
    }
    if (product.imageUrls.length > 0) {
      return product.imageUrls;
    }
    return FALLBACK_IMAGES;
  }, [product]);

  const handleImageChange = useCallback((index: number) => {
    setActiveImage(index);
  }, []);

  const handleQuantityChange = useCallback((newQuantity: number) => {
    setQuantity(newQuantity);
  }, []);

  const handleAddToCart = useCallback(
    async (desired: number = 1) => {
      if (!product) {
        return;
      }

      if (!product.inStock) {
        toast.error("Product is out of stock");
        return;
      }

      const safeQuantity = Math.max(1, Math.floor(desired));

      // Only include personalization if product supports it and at least one field is filled
      const hasPersonalization =
        personalization.text || personalization.color || personalization.number;
      const personalizedData =
        product.isPersonalizable && hasPersonalization
          ? personalization
          : undefined;

      if (!user) {
        addGuestItem(
          snapshotFromProduct(product),
          safeQuantity,
          personalizedData,
        );
        toast.success(`Added ${safeQuantity} item(s) to cart!`);
        return;
      }

      try {
        await addToCart({
          productId: product._id,
          quantity: safeQuantity,
          personalization: personalizedData,
        });
        toast.success(`Added ${safeQuantity} item(s) to cart!`);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to add to cart",
        );
      }
    },
    [product, user, addGuestItem, addToCart, personalization],
  );

  if (product === undefined) {
    return (
      <div className="">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid gap-12 md:grid-cols-2">
            <div className="/60 aspect-4/5 animate-pulse rounded-4xl" />
            <div className="space-y-4">
              <div className="/60 h-10 w-3/4 animate-pulse rounded-full" />
              <div className="/60 h-4 w-full animate-pulse rounded-full" />
              <div className="/60 h-4 w-5/6 animate-pulse rounded-full" />
              <div className="/60 h-12 w-40 animate-pulse rounded-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="">
        <div className="mx-auto max-w-4xl px-4 py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="mb-4 text-6xl">❌</div>
            <h2 className="mb-2 text-3xl font-semibold text-black">
              Product not found
            </h2>
            <p className="mb-8 text-base text-black/70">
              The product you're looking for doesn't exist.
            </p>
            <Link
              href="/catalog"
              className="inline-flex h-12 items-center justify-center rounded-full bg-black px-8 text-sm font-semibold tracking-wide text-white uppercase transition hover:bg-black/90"
            >
              Back to Catalog
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <section className="flex w-full flex-col lg:flex-row">
      <motion.div
        // initial={{ opacity: 0, x: -30 }}
        // whileInView={{ opacity: 1, x: 0 }}
        // transition={{ duration: 0.5, ease: "easeOut" }}
        className="border-border relative flex flex-col lg:sticky lg:top-0 lg:h-[calc(100svh-57px)] lg:w-1/2 lg:overflow-hidden lg:border-r"
      >
        <ProductHeader />
        <ProductGallery
          images={galleryImages}
          productName={product.name}
          activeImage={activeImage}
          onImageChange={handleImageChange}
          transitionId={product._id}
        />
      </motion.div>

      <motion.div
        // initial={{ opacity: 0, x: 30 }}
        // whileInView={{ opacity: 1, x: 0 }}
        // viewport={{ once: true }}
        // transition={{ duration: 0.5, ease: "easeOut" }}
        className="to-primary/20 flex flex-col justify-between bg-linear-to-br from-white/50 px-8 py-6 lg:w-1/2"
      >
        <div className="flex h-full flex-col justify-between gap-6">
          <div className="space-y-6">
            <ProductInfo
              name={product.name}
              description={product.description}
              price={product.price}
              inStock={product.inStock}
              quantity={quantity}
              onQuantityChange={handleQuantityChange}
              onAddToCart={handleAddToCart}
            />
            {product.isPersonalizable && product.availableColors && (
              <ProductPersonalization
                availableColors={product.availableColors}
                onChange={setPersonalization}
              />
            )}
          </div>
          {/* <ProductFeatures /> */}
        </div>
      </motion.div>
    </section>
  );
}
