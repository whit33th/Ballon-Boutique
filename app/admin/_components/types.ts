import type { Doc, Id } from "@/convex/_generated/dataModel";

export type OrderStatus = Doc<"orders">["status"];

export type PendingImage = {
  file: File;
  preview: string;
};

export type UploadProgressState = {
  status: "preparing" | "uploading" | "finalizing" | "success" | "error";
  percentage: number;
  message: string;
};

export type ProductCardData = Doc<"products"> & {
  primaryImageUrl: string | null;
};

export type PaymentStatus = Doc<"payments">["status"];

export type AdminPaymentListItem = {
  payment: {
    _id: Id<"payments">;
    _creationTime: number;
    orderId: Id<"orders">;
    paymentIntentId?: string;
    status: PaymentStatus;
    amountBase: number;
    amountMinor: number;
    currency: string;
    displayAmount: Doc<"payments">["displayAmount"];
    customer: Doc<"payments">["customer"];
    shipping: Doc<"payments">["shipping"];
    lastError?: string;
  };
  order?: {
    _id: Id<"orders">;
    status: OrderStatus;
    paymentMethod?: Doc<"orders">["paymentMethod"];
  };
};

export type StripePaymentListItem = {
  id: string;
  created: number;
  amountMinor: number;
  currency: string;
  status: PaymentStatus;
  customer: {
    name?: string;
    email?: string;
  };
  riskLevel?: "normal" | "elevated" | "highest" | "not_assessed" | "unknown";
  sourceType?: string;
  device?: string;
  deviceIp?: string;
};

export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; tone: string }
> = {
  pending: {
    label: "В обработке",
    tone: "bg-amber-100 text-amber-900",
  },
  confirmed: {
    label: "Подтверждён",
    tone: "bg-sky-100 text-sky-900",
  },
  shipped: {
    label: "Отправлен",
    tone: "bg-indigo-100 text-indigo-900",
  },
  delivered: {
    label: "Доставлен",
    tone: "bg-emerald-100 text-emerald-900",
  },
};

export const ORDER_STATUS_FILTERS: Array<{
  value: OrderStatus | "all";
  label: string;
}> = [
  { value: "all", label: "Все статусы" },
  { value: "pending", label: "В обработке" },
  { value: "confirmed", label: "Подтверждён" },
  { value: "shipped", label: "Отправлен" },
  { value: "delivered", label: "Доставлен" },
];

export const PAYMENT_METHOD_LABELS: Record<
  NonNullable<Doc<"orders">["paymentMethod"]>,
  string
> = {
  full_online: "Полностью онлайн",
  partial_online: "Частично онлайн",
  cash: "Оплата при получении",
};
