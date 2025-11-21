import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { addressValidator, optionalAddressValidator } from "./validators/address";

const usersTable = defineTable({
  name: v.optional(v.string()),
  image: v.optional(v.string()),
  imageFileId: v.optional(v.union(v.id("_storage"), v.string())),
  email: v.optional(v.string()),
  emailVerificationTime: v.optional(v.number()),
  phone: v.optional(v.string()),
  phoneVerificationTime: v.optional(v.number()),
  isAnonymous: v.optional(v.boolean()),
  address: optionalAddressValidator,
  isAdmin: v.optional(v.boolean()),
})
  .index("email", ["email"])
  .index("phone", ["phone"]);

const applicationTables = {
  products: defineTable({
    name: v.string(),
    description: v.string(),
    price: v.number(),
    categoryGroup: v.string(),
    categories: v.array(v.string()),
    imageUrls: v.array(v.string()),
    inStock: v.boolean(),
    soldCount: v.optional(v.number()),
    isPersonalizable: v.optional(
      v.object({
        name: v.boolean(),
        number: v.boolean(),
      }),
    ),
    availableColors: v.optional(v.array(v.string())),
  })
    .searchIndex("search_products", {
      searchField: "name",
    })
    // Single field indexes for basic queries
    .index("by_price", ["price"])
    .index("by_name", ["name"])
    .index("by_category_group", ["categoryGroup"])
    // Composite indexes for better e-commerce performance
    // Default sorting: show bestsellers first (by soldCount desc, then by _creationTime desc)
    .index("by_popularity", ["soldCount"])
    // Category group + popularity for filtered browsing
    .index("by_group_and_popularity", ["categoryGroup", "soldCount"])
    // Price sorting within category group
    .index("by_group_and_price", ["categoryGroup", "price"])
    // Stock + popularity for availability filtering
    .index("by_stock_and_sold", ["inStock", "soldCount"]),

  cartItems: defineTable({
    userId: v.id("users"),
    productId: v.id("products"),
    quantity: v.number(),
    personalization: v.optional(
      v.object({
        text: v.optional(v.string()),
        color: v.optional(v.string()),
        number: v.optional(v.string()),
      }),
    ),
    personalizationSignature: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_product", ["userId", "productId"])
    .index("by_user_product_signature", [
      "userId",
      "productId",
      "personalizationSignature",
    ]),

  orders: defineTable({
    userId: v.id("users"),
    items: v.array(
      v.object({
        productId: v.id("products"),
        productName: v.string(),
        quantity: v.number(),
        price: v.number(),
        personalization: v.optional(
          v.object({
            text: v.optional(v.string()),
            color: v.optional(v.string()),
            number: v.optional(v.string()),
          }),
        ),
      }),
    ),
    totalAmount: v.number(),
    grandTotal: v.optional(v.number()),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("shipped"),
      v.literal("delivered"),
    ),
    customerEmail: v.string(),
    customerName: v.string(),
    shippingAddress: addressValidator,
    deliveryType: v.optional(
      v.union(v.literal("pickup"), v.literal("delivery")),
    ),
    deliveryFee: v.optional(v.number()),
    currency: v.optional(v.string()),
    paymentMethod: v.optional(
      v.union(
        v.literal("full_online"),
        v.literal("partial_online"),
        v.literal("cash"),
      ),
    ),
    paymentIntentId: v.optional(v.string()),
    whatsappConfirmed: v.optional(v.boolean()),
    pickupDateTime: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  payments: defineTable({
    orderId: v.optional(v.id("orders")),
    userId: v.optional(v.id("users")),
    paymentIntentId: v.optional(v.string()),
    status: v.union(
      v.literal("requires_payment_method"),
      v.literal("requires_confirmation"),
      v.literal("requires_action"),
      v.literal("processing"),
      v.literal("requires_capture"),
      v.literal("succeeded"),
      v.literal("canceled"),
      v.literal("failed"),
      v.literal("refunded"),
    ),
    amountBase: v.number(),
    amountMinor: v.number(),
    currency: v.string(),
    displayAmount: v.object({
      value: v.number(),
      currency: v.string(),
      conversionRate: v.optional(v.number()),
      conversionFeePct: v.optional(v.number()),
    }),
    cartSignature: v.optional(v.string()),
    customer: v.object({
      name: v.string(),
      email: v.string(),
      phone: v.optional(v.string()),
    }),
    shipping: v.object({
      address: addressValidator,
      deliveryType: v.union(v.literal("pickup"), v.literal("delivery")),
      pickupDateTime: v.optional(v.string()),
      deliveryFee: v.optional(v.number()),
    }),
    items: v.array(
      v.object({
        productId: v.id("products"),
        productName: v.string(),
        quantity: v.number(),
        price: v.number(),
        personalization: v.optional(
          v.object({
            text: v.optional(v.string()),
            color: v.optional(v.string()),
            number: v.optional(v.string()),
          }),
        ),
      }),
    ),
    stripeClientSecret: v.optional(v.string()),
    stripeLatestChargeId: v.optional(v.string()),
    lastError: v.optional(v.string()),
    refunds: v.optional(
      v.array(
        v.object({
          stripeRefundId: v.string(),
          amountMinor: v.number(),
          amount: v.number(),
          currency: v.string(),
          reason: v.optional(v.string()),
          createdAt: v.number(),
        }),
      ),
    ),
    paymentSource: v.optional(
      v.union(v.literal("card"), v.literal("payment_request")),
    ),
  })
    .index("by_payment_intent_id", ["paymentIntentId"])
    .index("by_order", ["orderId"])
    .index("by_user", ["userId"]),
};

export default defineSchema({
  ...authTables,
  authSessions: authTables.authSessions,
  authAccounts: authTables.authAccounts.index("userId", ["userId"]),
  authRefreshTokens: authTables.authRefreshTokens,
  authVerificationCodes: authTables.authVerificationCodes,
  authVerifiers: authTables.authVerifiers.index("sessionId", ["sessionId"]),
  authRateLimits: authTables.authRateLimits,
  users: usersTable,
  ...applicationTables,
});
