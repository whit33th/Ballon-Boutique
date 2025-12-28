"use client";

import { useTranslations } from "next-intl";
import { formatCurrency } from "./utils";

interface ProductMetrics {
  total: number;
  available: number;
  outOfStock: number;
  personalizable: number;
  averagePrice: number;
}

interface ProductMetricsCardProps {
  metrics: ProductMetrics;
}

export function ProductMetricsCard({ metrics }: ProductMetricsCardProps) {
  const t = useTranslations("admin.metrics");

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase">
          {t("totalProducts")}
        </p>
        <p className="mt-1 text-2xl font-semibold text-slate-900">
          {metrics.total}
        </p>
        <p className="text-xs text-slate-500">
          {metrics.available} {t("inStock")} · {metrics.outOfStock}{" "}
          {t("outOfStock")}
        </p>
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase">
          {t("averagePrice")}
        </p>
        <p className="mt-1 max-w-full text-xl font-semibold wrap-break-word whitespace-normal text-slate-900">
          {metrics.total ? formatCurrency(metrics.averagePrice) : "—"}
        </p>
        <p className="text-xs text-slate-500">
          {t("personalizablePositions", { count: metrics.personalizable })}
        </p>
      </div>
    </div>
  );
}
