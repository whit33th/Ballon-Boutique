"use node";

import crypto from "node:crypto";
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
  paymentSourceValidator,
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

type PaymentIntentRecord = {
  _id: Id<"payments">;
  orderId?: Id<"orders">;
};

type SubmitPaymentResult = {
  paymentIntentId: string;
  status: PaymentStatus;
  clientSecret?: string;
  lastError?: string;
};

type SyncPaymentIntentStatusResult = {
  paymentIntentId: string;
  status: PaymentStatus;
  paymentId: Id<"payments">;
  orderId?: Id<"orders">;
  clientSecret?: string;
  lastError?: string;
};

const summarizeItems = (
  items: ReadonlyArray<{ productName: string; quantity: number }>,
) =>
  items
    .map((item) => `${item.quantity}x ${item.productName}`)
    .slice(0, 15)
    .join(", ");

const sanitizeForStripe = (value: string) => {
  // Stripe limits metadata values to 500 characters. Convert very long
  // values to a short sha256 fingerprint so we never exceed that limit.
  if (value.length <= 480) return value;
  return `sha256:${crypto.createHash("sha256").update(value).digest("hex")}`;
};

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

const mapIntent = (
  intent: Stripe.PaymentIntent,
  options?: { expectClientSecret?: boolean },
): StripeIntentSummary => {
  const lastError = intent.last_payment_error?.message;
  const latestChargeId =
    typeof intent.latest_charge === "string"
      ? intent.latest_charge
      : intent.latest_charge?.id;

  if (options?.expectClientSecret !== false && !intent.client_secret) {
    throw new Error("Stripe did not return a client secret");
  }

  return {
    paymentIntentId: intent.id,
    clientSecret: intent.client_secret ?? "",
    status: derivePaymentStatus(intent.status, lastError),
    latestChargeId: latestChargeId ?? undefined,
    lastError: lastError ?? undefined,
  };
};

export const submitPayment = action({
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
    paymentMethodId: v.string(),
    cartSignature: v.optional(v.string()),
    paymentSource: paymentSourceValidator,
    metadata: v.optional(paymentMetadataValidator),
  },
  returns: v.object({
    paymentIntentId: v.string(),
    status: paymentStatusValidator,
    clientSecret: v.optional(v.string()),
    lastError: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<SubmitPaymentResult> => {
    const authUserId = await getAuthUserId(ctx);

    const draft = await ctx.runMutation(
      internal.paymentMutations.preparePaymentDraft,
      {
        items: args.items,
        customer: args.customer,
        shipping: args.shipping,
        userId: authUserId ?? undefined,
      },
    );

    const metadata: Record<string, string> = {
      customerEmail: args.customer.email,
      deliveryType: args.shipping.deliveryType,
      items: summarizeItems(draft.items),
      amountMinor: draft.amountMinor.toString(),
    };

    // Never send very long values to Stripe metadata. For the cart
    // signature we store a short sha256 fingerprint instead of the full
    // JSON payload which can exceed Stripe's 500 char limit.
    if (args.cartSignature) {
      const sigHash = `sha256:${crypto
        .createHash("sha256")
        .update(args.cartSignature)
        .digest("hex")}`;
      metadata.cartSignatureHash = sigHash;
    }

    if (args.metadata) {
      for (const [key, value] of Object.entries(args.metadata)) {
        metadata[key] = sanitizeForStripe(value);
      }
    }

    const intent = await createStripePaymentIntent({
      amountMinor: draft.amountMinor,
      currency: args.paymentCurrency,
      receiptEmail: args.customer.email,
      customerName: args.customer.name,
      customerPhone: args.customer.phone,
      shippingAddress: (() => {
        const addr = args.shipping.address;
        if (typeof addr === "string") {
          return addr;
        }
        // Format address for Stripe: street, postalCode city, notes
        const streetLine = addr.streetAddress.trim();
        const cityLine = [addr.postalCode.trim(), addr.city.trim()]
          .filter(Boolean)
          .join(" ")
          .trim();
        const notesLine = addr.deliveryNotes.trim();
        return [streetLine, cityLine, notesLine].filter(Boolean).join("\n").trim();
      })(),
      metadata,
      paymentMethodId: args.paymentMethodId,
      description: `${args.customer.name} order`,
    });

    await ctx.runMutation(internal.paymentMutations.createPaymentRecord, {
      userId: draft.userId,
      paymentIntentId: intent.paymentIntentId,
      status: intent.status,
      amountBase: draft.normalizedAmount,
      amountMinor: draft.amountMinor,
      currency: args.paymentCurrency,
      displayAmount: args.displayAmount,
      customer: args.customer,
      shipping: args.shipping,
      items: draft.items,
      cartSignature: args.cartSignature,
      paymentSource: args.paymentSource,
      clientSecret: intent.clientSecret,
      lastError: intent.lastError,
    });

    return {
      paymentIntentId: intent.paymentIntentId,
      status: intent.status,
      clientSecret: intent.clientSecret,
      lastError: intent.lastError,
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
      orderId: v.optional(v.id("orders")),
      paymentId: v.id("payments"),
      clientSecret: v.optional(v.string()),
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
  paymentMethodId: string;
};

const createStripePaymentIntent = async (
  args: CreateStripePaymentIntentArgs,
): Promise<StripeIntentSummary> => {
  const stripe = getStripeClient();

  const intent = await stripe.paymentIntents.create({
    amount: args.amountMinor,
    currency: args.currency,
    payment_method_types: ["card"],
    payment_method: args.paymentMethodId,
    confirm: true,
    automatic_payment_methods: {
      enabled: false,
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

  return mapIntent(intent, { expectClientSecret: false });
};
