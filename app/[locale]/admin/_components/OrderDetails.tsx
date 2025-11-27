"use client";

import { Image } from "@imagekit/next";
import { useMutation, useQuery } from "convex/react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
// removed per-item queries to comply with Rules of Hooks
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { generateProductSlug } from "@/lib/catalog-utils";
import { ADMIN_PREVIEW_IMAGE_TRANSFORMATION } from "@/lib/imagekit";
import type { OrderStatus } from "./types";
import { ORDER_STATUS_META } from "./types";
import { formatCurrency, formatDateTime } from "./utils";

type Props = { order: Doc<"orders"> };

type OrderItem = Doc<"orders">["items"][number];
type OrderItemWithOptionalImage = OrderItem & {
  productImageUrl?: string | null;
};
type OrderWithOptionalPhone = Doc<"orders"> & {
  phone?: string | null;
};

const getOrderPhone = (order: Doc<"orders">): string | null => {
  const { phone } = order as OrderWithOptionalPhone;
  return typeof phone === "string" && phone.trim().length > 0 ? phone : null;
};

const getProductImageUrl = (item: OrderItem): string | null => {
  const { productImageUrl } = item as OrderItemWithOptionalImage;
  if (
    typeof productImageUrl === "string" &&
    productImageUrl.trim().length > 0
  ) {
    return productImageUrl;
  }
  return null;
};

export function OrderDetails({ order }: Props) {
  const locale = useLocale();
  const t = useTranslations("admin.payments");
  const tOrderDetails = useTranslations("admin.orderDetails");
  const tOrdersTable = useTranslations("admin.ordersTable");
  const tAdmin = useTranslations("admin");
  const _currency = order.currency ?? "EUR";
  const updateStatus = useMutation(api.orders.updateStatus);
  const [isUpdating, setIsUpdating] = useState(false);
  const [localStatus, setLocalStatus] = useState(order.status);
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Prepare fallback images for items that lack `productImageUrl`.
  const missingIds: Array<Id<"products">> = Array.from(
    new Set(
      order.items
        .filter((item) => !getProductImageUrl(item))
        .map((item) => item.productId),
    ),
  );

  const fetchedProducts = useQuery(
    api.products.getMany,
    missingIds.length > 0 ? { ids: missingIds } : "skip",
  );

  const productImageById = new Map<string, string | null>();
  if (Array.isArray(fetchedProducts)) {
    for (const p of fetchedProducts) {
      productImageById.set(
        p._id,
        p.primaryImageUrl ?? p.imageUrls?.[0] ?? null,
      );
    }
  }

  const orderPhone = getOrderPhone(order);

  const confirmChange = useCallback(async () => {
    if (!pendingStatus) return;
    setIsUpdating(true);
    try {
      await updateStatus({ orderId: order._id, status: pendingStatus });
      setLocalStatus(pendingStatus);
      setPendingStatus(null);
      toast.success(tAdmin("toasts.productUpdated"));
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : tOrderDetails("statusUpdateError");
      toast.error(msg);
    } finally {
      setIsUpdating(false);
    }
  }, [pendingStatus, updateStatus, order._id, tOrderDetails, tAdmin]);

  return (
    <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
      <div>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-slate-500">
              {tOrdersTable("order")}
            </div>
            <div className="font-mono font-semibold text-slate-900">
              #{order._id.slice(-8)}
            </div>
            <div className="text-xs text-slate-400">
              {formatDateTime(order._creationTime)}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="ml-1 flex w-full max-w-xs items-center gap-2">
              <span className="hidden text-xs text-slate-500 sm:inline">
                {tOrdersTable("status")}:
              </span>
              <div className="flex-1">
                <select
                  aria-label={tOrdersTable("status")}
                  value={pendingStatus ?? localStatus}
                  onChange={(e) => {
                    const next = e.target.value as OrderStatus;
                    if (next === localStatus) {
                      setPendingStatus(null);
                      return;
                    }
                    setPendingStatus(next);
                    // open confirmation dialog on mobile/desktop
                    setIsDialogOpen(true);
                  }}
                  disabled={isUpdating}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  {Object.keys(ORDER_STATUS_META).map((key) => (
                    <option key={key} value={key}>
                      {t(`orderStatus.${key}`)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Confirmation controls — only show when a new status is selected */}
              {/* Confirm dialog: opens when a new status is selected */}
              <Dialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                  setIsDialogOpen(open);
                  if (!open) setPendingStatus(null);
                }}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{tOrdersTable("status")}</DialogTitle>
                    <DialogDescription>
                      {pendingStatus
                        ? `${t(`orderStatus.${localStatus}`)} → ${t(`orderStatus.${pendingStatus}`)}`
                        : ""}
                    </DialogDescription>
                  </DialogHeader>

                  <DialogFooter>
                    <button
                      className="rounded-md bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700"
                      onClick={() => {
                        setIsDialogOpen(false);
                        setPendingStatus(null);
                      }}
                      type="button"
                    >
                      {tAdmin("productForm.cancel")}
                    </button>
                    <button
                      className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
                      onClick={async () => {
                        await confirmChange();
                        setIsDialogOpen(false);
                      }}
                      disabled={isUpdating}
                      type="button"
                    >
                      {tAdmin("productForm.confirmDelete")}
                    </button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      <section>
        <h3 className="text-sm font-semibold text-slate-900">
          {tOrderDetails("customer")}
        </h3>
        <div className="mt-2 space-y-1 text-sm text-slate-700">
          <div>
            <span className="text-xs font-semibold text-slate-500">
              {tOrderDetails("name")}:{" "}
            </span>
            <span className="font-medium text-slate-900">
              {order.customerName}
            </span>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500">
              {tOrderDetails("email")}:{" "}
            </span>
            <span className="text-xs text-slate-500">
              {order.customerEmail}
            </span>
          </div>
          {orderPhone && (
            <div>
              <span className="text-xs font-semibold text-slate-500">
                {tOrderDetails("phone")}:{" "}
              </span>
              <span className="text-xs text-slate-500">{orderPhone}</span>
            </div>
          )}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-900">
          {tOrderDetails("delivery")}
        </h3>
        <div className="mt-2 text-sm text-slate-700">
          {order.deliveryType === "delivery" ? (
            <div className="space-y-1">
              <div>
                <span className="text-xs font-semibold text-slate-500">
                  {tOrderDetails("type")}:{" "}
                </span>
                <span>{tOrderDetails("deliveryType")}</span>
              </div>
              {order.pickupDateTime && (
                <div>
                  <span className="text-xs font-semibold text-slate-500">
                    {tOrderDetails("deliveryTime")}:{" "}
                  </span>
                  <span className="text-sm text-slate-700">
                    {new Date(order.pickupDateTime).toLocaleString(undefined, {
                      year: "numeric",
                      month: "numeric",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
              <div>
                <span className="text-xs font-semibold text-slate-500">
                  {tOrderDetails("address")}:{" "}
                </span>
                <div className="text-sm whitespace-pre-line text-slate-700">
                  {typeof order.shippingAddress === "string"
                    ? order.shippingAddress
                    : order.shippingAddress
                      ? `${order.shippingAddress.streetAddress}\n${order.shippingAddress.postalCode} ${order.shippingAddress.city}${order.shippingAddress.deliveryNotes ? `\n${order.shippingAddress.deliveryNotes}` : ""}`
                      : "—"}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <div>
                <span className="text-xs font-semibold text-slate-500">
                  {tOrderDetails("type")}:{" "}
                </span>
                <span>{tOrderDetails("pickupType")}</span>
              </div>
              {order.pickupDateTime && (
                <div>
                  <span className="text-xs font-semibold text-slate-500">
                    {tOrderDetails("pickupTime")}:{" "}
                  </span>
                  <span className="text-sm text-slate-700">
                    {new Date(order.pickupDateTime).toLocaleString(undefined, {
                      year: "numeric",
                      month: "numeric",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-900">
          {tOrderDetails("items")}
        </h3>
        <div className="mt-2 space-y-2 text-sm text-slate-700">
          {order.items.map((item, idx) => {
            // Avoid calling hooks inside loops — prefer item.productImageUrl,
            // otherwise fall back to the first image from the product we fetched.
            const imageUrl =
              getProductImageUrl(item) ??
              productImageById.get(item.productId) ??
              null;
            const productSlug = generateProductSlug(
              item.productName,
              item.productId,
            );
            return (
              <a
                key={`${order._id}-${item.productId}-${idx}`}
                href={`/${locale}/catalog/${productSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-md border border-slate-100 bg-white/80 p-3 transition hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-secondary/10 relative aspect-square h-12 w-12 shrink-0 overflow-hidden rounded-md">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={item.productName}
                          width={48}
                          height={48}
                          className="aspect-square object-cover"
                          sizes="48px"
                          transformation={ADMIN_PREVIEW_IMAGE_TRANSFORMATION}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          🎈
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="font-medium text-slate-900">
                        {item.productName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {tOrderDetails("quantity")}: {item.quantity}
                      </div>
                    </div>
                  </div>

                  <div className="font-semibold">
                    {formatCurrency(item.price * item.quantity)}
                  </div>
                </div>

                {item.personalization && (
                  <div className="mt-2 text-xs text-slate-600">
                    {item.personalization.color && (
                      <div>
                        {tOrderDetails("color")}:{" "}
                        {tAdmin(`colors.${item.personalization.color}`) ||
                          item.personalization.color}
                      </div>
                    )}
                    {item.personalization.text && (
                      <div>
                        {tOrderDetails("text")}: "{item.personalization.text}"
                      </div>
                    )}
                    {item.personalization.number && (
                      <div>
                        {tOrderDetails("number")}: {item.personalization.number}
                      </div>
                    )}
                  </div>
                )}
              </a>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-900">
          {tOrderDetails("payment")}
        </h3>
        <div className="mt-2 text-sm text-slate-700">
          <div>
            {tOrderDetails("method")}: {order.paymentMethod ?? "—"}
          </div>
          {order.deliveryFee ? (
            <div>
              {tOrderDetails("deliveryFee")}:{" "}
              {formatCurrency(order.deliveryFee)}
            </div>
          ) : null}
          <div className="mt-2 font-semibold">
            {tOrderDetails("total")}:{" "}
            {formatCurrency(order.grandTotal ?? order.totalAmount)}
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-900">
          {tOrdersTable("status")}
        </h3>
        <div className="mt-2 text-xs text-slate-500">
          <div>
            {tOrdersTable("status")}: {t(`orderStatus.${localStatus}`)}
          </div>
          <div>Währung: {order.currency ?? "EUR"}</div>
        </div>
      </section>
    </aside>
  );
}

export default OrderDetails;
