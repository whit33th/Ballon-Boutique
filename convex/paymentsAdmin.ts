import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internalQuery, query } from "./_generated/server";
import { ensureAdmin } from "./helpers/admin";
import {
  customerValidator,
  type PaymentStatus,
  paymentStatusValidator,
  shippingValidator,
} from "./paymentMutations";
import { orderStatusValidator } from "./validators/order";

const displayAmountValidator = v.object({
  value: v.number(),
  currency: v.string(),
  conversionRate: v.optional(v.number()),
  conversionFeePct: v.optional(v.number()),
});

const paymentRecordValidator = v.object({
  _id: v.id("payments"),
  _creationTime: v.number(),
  orderId: v.optional(v.id("orders")),
  paymentIntentId: v.optional(v.string()),
  status: paymentStatusValidator,
  amountBase: v.number(),
  amountMinor: v.number(),
  currency: v.string(),
  displayAmount: displayAmountValidator,
  customer: customerValidator,
  shipping: shippingValidator,
  lastError: v.optional(v.string()),
});

const orderSummaryValidator = v.object({
  _id: v.id("orders"),
  status: orderStatusValidator,
  paymentMethod: v.optional(
    v.union(
      v.literal("full_online"),
      v.literal("partial_online"),
      v.literal("cash"),
    ),
  ),
});

type AdminPaymentRow = {
  payment: {
    _id: Id<"payments">;
    _creationTime: number;
    orderId?: Id<"orders">;
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
    status: Doc<"orders">["status"];
    paymentMethod?: Doc<"orders">["paymentMethod"];
  };
};

export const assertAdminAccess = internalQuery({
  args: {},
  returns: v.literal(true),
  handler: async (ctx) => {
    await ensureAdmin(ctx);
    return true as const;
  },
});

export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      payment: paymentRecordValidator,
      order: v.optional(orderSummaryValidator),
    }),
  ),
  handler: async (ctx, args) => {
    await ensureAdmin(ctx);
    const limit = Math.min(Math.max(args.limit ?? 40, 1), 200);

    const payments = await ctx.db.query("payments").order("desc").take(limit);
    const rows: AdminPaymentRow[] = [];

    for (const payment of payments) {
      const order = payment.orderId ? await ctx.db.get(payment.orderId) : null;

      rows.push({
        payment: formatPaymentRecord(payment),
        order: order
          ? {
              _id: order._id,
              status: order.status,
              paymentMethod: order.paymentMethod,
            }
          : undefined,
      });
    }

    return rows;
  },
});

const formatPaymentRecord = (
  payment: Doc<"payments">,
): AdminPaymentRow["payment"] => {
  const displayAmount = {
    value: payment.displayAmount?.value ?? payment.amountBase,
    currency: payment.displayAmount?.currency ?? payment.currency,
    conversionRate: payment.displayAmount?.conversionRate,
    conversionFeePct: payment.displayAmount?.conversionFeePct,
  } satisfies Doc<"payments">["displayAmount"];

  const customer = {
    name: payment.customer?.name ?? "Не указан",
    email: payment.customer?.email ?? "unknown@example.com",
    phone: payment.customer?.phone,
  } satisfies Doc<"payments">["customer"];

  const shipping = {
    address: payment.shipping?.address ?? "Самовывоз",
    deliveryType: payment.shipping?.deliveryType ?? "pickup",
    pickupDateTime: payment.shipping?.pickupDateTime,
    deliveryFee: payment.shipping?.deliveryFee,
  } satisfies Doc<"payments">["shipping"];

  return {
    _id: payment._id,
    _creationTime: payment._creationTime,
    orderId: payment.orderId,
    paymentIntentId: payment.paymentIntentId,
    status: payment.status as PaymentStatus,
    amountBase: payment.amountBase,
    amountMinor:
      typeof payment.amountMinor === "number"
        ? payment.amountMinor
        : Math.round(payment.amountBase * 100),
    currency: payment.currency,
    displayAmount,
    customer,
    shipping,
    lastError: payment.lastError,
  };
};
