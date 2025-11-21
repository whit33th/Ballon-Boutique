"use client";

import { useEffect, useRef, useState } from "react";
import type { Doc } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { ORDER_STATUS_META } from "./types";
import { formatCurrency, formatDateTime } from "./utils";

interface OrdersTableProps {
  orders: Array<Doc<"orders">>;
  isLoading: boolean;
  onSelect?: (orderId: string) => void;
  selectedOrderId?: string | null;
}

export function OrdersTable({
  orders,
  isLoading,
  onSelect,
  selectedOrderId,
}: OrdersTableProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const _toggle = (id: string) =>
    setExpanded((s) => {
      const next = !s[id];
      const newState = { ...s, [id]: next };
      return newState;
    });

  const mobileTopRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!selectedOrderId) return;
    // Smooth scroll the top of the mobile list into view so details panel is visible
    const el = mobileTopRef.current;
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedOrderId]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-sm">
      {/* Desktop / table view */}
      <div className="hidden md:block">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
            <tr>
              <th className="px-6 py-3 text-left">Заказ</th>
              <th className="px-6 py-3 text-left">Клиент</th>
              <th className="px-6 py-3 text-left">Состав</th>
              <th className="px-6 py-3 text-left">Статус</th>
              <th className="px-6 py-3 text-right">Сумма</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="текст-center px-6 py-12">
                  <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
                  <p className="mt-3 text-sm text-slate-500">
                    Загружаем список заказов...
                  </p>
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-12 text-center text-slate-500"
                >
                  Заказы пока не оформлены или доступ к ним ограничен.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr
                  key={order._id}
                  className={`hover:bg-slate-50/60 ${selectedOrderId === order._id ? "bg-slate-50/80" : ""}`}
                  onClick={() => onSelect?.(order._id)}
                  style={{ cursor: onSelect ? "pointer" : undefined }}
                >
                  <td className="px-6 py-4 font-semibold whitespace-nowrap text-slate-900">
                    #{order._id.slice(-8)}
                    <div className="text-xs font-normal text-slate-400">
                      {formatDateTime(order._creationTime)}
                    </div>
                  </td>
                  <td className="max-w-[220px] px-6 py-4">
                    <div className="font-medium">{order.customerName}</div>
                    <div className="text-xs text-slate-400">
                      {order.customerEmail}
                    </div>
                  </td>
                  <td className="max-w-[280px] px-6 py-4 text-sm text-slate-600">
                    {order.items.slice(0, 2).map((item, idx) => (
                      <span key={`${order._id}-${item.productId}-${idx}`}>
                        {item.productName} ×{item.quantity}
                        {idx < order.items.slice(0, 2).length - 1 ? ", " : ""}
                      </span>
                    ))}
                    {order.items.length > 2 ? (
                      <span className="text-xs text-slate-400">
                        {" "}
                        + ещё {order.items.length - 2}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                        ORDER_STATUS_META[order.status].tone,
                      )}
                    >
                      {ORDER_STATUS_META[order.status].label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-semibold whitespace-nowrap text-slate-900">
                    {formatCurrency(order.totalAmount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile / card view */}
      <div className="md:hidden" ref={mobileTopRef}>
        {/* If an order is selected (from parent), show its details panel at the top */}
        {selectedOrderId
          ? (() => {
              const selected = orders.find((o) => o._id === selectedOrderId);
              if (!selected) return null;
              return (
                <div className="mb-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs text-slate-500">Заказ</div>
                      <div className="font-mono font-semibold text-slate-900">
                        #{selected._id.slice(-8)}
                      </div>
                      <div className="text-xs text-slate-400">
                        {formatDateTime(selected._creationTime)}
                      </div>
                      <div className="mt-2 text-sm font-medium text-slate-800">
                        {selected.customerName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {selected.customerEmail}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end">
                      <div className="text-sm font-semibold text-slate-900">
                        {formatCurrency(selected.totalAmount)}
                      </div>
                      <div className="mt-2">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                            ORDER_STATUS_META[selected.status].tone,
                          )}
                        >
                          {ORDER_STATUS_META[selected.status].label}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-slate-700">
                    <div className="text-xs text-slate-500">Состав:</div>
                    <div className="mt-1">
                      {selected.items.slice(0, 4).map((it, i) => (
                        <div
                          key={`sel-${i}`}
                          className="flex items-center justify-between py-1"
                        >
                          <div className="truncate">
                            {it.productName} ×{it.quantity}
                          </div>
                          <div className="ml-2 text-xs text-slate-500">
                            {formatCurrency(it.price * it.quantity)}
                          </div>
                        </div>
                      ))}
                      {selected.items.length > 4 && (
                        <div className="text-xs text-slate-400">
                          + ещё {selected.items.length - 4}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()
          : null}
        {isLoading ? (
          <div className="space-y-3 p-4">
            <div className="h-12 w-full animate-pulse rounded-lg bg-slate-100" />
            <div className="h-12 w-full animate-pulse rounded-lg bg-slate-100" />
          </div>
        ) : orders.length === 0 ? (
          <div className="p-4 text-sm text-slate-500">
            Заказы пока не оформлены или доступ к ним ограничен.
          </div>
        ) : (
          <div className="space-y-3 p-3">
            {orders.map((order) => (
              <button
                type="button"
                id={`card-${order._id}`}
                key={`card-${order._id}`}
                className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
                onClick={(e) => {
                  // Prevent parent handlers and ensure selection + expand on card click
                  e.stopPropagation();
                  onSelect?.(order._id);
                  setExpanded((s) => ({ ...s, [order._id]: !s[order._id] }));
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">
                      #{order._id}
                    </div>
                    <div className="text-xs text-slate-400">
                      {formatDateTime(order._creationTime)}
                    </div>
                    <div className="mt-2 text-sm font-medium text-slate-800">
                      {order.customerName}
                    </div>
                    <div className="text-xs text-slate-500">
                      {order.customerEmail}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end">
                    <div className="text-sm font-semibold text-slate-900">
                      {formatCurrency(order.totalAmount)}
                    </div>
                    <div className="mt-2">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                          ORDER_STATUS_META[order.status].tone,
                        )}
                      >
                        {ORDER_STATUS_META[order.status].label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card is clickable — click to select and toggle details. 'Open' button removed per request. */}

                {expanded[order._id] && (
                  <div className="mt-3 border-t pt-3 text-sm text-slate-700">
                    <div className="text-xs text-slate-500">Состав:</div>
                    <div className="mt-1">
                      {order.items.map((it, i) => (
                        <div
                          key={`it-${i}`}
                          className="flex items-center justify-between py-1"
                        >
                          <div className="truncate">
                            {it.productName} ×{it.quantity}
                          </div>
                          <div className="ml-2 text-xs text-slate-500">
                            {formatCurrency(it.price * it.quantity)}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-xs text-slate-500">Адрес:</div>
                    <div className="text-sm text-slate-700">
                      {typeof order.shippingAddress === "string" 
                        ? order.shippingAddress 
                        : order.shippingAddress 
                          ? `${order.shippingAddress.streetAddress}\n${order.shippingAddress.postalCode} ${order.shippingAddress.city}${order.shippingAddress.deliveryNotes ? `\n${order.shippingAddress.deliveryNotes}` : ""}`
                          : "—"}
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
