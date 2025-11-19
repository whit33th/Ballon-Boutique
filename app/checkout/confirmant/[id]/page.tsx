"use client";

import { useQuery } from "convex-helpers/react/cache";
import { ArrowRight, CalendarCheck2, Home, Mail, PackageCheck } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { CheckoutResultShell, CheckoutResultSkeleton } from "@/app/checkout/_components/CheckoutResultShell";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

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
  const handleSecondaryAction = () => router.push("/profile");

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
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                Order reference
              </p>
              <p className="font-mono text-sm text-gray-900 break-all">{order._id}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                Total paid
              </p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(order.grandTotal ?? order.totalAmount, currency)}
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <InfoBadge icon={<CalendarCheck2 className="h-4 w-4" />} label="Status" value={order.status} />
            <InfoBadge icon={<PackageCheck className="h-4 w-4" />} label="Delivery" value={deliveryLabel} />
            <InfoBadge icon={<Mail className="h-4 w-4" />} label="Receipt" value={order.customerEmail} />
          </div>
        </section>

        <section className="rounded-2xl bg-white/70 p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Items reserved</h2>
          <div className="mt-4 space-y-3">
            {order.items.map((item) => (
              <div
                key={`${item.productId}-${item.productName}`}
                className="flex items-start justify-between rounded-2xl border border-gray-100 bg-white/80 p-4"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">{item.productName}</p>
                  <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {formatCurrency(item.price * item.quantity, currency)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-white/70 p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Where we deliver</h2>
          <div className="mt-3 flex items-start gap-3 rounded-2xl border border-gray-100 bg-white/80 p-4">
            <Home className="h-5 w-5 text-secondary" />
            <div>
              <p className="text-sm font-semibold text-gray-900">{order.customerName}</p>
              <p className="whitespace-pre-line text-sm text-gray-600">
                {order.shippingAddress}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white/70 p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Next steps</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handlePrimaryAction}
              className="btn-accent flex items-center justify-center gap-2 rounded-2xl py-3 font-semibold"
            >
              Continue shopping
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleSecondaryAction}
              className="rounded-2xl border border-gray-200 py-3 font-semibold text-gray-900 transition hover:border-gray-300"
            >
              View all orders
            </button>
          </div>
        </section>
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
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-2 text-sm font-semibold capitalize text-gray-900">{value}</p>
    </div>
  );
}

