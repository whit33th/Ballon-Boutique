"use client";

import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  AdminPaymentListItem,
  StripePaymentListItem,
  PaymentStatus,
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

const formatDate = (timestamp: number) =>
  new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);

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
  const [activeTab, setActiveTab] = useState<"convex" | "stripe">("convex");

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
                {stripeSummary.total} entries
              </span>
            </div>
          ) : (
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {convexSummary.total} records
            </div>
          )}
        </div>

        <TabsContent value="convex" className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <SummaryCard
              label="Total payments"
              value={convexSummary.total.toString()}
              hint="Stored in Convex"
            />
            <SummaryCard
              label="Succeeded"
              value={convexSummary.succeeded.toString()}
              hint="Marked as paid"
              tone="text-emerald-600"
            />
            <SummaryCard
              label="Attention"
              value={convexSummary.failed.toString()}
              hint="Failed or canceled"
              tone="text-rose-600"
            />
          </div>

          {convexLoading ? (
            <PaymentsSkeleton rows={5} />
          ) : convexPayments.length === 0 ? (
            <EmptyState message="Нет платежей в Convex базе. Как только появятся оплаты, мы покажем их здесь." />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Payment</th>
                    <th className="px-4 py-3 text-left">Customer</th>
                    <th className="px-4 py-3 text-left">Amount</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Order</th>
                    <th className="px-4 py-3 text-left">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {convexPayments.map((item) => (
                    <tr key={item.payment._id}>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        #{item.payment._id.slice(-8)}
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
                            {ORDER_STATUS_META[item.order.status]?.label ??
                              item.order.status}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">
                            No link
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
          )}
        </TabsContent>

        <TabsContent value="stripe" className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <SummaryCard
              label="Stripe objects"
              value={stripeSummary.total.toString()}
              hint="Last fetch"
            />
            <SummaryCard
              label="Elevated risk"
              value={stripeSummary.risk.toString()}
              hint="Need manual review"
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
            <EmptyState message="Stripe API не вернул платежей. Попробуйте обновить список." />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Intent</th>
                    <th className="px-4 py-3 text-left">Customer</th>
                    <th className="px-4 py-3 text-left">Amount</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Risk</th>
                    <th className="px-4 py-3 text-left">Created</th>
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
                        {formatDate(payment.created * 1000)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
  const tone = paymentStatusTone[status] ?? "bg-slate-100 text-slate-700";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${tone}`}
    >
      {status.replaceAll("_", " ")}
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
