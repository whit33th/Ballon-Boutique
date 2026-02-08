import type { FunctionReference } from "convex/server";
import { v } from "convex/values";
import { internal } from "./_generated/api.js";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { ensureAdmin } from "./helpers/admin";
import { requireUser } from "./helpers/auth";
import {
  applyDiscountToAmount,
  loadActiveDiscounts,
  resolveDiscountForProduct,
} from "./helpers/discounts";
import {
  assertDeliverySlotIsValidAndAvailable,
  buildDeliverySlotsForDate,
  markDeliverySlotAvailability,
} from "./helpers/deliverySlots";
import { addressValidator } from "./validators/address";
import { orderItemValidator, orderStatusValidator } from "./validators/order";

const orderEmailActionsInternal = internal as unknown as {
  orderEmailActions: {
    sendOrderConfirmationEmail: FunctionReference<
      "action",
      "internal",
      { orderId: Id<"orders"> },
      { ok: boolean }
    >;
  };
};

const orderValidator = v.object({
  _id: v.id("orders"),
  _creationTime: v.number(),
  userId: v.id("users"),
  items: v.array(orderItemValidator),
  totalAmount: v.number(),
  status: orderStatusValidator,
  customerEmail: v.string(),
  customerName: v.string(),
  // Optional enrichment for admin UI (populated from the user record).
  phone: v.optional(v.string()),
  shippingAddress: addressValidator,
  deliveryType: v.optional(v.union(v.literal("pickup"), v.literal("delivery"))),
  paymentMethod: v.optional(
    v.union(
      v.literal("full_online"),
      v.literal("partial_online"),
      v.literal("cash"),
    ),
  ),
  paymentIntentId: v.optional(v.string()),
  pickupDateTime: v.optional(v.string()),
  currency: v.optional(v.string()),
  deliveryFee: v.optional(v.number()),
  grandTotal: v.optional(v.number()),
  confirmationEmailSendingAt: v.optional(v.number()),
  confirmationEmailSentAt: v.optional(v.number()),
  confirmationEmailLastStatus: v.optional(v.number()),
  confirmationEmailLastError: v.optional(v.string()),
});

export const createGuest = mutation({
  args: {
    customerName: v.string(),
    customerEmail: v.string(),
    shippingAddress: addressValidator,
    deliveryType: v.union(v.literal("pickup"), v.literal("delivery")),
    paymentMethod: v.union(
      v.literal("full_online"),
      v.literal("partial_online"),
      v.literal("cash"),
    ),
    pickupDateTime: v.optional(v.string()),
    items: v.array(
      v.object({
        productId: v.id("products"),
        quantity: v.number(),
        variant: v.optional(
          v.object({
            size: v.string(),
          }),
        ),
        personalization: v.optional(
          v.object({
            text: v.optional(v.string()),
            color: v.optional(v.string()),
            number: v.optional(v.string()),
          }),
        ),
      }),
    ),
  },
  returns: v.id("orders"),
  handler: async (ctx, args) => {
    // Validate pickupDateTime if provided
    if (args.pickupDateTime) {
      const selectedDate = new Date(args.pickupDateTime);
      const now = new Date();

      // Minimum: 72 hours from now (preorder rule)
      const minDate = new Date(now);
      minDate.setHours(minDate.getHours() + 72);

      // Maximum: 1 year from now
      const maxDate = new Date();
      maxDate.setFullYear(now.getFullYear() + 1);

      if (selectedDate < minDate) {
        throw new Error(
          "Pickup/delivery date must be at least 72 hours in advance",
        );
      }

      if (selectedDate > maxDate) {
        throw new Error("Pickup date cannot be more than 1 year in advance");
      }
    }

    if (args.deliveryType === "delivery") {
      if (!args.pickupDateTime) {
        throw new Error("Delivery requires a delivery time slot");
      }
      await assertDeliverySlotIsValidAndAvailable({
        db: ctx.db,
        slotIso: args.pickupDateTime,
      });
    }

    if (args.items.length === 0) {
      throw new Error("Cart is empty");
    }

    type OrderItem = Doc<"orders">["items"][number];
    const orderItems: OrderItem[] = [];
    const activeDiscounts = await loadActiveDiscounts(ctx);
    let totalAmount = 0;

    for (const item of args.items) {
      const product = await ctx.db.get(item.productId);
      if (!product) {
        continue;
      }

      if (!product.inStock) {
        throw new Error(`${product.name} is out of stock`);
      }

      const availableSizes = (product.miniSetSizes ?? []) as Array<{
        label: string;
        price: number;
      }>;

      let unitPrice = product.price;
      let variant: { size: string } | undefined;

      if (availableSizes.length > 0) {
        const requestedSize = item.variant?.size?.trim();
        if (!requestedSize) {
          throw new Error("Please select a size for this mini-set");
        }

        const match = availableSizes.find(
          (entry) =>
            entry.label.trim().toLowerCase() === requestedSize.toLowerCase(),
        );
        if (!match) {
          throw new Error("Selected size is not available");
        }

        unitPrice = match.price;
        variant = { size: match.label.trim() };
      } else if (item.variant?.size) {
        throw new Error("Variant size is not supported for this product");
      }

      const discount = resolveDiscountForProduct(product, activeDiscounts);
      const originalUnitPrice = unitPrice;
      const discountedUnitPrice = discount
        ? applyDiscountToAmount(unitPrice, discount.percentage)
        : unitPrice;

      const orderItem = {
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        price: discountedUnitPrice,
        originalPrice: discount ? originalUnitPrice : undefined,
        discountPct: discount?.percentage,
        discountId: discount?._id,
        variant,
        personalization: item.personalization ?? undefined,
        productImageUrl: product.imageUrls?.[0] ?? null,
      } as OrderItem;

      orderItems.push(orderItem);

      totalAmount += discountedUnitPrice * item.quantity;

      await ctx.db.patch(product._id, {
        soldCount: (product.soldCount ?? 0) + item.quantity,
      });
    }

    // Find or create guest user by email
    let userId = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.customerEmail))
      .first()
      .then((user) => user?._id);

    if (!userId) {
      userId = await ctx.db.insert("users", {
        email: args.customerEmail,
        name: args.customerName,
        emailVerificationTime: undefined,
        phone: undefined,
        phoneVerificationTime: undefined,
      });
    }

    const orderId = await ctx.db.insert("orders", {
      userId,
      items: orderItems,
      totalAmount,
      status: args.paymentMethod === "cash" ? "confirmed" : "pending",
      customerName: args.customerName,
      customerEmail: args.customerEmail,
      shippingAddress: args.shippingAddress,
      deliveryType: args.deliveryType,
      paymentMethod: args.paymentMethod,
      pickupDateTime: args.pickupDateTime,
    });

    if (args.paymentMethod === "cash") {
      await ctx.scheduler.runAfter(
        0,
        orderEmailActionsInternal.orderEmailActions.sendOrderConfirmationEmail,
        {
          orderId,
        },
      );
    }

    return orderId;
  },
});

export const deliverySlotsForDate = query({
  args: {
    date: v.string(), // YYYY-MM-DD
    ignoreOrderId: v.optional(v.id("orders")),
  },
  returns: v.array(
    v.object({
      minutes: v.number(),
      label: v.string(),
      iso: v.string(),
      available: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    const slots = buildDeliverySlotsForDate(args.date);
    if (slots.length === 0) return [];

    // Simple approach: read recent orders and filter in-memory.
    // For larger volumes, add an index on (deliveryType, pickupDateTime) and query by range.
    const recentOrders = await ctx.db.query("orders").order("desc").take(500);
    const existingDeliveryIsos = recentOrders
      .filter((o) => (o.deliveryType ?? "pickup") === "delivery")
      .filter((o) => (args.ignoreOrderId ? o._id !== args.ignoreOrderId : true))
      .map((o) => o.pickupDateTime)
      .filter(
        (iso): iso is string => typeof iso === "string" && iso.length > 0,
      );

    return markDeliverySlotAvailability({
      slots,
      existingDeliveryOrderIsos: existingDeliveryIsos,
    });
  },
});

export const create = mutation({
  args: {
    customerName: v.string(),
    customerEmail: v.string(),
    shippingAddress: addressValidator,
    deliveryType: v.union(v.literal("pickup"), v.literal("delivery")),
    paymentMethod: v.union(
      v.literal("full_online"),
      v.literal("partial_online"),
      v.literal("cash"),
    ),
    pickupDateTime: v.optional(v.string()),
  },
  returns: v.id("orders"),
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);

    // Validate pickupDateTime if provided
    if (args.pickupDateTime) {
      const selectedDate = new Date(args.pickupDateTime);
      const now = new Date();

      // Minimum: 72 hours from now (preorder rule)
      const minDate = new Date(now);
      minDate.setHours(minDate.getHours() + 72);

      // Maximum: 1 year from now
      const maxDate = new Date();
      maxDate.setFullYear(now.getFullYear() + 1);

      if (selectedDate < minDate) {
        throw new Error(
          "Pickup/delivery date must be at least 72 hours in advance",
        );
      }

      if (selectedDate > maxDate) {
        throw new Error("Pickup date cannot be more than 1 year in advance");
      }
    }

    const cartItems = [];
    const cartQuery = ctx.db
      .query("cartItems")
      .withIndex("by_user", (q) => q.eq("userId", userId));

    for await (const cartItem of cartQuery) {
      cartItems.push(cartItem);
    }

    if (cartItems.length === 0) {
      throw new Error("Cart is empty");
    }

    type OrderItem = Doc<"orders">["items"][number];
    const orderItems: OrderItem[] = [];
    const activeDiscounts = await loadActiveDiscounts(ctx);
    let totalAmount = 0;

    for (const cartItem of cartItems) {
      const product = await ctx.db.get(cartItem.productId);
      if (!product) {
        continue;
      }

      if (!product.inStock) {
        throw new Error(`${product.name} is out of stock`);
      }

      const availableSizes = (product.miniSetSizes ?? []) as Array<{
        label: string;
        price: number;
      }>;

      let unitPrice = product.price;
      let variant: { size: string } | undefined;

      if (availableSizes.length > 0) {
        const requestedSize = (
          cartItem.variant as { size?: string } | undefined
        )?.size?.trim();
        if (!requestedSize) {
          throw new Error("Please select a size for this mini-set");
        }

        const match = availableSizes.find(
          (entry) =>
            entry.label.trim().toLowerCase() === requestedSize.toLowerCase(),
        );
        if (!match) {
          throw new Error("Selected size is not available");
        }

        unitPrice =
          (cartItem.variant as { unitPrice?: number } | undefined)?.unitPrice ??
          match.price;
        variant = { size: match.label.trim() };
      } else if ((cartItem.variant as { size?: string } | undefined)?.size) {
        throw new Error("Variant size is not supported for this product");
      }

      const discount = resolveDiscountForProduct(product, activeDiscounts);
      const originalUnitPrice = unitPrice;
      const discountedUnitPrice = discount
        ? applyDiscountToAmount(unitPrice, discount.percentage)
        : unitPrice;

      const orderItem = {
        productId: cartItem.productId,
        productName: product.name,
        quantity: cartItem.quantity,
        price: discountedUnitPrice,
        originalPrice: discount ? originalUnitPrice : undefined,
        discountPct: discount?.percentage,
        discountId: discount?._id,
        variant,
        // Preserve personalization from the cart so order shows color/text/number
        personalization: cartItem.personalization ?? undefined,
        productImageUrl: product.imageUrls?.[0] ?? null,
      } as OrderItem;

      orderItems.push(orderItem);

      totalAmount += discountedUnitPrice * cartItem.quantity;

      await ctx.db.patch(product._id, {
        soldCount: (product.soldCount ?? 0) + cartItem.quantity,
      });
    }

    const orderId = await ctx.db.insert("orders", {
      userId,
      items: orderItems,
      totalAmount,
      status: args.paymentMethod === "cash" ? "confirmed" : "pending",
      customerName: args.customerName,
      customerEmail: args.customerEmail,
      shippingAddress: args.shippingAddress,
      deliveryType: args.deliveryType,
      paymentMethod: args.paymentMethod,
      pickupDateTime: args.pickupDateTime,
    });

    if (args.paymentMethod === "cash") {
      await ctx.scheduler.runAfter(
        0,
        orderEmailActionsInternal.orderEmailActions.sendOrderConfirmationEmail,
        {
          orderId,
        },
      );
    }

    // Clear the user's cart after a successful checkout regardless of payment method
    for (const cartItem of cartItems) {
      await ctx.db.delete(cartItem._id);
    }

    return orderId;
  },
});

export const list = query({
  args: {},
  returns: v.array(orderValidator),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const { userId } = await requireUser(ctx);

    const orders: Doc<"orders">[] = [];

    const orderQuery = ctx.db
      .query("orders")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc");

    for await (const order of orderQuery) {
      orders.push(order);
    }

    return orders;
  },
});

export const listAll = query({
  args: {
    status: v.optional(orderStatusValidator),
    sort: v.optional(v.union(v.literal("newest"), v.literal("oldest"))),
  },
  returns: v.array(orderValidator),
  handler: async (ctx, args) => {
    // Проверка прав администратора
    await ensureAdmin(ctx);

    const orders: Doc<"orders">[] = [];

    if (args.status) {
      const status = args.status;
      const statusQuery = ctx.db
        .query("orders")
        .withIndex("by_status", (q) => q.eq("status", status));

      for await (const order of statusQuery) {
        orders.push(order);
      }
    } else {
      const allOrders = ctx.db.query("orders");
      for await (const order of allOrders) {
        orders.push(order);
      }
    }

    orders.sort((a, b) => {
      if (args.sort === "oldest") {
        return a._creationTime - b._creationTime;
      }

      return b._creationTime - a._creationTime;
    });

    // Enrich with user phone so admin can search by phone.
    const uniqueUserIds = Array.from(
      new Set(orders.map((order) => order.userId)),
    );
    const phoneByUserId = new Map<string, string>();

    for (const userId of uniqueUserIds) {
      const user = await ctx.db.get(userId);
      const phone = user?.phone;
      if (typeof phone === "string" && phone.trim().length > 0) {
        phoneByUserId.set(userId, phone.trim());
      }
    }

    return orders.map((order) => ({
      ...order,
      phone: phoneByUserId.get(order.userId),
    }));
  },
});

export const get = query({
  args: { id: v.id("orders") },
  returns: v.union(orderValidator, v.null()),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const { userId } = await requireUser(ctx);

    const order = await ctx.db.get(args.id);
    if (!order || order.userId !== userId) {
      return null;
    }

    return order;
  },
});

// Публичный query для получения заказа сразу после создания (для гостей и авторизованных)
export const getPublic = query({
  args: { id: v.id("orders") },
  returns: v.union(orderValidator, v.null()),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.id);
    return order ?? null;
  },
});

// Admin-only: обновление статуса заказа
export const updateStatus = mutation({
  args: {
    orderId: v.id("orders"),
    status: orderStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Проверка прав администратора
    await ensureAdmin(ctx);

    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    await ctx.db.patch(args.orderId, {
      status: args.status,
    });

    return null;
  },
});

// Admin-only: update scheduled pickup/delivery datetime.
// For delivery orders, enforces the configured slot rules and availability.
export const updatePickupDateTimeAdmin = mutation({
  args: {
    orderId: v.id("orders"),
    // Use empty string to clear (schema keeps it as optional string).
    pickupDateTime: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ensureAdmin(ctx);

    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    const nextPickupDateTime = args.pickupDateTime.trim();

    // Validate date rules if a value is set.
    if (nextPickupDateTime.length > 0) {
      const selectedDate = new Date(nextPickupDateTime);
      if (Number.isNaN(selectedDate.getTime())) {
        throw new Error("Invalid pickup/delivery datetime");
      }

      const now = new Date();

      // Maximum: 1 year from now
      const maxDate = new Date();
      maxDate.setFullYear(now.getFullYear() + 1);

      // Admin rescheduling: allow within 72 hours, but disallow past times.
      if (selectedDate < now) {
        throw new Error("Pickup/delivery datetime must be in the future");
      }

      if (selectedDate > maxDate) {
        throw new Error("Pickup date cannot be more than 1 year in advance");
      }

      if ((order.deliveryType ?? "pickup") === "delivery") {
        await assertDeliverySlotIsValidAndAvailable({
          db: ctx.db,
          slotIso: nextPickupDateTime,
          ignoreOrderId: order._id,
        });
      }
    }

    await ctx.db.patch(args.orderId, {
      pickupDateTime: nextPickupDateTime,
    });

    return null;
  },
});

// Admin-only: удаление заказа
export const deleteOrder = mutation({
  args: {
    orderId: v.id("orders"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Проверка прав администратора
    await ensureAdmin(ctx);

    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    await ctx.db.delete(args.orderId);

    return null;
  },
});
