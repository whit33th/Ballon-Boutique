import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const usersTable = defineTable({
  name: v.optional(v.string()),
  image: v.optional(v.string()),
  email: v.optional(v.string()),
  emailVerificationTime: v.optional(v.number()),
  phone: v.optional(v.string()),
  phoneVerificationTime: v.optional(v.number()),
  isAnonymous: v.optional(v.boolean()),
  address: v.optional(v.string()),
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
    category: v.string(),
    imageUrls: v.array(v.string()),
    inStock: v.boolean(),
    soldCount: v.optional(v.number()),
    isPersonalizable: v.boolean(),
    availableColors: v.optional(v.array(v.string())),
  })
    .searchIndex("search_products", {
      searchField: "name",
    })
    // Single field indexes for basic queries
    .index("by_price", ["price"])
    .index("by_name", ["name"])
    .index("by_category", ["category"])
    .index("by_category_group", ["categoryGroup"])
    .index("by_group_and_category", ["categoryGroup", "category"])
    // Composite indexes for better e-commerce performance
    // Default sorting: show bestsellers first (by soldCount desc, then by _creationTime desc)
    .index("by_popularity", ["soldCount"])
    // Category + popularity for filtered browsing
    .index("by_category_and_popularity", ["category", "soldCount"])
    .index("by_group_and_popularity", ["categoryGroup", "soldCount"])
    // Price sorting within category
    .index("by_category_and_price", ["category", "price"])
    .index("by_group_category_and_price", [
      "categoryGroup",
      "category",
      "price",
    ])
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
  })
    .index("by_user", ["userId"])
    .index("by_user_and_product", ["userId", "productId"]),

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
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("shipped"),
      v.literal("delivered"),
    ),
    customerEmail: v.string(),
    customerName: v.string(),
    shippingAddress: v.string(),
    deliveryType: v.optional(
      v.union(v.literal("pickup"), v.literal("delivery")),
    ),
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

  paymentIntents: defineTable({
    paymentIntentId: v.string(),
    userId: v.id("users"),
    amount: v.number(),
    currency: v.string(),
    status: v.string(),
    orderData: v.object({
      customerName: v.string(),
      customerEmail: v.string(),
      shippingAddress: v.string(),
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
    }),
    stripeClientSecret: v.optional(v.string()),
  })
    .index("by_payment_intent_id", ["paymentIntentId"])
    .index("by_user", ["userId"]),
};

export default defineSchema({
  ...authTables,
  users: usersTable,
  ...applicationTables,
});
