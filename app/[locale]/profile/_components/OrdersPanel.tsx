"use client";

import { Image as ImageKitImage } from "@imagekit/next";
import { useQuery } from "convex-helpers/react/cache";
import { Mail, MapPin, Phone, User } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { BALLOON_COLORS, getColorStyle } from "@/constants/colors";
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
  const loggedInUser = useQuery(api.auth.loggedInUser);

  return (
    <div
      className={`grid gap-3 rounded-3xl border px-6 py-5 transition ${palette.softBorder} bg-primary hover:border-[rgba(var(--accent-rgb),0.6)]`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p
            className={`text-xs tracking-[0.3rem] uppercase ${palette.subtleText}`}
          >
            {t("order")}
          </p>
          <p className="text-deep text-lg font-medium">
            #{order._id.slice(-8)}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs tracking-[0.2rem] uppercase">
          <div className="bg-accent text-on-accent rounded-full px-4 py-1 font-semibold">
            €{order.totalAmount.toFixed(2)}
          </div>
          <button
            type="button"
            aria-expanded={isExpanded}
            aria-controls={`order-items-${order._id}`}
            className="flex items-center gap-1 rounded-full border px-3 py-1 text-[0.6rem] font-semibold transition hover:border-[rgba(var(--accent-rgb),0.6)]"
            onClick={onToggle}
          >
            {isExpanded ? t("hide") : t("details")}
            <span className="text-xs">↕</span>
          </button>
        </div>
      </div>

      <div
        className={`flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between ${palette.mutedText}`}
      >
        <div className="flex items-center gap-3">
          <span>{new Date(order._creationTime).toLocaleDateString()}</span>
          <span>{t("items", { count: order.items.length })}</span>
        </div>

        <div className="shrink-0">
          <span className="text-secondary rounded-full bg-[rgba(var(--secondary-rgb),0.18)] px-3 py-1 text-xs font-semibold tracking-[0.2rem] uppercase">
            {t(`status.${order.status}`)}
          </span>
        </div>
      </div>

      <div
        id={`order-items-${order._id}`}
        className="overflow-hidden transition-[max-height] duration-300 ease-out"
        style={{ maxHeight: isExpanded ? "100%" : 0 }}
      >
        <div
          className={`mt-3 space-y-3 transition-opacity duration-200 ${isExpanded ? "opacity-100" : "opacity-0"}`}
        >
          {/* Contact card — visually separated and left-aligned */}
          <div
            className={`w-full rounded-lg border bg-[rgba(var(--surface-rgb),0.02)] px-4 py-3 ${palette.softBorder}`}
          >
            <div className="mb-2 text-xs tracking-wide text-[rgba(var(--deep-rgb),0.45)] uppercase">
              {t("recipient")}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <User size={16} className="text-[rgba(var(--deep-rgb),0.85)]" />
                <span className="text-deep">{order.customerName}</span>
              </div>

              <div
                className={`flex items-center gap-2 text-xs ${palette.mutedText}`}
              >
                <Mail size={14} className="text-[rgba(var(--deep-rgb),0.6)]" />
                <span className="max-w-[48ch] truncate">
                  {order.customerEmail}
                </span>
              </div>

              <div
                className={`flex items-center gap-2 text-xs ${palette.mutedText}`}
              >
                <MapPin
                  size={14}
                  className="text-[rgba(var(--deep-rgb),0.6)]"
                />
                <span className="max-w-[48ch] truncate">
                  {typeof order.shippingAddress === "string"
                    ? order.shippingAddress
                    : order.shippingAddress
                      ? `${order.shippingAddress.streetAddress}, ${order.shippingAddress.postalCode} ${order.shippingAddress.city}`
                      : "—"}
                </span>
              </div>

              {loggedInUser?.phone && (
                <div
                  className={`flex items-center gap-2 text-xs ${palette.mutedText}`}
                >
                  <Phone
                    size={14}
                    className="text-[rgba(var(--deep-rgb),0.6)]"
                  />
                  <span className="truncate">{loggedInUser.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Items — each item gets its own subtle card for separation */}
          <div className="space-y-2">
            {order.items.map((item, index) => (
              <div
                key={`${item.productId}-${index}`}
                className={`rounded-md bg-[rgba(var(--surface-rgb),0.02)] px-3 py-2 ${
                  index !== order.items.length - 1
                    ? "border-b border-[rgba(var(--deep-rgb),0.06)]"
                    : ""
                }`}
              >
                <OrderItemRow item={item} />
              </div>
            ))}
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
  const totalStr = total.toFixed(2);
  const [intPart, cents] = totalStr.split(".");

  return (
    <div>
      <div className="py-3 sm:py-4">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:gap-4">
          <div className="flex w-full gap-3">
            <div className="bg-secondary/10 relative aspect-square h-10 w-10 shrink-0 overflow-hidden rounded-md sm:h-12 sm:w-12">
              {product?.primaryImageUrl ? (
                <ImageKitImage
                  src={product.primaryImageUrl}
                  alt={item.productName}
                  width={48}
                  height={48}
                  className="aspect-square object-cover"
                  sizes="48px"
                  transformation={[{ progressive: true }]}
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  🎈
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-deep text-sm font-semibold">
                {item.productName}
              </p>

              {item.personalization && (
                <div className="mt-1 flex flex-col items-start gap-1 sm:mt-2 sm:gap-2">
                  {item.personalization.color && (
                    <div className="flex flex-col items-start gap-1">
                      <span
                        className={`${palette.mutedText} text-[10px] font-semibold`}
                      >
                        {t("color")}:
                      </span>
                      <span className="text-deep inline-flex items-center gap-1 rounded-full bg-white/50 px-0 py-0.5 text-xs font-medium sm:gap-2">
                        <span
                          className="h-4 w-4 shrink-0 rounded-full shadow-sm"
                          style={{
                            ...getColorStyle(
                              item.personalization.color,
                              colorHex,
                            ),
                            border:
                              item.personalization.color === "White"
                                ? "1px solid #ddd"
                                : undefined,
                          }}
                        />
                        <span className="whitespace-nowrap">
                          {item.personalization.color}
                        </span>
                      </span>
                    </div>
                  )}

                  {item.personalization.text && (
                    <div className="flex flex-col items-start gap-1">
                      <span
                        className={`${palette.mutedText} text-[10px] font-semibold`}
                      >
                        {t("text")}:
                      </span>
                      <span className="text-deep inline-flex items-center rounded-full bg-white/50 px-0 py-0.5 text-xs font-medium italic">
                        <span className="whitespace-nowrap">
                          "{item.personalization.text}"
                        </span>
                      </span>
                    </div>
                  )}

                  {item.personalization.number && (
                    <div className="flex flex-col items-start gap-1">
                      <span
                        className={`${palette.mutedText} text-[10px] font-semibold`}
                      >
                        {t("number")}:
                      </span>
                      <span className="text-deep inline-flex items-center rounded-full bg-white/50 px-0 py-0.5 text-xs font-medium">
                        <span className="whitespace-nowrap">
                          {item.personalization.number}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 flex w-full items-center justify-between gap-3 sm:mt-0 sm:w-auto sm:justify-start">
            <span className="flex items-baseline gap-1">
              <span className="text-accent text-lg font-semibold sm:text-xl">
                €{intPart}
              </span>
              {cents !== "00" && (
                <span className={`${palette.mutedText} text-xs sm:text-sm`}>
                  .{cents}
                </span>
              )}
            </span>

            <span
              className={`bg-secondary/10 text-deep inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-semibold ${palette.softBorder} min-w-[3ch] text-center shadow-sm sm:w-[3ch]`}
            >
              ×{item.quantity}
            </span>
          </div>
        </div>
      </div>

      {/* divider removed — items are separated by their own subtle cards */}
    </div>
  );
}
