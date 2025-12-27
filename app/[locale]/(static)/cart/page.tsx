"use client";

import { Image } from "@imagekit/next";
import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache";
import { ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Link, useRouter } from "@/i18n/routing";
import { type GuestCartItem, useGuestCart } from "@/lib/guestCart";
import { ADMIN_PREVIEW_IMAGE_TRANSFORMATION } from "@/lib/imagekit";

export default function CartPage() {
  const t = useTranslations("cart");
  const tCommon = useTranslations("common");
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
  type Variant = {
    size: string;
    unitPrice: number;
  };
  type GuestCartDisplayItem = {
    _id: string;
    quantity: number;
    personalization?: {
      text?: string;
      color?: string;
      number?: string;
    };
    product: GuestCartItem["product"];
    variant?: Variant;
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

  const getUnitPrice = (item: DisplayCartItem): number => {
    const variant = (item as { variant?: Variant }).variant;
    return variant?.unitPrice ?? item.product.price;
  };

  const handleQuantityChange = async (
    item: DisplayCartItem & { guestIndex?: number },
    quantity: number,
  ) => {
    if (isAuthenticated) {
      try {
        await updateQuantity({ itemId: item._id as Id<"cartItems">, quantity });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : t("failedToUpdate"),
        );
      }
      return;
    }

    if (quantity <= 0) {
      if (item.guestIndex !== undefined) {
        removeGuestItem(item.guestIndex);
        toast.success(t("itemRemoved"));
      }
      return;
    }

    if (!item.product.inStock) {
      toast.error(t("outOfStock"));
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
        toast.success(t("itemRemoved"));
      } catch (_error) {
        toast.error(t("failedToRemove"));
      }
      return;
    }

    if (item.guestIndex !== undefined) {
      removeGuestItem(item.guestIndex);
      toast.success(t("itemRemoved"));
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-56px)] w-screen items-center justify-center text-center">
        <div className="">
          <ShoppingBag className="mx-auto mb-4 size-16" />
          <h2 className="text-deep mb-2 text-2xl font-bold">
            {tCommon("loading")}
          </h2>
          <p className="text-deep/70 mb-8">{t("loadingDescription")}</p>
          <button
            type="button"
            onClick={() => router.push("/catalog")}
            className="btn-accent rounded-lg px-6 py-3 font-semibold transition-opacity hover:opacity-90"
          >
            {t("continueShopping")}
          </button>
        </div>
      </div>
    );
  }

  if (itemsToDisplay.length === 0) {
    return (
      <div className="flex min-h-[calc(100vh-56px)] w-screen items-center justify-center text-center">
        <div className="">
          <ShoppingBag className="mx-auto mb-4 size-16" />
          <h2 className="text-deep mb-2 text-2xl font-bold">{t("empty")}</h2>
          <p className="text-deep/70 mb-8">{t("emptyDescription")}</p>
          <button
            type="button"
            onClick={() => router.push("/catalog")}
            className="btn-accent rounded-lg px-6 py-3 font-semibold transition-opacity hover:opacity-90"
          >
            {t("continueShopping")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className="container mx-auto min-h-[calc(100vh-56px)] px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="border-b p-4 sm:p-6">
            <h2 className="text-deep text-xl font-bold sm:text-2xl">
              {t("title")}
            </h2>
            <p className="text-deep/70 text-sm sm:text-base">
              {t("items", { count: totals.itemCount })}
            </p>
          </div>
          <div className="bg-secondary/5 w-full border-t p-4 sm:p-6">
            <Link
              href="/checkout"
              className="btn-accent block w-full rounded-lg px-2 py-3 text-center font-semibold transition-opacity hover:opacity-90"
            >
              {t("checkout")}
            </Link>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-deep text-lg font-semibold sm:text-xl">
                {tCommon("total")}:
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
                    <Image
                      src={item.product.primaryImageUrl}
                      alt={item.product.name}
                      fill
                      className="rounded-lg object-cover"
                      transformation={ADMIN_PREVIEW_IMAGE_TRANSFORMATION}
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
                    €{getUnitPrice(item).toFixed(2)}
                  </p>
                  {(item as { variant?: Variant }).variant?.size ? (
                    <p className="text-deep/70 text-xs sm:text-sm">
                      {t("size")}:{" "}
                      {(item as { variant?: Variant }).variant?.size}
                    </p>
                  ) : null}
                  {"personalization" in item && item.personalization && (
                    <div className="mt-2 space-y-1 text-xs text-gray-600">
                      {item.personalization.color && (
                        <p className="flex items-center gap-1">
                          <span className="font-medium">
                            {t("personalization.color")}:
                          </span>
                          <span>{item.personalization.color}</span>
                        </p>
                      )}
                      {item.personalization.text && (
                        <p className="flex items-center gap-1">
                          <span className="font-medium">
                            {t("personalization.text")}:
                          </span>
                          <span className="italic">
                            "{item.personalization.text}"
                          </span>
                        </p>
                      )}
                      {item.personalization.number && (
                        <p className="flex items-center gap-1">
                          <span className="font-medium">
                            {t("personalization.number")}:
                          </span>
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
                      €{(getUnitPrice(item) * item.quantity).toFixed(2)}
                    </p>
                    <button
                      type="button"
                      onClick={() => void handleRemoveItem(item)}
                      className="text-terracotta hover:text-terracotta/80 text-xs transition-colors sm:text-sm"
                    >
                      {tCommon("remove")}
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
    </section>
  );
}
