"use client";

import { useQuery } from "convex-helpers/react/cache";
import {
  ArrowRight,
  CalendarCheck2,
  Home,
  Mail,
  PackageCheck,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import {
  CheckoutResultShell,
  CheckoutResultSkeleton,
} from "@/app/checkout/_components/CheckoutResultShell";
import { BALLOON_COLORS, getColorStyle } from "@/constants/colors";
import { getFormattedAddress, STORE_INFO } from "@/constants/config";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { composeAddress } from "@/lib/address";

const formatCurrency = (value: number, currency = "EUR") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);

export default function CheckoutConfirmantPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const order = useQuery(api.orders.getPublic, {
    id: orderId as Id<"orders">,
  });

  const handlePrimaryAction = () => router.push("/");
  const _handleSecondaryAction = () => router.push("/profile");

  if (order === undefined) {
    return <CheckoutResultSkeleton />;
  }

  if (!order) {
    return (
      <CheckoutResultShell
        tone="error"
        badge="Checkout"
        title="Order not found"
        description="We couldn’t locate that order. Please double-check the link or reach out to us."
        icon="❌"
      >
        <div className="space-y-4">
          <button
            type="button"
            onClick={handlePrimaryAction}
            className="btn-accent w-full rounded-2xl py-3 font-semibold"
          >
            Back to home
          </button>
        </div>
      </CheckoutResultShell>
    );
  }

  const currency = order.currency ?? "EUR";
  const deliveryLabel =
    order.deliveryType === "delivery" ? "Courier delivery" : "Studio pickup";
  const deliveryFeeAmount = order.deliveryFee ?? 0;

  return (
    <CheckoutResultShell
      tone="success"
      badge="Checkout complete"
      title="Payment received — order confirmed"
      description="We locked your items and emailed the receipt. You can find the details below."
      icon="🎉"
      highlight={
        order.pickupDateTime ? (
          <p className="mt-4 text-sm text-gray-700">
            Pickup window: {new Date(order.pickupDateTime).toLocaleString()}
          </p>
        ) : null
      }
    >
      <div className="space-y-6">
        <section className="rounded-2xl bg-white/70 p-5 shadow-sm ring-1 ring-gray-100">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-gray-500 uppercase">
                Order reference
              </p>
              <p className="font-mono text-sm break-all text-gray-900">
                {order._id}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold tracking-[0.18em] text-gray-500 uppercase">
                Total paid
              </p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(
                  order.grandTotal ?? order.totalAmount,
                  currency,
                )}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <InfoBadge
              icon={<CalendarCheck2 className="h-4 w-4" />}
              label="Status"
              value={order.status}
            />
            <InfoBadge
              icon={<PackageCheck className="h-4 w-4" />}
              label="Delivery"
              value={deliveryLabel}
            />
            <InfoBadge
              icon={<Mail className="h-4 w-4" />}
              label="Receipt"
              value={order.customerEmail}
            />
            {order.paymentMethod && (
              <InfoBadge
                icon={<PackageCheck className="h-4 w-4" />}
                label="Payment"
                value={
                  order.paymentMethod === "full_online"
                    ? "Full online payment"
                    : order.paymentMethod === "partial_online"
                      ? "Partial online payment"
                      : order.paymentMethod === "cash"
                        ? "Cash"
                        : String(order.paymentMethod)
                }
              />
            )}
          </div>
        </section>

        <section className="mt-4 space-y-3 rounded-2xl bg-white/70 p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            Items reserved
          </h2>
          {order.items.map((item, index) => {
            const colorName = item.personalization?.color;
            const colorHex = colorName
              ? BALLOON_COLORS.find(
                  (c) => c.name.toLowerCase() === colorName.toLowerCase(),
                )?.hex
              : undefined;

            return (
              <article
                key={`${item.productId}-${item.productName}-${index}`}
                className="flex items-start justify-between rounded-2xl border border-gray-100 bg-white/80 p-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {item.productName}
                  </p>

                  {/* Personalization details */}
                  {item.personalization && (
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                      {item.personalization.color && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-gray-500">
                            color:
                          </span>
                          <span
                            className="h-3 w-3 shrink-0 rounded-full border"
                            style={{
                              ...getColorStyle(
                                item.personalization.color,
                                colorHex,
                              ),
                              borderColor:
                                item.personalization.color === "White"
                                  ? "#ddd"
                                  : undefined,
                            }}
                          />
                          <span className="ml-1 whitespace-nowrap">
                            {item.personalization.color}
                          </span>
                        </div>
                      )}

                      {item.personalization.text && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-gray-500">
                            text:
                          </span>
                          <span className="whitespace-nowrap">
                            "{item.personalization.text}"
                          </span>
                        </div>
                      )}

                      {item.personalization.number && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-gray-500">
                            number:
                          </span>
                          <span className="whitespace-nowrap">
                            {item.personalization.number}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="mt-2 text-xs text-gray-500">
                    Qty: {item.quantity}
                  </p>
                </div>

                <p className="text-sm font-semibold text-gray-900">
                  {formatCurrency(item.price * item.quantity, currency)}
                </p>
              </article>
            );
          })}

          {deliveryFeeAmount > 0 && (
            <div className="mt-3 text-right text-sm text-gray-700">
              <span className="font-semibold">Delivery fee: </span>
              {formatCurrency(deliveryFeeAmount, currency)}
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-white/70 p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            Where we deliver
          </h2>
          <div className="mt-3 flex items-start gap-3 rounded-2xl border border-gray-100 bg-white/80 p-4">
            <Home className="text-secondary h-5 w-5" />
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {order.customerName}
              </p>
              <p className="text-sm whitespace-pre-line text-gray-600">
                {typeof order.shippingAddress === "string" 
                  ? order.shippingAddress 
                  : order.shippingAddress 
                    ? composeAddress(order.shippingAddress)
                    : "—"}
              </p>
            </div>
          </div>
        </section>
        <button
          type="button"
          onClick={() => {
            // Printable popup for simple PDF saving via browser Print -> Save as PDF
            // NOTE: avoid passing `noopener,noreferrer` in features because
            // some browsers return `null` for the opened window which looks
            // like a blocked popup. Open a plain blank tab instead.
            const printable = window.open("", "_blank");
            if (!printable) {
              // Popup was likely blocked — inform the user.
              // Using alert keeps this dependency-free; you can replace with your toast.
              alert(
                "Popup blocked. Please allow popups for this site to download the PDF, or use your browser's Print -> Save as PDF.",
              );
              return;
            }
            const title = `Order ${order._id}`;
            const confirmUrl = `${window.location.origin}/checkout/confirmant/${order._id}`;
            const customerPhone =
              // biome-ignore lint/suspicious/noExplicitAny: <no type for now>
              (order as any).phone ?? (order as any).customerPhone ?? "";
            const paymentLabel = order.paymentMethod
              ? order.paymentMethod === "full_online"
                ? "Full online payment"
                : order.paymentMethod === "partial_online"
                  ? "Partial online payment"
                  : order.paymentMethod === "cash"
                    ? "Cash"
                    : String(order.paymentMethod)
              : "";
            const deliveryFeeForPrint = order.deliveryFee ?? 0;
            const shippingAddressForPrint = typeof order.shippingAddress === "string"
              ? order.shippingAddress
              : order.shippingAddress
                ? composeAddress(order.shippingAddress)
                : "—";

            const lines = order.items
              .map((it) => {
                const personalization = it.personalization
                  ? `\n  color: ${it.personalization.color ?? ""}\n  text: ${it.personalization.text ?? ""}\n  number: ${it.personalization.number ?? ""}`
                  : "";
                return `<div style="margin-bottom:8px;"><strong>${it.productName}</strong><br/>Qty: ${it.quantity}<br/>Price: ${new Intl.NumberFormat("en-US", { style: "currency", currency }).format(it.price * it.quantity)}<pre style="white-space:pre-wrap;margin:4px 0 0 0;">${personalization}</pre></div>`;
              })
              .join("\n");

            printable.document.write(`
              <html>
                <head>
                  <title>${title}</title>
                  <meta charset="utf-8" />
                </head>
                <body>
                  <h1>${title}</h1>
                  <div>Customer: ${order.customerName} (${order.customerEmail})</div>
                  ${customerPhone ? `<div>Phone: ${customerPhone}</div>` : ""}
                  <div>Shipping: ${shippingAddressForPrint}</div>
                  ${paymentLabel ? `<div>Payment method: ${paymentLabel}</div>` : ""}
                  <hr/>
                  
                  ${lines}
                  <hr/>
                  ${deliveryFeeForPrint > 0 ? `<div>Delivery fee: ${new Intl.NumberFormat("en-US", { style: "currency", currency }).format(deliveryFeeForPrint)}</div>` : ""}
                  <hr/>
                  <div>Total: ${new Intl.NumberFormat("en-US", { style: "currency", currency }).format(order.grandTotal ?? order.totalAmount)}</div>
                  <hr/>
                  <div style="margin-top:12px;font-size:12px;color:#444;">
                    <div><strong>${STORE_INFO.name}</strong> — ${STORE_INFO.slogan}</div>
                    <div>${getFormattedAddress()}</div>
                    <div>Contact: ${STORE_INFO.contact.email} | ${STORE_INFO.contact.phoneDisplay}</div>
                    <div style="margin-top:6px;font-size:11px;color:#666;">${STORE_INFO.legal.companyName} • ${STORE_INFO.legal.owner} • ${STORE_INFO.legal.vatNumber}</div>
                    <div style="margin-top:8px;font-size:12px;color:#1d4ed8;">
                      View confirmation online: <a href="${confirmUrl}">${confirmUrl}</a>
                    </div>
                  </div>
                </body>
              </html>
            `);
            printable.document.close();
            // Give the new window a moment to render then trigger print
            setTimeout(() => {
              try {
                printable.focus();
                printable.print();
                // optionally close after printing — keep open so user can cancel
                // printable.close();
              } catch (_e) {
                // ignore
              }
            }, 900);
          }}
          className="w-full rounded-2xl border border-gray-200 py-3 font-semibold text-gray-900 transition hover:border-gray-300"
        >
          Download PDF
        </button>
        <button
          type="button"
          onClick={handlePrimaryAction}
          className="btn-accent flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-3 font-semibold"
        >
          Continue shopping
          <ArrowRight className="h-4 w-4" />
        </button>

        {/* <button
              type="button"
              onClick={handleSecondaryAction}
              className="rounded-2xl border border-gray-200 py-3 font-semibold text-gray-900 transition hover:border-gray-300"
            >
              View all orders
            </button> */}
      </div>
    </CheckoutResultShell>
  );
}

type InfoBadgeProps = {
  icon: ReactNode;
  label: string;
  value: string;
};

function InfoBadge({ icon, label, value }: InfoBadgeProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white/70 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-gray-500 uppercase">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-2 text-sm font-semibold text-gray-900 capitalize">
        {value}
      </p>
    </div>
  );
}
