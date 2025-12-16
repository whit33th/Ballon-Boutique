"use client";

import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  AdminPaymentListItem,
  PaymentStatus,
  StripePaymentListItem,
} from "./types";
import { ORDER_STATUS_META } from "./types";

const paymentStatusTone: Record<PaymentStatus, string> = {
  requires_payment_method: "bg-amber-100 text-amber-900",
  requires_confirmation: "bg-blue-100 text-blue-900",
  requires_action: "bg-indigo-100 text-indigo-900",
  processing: "bg-sky-100 text-sky-900",
  requires_capture: "bg-purple-100 text-purple-900",
  succeeded: "bg-emerald-100 text-emerald-900",
  canceled: "bg-slate-200 text-slate-700",
  failed: "bg-rose-100 text-rose-900",
  refunded: "bg-fuchsia-100 text-fuchsia-900",
};

const formatAmount = (amountMinor: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);

const formatDate = (timestamp: number | Date) =>
  new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(typeof timestamp === "number" ? new Date(timestamp) : timestamp);

type PaymentsTabProps = {
  convexPayments: AdminPaymentListItem[];
  convexLoading: boolean;
  stripePayments: StripePaymentListItem[] | null;
  stripeLoading: boolean;
  stripeError: string | null;
  onReloadStripe: () => void;
};

export function PaymentsTab({
  convexPayments,
  convexLoading,
  stripePayments,
  stripeLoading,
  stripeError,
  onReloadStripe,
}: PaymentsTabProps) {
  const t = useTranslations("admin.payments");
  const [activeTab, setActiveTab] = useState<"convex" | "stripe">("convex");
  const [expandedConvex, setExpandedConvex] = useState<Record<string, boolean>>(
    {},
  );
  const [expandedStripe, setExpandedStripe] = useState<Record<string, boolean>>(
    {},
  );

  const toggleConvex = (id: string) =>
    setExpandedConvex((s) => ({ ...s, [id]: !s[id] }));
  const toggleStripe = (id: string) =>
    setExpandedStripe((s) => ({ ...s, [id]: !s[id] }));

  const convexSummary = useMemo(() => {
    if (!convexPayments.length) {
      return { total: 0, succeeded: 0, failed: 0 } as const;
    }
    const succeeded = convexPayments.filter(
      (item) => item.payment.status === "succeeded",
    ).length;
    const failed = convexPayments.filter((item) =>
      ["failed", "canceled"].includes(item.payment.status),
    ).length;
    return {
      total: convexPayments.length,
      succeeded,
      failed,
    } as const;
  }, [convexPayments]);

  const stripeSummary = useMemo(() => {
    const list = stripePayments ?? [];
    if (!list.length) {
      return { total: 0, risk: 0 } as const;
    }
    const elevated = list.filter((item) =>
      ["elevated", "highest"].includes(item.riskLevel ?? ""),
    ).length;
    return { total: list.length, risk: elevated } as const;
  }, [stripePayments]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as typeof activeTab)}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="convex">Convex DB</TabsTrigger>
            <TabsTrigger value="stripe">Stripe API</TabsTrigger>
          </TabsList>
          {activeTab === "stripe" ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onReloadStripe}
                disabled={stripeLoading}
                className="gap-2"
              >
                <RefreshCw
                  className={`h-4 w-4 ${stripeLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {t("entries", { count: stripeSummary.total })}
              </span>
            </div>
          ) : (
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {t("records", { count: convexSummary.total })}
            </div>
          )}
        </div>

        <TabsContent value="convex" className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <SummaryCard
              label={t("totalPayments")}
              value={convexSummary.total.toString()}
              hint={t("storedInConvex")}
            />
            <SummaryCard
              label={t("succeeded")}
              value={convexSummary.succeeded.toString()}
              hint={t("markedAsPaid")}
              tone="text-emerald-600"
            />
            <SummaryCard
              label={t("attention")}
              value={convexSummary.failed.toString()}
              hint={t("failedOrCanceled")}
              tone="text-rose-600"
            />
          </div>

          {convexLoading ? (
            <PaymentsSkeleton rows={5} />
          ) : convexPayments.length === 0 ? (
            <EmptyState message={t("noPaymentsConvex")} />
          ) : (
            <>
              {/* Table for larger screens */}
              <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 md:block">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        {t("tableHeaders.payment")}
                      </th>
                      <th className="px-4 py-3 text-left">
                        {t("tableHeaders.customer")}
                      </th>
                      <th className="px-4 py-3 text-left">
                        {t("tableHeaders.amount")}
                      </th>
                      <th className="px-4 py-3 text-left">
                        {t("tableHeaders.status")}
                      </th>
                      <th className="px-4 py-3 text-left">
                        {t("tableHeaders.order")}
                      </th>
                      <th className="px-4 py-3 text-left">
                        {t("tableHeaders.created")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {convexPayments.map((item) => (
                      <tr key={item.payment._id}>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">
                          #{item.payment._id}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">
                            {item.payment.customer.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {item.payment.customer.email}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {formatAmount(
                            item.payment.amountMinor,
                            item.payment.currency.toUpperCase(),
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={item.payment.status} />
                          {item.payment.lastError && (
                            <p className="mt-1 text-xs text-rose-600">
                              {item.payment.lastError}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {item.order ? (
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${ORDER_STATUS_META[item.order.status]?.tone ?? "bg-slate-100 text-slate-700"}`}
                            >
                              {t(`orderStatus.${item.order.status}`)}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">
                              {t("noLink")}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {formatDate(item.payment._creationTime)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {convexPayments.map((item) => (
                  <div
                    key={`convex-${item.payment._id}`}
                    className="rounded-lg border border-slate-200 bg-white p-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-slate-900">
                          #{item.payment._id}
                        </div>
                        <div className="text-xs text-slate-500">
                          {item.payment.customer.email}
                        </div>
                        <div className="text-xs text-slate-400">
                          {formatDate(item.payment._creationTime)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {formatAmount(
                            item.payment.amountMinor,
                            item.payment.currency.toUpperCase(),
                          )}
                        </div>
                        <div className="mt-2">
                          <StatusBadge status={item.payment.status} />
                        </div>
                      </div>
                    </div>
                    {item.payment.lastError && (
                      <div className="mt-2 text-xs text-rose-600">
                        {item.payment.lastError}
                      </div>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <button
                        type="button"
                        className="text-sm text-slate-500"
                        onClick={() => toggleConvex(item.payment._id)}
                      >
                        {expandedConvex[item.payment._id]
                          ? t("hide")
                          : t("showDetails")}
                      </button>
                    </div>
                    {expandedConvex[item.payment._id] && (
                      <div className="mt-3 border-t pt-3 text-sm text-slate-700">
                        <div className="text-xs text-slate-500">
                          {t("orderLabel")}
                        </div>
                        <div className="text-sm text-slate-800">
                          {item.order
                            ? t(`orderStatus.${item.order.status}`)
                            : "—"}
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                          {t("intentId")}:
                        </div>
                        <div className="text-sm text-slate-800">
                          {item.payment.paymentIntentId ?? "—"}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="stripe" className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <SummaryCard
              label={t("stripeObjects")}
              value={stripeSummary.total.toString()}
              hint={t("lastFetch")}
            />
            <SummaryCard
              label={t("elevatedRisk")}
              value={stripeSummary.risk.toString()}
              hint={t("needManualReview")}
              tone={stripeSummary.risk > 0 ? "text-amber-600" : undefined}
            />
          </div>

          {stripeError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
              {stripeError}
            </div>
          )}

          {stripeLoading ? (
            <PaymentsSkeleton rows={4} />
          ) : !stripePayments || stripePayments.length === 0 ? (
            <EmptyState message={t("noPaymentsStripe")} />
          ) : (
            <>
              {/* Table for larger screens */}
              <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 md:block">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        {t("tableHeaders.intent")}
                      </th>
                      <th className="px-4 py-3 text-left">
                        {t("tableHeaders.customer")}
                      </th>
                      <th className="px-4 py-3 text-left">
                        {t("tableHeaders.amount")}
                      </th>
                      <th className="px-4 py-3 text-left">
                        {t("tableHeaders.status")}
                      </th>
                      <th className="px-4 py-3 text-left">
                        {t("tableHeaders.risk")}
                      </th>
                      <th className="px-4 py-3 text-left">
                        {t("tableHeaders.created")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {stripePayments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">
                          {payment.id}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">
                            {payment.customer.name ?? "–"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {payment.customer.email ?? "–"}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {formatAmount(
                            payment.amountMinor,
                            payment.currency.toUpperCase(),
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={payment.status} />
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 capitalize">
                          {payment.riskLevel ?? "n/a"}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {formatDate(payment.created)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {stripePayments.map((payment) => (
                  <div
                    key={`stripe-${payment.id}`}
                    className="rounded-lg border border-slate-200 bg-white p-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-slate-900">
                          {payment.customer.name ?? "–"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {payment.customer.email ?? "–"}
                        </div>
                        <div className="text-xs text-slate-400">
                          {formatDate(payment.created)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {formatAmount(
                            payment.amountMinor,
                            payment.currency.toUpperCase(),
                          )}
                        </div>
                        <div className="mt-2 text-xs text-slate-600 capitalize">
                          {payment.riskLevel ?? "n/a"}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <button
                        type="button"
                        className="text-sm text-slate-500"
                        onClick={() => toggleStripe(payment.id)}
                      >
                        {expandedStripe[payment.id]
                          ? t("hide")
                          : t("showDetails")}
                      </button>
                    </div>
                    {expandedStripe[payment.id] && (
                      <div className="mt-3 border-t pt-3 text-sm text-slate-700">
                        <div className="text-xs text-slate-500">
                          {t("intentId")}:
                        </div>
                        <div className="text-sm text-slate-800">
                          {payment.id}
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                          {t("sourceType")}:
                        </div>
                        <div className="text-sm text-slate-800">
                          {payment.sourceType ?? "—"}
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                          {t("device")}:
                        </div>
                        <div className="text-sm text-slate-800">
                          {payment.device ?? "—"}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

type SummaryCardProps = {
  label: string;
  value: string;
  hint: string;
  tone?: string;
};

function SummaryCard({ label, value, hint, tone }: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs tracking-wide text-slate-500 uppercase">{label}</p>
      <p className={`mt-2 text-2xl font-semibold text-slate-900 ${tone ?? ""}`}>
        {value}
      </p>
      <p className="text-xs text-slate-500">{hint}</p>
    </div>
  );
}

type StatusBadgeProps = {
  status: PaymentStatus;
};

function StatusBadge({ status }: StatusBadgeProps) {
  const t = useTranslations("admin.payments");
  const tone = paymentStatusTone[status] ?? "bg-slate-100 text-slate-700";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${tone}`}
    >
      {t(`paymentStatus.${status}`)}
    </span>
  );
}

type PaymentsSkeletonProps = {
  rows: number;
};

function PaymentsSkeleton({ rows }: PaymentsSkeletonProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={`payments-skeleton-${index.toString()}`}
          className="h-14 w-full animate-pulse rounded-xl bg-slate-100"
        />
      ))}
    </div>
  );
}

type EmptyStateProps = {
  message: string;
};

function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}
