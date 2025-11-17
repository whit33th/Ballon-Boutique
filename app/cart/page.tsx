"use client";

import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ImageKitPicture from "@/components/ui/ImageKitPicture";
import { ADMIN_PREVIEW_IMAGE_TRANSFORMATION } from "@/lib/imagekit";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { type GuestCartItem, useGuestCart } from "../../lib/guestCart";

export default function CartPage() {
  const router = useRouter();
  const user = useQuery(api.auth.loggedInUser);
  const cartItems = useQuery(api.cart.list);
  const cartTotal = useQuery(api.cart.getTotal);
  const updateQuantity = useMutation(api.cart.updateQuantity);
  const removeItem = useMutation(api.cart.remove);
  const {
    items: guestItems,
    totalCount: guestItemCount,
    totalPrice: guestTotal,
    setQuantity: setGuestQuantity,
    removeItem: removeGuestItem,
    initialized: guestInitialized,
  } = useGuestCart();

  type ServerCartItem = NonNullable<typeof cartItems>[number];
  type GuestCartDisplayItem = {
    _id: string;
    quantity: number;
    personalization?: {
      text?: string;
      color?: string;
      number?: string;
    };
    product: GuestCartItem["product"];
  };

  type DisplayCartItem = ServerCartItem | GuestCartDisplayItem;

  const isAuthenticated = Boolean(user);

  const isLoading = isAuthenticated
    ? cartItems === undefined || cartTotal === undefined
    : !guestInitialized;

  const itemsToDisplay: (DisplayCartItem & { guestIndex?: number })[] =
    isAuthenticated
      ? (cartItems ?? [])
      : guestItems.map((item, index) => {
          console.log("Guest item:", item);
          // Create unique ID based on product and personalization
          const personalizationKey = item.personalization
            ? JSON.stringify(item.personalization)
            : "none";
          return {
            _id: `${item.productId}-${personalizationKey}-${index}`,
            quantity: item.quantity,
            personalization: item.personalization,
            product: item.product,
            guestIndex: index, // Save original index for operations
          };
        });

  const totals = isAuthenticated
    ? (cartTotal ?? { total: 0, itemCount: 0 })
    : { total: guestTotal, itemCount: guestItemCount };

  const handleQuantityChange = async (
    item: DisplayCartItem & { guestIndex?: number },
    quantity: number,
  ) => {
    if (isAuthenticated) {
      try {
        await updateQuantity({ itemId: item._id as Id<"cartItems">, quantity });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to update quantity",
        );
      }
      return;
    }

    if (quantity <= 0) {
      if (item.guestIndex !== undefined) {
        removeGuestItem(item.guestIndex);
        toast.success("Item removed from cart");
      }
      return;
    }

    if (!item.product.inStock) {
      toast.error("Product is out of stock");
      return;
    }

    if (item.guestIndex !== undefined) {
      setGuestQuantity(item.guestIndex, quantity);
    }
  };

  const handleRemoveItem = async (
    item: DisplayCartItem & { guestIndex?: number },
  ) => {
    if (isAuthenticated) {
      try {
        await removeItem({ itemId: item._id as Id<"cartItems"> });
        toast.success("Item removed from cart");
      } catch (_error) {
        toast.error("Failed to remove item");
      }
      return;
    }

    if (item.guestIndex !== undefined) {
      removeGuestItem(item.guestIndex);
      toast.success("Item removed from cart");
    }
  };

  if (isLoading) {
    return (
      <div className="bg-primary">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-4xl">
            <div className="animate-pulse rounded-xl bg-white p-8 shadow-sm">
              <div className="mb-6 h-8 rounded bg-gray-200"></div>
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={`skeleton-${i}`}
                    className="h-24 rounded bg-gray-200"
                  ></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (itemsToDisplay.length === 0) {
    return (
      <div className="bg-primary">
        <div className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-4 text-6xl">🛒</div>
            <h2 className="text-deep mb-2 text-2xl font-bold">
              Your cart is empty
            </h2>
            <p className="text-deep/70 mb-8">
              Add some beautiful balloons to get started!
            </p>
            <button
              type="button"
              onClick={() => router.push("/catalog")}
              className="btn-accent rounded-lg px-6 py-3 font-semibold transition-opacity hover:opacity-90"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-primary">
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
            <div className="border-b p-4 sm:p-6">
              <h2 className="text-deep text-xl font-bold sm:text-2xl">
                Shopping Cart
              </h2>
              <p className="text-deep/70 text-sm sm:text-base">
                {totals.itemCount} items
              </p>
            </div>
            <div className="bg-secondary/5 w-full border-t p-4 sm:p-6">
              <Link
                href="/checkout"
                className="btn-accent block w-full rounded-lg px-2 py-3 text-center font-semibold transition-opacity hover:opacity-90"
              >
                Checkout
              </Link>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-deep text-lg font-semibold sm:text-xl">
                  Total:
                </span>
                <span className="text-accent text-xl font-bold tabular-nums sm:text-2xl">
                  €{totals.total.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="divide-y">
              {itemsToDisplay.map((item) => (
                <div
                  key={item._id}
                  className="flex flex-col items-start gap-4 p-4 sm:flex-row sm:items-center sm:p-6"
                >
                  <div className="bg-secondary/10 relative flex h-20 w-20 shrink-0 items-center justify-center rounded-lg">
                    {item.product.primaryImageUrl ? (
                      <ImageKitPicture
                        src={item.product.primaryImageUrl}
                        alt={item.product.name}
                        fill
                        className="rounded-lg object-cover"
                        transformation={ADMIN_PREVIEW_IMAGE_TRANSFORMATION}
                        placeholderOptions={{
                          width: 28,
                          quality: 12,
                          blur: 40,
                        }}
                        sizes="80px"
                      />
                    ) : (
                      <div className="text-2xl">🎈</div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-deep truncate font-semibold">
                      {item.product.name}
                    </h3>
                    <p className="text-deep/70 text-xs sm:text-sm">
                      €{item.product.price.toFixed(2)}
                    </p>
                    {"personalization" in item && item.personalization && (
                      <div className="mt-2 space-y-1 text-xs text-gray-600">
                        {item.personalization.color && (
                          <p className="flex items-center gap-1">
                            <span className="font-medium">Color:</span>
                            <span>{item.personalization.color}</span>
                          </p>
                        )}
                        {item.personalization.text && (
                          <p className="flex items-center gap-1">
                            <span className="font-medium">Text:</span>
                            <span className="italic">
                              "{item.personalization.text}"
                            </span>
                          </p>
                        )}
                        {item.personalization.number && (
                          <p className="flex items-center gap-1">
                            <span className="font-medium">Number:</span>
                            <span>{item.personalization.number}</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:gap-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          void handleQuantityChange(item, item.quantity - 1)
                        }
                        className="bg-secondary/20 text-deep hover:bg-secondary/30 flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                      >
                        -
                      </button>
                      <span className="text-deep w-8 text-center font-semibold tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          void handleQuantityChange(item, item.quantity + 1)
                        }
                        className="bg-secondary/20 text-deep hover:bg-secondary/30 flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                      >
                        +
                      </button>
                    </div>

                    <div className="text-right">
                      <p className="text-deep text-base font-bold tabular-nums sm:text-lg">
                        €{(item.product.price * item.quantity).toFixed(2)}
                      </p>
                      <button
                        type="button"
                        onClick={() => void handleRemoveItem(item)}
                        className="text-terracotta hover:text-terracotta/80 text-xs transition-colors sm:text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* <div className="bg-secondary/5 border-t p-4 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-deep text-lg font-semibold sm:text-xl">
                  Total:
                </span>
                <span className="text-accent text-xl font-bold tabular-nums sm:text-2xl">
                  €{totals.total.toFixed(2)}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCheckout}
                className="btn-accent w-full rounded-lg py-3 font-semibold transition-opacity hover:opacity-90"
              >
                Checkout
              </button>
            </div> */}
          </div>
        </div>
      </main>
    </div>
  );
}
