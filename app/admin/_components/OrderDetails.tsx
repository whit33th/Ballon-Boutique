"use client";

import { useMutation, useQuery } from "convex/react";
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
import ImageKitPicture from "@/components/ui/ImageKitPicture";
import { api } from "@/convex/_generated/api";
// removed per-item queries to comply with Rules of Hooks
import type { Doc } from "@/convex/_generated/dataModel";
import { ADMIN_PREVIEW_IMAGE_TRANSFORMATION } from "@/lib/imagekit";
import type { OrderStatus } from "./types";
import { ORDER_STATUS_META } from "./types";
import { formatCurrency, formatDateTime } from "./utils";

type Props = { order: Doc<"orders"> };

export function OrderDetails({ order }: Props) {
  const _currency = order.currency ?? "EUR";
  const updateStatus = useMutation(api.orders.updateStatus);
  const [isUpdating, setIsUpdating] = useState(false);
  const [localStatus, setLocalStatus] = useState(order.status);
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Prepare fallback images for items that lack `productImageUrl`.
  const missingIds = Array.from(
    new Set(
      order.items
        .filter((it) => !(it as any).productImageUrl)
        .map((it) => it.productId),
    ),
  );

  const fetchedProducts = useQuery(
    missingIds.length > 0 ? api.products.getMany : (null as any),
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

  const confirmChange = useCallback(async () => {
    if (!pendingStatus) return;
    setIsUpdating(true);
    try {
      await updateStatus({ orderId: order._id, status: pendingStatus });
      setLocalStatus(pendingStatus);
      setPendingStatus(null);
      toast.success("Статус заказа обновлён");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Ошибка обновления статуса";
      toast.error(msg);
    } finally {
      setIsUpdating(false);
    }
  }, [pendingStatus, updateStatus, order._id]);

  return (
    <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
      <div>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-slate-500">Заказ</div>
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
                Статус:
              </span>
              <div className="flex-1">
                <select
                  aria-label="Choose new status"
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
                      {
                        ORDER_STATUS_META[key as keyof typeof ORDER_STATUS_META]
                          .label
                      }
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
                    <DialogTitle>Подтвердите изменение статуса</DialogTitle>
                    <DialogDescription>
                      {pendingStatus ? (
                        <>
                          Вы уверены, что хотите изменить статус с «
                          {ORDER_STATUS_META[localStatus].label}» на «
                          {ORDER_STATUS_META[pendingStatus].label}»?
                        </>
                      ) : (
                        ""
                      )}
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
                      Отмена
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
                      Подтвердить
                    </button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      <section>
        <h3 className="text-sm font-semibold text-slate-900">Клиент</h3>
        <div className="mt-2 space-y-1 text-sm text-slate-700">
          <div>
            <span className="text-xs font-semibold text-slate-500">Имя: </span>
            <span className="font-medium text-slate-900">
              {order.customerName}
            </span>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500">
              Email:{" "}
            </span>
            <span className="text-xs text-slate-500">
              {order.customerEmail}
            </span>
          </div>
          {/* biome-ignore lint/suspicious/noExplicitAny: <no type for now> */}
          {(order as any).phone && (
            <div>
              <span className="text-xs font-semibold text-slate-500">
                Телефон:{" "}
              </span>
              <span className="text-xs text-slate-500">
                {/* biome-ignore lint/suspicious/noExplicitAny: <no type for now> */}
                {(order as any).phone}
              </span>
            </div>
          )}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-900">Доставка</h3>
        <div className="mt-2 text-sm text-slate-700">
          {order.deliveryType === "delivery" ? (
            <div className="space-y-1">
              <div>
                <span className="text-xs font-semibold text-slate-500">
                  Тип:{" "}
                </span>
                <span>Доставка</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500">
                  Адрес:{" "}
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
                  Тип:{" "}
                </span>
                <span>Самовывоз</span>
              </div>
              {order.pickupDateTime && (
                <div>
                  <span className="text-xs font-semibold text-slate-500">
                    Время самовывоза:{" "}
                  </span>
                  <span className="text-sm text-slate-700">
                    {new Date(order.pickupDateTime).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-900">Товары</h3>
        <div className="mt-2 space-y-2 text-sm text-slate-700">
          {order.items.map((item, idx) => {
            // Avoid calling hooks inside loops — prefer item.productImageUrl,
            // otherwise fall back to the first image from the product we fetched.
            const imageUrl =
              // biome-ignore lint/suspicious/noExplicitAny: <no type for now>
              (item as any).productImageUrl ??
              productImageById.get(item.productId) ??
              null;
            return (
              <a
                key={`${order._id}-${item.productId}-${idx}`}
                href={`/catalog/${item.productId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-md border border-slate-100 bg-white/80 p-3 transition hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-secondary/10 relative aspect-square h-12 w-12 shrink-0 overflow-hidden rounded-md">
                      {imageUrl ? (
                        <ImageKitPicture
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
                        Qty: {item.quantity}
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
                      <div>color: {item.personalization.color}</div>
                    )}
                    {item.personalization.text && (
                      <div>text: "{item.personalization.text}"</div>
                    )}
                    {item.personalization.number && (
                      <div>number: {item.personalization.number}</div>
                    )}
                  </div>
                )}
              </a>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-900">Оплата</h3>
        <div className="mt-2 text-sm text-slate-700">
          <div>Метод: {order.paymentMethod ?? "—"}</div>
          {order.deliveryFee ? (
            <div>Доставка: {formatCurrency(order.deliveryFee)}</div>
          ) : null}
          <div className="mt-2 font-semibold">
            Итого: {formatCurrency(order.grandTotal ?? order.totalAmount)}
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-900">
          Технические детали
        </h3>
        <div className="mt-2 text-xs text-slate-500">
          <div>Статус: {localStatus}</div>
          <div>Currency: {order.currency ?? "EUR"}</div>
        </div>
      </section>
    </aside>
  );
}

export default OrderDetails;
