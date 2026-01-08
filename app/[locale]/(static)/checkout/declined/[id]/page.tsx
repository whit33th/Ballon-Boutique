"use client";

import { useQuery } from "convex-helpers/react/cache";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { STORE_INFO } from "@/constants/config";
import { api } from "@/convex/_generated/api";
import { useRouter } from "@/i18n/routing";
import {
  CheckoutResultShell,
  CheckoutResultSkeleton,
} from "../../_components/CheckoutResultShell";

export default function CheckoutDeclinedPage() {
  const t = useTranslations("checkout.declined");
  const params = useParams();
  const router = useRouter();
  const intentId = params.id as string;

  const lookup = useQuery(api.paymentsLookup.lookupByIntent, {
    paymentIntentId: intentId,
  });

  const handleRetry = () => router.push("/checkout");
  const handleSupport = () => {
    const subject = `Payment declined: ${intentId}`;
    const body = `Hi! My payment with intent ${intentId} was declined. Can you help me finish the order?`;
    const mailto = `mailto:${STORE_INFO.contact.email}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  };

  if (lookup === undefined) {
    return <CheckoutResultSkeleton />;
  }

  if (!lookup) {
    return (
      <CheckoutResultShell
        tone="error"
        badge={t("badge")}
        title={t("paymentDetailsMissing")}
        description={t("couldNotFindAttempt")}
        icon="❌"
      >
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleRetry}
            className="btn-accent w-full rounded-2xl py-3 font-semibold"
          >
            {t("backToCheckout")}
          </button>
          <button
            type="button"
            onClick={handleSupport}
            className="w-full rounded-2xl border border-gray-200 py-3 font-semibold text-gray-900 transition hover:border-gray-300"
          >
            {t("messageSupport")}
          </button>
        </div>
      </CheckoutResultShell>
    );
  }

  return (
    <CheckoutResultShell
      tone="error"
      badge={t("badge")}
      title={t("title")}
      description={t("description")}
      icon="⚠️"
      highlight={
        lookup.lastError ? (
          <p className="mt-4 text-sm font-semibold text-red-700">
            {lookup.lastError}
          </p>
        ) : null
      }
    >
      <div className="space-y-5">
        <section className="rounded-2xl bg-white/80 p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {t("attemptDetails")}
          </h2>
          <div className="mt-4 space-y-3 text-sm">
            <DetailRow
              label={t("paymentIntent")}
              value={lookup.paymentIntentId}
            />
            <DetailRow label={t("status")} value={lookup.status} />
            <DetailRow
              label={t("linkedOrder")}
              value={lookup.orderId ? String(lookup.orderId) : t("notCreated")}
            />
          </div>
        </section>

        <section className="rounded-2xl bg-white/80 p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {t("whatYouCanDo")}
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <AlertTriangle className="text-secondary mt-0.5 h-4 w-4" />
              {t("tryAnotherCard")}
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle className="text-secondary mt-0.5 h-4 w-4" />
              {t("confirmBillingDetails")}
            </li>
          </ul>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleRetry}
              className="btn-accent flex-1 rounded-2xl py-3 font-semibold"
            >
              {t("retryCheckout")}
            </button>
            <button
              type="button"
              onClick={handleSupport}
              className="flex-1 rounded-2xl border border-gray-200 py-3 font-semibold text-gray-900 transition hover:border-gray-300"
            >
              {t("contactSupport")}
            </button>
          </div>
        </section>

        <button
          type="button"
          onClick={() => router.push("/")}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("continueShopping")}
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
      <span className="text-xs font-semibold tracking-[0.2em] text-gray-500 uppercase">
        {label}
      </span>
      <span className="mt-1 font-mono text-sm break-all text-gray-900 sm:mt-0">
        {value}
      </span>
    </div>
  );
}
