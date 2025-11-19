"use client";

import { useQuery } from "convex-helpers/react/cache";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { CheckoutResultShell, CheckoutResultSkeleton } from "@/app/checkout/_components/CheckoutResultShell";
import { getWhatsAppLink } from "@/constants/config";
import { api } from "@/convex/_generated/api";

export default function CheckoutDeclinedPage() {
  const params = useParams();
  const router = useRouter();
  const intentId = params.id as string;

  const lookup = useQuery(api.paymentsLookup.lookupByIntent, {
    paymentIntentId: intentId,
  });

  const handleRetry = () => router.push("/checkout");
  const handleSupport = () => {
    const message = `Hi! My payment with intent ${intentId} was declined. Can you help me finish the order?`;
    window.open(getWhatsAppLink(message), "_blank");
  };

  if (lookup === undefined) {
    return <CheckoutResultSkeleton />;
  }

  if (!lookup) {
    return (
      <CheckoutResultShell
        tone="error"
        badge="Checkout"
        title="Payment details missing"
        description="We couldn’t find that attempt. Try again or contact us on WhatsApp."
        icon="❌"
      >
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleRetry}
            className="btn-accent w-full rounded-2xl py-3 font-semibold"
          >
            Back to checkout
          </button>
          <button
            type="button"
            onClick={handleSupport}
            className="w-full rounded-2xl border border-gray-200 py-3 font-semibold text-gray-900 transition hover:border-gray-300"
          >
            Message support
          </button>
        </div>
      </CheckoutResultShell>
    );
  }

  return (
    <CheckoutResultShell
      tone="error"
      badge="Checkout declined"
      title="Payment was declined"
      description="The bank or payment provider rejected this transaction. You can retry or reach out to us."
      icon="⚠️"
      highlight={
        lookup.lastError ? (
          <p className="mt-4 text-sm font-semibold text-red-700">{lookup.lastError}</p>
        ) : null
      }
    >
      <div className="space-y-5">
        <section className="rounded-2xl bg-white/80 p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Attempt details</h2>
          <div className="mt-4 space-y-3 text-sm">
            <DetailRow label="Payment intent" value={lookup.paymentIntentId} />
            <DetailRow label="Status" value={lookup.status} />
            <DetailRow
              label="Linked order"
              value={lookup.orderId ? String(lookup.orderId) : "Not created"}
            />
          </div>
        </section>

        <section className="rounded-2xl bg-white/80 p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">What you can do</h2>
          <ul className="mt-4 space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-secondary" />
              Try another card or contact your bank to approve the payment.
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-secondary" />
              Confirm that the billing name and email match your bank details.
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-secondary" />
              Message us on WhatsApp and we’ll hold the set while you retry.
            </li>
          </ul>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleRetry}
              className="btn-accent flex-1 rounded-2xl py-3 font-semibold"
            >
              Retry checkout
            </button>
            <button
              type="button"
              onClick={handleSupport}
              className="flex-1 rounded-2xl border border-gray-200 py-3 font-semibold text-gray-900 transition hover:border-gray-300"
            >
              Contact support
            </button>
          </div>
        </section>

        <button
          type="button"
          onClick={() => router.push("/")}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Continue shopping
        </button>
      </div>
    </CheckoutResultShell>
  );
}

type DetailRowProps = {
  label: string;
  value: string;
};

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex flex-col rounded-2xl border border-gray-100 bg-white/70 p-3 text-gray-900 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
        {label}
      </span>
      <span className="mt-1 font-mono text-sm text-gray-900 sm:mt-0 break-all">
        {value}
      </span>
    </div>
  );
}

