"use client";

import { type Preloaded, useMutation, usePreloadedQuery } from "convex/react";
import { useQuery } from "convex-helpers/react/cache";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { snapshotFromProduct, useGuestCart } from "@/lib/guestCart";
import { ProductPersonalization } from "./ProductPersonalization";

interface PersonalizationOptions {
  text?: string;
  color?: string;
  number?: string;
}

interface ProductAddToCartWrapperProps {
  preloaded: Preloaded<typeof api.products.get>;
  availableColors?: string[];
  isPersonalizable?: {
    name?: boolean;
    number?: boolean;
  };
  requiresColorSelection: boolean;
}

export function ProductAddToCartWrapper({
  preloaded,
  availableColors = [],
  isPersonalizable,
  requiresColorSelection,
}: ProductAddToCartWrapperProps) {
  const t = useTranslations("product");
  const product = usePreloadedQuery(preloaded);
  const addToCart = useMutation(api.cart.add);
  const user = useQuery(api.auth.loggedInUser);
  const { addItem: addGuestItem } = useGuestCart();
  const [quantity, setQuantity] = useState(1);
  const [personalization, setPersonalization] = useState<PersonalizationOptions>({});
  const numberInputRef = useRef<HTMLInputElement>(null);
  const colorSectionRef = useRef<HTMLDivElement>(
    null,
  ) as React.RefObject<HTMLDivElement>;

  const handleQuantityChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setQuantity(Number(event.target.value));
    },
    [],
  );

  const handleAddToCart = useCallback(
    async (desired: number = quantity) => {
      if (!product) {
        return;
      }

      if (!product.inStock) {
        toast.error(t("outOfStock"));
        return;
      }

      const safeQuantity = Math.max(1, Math.floor(desired));

      // Validate required fields
      const needsColorSelection =
        requiresColorSelection && !personalization.color;
      if (needsColorSelection) {
        toast.error(t("pleaseSelectColor"));
        colorSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        return;
      }

      const requiresNumber =
        isPersonalizable?.number && !personalization.number?.trim();
      if (requiresNumber) {
        toast.error(t("pleaseEnterNumber"));
        numberInputRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        setTimeout(() => {
          numberInputRef.current?.focus();
        }, 300);
        return;
      }

      // Only include personalization if product supports it and at least one field is filled
      const hasPersonalization =
        personalization.text || personalization.color || personalization.number;
      const isPersonalizableProduct =
        isPersonalizable?.name || isPersonalizable?.number;
      const personalizedData =
        isPersonalizableProduct && hasPersonalization
          ? personalization
          : undefined;

      if (!user) {
        addGuestItem(
          snapshotFromProduct(product),
          safeQuantity,
          personalizedData,
        );
        toast.success(t("addedToCart", { count: safeQuantity }));
        return;
      }

      try {
        await addToCart({
          productId: product._id,
          quantity: safeQuantity,
          personalization: personalizedData,
        });
        toast.success(t("addedToCart", { count: safeQuantity }));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("failedToAdd"));
      }
    },
    [
      product,
      user,
      addGuestItem,
      addToCart,
      quantity,
      personalization,
      requiresColorSelection,
      isPersonalizable,
      t,
    ],
  );

  return (
    <div className="space-y-6">
      {product && (
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-deep flex items-center gap-3 text-sm font-medium">
            <span className="tracking-wider uppercase">{t("quantity")}:</span>
            <select
              value={quantity}
              onChange={handleQuantityChange}
              disabled={!product.inStock}
              className="border-border text-deep hover:border-secondary focus:border-secondary focus:ring-secondary/20 h-11 rounded-xl border-2 bg-white px-4 text-sm font-semibold transition-colors outline-none focus:ring-2 disabled:opacity-50"
            >
              {Array.from({ length: 10 }, (_, idx) => idx + 1).map((value) => (
                <option value={value} key={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => void handleAddToCart()}
            disabled={!product.inStock}
            className="focus-visible:border-ring focus-visible:ring-ring/50 bg-accent text-on-accent inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-6 text-sm font-medium whitespace-nowrap transition-[background-color,color,border-color,opacity,filter,transform] duration-200 outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-red-600 aria-invalid:ring-red-600/20 dark:aria-invalid:ring-red-600/40 pointer-coarse:active:scale-[0.99] pointer-coarse:active:brightness-95 pointer-fine:hover:brightness-95 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            {!product.inStock ? t("soldOut") : t("addToCart")}
          </motion.button>
        </div>
      )}

      {/* Show personalization section if there are colors to choose from OR if personalization is enabled */}
      {(availableColors.length > 0 || isPersonalizable?.name || isPersonalizable?.number) && (
        <ProductPersonalization
          ref={numberInputRef}
          availableColors={availableColors}
          isNameEnabled={isPersonalizable?.name ?? false}
          isNumberEnabled={isPersonalizable?.number ?? false}
          onChange={setPersonalization}
          requireColorSelection={requiresColorSelection}
          colorSectionRef={colorSectionRef}
        />
      )}
    </div>
  );
}
