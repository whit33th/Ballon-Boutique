"use client";

import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import { OrdersPanel } from "./OrdersPanel";

type ProfileOrdersTabProps = {
  userPhone?: string;
};

export function ProfileOrdersTab({ userPhone }: ProfileOrdersTabProps) {
  const t = useTranslations("profile");
  const orders = useQuery(api.orders.list, {});
  const formattedOrders = orders ?? [];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-deep text-2xl font-semibold">
          {t("orders.title")}
        </h2>
        <p className="text-sm text-[rgba(var(--deep-rgb),0.6)]">
          {t("orders.placedOrders", { count: formattedOrders.length })}
        </p>
      </div>
      <OrdersPanel orders={orders} userPhone={userPhone} />
    </>
  );
}
