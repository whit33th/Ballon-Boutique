"use node";

import { v } from "convex/values";
import type Stripe from "stripe";
import { internal } from "./_generated/api.js";
import { action, } from "./_generated/server";
import { getStripeClient } from "./helpers/stripeClient";
import { type PaymentStatus, paymentStatusValidator } from "./paymentMutations";

type StripeRiskLevel =
  | "normal"
  | "elevated"
  | "highest"
  | "not_assessed"
  | "unknown";

const allowedRiskLevels: ReadonlyArray<StripeRiskLevel> = [
  "normal",
  "elevated",
  "highest",
  "not_assessed",
  "unknown",
];

const riskLevelValidator = v.optional(
  v.union(
    v.literal("normal"),
    v.literal("elevated"),
    v.literal("highest"),
    v.literal("not_assessed"),
    v.literal("unknown"),
  ),
);

const normalizeRiskLevel = (riskLevel?: string | null): StripeRiskLevel => {
  if (!riskLevel) {
    return "unknown";
  }

  return allowedRiskLevels.includes(riskLevel as StripeRiskLevel)
    ? (riskLevel as StripeRiskLevel)
    : "unknown";
};

export const listStripePayments = action({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      id: v.string(),
      created: v.number(),
      amountMinor: v.number(),
      currency: v.string(),
      status: paymentStatusValidator,
      customer: v.object({
        name: v.optional(v.string()),
        email: v.optional(v.string()),
      }),
      riskLevel: riskLevelValidator,
      sourceType: v.optional(v.string()),
      device: v.optional(v.string()),
      deviceIp: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    await ctx.runQuery(internal.paymentsAdmin.assertAdminAccess, {});

    const stripe = getStripeClient();
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 100);

    const response = await stripe.paymentIntents.list({
      limit,
      expand: ["data.latest_charge"],
    });

    return response.data.map(mapPaymentIntent);
  },
});

const mapPaymentIntent = (intent: Stripe.PaymentIntent) => {
  const charge =
    typeof intent.latest_charge === "string"
      ? null
      : (intent.latest_charge as Stripe.Charge | null);

  const status = normalizeStatus(intent.status);
  const customer = {
    name: intent.shipping?.name ?? undefined,
    email: intent.receipt_email ?? undefined,
  };

  const riskLevel = normalizeRiskLevel(charge?.outcome?.risk_level);
  const sourceType = charge?.payment_method_details?.type ?? undefined;

  const device = buildDeviceLabel(charge);
  const deviceIp =
    charge?.payment_method_details?.card?.wallet?.dynamic_last4 ?? undefined;

  return {
    id: intent.id,
    created: intent.created * 1000,
    amountMinor: intent.amount,
    currency: intent.currency,
    status,
    customer,
    riskLevel,
    sourceType,
    device,
    deviceIp,
  };
};

const buildDeviceLabel = (charge: Stripe.Charge | null) => {
  if (!charge?.payment_method_details) {
    return undefined;
  }

  const details = charge.payment_method_details;
  if (details.type === "card") {
    const brand = details.card?.brand?.toUpperCase();
    const wallet = details.card?.wallet?.type;
    if (wallet && brand) {
      return `${brand} • ${wallet}`;
    }
    if (brand) {
      return brand;
    }
  }

  return details.type;
};

const normalizeStatus = (
  status: Stripe.PaymentIntent.Status,
): PaymentStatus => {
  switch (status) {
    case "requires_payment_method":
    case "requires_confirmation":
    case "requires_action":
    case "processing":
    case "requires_capture":
    case "succeeded":
    case "canceled":
      return status;
    default:
      return "requires_payment_method";
  }
};
