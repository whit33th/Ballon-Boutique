import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "./_generated/server";
import { orderItemValidator } from "./validators/order";

export const orderItemInputValidator = v.object({
  productId: v.id("products"),
  quantity: v.number(),
  personalization: v.optional(
    v.object({
      text: v.optional(v.string()),
      color: v.optional(v.string()),
      number: v.optional(v.string()),
    }),
  ),
});

export type PaymentStatus =
  | "requires_payment_method"
  | "requires_confirmation"
  | "requires_action"
  | "processing"
  | "requires_capture"
  | "succeeded"
  | "canceled"
  | "failed"
  | "refunded";

export const paymentStatusValidator = v.union(
  v.literal("requires_payment_method"),
  v.literal("requires_confirmation"),
  v.literal("requires_action"),
  v.literal("processing"),
  v.literal("requires_capture"),
  v.literal("succeeded"),
  v.literal("canceled"),
  v.literal("failed"),
  v.literal("refunded"),
);

export const customerValidator = v.object({
  name: v.string(),
  email: v.string(),
  phone: v.optional(v.string()),
});

export const shippingValidator = v.object({
  address: v.string(),
  deliveryType: v.union(v.literal("pickup"), v.literal("delivery")),
  pickupDateTime: v.optional(v.string()),
  deliveryFee: v.optional(v.number()),
});

export const createPendingOrderAndPayment = internalMutation({
  args: {
    items: v.array(orderItemInputValidator),
    customer: customerValidator,
    shipping: shippingValidator,
    userId: v.optional(v.id("users")),
    paymentCurrency: v.string(),
    displayAmount: v.object({
      value: v.number(),
      currency: v.string(),
      conversionRate: v.optional(v.number()),
      conversionFeePct: v.optional(v.number()),
    }),
  },
  returns: v.object({
    orderId: v.id("orders"),
    paymentId: v.id("payments"),
    normalizedAmount: v.number(),
    items: v.array(orderItemValidator),
  }),
  handler: async (ctx, args) => {
    if (args.items.length === 0) {
      throw new Error("Cart is empty");
    }

    const resolvedItems = await resolveOrderItems(ctx, args.items);
    const deliveryFee = args.shipping.deliveryFee ?? 0;
    const totalAmount = resolvedItems.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0,
    );
    const normalizedAmount = totalAmount + deliveryFee;
    const amountMinor = Math.round(normalizedAmount * 100);

    const userId = await resolveUserByEmail(
      ctx,
      args.userId,
      args.customer.email,
      args.customer.name,
    );

    const orderId = await ctx.db.insert("orders", {
      userId,
      items: resolvedItems,
      totalAmount: normalizedAmount,
      status: "pending",
      customerName: args.customer.name,
      customerEmail: args.customer.email,
      shippingAddress: args.shipping.address,
      deliveryType: args.shipping.deliveryType,
      paymentMethod: "full_online",
      whatsappConfirmed: false,
      pickupDateTime: args.shipping.pickupDateTime,
      currency: args.displayAmount.currency,
      deliveryFee,
      grandTotal: args.displayAmount.value,
    });

    const paymentId = await ctx.db.insert("payments", {
      orderId,
      userId,
      paymentIntentId: undefined,
      status: "requires_payment_method",
      amountBase: normalizedAmount,
      amountMinor,
      currency: args.paymentCurrency,
      displayAmount: args.displayAmount,
      customer: args.customer,
      shipping: args.shipping,
      items: resolvedItems,
      stripeClientSecret: undefined,
      stripeLatestChargeId: undefined,
      lastError: undefined,
      refunds: undefined,
    });

    return { orderId, paymentId, normalizedAmount, items: resolvedItems };
  },
});

export const attachStripeIntentDetails = internalMutation({
  args: {
    paymentId: v.id("payments"),
    paymentIntentId: v.string(),
    clientSecret: v.string(),
    status: paymentStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) {
      throw new Error("Payment record not found");
    }

    await ctx.db.patch(args.paymentId, {
      paymentIntentId: args.paymentIntentId,
      stripeClientSecret: args.clientSecret,
      status: args.status,
    });

    await ctx.db.patch(payment.orderId, {
      paymentIntentId: args.paymentIntentId,
    });

    return null;
  },
});

export const getPaymentIntent = internalQuery({
  args: { paymentIntentId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("payments"),
      orderId: v.id("orders"),
      paymentIntentId: v.optional(v.string()),
      status: paymentStatusValidator,
      customer: customerValidator,
      shipping: shippingValidator,
      items: v.array(orderItemValidator),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_payment_intent_id", (q) =>
        q.eq("paymentIntentId", args.paymentIntentId),
      )
      .unique();

    if (!payment) {
      return null;
    }

    return {
      _id: payment._id,
      orderId: payment.orderId,
      paymentIntentId: payment.paymentIntentId,
      status: payment.status,
      customer: payment.customer,
      shipping: payment.shipping,
      items: payment.items,
    };
  },
});

export const updatePaymentStatus = internalMutation({
  args: {
    paymentIntentId: v.string(),
    status: paymentStatusValidator,
    lastError: v.optional(v.string()),
  },
  returns: v.union(
    v.object({
      paymentId: v.id("payments"),
      orderId: v.id("orders"),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_payment_intent_id", (q) =>
        q.eq("paymentIntentId", args.paymentIntentId),
      )
      .unique();

    if (!payment) {
      return null;
    }

    await ctx.db.patch(payment._id, {
      status: args.status,
      lastError: args.lastError,
    });

    return { paymentId: payment._id, orderId: payment.orderId };
  },
});

export const processSuccessfulPayment = internalMutation({
  args: {
    paymentIntentId: v.string(),
    stripeChargeId: v.optional(v.string()),
  },
  returns: v.union(
    v.object({
      paymentId: v.id("payments"),
      orderId: v.id("orders"),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_payment_intent_id", (q) =>
        q.eq("paymentIntentId", args.paymentIntentId),
      )
      .unique();

    if (!payment) {
      return null;
    }

    if (payment.status === "succeeded") {
      return { paymentId: payment._id, orderId: payment.orderId };
    }

    await ctx.db.patch(payment._id, {
      status: "succeeded",
      stripeLatestChargeId: args.stripeChargeId,
      lastError: undefined,
    });

    await ctx.db.patch(payment.orderId, {
      status: "confirmed",
      paymentIntentId: args.paymentIntentId,
    });

    for (const item of payment.items) {
      const product = await ctx.db.get(item.productId);
      if (!product) {
        continue;
      }

      await ctx.db.patch(product._id, {
        soldCount: (product.soldCount ?? 0) + item.quantity,
      });
    }

    if (payment.userId) {
      const userId = payment.userId;
      const cartQuery = ctx.db
        .query("cartItems")
        .withIndex("by_user", (q) => q.eq("userId", userId));

      for await (const cartItem of cartQuery) {
        await ctx.db.delete(cartItem._id);
      }
    }

    return { paymentId: payment._id, orderId: payment.orderId };
  },
});

export const getPaymentAndOrder = internalQuery({
  args: { orderId: v.id("orders") },
  returns: v.union(
    v.object({
      order: v.object({
        _id: v.id("orders"),
        _creationTime: v.number(),
        customerName: v.string(),
        customerEmail: v.string(),
        shippingAddress: v.string(),
        deliveryType: v.optional(
          v.union(v.literal("pickup"), v.literal("delivery")),
        ),
        paymentMethod: v.optional(v.string()),
        status: v.string(),
        totalAmount: v.number(),
        grandTotal: v.optional(v.number()),
        currency: v.optional(v.string()),
      }),
      payment: v.object({
        _id: v.id("payments"),
        paymentIntentId: v.optional(v.string()),
        status: paymentStatusValidator,
        amountBase: v.number(),
        displayAmount: v.object({
          value: v.number(),
          currency: v.string(),
          conversionRate: v.optional(v.number()),
          conversionFeePct: v.optional(v.number()),
        }),
        customer: customerValidator,
        shipping: shippingValidator,
        items: v.array(orderItemValidator),
      }),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      return null;
    }

    const payment = await ctx.db
      .query("payments")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .unique();

    if (!payment) {
      return null;
    }

    return {
      order: {
        _id: order._id,
        _creationTime: order._creationTime,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        shippingAddress: order.shippingAddress,
        deliveryType: order.deliveryType,
        paymentMethod: order.paymentMethod,
        status: order.status,
        totalAmount: order.totalAmount,
        grandTotal: order.grandTotal,
        currency: order.currency,
      },
      payment,
    } as const;
  },
});

export const recordRefund = internalMutation({
  args: {
    paymentIntentId: v.string(),
    stripeRefundId: v.string(),
    amountMinor: v.number(),
    amount: v.number(),
    currency: v.string(),
    reason: v.optional(v.string()),
    createdAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_payment_intent_id", (q) =>
        q.eq("paymentIntentId", args.paymentIntentId),
      )
      .unique();

    if (!payment) {
      throw new Error("Payment not found");
    }

    await ctx.db.patch(payment._id, {
      refunds: [
        ...(payment.refunds ?? []),
        {
          stripeRefundId: args.stripeRefundId,
          amountMinor: args.amountMinor,
          amount: args.amount,
          currency: args.currency,
          reason: args.reason,
          createdAt: args.createdAt,
        },
      ],
      status: "refunded",
    });
  },
});

async function resolveOrderItems(
  ctx: MutationCtx,
  items: Array<{
    productId: Id<"products">;
    quantity: number;
    personalization?: {
      text?: string;
      color?: string;
      number?: string;
    };
  }>,
) {
  const resolved = [] as Array<{
    productId: Id<"products">;
    productName: string;
    quantity: number;
    price: number;
    personalization?: {
      text?: string;
      color?: string;
      number?: string;
    };
  }>;

  for (const item of items) {
    const product = await ctx.db.get(item.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    if (!product.inStock) {
      throw new Error(`${product.name} is out of stock`);
    }

    resolved.push({
      productId: item.productId,
      productName: product.name,
      quantity: item.quantity,
      price: product.price,
      personalization: item.personalization,
    });
  }

  return resolved;
}

async function resolveUserByEmail(
  ctx: MutationCtx,
  userId: Id<"users"> | undefined,
  email: string,
  name: string,
): Promise<Id<"users">> {
  if (userId) {
    return userId;
  }

  const existingUser = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", email))
    .first();

  if (existingUser) {
    return existingUser._id;
  }

  return ctx.db.insert("users", {
    email,
    name,
    emailVerificationTime: undefined,
    phone: undefined,
    phoneVerificationTime: undefined,
    image: undefined,
  });
}
