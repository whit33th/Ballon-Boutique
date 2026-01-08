"use client";

import { Image } from "@imagekit/next";
import { useMutation, useQuery } from "convex/react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STORE_INFO } from "@/constants/config";
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
  const tCommon = useTranslations("common");
  const _currency = order.currency ?? "EUR";
  const updateStatus = useMutation(api.orders.updateStatus);
  const updatePickupDateTimeAdmin = useMutation(
    api.orders.updatePickupDateTimeAdmin,
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [localStatus, setLocalStatus] = useState(order.status);
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [localPickupDateTime, setLocalPickupDateTime] = useState(
    order.pickupDateTime ?? "",
  );

  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState<string>("");
  const [selectedSlotIso, setSelectedSlotIso] = useState<string>("");
  const [isSavingPickupDateTime, setIsSavingPickupDateTime] = useState(false);

  // When switching between orders in the admin UI, reset local UI state.
  useEffect(() => {
    setIsUpdating(false);
    setPendingStatus(null);
    setIsDialogOpen(false);
    setLocalStatus(order.status);

    setIsSavingPickupDateTime(false);
    setIsRescheduleOpen(false);
    setRescheduleDate("");
    setSelectedSlotIso("");
    setLocalPickupDateTime(order.pickupDateTime ?? "");
  }, [order.pickupDateTime, order.status]);

  const isoToStoreYmd = useCallback((iso: string): string => {
    return new Date(iso).toLocaleDateString("en-CA", {
      timeZone: STORE_INFO.geo.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }, []);

  const minRescheduleYmd = new Date().toLocaleDateString("en-CA", {
    timeZone: STORE_INFO.geo.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const rescheduleSlots = useQuery(
    api.orders.deliverySlotsForDate,
    order.deliveryType === "delivery" && isRescheduleOpen && rescheduleDate
      ? { date: rescheduleDate, ignoreOrderId: order._id }
      : "skip",
  );

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
      toast.success(tAdmin("toasts.orderUpdated"));
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : tOrderDetails("statusUpdateError");
      toast.error(msg);
    } finally {
      setIsUpdating(false);
    }
  }, [pendingStatus, updateStatus, order._id, tOrderDetails, tAdmin]);

  const openReschedule = useCallback(() => {
    const existing =
      typeof localPickupDateTime === "string" ? localPickupDateTime : "";
    const existingYmd =
      existing.trim().length > 0 ? isoToStoreYmd(existing) : "";
    const initialDate =
      existingYmd && existingYmd >= minRescheduleYmd
        ? existingYmd
        : minRescheduleYmd;
    setRescheduleDate(initialDate);
    setSelectedSlotIso(
      existingYmd === initialDate && existing.trim().length > 0 ? existing : "",
    );
    setIsRescheduleOpen(true);
  }, [isoToStoreYmd, localPickupDateTime, minRescheduleYmd]);

  const saveReschedule = useCallback(async () => {
    if (order.deliveryType !== "delivery") return;
    if (!selectedSlotIso) return;
    setIsSavingPickupDateTime(true);
    try {
      await updatePickupDateTimeAdmin({
        orderId: order._id,
        pickupDateTime: selectedSlotIso,
      });
      setLocalPickupDateTime(selectedSlotIso);
      toast.success(tAdmin("toasts.orderUpdated"));
      setIsRescheduleOpen(false);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : tAdmin("toasts.orderUpdateFailed");
      toast.error(msg);
    } finally {
      setIsSavingPickupDateTime(false);
    }
  }, [
    order._id,
    order.deliveryType,
    selectedSlotIso,
    tAdmin,
    updatePickupDateTimeAdmin,
  ]);

  const clearReschedule = useCallback(async () => {
    setIsSavingPickupDateTime(true);
    try {
      await updatePickupDateTimeAdmin({
        orderId: order._id,
        pickupDateTime: "",
      });
      setLocalPickupDateTime("");
      toast.success(tAdmin("toasts.orderUpdated"));
      setIsRescheduleOpen(false);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : tAdmin("toasts.orderUpdateFailed");
      toast.error(msg);
    } finally {
      setIsSavingPickupDateTime(false);
    }
  }, [order._id, tAdmin, updatePickupDateTimeAdmin]);

  return (
    <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
      <div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="text-xs text-slate-500">
              {tOrdersTable("order")}
            </div>
            <div className="font-mono text-sm font-semibold break-all text-slate-900 sm:text-base">
              #{order._id}
            </div>
            <div className="text-xs text-slate-400">
              {formatDateTime(order._creationTime)}
            </div>
          </div>

          <div className="flex items-center gap-3 sm:shrink-0">
            <div className="flex w-full items-center gap-2 sm:w-56">
              <span className="text-xs text-slate-500">
                {tOrdersTable("status")}:
              </span>
              <div className="flex-1">
                <Select
                  value={pendingStatus ?? localStatus}
                  onValueChange={(value) => {
                    const next = value as OrderStatus;
                    if (next === localStatus) {
                      setPendingStatus(null);
                      return;
                    }
                    setPendingStatus(next);
                    // open confirmation dialog on mobile/desktop
                    setIsDialogOpen(true);
                  }}
                  disabled={isUpdating}
                >
                  <SelectTrigger className="h-9 w-full bg-white/50">
                    <SelectValue placeholder={tOrdersTable("status")} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(ORDER_STATUS_META).map((key) => (
                      <SelectItem key={key} value={key}>
                        {t(`orderStatus.${key}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                      {tCommon("cancel")}
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
                      {tCommon("confirm")}
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
        <div className="mt-2 rounded-sm bg-amber-100/50 p-2 text-sm text-slate-700">
          {order.deliveryType === "delivery" ? (
            <div className="space-y-1">
              <div>
                <span className="text-xs font-semibold text-slate-500">
                  {tOrderDetails("type")}:{" "}
                </span>
                <span>{tOrderDetails("deliveryType")}</span>
              </div>
              {localPickupDateTime && (
                <div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-xs font-semibold text-slate-500">
                      {tOrderDetails("deliveryTime")}:{" "}
                    </span>
                    <span className="text-sm text-slate-700">
                      {new Date(localPickupDateTime).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: STORE_INFO.geo.timezone,
                      })}
                    </span>
                    <button
                      className="rounded-md bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700"
                      onClick={openReschedule}
                      type="button"
                    >
                      {tOrderDetails("changeTime")}
                    </button>
                  </div>
                </div>
              )}
              {!localPickupDateTime && (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-xs font-semibold text-slate-500">
                    {tOrderDetails("deliveryTime")}:{" "}
                  </span>
                  <span className="text-sm text-slate-700">—</span>
                  <button
                    className="rounded-md bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700"
                    onClick={openReschedule}
                    type="button"
                  >
                    {tOrderDetails("changeTime")}
                  </button>
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
              {localPickupDateTime && (
                <div>
                  <span className="text-xs font-semibold text-slate-500">
                    {tOrderDetails("pickupTime")}:{" "}
                  </span>
                  <span className="text-sm text-slate-700">
                    {new Date(localPickupDateTime).toLocaleDateString(
                      undefined,
                      {
                        dateStyle: "medium",
                        timeZone: STORE_INFO.geo.timezone,
                      },
                    )}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Reschedule dialog (delivery only) */}
      <Dialog
        open={isRescheduleOpen}
        onOpenChange={(open) => {
          setIsRescheduleOpen(open);
          if (!open) {
            setSelectedSlotIso("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tOrderDetails("rescheduleTitle")}</DialogTitle>
            <DialogDescription>
              {tOrderDetails("rescheduleDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <label className="block">
              <div className="mb-1 text-xs font-semibold text-slate-500">
                {tOrderDetails("selectDate")}
              </div>
              <input
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                type="date"
                value={rescheduleDate}
                min={minRescheduleYmd}
                onChange={(e) => {
                  setRescheduleDate(e.target.value);
                  setSelectedSlotIso("");
                }}
              />
            </label>

            <div>
              <div className="mb-2 text-xs font-semibold text-slate-500">
                {tOrderDetails("selectSlot")}
              </div>

              {!Array.isArray(rescheduleSlots) ? (
                <div className="text-sm text-slate-500">
                  {tOrderDetails("loadingSlots")}
                </div>
              ) : rescheduleSlots.length === 0 ? (
                <div className="text-sm text-slate-500">
                  {tOrderDetails("noSlots")}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {rescheduleSlots.map((slot) => {
                    const selected = selectedSlotIso === slot.iso;
                    return (
                      <button
                        key={slot.iso}
                        type="button"
                        disabled={!slot.available}
                        onClick={() => setSelectedSlotIso(slot.iso)}
                        className={
                          "rounded-md border px-2 py-2 text-sm font-semibold transition " +
                          (selected
                            ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                            : slot.available
                              ? "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                              : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400")
                        }
                      >
                        {slot.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <button
              className="rounded-md bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700"
              onClick={async () => {
                await clearReschedule();
              }}
              disabled={isSavingPickupDateTime}
              type="button"
            >
              {tOrderDetails("clearTime")}
            </button>
            <button
              className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
              onClick={async () => {
                await saveReschedule();
              }}
              disabled={isSavingPickupDateTime || !selectedSlotIso}
              type="button"
            >
              {isSavingPickupDateTime
                ? tOrderDetails("saving")
                : tOrderDetails("saveTime")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                        {tAdmin.has(`colors.${item.personalization.color}`)
                          ? tAdmin(`colors.${item.personalization.color}`)
                          : item.personalization.color}
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
