"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Doc } from "@/convex/_generated/dataModel";
import { palette } from "./palette";

type OrdersPanelProps = {
  orders?: Doc<"orders">[];
};

const MAX_DETAIL_HEIGHT = 512;

export function OrdersPanel({ orders }: OrdersPanelProps) {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const formattedOrders = orders ?? [];

  if (orders === undefined) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`order-skeleton-${index}`}
            className="h-32 animate-pulse rounded-3xl bg-[rgba(var(--primary-rgb),0.6)]"
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
          alt="No balloons found"
          width={150}
          height={150}
        />
        <p className="text-deep text-lg font-medium">No orders yet</p>
        <p className={`text-sm ${palette.mutedText}`}>
          Every celebration starts with a cart full of color.
        </p>
        <Link
          href="/catalog"
          className="bg-secondary text-on-secondary inline-flex h-11 items-center justify-center rounded-full px-6 text-xs font-semibold tracking-widest uppercase transition hover:brightness-95"
        >
          Shop balloons
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
  return (
    <div
      className={`grid gap-3 rounded-3xl border px-6 py-5 transition ${
        palette.softBorder
      } bg-[rgba(var(--primary-rgb),0.85)] hover:border-[rgba(var(--accent-rgb),0.6)]`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p
            className={`text-xs tracking-[0.3rem] uppercase ${palette.subtleText}`}
          >
            Order
          </p>
          <p className="text-deep text-lg font-medium">
            #{order._id.slice(-8)}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs tracking-[0.2rem] uppercase">
          <div className="bg-accent text-on-accent rounded-full px-4 py-1 font-semibold">
            ${order.totalAmount.toFixed(2)}
          </div>
          <button
            type="button"
            aria-expanded={isExpanded}
            aria-controls={`order-items-${order._id}`}
            className="flex items-center gap-1 rounded-full border px-3 py-1 text-[0.6rem] font-semibold transition hover:border-[rgba(var(--accent-rgb),0.6)]"
            onClick={onToggle}
          >
            {isExpanded ? "Hide" : "Details"}
            <span className="text-xs">↕</span>
          </button>
        </div>
      </div>
      <div
        className={`flex flex-wrap items-center justify-between gap-3 text-sm ${
          palette.mutedText
        }`}
      >
        <span>{new Date(order._creationTime).toLocaleDateString()}</span>
        <span>{order.items.length} item(s)</span>
        <span>{order.shippingAddress}</span>
        <span className="text-secondary rounded-full bg-[rgba(var(--secondary-rgb),0.18)] px-3 py-1 text-xs font-semibold tracking-[0.2rem] uppercase">
          {order.status}
        </span>
      </div>
      <div
        id={`order-items-${order._id}`}
        className="overflow-hidden transition-[max-height] duration-300 ease-out"
        style={{
          maxHeight: isExpanded ? MAX_DETAIL_HEIGHT : 0,
        }}
      >
        <div
          className={`mt-3 space-y-3 rounded-2xl border border-dashed px-4 py-3 transition-opacity duration-200 ${
            isExpanded ? "opacity-100" : "opacity-0"
          }`}
        >
          {order.items.map((item) => (
            <div
              key={`${item.productId}-${item.productName}-${item.quantity}`}
              className="flex items-center justify-between gap-4"
            >
              <div>
                <p className="text-deep text-sm font-semibold">
                  {item.productName}
                </p>
                <p className="text-muted text-xs">Qty: {item.quantity}</p>
              </div>
              <span className="text-accent text-sm font-semibold">
                ${(item.price * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
