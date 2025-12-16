"use client";

import { Image as ImageKitImage } from "@imagekit/next";
import { useQuery } from "convex-helpers/react/cache";
import {
  CalendarCheck2,
  Check,
  ChevronDown,
  Copy,
  MapPin,
  MessageSquare,
  User,
} from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { BALLOON_COLORS, getColorStyle } from "@/constants/colors";
import { STORE_INFO } from "@/constants/config";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { Link } from "@/i18n/routing";
import { palette } from "./palette";

type OrdersPanelProps = {
  orders?: Doc<"orders">[];
};

export function OrdersPanel({ orders }: OrdersPanelProps) {
  const t = useTranslations("profile.orders");
  const tCommon = useTranslations("common");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const formattedOrders = orders ?? [];

  if (orders === undefined) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`order-skeleton-${index}`}
            className="h-32 animate-pulse rounded-3xl bg-[rgba(var(--primary-rgb),0.06)]"
          />
        ))}
      </div>
    );
  }

  if (formattedOrders.length === 0) {
    return (
      <div
        className={`bg-background/50 flex flex-col items-center gap-3 rounded-3xl border px-8 py-16 text-center ${
          palette.softBorder
        } ${palette.softSurface}`}
      >
        <Image
          src="/imgs/cat.png"
          alt={tCommon("noBalloonsFound")}
          width={150}
          height={150}
        />
        <p className="text-deep text-lg font-medium">{t("noOrdersYet")}</p>
        <p className={`text-sm ${palette.mutedText}`}>
          {t("everyCelebrationStarts")}
        </p>
        <Link
          href="/catalog"
          className="bg-secondary text-on-secondary inline-flex items-center justify-center rounded-full px-6 py-3 text-xs font-semibold tracking-widest uppercase transition hover:brightness-95"
        >
          {t("shopBalloons")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {formattedOrders.map((order) => (
        <OrderCard
          key={order._id}
          order={order}
          isExpanded={expandedOrderId === order._id}
          onToggle={() =>
            setExpandedOrderId((prev) =>
              prev === order._id ? null : order._id,
            )
          }
        />
      ))}
    </div>
  );
}

type OrderCardProps = {
  order: Doc<"orders">;
  isExpanded: boolean;
  onToggle: () => void;
};

function OrderCard({ order, isExpanded, onToggle }: OrderCardProps) {
  const t = useTranslations("profile.orders");
  const tCheckout = useTranslations("checkout.orderSummary");
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(order._id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const subtotal = order.items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  );
  const deliveryFee = order.deliveryFee ?? order.totalAmount - subtotal;

  return (
    <div
      className={`group overflow-hidden rounded-3xl border transition-all duration-300 ${palette.softBorder} bg-primary hover:shadow-sm`}
    >
      {/* Header Section - Always Visible */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full cursor-pointer px-4 py-4 transition-colors hover:bg-[rgba(var(--surface-rgb),0.02)] sm:px-6 sm:py-5"
      >
        <div className="flex w-full items-center flex-col sm:flex-row justify-between gap-3 sm:gap-4">
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="text-secondary inline-block rounded-full bg-[rgba(var(--secondary-rgb),0.15)] px-2.5 py-0.5 text-[10px] font-bold tracking-widest uppercase">
                {t(`status.${order.status}`)}
              </span>
              <span className={`text-xs ${palette.mutedText}`}>
                {order.pickupDateTime
                  ? new Date(order.pickupDateTime).toLocaleDateString()
                  : new Date(order._creationTime).toLocaleDateString()}
              </span>
            </div>

            <p className="text-deep w-full wrap-break-word text-base font-bold leading-tight sm:text-lg">
              {order.customerName}
            </p>

            <div
              className={`mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs ${palette.mutedText}`}
            >
              <span>{t("items", { count: order.items.length })}</span>
              <span className="opacity-30">•</span>
              <button
                type="button"
                onClick={handleCopyId}
                className="group/copy text-deep hover:bg-[rgba(var(--deep-rgb),0.05)] flex max-w-30 items-center gap-1 rounded px-2 py-1 font-mono text-[11px] font-semibold transition-colors sm:max-w-none"
                title="Click to copy order ID"
              >
                <span className="truncate">#{order._id}</span>
                <span className="opacity-0 transition-opacity group-hover/copy:opacity-100">
                  {copiedId ? (
                    <Check size={12} className="text-emerald-600" />
                  ) : (
                    <Copy size={12} />
                  )}
                </span>
              </button>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3 sm:gap-6">
            <p className="text-accent text-lg font-bold tracking-tight sm:text-xl">
              €{order.totalAmount.toFixed(2)}
            </p>
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-transform duration-300 ${palette.softBorder} ${
                isExpanded
                  ? "-rotate-180 bg-[rgba(var(--surface-rgb),0.05)]"
                  : "rotate-0"
              }`}
            >
              <ChevronDown
                size={16}
                className={`text-deep transition-colors ${isExpanded ? "text-accent" : ""}`}
              />
            </div>
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      <div
        id={`order-items-${order._id}`}
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-[rgba(var(--deep-rgb),0.06)] px-6 pb-6">
            {/* Delivery & Contact Info Grid */}
            <div className="mb-8 grid gap-6 rounded-2xl bg-[rgba(var(--surface-rgb),0.03)] py-5 sm:grid-cols-2">
              <div className="space-y-3">
                <h4 className="text-xs font-bold tracking-widest text-[rgba(var(--deep-rgb),0.5)] uppercase">
                  {t("recipient")}
                </h4>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white shadow-sm">
                    <User
                      size={14}
                      className="text-[rgba(var(--deep-rgb),0.7)]"
                    />
                  </div>
                  <div>
                    <p className="text-deep text-sm font-medium">
                      {order.customerName}
                    </p>
                    <p className={`text-xs ${palette.mutedText}`}>
                      {order.customerEmail}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold tracking-widest text-[rgba(var(--deep-rgb),0.5)] uppercase">
                  {order.deliveryType === "delivery"
                    ? t("deliveryTime")
                    : t("pickupTime")}
                </h4>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white shadow-sm">
                    {order.deliveryType === "delivery" ? (
                      <MapPin
                        size={14}
                        className="text-[rgba(var(--deep-rgb),0.7)]"
                      />
                    ) : (
                      <CalendarCheck2
                        size={14}
                        className="text-[rgba(var(--deep-rgb),0.7)]"
                      />
                    )}
                  </div>
                  <div>
                    <p className="text-deep text-sm font-medium">
                      {order.pickupDateTime
                        ? new Date(order.pickupDateTime).toLocaleString(
                            "de-DE",
                            {
                              dateStyle: "medium",
                              timeStyle: "short",
                            },
                          )
                        : "—"}
                    </p>
                    <p className={`text-xs ${palette.mutedText} line-clamp-1`}>
                      {order.deliveryType === "delivery"
                        ? order.shippingAddress
                          ? `${order.shippingAddress.streetAddress}, ${order.shippingAddress.city}`
                          : "—"
                        : STORE_INFO.address.formatted}
                    </p>
                  </div>
                </div>
              </div>

              {typeof order.shippingAddress !== "string" &&
                order.shippingAddress?.deliveryNotes && (
                  <div className="space-y-3 sm:col-span-2">
                    <h4 className="text-xs font-bold tracking-widest text-[rgba(var(--deep-rgb),0.5)] uppercase">
                      {t("notes")}
                    </h4>
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white shadow-sm">
                        <MessageSquare
                          size={14}
                          className="text-[rgba(var(--deep-rgb),0.7)]"
                        />
                      </div>
                      <p className="text-deep pt-1.5 text-sm leading-relaxed font-medium">
                        {order.shippingAddress.deliveryNotes}
                      </p>
                    </div>
                  </div>
                )}
            </div>

            {/* Order Items */}
            <div className="space-y-6">
              <h4 className="text-xs font-bold tracking-widest text-[rgba(var(--deep-rgb),0.5)] uppercase">
                {t("items", { count: order.items.length })}
              </h4>
              <div className="divide-y divide-[rgba(var(--deep-rgb),0.06)]">
                {order.items.map((item, index) => (
                  <OrderItemRow
                    key={`${item.productId}-${index}`}
                    item={item}
                  />
                ))}
              </div>
            </div>

            {/* Summary Footer */}
            <div className="mt-8 flex justify-end border-t border-[rgba(var(--deep-rgb),0.06)] pt-6">
              <div className="w-full space-y-3 sm:w-72">
                <div className="flex justify-between text-sm text-[rgba(var(--deep-rgb),0.7)]">
                  <span>{tCheckout("itemsSubtotal")}</span>
                  <span>€{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-[rgba(var(--deep-rgb),0.7)]">
                  <span>{tCheckout("delivery")}</span>
                  <span>
                    {deliveryFee > 0 ? `€${deliveryFee.toFixed(2)}` : "—"}
                  </span>
                </div>
                <div className="my-2 border-t border-dashed border-[rgba(var(--deep-rgb),0.15)]" />
                <div className="flex items-baseline justify-between">
                  <span className="text-deep text-base font-medium">
                    {tCheckout("total")}
                  </span>
                  <span className="text-accent text-2xl font-bold tracking-tight">
                    €{order.totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type OrderItem = Doc<"orders">["items"][number];

function OrderItemRow({ item }: { item: OrderItem }) {
  const t = useTranslations("profile.orders");
  const product = useQuery(api.products.get, { id: item.productId });
  const colorHex = (() => {
    const colorName = item.personalization?.color;
    if (!colorName) return undefined;
    const found = BALLOON_COLORS.find(
      (c) => c.name.toLowerCase() === colorName.toLowerCase(),
    );
    return found ? found.hex : undefined;
  })();

  const total = item.price * item.quantity;

  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <div className="bg-secondary/5 relative aspect-square h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[rgba(var(--deep-rgb),0.05)]">
            {product?.primaryImageUrl ? (
              <ImageKitImage
                src={product.primaryImageUrl}
                alt={item.productName}
                width={64}
                height={64}
                className="h-full w-full object-cover transition-transform duration-500 hover:scale-110"
                sizes="64px"
                transformation={[{ progressive: true }]}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-2xl">
                🎈
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-deep leading-tight font-medium">
              {item.productName}
            </p>

            {item.personalization && (
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                {item.personalization.color && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold tracking-wider text-[rgba(var(--deep-rgb),0.5)] uppercase">
                      {t("color")}
                    </span>
                    <span className="text-deep flex items-center gap-1.5 font-medium">
                      <span
                        className="h-3 w-3 rounded-full shadow-[0_0_0_1px_rgba(0,0,0,0.05)]"
                        style={{
                          ...getColorStyle(
                            item.personalization.color,
                            colorHex,
                          ),
                          border:
                            item.personalization.color === "White"
                              ? "1px solid #e5e5e5"
                              : undefined,
                        }}
                      />
                      {item.personalization.color}
                    </span>
                  </div>
                )}

                {item.personalization.color &&
                  (item.personalization.text ||
                    item.personalization.number) && (
                    <div className="h-3 w-px bg-[rgba(var(--deep-rgb),0.15)]" />
                  )}

                {item.personalization.text && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold tracking-wider text-[rgba(var(--deep-rgb),0.5)] uppercase">
                      {t("text")}
                    </span>
                    <span className="text-deep italic">
                      "{item.personalization.text}"
                    </span>
                  </div>
                )}

                {(item.personalization.color || item.personalization.text) &&
                  item.personalization.number && (
                    <div className="h-3 w-px bg-[rgba(var(--deep-rgb),0.15)]" />
                  )}

                {item.personalization.number && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold tracking-wider text-[rgba(var(--deep-rgb),0.5)] uppercase">
                      {t("number")}
                    </span>
                    <span className="text-deep font-medium">
                      {item.personalization.number}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-0.5 pl-4">
          <span className="text-deep text-lg font-bold tracking-tight">
            €{total.toFixed(2)}
          </span>
          {item.quantity > 1 && (
            <div
              className={`flex items-center gap-1.5 text-xs ${palette.mutedText}`}
            >
              <span className="font-medium">{item.quantity}</span>
              <span className="text-[10px]">×</span>
              <span>€{item.price.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
