"use node";

import { v } from "convex/values";
import { api, internal } from "./_generated/api.js";
import type { Doc } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";

type OrderItem = Doc<"orders">["items"][number];

export const sendOrderConfirmationEmail = internalAction({
  args: {
    orderId: v.id("orders"),
  },
  returns: v.object({
    ok: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const appUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://ballon-boutique.vercel.app";

    const internalApiSecret = process.env.INTERNAL_EMAIL_WEBHOOK_SECRET ?? "";

    const claim = await ctx.runMutation(
      internal.paymentMutations.claimOrderConfirmationEmailSend,
      { orderId: args.orderId },
    );

    if (!claim.shouldSend) {
      return { ok: true };
    }

    const order = await ctx.runQuery(api.orders.getPublic, { id: args.orderId });

    if (!order) {
      return { ok: false };
    }

    // If you create pending orders before payment, we only email when confirmed.
    if (order.status !== "confirmed") {
      return { ok: true };
    }

    const confirmationUrl = `${appUrl}/checkout/confirmant/${order._id}`;

    const payload = {
      orderId: order._id,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      items: (order.items ?? []).map((item: OrderItem) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        personalization: item.personalization,
      })),
      totalAmount: order.totalAmount,
      grandTotal: order.grandTotal,
      deliveryFee: order.deliveryFee,
      deliveryType: (order.deliveryType ?? "pickup") as "pickup" | "delivery",
      paymentMethod: (order.paymentMethod ?? "full_online") as
        | "full_online"
        | "partial_online"
        | "cash",
      pickupDateTime: order.pickupDateTime,
      shippingAddress: order.shippingAddress,
      currency: order.currency ?? "EUR",
      confirmationUrl,
    };

    const res = await fetch(`${appUrl}/api/send-order-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(internalApiSecret ? { "x-internal-secret": internalApiSecret } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("Order confirmation email failed", res.status, text);

      await ctx.runMutation(
        (internal as any).paymentMutations.recordOrderConfirmationEmailFailure,
        {
          orderId: args.orderId,
          status: res.status,
          error: text || `HTTP ${res.status}`,
        },
      );

      return { ok: false };
    }

    await ctx.runMutation(internal.paymentMutations.markOrderConfirmationEmailSent, {
      orderId: args.orderId,
    });

    await ctx.runMutation(
      (internal as any).paymentMutations.clearOrderConfirmationEmailFailure,
      { orderId: args.orderId },
    );

    return { ok: true };
  },
});
