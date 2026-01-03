"use node";

import { v } from "convex/values";
import type Stripe from "stripe";
import { internal } from "./_generated/api.js";
import { internalAction } from "./_generated/server";
import { getStripeClient } from "./helpers/stripeClient";
import type { PaymentStatus } from "./paymentMutations";

const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const getLatestChargeId = (intent: Stripe.PaymentIntent) => {
  const latestCharge = intent.latest_charge;
  if (!latestCharge) {
    return undefined;
  }

  return typeof latestCharge === "string"
    ? latestCharge
    : (latestCharge as Stripe.Charge).id;
};

const okResult = () => ({
  ok: true as const,
});

const errorResult = (status: number, message: string) => ({
  ok: false as const,
  status,
  message,
});

export const handleStripeWebhookEvent = internalAction({
  args: {
    rawBody: v.string(),
    signature: v.string(),
  },
  returns: v.union(
    v.object({
      ok: v.literal(true),
    }),
    v.object({
      ok: v.literal(false),
      status: v.number(),
      message: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    if (!stripeWebhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET is not configured");
      return errorResult(500, "Webhook secret missing");
    }

    const stripe = getStripeClient();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        args.rawBody,
        args.signature,
        stripeWebhookSecret,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown signature error";
      console.error("Stripe webhook signature verification failed", message);
      return errorResult(400, `Invalid signature: ${message}`);
    }

    try {
      switch (event.type) {
        case "payment_intent.succeeded": {
          const intent = event.data.object as Stripe.PaymentIntent;
          const finalized = await ctx.runMutation(
            internal.paymentMutations.finalizePaymentFromIntent,
            {
              paymentIntentId: intent.id,
              stripeChargeId: getLatestChargeId(intent),
            },
          );

          if (finalized?.orderId) {
            // Email sending is triggered from order creation/confirmation logic
            // (see internal orderEmailActions + scheduling from mutations).
          }
          break;
        }
        case "payment_intent.payment_failed":
        case "payment_intent.canceled":
        case "payment_intent.processing":
        case "payment_intent.requires_action": {
          const intent = event.data.object as Stripe.PaymentIntent;
          await ctx.runMutation(internal.paymentMutations.updatePaymentStatus, {
            paymentIntentId: intent.id,
            status: intent.status as PaymentStatus,
            lastError: intent.last_payment_error?.message ?? undefined,
          });
          break;
        }
        default: {
          console.info(`Unhandled Stripe webhook event: ${event.type}`);
        }
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown webhook handler error";
      console.error(`Error while handling Stripe webhook: ${message}`);
      return errorResult(500, "Handler error");
    }

    return okResult();
  },
});
