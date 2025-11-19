import { internal } from "./_generated/api.js";
import { httpAction } from "./_generated/server";

export const stripeWebhook = httpAction(async (ctx, req) => {
  const signature = req.headers.get("stripe-signature") as string;

  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  const rawBody = await req.text();
  const result = await ctx.runAction(
    internal.stripeWebhookHandler.handleStripeWebhookEvent,
    {
      rawBody,
      signature,
    },
  );

  if (!result.ok) {
    const status = result.status ?? 500;
    const message = result.message ?? "Stripe webhook error";
    return new Response(message, { status });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
