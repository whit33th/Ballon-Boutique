"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { type Preloaded, usePreloadedQuery } from "convex/react";
import {
  ArrowRight,
  CalendarCheck2,
  Home,
  Mail,
  PackageCheck,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { BALLOON_COLORS, getColorStyle } from "@/constants/colors";
import { getFormattedAddress, STORE_INFO } from "@/constants/config";
import type { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useRouter } from "@/i18n/routing";
import { composeAddress } from "@/lib/address";
import {
  CheckoutResultShell,
  CheckoutResultSkeleton,
} from "../../_components/CheckoutResultShell";

const formatCurrency = (value: number, currency = "EUR") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);

type OrderWithPhoneFields = Doc<"orders"> & {
  phone?: string | null;
  customerPhone?: string | null;
};

const resolveOrderPhone = (order: Doc<"orders">): string => {
  const extendedOrder = order as OrderWithPhoneFields;
  return extendedOrder.phone ?? extendedOrder.customerPhone ?? "";
};

interface CheckoutConfirmantClientProps {
  preloadedOrder: Preloaded<typeof api.orders.getPublic>;
}

export default function CheckoutConfirmantClient({
  preloadedOrder,
}: CheckoutConfirmantClientProps) {
  const t = useTranslations("checkoutConfirmant");
  const tCommon = useTranslations("common");
  const tCheckout = useTranslations("checkout");
  const router = useRouter();

  const order = usePreloadedQuery(preloadedOrder);

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
        title={t("orderNotFound")}
        description={t("orderNotFoundDescription")}
        icon="❌"
      >
        <div className="space-y-4">
          <button
            type="button"
            onClick={handlePrimaryAction}
            className="btn-accent w-full rounded-2xl py-3 font-semibold"
          >
            {t("backToHome")}
          </button>
        </div>
      </CheckoutResultShell>
    );
  }

  const currency = order.currency ?? "EUR";
  const deliveryLabel =
    order.deliveryType === "delivery"
      ? tCheckout("delivery.courier")
      : tCheckout("delivery.pickup");
  const deliveryFeeAmount = order.deliveryFee ?? 0;

  return (
    <CheckoutResultShell
      tone="success"
      badge={t("badge")}
      title={
        order.paymentMethod === "full_online"
          ? t("titleFull")
          : t("titlePartial")
      }
      description={t("description")}
      icon={
        <DotLottieReact
          className="h-auto w-36"
          src="https://lottie.host/313578b9-e6af-4e10-a4ec-eb98361ddc12/AZahlXk7Pt.lottie"
          loop
          autoplay
        />
      }
      highlight={
        order.pickupDateTime ? (
          <p className="text-secondary ring-secondary/10 mt-4 flex items-center justify-center gap-2 rounded-2xl bg-white/70 px-4 py-2 text-sm font-semibold ring-1">
            <CalendarCheck2 className="h-4 w-4" />
            <span>
              {t("pickupWindow")}:{" "}
              {new Date(order.pickupDateTime).toLocaleString()}
            </span>
          </p>
        ) : null
      }
    >
      <div className="space-y-6">
        <section className="rounded-2xl bg-white/70 p-5 shadow-sm ring-1 ring-gray-100">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-gray-500 uppercase">
                {t("orderReference")}
              </p>
              <p className="mt-0.5 font-mono text-sm break-all text-gray-900">
                {order._id}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold tracking-[0.18em] text-gray-500 uppercase">
                {t("totalPaid")}
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
              label={t("status")}
              value={t(`orderStatus.${order.status}`)}
            />
            <InfoBadge
              icon={<PackageCheck className="h-4 w-4" />}
              label={t("delivery")}
              value={deliveryLabel}
            />
            <InfoBadge
              icon={<Mail className="h-4 w-4" />}
              label={t("receipt")}
              value={order.customerEmail}
            />
            {order.paymentMethod && (
              <InfoBadge
                icon={<PackageCheck className="h-4 w-4" />}
                label={t("payment")}
                value={
                  order.paymentMethod === "full_online"
                    ? tCheckout("payment.fullOnline")
                    : order.paymentMethod === "partial_online"
                      ? tCheckout("payment.partialOnline")
                      : order.paymentMethod === "cash"
                        ? tCheckout("payment.cash")
                        : String(order.paymentMethod)
                }
              />
            )}
          </div>
        </section>

        <section className="mt-4 space-y-3 rounded-2xl bg-white/70 p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {t("itemsReserved")}
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
                            {tCommon("color")}:
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
                            {tCommon("text")}:
                          </span>
                          <span className="whitespace-nowrap">
                            "{item.personalization.text}"
                          </span>
                        </div>
                      )}

                      {item.personalization.number && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-gray-500">
                            {tCommon("number")}:
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
              <span className="font-semibold">
                {tCheckout("orderSummary.deliveryFee")}:{" "}
              </span>
              {formatCurrency(deliveryFeeAmount, currency)}
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-white/70 p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {t("whereWeDeliver")}
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
          onClick={async () => {
            // Printable popup for simple PDF saving via browser Print -> Save as PDF
            // NOTE: avoid passing `noopener,noreferrer` in features because
            // some browsers return `null` for the opened window which looks
            // like a blocked popup. Open a plain blank tab instead.
            const printable = window.open("", "_blank");
            if (!printable) {
              // Popup was likely blocked — inform the user.
              // Using alert keeps this dependency-free; you can replace with your toast.
              alert(t("popupBlocked"));
              return;
            }

            // Load Austrian German translations for PDF (always use de-AT for PDF)
            const deMessages = (await import("@/messages/de.json")).default;
            const tPdf = (key: string) => {
              const keys = key.split(".");
              let value: unknown = deMessages;
              for (const k of keys) {
                if (value && typeof value === "object" && k in value) {
                  value = (value as Record<string, unknown>)[k];
                } else {
                  return key;
                }
              }
              return typeof value === "string" ? value : key;
            };

            const title = `${tPdf("checkoutConfirmant.orderReference")} ${order._id}`;
            const confirmUrl = `${window.location.origin}/checkout/confirmant/${order._id}`;
            const customerPhone = resolveOrderPhone(order);
            const paymentLabel = order.paymentMethod
              ? tPdf(`checkoutConfirmant.paymentMethod.${order.paymentMethod}`)
              : "";
            const deliveryFeeForPrint = order.deliveryFee ?? 0;
            const shippingAddressForPrint =
              typeof order.shippingAddress === "string"
                ? order.shippingAddress
                : order.shippingAddress
                  ? composeAddress(order.shippingAddress)
                  : "—";
            const pickupWindowForPrint =
              order.paymentMethod === "cash" && order.pickupDateTime
                ? new Date(order.pickupDateTime).toLocaleString("de-AT", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "";

            const lines = order.items
              .map((it) => {
                const personalization = it.personalization
                  ? `\n  ${tPdf("common.color")}: ${it.personalization.color ?? ""}\n  ${tPdf("common.text")}: ${it.personalization.text ?? ""}\n  ${tPdf("common.number")}: ${it.personalization.number ?? ""}`
                  : "";
                return `<div style="margin-bottom:8px;"><strong>${it.productName}</strong><br/>${tPdf("common.quantity")}: ${it.quantity}<br/>${tPdf("common.price")}: ${new Intl.NumberFormat("de-AT", { style: "currency", currency }).format(it.price * it.quantity)}<pre style="white-space:pre-wrap;margin:4px 0 0 0;">${personalization}</pre></div>`;
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
                  <div>Kunde: ${order.customerName} (${order.customerEmail})</div>
                  ${customerPhone ? `<div>${tPdf("common.phone")}: ${customerPhone}</div>` : ""}
                  <div>${tPdf("checkoutConfirmant.delivery")}: ${shippingAddressForPrint}</div>
                  ${paymentLabel ? `<div>${tPdf("checkoutConfirmant.payment")}: ${paymentLabel}</div>` : ""}
                  ${
                    pickupWindowForPrint
                      ? `<div>${tPdf("checkoutConfirmant.pickupWindow")}: ${pickupWindowForPrint}</div>`
                      : ""
                  }
                  <hr/>
                  
                  ${lines}
                  <hr/>
                  ${deliveryFeeForPrint > 0 ? `<div>${tPdf("checkout.orderSummary.deliveryFee")}: ${new Intl.NumberFormat("de-AT", { style: "currency", currency }).format(deliveryFeeForPrint)}</div>` : ""}
                  <hr/>
                  <div>${tPdf("checkout.orderSummary.total")}: ${new Intl.NumberFormat("de-AT", { style: "currency", currency }).format(order.grandTotal ?? order.totalAmount)}</div>
                  <hr/>
                  <div style="margin-top:12px;font-size:12px;color:#444;">
                    <div><strong>${STORE_INFO.name}</strong> — ${STORE_INFO.slogan}</div>
                    <div>${getFormattedAddress()}</div>
                    <div>Kontakt: ${STORE_INFO.contact.email} | ${STORE_INFO.contact.phoneDisplay}</div>
                    <div style="margin-top:6px;font-size:11px;color:#666;">${STORE_INFO.legal.companyName} • ${STORE_INFO.legal.owner} • ${STORE_INFO.legal.vatNumber}</div>
                    <div style="margin-top:8px;font-size:12px;color:#1d4ed8;">
                      Bestätigung online ansehen: <a href="${confirmUrl}">${confirmUrl}</a>
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
          className="w-full rounded-2xl border border-gray-200 py-3 font-semibold text-gray-900 shadow transition hover:border-gray-300"
        >
          {t("downloadPdf")}
        </button>
        <button
          type="button"
          onClick={handlePrimaryAction}
          className="btn-accent flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-3 font-semibold shadow"
        >
          {t("continueShopping")}
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
