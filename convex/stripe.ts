"use node";

import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type Stripe from "stripe";
import { internal } from "./_generated/api.js";
import type { Id } from "./_generated/dataModel";
import { action } from "./_generated/server";
import { getStripeClient } from "./helpers/stripeClient";
import {
  customerValidator,
  orderItemInputValidator,
  type PaymentStatus,
  paymentStatusValidator,
  shippingValidator,
} from "./paymentMutations";

const paymentMetadataValidator = v.record(v.string(), v.string());

type StripeIntentSummary = {
  paymentIntentId: string;
  clientSecret: string;
  status: PaymentStatus;
  latestChargeId?: string;
  lastError?: string;
};

type PaymentCustomer = {
  name: string;
  email: string;
  phone?: string;
};

type PaymentShipping = {
  address: string;
  deliveryType: "pickup" | "delivery";
  pickupDateTime?: string;
  deliveryFee?: number;
};

type OrderItemSummary = {
  productId: Id<"products">;
  productName: string;
  quantity: number;
  price: number;
  personalization?: {
    text?: string;
    color?: string;
    number?: string;
  };
};

type PendingPaymentResult = {
  orderId: Id<"orders">;
  paymentId: Id<"payments">;
  normalizedAmount: number;
  items: ReadonlyArray<OrderItemSummary>;
};

type PaymentIntentRecord = {
  _id: Id<"payments">;
  orderId: Id<"orders">;
  paymentIntentId?: string;
  status: PaymentStatus;
  customer: PaymentCustomer;
  shipping: PaymentShipping;
  items: ReadonlyArray<OrderItemSummary>;
};

type PaymentMutationResult = {
  paymentId: Id<"payments">;
  orderId: Id<"orders">;
};

type CreatePaymentIntentResult = {
  paymentIntentId: string;
  clientSecret: string;
  orderId: Id<"orders">;
  paymentId: Id<"payments">;
  amountMinor: number;
  currency: string;
  status: PaymentStatus;
};

type SyncPaymentIntentStatusResult = {
  paymentIntentId: string;
  status: PaymentStatus;
  orderId: Id<"orders">;
  paymentId: Id<"payments">;
  clientSecret: string;
  lastError?: string;
};

const summarizeItems = (
  items: ReadonlyArray<{ productName: string; quantity: number }>,
) =>
  items
    .map((item) => `${item.quantity}x ${item.productName}`)
    .slice(0, 15)
    .join(", ");

const derivePaymentStatus = (
  stripeStatus: Stripe.PaymentIntent.Status,
  lastError?: string,
): PaymentStatus => {
  if (stripeStatus === "requires_payment_method" && lastError) {
    return "failed";
  }

  switch (stripeStatus) {
    case "requires_payment_method":
    case "requires_confirmation":
    case "requires_action":
    case "processing":
    case "requires_capture":
    case "succeeded":
    case "canceled":
      return stripeStatus;
    default:
      return "requires_payment_method";
  }
};

const mapIntent = (intent: Stripe.PaymentIntent): StripeIntentSummary => {
  const lastError = intent.last_payment_error?.message;
  const latestChargeId =
    typeof intent.latest_charge === "string"
      ? intent.latest_charge
      : intent.latest_charge?.id;

  if (!intent.client_secret) {
    throw new Error("Stripe did not return a client secret");
  }

  return {
    paymentIntentId: intent.id,
    clientSecret: intent.client_secret,
    status: derivePaymentStatus(intent.status, lastError),
    latestChargeId: latestChargeId ?? undefined,
    lastError: lastError ?? undefined,
  };
};

export const createPaymentIntent = action({
  args: {
    items: v.array(orderItemInputValidator),
    customer: customerValidator,
    shipping: shippingValidator,
    paymentCurrency: v.string(),
    displayAmount: v.object({
      value: v.number(),
      currency: v.string(),
      conversionRate: v.optional(v.number()),
      conversionFeePct: v.optional(v.number()),
    }),
    metadata: v.optional(paymentMetadataValidator),
  },
  returns: v.object({
    paymentIntentId: v.string(),
    clientSecret: v.string(),
    orderId: v.id("orders"),
    paymentId: v.id("payments"),
    amountMinor: v.number(),
    currency: v.string(),
    status: paymentStatusValidator,
  }),
  handler: async (ctx, args): Promise<CreatePaymentIntentResult> => {
    const userId = await getAuthUserId(ctx);

    const pendingPayment: PendingPaymentResult = await ctx.runMutation(
      internal.paymentMutations.createPendingOrderAndPayment,
      {
        items: args.items,
        customer: args.customer,
        shipping: args.shipping,
        userId: userId ?? undefined,
        paymentCurrency: args.paymentCurrency,
        displayAmount: args.displayAmount,
      },
    );

    const amountMinor = Math.round(pendingPayment.normalizedAmount * 100);
    if (amountMinor <= 0) {
      throw new Error("Calculated order total is invalid");
    }

    const itemsSummary = summarizeItems(pendingPayment.items);
    const metadata: Record<string, string> = {
      orderId: pendingPayment.orderId.toString(),
      paymentId: pendingPayment.paymentId.toString(),
      customerEmail: args.customer.email,
      deliveryType: args.shipping.deliveryType,
      items: itemsSummary,
    };

    if (args.metadata) {
      for (const [key, value] of Object.entries(args.metadata)) {
        metadata[key] = value;
      }
    }

    const intent = await createStripePaymentIntent({
      amountMinor,
      currency: args.paymentCurrency,
      receiptEmail: args.customer.email,
      customerName: args.customer.name,
      customerPhone: args.customer.phone,
      shippingAddress: args.shipping.address,
      metadata,
      description: `Order ${pendingPayment.orderId}`,
    });

    await ctx.runMutation(internal.paymentMutations.attachStripeIntentDetails, {
      paymentId: pendingPayment.paymentId,
      paymentIntentId: intent.paymentIntentId,
      clientSecret: intent.clientSecret,
      status: intent.status,
    });

    return {
      paymentIntentId: intent.paymentIntentId,
      clientSecret: intent.clientSecret,
      orderId: pendingPayment.orderId,
      paymentId: pendingPayment.paymentId,
      amountMinor,
      currency: args.paymentCurrency,
      status: intent.status,
    };
  },
});

export const syncPaymentIntentStatus = action({
  args: {
    paymentIntentId: v.string(),
  },
  returns: v.union(
    v.object({
      paymentIntentId: v.string(),
      status: paymentStatusValidator,
      orderId: v.id("orders"),
      paymentId: v.id("payments"),
      clientSecret: v.string(),
      lastError: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args): Promise<SyncPaymentIntentStatusResult | null> => {
    const paymentRecord: PaymentIntentRecord | null = await ctx.runQuery(
      internal.paymentMutations.getPaymentIntent,
      { paymentIntentId: args.paymentIntentId },
    );

    if (!paymentRecord) {
      return null;
    }

    const intent = await retrieveStripePaymentIntent(args.paymentIntentId);

    if (intent.status === "succeeded") {
      const processed: PaymentMutationResult | null = await ctx.runMutation(
        internal.paymentMutations.processSuccessfulPayment,
        {
          paymentIntentId: args.paymentIntentId,
          stripeChargeId: intent.latestChargeId,
        },
      );

      return {
        paymentIntentId: intent.paymentIntentId,
        status: "succeeded",
        orderId: processed?.orderId ?? paymentRecord.orderId,
        paymentId: processed?.paymentId ?? paymentRecord._id,
        clientSecret: intent.clientSecret,
        lastError: undefined,
      };
    }

    await ctx.runMutation(internal.paymentMutations.updatePaymentStatus, {
      paymentIntentId: args.paymentIntentId,
      status: intent.status,
      lastError: intent.lastError,
    });

    return {
      paymentIntentId: intent.paymentIntentId,
      status: intent.status,
      orderId: paymentRecord.orderId,
      paymentId: paymentRecord._id,
      clientSecret: intent.clientSecret,
      lastError: intent.lastError,
    };
  },
});

type CreateStripePaymentIntentArgs = {
  amountMinor: number;
  currency: string;
  receiptEmail: string;
  customerName: string;
  customerPhone?: string;
  shippingAddress: string;
  metadata?: Record<string, string>;
  description?: string;
};

const createStripePaymentIntent = async (
  args: CreateStripePaymentIntentArgs,
): Promise<StripeIntentSummary> => {
  const stripe = getStripeClient();

  const intent = await stripe.paymentIntents.create({
    amount: args.amountMinor,
    currency: args.currency,
    automatic_payment_methods: {
      enabled: true,
      allow_redirects: "never",
    },
    receipt_email: args.receiptEmail,
    description: args.description,
    shipping: {
      name: args.customerName,
      phone: args.customerPhone,
      address: {
        line1: args.shippingAddress,
      },
    },
    metadata: args.metadata,
  });

  return mapIntent(intent);
};

const retrieveStripePaymentIntent = async (
  paymentIntentId: string,
): Promise<StripeIntentSummary> => {
  const stripe = getStripeClient();
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ["latest_charge"],
  });

  return mapIntent(intent);
};
