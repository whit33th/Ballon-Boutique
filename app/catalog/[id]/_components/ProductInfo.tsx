"use client";

import { Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { memo, useCallback } from "react";

interface ProductInfoProps {
  name: string;
  description: string;
  price: number;
  inStock: boolean;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  onAddToCart: (quantity?: number) => Promise<void>;
}

export const ProductInfo = memo(function ProductInfo({
  name,
  description,
  price,
  inStock,
  quantity,
  onQuantityChange,
  onAddToCart,
}: ProductInfoProps) {
  const handleQuantityChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      onQuantityChange(Number(event.target.value));
    },
    [onQuantityChange],
  );

  const handleAddToCart = useCallback(() => {
    void onAddToCart(quantity);
  }, [onAddToCart, quantity]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-secondary flex items-center gap-2 text-xs font-semibold tracking-widest uppercase">
          <Sparkles className="h-4 w-4" />
          For special occasions
        </p>
        <h1 className="text-deep mt-3 text-4xl leading-tight font-bold lg:text-5xl">
          {name}
        </h1>
        <p className="text-deep/70 mt-5 max-w-2xl text-base leading-relaxed">
          {description}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <span className="text-deep/50 mb-1 block text-xs tracking-wider uppercase">
              Price
            </span>
            <span className="text-deep text-2xl font-bold sm:text-3xl lg:text-4xl 2xl:text-5xl">
              {price.toFixed(2)} €
            </span>
          </div>
          <span
            className={`rounded-full px-5 py-2 text-sm font-semibold tracking-wide uppercase ${
              inStock
                ? "bg-secondary/10 text-secondary"
                : "bg-deep/10 text-deep"
            }`}
          >
            {inStock ? "In stock" : "Out of stock"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="text-deep flex items-center gap-3 text-sm font-medium">
            <span className="tracking-wider uppercase">Quantity:</span>
            <select
              value={quantity}
              onChange={handleQuantityChange}
              disabled={!inStock}
              className="border-border text-deep hover:border-secondary focus:border-secondary focus:ring-secondary/20 h-11 rounded-xl border-2 bg-white px-4 text-sm font-semibold transition-colors outline-none focus:ring-2 disabled:opacity-50"
            >
              {Array.from({ length: 10 }, (_, idx) => idx + 1).map((value) => (
                <option value={value} key={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleAddToCart}
          disabled={!inStock}
          className="focus-visible:border-ring focus-visible:ring-ring/50 bg-accent text-on-accent inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-6 text-sm font-medium whitespace-nowrap transition-[background-color,color,border-color,opacity,filter,transform] duration-200 outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-red-600 aria-invalid:ring-red-600/20 dark:aria-invalid:ring-red-600/40 pointer-coarse:active:scale-[0.99] pointer-coarse:active:brightness-95 pointer-fine:hover:brightness-95 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
        >
          {!inStock ? "Sold out" : "Add to cart"}
        </motion.button>

        {/* <div className="text-secondary flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-5 w-5" />
          Free gift wrapping with every order
        </div> */}
      </div>
    </div>
  );
});
