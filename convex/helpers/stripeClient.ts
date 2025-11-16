"use node";

import Stripe from "stripe";

export const STRIPE_API_VERSION =
  "2025-10-29.clover" satisfies Stripe.LatestApiVersion;

let cachedClient: Stripe | null = null;

export const getStripeClient = (): Stripe => {
  if (cachedClient) {
    return cachedClient;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY environment variable");
  }

  cachedClient = new Stripe(secretKey, {
    apiVersion: STRIPE_API_VERSION,
  });

  return cachedClient;
};
